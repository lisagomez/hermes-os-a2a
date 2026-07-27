---
name: hermes-regulatory-scan
description: Escaneo regulatorio de un lead (Pre-Discovery) — cruce DECLARADO vs ESPERADO contra el grafo, vacíos como hallazgo, y propuestas de seed en modo PROPUESTA. Usar al analizar el sitio de un lead o al auditar la cobertura regulatoria de un caso.
---

# Hermes-Regulatory-Scan (adaptado a la arquitectura real)

> Origen: skill "marca blanca" aportado por Victor (2026-07-27), adaptado — las
> funciones `graph_lookup/graph_expand/graph_write` del original NO existen; el
> grafo Hermes es un **motor de reglas por categoría** (seed curado + evaluador
> determinista + fail-safe `dudoso`), no un grafo de triplets. Este skill mapea
> la misma lógica a las piezas reales.

## Idea central

El dictamen normal responde *"¿lo que el lead declara es válido?"*. Este skill
añade la dirección INVERSA: dada la **clase de servicio** del lead, *¿qué marcos
ESPERA el grafo y cuáles NO declara el sitio?* **El vacío es el hallazgo** — así
se cazó sistemáticamente el caso e-AWB de GAL (un forwarder aéreo debe disparar
IATA 672 + Montreal + info anticipada aunque su sitio no diga "e-AWB").

## Flujo (implementado en `businessos/frontends/meeting-copilot/src/features/pre-discovery/`)

1. **Compilación quirúrgica** — leer TODAS las fuentes del intake (web + perfiles
   en notas) Y los enlaces internos relevantes del sitio (`/services`,
   `/compliance`, `/certifications`, `/legal`…): `html.ts::extraerEnlacesRelevantes`
   + `pipeline.ts::compilarFuentes` (máx. 2 extra, cada fuente con estado
   declarado: leída/bloqueada/error — jamás se oculta un fallo).
2. **Conceptos del dictamen** — giro + servicios + claims observados
   (`pipeline.ts::conceptosRegulatorios`) → grafo real (`/api/grafo/evaluaciones`)
   o mock fiel. Regla de oro intacta: fail-safe `dudoso` + "sin regla aplicable",
   disclaimer siempre, toda afirmación cita fuente.
3. **Cruce declarado-vs-esperado** — `escaneo-regulatorio.ts::escaneoRegulatorio`:
   sector → categorías esperadas del grafo → por cada una:
   - `evidencia`: el material lo declara Y el dictamen lo cubre con fuente.
   - `hipotesis`: señal indirecta sin categoría en el dictamen → validar en
     entrevista y regenerar.
   - `vacio`: el sector lo espera y el sitio calla → hallazgo con severidad.
   Salidas ejecutivas: **cobertura** alta/media/baja, **ALTA OPACIDAD
   REGULATORIA** (cero evidencias), **VACÍO DEL GRAFO** (sector sin categorías
   → jamás inventar marcos).
4. **Retroalimentación al grafo, SOLO en modo PROPUESTA** —
   `escaneo-regulatorio.ts::propuestasSeed` exporta JSONL (`estado: PROPOSED`,
   evidencia con URL, tipos `nueva_senal | validar_regla | nuevo_ambito`).
   Destino: revisión humana → `businessos/grafo/seed/reglas.json` →
   `gen_seed_sql.py` (gate de procedencia). **Nunca** escritura directa al grafo.

## Reglas de diseño (no negociables)

- Sector-agnóstico: las expectativas viven en el mapa `SECTORES` de
  `escaneo-regulatorio.ts` (espejo curado de categorías del seed). Ampliar un
  sector = ampliar el seed del grafo por el canal de propuestas, y reflejarlo ahí.
- Explicabilidad: inferencia sin evidencia textual = hipótesis, jamás hecho.
- Resiliencia: sector desconocido → VACÍO DEL GRAFO explícito, no marcos inventados.
- Un análisis de lead NO se cierra sin esta sección; si el sitio no declara nada
  regulatorio, decirlo y marcar ALTA OPACIDAD REGULATORIA.

## Uso manual (fuera de la app)

Al analizar un lead a mano en Claude Code: seguir los pasos 1–4 con WebFetch en
lugar del pipeline, citar fuentes verificadas (nunca de memoria para claves de
regla/URLs oficiales) y entregar las propuestas de seed como JSONL para revisión —
mismo contrato que `propuestasSeed`.
