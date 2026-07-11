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

## ACTUALIZACIÓN 2026-07-08 — Slack piloto VIVO

La capa humana arrancó: `@hermes_negocio` conectado por Socket Mode al workspace
A2AMassivo, operando en `#dep-negocio` (require_mention + hilos + channel_prompt
con higiene). La app se creó con `negocio/slack-app-manifest.yaml` (un paso);
tokens en el `.env` del volumen; `slack-piloto.sh` cablea y reinicia (ahora se
re-ejecuta con `sudo env HOME=…` por el volumen 0700). `hermes send -t slack:<C…>`
funciona = canal saliente verificado. Falta: Member IDs del resto del equipo en
SLACK_ALLOWED_USERS y expandir canales por config. ⚠️ Los tokens de Slack viajaron
en un screenshot del chat de la sesión (riesgo bajo, local): ofrecer rotación
(reinstalar app + regenerar xapp-) como higiene.

## ACTUALIZACIÓN 2026-07-09 — dogfood real: infra lista, PAUSADO en credencial

Política de ruteo por tarea decidida (GLM-5.2 para simple/mecánica vía seam
z.ai, Sonnet para media/alta, Opus casi nunca) y documentada en
`negocio/MEMORY.md` (sección "Riesgo aparte: dogfood real del trío/enjambre")
y en el bloque `<!-- TRIO-DOGFOOD:POLICY -->` del `SOUL.md` de las 3 verticales
(negocio/personal/clientes) — sincronizado y verificado byte-a-byte en runtime.

**Dos huecos de infra cerrados en el server, cero tokens:**
- `supervisor-a2a` reconstruido: Playwright + Chromium instalados
  (`@playwright/test@1.61.1` en `/ms-playwright`, `ENV PLAYWRIGHT_BROWSERS_PATH`).
  Antes de esto, el gate `tests` (`npx playwright test`) SIEMPRE rechazaba
  (`no_ejecutable`) sin importar el modelo o la calidad de la tarea — era un
  residual silencioso que hubiera hecho fallar el primer dogfood real por una
  razón ajena al motor. El repo objetivo de la tarea debe pinear la MISMA
  versión de `@playwright/test` para que el caché resuelva sin re-descargar.
- `ejecutor-a2a` reconstruido: Node + `@anthropic-ai/claude-code` instalado
  (`claude --version` → `2.1.205` verificado dentro de la imagen). El Dockerfile
  ya no es mock-only a nivel de imagen.
- Ambos Dockerfiles se copiaron (`scp`, no git — el checkout del server en
  `~/repo/businessos` es un `git archive`, no un repo git) y se reconstruyeron
  con `docker compose --profile trio build <servicio>`.

**Skills instalados en el volumen (2026-07-11):** `trio-software` y `cli-audit`
existían solo en el repo, NUNCA se habían copiado a `/opt/data/skills/` del
volumen de negocio (hueco detectado al desplegar el rename) → copiados como
uid 10000 vía `docker exec -i -u 10000 ... cat >`; `hermes skills list` los
muestra `local/enabled` SIN reiniciar el gateway. Sin esto, Hermes-Negocio no
podía orquestar el trío en el dogfood.

**Bloqueado (pendiente de la dueña):** falta `ANTHROPIC_AUTH_TOKEN` (API key de
z.ai) en el `.env` del server — la dueña la agrega ella misma vía SSH, nunca
por chat (ni la key ni capturas de la consola). Ruta real para obtenerla:
login en z.ai → `z.ai/manage-apikey/apikey-list` → crear key → verificar saldo
en `z.ai/manage-apikey/billing`.

**Gotcha de arquitectura descubierto:** `ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN`
son env vars de contenedor completo (`claude_engine.py` las lee de `os.environ`,
no por tarea) — mientras `ejecutor-a2a` apunte a z.ai, TODAS sus tareas usan
GLM, no solo la marcada como "simple". El ruteo verdaderamente por-tarea entre
proveedores requeriría togglear la env var + reiniciar entre corridas (no es
instantáneo hoy). Para la primera tarea (simple) no importa.

**Plan al desbloquear:** setear `EJECUTOR_ENGINE=claude` + recrear
`ejecutor-a2a`; tarea de humo con `presupuesto_usd=1`, `modelo_pref="glm-5.2"`,
scaffold npm mínimo (`package.json` con build/typecheck/lint + `@playwright/test@1.61.1`
+ test trivial) en `~/businessos/trio-repo`; mandarla por A2A; reportar veredicto
del Supervisor + gasto real en `token_usage` (vertical `trio`) — la primera
cifra medida (hasta ahora todo estimado). Pausado explícitamente por la dueña
el 2026-07-09.
