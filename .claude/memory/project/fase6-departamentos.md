---
name: fase6-departamentos
description: Fase 6 — trío Hermes→Ejecutor→Supervisor CONSTRUIDO y validado en dev (2026-07-03, PRP-006); primer departamento Desarrollo de Software; residuales runtime/Droplet y dogfood real.
metadata:
  type: project
---

**CONSTRUIDO Y MERGEADO (2026-07-03, PRP-006, PR #9 → master):** el trío completo
en código, validado end-to-end en dev con cero tokens (158 tests verdes en el
repo). `supabase-fase6.sql` APLICADO y verificado en producción el mismo día
(tabla `tareas` con RLS; check de `token_usage.vertical` incluye 'trio').

- `trio-contrato/contrato.py` — TAREA/RESULTADO/VEREDICTO + ciclo de estados; el
  contrato normaliza floats integrales (gotcha: protobuf Struct entrega TODO
  número JSON como float).
- `businessos/ejecutor-a2a/` (:4100) — worktree por tarea (nunca main), motor
  pluggable (Mock default / `ClaudeAgentEngine` real con claude-agent-sdk==0.2.110),
  diff real desde git, ÚNICO escritor de `tareas`; gasto del motor real →
  `token_usage` vertical `trio` (check ampliado en `supabase-fase6.sql`).
- `businessos/supervisor-a2a/` (:4200) — motor de reglas determinista (sin LLM),
  config versionada `reglas/software.toml`; re-ejecuta gates sobre el volumen
  compartido `trio-workspace`; gate no corrible = rechazo; regla activa sin
  runner = no arranca. **Stateless a propósito**: NO escribe `tareas` (un
  escritor por fila — desviación deliberada del blueprint, documentada en PRP).
- `negocio/skills/trio-software/SKILL.md` — orquestación Hermes sin secretos;
  wire format verificado: método JSON-RPC `SendMessage` (no `message/send`) +
  header `A2A-Version: 1.0` + `parts:[{"data": <tarea directa>}]`.
- Interop e2e (tests): rechazo→reintento con observaciones→aprobado.

**Smoke A2A EN VIVO validado en dev (2026-07-04):** `businessos/smoke-trio/run.sh`
levanta ejecutor+supervisor con uvicorn real (TCP real, motor mock, cero tokens, sin
docker) y corre el lazo `any`→rechazado(gate sin_any)→corrección→aprobado sobre el
cliente real del SDK. Prueba card+SendMessage+opacidad end-to-end fuera de los tests.

**Residuales:** ~~smoke~~ (hecho en dev) → falta `compose up` Docker del trío en el
Droplet; smoke motor
real gated (`EJECUTOR_SMOKE_REAL=1`) y dogfood con `EJECUTOR_ENGINE=claude`
(requiere CLI Claude Code en la imagen — hoy mock-only a propósito) — decisión
de la dueña; gates de modelo cuando tengan runner. **Futuro (otro PRP):** RAG
por ámbito y white-label.

---

Decisión (2026-06-28): se añadió al roadmap la **Fase 6 (futura)** a partir del documento
*"La idea: dos agentes, muchos departamentos"*.

**Arquitectura (tres niveles):** Hermes-Negocio **orquesta** (entiende, arma contexto,
reparte) → **Ejecutor** (servicio A2A propio sobre Claude Agent SDK, workspace aislado)
hace → **Supervisor** (servicio A2A independiente) valida por reglas antes de que algo tenga
efecto. Dos capas de control: Supervisor automático + humano en lo irreversible (merge,
deploy, cliente, dinero) — es "copiloto, no autopiloto".

**Departamento = paquete de competencias** (tareas del Ejecutor + reglas del Supervisor +
fuentes de conocimiento). No son agentes; añadir uno = definir el paquete.

**Primer departamento: Desarrollo de Software** (no Finanzas). Razón: el repo ya es una
fábrica de skills y **no depende del grafo** (Fase 2). Las reglas del Supervisor mapean a
comandos reales: `build`/`typecheck`/`lint`, Playwright, `/code-review`, `security-review`.

**White-label = configuración:** el trío es idéntico; por cliente cambian departamentos
activos, reglas, marca y datos/workspace aislados. Camino: **uso propio primero**
(construir los SaaS de la dueña), luego venta.

**Decisiones de la usuaria que acotaron el plan:** primer departamento = software; producto
doble (uso propio + venta); ubicación **Fase 6 completa** (después de A2A, Fase 5);
entregable **solo documentación, sin código**.

**Dependencias / no se construye aún:** A2A real (Fase 5) entre los servicios, y el RAG por
ámbito por cliente (hoy solo template en `/ai rag`). El grafo NO es dependencia de este
departamento.

**Por qué servicios propios y no "dos Hermes más":** la imagen Nous Hermes es un loop de
asistente, no un motor de codificación con edición de archivos, builds y skills; para venta
se necesita aislamiento por cliente, portabilidad y Agent Card. Es "aislar, no fundir".

**Entregables (docs creadas):** `businessos/ROADMAP.md` (Fase 6),
`businessos/departamentos/SPEC-trio.md`, `.../desarrollo-software.md`, `.../white-label.md`,
y mención en `BUSINESS_LOGIC.md`. Ver [[fase0-estado]] para el estado del cimiento.

**Equipo de 4 + Slack (2026-06-28):** el negocio pasará de 1 operador a un equipo de 4
humanos. Decisión: **Slack** como capa humana por departamento/cliente/desarrollo (Hermes
soporta Slack nativo, config consciente de canales con `channel_prompts`/`allowed_channels`).
Personal sigue en Telegram. Lo grande NO es el chat sino el modelo de **acceso + aprobación**. Equipo de 4 con roles
reales: **CEO** (autoridad final, config/deploy), **CFO** (dinero/presupuesto, ancla
negocio), **Project Manager** (cara al cliente, ancla clientes), **Developer** (merge a
main, ancla desarrollo/trío). Falta el mapa `slack_user_id → rol`. Slack NO es sistema de
registro (verdad durable sigue en Supabase). Topología, roles y runbook del piloto
(negocio en `#dep-negocio`, Socket Mode) en `businessos/departamentos/equipo-y-slack.md`.

**Piloto Slack preparado (2026-07-03):** runbook verificado contra la doc oficial
de hermes-agent — gotchas: `SLACK_ALLOWED_USERS` obligatorio (sin él deny-all),
`allowed_channels`/`channel_prompts` usan Channel IDs `C…` (no `#nombre`), scopes
completos (incl. `im:*`, `mpim:*`, `files:*`), eventos suscritos aunque sea Socket
Mode, reinstalar la app si cambian scopes, habilitar Messages Tab. Artefactos:
`businessos/negocio/slack-config-fragment.yaml` + `businessos/slack-piloto.sh`
(host-job runtime: verifica tokens sin imprimirlos, mergea config con backup,
reinicia). Bloqueado en: la usuaria crea la Slack App + tokens al `.env` del
volumen + Channel/Member IDs; luego correr el script en la máquina runtime.

## ACTUALIZACIÓN 2026-07-08 — runtime CERRADO

Ejecutor + Supervisor Up/healthy en Hetzner (profile `trio`). Smoke de runtime
(`smoke-trio/runtime.py`): cadena completa con los gates npm REALES → repo
placeholder rechazado con hallazgos [build, typecheck, lint, tests] (anti-sello-
de-goma OK) y fila `smoke-runtime-1` escrita en `tareas` de producción. Gotcha
resuelto: bind-mounts con uid del host → `git config --system safe.directory '*'`
en las 3 imágenes del trío (sin eso git aborta con "dubious ownership" → failed).
El repo objetivo del trío es `~/businessos/trio-repo` (placeholder git init).
Residual restante: dogfood con motor real (decisión de la dueña, quema tokens).
