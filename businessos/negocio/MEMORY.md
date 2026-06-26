# MEMORY.md — Vertical Negocio

Memoria persistente del contenedor `hermes-negocio`. Vive en
`negocio/.hermes/MEMORY.md`. Reglas operativas en AGENTS.md, persona en SOUL.md.
Aqui van los HECHOS estables: presupuesto, KPIs, umbrales y decisiones. Mantenlo
corto y actualizado; si un dato cambia, edita la linea, no acumules historia.

---

## Presupuesto de tokens (lo lee AGENTS.md)

- **Presupuesto mensual total:** 120 USD.
- **Umbral de alerta:** 80%  →  avisar por Telegram al cruzar **96 USD** en el
  mes en curso, con el numero exacto y la vertical que mas gasta.
- **Corte del mes:** dia 1, hora de Mexico (zona del servidor: America/Mexico_City).
- Reparto orientativo por vertical (no es tope duro, solo referencia del digest):
  - personal: ~30 USD
  - negocio: ~60 USD
  - clientes: ~30 USD

> El gasto real es la suma de `costo_usd` en `token_usage` del mes en curso.
> Supabase es la fuente de verdad; estos numeros son el objetivo, no el dato.

---

## Tabla `token_usage` (Supabase — fuente de verdad)

Una fila por llamada relevante. Columnas:
`fecha, vertical, modelo, tokens_in, tokens_out, costo_usd`.

- No inventes cifras. Si falta un dato, marcalo como **pendiente**.
- El gasto del dia / del mes siempre sale de un query a esta tabla, no de memoria.

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
| (ej. gasto tokens mes) | < 120 USD    | token_usage | diaria |

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
  *(Ajusta esta linea cuando cambie el presupuesto.)*
