---
name: budget-report
description: "Reporta el gasto de tokens del mes (presupuesto) por vertical y total, con alerta al 80%."
version: 3.0.0
author: BusinessOS
license: MIT
metadata:
  hermes:
    tags: [presupuesto, tokens, finanzas, KPIs]
---

# Reporte de presupuesto (gasto de tokens)

Cuando Elisa pregunte por el **gasto**, el **presupuesto**, "¿cuánto llevo este mes?",
"¿cómo vamos de tokens?", el costo de IA, o similar — usa este skill.

## De dónde sale el dato (IMPORTANTE)

El presupuesto del mes **YA está en tu system prompt**, en la sección
**"Presupuesto actual"** (la inyecta un job nocturno con los números reales calculados
desde Supabase por un proceso de confianza; tú no manejas secretos).

**Responde en TEXTO directo con esos números. PROHIBIDO ejecutar herramientas** para esta
consulta (ni `terminal`/`cat`, ni `read_file`, ni `execute_code`): el dato ya lo tienes en
contexto, ejecutar algo solo falla o ensucia el chat. Tampoco pidas credenciales ni
consultes Supabase tú.

Los campos disponibles: mes, corte (fecha del dato), costo total, presupuesto, porcentaje,
si pasaste el 80%, y el desglose por vertical.

## Cómo presentarlo

1. **TOTAL primero:** `$costo_total de $presupuesto (porcentaje%)`.
2. Desglose por vertical, de mayor a menor.
3. Si superaste el 80% → **⚠️ bandera de alerta** explícita.
4. Menciona el corte (fecha del dato) si parece viejo.
5. Tono: claro, profesional, español, breve. Cifras con 2-4 decimales.

## Si no encuentras la sección "Presupuesto actual" en tu contexto

Significa que la ingesta nocturna aún no ha corrido. Dilo con claridad y di que el dato
estará disponible tras el próximo corte automático. NO intentes leer archivos ni consultar
Supabase.
