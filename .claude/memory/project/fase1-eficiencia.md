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
  (read-only) sino por service_role; ver [[supabase-acceso]]. Programación por cron → Droplet.
- ⬜ **Reporte de presupuesto on-demand** (consulta `token_usage`; funciona hoy en WSL2).
- ⏸️ **Alerta 80% por cron** y **auto-tuner con eval (autoresearch)** → DIFERIDOS al Droplet
  (necesitan 24/7, igual que el respaldo nocturno). El cerebro principal nunca se auto-cambia
  por precio sin eval + aprobación humana ("copiloto no autopiloto").
- 🚫 "Topes de palabras en crons": N/A, no hay crons aún (diferidos con el Droplet).

## Rollback
Cada profile vuelve a su estado original poniendo `model` y `provider` a `''` (eran vacíos).
El default (nemotron) nunca se tocó.
