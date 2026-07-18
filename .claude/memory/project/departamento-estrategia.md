# Departamento de Estrategia + skill `consejo`

Integrado 2026-07-16. Instrumento del departamento de decisiones de la fábrica.

## Qué es

- Skill **`consejo`** en `.claude/skills/consejo/` (aportado por la dueña, `skillconsejo.md`):
  somete una DECISIÓN real a un Consejo de 5 asesores con lentes que chocan (Contrarian,
  Primeros Principios, Expansionista, Forastero, Ejecutor) + peer-review anónimo + síntesis del
  Chairman. Metodología LLM Council de Karpathy, reimplementada con subagentes `Task`.
- Departamento definido en `businessos/departamentos/estrategia.md`.
- Cableado en `CLAUDE.md`: árbol de decisión + tabla (skill #16) + estructura.

## Decisiones de encuadre

- **Corre SOLO en Claude Code**, NUNCA en Hermes (usa subagentes/ruteo de modelos; mismo patrón
  que Printing Press / cli-audit). Lo convoca una persona del equipo, no el bot de Slack.
- **Asesora, no decide ni aprueba.** La aprobación sigue la matriz de [[equipo-remoto-gobernanza]]
  / `equipo-y-slack.md` (CEO config, CFO dinero, PM cara-a-cliente, firmar = solo humano).
- **Ruteo:** asesores/revisores en Sonnet 5 `med`, Chairman en Opus 4.8/Fable `high` (nunca `max`).
- **Fit del repo:** el skill menciona `orquestar-agentes`/`factory-brain` (metodología V5) que NO
  existen aquí → el Paso 6 usa `memory-manager` (existe) y CLAUDE.md hace de disciplina de ruteo.
  El skill se instaló **verbatim** (artefacto de la dueña, no reescrito).

## Cuándo usarlo

Solo decisiones abiertas de negocio/estrategia **caras o irreversibles** (alcance de producto,
pricing, pivote, contrato grande, posición de marca). NO para datos, creación, ni decisiones
triviales/reversibles. No confundir con red-team adversarial (plan técnico ya formulado).

Rama de trabajo: `feature/design-system-cliente-web2` (mismo pase que el frontend web2).
