# BusinessOS — Roadmap del proyecto

Mapa consolidado de las decisiones tomadas. Las fases están en orden de
construcción: cada una se apoya en la anterior. No saltes hacia adelante hasta
que la fase previa esté validada.

---

## Arquitectura en una frase

Una mente (Hermes) con tres bocas (verticales: personal, negocio, clientes),
cada una en su propio contenedor Docker, sobre un Droplet de DigitalOcean,
hablando por Telegram y voz, con un grafo de conocimiento como cerebro
regulatorio/fiscal/contable multi-país, y un dashboard "Mission Control" encima.

---

## Stack confirmado

- **Servidor:** Droplet DigitalOcean (4 GB / 2 vCPU para arrancar; 8 GB al sumar
  el grafo). No bajar de 4 GB: en 2 GB el stack hace OOM-kill (ver FASE0.md §1).
- **Orquestación:** Docker + docker-compose (un contenedor por vertical)
- **Agente:** Hermes Agent (Nous Research) — memory, skills, soul, crons, loop
- **Modelos (opt-in GLM-5.2, seam listo 2026-07-04):** `z-ai/glm-5.2` (~1/6 del costo de
  Opus, hecho para coding agéntico) entra por dos capas pluggables sin arquitectura nueva:
  (a) motor del trío vía endpoint Anthropic-compatible de z.ai (`ANTHROPIC_BASE_URL` +
  `modelo_pref="glm-5.2"`); (b) profiles pesados de Hermes vía OpenRouter (no el loop).
  Gate `businessos/probe-glm.py` (caché+tools) antes de cablear; default intacto sin las
  env vars. Detalle en la reference de setup y en fase1-eficiencia.
- **Canales:** Telegram (3 bots) + voz (TTS de salida, transcripción de entrada)
- **Conocimiento personal:** Obsidian (bóveda montada como volumen)
- **Cerebro regulatorio:** grafo (de lisagomez/grafo, rediseñado multi-país)
- **Datos / dashboard:** Supabase + A2ABot (Mission Control)
- **Pago tradicional:** Polar (Merchant of Record; tarjetas/fiat + impuestos)
- **Pago agéntico (futuro):** Circle / USDC (Agent Wallets con guardrails)
- **Contratos:** capa documento (cláusulas validadas por el grafo) + capa
  blockchain opcional (smart contracts con verificación formal Lean 4)
- **Conexión de herramientas:** MCP
- **CLIs agente-nativos:** Printing Press (imprime CLI+MCP por API; ahorro de
  tokens ~100x vs MCP pesado; corre en Claude Code, no en el Droplet)
- **Conexión entre agentes:** protocolo A2A (primer agente vivo: `grafo-a2a`, Fase 5)

---

## FASE 0 — Infraestructura  ← 3/3 verticales vivas (Droplet + sync nocturno diferidos)

Cimiento técnico. Ver FASE0.md y los scripts. Estado detallado en
`.claude/memory/project/fase0-estado.md`. Procedimiento + gotchas para levantar una
vertical en `.claude/memory/reference/hermes-vertical-setup.md`.

- [ ] Droplet + endurecimiento + Docker  *(la vertical personal corre por ahora en WSL2 local, no en el Droplet)*
- [~] Tres contenedores Hermes con sus SOUL.md / AGENTS.md
  - [x] **personal (iris)** — viva, servicio persistente `hermes-personal`, bot Kiris `@hermes_khmcih2cwjdulkbq_bot`, modelo nemotron-3-super-120b vía OpenRouter, persona instalada, round-trip verificado (2026-06-27)
  - [ ] negocio — token Telegram placeholder
  - [ ] clientes — token Telegram placeholder
- [~] Tres bots de Telegram + voz  *(1 bot propio listo; voz pendiente)*
- [ ] Sync nocturno a GitHub
- [x] Supabase: tablas `token_usage` + `facturas` aplicadas y verificadas (2026-06-27)
- **Salida:** las tres verticales vivas y respondiendo.

## FASE 1 — Eficiencia de tokens  ← ✅ COMPLETA en su núcleo (residuales diferidos al Droplet)

> **Cierre (2026-07-01):** la salida —gasto mensual controlado— está lograda en código:
> routing en las 3 verticales, loop en gemini-flash-lite (caché 97%), ingesta a
> `token_usage`, reporte de presupuesto y registro de facturas. Lo que queda NO bloquea
> la fase: la alerta 80% por cron y el auto-tuner **dependen del Droplet** (Fase 0, aún
> diferido), y falta **ejercitar en vivo** los modelos nuevos (gpt-oss/Sonnet aplicados
> por config, no invocados). Ver residuales marcados abajo.

Activar el ahorro una vez que el cimiento corre. Estado detallado en
`.claude/memory/project/fase1-eficiencia.md`; gotchas en `hermes-vertical-setup.md`.
- [x] config.yaml de routing por modelo (2026-06-30): 13 profiles de apoyo enrutados en
  las 3 verticales — 10 ligeros a `openai/gpt-oss-120b:floor` (OpenRouter elige el
  proveedor más barato), 3 pesados (curator, kanban_decomposer, vision) a
  `anthropic/claude-sonnet-4.6`. Los 3 aux de ruta crítica (triage, compression, title) en
  `:nitro`. Opus en ninguno.
- [x] **Loop principal → `google/gemini-2.5-flash-lite`** (2026-06-30): migrado de nemotron
  porque su proveedor no cacheaba el prefijo (reprocesaba ~17k tokens/turno). Con gemini:
  caché 97%, latencia 3.3s (vs ~12s), ~9× más barato/turno. Fallback chain en las 3:
  gemini → mistral-small:nitro → sonnet (3 proveedores distintos). `:nitro` resolvió un
  incidente de cuelgue por proveedor muerto.
- [x] Caché de prefijo: REQUIERE proveedor compatible (Anthropic/OpenAI/Gemini/DeepSeek).
  nemotron NO la soporta (estaba efectivamente apagada); con gemini-flash-lite quedó activa
  (97% hit). Mantener SOUL/memoria estables para no invalidarla.
- [ ] ~~Topes de palabras en crons~~ — N/A: no hay crons todavía (diferidos con el Droplet)
- [x] Ingesta real a `token_usage` (2026-06-30): `businessos/ingest-token-usage.py` parsea
  agent.log → costo con tarifas OpenRouter (caché incluida) → UPSERT idempotente vía service_role.
  Primera corrida: 4 filas, $0.0217. Solo loop principal por ahora; cron al Droplet.
- [x] Reporte de presupuesto on-demand (2026-06-30): vista `v_presupuesto_mensual` + skill
  negocio `budget-report` (negocio reporta gasto del mes por Telegram, alerta al 80%).
- [x] Registro de `facturas` (2026-07-01): job de host `businessos/ingest-facturas.py` (patrón
  inverso al snapshot de tokens; el agente deja JSON en el volumen, el job hace UPSERT vía
  service_role). Cierra la deuda de clientes. Falta correrlo en runtime (Docker) + cron al Droplet.
- [ ] **RESIDUAL — validación en vivo de modelos nuevos**: `title_generation` (gpt-oss) y `vision`
  (Sonnet) están aplicados por config pero NO se han invocado de verdad. Ejercitar y confirmar por
  `agent.log`. No bloquea la fase; local, no depende del Droplet.
- [ ] **RESIDUAL (Droplet)** — Alerta de presupuesto al 80% AUTOMÁTICA (push proactivo): la entrega
  por cron se DIFIERE al Droplet (WSL2 no 24/7); por ahora es on-demand (preguntándole a negocio)
- [ ] (Futuro/Droplet) Auto-tuner de modelo barato con eval binaria (skill autoresearch) +
  aprobación humana. El cerebro principal nunca se auto-cambia por precio sin eval + OK.
- **Salida:** gasto mensual controlado. Presupuesto **$30/mes TOTAL** (las 3 verticales),
  alerta al 80% ($24); fijado el 2026-06-30 (antes 120; bajado tras la eficiencia de Fase 1).
  Fuente única del número: `negocio/MEMORY.md`.

## FASE 2 — Cerebro regulatorio (grafo), acotado ✅ (núcleo completo 2026-07-02; residuales visibles)

Empezar por UN país + UNA dimensión, no los diez de golpe.
- [x] grafo como servicio Docker en hermes-net con su PostgreSQL (`businessos/grafo/`:
  FastAPI + postgres:16-alpine, puerto solo 127.0.0.1:3000, seed vía initdb)
- [x] Rediseño del modelo: proyecto → jurisdicción → dimensión → regla → impacto
  ("proyecto" = contexto de la request, persistido en `evaluaciones.contexto`; KISS)
- [x] Primer país-dimensión: México + fiscal (11 reglas / 13 impactos citando LISR/CFF/SAT,
  7 categorías de gasto, régimen PM Título II; gate de procedencia en `gen_seed_sql.py --check`)
- [x] Flujo completo de evaluación end-to-end validado (motor puro + API, 31 tests pytest;
  evaluación real con veredicto por concepto + fuente citada)
- [x] Regla de oro cumplida por diseño: fail-safe `dudoso` "sin regla aplicable", disclaimer
  SIEMPRE, cero afirmación sin fuente (invariante testeado)
- [x] Integración facturas: host-job `evaluar-facturas.py` (pendiente → veredicto en Supabase);
  AGENTS.md de clientes/negocio actualizados (agente consulta grafo por HTTP sin secretos)
- [ ] **RESIDUAL (Droplet)** — `docker compose up` real + `--dry-run` contra Supabase productivo
  (aquí el daemon Docker está apagado y no hay `.env`; validado local con uvicorn + mock)
- [ ] **RESIDUAL (toolchain)** — CLI del grafo impreso con Printing Press grado ≥A (sin Go/prensa
  en esta máquina; el manifiesto ya apunta a `http://grafo:3000/openapi.json`)
- [ ] (Fase 3) Cotejo DOF de cifras con `verificar:true` + cron de vigencias
- **Salida:** ✅ evaluación real con banderas rojas, checklist y 7 fuentes citadas
  (consultoría=deducible LISR 27-V; hotel=dudoso LISR 28-V; MacBook=dudoso LISR 34-VII).

## FASE 3 — Expansión del grafo + cobro + contratos-documento ✅ (núcleo completo 2026-07-02; residuales visibles)

El grafo crece, y encima de él se montan las dos capas que dependen de él:
cobrar y contratar. Ambas usan el grafo como validador.

Grafo:
- [x] Dimensión **contable** MX (NIF C-6/D-5 + CFF 28/30) y dimensión **contractual** MX
  (CCF 1794-1797/1843, CCo 78, LFPDPPP 21, CFF 29-A) — seed v2: 24 reglas / 27 impactos
- [x] Segundo país: **Colombia fiscal** (ET 107/771-2/104, regimen GENERAL wildcard).
  Resto de LATAM: se agrega país por país al mismo seed (citado o no entra)
- [x] Clasificación por ámbito (una cláusula no clasifica en una consulta fiscal y viceversa)
- [x] Cron de vigencias: `GET /salud-conocimiento` + host-job `revisar-vigencias.py`
  (snapshot a negocio; exit 1 si hay reglas vencidas sirviendo)

Pasarela de pago tradicional (Polar):
- [x] Verificado (2026-07-02): **payouts a México soportados** vía Stripe Connect Express
  (Colombia también). Costo Starter 5% + 50¢; sandbox disponible
- [x] Host-job `polar-cobros.py`: el agente deja request en `cobros_pending/` → checkout
  session en Polar → link a `cobros_links/` + fila en `cobros`; `--sync` refresca estados
- [x] Cuenta Polar + cobro real probado en **sandbox** (2026-07-02): organización + OAT
  (scopes products/checkouts) + producto PWYW «Cobro de servicios»; flujo completo
  bandeja → checkout → link → pago con tarjeta de prueba → `--sync` → `pagado` en `cobros`.
  Gotcha corregido en `polar-cobros.py`: Cloudflare bloquea el UA de urllib (error 1010).
- [ ] **RESIDUAL (producción)** — repetir en Polar producción cuando haya cobros reales:
  quitar `POLAR_API` del `.env` y reemplazar token + product_id por los de prod

Contratos-documento (capa 1):
- [x] Tabla `contratos` + plantilla (`clientes/contrato-template.md`) + host-job
  `validar-contratos.py`: cláusulas → grafo (dimensión contractual, país del cliente) →
  banderas con fuente → `en_revision`/`validado`. Aprobar/firmar = SOLO Elisa
- [x] SQL de Fase 3 en `supabase-fase3.sql` (cobros + contratos, RLS sin políticas)
- [ ] **RESIDUAL (Droplet)** — aplicar `supabase-fase3.sql` al proyecto, correr los jobs
  contra Supabase productivo con grafo arriba, y reseedear el grafo (seed v2)
- **Salida:** ✅ evaluaciones reales en los 3 ámbitos nuevos con fuente citada
  (CO: deducible ET 107 + 6 requisitos; contable: dudoso NIF C-6 + bandera diferencia
  temporal; contractual: contrato de 5 cláusulas → en_revision con bandera CCF 1843).

## FASE 4 — Dashboard Mission Control ✅ (núcleo completo 2026-07-02; residuales visibles)

PRP: `.claude/PRPs/prp-fase4-dashboard.md`. Estado detallado en
`.claude/memory/project/fase4-dashboard.md`. A2ABot = el Next.js de la raíz del repo.

- [x] Shell Mission Control (solo lectura, dark) + capa de datos server-only con
  conmutador real/mock (`DASHBOARD_DATA`); cero secretos en el bundle cliente
  (verificado en build) y schemas Zod para TODO payload externo
- [x] Vista **AI Spend**: medidor $30/80% (fuente: `v_presupuesto_mensual`, la misma
  del skill budget-report), serie diaria SVG con hover, desglose por vertical y
  por modelo (paleta validada con el método dataviz)
- [x] Vista **Grafo**: semáforo de vigencias, evaluaciones con veredicto + fuente
  citada + disclaimer SIEMPRE (regla de oro), facturas/contratos/cobros.
  El grafo ganó `GET /evaluaciones?limit` (solo lectura; 51 tests verdes)
- [x] Vista **Pantheon**: tabla `pantheon` (supabase-fase4.sql, APLICADA) + host-job
  `snapshot-pantheon.py` (lee config/skills de los volúmenes; el dashboard JAMÁS
  los monta) + health de gateways `:8642`; UPSERT real verificado (3 filas)
- [x] Empaquetado: Dockerfile standalone + servicio `a2abot` en compose
  (`127.0.0.1:9200`, túnel SSH); convive con hermes-dashboard 9119
- [ ] **RESIDUAL (máquina runtime)** — build de la imagen + `compose up a2abot` real,
  verificar path de health del gateway, y cron de `snapshot-pantheon.py`
- [ ] **RESIDUAL (dev)** — screenshots Playwright de las 3 vistas (falta
  `sudo npx playwright install-deps chromium` en esta máquina)
- **Salida:** ✅ panel único con las 3 vistas funcionando (mock en dev; `real`
  conmutado por env en runtime).

## FASE 5 — Interoperabilidad A2A ✅ núcleo A2A completo (2026-07-03); capa económica FUTURA

PRP: `.claude/PRPs/prp-fase5-a2a.md`. Estado detallado en
`.claude/memory/project/fase5-a2a.md`. Protocolo Agent2Agent (a2aproject/A2A,
Linux Foundation), SDK oficial `a2a-sdk` 1.1.0.

**Caso de uso ancla: el grafo como agente A2A independiente.** ← construido
- [x] Servicio `businessos/grafo-a2a/`: Agent Card en
  `/.well-known/agent-card.json` anunciando la capacidad
  (`evaluar-impacto-regulatorio`: fiscal/contable/contractual LATAM, fuente
  citada, "señala, no asesora") + `message/send` JSON-RPC
- [x] Puente DETERMINISTA (sin LLM, cero tokens por consulta): DataPart/texto
  libre → `POST grafo:3000/evaluaciones` → artifact con la EvaluacionResponse
  ÍNTEGRA. Regla de oro a través del protocolo: sin disclaimer/fuentes NO se
  entrega (tarea `failed`); grafo caído → `failed` con razón, nunca inventa
- [x] Opacidad verificada por test: la superficie es EXACTAMENTE {card, rpc,
  /health}; `/salud-conocimiento`, listado de evaluaciones, reglas y seed
  inalcanzables; Starlette puro (sin /docs ni /openapi.json). El grafo quedó
  byte-idéntico (su openapi.json es el contrato del CLI)
- [x] Interop real: cliente del SDK (simulando agente de un tercero) descubre
  por card y evalúa contra el grafo con reglas reales (17 tests verdes:
  deducible LISR 27-V con fuente; fail-safe `dudoso` en texto libre)
- [x] Empaquetado: Dockerfile + servicio en compose (127.0.0.1:4000 +
  hermes-net, sin secretos); AGENTS.md de negocio/clientes con el escalón A2A
  activo (las verticales siguen en REST directo: A2A complementa, no reemplaza)
- [ ] **RESIDUAL (Droplet)** — build + `compose up grafo-a2a` real y smoke de
  card/message-send dentro de hermes-net
- [ ] **RESIDUAL (futuro, requiere decisión)** — exposición a internet para
  socios reales: dominio + auth real (`securitySchemes` en la card) + revisar
  `GRAFO_A2A_PUBLIC_URL`. Nada de auth a medias
- **Salida:** ✅ el cerebro regulatorio convertido en servicio reutilizable por
  un ecosistema de agentes, y el patrón A2A (servidor + card + executor +
  cliente) validado — la base que replica la Fase 6.

Otros casos A2A que habilita esta fase (aún no construidos):
- Verticales tratándose como servicios independientes con descubrimiento formal
- Conexión con agentes de terceros (socios, proveedores) de forma segura

### Capa de economía agéntica (mismo horizonte que A2A)

Estas piezas comparten naturaleza —agentes que transaccionan valor— y la misma
carga regulatoria. Van juntas, al final, cuando todo lo demás esté sólido y el
grafo pueda evaluar cada una país por país antes de activarla.

Pago agéntico (Circle / USDC):
- La versión regulada y seria de lo que el commerce kit intentaba: Circle emite
  USDC y su Agent Stack da Agent Wallets con guardrails de política para que los
  agentes transaccionen de forma autónoma y controlada
- Pagos máquina-a-máquina (un agente paga a otro por un servicio/dato)
- Antes de activar modo real: pasarlo por el propio grafo (impacto cripto LATAM)
  y mantener aprobación humana

Contratos-blockchain (capa 2 de contratos):
- Smart contracts on-chain para escrow / liberación por hitos / acuerdos
  auto-ejecutables
- Construidos con la skill SDD + verificación formal en Lean 4 (probar la lógica
  antes de desplegar — la forma responsable de mover valor on-chain)
- Solo se justifica cuando un acuerdo concreto necesita auto-ejecución; la
  mayoría de contratos viven y mueren como documento (capa 1)
- Siempre con aprobación humana; nunca se firma ni ejecuta solo

**Salida de la capa económica:** el sistema no solo razona y contrata, también
transacciona — con respaldo regulado y verificación formal.

## FASE 6 — Departamentos operados por el trío Hermes→Ejecutor→Supervisor ✅ trío construido y validado en dev (2026-07-03); runtime RESIDUAL

PRP: `.claude/PRPs/prp-fase6-trio.md`. Estado detallado en
`.claude/memory/project/fase6-departamentos.md`.

La evolución natural de A2A: en vez de "un agente por departamento", **dos agentes
con roles fijos** —un Ejecutor y un Supervisor— atienden muchos departamentos, con
Hermes-Negocio como **orquestador** (reparte, no ejecuta). Los departamentos no son
agentes: son **paquetes de competencias** (tareas + reglas de validación + fuentes de
conocimiento) que el par carga según la tarea. Detalle en `departamentos/` (SPEC-trio,
el paquete del primer departamento, y el modelo white-label).

- **Tres niveles:** Hermes-Negocio orquesta (entiende, arma contexto, reparte) →
  Ejecutor hace (servicio A2A propio sobre Claude Agent SDK, en workspace aislado) →
  Supervisor valida por reglas antes de que algo tenga efecto (servicio A2A independiente).
- **Primer departamento: Desarrollo de Software** — encaja con la fábrica de skills que ya
  existe y NO depende del grafo (sus fuentes son el código y los skills, no lo fiscal).
- **Dos capas de control:** Supervisor (automático, regla a regla) + humano (en lo
  irreversible: merge a main, deploy, cara al cliente, dinero). Es "copiloto, no autopiloto".
- **White-label = configuración:** el trío es idéntico para todos; por cliente cambia qué
  departamentos activa, sus reglas, su marca y sus datos/workspace aislados. Arranca en uso
  propio (construir los SaaS de la dueña) y luego se vende como "departamento con IA".

**Construido (2026-07-03, PRP-006):**
- [x] Contrato del trío (`trio-contrato/contrato.py`): TAREA/RESULTADO/VEREDICTO +
  ciclo de estados 1:1 con la SPEC §7.2; stdlib pura, tests propios
- [x] Tabla `tareas` (`supabase-fase6.sql`, idempotente, RLS sin políticas) +
  etiqueta `trio` en el check de `token_usage.vertical`
- [x] `businessos/ejecutor-a2a/` (127.0.0.1:4100): card honesta con fronteras,
  worktree por tarea (`worktree/<task_id>`, nunca main), motor pluggable
  (MockEngine default, cero tokens), diff real desde git, cliente A2A saliente
  al Supervisor, ÚNICO escritor de `tareas`; todo error → `failed` con razón
- [x] Motor real `ClaudeAgentEngine` (claude-agent-sdk==0.2.110 introspeccionado):
  respeta límites (modelo_pref/presupuesto_usd/max_turns), registra cada modelo
  usado en `token_usage` vertical `trio` (también si la corrida falla); smoke
  real gated `EJECUTOR_SMOKE_REAL=1`
- [x] `businessos/supervisor-a2a/` (127.0.0.1:4200): motor de reglas determinista
  SIN SDK de modelo; config versionada `reglas/software.toml` (build/typecheck/
  lint/tests + sin-any/sin-secretos/≤500-líneas/RLS); re-ejecuta los gates ÉL
  MISMO sobre el worktree; gate no corrible = rechazo con hallazgo, jamás
  "asumido"; regla activa sin runner = el servicio NO arranca (`code_review` y
  `security_review` declarados e inactivos hasta tener runner)
- [x] Skill `negocio/skills/trio-software/`: armar tarea con criterios, POST
  JSON-RPC verificado empíricamente (`SendMessage` + header `A2A-Version: 1.0`),
  reintento con hallazgos y tope, escalado al humano, gate humano SIEMPRE en lo
  irreversible; Hermes sin secretos (secret-scrubbing respetado)
- [x] Interop end-to-end con cliente real del SDK (cero tokens): tarea → rechazo
  con hallazgos → reintento con observaciones → aprobado; trazas completas;
  opacidad de ambos = exactamente {card, rpc, /health}
- [x] Empaquetado: Dockerfiles + compose (hermes-net, 127.0.0.1, volumen
  compartido `trio-workspace`, sin secretos); `docker compose config` valida;
  158 tests verdes en el repo (grafo y grafo-a2a sin regresión)
- [x] Mergeado a master (PR #9, 2026-07-03) y `supabase-fase6.sql` APLICADO y
  verificado en producción (tabla `tareas` con RLS; check de
  `token_usage.vertical` incluye 'trio') — vía management API con permiso
  explícito de la dueña
- [ ] **RESIDUAL (Droplet/runtime)** — build + `compose up ejecutor-a2a
  supervisor-a2a` + smoke de card/SendMessage en hermes-net
- [ ] **RESIDUAL (decisión de la dueña, quema tokens)** — smoke del motor real y
  primer dogfood con `EJECUTOR_ENGINE=claude` (requiere CLI de Claude Code en la
  imagen del ejecutor; hoy la imagen es mock-only a propósito)
- [ ] **RESIDUAL (cuando exista runner)** — activar los gates de modelo del
  Supervisor; hoy activarlos sin runner es imposible por diseño (config inválida)
- [ ] **FUTURO (otro PRP)** — RAG por ámbito por cliente y white-label; CLIs del
  trío = corriente Printing Press
- **Salida:** ✅ un departamento de software operado por el trío, validado de punta
  a punta en uso propio (dev, motor mock), listo para replicarse por configuración
  — el dogfood real con tokens es el siguiente paso y es decisión de la dueña.

---

## FASE 7 — Enjambre (swarm) de Ejecutores en el departamento de Software ✅ construido y validado en dev (2026-07-04, PR #13); SQL + runtime RESIDUAL

PRP: `.claude/PRPs/prp-fase7-swarm.md`. Estado detallado en
`.claude/memory/project/fase7-swarm.md`.

La evolución natural del trío (Fase 6): de **un Ejecutor por tarea** a un **enjambre
de Ejecutores coordinados** que trabajan en paralelo sobre las sub-tareas de una
feature grande. Un servicio A2A nuevo —el **Coordinador**— descompone la feature en un
DAG de sub-tareas con alcances disjuntos, las reparte en paralelo al Ejecutor (con tope
de fan-out y presupuesto), integra las ramas aprobadas y pide **una verificación final
del Supervisor sobre la rama integrada** — o escala. Se reusan el Ejecutor y el
Supervisor de la Fase 6 SIN tocarlos: cada sub-tarea es una `tarea` válida del contrato
existente. "Aislar, no fundir"; "acotar antes de escalar"; "verificar antes de confiar".

**Construido (2026-07-04, PRP-007, PR #13 → master):**
- [x] `businessos/coordinador-a2a/` — servicio A2A hermano de ejecutor/supervisor:
  card honesta ("descompongo/reparto/integro/escalo; NO escribo código, NO apruebo,
  NO despliego"), `enjambre.py` (fan-out acotado + reintento por sub-tarea),
  `planner.py` (Planner pluggable; `MockPlanner` determinista cero tokens, real opt-in),
  `presupuesto.py` (corte por gasto acumulado leído de `token_usage`),
  `integracion.py` (merge a `tarea/<parent_id>` + verificación final del Supervisor),
  clientes A2A a Ejecutor y Supervisor
- [x] `trio-contrato/contrato.py` extendido: `validar_plan` + DAG (ids únicos,
  dependencias acíclicas, alcances de archivo disjuntos donde se pueda)
- [x] `ejecutor-a2a/claude_engine.py`: `filas_token_usage(..., task_id=None)` para
  atribuir el gasto de cada sub-tarea (corte EXACTO de presupuesto); retrocompatible
- [x] **Un escritor por fila, preservado**: el Coordinador escribe SOLO la fila PADRE
  (`es_padre=true`: plan, fan_out_max, presupuesto, gasto, estado global); cada Ejecutor
  SOLO su fila hija (`parent_id`); el Supervisor sigue stateless; Hermes sin credenciales
- [x] Verificado en dev con cero tokens: **112 tests verdes** en los servicios del
  enjambre (ejecutor-a2a 35 · coordinador-a2a 41 · trio-contrato 36)
- [x] Mergeado a master (PR #13, 2026-07-04); conflicto con el PR #12 (GLM) en
  `filas_token_usage` resuelto de forma aditiva (nota GLM del docstring + parámetro
  `task_id`), verde tras el merge
- [ ] **RESIDUAL (BD, pendiente — a diferencia de Fase 6)** — `supabase-fase7.sql`
  NO aplicado aún (verificado 2026-07-04: columnas `token_usage.task_id`,
  `tareas.parent_id/es_padre/fan_out_max/plan/presupuesto_usd/gasto_usd` ausentes en
  producción). Idempotente, RLS sin políticas (solo service_role); aplicar con permiso
  explícito de la dueña antes del runtime del enjambre
- [ ] **RESIDUAL (Droplet/runtime)** — build + `compose up coordinador-a2a` en
  hermes-net + smoke card/SendMessage del enjambre end-to-end
- [ ] **RESIDUAL (decisión de la dueña, quema tokens)** — Planner real opt-in y primer
  dogfood del enjambre con motor real (`EJECUTOR_ENGINE=claude`); hoy Mock-only a propósito
- **Salida:** ✅ un enjambre de Ejecutores coordinado, validado de punta a punta en dev
  (motor y planner mock, cero tokens), con las mismas garantías de la Fase 6 (Supervisor
  independiente re-gatea el todo + gate humano en lo irreversible) — aplicar el SQL y el
  dogfood real son los siguientes pasos y son decisión de la dueña.

---

## Corriente transversal — CLIs agente-nativos (Printing Press)

No es una fase; atraviesa todas. Conforme cada fase suma un servicio nuevo, se
imprime su CLI para que los agentes lo usen gastando ~100x menos tokens que un
MCP pesado. Es otra palanca de eficiencia, hermana del routing y el caché.

Cómo funciona (archivos en la raíz de `businessos/`):
- cli-manifest.yaml mapea cada CLI a su fase, fuente y vertical
- print-phase.sh prepara/dispara la impresión de los CLIs de una fase
- GENERACION-AUTOMATICA.md explica los tres niveles de automatización
- cli-audit.py (job de confianza del host) audita qué CLIs faltan para la fase
  actual y deja el snapshot que lee la vertical negocio (skill `cli-audit`)
- Printing Press corre en Claude Code en tu máquina de desarrollo, no en el
  Droplet (necesita Go 1.26.4+ y Claude Code)

Detector + aviso (Nivel 2-prep, decidido 2026-06-30): `cli-audit.py` corre por
cron de SO en el Droplet (2:30, escalonado tras la ingesta de tokens) y deja
`/opt/data/workspace/cli-audit.json`; el digest 8:00 de negocio reporta las
brechas con el comando exacto. La impresión y la mejora de un CLI siguen siendo
acción humana en Claude Code (`/printing-press`, `/printing-press-amend`,
`/code-review`): el cron solo detecta y avisa, nunca imprime (Nivel 3 descartado).

Qué CLI por fase:
- Fase 0-1: DigitalOcean ✅, Telegram ✅ (catálogo; impresos 2026-06-30, Grade A)
- Fase 1-2: Supabase ✅ (impreso 2026-06-30 desde el OpenAPI de PostgREST del
  proyecto; auth dual-header service_role cableada a mano; herramienta de host/dev,
  el agente no la usa por secret-scrubbing)
- Fase 2:   grafo (apuntando a su spec propio) — pendiente
- Fase 3:   Polar (cobros, suscripciones, estado MoR) — pendiente
- Fase 5:   Circle (Agent Wallets, USDC) — solo al llegar ahí

Estado (2026-06-30): los 3 CLIs de las fases vivas están impresos y verificados
(shipcheck 7/7, Grade A); el auditor reporta 0 faltantes para la fase actual.
Binarios en `~/printing-press/library/` (artefactos, fuera del repo). Detalle y
gotchas en `.claude/memory/project/cli-printing-press.md`.

Reglas de seguridad (heredadas del rigor del propio Printing Press):
- **Verificar anotaciones MCP en los CLIs que mueven dinero** (Polar, Circle):
  confirmar que las operaciones de escritura/cobro estén marcadas como
  destructivas, para que el agente pida confirmación antes de actuar. Una
  marca readOnly falsa en algo que mueve dinero es un bug real, no un detalle.
- **Dry-run por defecto:** los CLIs nacen imprimiendo, no actuando; las acciones
  con efecto requieren opt-in explícito (--launch/--send). Encaja con la
  aprobación humana obligatoria de Clientes.
- **Anti-reimplementación:** un CLI llama a la API real o lee del store local;
  nunca inventa respuestas. Es el principio "citar fuentes, no inventar"
  aplicado a código.
- **Verify antes de confiar:** shipcheck (dogfood + scorecard + proof) y grado A
  mínimo antes de usar un CLI en producción.

---

## Corriente transversal — Canales de comunicación

No es una fase; atraviesa todas. Tres superficies con papeles distintos:

- **Telegram** (desde Fase 0, vivo): móvil y rápido. Avisos, notas de voz, sí/no
  al vuelo. La vida personal del dueño (Kiris) se queda aquí SIEMPRE.
- **Slack** (interno, se SUMA a Telegram — piloto en curso): centro de trabajo
  del equipo de 4 — seguimiento de proyectos, reportes de agentes y compuertas
  de aprobación. Lo posee Hermes-Negocio (orquestador); los departamentos
  reportan a Hermes y él publica al canal. **Slack es SOLO interno — NO de cara
  al cliente** (no se marca-blanca bien). Escalera: piloto con el soporte Slack
  nativo de Hermes (Socket Mode, sin puertos públicos) → Slack App propia cuando
  se quieran botones de aprobación ("feature lista [Aprobar][Rechazar][Ver PR]").
  - Diseño completo (topología de canales, matriz de roles del equipo de 4,
    runbook verificado contra la doc oficial 2026-07-03):
    `departamentos/equipo-y-slack.md`
  - Artefactos listos: `negocio/slack-config-fragment.yaml` +
    `slack-piloto.sh` (host-job runtime)
  - **PENDIENTE (dueña)**: crear la Slack App (Socket Mode, scopes y eventos del
    runbook) + pasar tokens al `.env` del volumen de negocio + IDs de canal/miembros
  - **PENDIENTE (runtime)**: correr `slack-piloto.sh` y verificar la @mención
    en `#dep-negocio`
- **Web propia** (producto, futuro): el canal de clientes, con marca propia y
  aislamiento de datos. Slack Connect solo si un cliente ya vive en Slack y lo
  prefiere.

---

## Descartados (con motivo)

- **agent-commerce-kit (pagos agénticos en USDC):** introduce una línea de
  negocio nueva (cripto), código muy verde de hackathon moviendo dinero real, y
  carga regulatoria que el propio grafo marcaría en rojo. Fuera del alcance.
  Nota: su *función* (pago entre agentes) sí se retoma en Fase 5, pero vía
  Circle —regulado, con Agent Wallets y guardrails— en lugar de código casero.

---

## Principios que cruzan todo el proyecto

1. **Aislar, no fundir.** Cada componente nuevo es un servicio en hermes-net,
   no código mezclado. Mantiene el sistema entendible y seguro.
2. **Acotar antes de escalar.** Un país-dimensión antes de diez; un flujo
   validado antes del siguiente.
3. **Citar fuentes, no inventar.** En lo regulatorio/fiscal, cada afirmación
   trae fuente y vigencia. El sistema señala, el profesional decide.
4. **Eficiencia por routing, no por recorte.** Lo barato a modelos baratos, lo
   importante a modelos capaces. No se sacrifica calidad donde importa.
5. **Arreglar lo compartido, no el caso aislado.** Cuando algo falle, pregunta
   si el arreglo va en el componente común (Hermes, grafo, skill) o solo en una
   vertical. Por defecto, lo compartido — así el beneficio se compone. (Tomado
   del "machine vs printed-CLI change" de Printing Press.)
6. **Verificar antes de confiar.** Ningún componente que mueva dinero, datos o
   reglas se usa sin verificación: shipcheck en CLIs, fuentes en el grafo,
   anotaciones de seguridad correctas en MCP, aprobación humana en lo
   irreversible.
