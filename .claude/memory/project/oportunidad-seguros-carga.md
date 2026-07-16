---
name: oportunidad-seguros-carga
description: Validación de oportunidad (discovery) para un SaaS agent-to-agent de seguros de carga en México; integrada al repo el 2026-07-15, encaja con grafo + trío/enjambre + adquisición.
metadata:
  type: project
---

# Oportunidad — SaaS A2A para seguros de mercancía (México)

Documento de investigación externo (31 fuentes citadas, veredicto: **viable con
discovery de 30 días previo**) integrado al repo el **2026-07-15** en
`businessos/seguros/validacion-oportunidad-seguros-carga.md`. Es **discovery/validación**,
un paso ANTES de un blueprint de producto (como los de [[cli-printing-press]] no aplica;
el análogo son las propuestas de `ocr/`, `crm/`, `logistica/`).

## Por qué encaja con Hermes OS · A2A
- **A2A-nativo:** el propio wedge (intake → scoring → comparación → recomendación) son 4
  servicios A2A que reusan el patrón vivo de `grafo-a2a`/`ventas-a2a` (card + executor).
- **Regulatorio:** CNSF, LISF, Reglamento de Agentes de Seguros → dimensión del **grafo**
  (nueva jurisdicción-dimensión MX + intermediación de seguros). La regla de oro "señala,
  no asesora, cita fuente" es exactamente lo que el §6.4 del doc pide como mitigación legal.
- **Construir:** el **trío** (Fase 6) / **enjambre** (Fase 7) lo edifican por tareas.
- **Vender:** **adquisición** (Fase 9) — pero OJO: el ICP son actores EXTERNOS
  (brokers/insurtechs/forwarders) → es línea de **producto white-label**, no departamento interno.
- **"Citar fuentes, no inventar" aplicado a coberturas:** el agente de comparación de cobertura
  interpreta condiciones generales (PDF) y DEBE citar la cláusula, no alucinar cobertura —
  misma disciplina que facturas/grafo.

## Estado y siguiente paso
- **NO es fase comprometida del ROADMAP.** Vive como oportunidad hasta pasar el gate de
  discovery (§9 del doc: 10–20 entrevistas, hipótesis, criterios seguir/pivotear/descartar).
- Si pasa: escribir un PRP reusando el patrón Fase 5/9 (servicio A2A + card con fronteras
  negativas literales: "no intermedia, no cierra pólizas, no asesora en nombre de la aseguradora").
- **Nuevo (dominio) vs reuso:** nuevo = seed regulatorio seguros MX, parser de condiciones
  generales, esquema `embarques`, motor de comparación/recomendación, datos con aseguradoras
  (el mayor riesgo de integración, §6.3). Reuso = patrón A2A, grafo, trío/enjambre, Supabase,
  edge público, pipeline de adquisición, gate humano.

Aplica el feedback [[mantener-docs-vivas]]: si el discovery avanza, actualizar ROADMAP +
BUSINESS_LOGIC + esta nota.
