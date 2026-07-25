# Fase 10 — La COLA del trío (PRP-010)

> **Estado (2026-07-13): VIVA en runtime.** Desplegada y verificada en Hetzner.
> PR #42 (la cola) mergeado; **PR #43 (fix del limbo) pendiente de merge** — el código
> YA corre en el servidor.

## Qué es

`#dep-desarrollo` tiene **bandeja de entrada**: varias personas pueden pedir features a la
vez. El Ejecutor **encola y responde en ~1 s** (`{encolada, posicion, en_ejecucion, cola}`) y
un **worker único, serial** las ejecuta de una en una.

Antes: el bot se **bloqueaba 15+ min** por petición, y dos peticiones simultáneas lanzaban dos
motores + dos `npm build` + dos Playwright en 8 GB de RAM.

## Decisiones que NO se renegocian (y por qué)

| Decisión | Motivo |
|---|---|
| **Worker dentro del proceso del Ejecutor** (asyncio task del lifespan) | Un contenedor hermano sería un **segundo escritor** de `tareas` — el invariante que evita las carreras desde Fase 6. |
| **Concurrencia 1 con `asyncio.Lock`** | El cx33 tiene 8 GB; cada tarea son un CLI + `npm build` + Playwright, **dos veces** (motor y Supervisor). Y "serial por construcción" no es garantía: el test de dos bucles a la vez lo tumbó. |
| **Encolado AUTORITATIVO** (levanta, no traga) | La fila **es** la tarea. Decir "encolada, posición 3" sin fila escrita es mentirle al equipo. (`estado.py` sí es best-effort: allí el estado es solo trazabilidad.) |
| **Tope de gasto en TOKENS, no en dólares** | Con GLM vía z.ai el CLI tarifa como Anthropic → `costo_usd` llega 0/erróneo. Un tope que lo sume **nunca cortaría**: cinturón de mentira. |
| **Sin endpoint de reordenamiento** | La prioridad es de Elisa y **la autoridad es la credencial**. Si cualquiera del canal pudiera colarse en la fila, el orden no significaría nada. El bot lo *pide* (`cola-trio.py` lo hace el host). |
| **Reintento al FINAL de la cola** | En serie, una tarea que falla 3 veces no puede comerse tres turnos mientras cinco personas esperan. |

## El bug que solo vio el runtime (y que define la fase)

Con **209 tests verdes**, el smoke (`docker restart` con trabajo en vuelo) destapó que una
tarea muerta en **`en_revision`** quedaba en el **limbo para siempre**: la recuperación de
huérfanas solo miraba `en_ejecucion`. Nadie la ejecutaba, no estaba en la cola, y desaparecía
del radar. Y es la ventana **más larga** (el Supervisor corriendo build+tests). En dev nadie
mata el proceso a media faena → ningún test podía verlo. Arreglado (PR #43) y **verificado en
vivo**: `[worker] huerfanas recuperadas: smoke-cola-2 (en_revision)→escalada`.

## Operación

```bash
# ver la cola / adelantar / cancelar (SOLO Elisa: necesita el service_role)
ssh hetzner "cd ~/repo/businessos && set -a && . ./.env && set +a && python3 cola-trio.py list"
#                                                                    ... prioriza <task_id> [n]
#                                                                    ... cancela  <task_id>
```

- Crons en el servidor: `aviso-cola.py` (cada 2 min, avisa a `#dep-desarrollo`) y
  `snapshot-tareas.py` (cada 5 min → `tareas.json`, que el bot lee **sin credenciales**).
- La memoria anti-duplicado de avisos vive en `/home/hermes/state/aviso-cola.json`. **Al
  estrenarla hay que sembrarla** con el estado actual, o la primera corrida anuncia todo el
  historial como si acabara de pasar.
- El motor real es `EJECUTOR_ENGINE=claude` (GLM-5.2 vía z.ai). Para smokes: `mock` (cero
  tokens) — y **restaurarlo después**.

## El enjambre (cerrado el 2026-07-13, PR #45)

El Coordinador **encola** sus sub-tareas y **espera turno** (`cola_espera.py`, solo LEE
`tareas`). Verificado con smoke real: encoló 2 sub-tareas y el worker las ejecutó **una
detrás de otra**.

- **El enjambre ya NO corre en paralelo.** Concurrencia 1 manda: `fan_out_max` compra
  **orden**, no velocidad. Sigue valiendo por descomponer, dependencias, integrar y re-gatear
  el todo.
- **El diff se relee de GIT, nunca de la fila**: `estado.py` lo recorta a 20 k (jsonb) y la
  integración hace `git apply` — un parche truncado corrompe el trabajo **en silencio**.
- **Sin herencia de prioridad** (desviación consciente del PRP): el padre nunca está en la
  cola, así que su prioridad es siempre 0; y dar al Coordinador poder de subir prioridades
  reabriría lo que la cola cierra. La palanca es de Elisa: `cola-trio.py prioriza`.

## El `git fetch` de master lo hace el HOST (PR #46)

El contenedor del Ejecutor **no tiene llave de GitHub, y no debe tenerla** (ahí corre el
modelo con permisos amplios; una llave, aunque sea de solo lectura, abre los repos privados
de la cuenta). El `fetch` dentro del contenedor **fallaba en silencio** y el trío construyó
días sobre un master de 11 commits atrás. Ahora: **cron del host cada 5 min**
(`git -C ~/trio/hermes-os-a2a fetch origin --prune`) y el worker **loguea** el resultado.

## Reintento de fallos TRANSITORIOS del proveedor (2026-07-25)

El dogfood de la build-spec (2026-07-24) mostró la mina: un **429 rate-limit** (tope 5h de
z.ai) tumbó 5 tareas seguidas y un **"Connection closed mid-response"** mató otra — todas
**escaladas** como si la tarea hubiera fallado. Ahora se **reintentan**.

- **Cero parseo de transcript.** El `claude-agent-sdk` 0.2.110 ya expone la señal de forma
  ESTRUCTURAL (verificado introspeccionando el SDK instalado, no un blog):
  `ResultMessage.api_error_status` = 429/5xx/529 cuando `is_error=True` y `subtype="success"`
  (ese es el críptico *"error result: success"*), `AssistantMessage.error` ∈
  {`rate_limit`,`server_error`,…}, `RateLimitEvent.rate_limit_info` con `status="rejected"` +
  **`resets_at`** (Unix ts), y `CLIConnectionError` para el transporte caído.
- **`clasificar_transitorio` es fail-safe**: solo lo inequívocamente transitorio reintenta;
  max_turns / billing / auth / error de código → definitivo (escala como siempre). Nunca
  empeora: solo convierte en reintento lo que hoy se escalaba por error.
- **Un transitorio NO consume intento**: `cola.reclamar` devuelve el `intentos` que subió el
  claim (`_intentos` en el payload) y el worker lo decrementa al re-encolar → un 429 no gasta
  la cuota de reintentos de la tarea.
- **Pausa = freno de cola**: el worker espera con backoff exponencial (60·2ⁿ, techo 1 h) o
  hasta `resets_at`. Como es **serial**, esa espera **pausa la cola entera** — justo lo que se
  quiere ante un límite de CUENTA (todas las tareas comparten el mismo tope de z.ai).
- **Fusible** `TRANSITORIOS_MAX=8`: tras 8 reintentos transitorios seguidos escala igual, por
  si algo se clasificó mal (evita bucle infinito; contador en proceso, se limpia al desenlace).
- Capas: `engine.py` (EngineError con `transitorio`/`reanudar_epoch`) · `claude_engine.py`
  (captura RateLimitEvent + clasificador) · `pipeline.py` (propaga `escalar=False`) ·
  `worker.py::_reintentar_transitorio` · `cola.py::reclamar`. **12 tests nuevos, verde en dev.**
- **Deploy**: rebuild del Ejecutor (imagen, no script) — `docker compose up -d --build
  ejecutor-a2a`. No toca BD ni volúmenes.

## Abierto

- ~~El Coordinador (Planner) tiene la misma exposición a un 429~~ → **HECHO 2026-07-25**: el
  clasificador se movió a `trio-contrato/errores_proveedor.py` (compartido) y el Planner del
  Coordinador lo usa con reintento INLINE (`executor.py::_planificar`, backoff/pausa hasta
  `resets_at`, fusible `PLAN_TRANSITORIOS_MAX=6`). Deploy = rebuild del Coordinador.
- Cosmético: `posicion` viaja como `1.0` (protobuf Struct convierte todo número a float).
- Los gates dejan artefactos (`test-results/`) que se cuelan en el diff de la sub-tarea si el
  `.gitignore` del repo objetivo no los cubre. Vigilar en el primer enjambre real.
