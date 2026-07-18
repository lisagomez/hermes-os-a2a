---
name: oportunidad-seguros-carga
description: Validación de oportunidad (discovery) de seguros de carga MX como línea white-label de Hermes-os-a2a; integrada 2026-07-15, alineada a directrices 2026-07-17; gate = discovery de 30 días.
metadata:
  type: project
---

# Oportunidad — Seguros de carga MX (white-label de Hermes-os-a2a)

Documento de investigación externo (31 fuentes citadas, veredicto: **viable con
discovery de 30 días previo**) integrado al repo el **2026-07-15** en
`businessos/seguros/validacion-oportunidad-seguros-carga.md` y **alineado a las
directrices del proyecto el 2026-07-17**: mantiene el nombre **Hermes-os-a2a** (no es
un producto nuevo con marca propia), encuadre **white-label**, y el contenido quedó
recortado a los diferenciadores que aportan valor (la educación genérica de mercado se
eliminó). Es **discovery/validación**, un paso ANTES de un blueprint de producto (el
análogo son las propuestas de `ocr/`, `crm/`, `logistica/`).

## Encuadre (no cambiarlo sin discovery)
- **Línea white-label de Hermes-os-a2a**: el broker/insurtech autorizado (cédula CNSF)
  pone su marca; la fábrica pone grafo + agentes A2A + trío. NO es marketplace directo,
  NO emite pólizas, NO intermedia (fronteras negativas literales en la card, patrón
  `ventas-a2a` Fase 9).
- **Diferenciadores** (lo único que el doc argumenta): gap real sin multicotizador de
  carga en MX; grafo regulatorio con fuente citada (CNSF/LISF) como moat; comparación
  de coberturas con cláusula citada (misma disciplina que facturas/grafo); arquitectura
  A2A ya viva (lo nuevo es solo dominio); gate humano en lo irreversible.
- **Wedge MVP**: multicotizador + cockpit de recomendación, sin emisión ni siniestros
  ("acotar antes de escalar"). Agentes: intake, scoring básico, comparación acotada,
  recomendación.

## Estado y siguiente paso
- **NO es fase comprometida del ROADMAP.** Vive como oportunidad hasta pasar el gate de
  discovery (§7 del doc: 10–20 entrevistas, hipótesis, criterios seguir/pivotear/descartar).
- Si pasa: PRP reusando el patrón Fase 5/9 (servicio A2A + card con fronteras negativas)
  y el formato blueprint de `ocr/`/`crm/`.
- **Nuevo (dominio) vs reuso:** nuevo = seed regulatorio seguros MX, parser de condiciones
  generales, esquema `embarques`, motor de comparación/recomendación, datos con
  aseguradoras (el mayor riesgo de integración). Reuso = patrón A2A, grafo, trío/enjambre,
  Supabase, edge público, pipeline de adquisición, gate humano.

Aplica el feedback [[mantener-docs-vivas]]: si el discovery avanza, actualizar ROADMAP +
BUSINESS_LOGIC + esta nota.
