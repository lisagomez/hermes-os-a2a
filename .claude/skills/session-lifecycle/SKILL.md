---
name: session-lifecycle
description: |
  Gestiona el ciclo de vida completo de una sesión de trabajo: inicio (verificación
  de estado vivo vs. documentado) y cierre (routing a los 4 documentos vivos del
  repo + kickoff prompt efímero + gate checks + push por PR).

  Usa esta skill siempre que el usuario pida:

  INICIO DE SESIÓN:
  - "inicia sesión" / "session start" / "arranca sesión" / "comienza sesión"
  - "verifica el estado" / "check status" / "qué hay pendiente"
  - "retoma el trabajo" / "dónde quedamos" / "resume session"
  - Al inicio de cualquier conversación nueva sobre el proyecto

  CIERRE DE SESIÓN:
  - "cierra sesión" / "actualiza los docs" / "documenta la sesión"
  - "registra lo que hicimos" / "genera kickoff" / "genera handoff"
  - Cualquier mención de guardar/registrar/documentar el trabajo de la sesión actual
  - Al final de una sesión larga cuando hay cambios significativos sin documentar

  También aplica proactivamente cuando detectas breakpoints naturales:
  feature shipped y pusheado, blocker que impide avanzar, contexto pesado por
  tokens acumulados.
metadata:
  author: agent
  version: "1.0-hermes-os-a2a"
  adapted_from: "AI BOSS/.claude/skills/session-lifecycle (v2.0, based_on Claude Code Field Manual 2026-04-10)"
---

# Session Lifecycle — Disciplina de Sesión Completa

Este skill gestiona dos momentos críticos de cada sesión de trabajo: el inicio
(verificar estado real antes de actuar) y el cierre (documentar en los lugares
correctos + generar puente para la próxima sesión).

Principio fundamental: **el agente tiene amnesia entre sesiones. Este skill
construye el puente.**

> **Nota de procedencia:** esta es una **adaptación**, no una copia literal, de la
> skill `session-lifecycle` de otro proyecto (AI BOSS/Business OS). El mecanismo
> general (verificar-antes-de-actuar, kickoff efímero, gate checks) es portable;
> lo que se adaptó es el DÓNDE persiste cada cosa, porque **este repo ya tenía su
> propio ritual de cierre** (`.claude/memory/feedback/mantener-docs-vivas.md`,
> feedback de Elisa 2026-06-28) que apunta a 4 documentos reales — no a un
> `HANDOFF_ANTIGRAVITY.md` que aquí no existe. Y el flujo de push del original
> (`git push origin main` directo) viola la regla dura de este repo: `master`
> está protegida, todo pasa por rama + PR (ver `CONTRIBUTING.md` y el aprendizaje
> "Autorización PERMANENTE de la dueña" de `CLAUDE.md`, 2026-07-18). Si en algún
> momento este repo cambia de convención (nuevo doc de handoff, nueva política de
> push), esta skill debe re-adaptarse — no re-copiarse desde el origen.

---

## Modo A: Session Start

Trigger: inicio de sesión, verificación de estado, retomar trabajo.

El objetivo es que nunca actúes basándote en suposiciones. Verifica contra la
realidad antes de proponer cualquier acción. (Si la sesión necesita además
contexto de NEGOCIO — qué es el proyecto, features, estado de BD — invoca
primero o en paralelo la skill `primer`; `session-lifecycle` cubre el estado
de REPO/sesión, no lo duplica.)

### Paso 1 — Leer estado documentado

1. Lee la cola de `CLAUDE.md` §"Aprendizajes (Auto-Blindaje Activo)" — las entradas
   más recientes son el estado real más actualizado de gotchas/decisiones técnicas.
2. Lee las últimas líneas de `DECISIONES.md` (bitácora append-only de decisiones).
3. Lee `.claude/memory/MEMORY.md` (índice) y sigue los memory files relevantes a
   la tarea que se retoma (`.claude/memory/project/*.md` para iniciativas activas).
4. Si existe un kickoff prompt pegado por el usuario (ver Paso 3.5 más abajo),
   úsalo como fuente primaria — es más fresco que cualquier doc.

### Paso 2 — Verificar estado live

Ejecuta estos checks y compara contra lo documentado:

```bash
# Estado del repo
git status
git log --oneline -10
git branch --show-current

# ¿Master local está sincronizada con origin?
git fetch origin master --quiet && git log --oneline master..origin/master | head -5

# Ramas y PRs abiertos
git branch -a
gh pr list --state open

# Servicios (si el trabajo de la sesión los toca — no correr por rutina)
docker compose -f businessos/docker-compose.yml ps 2>/dev/null || echo "docker no disponible desde aquí"
```

### Paso 3 — Detectar discrepancias

Compara estado live vs documentado. Flagea cualquier diferencia:
- Archivos modificados o commits nuevos no reflejados en `CLAUDE.md`/`DECISIONES.md`
- PRs abiertos que ya deberían estar mergeados, o viceversa
- `master` local desactualizada respecto a `origin/master` (ver el incidente de
  75 commits atrás del 2026-07-19 — puede pasar)
- Ramas huérfanas de trabajo anterior sin PR ni limpieza
- Servicios que el handoff anterior daba por vivos y no responden

### Paso 4 — Reportar al usuario

Presenta un reporte conciso:

```
ESTADO ACTUAL: [una línea — healthy/issues detected]

DESDE ÚLTIMA SESIÓN:
· [cambios detectados vs lo documentado en CLAUDE.md/DECISIONES.md/memoria]

PENDIENTE (de la memoria/kickoff anterior):
· [tareas pendientes rankeadas]

DISCREPANCIAS:
· [diferencias entre documentado y realidad, o "ninguna"]

RECOMENDACIÓN:
· [qué hacer primero, basado en prioridad]
```

Confía en el estado live sobre las memorias. Cada claim documentado es una
hipótesis hasta que se verifica contra git/servicios reales — coherente con
el aprendizaje de este repo "una rutina documentada no es una rutina aplicada"
(`CLAUDE.md`, 2026-07-12).

---

## Modo B: Session End

Trigger: fin de sesión, cerrar sesión, documentar sesión.

El cierre produce **tres outputs**, ninguno de ellos un archivo `HANDOFF` nuevo:
1. Actualización de los documentos vivos que correspondan (routing, no un solo destino)
2. Kickoff prompt efímero en el chat (puente — próxima sesión; NUNCA se guarda como archivo)
3. Gate checks de cierre (calidad) antes de cualquier push

### Paso 1 — Analizar la sesión

Revisa el historial de la conversación actual y extrae:

**Lo que cambió:**
- Archivos creados o modificados (con propósito breve)
- Bugs corregidos (causa raíz + fix)
- Decisiones tomadas (y el POR QUÉ — lo no obvio es lo valioso)
- Features implementadas o avanzadas
- PRs abiertos/mergeados, ramas creadas

**Pendientes nuevos:**
- Tareas identificadas pero no hechas
- Bloqueantes conocidos (técnicos o que requieren decisión humana)

### Paso 2 — Routing a los 4 documentos vivos (regla `mantener-docs-vivas`)

Solo actualiza lo que corresponda — no todos los cambios tocan los 4:

| Qué pasó en la sesión | Dónde va | Regla |
|---|---|---|
| Un error resuelto cuyo fix debe blindarse para no repetirse (aplica a >1 feature) | `CLAUDE.md` §"Aprendizajes (Auto-Blindaje Activo)" | Entrada con fecha, Error/Fix/Aplicar en |
| Una decisión de negocio/arquitectura/infra cerrada | `DECISIONES.md` | Una línea append-only: fecha \| qué \| por qué \| estado \| puntero al detalle |
| Un aprendizaje específico de UNA feature/iniciativa | `.claude/memory/project/<tema>.md` (+ línea en `MEMORY.md`) | Ver estructura de `memory-manager` |
| Corrección de comportamiento del agente o preferencia confirmada | `.claude/memory/feedback/<tema>.md` | Ver estructura de `memory-manager` |
| Vertical pasa a viva / cambia de fase del roadmap / KPI alcanzado | `businessos/ROADMAP.md` + "Próximos Pasos" de `BUSINESS_LOGIC.md` | Tachar completado, no reescribir historia |
| **SIEMPRE, en todo cierre con cambios de estado** (pedido de Elisa 2026-07-28) | `README.md` raíz (§"Estado actual") **y** `businessos/ROADMAP.md` | Revisarlos aunque "no parezca" que tocan: el README se congela en silencio |

**Qué NO hacer** (heredado del original, sigue aplicando):
- No reescribir secciones históricas de ningún doc — solo agregar y tachar
- No inventar detalles que no surgieron en la conversación
- No incluir credenciales, tokens o secrets en ningún doc
- No crear un `HANDOFF.md`/`HANDOFF_ANTIGRAVITY.md` nuevo — ya existen los 4 destinos de arriba
- **No commitear jamás** la capa personal/financiera de Johann si aparece en la sesión
  (ver `nunca-commitear-docs-privados` en la memoria de este workspace) — eso vive
  fuera del repo, nunca en ninguno de los 4 documentos vivos

### Paso 3 — Generar Kickoff Prompt Efímero

Después de actualizar los docs que correspondan, genera un bloque de código
fenced que el usuario puede copiar-pegar al inicio de la próxima sesión. Todos
los campos son obligatorios ("ninguno" es valor válido, campo vacío no):

```
STATUS: [una línea — en qué estado está el proyecto/feature ahora mismo]

LAST SESSION:
· [qué se logró — bullet list, específico]
· [commits hechos, PRs abiertos/mergeados, archivos cambiados]

IN FLIGHT:
· [qué está a medias — archivo, branch, PR#, estado]
· [si nada, decir "clean slate"]

BLOCKERS:
· [qué necesita decisión humana o acción externa — ej. "PR #98 esperando merge"]
· [si ninguno, decir "ninguno"]

NEXT CANDIDATES: // ranked por prioridad, con scope estimado
1. [máxima prioridad]
2. [segunda opción]
3. [tercera opción]

DOCS ACTUALIZADOS ESTA SESIÓN:
· [cuáles de los 4 documentos vivos se tocaron, o "ninguno"]

GATE CHECKS:
· [checklist del Paso 4, completados esta sesión]

SESSION NOTES:
· [lo que la próxima sesión debe saber que no cabe arriba]
· [dead ends explorados, sorpresas, decisiones diferidas]
```

Este kickoff prompt es EFÍMERO — vive en el chat, su vida útil es exactamente
una sesión. Nunca lo guardes como archivo del repo (para eso están los 4
documentos vivos del Paso 2).

### Paso 4 — Gate Checks de Cierre

Antes de proponer un push, ejecuta esta checklist silenciosamente. Si algo
falla, corrígelo antes de continuar:

- [ ] ¿Se actualizó alguno de los documentos vivos que correspondía? (Paso 2)
- [ ] ¿README.md (§Estado actual) y ROADMAP reflejan el estado tras esta sesión?
      (SIEMPRE se revisan — pedido de Elisa 2026-07-28)
- [ ] ¿Las decisiones quedaron con el WHY, no solo el what?
- [ ] ¿Hay memories que crear/actualizar basadas en lo aprendido esta sesión?
- [ ] ¿El working tree está limpio (`git status` sin cambios sueltos que deban
      commitearse o descartarse deliberadamente)?
- [ ] Si hubo cambios de código: ¿`npm run typecheck`, `npm run lint` (si existe)
      y `npm run build` pasan en el/los paquete(s) tocado(s)?
- [ ] ¿Ningún documento vivo ni commit contiene cifras de la capa personal/
      financiera de Johann ni secretos/tokens? (grep antes de commitear —
      ver `nunca-commitear-docs-privados`)

Si detectas que una memory debe crearse (gotcha descubierto, decisión
arquitectónica, corrección del usuario), créala ANTES del push.

### Paso 5 — Push (SIEMPRE por rama + PR, nunca directo a master)

Este repo tiene `master` protegida. **Jamás** `git push origin master` directo,
tampoco desde este skill. Flujo real de este repo (`CONTRIBUTING.md` + `CLAUDE.md`):

```bash
cd [ruta del repo o subpaquete tocado]
git checkout -b <tipo>/<slug-de-la-sesión>   # feat/ fix/ docs/ chore/ según corresponda
git add <rutas explícitas — nunca -A/. si hay archivos privados/sueltos cerca>
git commit -m "<tipo>(<scope>): <resumen en una línea>

<cuerpo si hace falta el WHY>

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push -u origin <rama>
gh pr create --base master --title "..." --body "..."
```

El **merge** a `master` sigue la autorización permanente documentada en
`CLAUDE.md` (2026-07-18): el agente puede ejecutarlo con el procedimiento de
bypass (bajar `required_approving_review_count` a 0 → merge → restaurar a 1
de inmediato → verificar) — pero por defecto, **deja el PR abierto y pregunta
al usuario** si esta sesión concreta pidió cierre autónomo o prefiere revisar
antes. No asumas la autorización solo porque existe.

Confirma al usuario con:
1. Rama y hash del commit, y el link del PR (o del merge si se ejecutó)
2. Qué documentos vivos se actualizaron (lista corta)
3. El kickoff prompt efímero en un bloque de código copiable

### Handoff Proactivo

No esperes a que el usuario pida el cierre. Cuando detectes:
- Un feature se completó y se pusheó (PR abierto o mergeado)
- Un blocker impide avanzar sin decisión humana
- El contexto se está poniendo pesado (muchas herramientas, tokens acumulados)
- Un breakpoint natural en el trabajo

...recomienda proactivamente: "Recomiendo cerrar sesión aquí. Este es el
resumen:" y ejecuta el Modo B. La eficiencia de tokens es responsabilidad del
agente, pero el cierre nunca es silencioso — siempre se menciona al usuario
qué docs se tocaron (heredado de `mantener-docs-vivas`).

---

## Criterio de calidad

Un buen cierre de sesión permite que alguien que nunca vio esta sesión pueda:
1. Entender qué funciona y qué no en 2 minutos (leyendo `CLAUDE.md`/`DECISIONES.md`/memoria — no un archivo nuevo que aprender)
2. Saber exactamente cuál es el siguiente paso (kickoff prompt)
3. No repetir trabajo ya hecho ni tomar decisiones ya tomadas
4. Arrancar la próxima sesión con un solo paste del kickoff prompt
5. Confirmar que nada privado ni secreto quedó commiteado

Si el routing a los documentos vivos + el kickoff prompt cumplen esos 5
criterios, el cierre está bien.
