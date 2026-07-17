# Integración de análisis y planeación (hilo decision_id)

**Decisión del Consejo 2026-07-17** (registro:
`.claude/memory/decisiones/2026-07-17-integracion-analisis-planeacion.md`; plan completo:
`businessos/departamentos/analisis-planeacion.md`).

Las 5 piezas de análisis/planeación (consejo, prp, claude_planner, grafo, new-app) NO se
funden — se cablea solo la costura Consejo→PRP con un `decision_id` que viaja
decisión→PRP→tarea padre→gasto (`token_usage.task_id`). De Spartane.ai se adopta
únicamente el mapa de 7 fases como checklist de descubrimiento white-label (las 7 ya
están vivas en Hermes-os-a2a como runtime).

**Estado por etapa:**
- Etapa 1 (costura) — ✅ APLICADA 2026-07-17: `prp-base.md` con sección opcional
  "Decisión del Consejo"; Paso 6 del skill `consejo` escribe
  `.claude/memory/decisiones/<decision_id>.md` + evento en
  `businessos/trazas-decisiones.jsonl` (append-only, lo escribe Claude Code, el runtime
  no se toca).
- Etapa 2 — pendiente de la primera feature post-Consejo: `decision_id` en el `contexto`
  jsonb de la tarea padre (cero cambio de esquema).
- Etapa 3 (tabla `decisiones` + vista Mission Control) — GATED por evidencia: ≥3 hilos
  completos en el JSONL Y un prospecto white-label que pida ver gobernanza. NO construir
  antes.

**Qué NO hacer (acordado):** no adoptar las 7 fases como proceso obligatorio, no cablear
el Consejo como paso automático de cada PRP, no construir tabla/vista antes del gate, no
exponer nada nuevo a internet.

Aplica [[mantener-docs-vivas]]: al cerrar Etapa 2 o abrir Etapa 3, actualizar ROADMAP +
esta nota + el plan.
