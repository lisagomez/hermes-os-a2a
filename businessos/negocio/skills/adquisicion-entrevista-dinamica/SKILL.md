---
name: adquisicion-entrevista-dinamica
description: >-
  Activo Digital del departamento de Adquisición de Clientes (Hermes OS · A2A, Fase 9). Genera la guía de
  entrevista de descubrimiento (Hito 3 del pipeline de EG.CRM): a partir de la Ficha de Inteligencia del
  pre-descubrimiento, arma un guion de preguntas dinámico y personalizado para conducir la conversación
  asesor-cliente con tono cordial de vendedor, con ramas de seguimiento según las respuestas. Corre como
  competencia del Ejecutor del trío. Usa este skill siempre que se prepare o realice un descubrimiento
  (visita o llamada), o cuando alguien pida "guía de entrevista", "preguntas para el cliente", "guion de
  descubrimiento" o "cómo abordar la entrevista", aunque no se nombre el skill.
tipo_activo: Activo Digital
objetivo: >-
  Que cada entrevista de descubrimiento sea relevante y natural: preguntas a la medida del prospecto,
  trazables a sus dolores, que destapan necesidades reales sin sonar a cuestionario.
---

# Adquisición · Entrevista dinámica (guía de descubrimiento)

**Activo Digital:** Guía de entrevista de descubrimiento dinámica.
**Objetivo:** producir un guion adaptado a cada prospecto que conduzca la conversación con tono cordial de vendedor y destape necesidades reales, ajustándose en vivo a lo que responde el cliente.

## Encuadre en Hermes OS (ROADMAP)

- **Departamento:** Adquisición de Clientes (Fase 9); **competencia del Ejecutor**, orquestada por Hermes-Negocio. *(Aislar, no fundir.)*
- **Copiloto, no autopiloto:** la guía asiste al asesor humano; no automatiza la venta. *(Gate humano en lo de cara al cliente.)*
- **De la ficha, no del aire:** cada bloque se rastrea a un dolor o punto de abordaje del pre-descubrimiento. *(Citar fuentes, no inventar.)*
- **Routing:** generación de texto acotada → modelo medio, no Opus. *(Eficiencia por routing.)*

## Entradas

Ficha de Inteligencia (giro, dolores, puntos de abordaje), datos del prospecto, nombre del **asesor**, modalidad (**visita** | **llamada**).

## Proceso

1. **Personaliza desde la ficha.** Convierte cada dolor/punto de abordaje en preguntas abiertas concretas para ese prospecto; nada genérico.
2. **Estructura el arco:** apertura cordial → contexto del negocio → situación actual y fricciones → impacto/urgencia → visión deseada → cierre y próximos pasos.
3. **Adapta en vivo:** ramas de seguimiento (si confirma un dolor, profundiza; si lo descarta, redirige) y preguntas de respaldo por si se estanca.
4. **Cuida el tono cordial de vendedor:** cercano, curioso, una idea por pregunta, sin sonar a interrogatorio.

## Salida — Guía de entrevista (formato fijo)

```
# Guía de entrevista — [Empresa] · Asesor: [nombre] · Modalidad: [visita|llamada]

## Apertura (rapport)
- [Frase/pregunta cordial de inicio]

## Bloques de descubrimiento
### [Tema] — (origen: dolor/punto de abordaje X de la ficha)
- Pregunta principal
  - ↳ si responde A → seguimiento
  - ↳ si responde B → seguimiento

## Señales a escuchar
- [Respuestas que indican interés / dolor fuerte / urgencia]

## Cierre y próximos pasos
- [Pregunta de compromiso suave]
```

## Reglas de calidad

- **Abiertas primero** (cómo/qué/por qué); sí/no solo para confirmar.
- **Una idea por pregunta.**
- **Trazabilidad a la ficha**; si es `Parcial`, incluye preguntas exploratorias para llenar huecos.
- **Cordial, no invasivo:** el objetivo es que el cliente hable a gusto.

## Método diio aplicado ("Guía de supervivencia para vender con IA")

- **Cada hipótesis → 2 preguntas de discovery** que la validen "sin sonar forzadas ni demasiado obvias" (diio, cap. 6, paso 4).
- **Calibración de tono:** preguntas *"abiertas pero orientadas; exploratorias pero no blandas; inteligentes pero no teatrales"*. Bájalas a tierra: ni interrogatorio de aeropuerto ni "manual de liderazgo con exceso de comas".
- **Mejores preguntas, no más** (diio, cap. 14): las que mueven entendimiento, no las que solo recolectan información.
- **Aperturas** (frente 6): 3 formas de abrir los primeros 2 minutos, "ni vendedor ni excesivamente informal".
- **Ramas por stakeholder y objeciones reales** (prácticas 1, 6, 8): prepara criterio conversacional para momentos de presión —qué tono, cómo plantear sin sonar agresivo, qué respuestas del cliente hacen profundizar o retroceder— sin guionizar.
- **Anti-homogeneización (Trampa 6):** preserva la voz del asesor/marca; no estandarices hasta que todas las guías suenen iguales.

## Integración

Se usa durante el descubrimiento junto con `adquisicion-transcripcion` (captura). Lo conversado alimenta a `adquisicion-diagnostico-factibilidad`.

---
*Método basado en "Guía de supervivencia para vender con IA" (diio.com), CC BY-SA 4.0.*
