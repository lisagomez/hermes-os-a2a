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
- **Sync nocturno a GitHub 2:10** — negocio respalda SU workspace a su repo
  privado `businessos-negocio`. Modelo: un repo por vertical, horarios
  escalonados (personal 2:00, negocio 2:10, clientes 2:20) para no chocar.

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
