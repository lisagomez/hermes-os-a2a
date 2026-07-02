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
- **Conexión entre agentes (futuro):** protocolo A2A

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
- [ ] **RESIDUAL (cuenta)** — crear organización en Polar + Organization Access Token +
  producto pay-what-you-want; llenar `POLAR_ACCESS_TOKEN`/`POLAR_PRODUCT_ID` en `.env`
  y probar un cobro real (primero en sandbox)

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

## FASE 4 — Dashboard Mission Control

- A2ABot conectado a las tres verticales por API + Supabase
- Vistas: Pantheon (los 3 agentes + skills), AI Spend, evaluaciones del grafo
- **Salida:** panel único de control del sistema.

## FASE 5 (FUTURA) — Interoperabilidad A2A

El momento correcto para el protocolo Agent2Agent (a2aproject/A2A, Linux
Foundation). NO antes: A2A resuelve comunicación entre agentes pares/externos,
algo que el sistema no necesita hasta tener el grafo funcionando y querer
abrirlo al exterior.

**Caso de uso ancla: el grafo como agente A2A independiente.**
- Exponer el grafo regulatorio con su "Agent Card" que anuncia su capacidad
  ("evalúo impacto fiscal/contable/regulatorio en LATAM")
- Cualquier agente —tuyo, de un cliente, de un socio— lo consulta sin conocer
  su interior (preserva la opacidad: no expone reglas ni datos internos)
- Se monta como servicio más en hermes-net usando el SDK de Python o JS
- Complementa MCP, no lo reemplaza: MCP conecta con herramientas; A2A conecta
  con otros agentes
- **Salida:** el cerebro regulatorio convertido en servicio reutilizable por un
  ecosistema de agentes.

Otros casos A2A que habilita esta fase:
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

## FASE 6 (FUTURA) — Departamentos operados por el trío Hermes→Ejecutor→Supervisor

La evolución natural de A2A: en vez de "un agente por departamento", **dos agentes
con roles fijos** —un Ejecutor y un Supervisor— atienden muchos departamentos, con
Hermes-Negocio como **orquestador** (reparte, no ejecuta). Los departamentos no son
agentes: son **paquetes de competencias** (tareas + reglas de validación + fuentes de
conocimiento) que el par carga según la tarea. Depende de A2A (Fase 5): el Ejecutor y el
Supervisor se hablan como pares formales, y el Supervisor debe ser independiente para que
la vigilancia signifique algo. Detalle en `departamentos/` (SPEC-trio, el paquete del
primer departamento, y el modelo white-label).

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
- **Orden:** especificar y validar UN departamento en uso propio antes de white-label
  (acotar antes de escalar). El Supervisor es tan bueno como sus reglas: auditables, no
  improvisadas.
- **Salida:** un departamento de software operado por el trío, validado de punta a punta en
  uso propio, listo para replicarse por configuración a nuevos clientes.

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
