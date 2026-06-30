---
name: budget-report
description: "Reporta el gasto de tokens del mes (presupuesto) por vertical y total, con alerta al 80%."
version: 2.0.0
author: BusinessOS
license: MIT
metadata:
  hermes:
    tags: [presupuesto, tokens, finanzas, KPIs]
prerequisites:
  files: [/opt/data/workspace/presupuesto.json]
---

# Reporte de presupuesto (gasto de tokens)

Cuando Elisa pregunte por el **gasto**, el **presupuesto**, "¿cuánto llevo este mes?",
"¿cómo vamos de tokens?", el costo de IA, o similar — usa este skill.

## Cómo obtener los datos

**Lee el archivo** `/opt/data/workspace/presupuesto.json` con tu herramienta de lectura de
archivos. NO ejecutes código ni pidas credenciales: el dato ya está calculado ahí por el
job de ingesta (que es quien tiene acceso a Supabase; tú no manejas secretos).

El JSON trae: `mes`, `generado` (fecha del corte), `presupuesto_usd`, `costo_total_usd`,
`pct_presupuesto`, `alerta_80pct` (bool), `por_vertical` (costo de cada vertical), y `nota`.

## Cómo presentarlo

1. **TOTAL primero:** `$costo_total_usd de $presupuesto_usd (pct_presupuesto%)`.
2. Desglose `por_vertical`, de mayor a menor.
3. Si `alerta_80pct` es `true` → **⚠️ bandera de alerta** explícita (pasaste el 80%).
4. Menciona la `nota` y el corte (`generado`) si los números parecen viejos.
5. Tono: claro y profesional, español, breve. Cifras con 2-4 decimales.

## Si el archivo no existe o está vacío

Significa que la ingesta no ha corrido aún. Dilo claramente y sugiere correr
`businessos/ingest-token-usage.py` (hoy on-demand; en el Droplet irá por cron nocturno).
NO intentes consultar Supabase tú directamente (no tienes las credenciales, por diseño).
