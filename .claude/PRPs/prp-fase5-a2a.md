# PRP-005: Fase 5 — Interoperabilidad A2A (el grafo como agente A2A independiente)

> **Estado**: COMPLETADO (núcleo, 2026-07-03) — residuales de runtime en ROADMAP §Fase 5
> **Fecha**: 2026-07-03
> **Proyecto**: Hermes OS · A2A

---

## Objetivo

Exponer el grafo regulatorio como un **agente A2A independiente** (`grafo-a2a`): un
servicio nuevo en hermes-net que sirve su Agent Card en `/.well-known/agent-card.json`
("evalúo impacto fiscal/contable/contractual en LATAM") y atiende `message/send` del
protocolo A2A, puenteando internamente a la API REST del grafo — de modo que cualquier
agente (propio, de un cliente, de un socio) lo consulte **sin conocer su interior**.

## Por Qué

| Problema | Solución |
|----------|----------|
| El grafo solo es consumible por quien conoce su REST interno (`http://grafo:3000` + su schema): las verticales y los host-jobs. Un agente externo no tiene forma formal de descubrirlo ni consumirlo | Agent Card estándar (a2aproject / Linux Foundation) que anuncia la capacidad y un endpoint A2A que cualquier cliente del protocolo consume sin acuerdos ad-hoc |
| Abrir el grafo "a mano" (compartir su OpenAPI + puerto) expondría su interior: reglas, seed, endpoints operativos (`/salud-conocimiento`, listado de evaluaciones) | La superficie A2A expone UNA capacidad (evaluar) y devuelve solo el producto (veredicto + fuentes + disclaimer). Reglas, DB y endpoints internos quedan opacos |
| La Fase 6 (trío Hermes→Ejecutor→Supervisor) necesita que los pares se hablen por A2A con Agent Cards; hoy no existe ni un solo servicio A2A de referencia en el sistema | `grafo-a2a` establece el patrón completo (servidor + card + executor + cliente de verificación) que Ejecutor y Supervisor replicarán |

**Valor de negocio**: cierra la salida de Fase 5 del ROADMAP ("el cerebro regulatorio
convertido en servicio reutilizable por un ecosistema de agentes"). El grafo pasa de
componente interno a **producto consumible por agentes de terceros**, y el proyecto queda
con el patrón A2A validado del que depende toda la Fase 6.

## Qué

### Criterios de Éxito
- [x] `grafo-a2a` sirve un Agent Card válido en `/.well-known/agent-card.json` que anuncia la capacidad ("evalúa impacto fiscal/contable/contractual LATAM con fuente citada; señala, no asesora") y sus skills con ejemplos
- [x] Un cliente A2A (SDK oficial, simulando "agente de un tercero") descubre el agente por su card y completa una evaluación end-to-end vía `message/send`: recibe veredicto + fuentes + checklist + **disclaimer íntegros** en el artifact (test_interop: deducible MX-LISR-27-V real)
- [x] Opacidad verificada: la superficie A2A NO expone reglas, seed, DB, `/salud-conocimiento` ni el listado de evaluaciones — solo la capacidad de evaluar (test_opacidad: inventario de rutas == {card, rpc, health})
- [x] El grafo NO cambia: sus tests siguen verdes (51) y su `openapi.json` (contrato del CLI) queda byte-idéntico (diff de `businessos/grafo/` vacío en toda la rama)
- [x] Flujo de cero tokens: el executor es un puente determinista (sin LLM instalado ni invocado); una consulta A2A no gasta presupuesto de IA
- [x] Servicio `grafo-a2a` en `docker-compose.yml`: hermes-net, publicado SOLO en `127.0.0.1`, límites de recursos, sin secretos; pytest del servicio nuevo verde (17 tests; `compose config` validado + smoke uvicorn)

### Comportamiento Esperado

Un agente cualquiera (dentro de hermes-net hoy; un socio mañana) hace
`GET http://grafo-a2a:4000/.well-known/agent-card.json` y descubre: nombre, descripción
de la capacidad, skills (`evaluar-impacto-regulatorio`), modos de entrada/salida
(JSON estructurado y texto), y que NO hay streaming ni push (request/response simple).

Le envía un `message/send` con un `DataPart` que contiene la solicitud
(`{contexto: {jurisdiccion, dimension, regimen, fecha}, conceptos: [...]}`) — o un
`TextPart` con conceptos en texto libre (contexto default MX/fiscal; el fail-safe
`dudoso` del grafo cubre lo no clasificable). El executor valida la entrada, llama
internamente a `POST http://grafo:3000/evaluaciones`, y devuelve la tarea completada
con un artifact que contiene la `EvaluacionResponse` **completa e intacta**: veredicto
por concepto, banderas rojas, checklist, fuentes citadas y disclaimer.

Si el grafo está caído o la entrada es inválida, la tarea falla con un mensaje claro
(nunca un veredicto inventado). El caller jamás ve el interior: ni qué reglas existen,
ni el estado del conocimiento, ni evaluaciones de otros. Las verticales Hermes siguen
usando el REST directo (`http://grafo:3000`) — A2A es la puerta formal para pares,
complementa, no reemplaza.

---

## Contexto

### Referencias
- `businessos/ROADMAP.md` §FASE 5 — alcance oficial: Agent Card + SDK, servicio en hermes-net, opacidad preservada, complementa MCP
- `businessos/departamentos/SPEC-trio.md` §5 — reglas A2A de Fase 6 que este patrón debe dejar establecidas (Agent Cards de Ejecutor/Supervisor, "igual que el grafo como agente A2A en Fase 5")
- `businessos/grafo/app.py` + `schemas.py` — el contrato del grafo: `POST /evaluaciones` (`EvaluacionRequest` → `EvaluacionResponse` con disclaimer SIEMPRE). El puente A2A consume SOLO este endpoint
- `businessos/grafo/Dockerfile` y `docker-compose.yml` (servicios `grafo`/`a2abot`) — patrón de empaquetado: python:3.12-slim, healthcheck stdlib, `127.0.0.1`, límites de recursos, hermes-net
- `.claude/memory/project/fase2-grafo.md` — regla de oro (fail-safe dudoso, disclaimer siempre, cero afirmación sin fuente) y gotchas de esta máquina
- https://github.com/a2aproject/a2a-python — SDK oficial (`a2a-sdk` en PyPI, v1.0 estable ~mayo-junio 2026): `A2AStarletteApplication`, `DefaultRequestHandler`, `AgentExecutor`, `InMemoryTaskStore`, cliente para tests
- https://a2a-protocol.org — spec: Agent Card en `/.well-known/agent-card.json`, JSON-RPC 2.0 en `/`, `message/send`, estados de tarea

### Decisiones de arquitectura

1. **Servicio nuevo `businessos/grafo-a2a/`, no endpoints nuevos en el grafo.**
   Principio "aislar, no fundir": el grafo queda intacto (su `openapi.json` es el
   contrato del CLI impreso; mezclarle rutas A2A lo contaminaría). El agente A2A es un
   **puente determinista** delante del grafo, en contenedor propio.
2. **SDK oficial de Python** (`a2a-sdk`, pineado): mismo lenguaje que el grafo, executor
   sin LLM. La evaluación ya es determinista; A2A solo agrega descubrimiento y protocolo.
   Cero tokens por consulta (coherente con Fase 1).
3. **Opacidad por diseño**: el executor solo conoce `POST /evaluaciones`. Aunque el
   grafo tiene más endpoints, el agente A2A no los rutea ni los menciona. La respuesta
   ya es opaca-por-producto: cita fuentes (regla de oro) sin exponer el conjunto de
   reglas ni el seed.
4. **Tareas efímeras** (`InMemoryTaskStore`, KISS/YAGNI): la persistencia de valor ya
   existe — el grafo guarda cada evaluación en su Postgres. No se duplica estado.
5. **Sin streaming ni push notifications** en la card (capabilities en falso): la
   evaluación es sub-segundo y síncrona. Se habilitan solo si un caso real lo pide.
6. **Exposición**: hoy `127.0.0.1` + hermes-net (misma postura que todo el stack:
   ningún puerto público). La URL del Agent Card es configurable por env
   (`GRAFO_A2A_PUBLIC_URL`, default `http://grafo-a2a:4000`) para que el card no mienta
   cuando algún día se publique detrás de auth — publicar hacia internet con
   `securitySchemes` reales es residual futuro, NO de esta fase.
7. **Sin secretos**: `grafo-a2a` no toca Supabase ni llaves; solo HTTP interno al grafo.
   Compatible con el secret-scrubbing de Hermes: cualquier vertical podría consumirlo.

### Arquitectura Propuesta

```
businessos/grafo-a2a/
├── card.py            # AgentCard: nombre, descripción, skills, modos, capabilities
├── executor.py        # AgentExecutor determinista: parts → EvaluacionRequest →
│                      #   POST grafo /evaluaciones → artifact (respuesta íntegra)
├── app.py             # A2AStarletteApplication + DefaultRequestHandler + task store
├── requirements.txt   # a2a-sdk (pineado), httpx, uvicorn
├── Dockerfile         # python:3.12-slim, healthcheck stdlib (mismo patrón que grafo/)
├── conftest.py
└── tests/             # card, executor (grafo mockeado), interop con cliente SDK,
                       #   opacidad (rutas internas inalcanzables), errores → failed

businessos/docker-compose.yml   # + servicio grafo-a2a (hermes-net, 127.0.0.1:4000,
                                #   GRAFO_URL=http://grafo:3000, depends_on grafo)
```

### Modelo de Datos

Ninguno nuevo. Las evaluaciones ya se persisten en el Postgres del grafo (vía el
`POST /evaluaciones` que el puente invoca); las tareas A2A son efímeras en memoria.

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo fases. Las subtareas se generan al entrar a cada fase
> con el bucle agéntico (mapear contexto → generar subtareas → ejecutar).

### Fase 1: Esqueleto A2A + Agent Card
**Objetivo**: `businessos/grafo-a2a/` arranca con el SDK oficial: Agent Card servida en
`/.well-known/agent-card.json` (capacidad, skills con ejemplos, modos, capabilities
false), executor stub, venv local y versiones pineadas.
**Validación**: uvicorn local sirve un card que valida contra los tipos del SDK;
pytest del card verde; el grafo intacto.

### Fase 2: Executor puente (message/send → grafo → artifact)
**Objetivo**: Flujo real determinista: `DataPart` (solicitud estructurada) y `TextPart`
(texto libre → contexto default) → validación → `POST http://grafo:3000/evaluaciones` →
tarea completada con artifact que conserva veredictos + fuentes + checklist +
disclaimer íntegros; grafo caído o entrada inválida → tarea `failed` con razón clara.
**Validación**: pytest con grafo mockeado cubre happy path, texto libre, y errores;
invariante testeado: el artifact SIEMPRE contiene disclaimer y fuentes.

### Fase 3: Interoperabilidad y opacidad verificadas
**Objetivo**: Un cliente A2A del SDK (simulando agente de un tercero) descubre por card
y evalúa end-to-end contra el servicio corriendo con el grafo real (uvicorn + reglas
reales, patrón Fase 2 del grafo). Test de opacidad: desde la superficie A2A no se
alcanza `/salud-conocimiento`, listado de evaluaciones, reglas ni seed.
**Validación**: test de interop verde con evaluación real citando fuente; test de
opacidad verde; cero llamadas a LLM en todo el flujo.

### Fase 4: Empaquetado runtime
**Objetivo**: Dockerfile + servicio `grafo-a2a` en `docker-compose.yml` (hermes-net,
`127.0.0.1:4000`, `depends_on: grafo`, límites de recursos, `GRAFO_A2A_PUBLIC_URL`
documentada en `.env.example`), y AGENTS.md/notas donde aplique: verticales siguen en
REST directo; A2A es la puerta para pares.
**Validación**: `docker compose config` valida (con `.env` temporal copia del example —
gotcha conocido); build local si el daemon está disponible (residual runtime si no).

### Fase 5: Validación Final + docs vivas
**Objetivo**: Sistema end-to-end en dev; conocimiento persistido.
**Validación**:
- [ ] pytest completo verde (grafo-a2a + grafo sin regresión, `openapi.json` del grafo sin cambios)
- [ ] Interop cliente→card→evaluación con fuentes y disclaimer, demostrada y documentada
- [ ] Criterios de éxito del PRP cumplidos
- [ ] Docs vivas: ROADMAP (Fase 5 con estado y residuales), memoria (`fase5-a2a.md`), BUSINESS_LOGIC.md, aprendizajes en CLAUDE.md si aplican
- [ ] Residuales explícitos en ROADMAP: `compose up` real en la máquina runtime/Droplet; exposición pública con auth (futuro); capa económica (Circle/USDC) NO es de este PRP

---

## 🧠 Aprendizajes (Self-Annealing)

> Esta sección CRECE con cada error encontrado durante la implementación.
> El mismo error NUNCA ocurre dos veces.

### 2026-07-03: a2a-sdk v1.x es proto-first y NO trae FastAPI
- **Error**: los tutoriales (v0.2) muestran tipos Pydantic y `A2AStarletteApplication`;
  la v1.1.0 real usa mensajes **protobuf** (`a2a.types` = clases proto, sin
  `model_fields`) y el extra `[http-server]` instala Starlette pero NO FastAPI.
- **Fix**: construir la app con `create_agent_card_routes` + `create_jsonrpc_routes`
  sobre **Starlette puro** — además es MEJOR para la opacidad: no existen `/docs` ni
  `/openapi.json` autogenerados. Introspeccionar SIEMPRE el SDK instalado
  (`inspect.signature`), nunca copiar de blogs.
- **Aplicar en**: Fase 6 (Ejecutor/Supervisor A2A) y cualquier servicio A2A nuevo.

### 2026-07-03: el executor v1 debe encolar el Task ANTES del primer status update
- **Error**: `InvalidAgentResponseError: Agent should enqueue Task before
  TaskStatusUpdateEvent event` — el patrón v0.2 (TaskUpdater directo) ya no basta.
- **Fix**: si `context.current_task is None`, encolar
  `new_task(task_id, context_id, TASK_STATE_SUBMITTED, history=[message])` como primer
  evento, y LUEGO usar TaskUpdater. Los unit tests con cola espía no detectan esta
  regla (la valida `active_task` del server): el test de interop con el cliente del
  SDK es el que la caza.
- **Aplicar en**: todo AgentExecutor de la Fase 6.

### 2026-07-03: la card servida agrega campos de compat v0.3
- **Error**: round-trip estricto `json_format.ParseDict(card_json, AgentCard())`
  falla: el SDK sirve `preferredTransport` (compat v0.3) que el proto v1 no tiene.
- **Fix**: validar con `ignore_unknown_fields=True` (sigue validando los campos del
  tipo).
- **Aplicar en**: tests de cards A2A.

---

## Gotchas

> Críticos ANTES de implementar

- [ ] **`a2a-sdk` v1.0 es reciente (~mayo-junio 2026)**: pinear versión exacta en
  requirements; los tutoriales viejos usan `/.well-known/agent.json` — el path vigente
  es **`/.well-known/agent-card.json`**. Verificar contra la versión instalada, no
  contra blogs.
- [ ] **No tocar el grafo**: su `openapi.json` es el contrato del CLI de Printing Press;
  cualquier ruta nueva ahí rompe/contamina la impresión. Todo lo A2A vive en el
  servicio nuevo.
- [ ] **El executor NO es un LLM**: puente determinista. Si una entrada no se entiende,
  la tarea falla o el grafo responde `dudoso` (fail-safe) — nunca "interpretar" con
  un modelo (costaría tokens y rompería la trazabilidad de fuentes).
- [ ] **Regla de oro atraviesa el protocolo**: el artifact lleva la `EvaluacionResponse`
  completa; prohibido resumir quitando disclaimer o fuentes (invariante con test).
- [ ] **Puerto solo `127.0.0.1`**: Docker se salta UFW; el binding localhost + hermes-net
  son la barrera. Nada de `0.0.0.0` ni Caddy en esta fase.
- [ ] **Esta máquina**: python3.14 con venv sin pip (bootstrap get-pip.py); daemon
  Docker apagado (validar con uvicorn + tests, `compose up` es residual runtime);
  `docker compose config` exige `.env` aunque sea copia temporal del example.
- [ ] **Sandbox sin red en tests**: el interop test debe correr contra localhost
  (uvicorn local), y los unit tests con el grafo mockeado — no depender de red externa
  ni de PyPI en tiempo de test.
- [ ] **La card no debe mentir**: `url` sale de `GRAFO_A2A_PUBLIC_URL`; capabilities
  de streaming/push en `false` mientras no existan de verdad.

## Anti-Patrones

- NO meter endpoints A2A dentro del grafo (aislar, no fundir)
- NO exponer `/salud-conocimiento`, listado de evaluaciones, reglas o seed por A2A
  (la opacidad es requisito de la fase, no un detalle)
- NO usar un LLM en el puente ni "enriquecer" la respuesta del grafo
- NO abrir puertos públicos ni agregar auth a medias "para probar con un socio"
- NO duplicar persistencia de evaluaciones en el servicio A2A (ya las guarda el grafo)
- NO arrancar la capa económica (Circle/USDC, contratos-blockchain) en este PRP: es el
  mismo horizonte pero OTRO trabajo, con su propio PRP cuando toque
- NO reemplazar el consumo REST de las verticales por A2A (complementa, no reemplaza)

---

*PRP pendiente aprobación. No se ha modificado código.*
