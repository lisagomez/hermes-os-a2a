---
name: budget-report
description: "Reporta el gasto de tokens del mes (Supabase token_usage) por vertical y total, con alerta de presupuesto."
version: 1.0.0
author: BusinessOS
license: MIT
metadata:
  hermes:
    tags: [presupuesto, tokens, finanzas, supabase, KPIs]
prerequisites:
  commands: [curl, date]
  env: [SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY]
---

# Reporte de presupuesto (gasto de tokens)

Cuando Elisa pregunte por el **gasto**, el **presupuesto**, "¿cuánto llevo este mes?",
"¿cómo vamos de tokens?", el costo de IA, o similar — usa este skill.

## Qué hace

Lee la vista `v_presupuesto_mensual` de Supabase (agregada por mes y vertical, con una
fila `TOTAL`) y la presenta en español, comparada contra el presupuesto mensual.

- **Presupuesto objetivo:** ~$30 USD/mes (meta de Fase 1: gasto controlado $25-30).
- **Umbral de alerta:** avisa si el TOTAL del mes supera el **80%** ($24).

## Cómo obtener los datos

Las credenciales ya están en el entorno del contenedor (NO las imprimas). Ejecuta:

```bash
MES=$(date +%Y-%m)
curl -s "$SUPABASE_URL/rest/v1/v_presupuesto_mensual?mes=eq.$MES" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Devuelve un JSON con una fila por vertical (`personal`, `negocio`, `clientes`) más una
fila `TOTAL`, cada una con `tokens_in`, `tokens_out`, `costo_usd`.

## Cómo presentarlo

1. Muestra el **TOTAL** del mes primero (lo importante va primero): `$X.XX de ~$30`.
2. Desglose por vertical (costo de cada una), de mayor a menor.
3. Si TOTAL > $24 (80%) → **bandera de alerta** explícita.
4. Tono: claro y profesional, en español, breve. Cifras con 2-4 decimales.

## Notas y límites

- Los datos reflejan la **última ingesta** (`businessos/ingest-token-usage.py`), que hoy
  corre on-demand; en el Droplet correrá por cron nocturno. Si los números se ven viejos,
  dilo ("datos al último corte").
- Hoy solo se contabiliza el **loop principal** (las llamadas auxiliares aún no emiten
  tokens al log). Es el costo dominante, pero menciónalo si Elisa pide precisión total.
- Nunca imprimas `SUPABASE_SERVICE_ROLE_KEY` ni ningún token (regla de higiene de salida).
