---
name: hermes-advisor-brief
description: Síntesis del brief del asesor (marca blanca, Pre-Discovery) — empaqueta las salidas de compilación, claims, benchmark, marcos regulatorio y tecnológico en un brief accionable donde cada ángulo referencia su hallazgo. Usar como cierre de todo análisis de lead.
---

# Hermes-Advisor-Brief (marca blanca)

> El "empaquetador" de la familia: sin él, los otros skills entregan análisis
> sueltos. Su regla de oro es la trazabilidad — un brief cuyos ángulos no
> referencian hallazgos es opinión con formato, y se rechaza.

## Objetivo

Convertir el análisis completo en la herramienta con la que el asesor ENTRA a la
entrevista: ángulos de venta anclados a evidencia, hipótesis a validar
rankeadas, riesgos y temas sensibles, preguntas recomendadas y siguiente paso.
El brief no añade información nueva: **selecciona, prioriza y traza**.

## Entradas (las salidas de la familia)
- `hermes-source-compilation`: perfil, servicios, claims, fuentes (y sus huecos).
- `hermes-claims-audit`: tabla de claims interrogados + preguntas sugeridas.
- `hermes-competitive-deep-research`: comparativa + lecturas de analista.
- `hermes-regulatory-scan`: dictamen + matriz declarado-vs-esperado.
- `hermes-tech-stack-scan`: madurez + oportunidades de automatización.

## Flujo
1. **Ángulos de venta** (3–5): cada uno nace de un hallazgo concreto y lo
   referencia ("el vacío EDI de severidad alta del tech-scan" → ángulo de
   digitalización). Sin hallazgo → no hay ángulo.
2. **Hipótesis a validar, rankeadas**: primero los `vacio`/`hipotesis` de
   severidad alta de las matrices (regulatorio y tech), luego los claims
   `por_validar` de mayor implicación. Cada una con SU pregunta de entrevista.
3. **Riesgos y temas sensibles**: banderas del dictamen, claims inconsistentes,
   opacidad regulatoria — con guía de tacto (cómo preguntarlo sin acusar).
4. **Preguntas recomendadas**: la lista corta (≤8) que cubre las hipótesis top;
   una pregunta que no valida nada no entra.
5. **Siguiente paso**: uno, concreto, derivado del estado del caso.
6. **Salud del análisis**: qué bloques vienen de mock/parciales, qué fuentes no
   se leyeron — el asesor sabe sobre qué piso pisa.

## Reglas no negociables
- Trazabilidad total: cada ángulo/hipótesis/riesgo referencia el hallazgo del
  que sale; el brief sin trazabilidad se rechaza.
- El brief hereda las etiquetas — jamás promueve una hipótesis a hecho por
  necesidad narrativa.
- Prioriza por severidad × valor de venta, no por orden de aparición.
- Cabe en una lectura de 3 minutos: si no cupo, sobra análisis sin seleccionar.
- La salud del análisis (mock/parcial/fuentes no leídas) SIEMPRE visible.

## Contrato de evidencia (heredado por toda la familia)
- Toda afirmación es `hecho | hipotesis | recomendacion`; hecho sin evidencia → degradado.
- Procedencia visible (`observado | inferido | mock`) y fuente por ítem.
- Fallo declarado, nunca oculto. Retroalimentación a conocimiento solo en modo `PROPOSED`.

## Estado de implementación en la fábrica
- **Implementado** en meeting-copilot: bloque brief del caso (ángulos, hipótesis,
  riesgos, preguntas, temas sensibles, siguiente paso), reutilizado en el
  Prompter del modo asesor, Guided Meeting y CRM notes (`briefContexto`), con
  export MD. El ranking explícito por severidad de las matrices (paso 2) entra
  con los cruces cuando estén cableados.
- **Uso manual**: correr la familia completa y cerrar SIEMPRE con este skill —
  un análisis sin brief es trabajo sin entregar.
