# PRP-006: Fase 6 — Trío Hermes→Ejecutor→Supervisor (departamento Desarrollo de Software)

> **Estado**: PENDIENTE
> **Fecha**: 2026-07-03
> **Proyecto**: BusinessOS
> **Rama**: `feat/fase6-trio`

---

## Objetivo

Construir lo que `SPEC-trio.md` §7.6 marca "por construir": dos servicios A2A nuevos —
**Ejecutor** (motor Claude Agent SDK pluggable/mockeable, workspace aislado git worktree
por tarea) y **Supervisor** (independiente, motor de reglas determinista que re-ejecuta
gates reales y emite veredicto estructurado)— más la tabla `tareas` en Supabase y el lado
Hermes-Negocio (skill de orquestación: reparte, reintenta con tope, escala; gate humano en
lo irreversible), validado de punta a punta en uso propio con el primer departamento:
**Desarrollo de Software**.

## Por Qué

| Problema | Solución |
|----------|----------|
| Hoy "construir software" vive solo en Claude Code con la dueña al teclado; Hermes-Negocio no puede repartir trabajo de desarrollo a nadie: no existe un servicio que ejecute tareas de código | Servicio A2A **Ejecutor** sobre Claude Agent SDK: recibe UNA tarea con criterios de aceptación, la hace en un worktree aislado y entrega un resultado verificable (diff + artefactos) |
| Un agente que escribe y se auto-aprueba es el patrón "casi solo" que el proyecto ya juzgó no listo para producción | Servicio A2A **Supervisor** físicamente independiente (proceso, contenedor y contexto separados) que re-ejecuta los gates de verdad — no confía en lo que afirma el Ejecutor — y emite veredicto estructurado |
| Sin estado formal de tareas, el reintento entre dos agentes es un bucle infinito quemando tokens y sin trazabilidad | Tabla `tareas` en Supabase (ciclo de estados + contador de intentos con tope) y Hermes como dueño del juicio: reintenta con tope, escala al humano, y pide visto bueno en lo irreversible |
| La Fase 6 del ROADMAP es la salida del sistema hacia "departamento con IA" vendible; sin el trío validado en uso propio no hay nada que replicar por configuración | El trío completo operando el departamento Desarrollo de Software en uso propio, replicando el patrón A2A ya validado del grafo (PRP-005) |

**Valor de negocio**: cierra la salida de Fase 6 del ROADMAP ("un departamento de software
operado por el trío, validado de punta a punta en uso propio, listo para replicarse por
configuración"). Separa juicio (Hermes) de ejecución (el par A2A) — lo que hace el sistema
seguro y, a futuro, defendible de vender. Dogfood directo: los SaaS de la dueña se
construyen con su propio trío.

## Qué

### Criterios de Éxito
- [ ] **Ejecutor A2A**: sirve Agent Card válida ("construyo y modifico software a partir de una tarea con criterios de aceptación, en un workspace aislado; entrego resultado verificable"); recibe la tarea vía `message/send`, crea `worktree/<task_id>` (nunca trabaja sobre `main`), corre su motor y entrega el resultado al Supervisor vía A2A — no a Hermes, no al humano
- [ ] **Motor pluggable**: el Ejecutor corre con `MockEngine` en tests (cero tokens, determinista) y con Claude Agent SDK como motor real detrás de la misma interfaz; cada llamada real de modelo escribe en `token_usage`
- [ ] **Supervisor A2A independiente**: contenedor/proceso/contexto separados del Ejecutor; re-ejecuta él mismo los gates reales sobre el worktree (`build`, `typecheck`, `lint`, tests) ignorando lo que afirme el Ejecutor; **un gate que no se puede correr NUNCA se marca pasado** (es rechazo, con la regla como hallazgo); veredicto estructurado `aprobado/rechazado + hallazgos (regla, evidencia, archivo)`
- [ ] **Reglas auditables**: las reglas del departamento (de `desarrollo-software.md` §2) viven como config versionada y diff-eable; el motor rechaza configs con reglas sin runner ejecutable (imposible "activar" una regla que no se puede comprobar)
- [ ] **Tabla `tareas`** en Supabase: ciclo `recibida → en_ejecucion → en_revision → aprobada/rechazada → concretada` (+ `escalada`/`cancelada`), contador `intentos` con `intentos_max`; RLS habilitado sin políticas (backend-only); la escriben los servicios de confianza, JAMÁS el agente Hermes (secret-scrubbing)
- [ ] **Lado Hermes**: skill de orquestación en la vertical negocio — arma la tarea con criterios de aceptación, la reparte al Ejecutor, mantiene el reintento (rechazo → reenvía con hallazgos, `intento++`), escala al humano al llegar al tope, y en lo irreversible (merge a `main`, deploy, cliente, dinero) SIEMPRE pide visto bueno a la dueña antes de concretar
- [ ] **End-to-end demostrado en dev** (mock engine, cero tokens de test): tarea → Ejecutor → Supervisor rechaza con hallazgos → reintento → Supervisor aprueba → propuesta de merge a la dueña; trazado completo en `tareas`
- [ ] **Opacidad verificada por test**: la superficie de cada servicio nuevo es EXACTAMENTE {card, rpc `/`, `/health`} (Starlette puro, sin `/docs` ni `/openapi.json`)
- [ ] **Empaquetado**: servicios `ejecutor-a2a` y `supervisor-a2a` en `docker-compose.yml` (hermes-net, publicados solo en `127.0.0.1`, límites de recursos, sin secretos en el repo); `docker compose config` valida; pytest completo verde sin regresión (grafo y grafo-a2a intactos)
- [ ] **FUERA de alcance, explícito**: RAG por ámbito por cliente y white-label (futuro, otro PRP); la impresión de CLIs del trío es residual de la corriente Printing Press

### Comportamiento Esperado

La dueña pide por Telegram: *"añade login con Google a la app de recetas"*. Hermes-Negocio
entiende, identifica departamento = software, arma el contexto (repo, `BUSINESS_LOGIC.md`,
skills) y crea la tarea con criterios de aceptación explícitos y `intentos_max`
(`task_id: rec-2026-0042`). La envía al **Ejecutor** vía A2A.

El Ejecutor crea `worktree/rec-2026-0042`, corre su motor (Claude Agent SDK con los skills
de la fábrica), implementa, valida en caliente, y entrega el resultado —diff + artefactos
de build/test— al **Supervisor** vía A2A. El Supervisor, desde su propio proceso, re-ejecuta
los gates reales sobre el worktree: build ✅, typecheck ✅, lint ✅, tests ❌ (callback OAuth
500). Veredicto: `rechazado` con el hallazgo (regla `tests_verdes`, evidencia, archivo).

Hermes incrementa el contador (1/3) y reenvía la tarea al Ejecutor con las observaciones.
Segunda vuelta: gates verdes → `aprobado`. El aprobado vuelve a Hermes; como sigue un merge
a `main` (irreversible), Hermes NO actúa solo: manda por Telegram el resumen + diff y pide
visto bueno. La dueña aprueba → Hermes concreta y registra. Si se agota el tope de intentos,
Hermes escala: *"3 intentos sin pasar el gate de tests. ¿Reviso, ajusto criterios o cancelo?"*.
Cada transición queda en `tareas`; cada llamada de modelo, en `token_usage`.

---

## Contexto

### Referencias
- `businessos/departamentos/SPEC-trio.md` — la especificación completa: roles y fronteras (§2), dos capas de control (§3), flujo punta a punta (§4), reglas A2A (§5), Agent Cards (§6), mecánica runtime con la traza de ejemplo y el motor de reglas (§7), riesgos (§8)
- `businessos/departamentos/desarrollo-software.md` — el paquete de competencias del primer departamento: tareas del Ejecutor (§1, mapean a skills existentes), reglas del Supervisor (§2, mapean a comandos reales), fuentes de conocimiento (§3), recorrido dogfood (§4)
- `businessos/grafo-a2a/` (`app.py`, `card.py`, `executor.py`, `tests/`) — **el patrón a replicar**: Starlette puro + `create_agent_card_routes`/`create_jsonrpc_routes`, `DefaultRequestHandler` + `InMemoryTaskStore`, card con capabilities honestas, tests de card/executor/interop/opacidad con `httpx.ASGITransport`
- `.claude/PRPs/prp-fase5-a2a.md` §Aprendizajes — gotchas ya pagados del `a2a-sdk` 1.1.0 (proto-first, `new_task` antes del primer status update, compat v0.3 en la card)
- `.claude/memory/project/fase5-a2a.md` y `fase6-departamentos.md` — decisiones previas: por qué servicios propios y no "dos Hermes más"; A2A complementa, no reemplaza
- `businessos/docker-compose.yml` — patrón de empaquetado (hermes-net, `127.0.0.1`, límites de recursos, healthcheck stdlib)
- `businessos/supabase-init.sql` / `supabase-fase3.sql` / `supabase-fase4.sql` — convención de tablas backend: idempotentes, `check` de dominio, RLS habilitado SIN políticas (solo service_role), comentarios en tabla
- `businessos/negocio/skills/cli-audit/SKILL.md` — patrón de skill Hermes que LEE snapshots del volumen y no toca credenciales (el agente no maneja secretos)
- `businessos/ROADMAP.md` §FASE 6 — alcance oficial y salida de la fase
- https://docs.claude.com/en/api/agent-sdk — Claude Agent SDK (motor del Ejecutor); verificar contra la versión instalada, no contra blogs

### Decisiones de arquitectura

1. **Dos servicios nuevos, hermanos de `grafo-a2a` (aislar, no fundir):**
   `businessos/ejecutor-a2a/` y `businessos/supervisor-a2a/`. Mismo esqueleto probado:
   Starlette puro, card + JSON-RPC + `/health`, `a2a-sdk` pineado. Nada del trío se mete
   en el grafo, en el dashboard ni en la imagen Hermes.
2. **La independencia del Supervisor es física**: contenedor, proceso y contexto de modelo
   separados; recibe el resultado como entrada externa y juzga de cero. La independencia
   NO es de filesystem: los worktrees viven en un volumen compartido (`trio-workspace`)
   que el Supervisor monta para re-ejecutar los gates él mismo — el diff y el worktree son
   la evidencia, no el testimonio del Ejecutor.
3. **Motor pluggable en el Ejecutor**: interfaz mínima `Engine.run(tarea, workspace) →
   Resultado`; `ClaudeAgentEngine` (Claude Agent SDK, motor real) y `MockEngine`
   (determinista, para tests y para el end-to-end de dev sin quemar tokens). El servicio,
   el protocolo y el worktree se validan al 100% sin modelo; el motor real es un plugin.
4. **Supervisor = motor de reglas determinista, NO un LLM**: cada regla es
   `(comando real → criterio binario → evidencia)`, definida en config versionada
   (`reglas/software.yaml` o equivalente) derivada de `desarrollo-software.md` §2. Gates
   v1: `build`, `typecheck`, `lint`, `tests` (Playwright), más chequeos estáticos
   deterministas (sin `any`, sin secretos obvios, archivos ≤500 líneas, RLS en migraciones
   nuevas). Los gates que requieren modelo (`/code-review`, `security-review`) quedan
   DECLARADOS pero inactivos hasta tener runner real — activarlos sin runner es imposible
   por diseño (config inválida). Gate activo que no puede correr = rechazo con hallazgo,
   jamás "asumido".
5. **Estado en `tareas`, escritura solo de confianza**: los servicios del trío (que ya
   viven fuera del sandbox Hermes y el Ejecutor ya necesita credencial de modelo) escriben
   sus transiciones con service_role; el agente Hermes-Negocio NUNCA toca credenciales
   (secret-scrubbing, aprendizaje 2026-06-30). Hermes consulta estado por A2A (`tasks/get`)
   y/o por snapshot del host-job en el volumen (patrón `cli-audit.json`/pantheon).
6. **Hermes orquesta vía HTTP interno en hermes-net** (como ya consume el grafo REST):
   cliente A2A sin secretos hacia `ejecutor-a2a`. El skill de orquestación vive en
   `businessos/negocio/skills/` y codifica las fronteras: Hermes no escribe código, no se
   auto-aprueba, y el gate humano en lo irreversible es SIEMPRE (merge, deploy, cliente,
   dinero) — patrón de aprobación heredado de `clientes/AGENTS.md`.
7. **Flujo A2A fiel a la SPEC**: Hermes→Ejecutor (tarea) y Ejecutor→Supervisor (resultado)
   son A2A; el veredicto vuelve estructurado para que Hermes decida reintento/escalado sin
   ambigüedad. Opacidad: ninguno expone su interior; se anuncian por capacidad en su card
   (Ejecutor no promete decidir alcance ni desplegar; Supervisor no promete construir).
8. **Presupuesto**: cada llamada de modelo del motor real escribe en `token_usage`
   (vertical/etiqueta propia del trío); el tope de intentos corta el lazo Ejecutor↔Supervisor;
   negocio sigue vigilando el gasto con lo ya construido (Fase 1/4).
9. **Exposición**: hoy `127.0.0.1` + hermes-net, sin auth pública — misma postura que todo
   el stack. Exponer el trío a internet NO es de esta fase.

### Arquitectura Propuesta

```
businessos/ejecutor-a2a/
├── card.py            # AgentCard: "construyo software con criterios de aceptación..."
├── executor.py        # AgentExecutor A2A: tarea → workspace → engine → resultado → Supervisor
├── engine.py          # interfaz Engine + ClaudeAgentEngine (SDK real) + MockEngine
├── workspace.py       # git worktree por task_id (worktree/<task_id>, nunca main)
├── estado.py          # transiciones en tabla `tareas` (service_role, solo servicio)
├── app.py             # Starlette puro: card + jsonrpc + /health (patrón grafo-a2a)
├── requirements.txt   # a2a-sdk pineado, claude-agent-sdk, httpx, uvicorn
├── Dockerfile
├── conftest.py
└── tests/             # card, workspace, executor con MockEngine, errores → failed

businessos/supervisor-a2a/
├── card.py            # AgentCard: "valido un resultado contra reglas de departamento..."
├── executor.py        # AgentExecutor A2A: resultado → gates → veredicto estructurado
├── gates.py           # runners reales: build/typecheck/lint/tests + chequeos estáticos
├── reglas/            # config versionada por departamento (software.yaml)
├── veredicto.py       # aprobado/rechazado + hallazgos (regla, evidencia, archivo)
├── app.py             # Starlette puro: card + jsonrpc + /health
├── requirements.txt   # a2a-sdk pineado, httpx, uvicorn (SIN SDK de modelo: determinista)
├── Dockerfile
├── conftest.py
└── tests/             # reglas/gates, gate-no-ejecutable=rechazo, veredicto, opacidad

businessos/negocio/skills/trio-software/
└── SKILL.md           # orquestación: armar tarea, repartir, reintentar con tope,
                       #   escalar, gate humano en lo irreversible

businessos/supabase-fase6.sql      # tabla `tareas` (idempotente, RLS sin políticas)
businessos/docker-compose.yml      # + ejecutor-a2a, supervisor-a2a (hermes-net,
                                   #   127.0.0.1, volumen trio-workspace, límites)
```

### Modelo de Datos

```sql
-- supabase-fase6.sql — tabla de estado del trío (backend-only, como token_usage)
create table if not exists public.tareas (
  id            bigint generated always as identity primary key,
  task_id       text        not null unique,
  departamento  text        not null default 'software',
  objetivo      text        not null,
  contexto      jsonb       not null default '{}'::jsonb,   -- repo, business_logic, skills
  criterios     jsonb       not null default '[]'::jsonb,   -- criterios de aceptación
  estado        text        not null default 'recibida'
    check (estado in ('recibida','en_ejecucion','en_revision',
                      'aprobada','rechazada','escalada','concretada','cancelada')),
  intentos      integer     not null default 0 check (intentos >= 0),
  intentos_max  integer     not null default 3 check (intentos_max >= 1),
  resultado     jsonb,      -- último resultado del Ejecutor (ref al diff, artefactos)
  veredicto     jsonb,      -- último veredicto del Supervisor (hallazgos con evidencia)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists tareas_estado_idx on public.tareas (estado);
create index if not exists tareas_departamento_idx on public.tareas (departamento);

alter table public.tareas enable row level security;
-- (sin políticas: solo service_role — la escriben los servicios del trío, nunca el agente)
```

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo fases. Las subtareas se generan al entrar a cada fase
> con el bucle agéntico (mapear contexto → generar subtareas → ejecutar).

### Fase 1: Contrato del trío + tabla `tareas`
**Objetivo**: El vocabulario común queda fijado: esquema de tarea (task_id, objetivo,
contexto, criterios, límites), de resultado del Ejecutor (diff + artefactos) y de veredicto
del Supervisor (aprobado/rechazado + hallazgos con regla/evidencia/archivo) como payloads
A2A documentados; `supabase-fase6.sql` idempotente con la tabla `tareas` (ciclo de estados,
tope de intentos, RLS sin políticas) aplicado.
**Validación**: SQL aplicado y re-aplicable sin error; los esquemas del contrato tienen
tests de validación propios; el ciclo de estados de la SPEC §7.2 representado 1:1.

### Fase 2: Ejecutor A2A (esqueleto + card + workspace + motor pluggable)
**Objetivo**: `businessos/ejecutor-a2a/` sirve su Agent Card honesta y atiende
`message/send`: valida la tarea, crea `worktree/<task_id>` (nunca `main`), corre el motor
detrás de la interfaz `Engine` (con `MockEngine` determinista), registra transiciones en
`tareas` y entrega el resultado al Supervisor vía A2A (cliente A2A saliente, mockeado en
tests). Entrada inválida o fallo del workspace → tarea `failed` con razón clara.
**Validación**: pytest verde con MockEngine (cero tokens): card válida, worktree creado y
aislado, resultado bien formado, errores → `failed`; superficie = {card, rpc, health}.

### Fase 3: Supervisor A2A (motor de reglas determinista)
**Objetivo**: `businessos/supervisor-a2a/` (contenedor/proceso aparte) recibe un resultado,
localiza el worktree en el volumen compartido y re-ejecuta los gates reales de la config
versionada (`reglas/software.yaml`: build, typecheck, lint, tests + chequeos estáticos);
gate activo que no puede correr = rechazo con hallazgo (nunca "asumido"); config con regla
sin runner = config inválida (el servicio no arranca); emite veredicto estructurado y
registra en `tareas`. Sin SDK de modelo: 100% determinista.
**Validación**: pytest verde: gates pasan/fallan con evidencia real sobre un worktree de
fixture; el test "gate no ejecutable → rechazado" existe y pasa; veredicto conserva regla +
evidencia + archivo; superficie = {card, rpc, health}.

### Fase 4: Motor real Claude Agent SDK en el Ejecutor
**Objetivo**: `ClaudeAgentEngine` implementa la interfaz `Engine` con el Claude Agent SDK
(introspección de la versión instalada, no blogs): corre el bucle de codificación en el
worktree con los skills de la fábrica disponibles, respeta `limites` de la tarea
(modelo preferido, presupuesto) y escribe cada llamada de modelo en `token_usage`.
Seleccionable por env (`EJECUTOR_ENGINE=claude|mock`); el default de tests sigue siendo mock.
**Validación**: pytest sigue verde con mock (cero regresión); unit tests del engine real con
el SDK mockeado (mapeo tarea→sesión, registro en token_usage, respeto de límites); smoke
real opcional y explícitamente gated (nunca en CI/pytest normal).

### Fase 5: Lado Hermes — skill de orquestación + lazo de reintento
**Objetivo**: Skill `trio-software` en la vertical negocio: Hermes arma la tarea con
criterios de aceptación, la envía al Ejecutor (HTTP interno A2A en hermes-net, sin
credenciales), interpreta el veredicto estructurado, reintenta con hallazgos hasta
`intentos_max`, escala al humano al agotarse, y ante lo irreversible (merge, deploy,
cliente, dinero) SIEMPRE propone y espera visto bueno de la dueña — nunca concreta solo.
Hermes consulta estado sin secretos (A2A `tasks/get` y/o snapshot host-job en el volumen).
**Validación**: SKILL.md respeta la arquitectura real (el agente no maneja secretos, lee
snapshots — aprendizaje 2026-06-30); recorrido de escritorio del skill cubre: éxito directo,
rechazo→reintento, tope→escalado, e irreversible→gate humano.

### Fase 6: Interop end-to-end + opacidad + empaquetado
**Objetivo**: El lazo completo demostrado en dev con el patrón de interop de PRP-005
(cliente del SDK + `httpx.ASGITransport`/uvicorn local): tarea → Ejecutor (MockEngine) →
Supervisor (gates reales sobre worktree de fixture) → rechazo con hallazgos → reintento →
aprobado → estado final en `tareas`. Tests de opacidad de ambos servicios. Dockerfiles +
servicios en `docker-compose.yml` (hermes-net, `127.0.0.1`, volumen `trio-workspace`,
límites de recursos, sin secretos en el repo; llaves por env del host).
**Validación**: test de interop end-to-end verde con cero llamadas a modelo; tests de
opacidad verdes (superficie exacta {card, rpc, health} en ambos); `docker compose config`
valida (con `.env` temporal copia del example — gotcha conocido); grafo y grafo-a2a sin
regresión.

### Fase 7: Validación Final + docs vivas
**Objetivo**: Sistema coherente de punta a punta; conocimiento persistido.
**Validación**:
- [ ] pytest completo del repo verde (ejecutor-a2a + supervisor-a2a + grafo + grafo-a2a sin regresión)
- [ ] Criterios de éxito del PRP cumplidos (incluido el end-to-end con reintento y gate humano)
- [ ] Docs vivas: ROADMAP (Fase 6 con estado y residuales), memoria (`fase6-departamentos.md` actualizado o `fase6-trio.md`), `BUSINESS_LOGIC.md`, aprendizajes al CLAUDE.md si aplican, `SPEC-trio.md` §7.6 actualizado (reusado vs construido)
- [ ] Residuales explícitos en ROADMAP: `compose up` real del trío en la máquina runtime/Droplet; smoke con motor real (tokens) decidido por la dueña; gates de modelo del Supervisor (`/code-review`, `security-review`) cuando tengan runner; RAG por ámbito y white-label = futuro, otro PRP; CLIs del trío = corriente Printing Press

---

## 🧠 Aprendizajes (Self-Annealing / Neural Network)

> Esta sección CRECE con cada error encontrado durante la implementación.
> El conocimiento persiste para futuros PRPs. El mismo error NUNCA ocurre dos veces.

*(vacío — se llena durante la implementación; los aprendizajes A2A previos ya están
sembrados abajo como Gotchas, heredados de PRP-005)*

---

## Gotchas

> Críticos ANTES de implementar (los de A2A vienen pagados de PRP-005 — no repagarlos)

- [ ] **`a2a-sdk` 1.1.0 es proto-first**: `a2a.types` son clases protobuf, no Pydantic; el extra `[http-server]` trae Starlette pero NO FastAPI. Construir con `create_agent_card_routes` + `create_jsonrpc_routes` sobre Starlette puro (además protege la opacidad: sin `/docs`/`/openapi.json`). Introspeccionar SIEMPRE el SDK instalado, nunca copiar de blogs.
- [ ] **El executor A2A debe encolar `new_task(...)` ANTES del primer status update** (`InvalidAgentResponseError` si no). Los unit tests con cola espía NO lo cazan; el test de interop con el cliente del SDK sí — por eso el interop es obligatorio en ambos servicios.
- [ ] **Card servida agrega compat v0.3** (`preferredTransport`): validar round-trip con `ignore_unknown_fields=True`.
- [ ] **Hermes NO maneja secretos** (secret-scrubbing por diseño): el skill de orquestación jamás pide/usa `service_role`; habla HTTP interno A2A y lee snapshots del volumen. La escritura a `tareas` es de los servicios de confianza. Probar cambios de AGENTS/skills en sesión nueva (`/new`).
- [ ] **El Supervisor no comparte proceso ni contexto con el Ejecutor** — pero SÍ necesita el worktree para re-ejecutar gates: volumen compartido montado en ambos. La frontera es de juicio (juzga de cero), no de filesystem.
- [ ] **Gate no ejecutable = rechazo, no "asumido"**: si `npm run build` no puede correr (deps rotas, worktree ausente), el veredicto es `rechazado` con ese hallazgo. Anti-sello-de-goma; hermano de "citar fuentes, no inventar".
- [ ] **Worktree por tarea, jamás `main`**: `git worktree add worktree/<task_id>`; limpiar worktrees al concretar/cancelar (los worktrees huérfanos bloquean branches).
- [ ] **Tope de intentos SIEMPRE**: sin `intentos_max` el lazo Ejecutor↔Supervisor es un bucle infinito quemando tokens. El humano entra cuando la máquina se atasca, no en cada paso.
- [ ] **Los tests corren con MockEngine y sin red externa**: interop contra localhost (`httpx.ASGITransport`/uvicorn local, patrón grafo-a2a); cero tokens en CI. El motor real solo en smoke gated y opt-in.
- [ ] **Puertos solo `127.0.0.1`**: Docker se salta UFW; binding localhost + hermes-net son la barrera. Nada de `0.0.0.0`.
- [ ] **Esta máquina**: python3.14 con venv sin pip (bootstrap `get-pip.py`); `docker compose config` exige `.env` aunque sea copia temporal del example; daemon Docker puede estar apagado (validar con uvicorn + tests; `compose up` es residual runtime).
- [ ] **Claude Agent SDK es reciente y cambia**: pinear versión exacta en requirements; verificar API contra la instalación (mismo criterio que con `a2a-sdk`).
- [ ] **Las cards no deben mentir**: capabilities de streaming/push en `false` mientras no existan; el Ejecutor no promete decidir alcance ni desplegar; el Supervisor no promete construir.

## Anti-Patrones

- NO fundir Ejecutor y Supervisor en un servicio ni dejar que el Ejecutor se auto-apruebe (un supervisor que es parte del ejecutor no supervisa nada)
- NO dejar que el Supervisor "confíe" en los artefactos que reporta el Ejecutor: re-ejecuta o rechaza
- NO usar un LLM en el motor de reglas del Supervisor (determinista por diseño; los gates de modelo entran solo cuando tengan runner real)
- NO hacer merge a `main`, deploy, ni nada de cara al cliente/dinero sin visto bueno humano — tampoco "solo esta vez"
- NO darle secretos al agente Hermes ni instruirlo a usarlos (secret-scrubbing; patrón host-job/snapshot)
- NO crear "dos Hermes más" en vez de servicios propios (la imagen Nous Hermes es un loop de asistente, no un motor de codificación)
- NO tocar grafo ni grafo-a2a (sus contratos —`openapi.json`, superficie A2A— están validados y son de otras fases)
- NO arrancar RAG por ámbito, white-label, ni exposición pública del trío en este PRP (futuro, con su propio PRP)
- NO improvisar reglas del Supervisor fuera de la config versionada (reglas mal definidas = falsa seguridad)
- NO quemar tokens en tests: MockEngine por default; el motor real es opt-in explícito

---

*PRP pendiente aprobación. No se ha modificado código.*
