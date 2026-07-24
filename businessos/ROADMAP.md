# Hermes OS · A2A — Roadmap del proyecto

Mapa consolidado de las decisiones tomadas. Las fases están en orden de
construcción: cada una se apoya en la anterior. No saltes hacia adelante hasta
que la fase previa esté validada.

---

## Arquitectura en una frase

Una mente (Hermes) con tres bocas (verticales: personal, negocio, clientes),
cada una en su propio contenedor Docker, sobre un servidor Hetzner Cloud,
hablando por Telegram y voz, con un grafo de conocimiento como cerebro
regulatorio/fiscal/contable multi-país, y un dashboard "Mission Control" encima.

---

## Stack confirmado

- **Servidor:** **Hetzner Cloud** — PROVISIONADO 2026-07 (cx33: 4 vCPU / 8 GB,
  `167.233.233.56`, Falkenstein `fsn1`); corre TODO incl. grafo por ~$9/mes. Runbook
  en `FASE0-hetzner.md` (delta sobre FASE0.md, que conserva los pasos genéricos de
  servidor). No bajar de 4 GB para las 3 verticales: en 2 GB el stack hace OOM-kill
  (FASE0.md §1); con 1 vertical + limits recortados, 2 GB alcanza. El plan de
  escalamiento por fases (interno → MVP → multitenant → alto volumen, con
  costeo unitario y FODA de Hetzner) vive en `plan-escalamiento-hermes.md`
  (v. jul-2026 de la dueña + anexo de deltas verificados).
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
  blockchain **permisionada (Hyperledger Fabric)** vía el departamento de
  Contratos Inteligentes (Fases 12-13, fundado 2026-07-19); la verificación
  formal Lean 4 queda como opción futura sobre esa capa
- **Conexión de herramientas:** MCP
- **CLIs agente-nativos:** Printing Press (imprime CLI+MCP por API; ahorro de
  tokens ~100x vs MCP pesado; corre en Claude Code, no en el servidor)
- **Conexión entre agentes:** protocolo A2A (primer agente vivo: `grafo-a2a`, Fase 5)

---

## FASE 0 — Infraestructura ✅ (2026-07-08: las 3 verticales viven en Hetzner; solo voz queda como futuro)

Cimiento técnico. Ver FASE0.md y los scripts. Estado detallado en
`.claude/memory/project/fase0-estado.md`. Procedimiento + gotchas para levantar una
vertical en `.claude/memory/reference/hermes-vertical-setup.md`.

- [x] **Servidor + endurecimiento + Docker** — Hetzner **cx33** (4 vCPU / 8 GB / x86, Falkenstein `fsn1`), IPv4 `167.233.233.56`, provisionado 100% por CLI (`hcloud-pp-cli`) el 2026-07-05. Docker + compose + swap 2G + fail2ban + usuario `hermes` + firewall solo-SSH; root SSH cerrado (2026-07-06). Detalle y gotchas en `.claude/memory/project/despliegue-hetzner.md`. *(cx22/Ashburn del runbook resultó inviable: CX es solo-EU y US ~3.4× más caro)*
- [x] Tres contenedores Hermes con sus SOUL.md / AGENTS.md — **las 3 en Hetzner**
  - [x] **negocio (@a2aTeamBot)** — migrado 2026-07-05, 24/7, memoria intacta.
  - [x] **personal (Kiris)** — migrada 2026-07-08 (mismo patrón: stop en WSL2 → tar del volumen vía alpine → extracción uid 10000/0700 sin locks → `--profile verticales up`). Envío saliente verificado por Telegram; contenedor local eliminado (el volumen local queda como respaldo extra).
  - [x] **clientes (@a2aClientbot)** — migrada 2026-07-08, igual que personal. Verificada.
- [~] Tres bots de Telegram + voz  *(3 bots vivos en el server; voz = futuro, decisión de la dueña)*
- [x] Sync nocturno a GitHub — cron 04:17 `backup-verticales.sh` (2026-07-08 generalizado desde el de negocio del 2026-07-06): tarball por vertical de los 3 volúmenes `.hermes` + rotación 7 + espejo off-box al repo privado **`hermes-os-a2a-backups`**. *(2026-07-11: repos renombrados — código `lisagomez/hermes-os-a2a`, respaldo `lisagomez/hermes-os-a2a-backups`; el modelo "3 repos, uno por vertical, pusheados por el bot" del runbook original quedó **descartado** — el volumen es 0700/uid-10000, el agente no puede leerlo. Ver FASE0.md §9.)*
- [x] Supabase: tablas `token_usage` + `facturas` aplicadas y verificadas (2026-06-27)
- **Salida:** ✅ las tres verticales vivas y respondiendo **desde el server 24/7**, con respaldo nocturno.

## FASE 1 — Eficiencia de tokens ✅ COMPLETA (residuales cerrados 2026-07-08)

> **Cierre (2026-07-01, residuales 2026-07-08):** la salida —gasto mensual controlado—
> está lograda y operando en runtime: routing en las 3 verticales, loop en
> gemini-flash-lite (caché 97%; negocio en haiku-4.5), ingesta nocturna a `token_usage`,
> reporte de presupuesto (dato-en-SOUL), alerta 80% automática y respaldo de facturas.
> Solo el auto-tuner sigue como futuro (requiere evals + OK humano).

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
- [ ] ~~Topes de palabras en crons~~ — N/A: no hay crons todavía (diferidos con el servidor)
- [x] Ingesta real a `token_usage` (2026-06-30): `businessos/ingest-token-usage.py` parsea
  agent.log → costo con tarifas OpenRouter (caché incluida) → UPSERT idempotente vía service_role.
  Primera corrida: 4 filas, $0.0217. Solo loop principal por ahora; cron al servidor.
- [x] Reporte de presupuesto on-demand (2026-06-30): vista `v_presupuesto_mensual` + skill
  negocio `budget-report` (negocio reporta gasto del mes por Telegram, alerta al 80%).
- [x] Registro de `facturas` (2026-07-01): job de host `businessos/ingest-facturas.py` (patrón
  inverso al snapshot de tokens; el agente deja JSON en el volumen, el job hace UPSERT vía
  service_role). Cierra la deuda de clientes. Falta correrlo en runtime (Docker) + cron al servidor.
- [x] **Validación en vivo de modelos nuevos (2026-07-08)**: `title_generation` → `gpt-oss-120b:nitro`
  invocado de verdad en prod (varias corridas, últimas 2026-07-06); `vision` → `claude-sonnet-4.6`
  ejercitado con imagen real vía `hermes chat --image` ("Image analysis completed" en `agent.log`).
- [x] **Alerta de presupuesto al 80% AUTOMÁTICA (2026-07-08)**: host-job `alerta-presupuesto.sh`
  (cron 08:00 en el server) lee el snapshot y al cruzar 80% manda UN push por Telegram a la dueña
  (`hermes send`, sin LLM; dedupe con flag mensual). Probado con snapshot sintético.
- [ ] (Futuro) Auto-tuner de modelo barato con eval binaria (skill autoresearch) +
  aprobación humana. El cerebro principal nunca se auto-cambia por precio sin eval + OK.
- **Salida:** gasto mensual controlado. Presupuesto **$30/mes TOTAL** (las 3 verticales),
  alerta al 80% ($24); fijado el 2026-06-30 (antes 120; bajado tras la eficiencia de Fase 1).
  Fuente única del número: `negocio/MEMORY.md`.

## FASE 2 — Cerebro regulatorio (grafo), acotado ✅ (runtime en Hetzner 2026-07-06; queda el CLI como acción humana)

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
- [x] **Runtime (cerrado 2026-07-06)** — grafo Up/healthy en Hetzner (`/health` = ok, db ok,
  24 reglas); cron lunes `revisar-vigencias` operando (0 vencidas)
- [ ] **RESIDUAL (toolchain, acción humana)** — CLI del grafo impreso con Printing Press grado ≥A
  (el manifiesto ya apunta a `http://grafo:3000/openapi.json`; se dispara con `/printing-press`
  en Claude Code — por decisión de Nivel 2, la impresión nunca es automática)
- [ ] (Fase 3) Cotejo DOF de cifras con `verificar:true` + cron de vigencias
- **Salida:** ✅ evaluación real con banderas rojas, checklist y 7 fuentes citadas
  (consultoría=deducible LISR 27-V; hotel=dudoso LISR 28-V; MacBook=dudoso LISR 34-VII).

## FASE 3 — Expansión del grafo + cobro + contratos-documento ✅ (runtime verificado 2026-07-08; Polar producción cuando haya cobros reales)

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
- [x] **Runtime (verificado 2026-07-08)** — `cobros` y `contratos` aplicadas en producción
  (list_tables las confirma; `cobros` ya tiene la fila del sandbox), grafo arriba con seed v2
  (24 reglas en `/health`) y `revisar-vigencias` corriendo por cron semanal
- **Salida:** ✅ evaluaciones reales en los 3 ámbitos nuevos con fuente citada
  (CO: deducible ET 107 + 6 requisitos; contable: dudoso NIF C-6 + bandera diferencia
  temporal; contractual: contrato de 5 cláusulas → en_revision con bandera CCF 1843).

## FASE 4 — Dashboard Mission Control ✅ COMPLETA (runtime cerrado 2026-07-06/08)

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
- [x] **Runtime (cerrado 2026-07-06/08)** — a2abot Up en Hetzner (307 con auth, túnel SSH
  9200) + cron nocturno de `snapshot-pantheon.py`; desde 2026-07-08 el snapshot lee las
  TRES verticales del server (3 upserts HTTP 200). *(Nota: el puerto 8642 del gateway no
  responde en este build de Hermes — el health de Pantheon se apoya en el snapshot.)*
- [x] **Dev (2026-07-04)** — screenshots Playwright de las 3 vistas en modo mock
  validados y guardados en `businessos/dashboard-screenshots/` (chromium instaló con
  `npx playwright install chromium`, sin `install-deps`); las 3 vistas renderizan
  íntegras (Pantheon, AI Spend, Grafo con fuente citada + disclaimer)
- **Salida:** ✅ panel único con las 3 vistas funcionando (mock en dev; `real`
  conmutado por env en runtime).
- [x] **Post-fase (2026-07-23, PRs #120–#126)** — el panel creció a **5 vistas** y ganó
  su primera acción de escritura:
  - Vista **Desarrollo** (`/desarrollo`, tarea del trío `mission-control-2026-0001`
    verificada y desplegada): últimas 20 filas de `tareas` con badge por estado y
    **combo de departamento en el navbar** (registrados en el Supervisor ∪ presentes
    en `tareas` vía `v_departamentos` — autoactualizable en ambas direcciones).
  - Vista **CRM** (`/crm`, submenú `Tareas | CRM` del departamento adquisición):
    **canvas del embudo de cliente** (9 etapas de `leads.etapa` + `perdido` aparte,
    conteos vivos vía `v_embudo_leads`), panel de conversaciones CRM
    (`v_crm_conversaciones_resumen`) y tabla de **leads con "Mover a"** — única
    escritura del panel (server action + Zod + fila-afectada verificada; e2e real
    probado en producción). Tipografía base 20px (pedido de la dueña).
- [x] **Post-fase (2026-07-24, PR #143) — auth + PWA + listo para Vercel**: el panel se
  abre a los compañeros. Como renderiza todo el negocio con `service_role`, la auth es
  prerequisito (no opcional): **magic link passwordless + allowlist fail-closed**
  (`PANEL_ALLOWED_EMAILS`) en `middleware.ts`; OTP gateado en el servidor (sin
  email-bombing ni oráculo de enumeración). **PWA instalable** (manifest + service worker
  conservador que nunca cachea HTML/Supabase + iconos radar). App en la raíz → Root
  Directory `.` + `.vercelignore`. Runbook en `businessos/DEPLOY-mission-control.md`.
  Build/typecheck/lint verdes + smoke de runtime. El `vercel deploy` lo hace la dueña
  (elección "solo déjalo listo"). Convive con el a2abot Docker (túnel SSH) — el middleware
  también aplicará ahí al reconstruir la imagen (poner vars de auth en su `.env`).
  - **Dos 500 preexistentes cazados y corregidos** al verificar el deploy: enum Zod
    vs `vertical='trio'` en `/ai-spend`, y agregado inline PostgREST (PGRST123) en
    `/grafo` → vista `v_facturas_resumen`. Ver aprendizaje CLAUDE.md 2026-07-23.

## FASE 5 — Interoperabilidad A2A ✅ COMPLETA en runtime (smoke 2026-07-08); capa económica FUTURA

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
- [x] **Runtime (cerrado 2026-07-08)** — `compose up grafo-a2a` en Hetzner (healthy) y
  smoke card/message-send DENTRO de hermes-net (`smoke-trio/runtime.py`): evaluación real
  por A2A → `deducible` con 4 fuentes citadas (LISR 27-I/III/V, CFF 29/29-A) + disclaimer
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

## FASE 6 — Departamentos operados por el trío Hermes→Ejecutor→Supervisor ✅ trío VIVO en runtime (2026-07-08); dogfood real = decisión de la dueña

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
- [x] **Runtime (cerrado 2026-07-08)** — `compose up ejecutor-a2a supervisor-a2a` en
  Hetzner (healthy) + smoke card/SendMessage dentro de hermes-net
  (`smoke-trio/runtime.py`): cadena completa con gates npm REALES → el repo placeholder
  se rechaza con hallazgos [build, typecheck, lint, tests] (anti-sello-de-goma actuando)
  y la fila `smoke-runtime-1` quedó escrita en `tareas` de producción por el Ejecutor.
  El camino "aprobado" quedó validado en dev (gates ligeros). Gotcha resuelto: los
  bind-mounts llegan con uid del host → `git config --system safe.directory '*'` en las
  imágenes del trío (sin eso git aborta con 'dubious ownership' y la tarea sale failed)
- [x] **Preparación del dogfood real (2026-07-09)** — dos huecos de infra cerrados,
  cero tokens: (1) `supervisor-a2a` reconstruido con Playwright+Chromium
  (`@playwright/test@1.61.1` en `/ms-playwright`) — antes CUALQUIER tarea real
  rechazaba en el gate `tests` por diseño, sin importar el modelo; (2)
  `ejecutor-a2a` reconstruido con el CLI de Claude Code (Node +
  `@anthropic-ai/claude-code`, verificado `claude --version` → `2.1.205`).
  Ruteo de costo decidido: GLM-5.2 vía seam z.ai para la primera tarea (simple),
  `presupuesto_usd=1`. Política de ruteo por tarea documentada en
  `negocio/MEMORY.md` + `SOUL.md` de las 3 verticales.
- [x] **DOGFOOD REAL COMPLETADO (2026-07-11)** — primera tarea con motor LLM de
  verdad, veredicto **APROBADO** con los 8 gates en verde: GLM-5.2 vía seam z.ai
  (`EJECUTOR_ENGINE=claude`), tarea `dogfood-glm-2` (módulo TS + test playwright
  sin navegador) sobre scaffold npm real en `trio-repo` (`@playwright/test@1.61.1`
  pineado, gates build/typecheck/lint/tests validados con cero tokens antes de
  quemar modelo). Dos fixes de infra que salieron del intento 1 (rechazado por
  infra, NO por el modelo — anti-sello-de-goma actuando): (a) el CLI de Claude
  Code rehúsa `--dangerously-skip-permissions` como root → `IS_SANDBOX=1` en el
  ejecutor; (b) el `.git` de un worktree es un PUNTERO a `/repo/.git/worktrees/`
  → el Supervisor necesita el mount de `/repo` o sus gates estáticos salen
  `no_ejecutable`. Detalle en `.claude/memory/project/fase6-departamentos.md`.
- [x] **BUG del ledger de gasto CERRADO (2026-07-11, OK de la dueña, DDL en
  prod)** — la `UNIQUE(fecha,vertical,modelo)` de `token_usage` (agregado
  DIARIO del ingest) tragaba en silencio el gasto de la 2ª tarea del mismo
  modelo/día (pasó con `dogfood-glm-2`: 409 + `except: pass` sin log). Fix en
  tres piezas: índice único PARCIAL `where task_id is null`
  (`supabase-fix-token-ledger.sql`, corre después de fase7), ingest a
  delete+insert del día (solo filas de agregado, jamás el ledger del trío), y
  motor con fallos de POST visibles en log. Verificado end-to-end:
  `dogfood-glm-3` (aprobado, 8 gates) registró su fila JUNTO a la de
  `dogfood-glm-1` — mismo día, mismo modelo, dos filas conviviendo.
- [ ] **RESIDUAL (cuando exista runner)** — activar los gates de modelo del
  Supervisor; hoy activarlos sin runner es imposible por diseño (config inválida)
- [ ] **FUTURO (otro PRP)** — RAG por ámbito por cliente y white-label; CLIs del
  trío = corriente Printing Press
- **Salida:** ✅ un departamento de software operado por el trío, validado de punta
  a punta en uso propio (dev, motor mock), listo para replicarse por configuración
  — el dogfood real con tokens es el siguiente paso y es decisión de la dueña.

---

## FASE 7 — Enjambre (swarm) de Ejecutores en el departamento de Software ✅ COMPLETA — dogfood real APROBADO (2026-07-11, GLM-5.2)

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
- [x] **BD aplicada (2026-07-04)** — `supabase-fase7.sql` aplicado en producción vía
  management API con permiso explícito de la dueña (el MCP estaba en read-only).
  Verificado: columnas `token_usage.task_id` y
  `tareas.parent_id/es_padre/fan_out_max/plan/presupuesto_usd/gasto_usd` + índices
  `tareas_parent_idx`/`token_usage_task_idx` presentes; sin alertas de seguridad nuevas
  (RLS sin políticas = solo service_role, por diseño)
- [x] **Runtime (cerrado 2026-07-08)** — el coordinador ganó su entrada en
  `docker-compose.yml` (profile `trio`; el servicio existía pero faltaba en el compose) y
  corre Up/healthy en Hetzner con card y opacidad verificadas por el smoke de runtime.
  Smoke del enjambre end-to-end validado en dev (2026-07-04, `veredicto_final=aprobado`)
- [x] **Planner REAL construido (2026-07-06, PR #28)** — `claude_planner.py` con
  claude-agent-sdk detrás de la interfaz Planner; opt-in `COORDINADOR_PLANNER=claude`;
  gasto atribuido a la fila PADRE; 53 tests verdes. Sigue mock por default
- [x] **DOGFOOD REAL APROBADO (2026-07-11, GLM-5.2 end-to-end)** — Planner real activado
  (`COORDINADOR_PLANNER=claude`, imagen del coordinador con CLI + `IS_SANDBOX=1`) y
  `dogfood-swarm-1` corrido en runtime: GLM planificó 3 sub-tareas (2 paralelas + 1
  dependiente), las 3 aprobadas al primer intento por los gates reales, integración
  limpia (4 archivos) y veredicto FINAL del Supervisor con los 8 gates en verde. Fila
  padre `aprobada` en `tareas` de prod; ledger por-tarea completo (Planner → padre
  $0.27, `slug` $0.76, `moneda` $0.59 a tarifa nominal Anthropic — ~$1.62 del
  presupuesto de $2; el corte de presupuesto operó con datos reales). Gotchas nuevos:
  `node_modules` COMPARTIDO en `/workspace/worktree/` (el worktree de integración nace
  sin deps y nadie le corre npm install; la resolución upward de Node cubre TODOS los
  worktrees y ahorra tokens por sub-tarea) y herencia de `modelo_pref` padre→sub-tareas
  (el Planner no emite límites; sin herencia el enjambre caería al modelo default del
  CLI). Ver CLAUDE.md 2026-07-11 (enjambre) y `fase7-swarm.md`.
- **Salida:** ✅ un enjambre de Ejecutores coordinado y VERIFICADO en producción con
  motor real (GLM-5.2 vía seam z.ai), con las mismas garantías de la Fase 6 (Supervisor
  independiente re-gatea el todo + gate humano en lo irreversible). Residuales menores
  (no bloquean): las filas hijas no llevan `parent_id` (validar_tarea descarta el campo)
  y `gasto_usd` de la fila padre queda 0 (el ledger `token_usage.task_id` es la fuente
  de verdad); el `node_modules` compartido se re-instala a mano si cambia el
  `package.json` del scaffold.

---

## FASE 8 — Grafo: dimensión "regulatorio" (permisos y cumplimiento operativo) ✅ COMPLETA, runtime verificado (2026-07-09)

El grafo (Fase 2/3, hasta ahora solo fiscal/contable/contractual) se abre a la
pregunta genérica "¿puedo hacer X, y qué debo cumplir?" — no solo deducibilidad.
Caso ancla: ¿está permitido el uso de drones para delivery en México?, ¿qué
regulación debe cumplir el seguro de un dron para delivery?

- [x] Nueva dimensión `regulatorio` (código elegido para ser amplia: sirve a
  cualquier actividad con permiso/cumplimiento operativo, no solo aeronáutica)
  con vocabulario de veredicto propio `permitido`/`no_permitido` — convive con
  `deducible`/`no_deducible` sin cruzarse porque las categorías no cruzan de
  dimensión (invariante ya existente desde Fase 3). Tocado en 4 lugares que
  tenían el vocabulario fiscal hardcodeado: `schemas.py` (Estado), `evaluador.py`
  (ESTADOS), `seed/gen_seed_sql.py` (VEREDICTOS), `seed/01-schema.sql` (CHECK de
  `impactos.veredicto_base`).
- [x] Primera categoría: `DRONES_DELIVERY`, 2 reglas MX citando **fuente
  primaria verificada** (no blogs, no la NOM de 2019 a ciegas): Ley de Aviación
  Civil Art. 30 (registro RPAS ante AFAC si no hay "servicio público") y Art. 74
  (seguro de responsabilidad civil obligatorio, aprobación previa de AFAC).
  Hallazgo que justificó ir a la fuente primaria: NOM-107-SCT3-2019 (2019) cita
  el requisito de seguro como "artículo 72"; la Ley vigente (reforma consolidada
  DOF 14-11-2025) lo tiene en el **Art. 74** tras renumeraciones posteriores —
  citando la NOM a ciegas se habría propagado el número equivocado. También
  incorporado NOM-107 num. 4.10.3 (prohibición de dejar caer/arrojar objetos que
  dañen personas o propiedad) como requisito directamente relevante al mecanismo
  de entrega.
- [x] 3 tests nuevos (`test_multiambito.py`): veredicto `permitido` con fuente
  correcta, cita exacta del Art. 74 (no el 72 de la NOM), y no-cruce con fiscal
  en ambas direcciones. 54/54 tests verdes (51 previos + 3 nuevos, cero
  regresión en fiscal/contable/contractual).
- [x] **Runtime (2026-07-09)** — migración aditiva pura en producción: `ALTER
  TABLE impactos` amplía el CHECK de `veredicto_base` (sin tocar las 24 reglas
  existentes), seed regenerado aplicado vía el propio patrón idempotente
  (`on conflict ... do update`, sin necesidad de recrear el volumen), imagen de
  `grafo` reconstruida y redesplegada. Verificado en vivo por DOS canales:
  `POST /evaluaciones` directo (respuesta persistida con `id`, veredicto
  `permitido`, 2 fuentes citadas) y **A2A real** vía `grafo-a2a`
  (`message/send` → `TASK_STATE_COMPLETED`, mismo resultado) — cumple el
  requisito de que tanto humano como agente puedan consultarlo.
- [x] **"Biblioteca" resuelta sin caché de LLM**: la respuesta repetible no es
  un caché de texto generado, es la regla ya en el seed — determinista, con
  fuente, instantánea. Cada `evaluación` además queda persistida en la tabla
  `evaluaciones` (ya existía desde Fase 2).
- [ ] **Convención acordada (no construida aún)**: Obsidian (bóveda de
  `personal`) como bitácora de INVESTIGACIÓN/borrador antes de que una regla
  entre al seed — NO como fuente que el grafo consulte en vivo (rompería el
  gate de procedencia). Sin construir todavía; aplica cuando se investigue el
  siguiente país/ámbito.
- [ ] **Futuro**: más países/ámbitos regulatorios sobre la misma dimensión
  (el código `regulatorio` ya es genérico a propósito, no específico a drones).
- [x] **Habilitador de investigación→seed (2026-07-24)**: `grafo/PLANTILLA-INVESTIGACION-SEED.md`
  — plantilla que aterriza una investigación regulatoria (primer dominio objetivo:
  documentación electrónica de exportación logística — e-AWB/BL/carta porte, vertical
  freight-forwarder/GAL) a la **Salida B sembrable** del grafo real: esquema de
  `impactos[]`, vocab de 3 valores (`permitido`/`no_permitido`/`dudoso` con fail-safe),
  categorías por keywords+exclusiones, checklist del gate de procedencia y frontera dura
  Salida A (investigación/producto, incl. nodos que el grafo NO modela) vs Salida B (seed).
  Corrige un borrador que inventaba un esquema (`nodo_id`/`actor`/12 veredictos) que el
  grafo no tiene → habría producido output no-sembrable. Incluye ejemplo e-AWB validado
  contra `gen_seed_sql.py --check`. Aún NO hay reglas de exportación sembradas: es el
  método, no el seed.
- **Salida:** ✅ el grafo responde preguntas de permiso/cumplimiento operativo
  (no solo fiscales) con la misma regla de oro (fail-safe, fuente citada,
  disclaimer siempre), verificado por humano (REST) y por agente (A2A) en
  producción.

---

## FASE 9 — Departamento de Adquisición de Clientes agéntico ✅ núcleo VIVO en runtime (2026-07-10); motor real/envíos = gates de la dueña

El ciclo comercial del white-label: cómo se consiguen los clientes a los que
Desarrollo de Software (Fase 6/7) les entrega. Diseño completo en
`departamentos/adquisicion-clientes.md`. Decisiones de la dueña: vende el
white-label; negociación con humanos hoy PERO card A2A pública de ventas desde
el día 1; primer tramo con MockEngine (cero tokens), envíos/motor real gated.

- [x] **Segundo departamento del trío** (el patrón "se configura, no se
  programa" demostrado): `DEPARTAMENTOS += "adquisicion"` en el contrato;
  `validar_resultado` gana campo `departamento`; el Ejecutor lo propaga (1
  línea); el Supervisor es ahora **multi-departamento** (`cargar_configs`
  carga todos los `reglas/*.toml` y rutea por el `departamento` del RESULTADO;
  TOML inválido = no arranca, invariante intacta).
- [x] **Gates comerciales binarios** (`reglas/adquisicion.toml` +
  `chequeos_adquisicion.py`) — el reto "en software es npm build, ¿aquí qué?"
  resuelto con la referencia de verdad VERSIONADA en el repo objetivo bajo
  `adquisicion/` (claims aprobados, política de precios, plantilla de
  contrato) que el motor NO puede tocar: `claims_aprobados`, `precio_en_rango`,
  `plantilla_contrato_intacta`, `salientes_con_aprobacion` (sha256 =
  integridad; autenticidad en la frontera de envío, fase posterior),
  `politica_intocable` + `sin_secretos`. Gates de modelo (`tono_de_marca`,
  `revision_comercial`) declarados inactivos.
- [x] **`ventas-a2a` (puerto 4400)**: la puerta comercial pública — puente
  determinista sin LLM (patrón grafo-a2a) que registra interés (tabla `leads`,
  escritor único origen `a2a`, fallo VISIBLE: lead no guardado = task failed
  reintentable) y comparte la oferta APROBADA (estática, versionada). Card con
  fronteras negativas literales: no cierra tratos, no fija precios finales,
  no firma, no envía correos.
- [x] `supabase-fase9.sql` (tabla `leads`, 10 etapas del pipeline, RLS sin
  políticas) + servicio en el compose (profile `a2a`, 127.0.0.1:4400) + smoke
  de runtime extendido (tier 4). 217+ tests verdes en los 6 servicios, cero
  tokens.
- [x] **Runtime (cerrado 2026-07-10)** — `supabase-fase9.sql` aplicado en producción
  (management API, patrón de siempre; `leads` con RLS verificada por MCP, sin alertas
  nuevas); rsync + rebuild de supervisor/ejecutor + `--profile a2a up -d ventas-a2a`
  en Hetzner (healthy); smoke completo tiers 1–4 en hermes-net TODO en verde
  (lead real `persistido=true`, fila verificada en `leads` de prod); `ss -tlnp`
  confirma 4000–4400 SOLO en 127.0.0.1. Gotcha corregido: el Dockerfile del
  supervisor no copiaba `chequeos_adquisicion.py` → crash-loop
  (ModuleNotFoundError); los tests de dev no lo cazan porque corren desde el
  directorio fuente — un módulo python nuevo exige su COPY en el Dockerfile.
- [x] **Card en internet — edge público (gate abierto 2026-07-10, verificado
  2026-07-11)**: servicio `edge` (Caddy compilado con xcaddy +
  mholt/caddy-ratelimit; la imagen oficial no trae rate limiting) — la ÚNICA
  pieza del stack que publica un puerto en 0.0.0.0 (443; el Cloud Firewall de
  Hetzner quedó en exactamente tcp/22 + tcp/443). TLS automático (Let's
  Encrypt, certs persistidos en volumen `caddy-data`), rate limit 30 req/min
  por IP (verificado: 30×200 → 429), body máx 64KB, y solo proxyea
  `ventas-a2a:4400`. Dominio temporal `167-233-233-56.sslip.io` ("probar
  primero"); `VENTAS_PUBLIC_URL` en el `.env` del server para que la card no
  mienta. Smoke end-to-end por la URL pública: lead → `TASK_STATE_COMPLETED`,
  `persistido=true`, fila real en `leads` de prod. Con dominio real: cambiar
  `edge/Caddyfile` + `VENTAS_PUBLIC_URL` y recrear.
- [x] **Paquete de competencias EG.CRM (2026-07-24)**: 7 skills del pipeline
  comercial (método diio) versionadas en `negocio/skills/adquisicion-*/` —
  pre-descubrimiento, entrevista dinámica, transcripción (puente STT por
  construir), diagnóstico de factibilidad, coaching del asesor, análisis
  profundo y paquete comercial. Mapa hito→skill en
  `departamentos/adquisicion-clientes.md` §7.1; documento madre del pipeline
  (7 hitos + captación multicanal + KPIs por canal, v1.0 borrador) en
  `crm/egcrm-pipeline-propuesta.md`. Versionadas ≠ desplegadas: NO
  van al volumen de Hermes-Negocio hasta el gate del motor real (evitar que el
  bot prometa capacidades que no existen).
- [x] **Skill off-pipeline `adquisicion-persona-sintetica` (2026-07-24)** —
  8ª skill del paquete, NO es un hito del funnel: genera buyer personas
  **ficticias** de alta fidelidad para probar/calibrar el CRM (ICP, scoring,
  entrevista, retro en vivo) y role-play de coaching. Inverso del
  pre-descubrimiento (aquí SÍ se inventa, marcado como sintético) con
  **frontera dura de datos: NO escribe en `leads`** (un escritor por origen);
  reutiliza las 4 cubetas de dolor del pipeline. Incluye el ejemplo trabajado
  `ejemplos/freight-forwarder-gal.md`. En la misma tanda, la Ficha de
  Inteligencia del pre-descubrimiento se enriqueció (4 cubetas de dolor +
  comité comprador + readiness/urgencia), sin tocar la regla de cero-invención.
  Mapa actualizado en `adquisicion-clientes.md` §7.1. Mismo gate: versionadas,
  NO desplegadas al volumen hasta el motor real.
- [x] **Herramientas EG.CRM construidas (2026-07-24)** — listas para que los
  gates de abajo tengan qué aprobar: (a) **`transcripcion-a2a`** (puerto 4800,
  perfil `a2a`): puente STT determinista {card, rpc, /health} patrón
  grafo-a2a/ventas-a2a, motor pluggable (mock por default; `STT_ENGINE`
  desconocido = no arranca), audio por volumen `adquisicion-audio` (ro),
  persistencia con escritor único en `transcripciones` (fallo visible,
  reintentable), 21 tests + interop con el cliente real del SDK, imagen
  construida y arrancada en dev (gate 2026-07-23). (b) **host-job
  `enviar-salientes.py`**: frontera de envío con doble verificación —
  integridad sha256 (réplica del gate del Supervisor) + AUTENTICIDAD contra
  `aprobaciones_salientes` (fila que el motor no puede fabricar: sin
  credenciales); dry-run por defecto, `ENVIAR_REAL=1` + SMTP para el envío
  real; todo skip/fallo se imprime (nada best-effort silencioso).
  (c) `supabase-egcrm-herramientas.sql` (transcripciones +
  aprobaciones_salientes, RLS sin políticas) validado idempotente en Postgres
  efímero — NO aplicado a producción aún (se aplica al desplegar, management
  API como siempre). (d) **Pitch decks (2026-07-24)**:
  `adquisicion/plantillas/pitch-deck-*.html` (System UI de la fábrica, marca
  del cliente parametrizada, claims aprobados textuales fijados por test
  parametrizado) + `personalizar-deck.py --plantilla` (JSON del cliente →
  deck; marcador vivo = no se emite) — el material del Hito 6 se genera por
  configuración, no a mano. Variantes: `pitch-deck-whitelabel.html` (oferta
  general) y `pitch-deck-insurtech.html` (vertical seguros, B2A + A2C, con
  barrera regulatoria: cero actos con licencia en automático).
- [ ] **Gates de la dueña** (nada corre solo): motor LLM real para tareas
  `adquisicion`; **aprobar/activar `enviar-salientes.py`** (SMTP + dominio +
  remitente + `ENVIAR_REAL=1`); **elegir el motor STT real** de
  `transcripcion-a2a` (candidato: faster-whisper) y desplegarlo; negociación
  A2A externa autónoma (política de límites + auth en la card + revisión
  legal); dominio real para el edge (hoy sslip.io temporal);
  `#dep-adquisicion` en Slack.
- **Salida esperada:** un lead entra por A2A o manual, el pipeline vive en
  `leads`, el Ejecutor redacta bajo gates comerciales deterministas, y TODO lo
  de cara al cliente (correo, propuesta, contrato, firma) pasa por humano según
  la matriz de `equipo-y-slack.md`.

---

## FASE 10 — La COLA del trío (bandeja de entrada de #dep-desarrollo) ✅ VIVA en runtime (2026-07-13)

PRP: `.claude/PRPs/prp-cola-tareas-trio.md`. Estado detallado en
`.claude/memory/project/fase10-cola.md`.

Nace de una pregunta de la dueña: *"¿y si varios del equipo piden features a la vez?"*.
Antes, cada petición **bloqueaba al bot 15+ minutos** esperando el veredicto, y dos
peticiones simultáneas lanzaban **dos motores + dos `npm build` + dos Playwright** en un
servidor de 8 GB, sin que nadie acotara nada.

Ahora el Ejecutor **acepta y encola** (responde `{encolada, posicion, cola}` en ~1 s) y un
**worker único, serial** drena la cola: FIFO con prioridad, **solo Elisa reordena** (la
autoridad es la credencial: no hay endpoint de reordenamiento, porque cualquiera del canal
se colaría en la fila). La cola es **durable en Supabase** (sobrevive a `docker restart`),
tiene **tope de gasto en tokens** antes de cada tarea, y el desenlace lo **avisa un host-job**
en `#dep-desarrollo` con el listado y el orden — porque la respuesta A2A ya no trae veredicto.

| Pieza | Qué |
|---|---|
| `ejecutor-a2a/cola.py` | La cola (pluggable: Supabase \| memoria). Encolado **autoritativo**: jamás se dice "encolada" sin fila. |
| `ejecutor-a2a/worker.py` | Único y serial (`asyncio.Lock`), claim por **CAS**, recupera huérfanas, `git fetch` de master antes de cada tarea. |
| `ejecutor-a2a/pipeline.py` | El trabajo (worktree→motor→Supervisor), ya **desacoplado de la conexión HTTP**. |
| `aviso-cola.py` / `cola-trio.py` | Host-jobs: avisar al equipo (cron 2 min) y ver/priorizar/cancelar (solo Elisa). |

**El enjambre YA habla con la cola** (2026-07-13, PR #45 — smoke real verificado): el
Coordinador **encola** sus sub-tareas y **espera turno** como todo el mundo. Consecuencia que
hay que decir en voz alta: **el enjambre ya no corre en paralelo** — las sub-tareas de una ola
se encolan juntas pero el worker las ejecuta de una en una (concurrencia 1: 8 GB de RAM).
`fan_out_max` ya no compra velocidad, compra **orden**. El enjambre sigue valiendo por lo que
de verdad aporta: descomponer en DAG, respetar dependencias, integrar y **re-gatear el todo**.

Detalle que costó sangre: el diff de cada sub-tarea se **relee de git**, nunca de la fila —
`estado.py` lo recorta a 20 k para el jsonb y la integración hace `git apply`: un parche
truncado corrompería el trabajo en silencio.

**El `git fetch` de master lo hace un cron del HOST** (cada 5 min), no el contenedor: ahí
dentro no hay llave de GitHub, y no debe haberla (corre el modelo con permisos amplios). Antes
el fetch fallaba en silencio y el trío construía sobre un master de 11 commits atrás (PR #46).

---

> **Fase 11** (frontends web: cliente-web2 + chat en vivo + control-interno) no tiene
> sección propia: su estado vive en la corriente "Canales de comunicación" y en
> `.claude/memory/project/frontend-web2.md`.

## FASE 12 — Departamento de Contratos Inteligentes: fábrica de Smart Contracts (Fabric) 🟡 Fases 1-4 integradas y verificadas (2026-07-20); Fases 5-6 pendientes

PRP: `.claude/PRPs/prp-fase12-fabrica-sc.md` (PRP-013). Departamento:
`businessos/departamentos/contratos-inteligentes.md`. Gobernanza transversal adoptada
con la fundación: `businessos/gobernanza/` (modelo de amenazas, web agéntica, ISO 42001,
ciclo de vida CDC).

La fábrica convierte requerimientos conversacionales (vertical clientes) en una
`sc_spec` YAML validada en frío (`businessos/fabrica-sc/contrato_sc.py` — 23 tests
verdes), que el `FabricChaincodeEngine` materializa **parametrizando plantillas
auditadas** (jamás código libre; v1: `plantillas/escrow-v1/`, chaincode Go determinista
con tests generados desde la spec), el Supervisor re-gatea de cero con un perfil
"fabric" (build+gosec+deps+tests+**red efímera**) y el despliegue es un host-job que
solo opera filas `aprobada` — doble candado humano: cola de Hermes OS + lifecycle de
Fabric a dos organizaciones (Operadora + **Testigo**, llaves separadas por ceremonia —
`businessos/red-tier1-iac/` + `CEREMONIA.md`).

| Hito | Estado |
|---|---|
| Contrato de la spec (`validar_sc_spec`) + suite | ✅ integrado, 23 tests verdes |
| Plantilla escrow-v1 (Go + tests + README-auditoria) | 🟡 código hecho; **firma de auditoría de la dueña PENDIENTE** (bloquea fabricación real) |
| Kit IaC red tier 1 + ceremonia de llaves | ✅ escrito; NO probado contra Docker real |
| `FabricChaincodeEngine` en el Ejecutor (`RouterEngine`: contratos_inteligentes NUNCA al LLM) | ✅ Fase 3 — verificado con Go real: build+vet+mod-verify+test(7/7)+gosec(0 issues) sobre un paquete recién fabricado |
| Perfil de gates "fabric" en el Supervisor (4 estáticos + build/vet/gosec/deps/tests) | ✅ Fase 4 (lado Supervisor); **red efímera** queda para el host-job de la Fase 5 (sin socket Docker en el juez, por diseño) |
| Alta en `trio-contrato/contrato.py::DEPARTAMENTOS` + skill | ✅ activado al cerrar Fase 4 |
| Aprobación humana + `desplegar-chaincode.py` + `contratos_sc` en Supabase | ⬜ Fase 5 del PRP-013 |
| Validación end-to-end real (Telegram → contrato vivo en canal demo) | ⬜ Fase 6 del PRP-013 |

Decisiones fundacionales (DECISIONES.md 2026-07-19): sandbox fabric en **nodo Hetzner
aparte**; chaincode **Go**; primera plantilla **escrow**; numeración reconciliada
(el material llegó de una sesión externa como "Fase 8/9, PRP-008/009").

## FASE 13 — PM A2A · Oráculo de ejecución del SC 🔵 APROBADA (2026-07-19), pendiente de Fase 12

PRP: `.claude/PRPs/prp-fase13-pm-oraculo.md` (PRP-014). La fábrica produce; el **PM/
oráculo opera**: servicio hermano `pm-a2a` que escucha eventos del chaincode (checkpoint
de bloque), lleva la agenda determinista de hitos/plazos, inmutabiliza evidencia (hash
on-chain, archivo en Storage) y ante incumplimiento ejecuta un **catálogo cerrado** de
acciones — con techo duro por certificado: `rol=oraculo` SOLO puede `registrar_evidencia`
y `declarar_vencido`; el dinero lo deciden las partes, el árbitro o la regla por defecto
compilada y auditada (`reembolsar_comprador`). Cierre con acta auditable. Decisiones 1-3
del PRP resueltas por la dueña (2026-07-19).

---

## Departamento de Procesos (alta 2026-07-23) ✅ OPERATIVO — primera corrida real APROBADA (2026-07-23, proceso propio)

Cuarto departamento del trío ("se configura, no se programa", patrón Fase 9).
SPEC: `departamentos/procesos.md`. No entrega software ni ventas: **diagnostica
procesos que YA operan** con 5S (capa de información) + ESOA (Eliminar →
Simplificar → Optimizar → Automatizar, capa de flujo), cuantifica la **línea
base**, costea en **MXN y USD** (aritmética determinista, cero tokens —
`genera_presupuesto.py`) y emite una **build-spec** que, tras aprobación
humana, dispara SDD/Skills/CLIs en el departamento destino (Software, por la
cola de Fase 10). Se activa por **descubrimiento** (criterio del orquestador):
solo cuando hay un proceso vivo que rediseñar; greenfield va directo a Software.

- [x] `DEPARTAMENTOS += "procesos"` en `trio-contrato/contrato.py` (+2 tests)
- [x] Gates deterministas: `supervisor-a2a/reglas/procesos.toml` (formato real
  `[[gate]]`) + `chequeos_procesos.py` — 12 activos sobre la estructura del
  paquete to-be (línea base cuantificada, ESOA completo, 5S, control humano por
  automatización —"cero humanos" prohibido—, consejo+reto, dos monedas con TC,
  build-spec con candado `requiere_aprobacion_humana`, herramientas en stack,
  sin marcadores de marca blanca, fuentes citadas, sin secretos) + 2 de modelo
  declarados INACTIVOS. El módulo se registra en `gates.CHEQUEOS` vía adaptador
  (patrón chequeos_adquisicion/fabric); `sin_secretos` reusa el chequeo base.
- [x] COPY en el Dockerfile del supervisor EN EL MISMO CAMBIO (gotcha
  2026-07-10) + `pyyaml`/`openpyxl` pineados en requirements.
- [x] Skill de ejecución `negocio/skills/procesos/` (absorbe `diagnostico-a2a`):
  SKILL.md + 6 references (metodología, descubrimiento, línea base/consejo,
  costeo/pricing, plantillas, disparadores SDD/Skills/CLI) + script del
  presupuesto + `ejemplos/worktree-ejemplo/` que pasa los 12 gates.
- [x] Verificado en dev, cero tokens: ejemplo APROBADO por el CLI y por el
  MOTOR real del Supervisor (`cargar_configs` + `correr_gates` sobre el TOML
  real); suites en verde: supervisor 107 (31 nuevos), contrato 45, ejecutor 63,
  coordinador 58, presupuesto 9.
- [x] **Runtime (2026-07-23)**: `git pull` a efa1e2d + rebuild `supervisor-a2a`
  en Hetzner (healthy, import de `chequeos_procesos` + `procesos.toml` en la
  imagen verificados; el arranque limpio valida los gates activos) + skill
  copiado al volumen de negocio (`/opt/data/skills/procesos`, uid 10000, era
  copia nueva — no había nada que diffear) + restart de `hermes-negocio`
  (`TERMINAL_ENV=local` verificado tras el restart, gotcha 2026-07-11).
- [x] **Primera corrida real (2026-07-23, ordenada por la dueña)**:
  `procesos-2026-0001` — diagnóstico del proceso propio "sincronización
  repo→runtime" (el deploy manual que ese mismo día mordió 3 veces). Encolada
  por A2A (cola Fase 10), motor GLM-5.2, **APROBADA al 1er intento: 12/12
  gates verdes**; paquete to-be completo en el worktree (diagnostico.yaml,
  reporte.md honesto — el ROI laboral NO justifica solo, el argumento es
  fiabilidad del último kilómetro—, presupuesto MXN/USD, build-spec de 5
  automatizaciones con gate humano). Gasto: 122k in / 38k out, $3.03 nominal
  (tarifa Anthropic; real z.ai ~1/6) de tope $5. Prerrequisito descubierto:
  rebuild del EJECUTOR (imagen pre-#128 sin `procesos` en el contrato) que
  destapó 2 minas de Fase 12 (PRs #130/#131/#132 — ver aprendizaje 2026-07-23
  en CLAUDE.md). **La build-spec NO se dispara sola**: encolar sus 5 ítems a
  Software espera la aprobación de Elisa.
- [ ] **Gate de la dueña restante**: runner de modelo para
  `revision_metodologica`/`tono_de_marca` (siguen INACTIVOS por diseño).
- **Sin servicio A2A nuevo ni puerto público**: Procesos es interno, corre por
  el trío existente.

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
  servidor (necesita Go 1.26.4+ y Claude Code)

Detector + aviso (Nivel 2-prep, decidido 2026-06-30; **realmente agendado el
2026-07-12**): `cli-audit.py` corre en el **servidor** dentro de `nightly-jobs.sh`
(03:10, tras la ingesta de tokens) y deja `/opt/data/workspace/cli-audit.json`;
el digest 08:00 de negocio reporta las brechas con el comando exacto. La impresión
y la mejora de un CLI siguen siendo acción humana en Claude Code
(`/printing-press`, `/printing-press-amend`, `/code-review`): el cron solo detecta
y avisa, nunca imprime (Nivel 3 descartado).

> ⚠️ **Cómo sabe el auditor qué está impreso, sin la librería.** La librería de
> binarios (`~/printing-press/library/`) solo existe **en la máquina donde se
> imprime** (Claude Code + Go) — el servidor no la tiene y no debe tenerla. Por eso
> el auditor lee un **índice versionado en el repo**: `cli-library-index.json`
> (slug → grade). **Tras imprimir o mejorar cualquier CLI hay que regenerarlo y
> commitearlo**: `python3 cli-audit.py --emit-index` (en la máquina con librería).
> Si no, ese CLI aparecerá como "faltante" en el digest. El snapshot declara su
> fuente (`fuente_impresos: libreria | indice | ninguna`) para que nunca aparente
> saber lo que no sabe. *(Hasta el 2026-07-12 el auditor corría a mano en la máquina
> de dev y empujaba por ssh; el ROADMAP decía "cron 2:30 en el servidor" y era falso.)*

Qué CLI por fase:
- Fase 0-1: ~~DigitalOcean~~ superseded → **hcloud** (Hetzner, impreso 2026-07-04,
  Grade A 95/100), Telegram ✅ (catálogo; impresos 2026-06-30, Grade A)
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

## Corriente transversal — Memoria del agente (decidido 2026-07-11)

Criterio: rentabilidad. **Piloto Holographic ACTIVO en negocio** (provider bundled
local, SQLite en el volumen → cubierto por el respaldo nocturno; 100% bajo demanda
via `fact_store` → caché de prefijo intacta, 95% medido post-activación). Evaluar
~2 semanas (≈2026-07-25): si no reduce re-explicaciones/tokens en uso real, se
apaga (rollback de una línea); si aporta, extender a personal/clientes.

**Engram DIFERIDO como tier premium** ("memoria auditable/portable/exportable por
cliente") con trigger explícito: primer cliente white-label que lo pida o >2
verticales de clientes activas. Motivo: su plugin bundled tiene bug upstream
cerrado "not planned" (gateway colgado 30 min en silencio) → fork permanente en
ruta crítica + infra sin línea de ingreso hoy; como feature con demanda, se paga
solo. **Obsidian intocable**: humana, un escritor (Elisa), sin sync bidireccional.
Detalle en `.claude/memory/project/memoria-agente.md`.

---

## Corriente transversal — Canales de comunicación

No es una fase; atraviesa todas. Tres superficies con papeles distintos:

- **Telegram** (desde Fase 0, vivo): móvil y rápido. Avisos, notas de voz, sí/no
  al vuelo. La vida personal del dueño (Kiris) se queda aquí SIEMPRE.
  - **Grupo del equipo `A2ATeamGroup` (2026-07-12)** — *corrige el "Telegram es solo
    personal" del diseño original*: el equipo también vive aquí para reportes, agendas
    y datos informativos. Miembros: Elisa, Luis Trujillo, Víctor Huerta, Oswaldo
    Valderrama + `@a2aTeamBot`. Ahí caen el **digest diario 08:00** y el **cierre
    semanal (lunes 08:00)**. Config, `chat_id` y gotchas (⚠️ el modo privacidad de
    Telegram debe estar **APAGADO** o el bot no recibe las @menciones):
    `negocio/telegram-config-fragment.yaml`. Acceso = **membresía del grupo**
    (`group_allowed_chats`); los DMs siguen siendo solo de la dueña.
- **Slack** (interno, se SUMA a Telegram — **piloto VIVO desde 2026-07-08**): centro de trabajo
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
  - ✅ **Piloto ACTIVO (2026-07-08)**: la dueña creó la app con el manifiesto
    (`negocio/slack-app-manifest.yaml`, colapsa scopes/eventos/Socket Mode en un
    paso), tokens al `.env` del volumen, y `slack-piloto.sh` cableó y reinició:
    `@hermes_negocio` autenticado en el workspace A2AMassivo, Socket Mode
    conectado, gateway con 2 plataformas (Telegram intacto), mensaje de
    presentación entregado en `#dep-negocio`. Gotcha: el script se re-ejecuta
    con `sudo env HOME=…` (volumen 0700 uid-10000)
  - **Siguiente**: sumar a las 4 personas a `SLACK_ALLOWED_USERS` + expandir
    canales (`#dep-clientes`, `#dep-desarrollo`, `#dev-*`) por configuración
- **Web propia** (producto, futuro): el canal de clientes, con marca propia y
  aislamiento de datos. Slack Connect solo si un cliente ya vive en Slack y lo
  prefiere.
  - **Frontends web (código, desde 2026-07-13)** — `businessos/frontends/` reúne las
    **tres superficies** (ver su README): **control-interno** (cabina del equipo,
    NO de cara al cliente; Next 16 + Supabase + Tauri, vendored) ✅ integrado;
    **cliente-web2** (producto marca-blanca) ✅ desplegada en Vercel con **chat en vivo**
    (ver bullet abajo); **cliente-a2a-web3** (A2A card / web3) 🎨 solo demo de diseño. Los
    tres consumen el mismo contrato de daemon (`/chat/stream` SSE + `/api/openclaw/action`)
    → punto de integración con Hermes/A2A.
  - **control-interno CABLEADO en runtime (2026-07-15, PR #51)**: desplegado en Hetzner
    como contenedor **`frontend-ci`** (`127.0.0.1:3001`), ahora **servicio del compose**
    (project `businessos`) y en **`hermes-net`** (resuelve por DNS los servicios del
    agente). **Supabase real cableado**: creds del proyecto **A2ABot** + las **31 tablas**
    del frontend aplicadas ahí (reconciliando `profiles`/`handle_new_user` sin romper el
    signup del negocio — ver aprendizaje CLAUDE.md 2026-07-15). Sigue en `next dev` (no
    build de prod). **Pendiente**: (1) el **daemon** de control-interno que sirva
    `/api/openclaw/action` (el board operado por el agente) — el `/chat/stream` SSE ya tiene
    implementación de referencia en `chat-web2` (ver bullet cliente-web2), pero control-interno
    necesita además la parte de acciones; (2) crear el usuario de Elisa; (3) opcional build de
    prod + exponer por `edge`. Estado en la memoria `project/frontends-control-interno.md`.
  - **cliente-web2 CHAT EN VIVO ENCENDIDO (2026-07-19, PR #76)**: el hueco funcional de la
    Fase 11 quedó cerrado. Daemon **`chat-web2`** (servicio del compose, `127.0.0.1:4500`,
    `hermes-net`) implementa `POST /chat/stream` (SSE) autenticado con Bearer
    `OPENCLAW_GATEWAY_TOKEN` (falla cerrado). Es un **vendedor LLM** acotado por prompt
    (OpenRouter, NO expone el agente Hermes privado) que además **captura leads** origen
    `web2`. Publicado por el **edge Caddy** (bloque `@chat /chat/stream` con `flush_interval -1`;
    nada más del daemon es público) y cableado a Vercel (`CLAUDECLAW_URL` + token). Verificado
    end-to-end: `cliente-web2.vercel.app` streamea respuestas reales y persiste leads. Detalle
    en `frontends/DEPLOY-web2.md` §3 y la memoria `project/frontend-web2.md`.

---

## Corriente transversal — Análisis y planeación (hilo `decision_id`, decidido 2026-07-17)

Veredicto del Consejo sobre cómo unificar las 5 piezas de análisis/planeación (consejo,
prp, claude_planner, grafo, new-app) y cuánto adoptar de Spartane.ai: **opción C ampliada
con instrumentación** — no se funden las piezas; se cablea solo la costura Consejo→PRP con
un `decision_id` que viaja decisión→PRP→tarea padre→gasto (`token_usage.task_id`). Plan
completo en `businessos/departamentos/analisis-planeacion.md`; veredictos en
`.claude/memory/decisiones/`; log append-only `businessos/trazas-decisiones.jsonl`.

- [x] **Etapa 1 — costura** (2026-07-17): `prp-base.md` con sección opcional "Decisión del
  Consejo"; Paso 6 del skill `consejo` escribe el registro estructurado + evento JSONL.
  Cero SQL, cero tokens de runtime.
- [ ] **Etapa 2 — hilo al enjambre**: `decision_id` en el `contexto` jsonb de la tarea
  padre, cuando llegue la primera feature post-Consejo (cero cambio de esquema).
- [ ] **Etapa 3 — vitrina (GATED por evidencia, NO por calendario)**: tabla `decisiones` +
  vista "Estrategia" en Mission Control SOLO cuando (a) ≥3 hilos completos en el JSONL y
  (b) un prospecto white-label pida ver gobernanza.
- De Spartane se adopta ÚNICAMENTE el mapa de 7 fases como **checklist de descubrimiento**
  white-label (las 7 ya viven en Hermes-os-a2a como runtime, §2.3 del plan); NO sus
  generadores de documentos ni sus 20 roles, NO el Consejo automático por PRP.

---

## Línea CRM conversacional (marca blanca) — CRM-0/1/2/3 ✅ VIVOS (2026-07-21)

La línea D del maestro ERP arrancó por decisión de la dueña (goal 2026-07-21):
`crm-canales` en runtime (Hetzner, :4600 + edge `/crm/*`) con webhooks de
**Telegram y WhatsApp Cloud API**, marca blanca por configuración
(`crm_tenants`: marca/tono/casos), techo estructural del plan D-40 en código y
bitácora completa en `crm_*` (RLS cerrado). Smoke E2E verificado en producción
por la URL pública; 29 tests. **CRM-1**: `sup-crm` (interno :4700) opera el
nivel A1 del plan D-40 — valida CADA saliente generado (gates deterministas +
juez LLM adversarial, fail-closed en ambos lados) con auditoría en
`crm_supervision`. Conectar un tenant real = alta de credenciales de canal
(BotFather / Meta Business), pasos de la dueña. Detalle y runbook de alta
en `.claude/memory/project/crm0-canales.md`; fases siguientes (muestreo A2,
panel, niveles medidos) en `crm/propuesta-crm-marca-blanca.md`.

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
