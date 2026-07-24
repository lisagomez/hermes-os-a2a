---
name: adquisicion-analisis-profundo
description: >-
  Activo Digital del departamento de Adquisición de Clientes (Hermes OS · A2A, Fase 9). Ejecuta el
  descubrimiento a profundidad (Hito 5 del pipeline de EG.CRM) para leads Factible+Prioritario: decide si
  el proceso del cliente existe (feature simple/compleja) o no, adapta preguntas enfocadas al proceso
  (manualidad, agentizable, herramientas, conectores y restricciones, legal, infraestructura,
  escalabilidad) y produce el Informe de Análisis con FODA, factibilidad, costo-beneficio y eficiencia
  actual vs. propuesta (tiempo-costo) en gráficas, mitigación de riesgos, alcances, fases y plan de
  contingencia si no se pueden activar los agentes. Usa este skill siempre que un proyecto pase a análisis
  profundo, o cuando pidan "informe de análisis", "eficiencia actual vs propuesta", "análisis
  costo-beneficio" o "¿el proceso ya existe?", aunque no se nombre.
tipo_activo: Activo Digital
objetivo: >-
  Producir un Informe de Análisis riguroso que sustente la propuesta: qué es realmente alcanzable, qué
  beneficio real se le da al cliente, con riesgos medidos, contingencias y lo regulatorio citado.
---

# Adquisición · Análisis de Proceso a Profundidad

**Activo Digital:** Informe de Análisis del proyecto.
**Objetivo:** determinar qué es realmente alcanzable y qué beneficio real aporta cambiar el proceso del cliente, con costo-beneficio, eficiencia actual vs. propuesta, riesgos medidos y contingencias — como sustento de la propuesta comercial.

## Encuadre en Hermes OS (ROADMAP)

- **Se dispara solo para `Factible`+`Prioritario`** (salida del consenso, Hito 4). *(Acotar antes de escalar: no se analiza a fondo lo que no procede.)*
- **Competencia del Ejecutor**, re-gateada por el Supervisor. *(Verificar antes de confiar.)*
- **Gráficas con el método dataviz del proyecto** (paleta validada, legible en claro/oscuro), el mismo criterio de Mission Control (Fase 4). *(Arreglar lo compartido: se reusa el estándar visual.)*
- **Lo regulatorio, al grafo.** Restricciones legales, fiscales o contractuales → `grafo-a2a`, país del cliente, fuente citada, fail-safe `dudoso`.
- **Routing:** análisis profundo → modelo capaz; las gráficas se generan por código, no por tokens de más.

## Entradas

Evaluación de Factibilidad, transcripciones (incluida la llamada de descubrimiento profundo si el proceso existe), país y datos del lead.

## Proceso

1. **¿El proceso existe?**
   - **No existe** → evalúa y clasifica el proyecto: **`feature simple`** | **`feature compleja`**.
   - **Sí existe** → agenda otra llamada de descubrimiento a profundidad (reusa el ciclo de Llamada) y adapta **preguntas enfocadas al proceso**: qué tan manual es, si es agentizable, herramientas actuales, conectores externos y sus restricciones, restricciones legales, infraestructura, escalabilidad, qué quiere el cliente vs. qué es alcanzable.
2. **Costo-beneficio y eficiencia:** compara **eficiencia actual vs. propuesta** en **tiempo y costo** (con gráficas), y expresa el beneficio real para el cliente.
3. **Riesgos:** identifica, mide y propone **mitigación**; incluye el **plan de contingencia** si por alguna razón no se pueden activar los agentes.
4. **Cita lo regulatorio** contra el grafo.

## Salida — Informe de Análisis (formato fijo)

```
# Informe de Análisis — [Empresa]
Lead: [lead_id] · Proceso: existe/no existe · Tipo: [feature simple|compleja|N/A]

## Análisis del proceso
## FODA
## Factibilidad
## Costo-beneficio            (gráfica)
## Eficiencia actual vs. propuesta — tiempo y costo   (gráfica)
## Mitigación de riesgos      (riesgo → probabilidad/impacto → mitigación)
## Plan de contingencia (si no se pueden activar los agentes)
## Alcances
## Fases de implementación
## Notas regulatorias (grafo) — fuente citada + vigencia

> Sustento de la propuesta. Señala, no asesora; el humano aprueba.
```

## Reglas de oro

- **Alcanzable > deseable:** distingue lo que el cliente quiere de lo que de verdad se puede entregar.
- **Riesgo sincero, con contingencia** — especialmente el caso "no se pueden activar los agentes".
- **Regulatorio citado o `dudoso`**, nunca inventado.

## Método diio aplicado ("Guía de supervivencia para vender con IA")

- **Costo de la inacción:** explicita qué cuesta *no* hacer nada; suele ser el argumento más fuerte del análisis costo-beneficio.
- **Comparar narrativas de valor** (práctica 4): evalúa 2-3 marcos (p. ej. productividad / visibilidad de gestión / calidad del proceso) y recomienda uno según el stakeholder que aprueba — no elijas uno por costumbre.
- **Simular escéptico** (práctica 8): corre el informe "como si fueras un CFO/gerente que debe convencer a su CEO" — qué partes son débiles, qué falta para que merezca presupuesto. Endurece el análisis antes de proponerlo.
- **Riesgos no conversados** y tipificados (precio ≠ político ≠ implementación ≠ falta de foco interno), con su mitigación.
- **Modo crítico** (hábito 3): usa el análisis también para cuestionar la propia lectura ("dónde pienso demasiado lineal, qué supuesto compro sin validar").
- **Separa observado / inferido** y evita la "claridad aparente": un informe pulcro no equivale a uno correcto.

## Integración

Alimenta a `adquisicion-paquete-comercial` (Hito 6): el paquete se construye sobre este informe.

---
*Método basado en "Guía de supervivencia para vender con IA" (diio.com), CC BY-SA 4.0.*
