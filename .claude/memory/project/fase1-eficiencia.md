# Fase 1 — Eficiencia de tokens (estado al 2026-06-30)

Activar el ahorro sin sacrificar calidad donde importa. Plan completo en
`.claude/PRPs/prp-eficiencia-de-tokens.md`. Gotchas operativos en
[[hermes-vertical-setup]].

## Hecho (2026-06-30)
- ✅ **Routing por modelo en las 3 verticales** (personal, negocio, clientes), idéntico:
  - 10 profiles de apoyo ligeros → `openai/gpt-oss-120b:floor` (`:floor` = OpenRouter rutea
    al proveedor más barato; verificado en vivo → DeepInfra).
  - 3 pesados (`curator`, `kanban_decomposer`, `vision`) → `anthropic/claude-sonnet-4.6`.
  - 3 aux de RUTA CRÍTICA (`triage_specifier`, `compression`, `title_generation`) movidos de
    `:floor` a `gpt-oss-120b:nitro` (velocidad; bloquean la respuesta). Los otros 7 en `:floor`.
  - **Loop principal:** migrado de nemotron a **`google/gemini-2.5-flash-lite`** (ver abajo).
    Opus en ninguno.
  - Criterio: frecuencia × peso. Lo frecuente/mecánico a barato; lo raro+razonamiento a
    Sonnet. NO todo "lo pesado" a Sonnet (un profile por-mensaje en Sonnet rompe el
    presupuesto: Sonnet $3/$15 vs nemotron $0.085/$0.40 por M).
  - `discovery`/`guardrail` NO son profiles de modelo (son config de AWS Bedrock) — no se
    enrutan. Los profiles reales son 13, bajo `auxiliary:`.
- ✅ **Fix de idioma** (descubierto al probar): `display.language: es` NO fuerza el idioma de
  respuesta; nemotron respondía en inglés. Se añadió **regla dura de idioma arriba del SOUL**
  en las 3. Confirmado en personal (responde español a texto español). Ver [[hermes-vertical-setup]].
- ✅ Caché de prefijo: ya activo en Hermes; disciplina = SOUL/MEMORY estables.
- ✅ **Fiabilidad + latencia del loop principal** (tras incidente de cuelgue por proveedor muerto):
  - **Causa del cuelgue:** ruteo de proveedor no-determinista de OpenRouter pegaba en un host
    muerto (stream sin timeout). Fix inmediato: `:nitro`. Causa de la latencia: nemotron NO
    cachea el prefijo (su proveedor DeepInfra no soporta prompt-cache → reprocesaba ~17-19k
    tokens cada turno, ~8-12s). Verificado con probe: `cached_tokens=0`.
  - **Decisión (2026-06-30, OK de Elisa):** migrar el loop principal a
    **`google/gemini-2.5-flash-lite`** en las 3. En producción: caché **97%** del prefijo,
    latencia **3.3s caliente** (vs ~12s nemotron), ~9× más barato/turno, responde español, tools ok.
    Benchmark de respaldo: gemini-lite $0.00045/turno vs nemotron ~$0.004 (nemotron sin caché no
    era ni el más barato). Alternativa premium evaluada: haiku-4.5 (2.1s, $0.0057).
  - **Cadena de fallback (Nivel 2)** en las 3: primario gemini-2.5-flash-lite →
    `mistral-small-24b-instruct-2501:nitro` → `claude-sonnet-4.6` (3 proveedores distintos:
    Google→DeepInfra→Anthropic). Dispara en 429/5xx/401/404/vacías, per-turn. Ver [[hermes-vertical-setup]].

## Pendiente
- ⬜ **Validación end-to-end de los modelos nuevos**: gpt-oss y Sonnet se aplicaron por config
  pero aún no se han INVOCADO de verdad. Falta ejercitar: tema/sesión nueva → `title_generation`
  (gpt-oss); foto estática → `vision` (Sonnet). Confirmar por `agent.log` que resuelven sin error.
- ✅ **Ingesta a `token_usage`** (2026-06-30): script `businessos/ingest-token-usage.py`
  parsea las líneas `API call #` del agent.log de las 3, calcula costo con tarifas OpenRouter
  (incluida lectura de caché), agrega por (fecha,vertical,modelo) y hace UPSERT idempotente vía
  PostgREST + service_role (constraint única `token_usage_fecha_vertical_modelo_key`). Corrida
  inicial: 4 filas, total $0.0217 el 2026-06-30. **Limitación:** solo loop principal (las aux no
  emiten tokens en agent.log); depende de que el log no haya rotado. Escrituras NO van por el MCP
  (read-only) sino por service_role; ver [[supabase-acceso]]. **Cron nocturno INSTALADO en
  Hetzner (2026-07-06)**: `~/bin/nightly-jobs.sh` (03:10) corre ayer+hoy (UTC, idempotente) +
  `snapshot-pantheon`. Backfill verificado (28/30 jun + 05 jul); snapshot `presupuesto.json`
  vivo → julio $0.09/$30 (0.3%). El loop de negocio corre `claude-haiku-4.5` (confirmado en
  agent.log de prod).
- ✅ **Reporte de presupuesto on-demand** (2026-06-30, **round-trip verificado**): negocio
  (haiku-4.5) hace `skill_view` + `read_file` del snapshot `/opt/data/workspace/presupuesto.json`
  y reporta total + desglose por vertical + alerta al 80%. Sin `execute_code` ni credenciales.
  - **CORRECCIÓN (2026-07-06):** en Hetzner el contenedor NO tiene Docker → `read_file` (y todo el
    toolset `file`) FALLA. El mecanismo cambió al **patrón dato-en-SOUL**: el job nocturno
    (`inject-presupuesto.py`) escribe el presupuesto en `SOUL.md` (único archivo inyectado al
    system prompt) y el skill v3 responde desde contexto, PROHIBIDO usar herramientas. Verificado
    en vivo por la dueña. Ver [[hermes-sin-docker-runtime]].
  - **Presupuesto: $30/mes TOTAL, alerta $24** (bajado de $120; fuente única `negocio/MEMORY.md`).
  - El snapshot lo prepara el job de host `ingest-token-usage.py`; el agente NO consulta Supabase.
  - **Gotcha CLAVE (costó varias iteraciones):** Hermes **scrubbea los secretos** del sandbox del
    agente por diseño → el agente NUNCA recibe `SUPABASE_SERVICE_ROLE_KEY`/env, y `/opt/data/.env`
    está bloqueado. El `AGENTS.md` de las 3 verticales decía "registra/consulta `token_usage` vía
    service_role" — instrucción IMPOSIBLE que, al estar siempre en contexto, vencía al skill y hacía
    que el agente persiguiera credenciales. **Fix:** reescribir AGENTS.md/MEMORY.md → "el job del host
    escribe `token_usage` y deja el snapshot; tú LO LEES, no tocas Supabase". Patrón general:
    cualquier write a Supabase lo hace un job/sidecar de confianza, no el agente.
  - También existe la vista `v_presupuesto_mensual` (PostgREST) + skill `budget-report` v2; pero el
    lever real fue el AGENTS.md (siempre en contexto), no el skill (requiere `skill_view`).
  - Vista: tras crearla, PostgREST necesita `notify pgrst, 'reload schema'` (PGRST205).
- ✅ **DEUDA (clientes/facturas) — job de host construido** (2026-07-01): patrón espejo INVERSO del
  snapshot de tokens. El agente no tiene service_role → escribe cada factura extraída+confirmada como
  JSON en `/opt/data/workspace/facturas_pending/*.json` (con `write_file`, permitido al volumen salvo
  `.env`); el job de host `businessos/ingest-facturas.py` lo lee vía `docker exec`, hace UPSERT a
  `facturas` (unique cliente,folio → idempotente, deducibilidad queda DEFAULT 'pendiente') y mueve el
  archivo a `facturas_procesadas/`. Valida sin adivinar (rechaza si faltan campos), chequeo suave de
  cuadre (subtotal+impuestos≈total: avisa, no bloquea), `--dry-run`. `clientes/AGENTS.md` actualizado con
  la convención drop-file. **Sin probar en runtime** (esta sesión no tiene Docker); correr cuando los
  contenedores estén arriba, igual que `ingest-token-usage.py`. Cron → Droplet.
- ⏸️ **Alerta 80% por cron** y **auto-tuner con eval (autoresearch)** → DIFERIDOS al Droplet
  (necesitan 24/7, igual que el respaldo nocturno). El cerebro principal nunca se auto-cambia
  por precio sin eval + aprobación humana ("copiloto no autopiloto").
- 🚫 "Topes de palabras en crons": N/A, no hay crons aún (diferidos con el Droplet).
- 🟡 **GLM-5.2 para la capa PESADA** (seam listo 2026-07-04): `z-ai/glm-5.2` (OpenRouter) como
  opción para `curator`/`kanban_decomposer` (hoy `claude-sonnet-4.6`), ~6× más barato
  ($0.9/$2.9 vs $3/$15 por M). NO al loop (gemini-lite gana caché+latencia). Gate previo:
  host-job `businessos/probe-glm.py` (idioma + tool-calling + caché de prefijo). Receta de
  `config set` + rollback en [[hermes-vertical-setup]]. **Falta**: correr el probe con
  OPENROUTER_API_KEY y, si pasa, aplicar en las 3 verticales. También candidato de eslabón
  de fallback. Ver plan de integración GLM en la transversal.

## Rollback
Cada profile vuelve a su estado original poniendo `model` y `provider` a `''` (eran vacíos).
El default (nemotron) nunca se tocó.

## ACTUALIZACIÓN 2026-07-08 — residuales CERRADOS

- **Validación en vivo**: `title_generation` → gpt-oss-120b:nitro invocado en prod
  (varias corridas reales; agent.log). `vision` → claude-sonnet-4.6 ejercitado con
  `hermes chat -q ... --image` dentro del contenedor ("Image analysis completed").
- **Alerta 80% AUTOMÁTICA**: `businessos/alerta-presupuesto.sh` (cron 08:00 server)
  lee presupuesto.json del volumen vía docker exec; al cruzar 80% manda UN push
  a Elisa con `hermes send` (dedupe: flag mensual en ~/state). --dry-run para probar.
- Solo queda como futuro el auto-tuner (evals + OK humano).

## 2026-07-19: Analizador v2 (PRP-002 Fase 1) — telemetría fiable, EN PRODUCCIÓN

`ingest-token-usage.py` v2 + `alerta-presupuesto.sh` v2 (PR #85), desplegados por
`git pull` (reestructura del server) y verificados en Hetzner con las 3 verticales:

- **Caché de precios** en `~/state/openrouter-models.json` con fallback al último bueno
  (el endpoint OR puede fallar a las 03:10); `precios_fuente` visible en el snapshot.
- **Exit ruidoso**: si el agent.log tiene líneas `API call #` pero 0 matchean el regex,
  sale `≠0` (antes fallaba EN SILENCIO ante un cambio de formato de Hermes). Verificado
  con break-sim genuino (docker falso → exit 2, sin tocar la DB).
- **Buffer** del agent.log al host antes de parsear (`~/state/agentlog-<vert>-<fecha>.txt`).
- **Snapshot v2** (`presupuesto.json`): `por_modelo` con `pct_cache` y
  `costo_promedio_por_turno`; `pct_no_observado` (reconciliación mensual vs gasto real de
  OpenRouter vía delta de `total_usage` en `~/state/or-usage-ledger.json` — degrada honesto
  con nota si falta el dato, NUNCA inventa); `cache_bajo_umbral` para la alerta.
- **Alerta v2**: además del 80% de presupuesto, avisa si el caché de prefijo cae bajo umbral
  (dedupe mensual propio). El caché es la variable que decide el costo (incidente nemotron).

**Hallazgo medido (importante para calibrar):** el `pct_cache` AGREGADO del día es **~45%**
(haiku 44%, gemini-lite 48%), NO el 97% del mejor-caso por-llamada (que incluía solo la 2ª
llamada con prefijo idéntico). El agregado incluye las 1as llamadas sin caché de cada
conversación. Por eso el umbral de alerta default es **25%** (detecta un COLAPSO tipo
nemotron, no la varianza normal) — configurable con `PCT_CACHE_MIN`.

**Pendiente de la fase (no bloqueante):** la brecha `pct_no_observado` estará medida en el
próximo run del mes (el 1er run solo fija el ancla de `total_usage`); anotar su valor y la
decisión que dispara (<10% cosmética / ≥30% instrumentar las aux) cuando haya dato.
Invariantes INTACTOS: idempotencia delete+insert, jamás tocar filas con `task_id`.

Fases 2-4 del PRP-002 (arena-watch, probe-kimi, piloto Kimi↔Opus): construidas/pendientes
según gates de la dueña. Ver `.claude/PRPs/prp-eficiencia-v2-benchmarking-kimi.md`.

## 2026-07-27: La doctrina de orquestación (PR #165) queda como CRITERIO DE MÉTODO de esta fase

La doctrina `orquestar-agentes` (Opus 5) formaliza lo que esta fase ya practicaba por
convergencia: ruteo por tipo de tarea (≈ frecuencia×peso), gate de probe antes de confiar
(≈ probe-glm), Eje 0 sin-LLM (≈ host-jobs/dato-en-SOUL/CLIs impresos) y costo por TAREA,
no por token. Regla operativa desde hoy: **todo cambio de modelo en profiles/loop se decide
con ese método** — citando `.claude/memory/feedback/modelo-esfuerzo-por-tarea.md` — y pasa
su probe (idioma+tools+caché). La TABLA de modelos de la doctrina NO aplica aquí (es de
Claude Code, que solo rutea familia Claude; Hermes es multi-proveedor con presupuesto
$30/mes: el loop lo ganan caché+latencia, la capa pesada la ganó GLM por costo).

Aplicación concreta en el enjambre: el Planner del Coordinador estampa `modelo_pref` por
sub-tarea según dificultad (doctrina §3.5) vía `PLANNER_RUTEO_MODELOS` — ver
`coordinador-a2a/claude_planner.py::rutear_por_dificultad` (apagado por default; herencia
del padre intacta como fallback).

Pendiente menor: probe de Sonnet 5 para el profile `vision` (hoy sonnet-4.6; mismo tier de
precio, uso raro) — correr probe antes de aplicar, como siempre.

## 2026-07-28: El ruteo por costo es la ÚLTIMA capa, no la primera
Alineación con la doctrina de exclusión (orquestar-agentes §2, origen PR #170):
todo lo de esta fase — routing de profiles, probe de caché+tools, fallback
chains — es la capa de EFICIENCIA, que compara SOLO entre modelos ya permitidos
para ese dato/dominio. Antes de cablear un modelo nuevo por precio, la pregunta
previa al probe es "¿está PROHIBIDO para lo que va a ver?" (retención/ZDR,
clasificadores, proveedor externo vs dato de cliente). Un descalificador no se
compensa con caché al 97%.
