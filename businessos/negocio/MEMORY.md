# MEMORY.md — Vertical Negocio

Memoria persistente del contenedor `hermes-negocio`. Vive en
`negocio/.hermes/MEMORY.md`. Reglas operativas en AGENTS.md, persona en SOUL.md.
Aqui van los HECHOS estables: presupuesto, KPIs, umbrales y decisiones. Mantenlo
corto y actualizado; si un dato cambia, edita la linea, no acumules historia.

---

## Presupuesto de tokens (lo lee AGENTS.md)

- **Presupuesto mensual total:** 30 USD.
- **Umbral de alerta:** 80%  →  avisar por Telegram al cruzar **24 USD** en el
  mes en curso, con el numero exacto y la vertical que mas gasta.
- **Corte del mes:** dia 1, hora de Mexico (zona del servidor: America/Mexico_City).
- Reparto orientativo por vertical (no es tope duro, solo referencia del digest):
  - personal: ~12 USD
  - negocio: ~12 USD
  - clientes: ~6 USD

> El gasto real es la suma de `costo_usd` en `token_usage` del mes en curso, que
> queda calculado en el snapshot `/opt/data/workspace/presupuesto.json` (lo prepara
> el job de ingesta del host). Tú LEES el snapshot; no consultas Supabase.

### Riesgo aparte: dogfood real del trío/enjambre (`vertical='trio'`)

El reparto orientativo de arriba es solo para las 3 verticales (loop normal). El
trío (Ejecutor→Supervisor→Coordinador, Fase 6/7) es **otro consumidor de
`token_usage`** (mismo `vertical='trio'`) que hoy está en Mock (cero tokens) y
solo se enciende con `EJECUTOR_ENGINE=claude` / `COORDINADOR_PLANNER=claude` —
decisión de la dueña, todavía no activado.

- **Sin tope por defecto:** `presupuesto_usd` es OPCIONAL en la tarea (sin
  default) → si no se fija explícito, el único freno automático es
  `max_turns=40` por corrida (`ejecutor-a2a/claude_engine.py`). El Supervisor
  no gasta tokens (motor de reglas, sin LLM).
- **Ruteo inteligente por tarea (mismo principio que el routing normal —
  ver "Routing de modelos" abajo):** `modelo_pref` va en cada tarea, no fijo:
  - Simple/mecánica (rename, fix de lint, boilerplate, un archivo) →
    `modelo_pref="glm-5.2"` vía el seam z.ai (`ANTHROPIC_BASE_URL=
    https://api.z.ai/api/anthropic`), ~1/6 del costo de Opus (gate previo:
    `probe-glm.py`, ya validado idioma+tools+caché).
  - Media/alta complejidad (lógica de negocio, multi-archivo) → Sonnet
    (`claude-code-default` o `modelo_pref` explícito).
  - Opus: casi nunca, solo si de verdad hace falta y bajo aviso explícito.
- **Estimado razonado (no medido — el smoke real nunca se ha corrido), YA con
  ruteo inteligente:** ~$0.10–$0.50 una tarea simple en GLM-5.2; ~$0.50–$3 una
  tarea media/alta en Sonnet; hasta ~$5–$15 solo en el peor caso (Opus, agota
  los 40 turnos, o los 3 reintentos de `intentos_max`). El enjambre multiplica
  por `fan_out_max` sub-tareas en paralelo — el ruteo por tarea aplica igual
  a cada sub-tarea del Coordinador.
- **Regla:** antes de la primera corrida real, fijar `presupuesto_usd` explícito
  (ej. $1–2) en la tarea, sea cual sea el modelo. Si el gasto de `vertical='trio'`
  empuja el mes por encima del techo de $30, avisar igual que con cualquier
  otra vertical.

---

## Tabla `token_usage` (Supabase — fuente de verdad)

Agregado diario por `(fecha, vertical, modelo)`. Columnas:
`fecha, vertical, modelo, tokens_in, tokens_out, costo_usd`. La **escribe el job de
ingesta del host** (`businessos/ingest-token-usage.py`), NO el agente.

- No inventes cifras. Si falta un dato, marcalo como **pendiente**.
- El gasto del dia / del mes sale del **snapshot** que prepara la ingesta
  (`/opt/data/workspace/presupuesto.json`), no de un query directo ni de memoria.

---

## Routing de modelos (recordatorio de costo)

- Clasificar / formatear / resumir simple  →  modelo barato.
- Analisis financiero, construir KPI, redaccion con criterio  →  Sonnet.
- Opus casi nunca; solo algo verdaderamente complejo y **bajo aviso**.

---

## KPIs de negocio a vigilar

Rellena con los KPIs reales del negocio. Plantilla:

| KPI | Meta | Fuente | Frecuencia |
|-----|------|--------|------------|
| (ej. MRR)            | (ej. +10% m/m) | Supabase | semanal |
| (ej. clientes activos) | (definir)    | Supabase | diaria  |
| (ej. gasto tokens mes) | < 30 USD     | snapshot presupuesto | diaria |

> Mientras no haya KPIs definidos, el digest reporta solo gasto de tokens y lo
> marca explicitamente como "KPIs pendientes de definir".

---

## Crons activos (referencia; se crean via lenguaje natural)

- **Digest negocio 8:00** — KPIs, gasto del dia y del mes vs presupuesto, alertas.
- **Cierre semanal lunes 8:00** — resumen de KPIs y proyeccion de gasto del mes.
- **Respaldo nocturno 04:17 — lo hace el HOST, no yo.** `backup-verticales.sh`
  (cron del usuario `hermes`) tarballea los volumenes de las 3 verticales y los
  espeja al repo privado `hermes-os-a2a-backups`. Yo no tengo acceso a mi volumen
  (0700/uid-10000) ni hago push de nada. Ver FASE0 §9.

---

## Pendiente / Fase futura

- **Servicio `grafo` (deducibilidad fiscal):** aun NO existe en Fase 0. El cierre
  mensual con deducciones se activa cuando `http://grafo:3000` este levantado
  (ver seccion "Fase futura" de AGENTS.md). Hasta entonces, no lo consultes.

---

## Decisiones registradas

- 2026-06-26 — Presupuesto inicial fijado en 120 USD/mes con alerta al 80%.
- 2026-06-30 — Presupuesto **bajado a 30 USD/mes** (alerta 24 USD). Tras la Fase 1
  (gemini-flash-lite + caché de prefijo) el gasto real quedó casi nulo; 30 USD es un
  techo realista. *(Ajusta esta linea cuando cambie el presupuesto.)*
