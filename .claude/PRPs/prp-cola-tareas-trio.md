# PRP-010: Cola de tareas del trío (FIFO, ejecución serial, aviso en #dep-desarrollo)

> **Estado**: FASES 1–7 IMPLEMENTADAS (dev, 209 tests verdes) · FASE 8 (runtime) PENDIENTE
> **Fecha**: 2026-07-12
> **Proyecto**: businessos — trío Hermes→Ejecutor→Supervisor (Fase 6/7)

---

## Objetivo

Que el Ejecutor **acepte y encole** la tarea en `tareas` (estado `recibida`) y responda en
segundos *"encolada, posición N"*, mientras un **worker interno único (concurrencia 1)**
drena la cola en orden **FIFO con prioridad** — de modo que varias personas de
`#dep-desarrollo` puedan pedir features a la vez sin que dos motores + dos `npm build` +
dos Playwright se peleen los 8 GB del cx33.

---

## Por Qué

| Problema (hoy) | Solución |
|----------------|----------|
| El bot llama al Ejecutor por HTTP y **se bloquea 15+ min** esperando el veredicto. La persona que pidió la feature no recibe nada, y el bot ocupa su turno de conversación. | El Ejecutor **encola y responde ya**. El bot contesta *"encolada, posición 3"* en segundos y sigue atendiendo. |
| Si dos personas piden features a la vez, se lanzan **dos corridas concurrentes** (motor + Supervisor + `npm build` + Playwright cada una) en un cx33 de 8 GB. Nadie acota nada. | **Un worker, concurrencia 1**: como mucho un motor y un `npm build` a la vez en la máquina. |
| La cola vive (hoy) **en la conexión HTTP**: si el contenedor reinicia, el trabajo pendiente desaparece sin rastro. | La cola es **durable en Supabase** (`tareas`). Un reinicio la retoma. |
| El gasto solo se acota **dentro** de una tarea (`presupuesto_usd`). Nada impide que una cola de 8 tareas queme el presupuesto del mes. | **Tope de gasto acumulado antes de sacar cada tarea** de la cola (patrón `coordinador-a2a/presupuesto.py`). |
| Cuando la tarea termina, **nadie avisa**: el bot ya no está escuchando (su llamada terminó hace 20 min). | **Host-job** (tiene el token de Slack; el agente no) que avisa en `#dep-desarrollo` al encolar y al terminar, con el orden de la cola. |
| El equipo no ve la cola: no sabe si su petición es la 1ª o la 5ª. | El aviso y el snapshot `tareas.json` publican **el listado y el orden de ejecución**. |

**Valor de negocio**: `#dep-desarrollo` pasa de "una petición a la vez y crucemos los dedos"
a un **departamento con bandeja de entrada**: cualquiera pide, todos ven el orden, el
servidor no se cae y el gasto tiene techo. Es el requisito previo para que el trío atienda
a un equipo (y mañana, a un cliente).

---

## Qué

### Criterios de Éxito

- [ ] Una tarea enviada al Ejecutor responde en **< 5 s** con `{encolada: true, posicion: N, en_ejecucion: <task_id|null>, cola: [...]}` — sin arrancar el motor.
- [ ] **Tres tareas enviadas a la vez** desde `#dep-desarrollo` se ejecutan **una detrás de otra** (jamás dos motores/`npm build` simultáneos, verificable en `docker stats` y en los timestamps de `tareas`).
- [ ] El orden es **FIFO** (`encolada_en` ascendente) con **prioridad** por delante; **solo Elisa** (host-job con credencial) puede cambiar la prioridad o cancelar algo que aún no arrancó. El bot **no puede** (no tiene credenciales, por diseño).
- [ ] La cola **sobrevive a `docker restart`**: las tareas `recibida` siguen ahí y una tarea huérfana en `en_ejecucion` vuelve a la cola (o se escala si agotó intentos), con aviso.
- [ ] Antes de sacar **cada** tarea, el worker verifica el **gasto acumulado** contra el tope; si se agotó, **no saca nada**, deja la cola intacta y avisa en `#dep-desarrollo`.
- [ ] Se avisa en `#dep-desarrollo` **al encolar** y **al terminar** cada tarea, con veredicto y el **listado + orden** de lo que queda. El aviso lo manda un **job de confianza del host**, nunca el agente.
- [ ] El invariante **"un escritor por fila"** se preserva: el Ejecutor es el único que escribe el ciclo de estados de `tareas` (ver refinamiento en Contexto).
- [ ] El bot **nunca concluye estado por adivinanza**: lee `tareas.json` (con su `generado`) y, si no sabe, dice *"aún no tengo estado confirmado"*.

### Comportamiento Esperado (happy path)

```
1. Ana en #dep-desarrollo: "@bot añade export a CSV en el dashboard"
2. El bot arma la TAREA (criterios + límites: max_turns 120, presupuesto $5) y hace
   POST http://ejecutor-a2a:4100/  (SendMessage, A2A-Version: 1.0)   [timeout 60 s]
3. El Ejecutor VALIDA el contrato → INSERTA la fila en `tareas` (estado 'recibida',
   payload completo, encolada_en=now()) → responde en < 5 s:
      {"encolada": true, "posicion": 2, "en_ejecucion": "dash-2026-0007",
       "cola": [{"pos":1,"task_id":"dash-2026-0008"}, {"pos":2,"task_id":"dash-2026-0009"}]}
4. El bot responde en el canal: "Encolada como dash-2026-0009, posición 2.
   Ahora mismo corre dash-2026-0007. Te aviso aquí cuando haya veredicto."
   (Y el host-job publica el listado con el orden de ejecución.)
5. El worker (único, serial) termina lo suyo, comprueba el gasto acumulado, saca la
   siguiente por (prioridad DESC, encolada_en ASC), refresca master, prepara el worktree,
   corre el motor, pide veredicto al Supervisor y escribe el estado final.
6. El host-job detecta la transición y avisa: "dash-2026-0007 APROBADA (8 gates verdes).
   Rama tarea/dash-2026-0007 lista. Siguen en cola: 1) dash-2026-0008  2) dash-2026-0009."
7. Si alguien pregunta "¿cómo va lo mío?", el bot LEE `tareas.json` y cita su `generado`.
```

---

## Contexto

### Referencias (código real, verificado)

| Archivo | Qué aporta |
|---|---|
| `businessos/ejecutor-a2a/executor.py` | El pipeline actual (validar → worktree → motor → Supervisor → estado). Ya blindado con `asyncio.shield` (PR #37). **Se parte en dos**: `execute` (encolar) + pipeline reutilizable por el worker. |
| `businessos/ejecutor-a2a/estado.py` | Escritor de `tareas` (PostgREST + service_role). `registrar_ejecucion` hoy entra directo a `en_ejecucion`; con cola entra a `recibida`. Sus escrituras son **best-effort** — eso deja de valer para el encolado (ver Gotchas). |
| `businessos/ejecutor-a2a/engine.py` / `claude_engine.py` | Motor pluggable (`mock` \| `claude`). `limites.max_turns`/`presupuesto_usd`/`modelo_pref` → opciones del CLI. Escribe `token_usage` con `task_id`. |
| `businessos/coordinador-a2a/presupuesto.py` | **Patrón a reusar**: suma `token_usage` por `task_id` y corta. Best-effort de lectura (0.0 = no corta). |
| `businessos/coordinador-a2a/enjambre.py` | Scheduler por olas con `fan_out_max` + corte de presupuesto. El Coordinador llama al Ejecutor **esperando el veredicto síncrono** → la cola lo rompe si no se adapta (Fase 7). |
| `businessos/snapshot-tareas.py` | Snapshot host-job → `/opt/data/workspace/tareas.json` (el bot lo lee sin credenciales). **Se extiende con la cola y su orden.** |
| `businessos/publicar-rama.sh` | **Patrón de aviso a Slack**: token leído del `.env` del volumen de negocio (`sudo grep`), `chat.postMessage`, canal `#dep-desarrollo` = `C0BGL2DMNLB`. |
| `businessos/trio-contrato/contrato.py` | Fuente única del contrato y de las **transiciones válidas**. La cola añade transiciones (ver abajo). |
| `businessos/supabase-fase6.sql` / `fase7.sql` / `fix-token-ledger.sql` | Tabla `tareas` (ya tiene `recibida`), `token_usage.task_id`, y el índice único **parcial** que permite el ledger por-tarea. |
| `businessos/negocio/skills/trio-software/SKILL.md` | Doctrina del bot. Hoy exige timeout ≥ 900 s; con cola el encolado es **rápido** y el estado se consulta en `tareas.json`. |
| `businessos/PENDIENTES-TRIO.md` | Autopsia de la 1ª corrida real: de ahí salen `asyncio.shield`, el snapshot y la prohibición de adivinar. |

### Arquitectura Propuesta

```
#dep-desarrollo (Slack)
      │  "añade export a CSV"
      ▼
 Hermes-Negocio (bot, SIN credenciales)
      │  A2A SendMessage  ── timeout 60 s ──►  ejecutor-a2a:4100
      │                                          │
      │  ◄── {encolada, posicion, cola} (< 5 s) ─┘   [execute = validar + ENCOLAR]
      │
      │                                        ejecutor-a2a (mismo proceso)
      │                                        ┌──────────────────────────────┐
      │                                        │ worker.py — ÚNICO, serial    │
      │                                        │  loop:                       │
      │                                        │   1. tope de gasto acumulado │
      │                                        │   2. claim CAS de la 1ª fila │
      │                                        │      (prioridad, encolada_en)│
      │                                        │   3. fetch master + worktree │
      │                                        │   4. motor → Supervisor      │
      │                                        │   5. estado final en `tareas`│
      │                                        └──────────────────────────────┘
      │                                                   │ (escribe)
      ▼                                                   ▼
 lee /opt/data/workspace/tareas.json  ◄── host-job ── Supabase `tareas`  (LA COLA)
 (snapshot cada 5 min, con la cola)      snapshot        ▲        │
                                                          │        │ (lee deltas)
                                    cola-trio.py (Elisa) ─┘        ▼
                                    (prioridad / cancelar)   aviso-cola.py (host-job, cron)
                                                              │ token de Slack
                                                              ▼
                                                        #dep-desarrollo
```

**Decisiones de arquitectura (y lo que se rechazó)**

1. **El worker vive DENTRO del proceso del Ejecutor** (asyncio task en el `lifespan` de
   Starlette), no en un contenedor aparte. Motivo: necesita exactamente los mismos mounts
   (`/repo`, `/workspace`), la misma imagen y el mismo escritor de `tareas`. Un contenedor
   hermano sería un **segundo escritor** — justo el invariante que protegemos.
   *Rechazado*: `ejecutor-worker` como servicio separado.
2. **Concurrencia 1 de verdad**: un solo `asyncio.Task` de drenado + **claim por
   compare-and-swap** en PostgREST (`PATCH tareas?task_id=eq.X&estado=eq.recibida` con
   `Prefer: return=representation`; 0 filas devueltas = otro se la llevó). Así, incluso si
   por accidente hay dos procesos (rebuild solapado, un `docker run` manual), **nunca dos
   motores sobre la misma tarea**.
3. **Refinamiento explícito del invariante "un escritor por fila"** (extiende el de Fase
   6/7, no lo rompe):
   - Fila en **`recibida`** → la posee **la cola**: la crea el `execute` del Ejecutor y
     puede reordenarla/cancelarla el host-job de Elisa (CAS sobre `estado=eq.recibida`).
   - Fila desde **`en_ejecucion`** en adelante → la posee **el worker del Ejecutor**, y
     nadie más la toca. El Supervisor sigue **stateless**.
   - El host-job de avisos **solo LEE** `tareas` (su memoria de "ya avisé" vive en un
     archivo del host, no en la tabla).
   *Rechazado*: exponer un endpoint de reordenamiento en el Ejecutor — cualquiera del canal
   podría colarse en la fila. **La autoridad es la credencial**: quien tiene el
   `service_role` (el host = Elisa) manda; el bot no la tiene y no debe tenerla.
4. **El tope de gasto se calcula con TOKENS, no con `costo_usd` a secas.** Ver Gotcha #1:
   con GLM-5.2 el CLI tarifa como Anthropic y `costo_usd` llega 0/erróneo → un tope que
   sume `costo_usd` **nunca cortaría**. El gate suma tokens de `token_usage` (dato fiable) y
   aplica una tarifa por modelo.
5. **Fetch de `master` antes de cada tarea**: al ser serial, cada tarea puede arrancar
   desde el master **más fresco** (incluyendo lo que ya se mergeó). Es la mitigación barata
   del riesgo de colisión entre ramas. La llave del trío es de solo lectura: puede `fetch`.
6. **La cola es pluggable** (`ColaSupabase` \| `ColaMemoria`), igual que el motor: los tests
   y el dev corren **sin Supabase ni red**, y el runtime usa la tabla.

### Modelo de Datos

```sql
-- supabase-fase10.sql (idempotente; RLS ya viene de Fase 6: sin políticas, solo service_role)

alter table public.tareas
  -- Orden de la cola: prioridad DESC, encolada_en ASC (FIFO con adelantos de Elisa).
  add column if not exists prioridad   integer     not null default 0,
  add column if not exists encolada_en timestamptz not null default now(),
  -- El worker ejecuta la tarea MINUTOS después, desde la fila (no desde el mensaje A2A):
  -- la fila debe poder reconstruir la TAREA normalizada COMPLETA (limites, observaciones,
  -- modelo_pref...). Las columnas denormalizadas (objetivo, criterios) se conservan para
  -- el snapshot/dashboard, pero la verdad ejecutable es `payload`.
  add column if not exists payload     jsonb;

-- Índice de la cola: barato y exacto para el pick del worker.
create index if not exists tareas_cola_idx
  on public.tareas (prioridad desc, encolada_en asc)
  where estado = 'recibida';
```

**Transiciones nuevas en `trio-contrato/contrato.py`** (la tabla `tareas` ya admite todos
los estados; lo que cambia es el grafo):

| Transición | Por qué |
|---|---|
| `en_ejecucion → recibida` | **Recuperación de reinicio**: tarea huérfana vuelve a la cola (solo si `intentos < intentos_max`; si no, `escalada`). |
| `rechazada → recibida` | **Reintento re-encolado**: el bot reenvía el mismo `task_id` con `observaciones`; entra por la cola, no se cuela. |
| `escalada → recibida` | Relanzar tras escalada (análoga a la ya existente `escalada → en_ejecucion`). |

`recibida → en_ejecucion` y el resto del ciclo **no cambian**.

---

## Blueprint (Assembly Line)

> Solo FASES. Las subtareas se generan al entrar a cada fase (bucle agéntico).

### Fase 1: Esquema y contrato de la cola
**Objetivo**: `tareas` sabe ordenar una cola y reconstruir la tarea; `contrato.py` admite las
tres transiciones nuevas.
**Validación**: `supabase-fase10.sql` aplicado (idempotente, re-corrible); `get_advisors` sin
alertas nuevas; suite de `trio-contrato` verde con tests de las transiciones nuevas y de que
las prohibidas siguen prohibidas.

### Fase 2: El Ejecutor acepta y encola (respuesta inmediata)
**Objetivo**: `execute` valida y **encola** (`recibida` + `payload` + `encolada_en`) y devuelve
`{encolada, posicion, en_ejecucion, cola}` sin tocar el motor. `cola.py` con `ColaSupabase` y
`ColaMemoria`. La Agent Card deja de prometer un veredicto síncrono (promesa honesta,
SPEC-trio §6). El escritura de encolado es **autoritativa**: si falla, la tarea A2A falla con
razón clara (nunca decir "encolada" sin fila).
**Validación**: tests — encolar responde sin invocar el motor; el fallo de Supabase da `failed`
(no un falso "encolada"); dos tareas seguidas devuelven posiciones 1 y 2; `test_opacidad`
sigue verde (la superficie sigue siendo `{card, JSON-RPC, /health}` — **no** se añade `/cola`).

### Fase 3: Worker único serial + durabilidad + tope de gasto
**Objetivo**: `worker.py` drena la cola (concurrencia 1, claim CAS, `prioridad DESC,
encolada_en ASC`), arrancado en el `lifespan` de `app.py`. Antes de **cada** pick: tope de
gasto acumulado (tokens × tarifa, patrón `presupuesto.py`). Al arrancar: recupera huérfanas
(`en_ejecucion` → `recibida` o `escalada`). Antes de cada worktree: `git fetch` de master.
**Validación**: tests con dobles — dos tareas encoladas nunca ejecutan a la vez (motor espía
que registra solapamiento); reinicio simulado devuelve la huérfana a la cola; presupuesto
agotado **no** saca tarea y no pierde la cola; un pick con CAS perdido no ejecuta.

### Fase 4: Avisos a #dep-desarrollo (host-job) + snapshot con la cola
**Objetivo**: `aviso-cola.py` (cron ~2 min) detecta transiciones leyendo `tareas`, publica en
`#dep-desarrollo` (patrón exacto de `publicar-rama.sh`) el encolado, el arranque y el
desenlace de cada tarea **con el listado y el orden** de lo que queda; memoria anti-duplicado
en un archivo del host. `snapshot-tareas.py` se extiende con `cola` (orden + posiciones) y
`en_ejecucion`.
**Validación**: encolar → aviso con el orden; terminar → aviso con veredicto + cola restante;
correr el job dos veces seguidas **no duplica** avisos; sin token de Slack, se loguea el fallo
y **no** se inventa nada; `tareas.json` trae `cola` y su `generado`.

### Fase 5: Prioridad y cancelación — solo Elisa (host CLI)
**Objetivo**: `cola-trio.py` (host-job, tiene el `service_role`): `list` (la cola con su orden),
`prioriza <task_id> <n>`, `cancela <task_id>` (CAS sobre `estado=eq.recibida`: lo que ya
arrancó **no** se cancela desde aquí). Nunca escribe el ciclo de estados de una tarea en vuelo.
**Validación**: subir la prioridad cambia el siguiente pick del worker; cancelar una tarea en
`en_ejecucion` se rechaza con mensaje claro; el bot no tiene forma de invocarlo (sin
credenciales); toda operación queda en `host-jobs.log`.

### Fase 6: Doctrina del bot (skill + AGENTS.md) y su despliegue al volumen
**Objetivo**: `trio-software/SKILL.md`: el POST ahora es rápido (timeout 60 s), la respuesta es
`{encolada, posicion, cola}`, el bot **reporta la posición**, **no espera** el veredicto, y para
"¿cómo va?" **lee `tareas.json`** citando `generado`. Prohibido: adivinar estado, decir "el trío
está caído" por lentitud, y **reordenar la cola** (eso es de Elisa: el bot lo pide, no lo hace).
**Validación**: el `.md` **sincronizado al volumen** (diffear antes de pisar; `chown 10000:10000`;
restart) — el repo no es el runtime; un mensaje real en `#dep-desarrollo` responde con posición
en segundos.

### Fase 7: El enjambre también pasa por la cola (o queda con guard explícito)
**Objetivo**: `coordinador-a2a/ejecutor_cliente.py` pasa de "llamar y esperar el veredicto" a
**encolar + poll** hasta estado terminal (la interfaz que ve `enjambre.py` no cambia:
`ejecutar(sub) -> {resultado, veredicto}`). Sin esto, el Coordinador **se salta la cola** y
reabre el agujero de concurrencia que este PRP existe para cerrar. Las sub-tareas heredan la
prioridad del padre para no quedarse detrás de peticiones nuevas.
**Validación**: el dogfood del enjambre vuelve a APROBADO con el worker serial; nunca hay dos
motores a la vez (mismo test de solapamiento, ahora extremo a extremo). *Si se difiere*: dejar
escrito el guard — el Coordinador no se expone a ningún canal y no se corre a mano mientras la
cola tenga tareas.

### Fase 8: Validación Final (runtime, no dev)
**Objetivo**: sistema vivo en Hetzner.
**Validación**:
- [ ] `Dockerfile` del Ejecutor actualizado con **cada módulo nuevo** (`cola.py`, `worker.py`, `presupuesto.py`, `tarifas.py`) — el COPY es explícito (aprendizaje 2026-07-10).
- [ ] `docker compose up -d --build ejecutor-a2a` y el contenedor **no** entra en crash-loop.
- [ ] Cron de `aviso-cola.py` **agendado** (una rutina documentada no es una rutina agendada).
- [ ] Smoke real: **3 tareas encoladas desde `#dep-desarrollo` a la vez** → avisos con orden, ejecución serial (timestamps de `tareas` sin solape), memoria del servidor estable, `tareas.json` coherente.
- [ ] `docker restart ejecutor-a2a` con cola llena → nada se pierde; la huérfana vuelve.
- [ ] Todos los criterios de éxito marcados.

---

## 🧠 Aprendizajes (Self-Annealing)

### 2026-07-12: "Concurrencia 1" no es un comentario, es un candado
- **Error**: el worker era serial *por construcción* (un solo bucle en el lifespan), y el
  test de solapamiento —dos bucles de drenado corriendo a la vez a propósito— **falló**:
  dos motores en paralelo. El CAS de la cola protege de OTRO proceso, pero no de nosotros
  mismos dentro del mismo proceso (un segundo lifespan, un test, un bug futuro).
- **Fix**: `asyncio.Lock` en `Worker.un_ciclo` → la concurrencia 1 pasa a ser **estructural**,
  no una propiedad emergente de "es que solo lo llamamos desde un sitio".
- **Aplicar en**: toda invariante de concurrencia. Si la garantía depende de que nadie se
  equivoque, no es una garantía — es una costumbre. El test que la ataca es el que la crea.

### 2026-07-12: Un test que reproduce la lógica que prueba no prueba nada
- **Error**: al testear el guard del Coordinador escribí un helper que **repetía** la rama
  del guard dentro del propio test. Pasaba en verde sin ejercitar una sola línea del código
  de producción: un test decorativo.
- **Fix**: montar un servicio A2A real (mismo SDK) que responda `{encolada, posicion}` y
  llamar al cliente REAL (`EjecutorCliente.ejecutar`). Si el guard no existiera, el test
  fallaría — que es la única razón por la que un test existe.
- **Aplicar en**: cualquier test de un guard/validación. Preguntarse siempre: *si borro el
  código de producción, ¿este test se pone rojo?* Si no, es teatro.

---

## Gotchas

> Verificados en el código, no supuestos. Leer ANTES de implementar.

- [ ] **#1 — El tope de gasto NO puede sumar `costo_usd` a secas.** `claude_engine.py::filas_token_usage` (líneas 144-171) deja escrito que con GLM-5.2 vía z.ai el CLI **tarifa con precios de Anthropic** → `costUSD`/`total_cost_usd` llegan **0 o erróneos**; y las filas parciales de una corrida muerta van con `costo_usd: 0.0` a propósito. Un gate que sume `costo_usd` (como hace hoy `coordinador-a2a/presupuesto.py`) **leería ~0 y nunca cortaría**. El gate de la cola suma **tokens** (dato fiable) × tarifa por modelo.
- [ ] **#2 — El encolado no puede ser best-effort.** `estado.py` traga los `httpx.HTTPError` (`except: pass`) porque "el estado nunca tumba la tarea". Con cola, **la fila ES la tarea**: si el INSERT falla y respondemos "encolada, posición 3", mentimos y el trabajo no existe. El encolado y el estado **terminal** deben ser autoritativos (fallar ruidosamente); las transiciones intermedias pueden seguir best-effort.
- [ ] **#3 — El Coordinador espera un veredicto síncrono.** `enjambre.py::correr` hace `await ejecutor.ejecutar(sub)` y lee `salida["veredicto"]`. Si el Ejecutor pasa a devolver `{encolada, posicion}`, el enjambre **rompe en silencio** (leería un veredicto ausente → sub-tarea "fallida"). O se adapta (Fase 7) o se deja el guard escrito.
- [ ] **#4 — La fila debe bastar para ejecutar.** Hoy `tareas` guarda `objetivo/contexto/criterios/intentos_max`, pero **no** `max_turns`, `presupuesto_usd`, `modelo_pref` ni `observaciones`. El worker corre minutos después, desde la fila: sin `payload` completo perdería el ruteo de modelo (y volvería al default de 40 turnos — el techo que mató `mission-control-2026-0001`).
- [ ] **#5 — Dev y tests no tienen Supabase.** `EstadoTareas.activo == False` sin credenciales. Sin una `ColaMemoria`, la cola no arranca en dev y los 219 tests existentes no pueden ejercitarla. Pluggable desde el día 1 (mismo patrón que `Engine`).
- [ ] **#6 — Módulo nuevo = COPY nuevo en el Dockerfile.** El `Dockerfile` del Ejecutor copia archivos **explícitos**. Un `worker.py` sin su COPY = `ModuleNotFoundError` y crash-loop en runtime, que **los tests de dev no cazan** (2026-07-10).
- [ ] **#7 — El repo no es el runtime.** El `SKILL.md` que lee el bot vive en el volumen (`~/businessos/negocio/.hermes/skills/`). Editarlo en el repo no despliega nada. **Diffear antes de pisar** (2026-07-12).
- [ ] **#8 — Cloudflare 1010 con `urllib`.** Todo host-job nuevo (`aviso-cola.py`, `cola-trio.py`) manda `User-Agent: curl/8.0` o recibe 403.
- [ ] **#9 — MCP de Supabase en read-only**: el DDL de la Fase 1 va por management API (`POST /v1/projects/{ref}/database/query`, UA `curl/8.0`, token del env **sin imprimirlo**); la verificación posterior sí por MCP.
- [ ] **#10 — Cron en UTC.** Los contenedores corren en UTC y el server en CST(-6h) (solo relevante si algún aviso se agenda a una hora "humana").
- [ ] **#11 — El `asyncio.shield` del PR #37 sigue siendo necesario**, pero cambia de sitio: ahora protege al **worker** (que ya no depende de ninguna conexión HTTP), no al `execute`. No borrarlo sin entender qué protegía.

## Riesgos cubiertos (los tres que se pidieron)

| Riesgo | Cómo lo cubre este PRP |
|---|---|
| **Dos tareas tocan los mismos archivos y chocan al mergear** (cada rama sale de master y no se ven) | (a) La ejecución serial + **`git fetch` de master antes de cada worktree** (Fase 3) hace que cada tarea arranque del master **más fresco**, incluyendo lo ya mergeado. (b) Lo que quede es un conflicto **de merge en GitHub**, donde un humano lo ve: el trío **detecta y reporta**, no resuelve (misma doctrina que el Coordinador: un conflicto es escalada, nunca "aprobado por partes"). El aviso de Fase 4 nombra las **ramas aprobadas sin mergear**, que es la señal temprana. |
| **Reinicio del contenedor con tareas en cola** | La cola es **durable en Supabase** (`tareas`, no memoria). Al arrancar, el worker **recupera huérfanas** (`en_ejecucion` → `recibida`, o `escalada` si agotó intentos) y avisa. Criterio de éxito explícito + validación en Fase 8 (`docker restart` con cola llena). |
| **El bot concluye estado por adivinanza** | El bot **no espera** el veredicto (ya no hay silencio de 15 min que interpretar). Para el estado **lee `tareas.json`** (extendido con la cola), cita `generado`, y la doctrina del skill prohíbe explícitamente decir "falló"/"el trío está caído" cuando lo que hay es *no sé*. El desenlace llega **empujado** por el host-job, no adivinado. |

## Anti-Patrones

- **NO** dar por encolada una tarea cuya fila no se escribió (mentir al equipo es peor que fallar).
- **NO** añadir un segundo escritor del ciclo de estados de `tareas` (ni el host-job de avisos, ni el bot, ni el Supervisor).
- **NO** exponer un endpoint de reordenamiento accesible al bot/canal: la prioridad es de Elisa, y la autoridad es la credencial.
- **NO** dejar que el Coordinador se salte la cola "solo esta vez".
- **NO** resolver conflictos de merge con un modelo: se detectan y se escalan.
- **NO** añadir superficie HTTP al Ejecutor (`/cola`, `/status`): rompe la opacidad y ya existe el snapshot.
- **NO** confiar en `costo_usd` para cortar gasto (ver Gotcha #1).
- **NO** dar por desplegado un `.md` editado en el repo.

---

*PRP pendiente de aprobación. No se ha modificado código.*
