---
name: competencia-houston
description: Análisis competitivo de Houston (gethouston.ai) vs Hermes OS A2A; investigado 2026-07-24; sin moat estructural, brecha real en conectores multi-tenant (sin equivalente a Composio).
metadata:
  type: project
---

# Competencia - Houston (gethouston.ai)

Documento de investigación completo (4 rondas de agentes en paralelo, ~15 fuentes
primarias citadas) integrado al repo el **2026-07-24** en
`docs/competencia-houston/Competencia - Houston (gethouston.ai).md`. También ingerido
al cerebro de investigación del OPS (biblioteca compartible `cerebro-investigacion`,
fuente F373, tema `houston-ai-agentes-analisis-competitivo`).

## Qué es Houston (resumen)
App de escritorio de agentes de IA preentrenados, fundada feb-2026 por colombianos
(Felipe Salinas, Julián Arango, ex TaxFlow). Corre sobre la suscripción ChatGPT/Claude
del usuario vía OAuth de cuenta (no revende tokens propios); conecta 1000+ herramientas
vía **Composio** (plataforma de terceros que gestiona OAuth/tokens/refresh). Tracción
temprana: 1,500+ usuarios en 46 países, pilotos corporativos en Colombia, hackathon
planeado en el país.

## Hallazgos clave para decisiones de producto
- **Sin moat estructural**: motor open source (MIT), sin efectos de red aún (su Agent
  Store está vacío), sin capital confirmado, sin barrera regulatoria. Su ventaja real es
  velocidad de ejecución + costo marginal de IA ~cero + goodwill temprano en LATAM.
- **Sin cumplimiento regulatorio multi-país**: cero features fiscal/legal/contractual.
  Confirma que el grafo regulatorio de Hermes sigue siendo el foso más defendible.
- **Reclama A2A + MCP públicamente** sin Agent Card verificable; Hermes SÍ tiene A2A
  real implementado (trío Coordinador-Ejecutor-Supervisor, agent-card en
  `/.well-known/agent-card.json`).
- **Brecha real detectada en Hermes**: no existe hoy ningún equivalente a Composio (Hermes
  usa patrón host-job + snapshot, el agente nunca toca credenciales reales; sin soporte
  multi-tenant para que un cliente final conecte su propio Gmail/HubSpot/Stripe).

## Decisión pendiente (no tomada, no es fase comprometida del ROADMAP)
Si el roadmap de Hermes suma conectores multi-tenant, decidir entre construir un
"Composio propio" con el mismo aislamiento (coherente con la doctrina de scrubbing de
secretos ya establecida, gotcha 2026-06-30 de `CLAUDE.md`) vs. aceptar el patrón
agente-con-token-directo de Houston para ese caso puntual. **Candidato natural para el
skill `consejo`** (Departamento de Estrategia) cuando haya que decidir: es exactamente
el tipo de decisión abierta con tradeoffs que el filtro maestro de `consejo` pide
("¿construimos X o aceptamos Y?"), no una pregunta con respuesta única.

## Nota de indexación (por qué vive también aquí y no solo en docs/)
El Paso 1A del skill `consejo` escanea `.claude/memory/MEMORY.md` + memory files
relevantes como fuente de contexto (no escanea `docs/` por defecto). Esta nota existe
para que un futuro Consejo sobre "¿Composio propio o no?" encuentre el análisis sin que
la persona que lo convoque tenga que adjuntarlo a mano.
