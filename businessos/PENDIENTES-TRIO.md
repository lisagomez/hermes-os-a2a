# Pendientes del trío — hallazgos de la 1ª corrida real desde Slack (2026-07-12)

> Primera vez que el equipo le encarga software al trío desde `#dep-desarrollo`.
> Tarea: `mission-control-2026-0001` (página `/desarrollo` en Mission Control).
> **Resultado: `escalada` sin veredicto.** El motor (GLM-5.2) escribió el código
> correctamente; el sistema lo mató. Los 5 hallazgos son de DISEÑO NUESTRO, no del
> modelo ni del código generado.
>
> **Estado (2026-07-12): los 5 arreglados en código.** Falta DESPLEGAR (ver abajo) y
> relanzar la tarea. Todo lo de esta sección se conserva como autopsia.

## Qué pasó, con evidencia

```
1. El log del Ejecutor NO tiene la línea del POST        → la petición nunca terminó
   (solo el GET del agent-card y los health checks)
2. La transcripción del CLI acaba en "last-prompt"       → el proceso murió a media faena
   (sin entrada "result": nunca cerró)
3. token_usage: CERO filas para esta task_id             → reventó antes de registrar el gasto
4. tareas: estado=escalada, resultado=null               → abortó sin entregar nada
5. El worktree tiene los archivos correctos, a medias    → GLM sí estaba haciendo el trabajo
```

**Causa raíz: el bot llamó al Ejecutor con un timeout de 30 s.** La ejecución dura
minutos (motor + gates). Al cerrarse la conexión, el servidor canceló la petición y
con ella el proceso del motor. Y el bot **reportó lo contrario de lo que pasó**:
*"probablemente el trío no está levantado"* — cuando él mismo lo había abortado.

## Los 5 arreglos — HECHOS

| # | Arreglo | Dónde | Test que lo fija |
|---|---------|-------|------------------|
| 1 | La corrida sobrevive a la desconexión del cliente (`asyncio.shield`) | `ejecutor-a2a/executor.py` | `test_cliente_que_se_desconecta_no_mata_la_corrida` |
| 2 | Timeout ≥ 900 s obligatorio + prohibido concluir "el trío está caído" por un timeout | `negocio/skills/trio-software/SKILL.md` | — (doctrina) |
| 3 | Todo fallo se loguea LOCAL antes de viajar por A2A | `ejecutor-a2a/executor.py::_fallar` | — |
| 4 | El gasto se registra aunque la corrida muera a media faena (acumulado turno a turno) | `ejecutor-a2a/claude_engine.py` | `test_corrida_muerta_a_media_faena_registra_el_gasto_parcial` |
| 5 | Snapshot `tareas.json` en el volumen: el bot consulta estado sin credenciales | `businessos/snapshot-tareas.py` | — |

Notas de diseño:

- **(1)** es el bug estructural. La corrida va en una task independiente; si el cliente
  cuelga, `execute` propaga la cancelación (buen ciudadano asyncio) pero el trabajo
  **sigue** y deja su estado final en `tareas`. Verificado: el test **falla** contra el
  executor viejo (la corrida moría) y pasa con el nuevo.
- **(4)** el `ResultMessage` sigue siendo autoritativo cuando llega (no se duplica el
  gasto); el acumulado parcial solo aplica si la corrida no llegó a entregarlo. Va con
  `costo_usd = 0` a propósito: el motor no sabe tarifar (con GLM el CLI ni siquiera
  tarifa bien) — los tokens son el dato real y el costo lo recalcula el host-job.
- **(5)** el snapshot trae `generado`: el skill obliga a citar la antigüedad y, si la
  tarea no aparece, a decir *"aún no tengo estado confirmado"* — **nunca** "falló".

## Para desplegar (nada de esto está vivo aún)

El repo NO es el runtime (aprendizaje 2026-07-12). En el servidor:

1. `git pull` en `/home/hermes/repo` (tras mergear el PR).
2. **Rebuild del Ejecutor** — es imagen, no script: `docker compose up -d --build ejecutor-a2a`.
3. **Sincronizar el skill al volumen de negocio** (el bot lee el volumen, no el repo):
   copiar `negocio/skills/trio-software/SKILL.md` a `~/businessos/negocio/.hermes/skills/`
   → `chown 10000:10000` → `docker restart hermes-negocio`. **Diffear antes de pisar.**
4. **Agendar el snapshot** (una rutina documentada no es una rutina agendada, 2026-07-12):
   cron de SO cada 5 min — `*/5 * * * * cd /home/hermes/repo/businessos && set -a && . ./.env && set +a && python3 snapshot-tareas.py >> /home/hermes/logs/host-jobs.log 2>&1`.
   El skill promete "se refresca cada pocos minutos": o el cron existe, o esa frase miente.
   (También quedó en `nightly-jobs.sh`, pero una vez al día no sirve para consultar una
   corrida en curso.)
5. Verificar: `docker exec -u hermes hermes-negocio cat /opt/data/workspace/tareas.json`.

## Para relanzar la tarea

- El código de GLM sigue en el worktree `/workspace/worktree/mission-control-2026-0001`
  (rama `tarea/mission-control-2026-0001`), a medias pero bien encaminado.
- Relanzar con el MISMO `task_id` y presupuesto realista (**$5**, no $1.50 — `next build`
  + una feature completa no caben en $1.50) y dejar que llegue a los gates.

## ARREGLADO (2026-07-25): errores TRANSITORIOS del proveedor se reintentan, no escalan

- **El problema** (dogfood de la build-spec sync-repo-runtime): un **429 rate-limit**
  (límite de 5h de z.ai) tumbó 5 tareas seguidas de la cola (las 4 últimas murieron
  al instante con 0 tokens contra un límite ya agotado), y un **"Connection closed
  mid-response"** mató a sync01 a mitad del intento 2. El motor reportaba el críptico
  `Claude Code returned an error result: success` y el worker **escalaba** — cuando un
  backoff (o pausar la cola al ver un 429) habría salvado los intentos.
- **El hallazgo clave**: NO hace falta parsear el transcript. El `claude-agent-sdk`
  0.2.110 ya expone la señal de forma ESTRUCTURAL: `ResultMessage.api_error_status`
  (429/5xx/529 cuando `is_error=True` y `subtype="success"` — ese es el críptico
  "error result: success"), `AssistantMessage.error` ∈ {`rate_limit`,`server_error`,…},
  `RateLimitEvent.rate_limit_info` con `status="rejected"` + **`resets_at`** (Unix ts),
  y `CLIConnectionError` para el transporte caído.
- **El arreglo (4 capas, cero parseo de transcript)**:
  | # | Qué | Dónde | Test |
  |---|-----|-------|------|
  | 1 | `EngineError` lleva `transitorio` + `reanudar_epoch` | `ejecutor-a2a/engine.py` | — |
  | 2 | Clasificador estructural (api_error_status/errors/RateLimitEvent/CLIConnectionError), fail-safe a definitivo | `ejecutor-a2a/claude_engine.py::clasificar_transitorio` | `test_429_estructural…`, `test_rate_limit_rejected_trae_resets_at…`, `test_max_turns_NO_es_transitorio` |
  | 3 | `PipelineError` propaga transitorio → `escalar=False` | `ejecutor-a2a/pipeline.py` | `test_motor_transitorio_NO_escala_y_propaga_reanudar` |
  | 4 | Worker: reintenta **sin consumir intento** (la cola devuelve `_intentos`), **pausa** con backoff exponencial o hasta `resets_at` (serial ⇒ pausa la cola entera), y **fusible** `TRANSITORIOS_MAX=8` → escala si algo se clasificó mal | `ejecutor-a2a/worker.py::_reintentar_transitorio` + `cola.py::reclamar` | `test_transitorio_vuelve_a_la_cola_SIN_consumir_intento_y_pausa`, `test_transitorio_con_resets_at_pausa…`, `test_transitorio_repetido_acaba_escalando` |
- **Verificado en dev**: 75 tests verdes (63 base + 12 nuevos), cero tokens. La señal
  estructural se validó contra el SDK instalado (`api_error_status`/`RateLimitInfo.resets_at`
  existen en 0.2.110), no contra un blog.
- **Para desplegar**: rebuild del Ejecutor (es imagen, no script) — `docker compose up -d
  --build ejecutor-a2a` en el servidor tras mergear. No toca BD ni volúmenes.
- **Coordinador blindado también (2026-07-25)**: el Planner del enjambre llama al modelo vía
  z.ai igual que el Ejecutor, así que se le aplicó el MISMO criterio. El clasificador se movió a
  un módulo compartido (`trio-contrato/errores_proveedor.py::clasificar_transitorio`) que ambos
  servicios vendoran — una sola implementación, no dos que deriven ("arreglar lo compartido").
  El reintento del Planner es INLINE (no hay cola de planificación): bucle acotado en
  `coordinador-a2a/executor.py::_planificar` con backoff/pausa hasta `resets_at` y fusible
  `PLAN_TRANSITORIOS_MAX=6`. 10 tests nuevos. Deploy = rebuild del Coordinador (imagen).

## Sabido y NO arreglado (mismo tipo, otro servicio)

- El **Coordinador** (Fase 7, enjambre) tiene la misma exposición que tenía el Ejecutor:
  su `execute` no está blindado y una corrida de enjambre es la MÁS larga del sistema.
  Hoy no lo dispara ningún skill (solo smokes/dogfood), por eso no urge. Cuando el bot
  pueda encargar features al enjambre, aplicarle el mismo patrón (`asyncio.shield` +
  test de desconexión) ANTES de exponerlo.
