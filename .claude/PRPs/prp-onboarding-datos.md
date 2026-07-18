# PRP (BORRADOR): onboarding de datos como on-ramp de la plataforma

> ESTADO: borrador / propuesta a discutir con el equipo (Elisa, Víctor, Luis). NO aprobado, NO
> planificado. Sembrado 2026-07-17. Si el equipo lo valida, se convierte en un PRP completo (con
> fases, modelo de datos y plan) y entra al ROADMAP. Nombre "onboarding de datos" deliberado para NO
> chocar con la "FASE 0" del repo, que es la infraestructura (Hetzner/Docker).

## Problema / oportunidad

Antes de que Hermes opere el negocio o los clientes de una empresa, sus datos tienen que estar
ordenados y confiables. Hoy no hay un paso explícito que evalúe y prepare los datos del cliente
antes de soltarle agentes encima.

## La propuesta

Un módulo de **onboarding / diagnóstico de datos**, en uno de dos encuadres (a decidir):

1. **Wedge de adquisición** (encaja con Fase 9): un diagnóstico rápido y barato como punto de
   entrada de bajo compromiso para un cliente nuevo, antes de venderle la operación agéntica.
2. **Capacidad de la vertical clientes**: al dar de alta un cliente, Hermes evalúa la calidad y
   estructura de sus fuentes de datos y produce un plan de "datos listos para agentes".

## Por qué puede valer (respaldo de mercado)

- Gartner: 60% de los proyectos de IA sin datos "AI-ready" se abandonan antes de 2026.
- MIT ("The GenAI Divide", ago-2025): 95% de los pilotos de IA generativa no dan impacto medible,
  por datos sucios/mal gobernados, no por el modelo.
- Convergencia 2026: ingeniería de datos PARA agentes (RAG, pipelines con linaje consumibles en
  tiempo real). El grafo regulatorio de Hermes ya es un vecino natural.

## Encaje con los principios del proyecto

- "Acotar antes de escalar": el diagnóstico es acotado (un cliente, sus fuentes) antes de operar.
- "Citar, no inventar": el plan de datos señala hallazgos con evidencia; el humano decide.
- "Aislar, no fundir": sería un servicio/skill propio, no lógica embebida en las verticales.

## Preguntas abiertas para el equipo (antes de volverlo PRP completo)

- ¿Wedge de adquisición, capacidad de la vertical clientes, o ambos?
- ¿Cómo se relaciona con el grafo (Fase 2+) y la vertical clientes ya existentes?
- ¿Qué se puede reusar de lo ya construido (grafo, ingesta de facturas)?
