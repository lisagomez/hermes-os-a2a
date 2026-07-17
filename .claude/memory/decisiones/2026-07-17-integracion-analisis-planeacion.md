# Decisión 2026-07-17-integracion-analisis-planeacion

> Registro estructurado del Paso 6 del skill `consejo`. Artefacto fuente:
> `businessos/departamentos/analisis-planeacion.md`.

## Pregunta sometida

¿Cómo unificar las 5 piezas de análisis/planeación dispersas (skill `consejo`, skill
`prp`, `claude_planner` del Coordinador, grafo regulatorio, entrevista `new-app`) y
cuánto adoptar de la metodología de 7 fases de Spartane.ai? Opciones: A) pipeline
completo con tabla `decisiones` + vista Mission Control; B) 7 fases como capa de
gobernanza; C) mínimo: costura Consejo→PRP; D) nada.

## Dónde coincide el Consejo

- Spartane no se copia, se lee: sus 209 documentos/20 roles son la estructura de costos
  de una consultoría enterprise, la especie opuesta a Hermes-os-a2a.
- La dispersión de las 5 piezas no es el dolor; la única costura con costo real es
  Consejo→PRP (que una decisión se pierda al empezar a picar código).
- El presupuesto manda: el Consejo (~11 llamadas/decisión) se queda manual, en Claude
  Code, solo para decisiones caras/irreversibles.

## Dónde choca

Expansionista (el pipeline A es la demo de venta del white-label: gobernanza agéntica
como subproducto de operar) vs. Contrarian/Primeros Principios (ingeniería especulativa
sin demanda validada). El Ejecutor rompe el empate: C hoy, A se gana el derecho a
existir con uso.

## Puntos ciegos (del peer-review)

- Instrumentar antes de decidir: log JSONL barato en cada traspaso en vez de intuición.
- El prototipo de trazabilidad ya existe: el patrón del grafo (veredicto + fuente +
  persistencia + fail-safe).
- El recurso escaso es el tiempo de Elisa (bus factor 1), no los tokens.
- Faltaba umbral de graduación objetivo de C a A.

## Recomendación

**Opción C ampliada con instrumentación, graduación a A por evidencia.** Costura
Consejo→PRP hoy (cero infra); `decision_id` viaja hasta la tarea padre del enjambre
(`token_usage.task_id` cierra el hilo al gasto); tabla `decisiones` + vista Mission
Control SOLO cuando haya ≥3 hilos completos en el JSONL Y un prospecto pida ver
gobernanza. De Spartane: solo el mapa de 7 fases como checklist de descubrimiento
white-label — nunca sus generadores de documentos ni sus 20 roles.

## Primer paso

Editar `prp-base.md` (sección opcional "Decisión del Consejo") + Paso 6 del skill
`consejo` escribe a `.claude/memory/decisiones/` + log `businessos/trazas-decisiones.jsonl`.
**Ejecutado el 2026-07-17 en el mismo PR que integra el plan.**
