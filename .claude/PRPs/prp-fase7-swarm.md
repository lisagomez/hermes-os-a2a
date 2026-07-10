# PRP-007: Fase 7 — Swarm (enjambre de Ejecutores) en el departamento de Desarrollo de Software

> **Estado**: APROBADO (2026-07-04, por la dueña)
> **Fecha**: 2026-07-04
> **Proyecto**: Hermes OS · A2A
> **Rama sugerida**: `feat/fase7-swarm`
> **Depende de**: PRP-006 (Fase 6, trío Hermes→Ejecutor→Supervisor) — YA construido y validado en dev.
>
> **Decisiones resueltas al aprobar:**
> 1. **Atribución de presupuesto:** columna `task_id` nullable en `token_usage` (corte exacto por sub-tarea).
> 2. **Nombre del servicio:** `coordinador-a2a` (por rol, consistente con ejecutor/supervisor).

---

## Objetivo

Escalar el departamento de Desarrollo de Software de **un Ejecutor por tarea** a un
**enjambre (swarm) de Ejecutores coordinados** que trabajan en paralelo sobre sub-tareas
de una feature grande: un servicio A2A nuevo **Coordinador** descompone la feature en un
DAG de sub-tareas con alcances disjuntos, las reparte en paralelo al Ejecutor (con tope de
fan-out y presupuesto), integra las ramas aprobadas y entrega **una rama integrada
verificada de cero por el Supervisor** — o escala. Se reusan sin tocar el Ejecutor y el
Supervisor de la Fase 6; se extienden `contrato.py`, la tabla `tareas` y el skill de
orquestación.

## Por Qué

| Problema | Solución |
|----------|----------|
| Una feature grande (login + perfil + panel + emails) hoy es UNA tarea secuencial en UN worktree: lenta, monolítica, y un rechazo tardío desperdicia todo el trabajo previo | El **Coordinador** descompone en sub-tareas independientes con criterios propios; el Ejecutor las corre **en paralelo**, cada una en su worktree, y cada parte se aprueba (o reintenta) por separado antes de integrarse |
| No hay forma de acotar el gasto ni el radio de impacto cuando se lanza trabajo en paralelo: N agentes sin límite = fuga de tokens y de recursos | **Tope de fan-out** (`fan_out_max`: nunca más de N Ejecutores concurrentes) + **presupuesto acumulado** leído de `token_usage` que corta el enjambre y escala cuando se agota — "acotar antes de escalar" hecho mecánica |
| Aunque cada parte pase sus gates, la **suma puede romperse** (dos ramas que compilan por separado chocan al integrarse); confiar en los sub-veredictos sería un sello de goma | Tras integrar, el Coordinador pide **una verificación final del Supervisor sobre la rama integrada**: el todo se re-gatea de cero. Verificar antes de confiar, a nivel feature |
| El Ejecutor único no aprovecha que el protocolo A2A ya es concurrente ni que el aislamiento por worktree ya existe (Fase 6) | El enjambre reusa el Ejecutor→Supervisor tal cual (cada sub-tarea es una `tarea` válida del contrato existente); solo se añade la capa de coordinación como servicio hermano — "aislar, no fundir" |

**Valor de negocio**: features grandes construidas en horas-paralelo en vez de
horas-secuencia, con el mismo aislamiento y las mismas garantías de seguridad de la Fase 6
(Supervisor independiente + gate humano en lo irreversible). Es el primer paso hacia
"departamentos que escalan por configuración": más capacidad sin más humano al teclado, sin
relajar ninguna frontera. Dogfood directo: las features grandes de los SaaS de la dueña se
construyen con su propio enjambre.

## Qué

### Criterios de Éxito

- [ ] **Coordinador A2A** (`businessos/coordinador-a2a/`): sirve Agent Card honesta
  ("descompongo una feature grande en sub-tareas coordinadas, las reparto en paralelo con
  tope de fan-out y presupuesto, integro lo aprobado y entrego una rama integrada verificada
  — o escalo; NO escribo código, NO apruebo, NO despliego"); recibe la feature grande vía
  A2A de Hermes; es un servicio **hermano** de `ejecutor-a2a`/`supervisor-a2a`, sin tocarlos.
- [ ] **Planner pluggable/mockeable**: interfaz `Planner.plan(tarea_padre) → plan` con
  `MockPlanner` (determinista, cero tokens, lee el plan de `contexto` en tests) y un planner
  real (modelo) opt-in detrás de la MISMA interfaz — mismo patrón que `Engine` del Ejecutor;
  el plan es un **DAG de sub-tareas** (ids únicos, dependencias acíclicas, alcances de
  archivos disjuntos donde se pueda, criterios de aceptación por sub-tarea).
- [ ] **Fan-out con tope**: el Coordinador despacha sub-tareas independientes en paralelo al
  Ejecutor vía A2A, **como máximo `fan_out_max` concurrentes**; las sub-tareas dependientes
  esperan a que sus prerequisitos se integren (respeta el DAG); cada sub-tarea recorre el
  pipeline Ejecutor→Supervisor **sin cambios** (su propio worktree, su propio veredicto).
- [ ] **Presupuesto acumulado con corte**: el Coordinador vigila el gasto acumulado del
  enjambre (suma de `token_usage` etiquetado por la feature padre) contra `presupuesto_usd`;
  al agotarse NO lanza más sub-tareas y **escala** — el tope de intentos por sub-tarea sigue
  cortando cada lazo Ejecutor↔Supervisor.
- [ ] **Integración + verificación final (verificar antes de confiar)**: cada sub-tarea
  aprobada mergea a la rama de integración de la feature (`tarea/<parent_id>`); cuando todas
  integran, el Coordinador pide **una verificación final del Supervisor sobre la rama
  integrada** (el todo se re-gatea, no se asume por partes); conflicto de merge o gate final
  en rojo = **escalada con hallazgo**, jamás integración silenciosa.
- [ ] **Un escritor por fila, preservado**: el Coordinador es el ÚNICO escritor de la fila
  **padre** en `tareas`; cada Ejecutor sigue siendo el único escritor de la fila de **su
  sub-tarea**; el Supervisor sigue stateless; el agente Hermes JAMÁS toca credenciales.
- [ ] **Tabla `tareas` extendida** (`supabase-fase7.sql`, idempotente, RLS sin políticas):
  `parent_id` (self-ref nullable), marca de tarea padre, `fan_out_max`, `plan` jsonb y
  campos de presupuesto; el ciclo de estados de la Fase 6 se conserva 1:1 para sub-tareas.
- [ ] **Lado Hermes**: el skill de orquestación detecta cuándo una petición es una feature
  **grande** (varias partes), la envía al Coordinador (HTTP interno A2A, sin secretos),
  interpreta el resultado integrado, escala cuando el Coordinador escala, y ante lo
  irreversible (merge a `main`, deploy, cliente, dinero) SIEMPRE propone y espera el visto
  bueno de la dueña — nunca concreta solo. Feature chica sigue yendo directo al Ejecutor.
- [ ] **End-to-end demostrado en dev** (MockPlanner + MockEngine + gates reales, cero
  tokens): feature grande → plan de 3 sub-tareas (2 paralelas + 1 dependiente) → una
  sub-tarea rechaza→reintenta→aprueba → integración → verificación final del Supervisor →
  propuesta de merge a la dueña; traza completa padre+hijas en `tareas`.
- [ ] **Opacidad verificada por test**: la superficie del Coordinador es EXACTAMENTE {card,
  rpc `/`, `/health`} (Starlette puro, sin `/docs` ni `/openapi.json`), como los hermanos.
- [ ] **Empaquetado**: `coordinador-a2a` en `docker-compose.yml` (hermes-net, publicado solo
  en `127.0.0.1`, volumen `trio-workspace` compartido, límites de recursos, sin secretos en
  el repo); `docker compose config` valida; pytest completo verde SIN regresión (grafo,
  grafo-a2a, ejecutor-a2a, supervisor-a2a intactos).
- [ ] **FUERA de alcance, explícito**: RAG por ámbito por cliente y white-label (futuro);
  re-planificación dinámica del DAG a mitad del enjambre (v1 planifica una vez; re-plan es
  futuro); auto-resolución de conflictos de merge por modelo (v1 los escala); exposición
  pública del trío/enjambre; réplicas horizontales del Ejecutor en varios contenedores (v1
  logra la concurrencia con el servicio async existente; escalar a réplicas es otro PRP).

### Comportamiento Esperado

La dueña pide por Telegram: *"hazme el módulo de cuentas completo: registro con Google,
perfil editable, panel de admin y emails de bienvenida"*. Hermes-Negocio entiende que es una
feature **grande** (varias partes con poco solapamiento) y, en vez de mandar una tarea al
Ejecutor, arma la **tarea padre** con criterios globales y `fan_out_max: 3` +
`presupuesto_usd`, y la envía al **Coordinador** vía A2A (`parent_id: cuentas-2026-0007`).

El Coordinador corre su **Planner**, que descompone en un DAG: `auth-google` y
`emails-bienvenida` son independientes (archivos disjuntos) → paralelas; `perfil-editable`
depende de `auth-google`; `panel-admin` depende de `perfil-editable`. Escribe la fila padre
en `tareas` (`plan`, `fan_out_max`, presupuesto) y **fan-out** de las 2 independientes al
Ejecutor (dos worktrees, dos filas hija). Cada sub-tarea recorre el pipeline de la Fase 6:
Ejecutor→Supervisor→veredicto. `emails-bienvenida` pasa a la primera; `auth-google` es
rechazada (callback OAuth 500) → el Coordinador reintenta esa sub-tarea con los hallazgos
(1/3) → aprobada. Con `auth-google` integrada, se libera `perfil-editable`; luego
`panel-admin`. El presupuesto acumulado se vigila en cada vuelta.

Cuando las 4 integran a `tarea/cuentas-2026-0007`, el Coordinador pide **una verificación
final** al Supervisor sobre la rama integrada: build/typecheck/lint/tests de todo junto.
Verde → devuelve a Hermes el resultado integrado + veredicto final + veredictos por parte.
Como sigue un merge a `main` (irreversible), Hermes NO actúa solo: manda el resumen + diff y
pide visto bueno. La dueña aprueba → se concreta. Si el presupuesto se agota, o dos ramas
chocan al integrar, o el gate final queda en rojo, el Coordinador **escala** con el motivo
exacto y Hermes lo traslada a la dueña. Cada transición queda en `tareas`; cada llamada de
modelo (Planner real y motor real), en `token_usage`.

---

## Contexto

### Referencias

- `.claude/PRPs/prp-fase6-trio.md` — **la base**: arquitectura del trío, el contrato, la
  tabla `tareas`, los gotchas A2A ya pagados, y los aprendizajes (un-escritor-por-fila,
  wire-format del a2a-sdk v1, protobuf Struct → float). NO repagar nada de eso.
- `businessos/trio-contrato/contrato.py` — vocabulario común a **extender** (añadir `plan` /
  sub-tarea / linkage padre-hija), sin romper `validar_tarea`/`validar_resultado`/
  `validar_veredicto` existentes; stdlib pura, normalización de floats integrales (gotcha F2).
- `businessos/ejecutor-a2a/` (`executor.py`, `engine.py`, `workspace.py`, `estado.py`,
  `supervisor_cliente.py`) — **se reusa TAL CUAL** como unidad de trabajo del enjambre. El
  patrón `Engine` pluggable/mockeable (`crear_engine`) es el molde exacto para `Planner`.
- `businessos/supervisor-a2a/` (`executor.py`, `gates.py`, `veredicto.py`, `reglas/
  software.toml`) — **se reusa TAL CUAL**, tanto por sub-tarea como para la verificación
  final sobre la rama integrada (motor de reglas determinista, independiente).
- `businessos/grafo-a2a/` y los hermanos de Fase 6 — el esqueleto A2A a replicar: Starlette
  puro, `create_agent_card_routes` + `create_jsonrpc_routes`, `DefaultRequestHandler` +
  `InMemoryTaskStore`, tests card/executor/interop/opacidad con `httpx.ASGITransport`.
- `businessos/negocio/skills/trio-software/SKILL.md` — el skill a extender (o hermanar con
  `swarm-software`): el JSON-RPC crudo sin secretos, el gate humano en lo irreversible, el
  lazo de reintento. El payload A2A canónico (método `SendMessage`, header `A2A-Version:
  1.0`, `parts:[{"data": <tarea directa>}]`) es idéntico para el Coordinador.
- `businessos/supabase-init.sql` (`token_usage`: `vertical`, `modelo`, `tokens_in/out`,
  `costo_usd`, `created_at`) y `supabase-fase6.sql` (`tareas`, `vertical='trio'`) — el
  presupuesto acumulado se lee de aquí; convención de tablas backend (idempotente, RLS
  habilitado SIN políticas, comentarios).
- `businessos/departamentos/SPEC-trio.md` — roles y fronteras (§2), reglas A2A (§5), riesgos
  a no esconder (§8); el enjambre NO cambia las fronteras: Hermes orquesta, el par opera, el
  humano aprueba lo irreversible.
- `businessos/ROADMAP.md` §"Principios que cruzan todo el proyecto" — aislar-no-fundir (1),
  acotar-antes-de-escalar (2), arreglar-lo-compartido (5), verificar-antes-de-confiar (6).
- `businessos/docker-compose.yml` — patrón de empaquetado (hermes-net, `127.0.0.1`, volumen
  `trio-workspace`, límites de recursos, healthcheck stdlib) para el nuevo servicio.
- https://docs.claude.com/en/api/agent-sdk — motor del Planner real; verificar contra la
  versión instalada, no contra blogs (mismo criterio que el Ejecutor).

### Decisiones de arquitectura

1. **Un servicio nuevo, hermano del trío (aislar, no fundir):** `businessos/coordinador-a2a/`.
   Mismo esqueleto probado (Starlette puro, card + JSON-RPC + `/health`, `a2a-sdk` pineado).
   El Ejecutor y el Supervisor **no se tocan**: el enjambre los usa como piezas. NO se funde
   la coordinación dentro del Ejecutor (un Ejecutor que planifica-reparte-y-ejecuta deja de
   ser una unidad de trabajo aislada y rompe "un escritor por fila").
2. **NO es "un Hermes más".** El Coordinador no es un loop de asistente: es un despachador
   con un Planner acotado. La lógica de reparto/reintento/presupuesto/integración es
   **determinista**; el único punto con modelo es el Planner (descomponer), y es
   pluggable/mockeable como el `Engine`. Hermes sigue siendo el único orquestador de cara al
   humano; el Coordinador orquesta *máquinas*, no conversaciones.
3. **Concurrencia por servicio async + worktree, no por réplicas.** El `ejecutor-a2a` ya es
   async y ya aísla por `worktree/<task_id>`: el enjambre son **N llamadas A2A concurrentes**
   al mismo Ejecutor, cada una con su sub-tarea (sub_task_id único) y su worktree. Escalar a
   varios contenedores Ejecutor es futuro; v1 acota con `fan_out_max`.
4. **Planner pluggable/determinista-por-default:** interfaz `Planner.plan(tarea_padre) →
   plan`; `MockPlanner` (lee el DAG de `contexto["mock_plan"]`, cero tokens, para tests y el
   end-to-end de dev) y `ClaudePlanner` (modelo real, opt-in por env `COORDINADOR_PLANNER=
   claude|mock`, cada llamada a `token_usage`). El plan es DATOS validados por el contrato:
   el servicio, el protocolo, el fan-out y la integración se prueban al 100% sin modelo.
5. **El plan es un DAG con alcances disjuntos.** Cada sub-tarea es una `tarea` válida del
   contrato existente (objetivo + criterios + límites) más `sub_task_id`, `depende_de: [...]`
   y `alcance: [globs]`. Invariantes del contrato: ids únicos, dependencias acíclicas y hacia
   ids existentes, y **advertencia** (no bloqueo) si dos sub-tareas sin dependencia declaran
   alcances solapados — el solapamiento real lo caza la integración/gate final, no una
   heurística optimista.
6. **Un escritor por fila, extendido a padre/hija (aprendizaje F3 de Fase 6):** el
   Coordinador es el ÚNICO escritor de la fila **padre** (plan, estado global, integración,
   presupuesto); cada Ejecutor es el único escritor de **su fila hija** (igual que hoy); el
   Supervisor sigue stateless. Nadie escribe la fila de otro. `parent_id` liga hija→padre.
7. **Presupuesto acumulado con tope de fan-out (acotar antes de escalar):** dos topes
   compuestos — `fan_out_max` (concurrencia máxima de Ejecutores, radio de impacto y costo
   instantáneo) y `presupuesto_usd` acumulado (suma de `costo_usd` de `token_usage` atribuido
   a la feature). Al agotarse el presupuesto: no se lanzan más sub-tareas, las en vuelo
   terminan, y el Coordinador escala. **Atribución (DECIDIDO 2026-07-04):** se añade una
   columna `task_id` nullable a `token_usage` (Fase 1) para cortar el presupuesto EXACTO por
   sub-tarea — no por ventana temporal aproximada.
8. **Integración determinista + verificación final independiente (verificar antes de
   confiar):** el Coordinador integra ramas aprobadas con git puro (merge a
   `tarea/<parent_id>` en orden topológico del DAG); un conflicto de merge NO lo resuelve un
   modelo en v1 → escala con el conflicto como hallazgo. Integrado el todo, pide **una**
   evaluación del Supervisor sobre la rama integrada: el veredicto del conjunto es
   independiente de los veredictos por parte. Gate final rojo = escalada, no "aprobado por
   partes".
9. **Gate humano en lo irreversible, intacto:** el enjambre produce una rama integrada que
   pasa gates; Hermes propone el merge a `main` y espera el SÍ explícito de la dueña. El
   enjambre no cambia NADA de esta frontera (SPEC §2, patrón `clientes/AGENTS.md`).
10. **Hermes sin secretos, ruteo por tamaño:** el skill decide feature-grande→Coordinador
    vs. feature-chica→Ejecutor y habla HTTP interno A2A sin credenciales; consulta estado por
    A2A (`tasks/get`) y/o snapshot host-job del volumen. La escritura a `tareas` es de los
    servicios de confianza (secret-scrubbing, aprendizaje 2026-06-30).
11. **Exposición:** `127.0.0.1` + hermes-net, sin auth pública — misma postura del stack.
    Exponer el enjambre a internet NO es de esta fase.

### Arquitectura Propuesta

```
businessos/coordinador-a2a/
├── card.py            # AgentCard: "descompongo una feature grande y coordino un enjambre..."
├── executor.py        # AgentExecutor A2A: tarea_padre → plan → fan-out → integración → verif. final
├── planner.py         # interfaz Planner + MockPlanner (DAG de contexto) + fabrica por env
├── claude_planner.py  # ClaudePlanner (SDK real, opt-in); cada llamada → token_usage
├── enjambre.py        # scheduler determinista del DAG: fan-out con fan_out_max, espera deps, reintento por sub-tarea
├── integracion.py     # merge topológico de ramas aprobadas a tarea/<parent_id> (git puro); conflicto → escalada
├── presupuesto.py     # gasto acumulado desde token_usage (etiqueta feature) vs presupuesto_usd; corte
├── ejecutor_cliente.py# cliente A2A saliente hacia ejecutor-a2a (patrón supervisor_cliente.py)
├── supervisor_cliente.py # verificación final de la rama integrada (reusa/hermana el del Ejecutor)
├── estado.py          # fila PADRE en `tareas` (service_role) — único escritor de esa fila
├── app.py             # Starlette puro: card + jsonrpc + /health (patrón grafo-a2a)
├── requirements.txt   # a2a-sdk pineado, claude-agent-sdk (planner real), httpx, uvicorn
├── Dockerfile
├── conftest.py
└── tests/             # card, planner mock, scheduler DAG+fan_out, integración, presupuesto,
                       #   interop end-to-end (mock planner + mock engine + gates reales), opacidad

businessos/trio-contrato/contrato.py     # + validar_plan / sub-tarea / linkage padre-hija (extensión)
businessos/supabase-fase7.sql            # ALTER `tareas`: parent_id, es_padre, fan_out_max, plan, presupuesto
                                         #   (+ posible etiqueta/task_id en token_usage — decisión Fase 1)
businessos/negocio/skills/trio-software/SKILL.md  # + ruteo feature-grande→Coordinador y su interpretación
businessos/docker-compose.yml            # + coordinador-a2a (hermes-net, 127.0.0.1, trio-workspace, límites)
```

### Modelo de Datos

```sql
-- supabase-fase7.sql — extensión de `tareas` para el enjambre (idempotente, backend-only).
-- Conserva el ciclo de estados de la Fase 6 para las sub-tareas; la fila padre lo reusa.

alter table public.tareas
  add column if not exists parent_id    text,            -- null = tarea suelta o padre; set = sub-tarea
  add column if not exists es_padre     boolean not null default false,
  add column if not exists fan_out_max  integer          check (fan_out_max is null or fan_out_max >= 1),
  add column if not exists plan         jsonb,           -- DAG de sub-tareas (solo en la fila padre)
  add column if not exists presupuesto_usd numeric(10,4) check (presupuesto_usd is null or presupuesto_usd >= 0),
  add column if not exists gasto_usd    numeric(10,4) not null default 0 check (gasto_usd >= 0);

-- Ligadura hija→padre (mismo dueño de escritura por fila: coordinador escribe la padre,
-- cada ejecutor escribe la suya). FK lógica por task_id (no física para no acoplar orden de inserción).
create index if not exists tareas_parent_idx on public.tareas (parent_id);

-- Atribución de presupuesto: liga cada llamada de modelo a la feature padre.
-- (Decisión de Fase 1: esta columna, o acotar por ventana temporal + vertical='trio'.)
alter table public.token_usage
  add column if not exists task_id text;   -- nullable: null = gasto no atribuido a una tarea del trío
create index if not exists token_usage_task_idx on public.token_usage (task_id);

-- RLS ya habilitado en `tareas` (Fase 6) y `token_usage` (init) — sin políticas: solo service_role.
```

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo fases. Las subtareas se generan al entrar a cada fase con el bucle
> agéntico (mapear contexto → generar subtareas → ejecutar). Los gotchas A2A de PRP-006
> vienen pagados: no re-descubrirlos.

### Fase 1: Contrato del enjambre + esquema `tareas`/`token_usage` extendido
**Objetivo**: Fijar el vocabulario del enjambre sobre el contrato de la Fase 6: `validar_plan`
(DAG de sub-tareas — cada una `tarea` válida + `sub_task_id`, `depende_de`, `alcance`; ids
únicos, dependencias acíclicas y existentes, aviso por alcances solapados) y el linkage
`parent_id`/`es_padre`. `supabase-fase7.sql` idempotente: extiende `tareas` (parent_id,
es_padre, fan_out_max, plan, presupuesto_usd, gasto_usd) y aplica la atribución de
presupuesto añadiendo la columna `task_id` nullable a `token_usage` (DECIDIDO 2026-07-04).
**Validación**: `validar_tarea/resultado/veredicto` existentes SIN cambios de comportamiento
(tests Fase 6 verdes); `validar_plan` con tests propios (DAG válido, ciclo→error, dep a id
inexistente→error, sub-tarea inválida→error, aviso de solapamiento); SQL aplicable y
re-aplicable sin error; floats integrales normalizados también en campos nuevos (gotcha F2).

### Fase 2: Coordinador A2A — esqueleto + card + Planner pluggable + fila padre
**Objetivo**: `businessos/coordinador-a2a/` sirve su Agent Card honesta y atiende
`message/send` con una tarea padre: valida, corre el `Planner` (con `MockPlanner`
determinista que lee el DAG de `contexto["mock_plan"]`), valida el plan con el contrato,
escribe la fila **padre** en `tareas` (único escritor de esa fila) y devuelve el plan como
artifact. Entrada inválida o plan inválido → tarea `failed`/`escalada` con razón clara.
**Validación**: pytest verde con MockPlanner (cero tokens): card válida, plan bien formado,
fila padre registrada, errores manejados; superficie = {card, rpc, health}; encola
`new_task(...)` antes del primer status update (gotcha SDK v1).

### Fase 3: Scheduler del DAG — fan-out con tope + lazo por sub-tarea + presupuesto
**Objetivo**: `enjambre.py` + `presupuesto.py` + `ejecutor_cliente.py`: el Coordinador
despacha las sub-tareas sin dependencias en paralelo al Ejecutor vía A2A, **acotado a
`fan_out_max` concurrentes**; al integrarse un prerequisito libera a sus dependientes (orden
topológico); cada sub-tarea recorre el pipeline Ejecutor→Supervisor **sin cambios** y su
veredicto vuelve al Coordinador; rechazo → reintento de ESA sub-tarea con hallazgos hasta su
`intentos_max`; el gasto acumulado se vigila contra `presupuesto_usd` y corta el fan-out.
**Validación**: pytest verde con Ejecutor mockeado (doble A2A, cero tokens): nunca más de
`fan_out_max` en vuelo; una sub-tarea dependiente NO arranca antes que su prerequisito; una
sub-tarea rechazada reintenta y luego pasa; presupuesto agotado → no lanza más → escala.

### Fase 4: Integración de ramas + verificación final del Supervisor
**Objetivo**: `integracion.py`: al aprobarse cada sub-tarea, su rama mergea a
`tarea/<parent_id>` en orden topológico (git puro sobre el worktree compartido); conflicto de
merge → escalada con el conflicto como hallazgo (v1 NO auto-resuelve). Integrado el todo, el
Coordinador pide **una** evaluación del Supervisor sobre la rama integrada (reusa el pipeline
del Supervisor) y emite el resultado del enjambre: rama integrada + veredicto final +
veredictos por parte, o escalada. La fila padre transiciona a `aprobada`/`escalada`.
**Validación**: pytest verde: dos ramas que integran limpio → gate final corre sobre el todo;
un conflicto de merge simulado → escalada con hallazgo (no integración silenciosa); gate
final rojo aunque las partes pasaron → escalada (verificar antes de confiar); un solo escritor
de la fila padre.

### Fase 5: Planner real (Claude Agent SDK) detrás de la misma interfaz
**Objetivo**: `ClaudePlanner` implementa `Planner` con el SDK (introspección de la versión
instalada, no blogs): toma la tarea padre + contexto del repo y produce el DAG de sub-tareas
con alcances disjuntos; respeta límites; cada llamada de modelo escribe en `token_usage`
etiquetado con la feature (para el presupuesto acumulado). Seleccionable por env
(`COORDINADOR_PLANNER=claude|mock`); el default de tests sigue siendo mock.
**Validación**: pytest sigue verde con mock (cero regresión); unit tests del planner real con
el SDK mockeado (tarea→DAG válido por contrato, registro en `token_usage` con `task_id`,
respeto de límites); smoke real opcional y explícitamente gated (nunca en CI/pytest normal).

### Fase 6: Lado Hermes (ruteo por tamaño) + interop end-to-end + opacidad + empaquetado
**Objetivo**: Skill de orquestación extendido: Hermes detecta feature **grande** (varias
partes) → arma la tarea padre con `fan_out_max`/`presupuesto_usd` y la envía al **Coordinador**
(HTTP interno A2A, sin secretos); feature chica sigue yendo al Ejecutor. Interpreta el
resultado integrado, escala cuando el Coordinador escala, y el gate humano en lo irreversible
SIEMPRE. Interop end-to-end con el patrón de PRP-005/006 (cliente del SDK +
`httpx.ASGITransport`/uvicorn local): feature grande → plan → fan-out → rechazo→reintento en
una parte → aprobación → integración → verificación final → propuesta a la dueña, cero tokens.
Tests de opacidad del Coordinador. `Dockerfile` + servicio en `docker-compose.yml`.
**Validación**: interop end-to-end verde con cero llamadas a modelo (MockPlanner + MockEngine
+ gates reales); opacidad verde (superficie exacta {card, rpc, health}); `docker compose
config` valida (con `.env` temporal, gotcha conocido); grafo/grafo-a2a/ejecutor/supervisor sin
regresión; el SKILL.md respeta la arquitectura real (agente sin secretos, lee snapshots).

### Fase 7: Validación Final + docs vivas
**Objetivo**: Sistema coherente de punta a punta; conocimiento persistido.
**Validación**:
- [ ] pytest completo del repo verde (coordinador-a2a + trío + grafo + grafo-a2a sin regresión)
- [ ] Criterios de éxito del PRP cumplidos (incluido el end-to-end con reintento, integración,
      verificación final y gate humano)
- [ ] Docs vivas: `ROADMAP.md` (Fase 7 con estado y residuales), memoria
      (`.claude/memory/project/fase7-swarm.md`), `BUSINESS_LOGIC.md`, aprendizajes al
      `CLAUDE.md` si aplican, `SPEC-trio.md` (§ nueva o §7.6 "enjambre: reusado vs construido")
- [ ] Residuales explícitos en ROADMAP: `compose up` real del enjambre en runtime/Droplet;
      smoke con Planner/motor real (tokens) decidido por la dueña; re-planificación dinámica,
      auto-resolución de conflictos por modelo y réplicas horizontales del Ejecutor = futuro,
      otro PRP; RAG por ámbito y white-label = futuro.

---

## 🧠 Aprendizajes (Self-Annealing / Neural Network)

> Esta sección CRECE con cada error encontrado durante la implementación.
> El conocimiento persiste para futuros PRPs. El mismo error NUNCA ocurre dos veces.

*(vacío — se llena durante la ejecución con `/bucle-agentico`)*

---

## Gotchas

> Críticos ANTES de implementar. Los de A2A vienen pagados de PRP-005/006 — NO repagarlos
> (proto-first, `new_task` antes del primer status update, método `SendMessage` + header
> `A2A-Version: 1.0`, `parts:[{"data": <payload directo>}]`, protobuf Struct → float).

- [ ] **No fundir la coordinación en el Ejecutor.** El Coordinador es un servicio hermano; el
      Ejecutor y el Supervisor NO se modifican. Si algo del enjambre "necesita" tocar el
      Ejecutor, replantear (probablemente rompe un escritor por fila o el aislamiento).
- [ ] **Un escritor por fila, ahora padre/hija.** El Coordinador escribe SOLO la fila padre;
      cada Ejecutor SOLO su fila hija. Nunca cruzar. Dos escritores sobre una fila = carrera
      (aprendizaje F3 de Fase 6).
- [ ] **`fan_out_max` SIEMPRE.** Sin tope de concurrencia, el enjambre es una bomba de
      recursos y de costo. Semáforo/cola en el scheduler; nunca lanzar el DAG entero de golpe.
- [ ] **Presupuesto acumulado necesita atribución.** `token_usage` de la Fase 6 no liga el
      gasto a una tarea → **DECIDIDO (2026-07-04): columna `task_id` nullable en `token_usage`**
      (corte exacto por sub-tarea, no por ventana). Sin atribución, el corte sería adivinanza.
- [ ] **El DAG debe ser acíclico y hacia ids existentes.** Un ciclo o una dep colgante cuelga
      el scheduler (deadlock: nadie arranca). El contrato lo rechaza en `validar_plan`, ANTES
      de fan-out.
- [ ] **Alcances solapados = riesgo de conflicto de merge.** El aviso del contrato es
      heurístico; el juez real es la integración + gate final. NO confiar en que "el plan dijo
      disjunto": re-gatear el todo (verificar antes de confiar).
- [ ] **Verificación final sobre la rama integrada, obligatoria.** Cada parte pasar sus gates
      NO implica que el todo pase. Correr el Supervisor una vez más sobre `tarea/<parent_id>`
      integrado; su rojo manda sobre los verdes por parte.
- [ ] **Conflicto de merge = escalada, no auto-magia.** v1 no resuelve conflictos con modelo;
      los reporta como hallazgo y escala. Anti-sello-de-goma aplicado a la integración.
- [ ] **Worktrees por sub-tarea, limpieza al concretar/cancelar.** N worktrees vivos por
      feature; los huérfanos bloquean branches (gotcha de Fase 6). Limpiar el padre y todas
      las hijas al cerrar la feature.
- [ ] **Planner mockeable por default; real opt-in.** Tests con `MockPlanner` (cero tokens);
      el `ClaudePlanner` real solo en smoke gated. El default de CI es mock (como el Engine).
- [ ] **Hermes no maneja secretos, ni siquiera para el Coordinador.** Ruteo por tamaño y
      HTTP interno A2A sin credenciales; probar cambios de skill en sesión nueva (`/new`).
- [ ] **Gate humano en lo irreversible, sin cambios.** El enjambre entrega una rama integrada
      verificada; el merge a `main`/deploy SIEMPRE pasa por la dueña. Tampoco "solo esta vez".
- [ ] **Puertos solo `127.0.0.1` + hermes-net.** Docker se salta UFW. Nada de `0.0.0.0`.
- [ ] **Esta máquina**: python3.14 venv sin pip (bootstrap `get-pip.py`); `docker compose
      config` exige `.env` (copia temporal del example); daemon Docker puede estar apagado
      (validar con uvicorn + tests; `compose up` es residual runtime).

## Anti-Patrones

- NO fundir Coordinador y Ejecutor (ni dejar que un Ejecutor "líder" reparta y ejecute a la vez).
- NO confiar en los sub-veredictos para dar por buena la feature: re-gatear el todo integrado.
- NO lanzar el DAG completo sin `fan_out_max`; NO seguir lanzando con el presupuesto agotado.
- NO resolver conflictos de merge con un modelo en v1 (escalar); NO integrar en silencio con conflicto.
- NO usar un LLM en el scheduler/integración/presupuesto (deterministas); el modelo SOLO en el Planner.
- NO hacer merge a `main`, deploy, ni nada de cara al cliente/dinero sin visto bueno humano.
- NO darle secretos al agente Hermes ni instruirlo a usarlos (secret-scrubbing; host-job/snapshot).
- NO tocar `ejecutor-a2a`, `supervisor-a2a`, `grafo` ni `grafo-a2a` (contratos validados de otras fases).
- NO arrancar re-planificación dinámica, réplicas horizontales, RAG por ámbito ni white-label aquí (futuro).
- NO quemar tokens en tests: MockPlanner + MockEngine por default; lo real es opt-in explícito.

---

*PRP pendiente de aprobación. No se ha modificado código.*
