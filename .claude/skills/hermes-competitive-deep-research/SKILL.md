---
name: hermes-competitive-deep-research
description: Deep research REAL de competidores del sector de un lead (marca blanca, Pre-Discovery) — competidores verificados con fuentes vivas, confianza por competidor y lectura de analista por dimensión; "no identificado con confianza" es salida válida. Usar para el bloque de benchmark de cualquier caso.
---

# Hermes-Competitive-Deep-Research (marca blanca)

> Origen: corrección de Victor en el dogfood GAL (2026-07-26) — el benchmark no
> hacía deep research del sector real del lead (salían nombres plausibles, no
> competidores verificados). Sector-agnóstico: cambia el sector, no el método.

## Objetivo

Benchmark de competidores REALES del lead — no un listado de memoria del modelo.
Cada competidor existe (URL viva verificada), compite de verdad en el mismo
espacio (confianza declarada) y aporta una **lectura de analista**, no un dump.

## Entradas
- Perfil del lead ya compilado (sector, servicios, geografía, segmento) — sale
  de `hermes-source-compilation`; sin perfil, el benchmark no arranca.

## Flujo
1. **Definir el espacio competitivo** desde lo observado (no desde el nombre del
   giro a secas): ej. GAL no compite con "logística" en general sino con
   *time-critical / hand carry / charter en México*.
2. **Buscar de verdad** (búsqueda web / `:online`): candidatos por sub-segmento
   y geografía; descartar los que solo comparten industria.
3. **Verificar cada candidato**: URL viva, servicios reales leídos de SU sitio,
   señal de presencia en la geografía del lead. Sin verificación → fuera o
   `confianza: baja` explícita.
4. **Comparativa por dimensión** (posicionamiento, servicios, diferenciadores,
   madurez): para cada una, qué hace el lead vs el campo Y una **lectura** ("los
   grandes 3PL no van a construir foco vertical; ahí cabe el lead") — la lectura
   es `hipotesis`/`recomendacion`, nunca se disfraza de hecho.
5. **Declarar el método**: qué se buscó, qué se leyó, qué quedó fuera y por qué.

## Reglas no negociables
- Cero competidores inventados: cada uno con URL verificada en esta corrida (no
  de memoria — los sitios mueren y los modelos alucinan empresas).
- "Competencia no identificada con confianza suficiente" es una salida VÁLIDA y
  preferible a rellenar la tabla.
- `confianza` por competidor responde: ¿compite con ESTE lead o solo está en el
  sector? Ambigüedad → baja.
- Los datos de terceros son de SUS sitios/fuentes públicas — citar de dónde.

## Contrato de evidencia (heredado por toda la familia)
- Toda afirmación es `hecho | hipotesis | recomendacion`; hecho sin evidencia → degradado.
- Procedencia visible (`observado | inferido | mock`) y fuente por ítem.
- Fallo declarado, nunca oculto. Retroalimentación a conocimiento solo en modo `PROPOSED`.

## Estado de implementación en la fábrica
- **Implementado (parcial)** en meeting-copilot: seam `PREDISCOVERY_ONLINE=1`
  (el bloque competencia analiza con sufijo `:online` = investigación web del
  modelo), tabla comparativa con lecturas de analista, y el caso GAL lleva deep
  research curado a mano con fuentes verificadas (fixtures).
- **Uso manual**: pasos 1–5 con WebSearch/WebFetch; entregar tabla + lecturas +
  sección de método. Es el modo de mayor calidad hoy — el seam `:online` no
  sustituye la verificación por-competidor del paso 3.
