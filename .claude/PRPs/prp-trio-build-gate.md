# PRP-012: El gate `build` del trío funciona sobre worktrees (turbopack vs node_modules compartido)

> **Estado**: PENDIENTE (esperando aprobación de la dueña)
> **Fecha**: 2026-07-18
> **Proyecto**: businessos — departamento software (trío + enjambre)
> **Origen**: Fase 4 del PRP-011 (dogfood real). Con el tsconfig ya acotado (PR #70), el gate
> `build` es el ÚLTIMO eslabón que impide al trío aprobar una tarea real. Ver
> `.claude/memory/reference/trio-build-turbopack-nodemodules.md`.

---

## Objetivo

Que el gate `build` del Supervisor (`npm run build` = `next build`) **pase sobre un worktree
del trío** cuando el código es correcto, en vez de fallar siempre por un choque de infraestructura.
Con eso, el trío puede por fin **aprobar** una tarea (hoy rechaza todo aunque el código esté bien).

## Por Qué

| Problema | Impacto |
|----------|---------|
| El gate `build` falla SIEMPRE en runtime por un choque entre `node_modules` compartido (dir padre del worktree, PRP-007) y `turbopack.root=__dirname` (next.config, PRP-004): Next no encuentra `next/package.json` fuera de su root; el symlink tampoco (Turbopack lo rechaza: *"points out of the filesystem root"*). | El trío **no puede aprobar NINGUNA tarea** que pase por el gate `build`, por buena que sea. El departamento software está efectivamente bloqueado para trabajo real. |

**Valor**: desbloquea el trío para producir software aprobado — el cierre real de todo el arco
Fase 6/7/PRP-011. Sin esto, uid 1000 + 2G + scope acotado quedan validados pero el trío sigue
sin poder decir "aprobado" una sola vez.

## Qué

### Criterios de Éxito
- [ ] `npm run build` pasa (exit 0) sobre un worktree del trío con un scaffold correcto,
      **verificado en el contenedor del Supervisor** (cero tokens, sin quemar GLM).
- [ ] Se preserva (o se decide explícitamente revertir) la optimización de `node_modules`
      compartido del enjambre (PRP-007); si se revierte, medir el costo en tiempo/disco por tarea.
- [ ] No se rompe el fix de `turbopack.root` para dev normal (PRP-004: no re-anidar
      `.next/standalone` por el package-lock huérfano de $HOME).
- [ ] Un dogfood real (GLM, tarea `clamp` bien formada) llega a **veredicto `aprobado`**
      (o rechazado por una razón legítima de código, NUNCA por infra) — con OK de la dueña (tokens).
- [ ] Los otros 3 gates siguen verdes (typecheck ya acotado por PR #70; lint; tests).

### Comportamiento Esperado
Idéntico desde afuera. El único cambio es que el entorno de build del worktree resuelve `next`
y compila. Sin cambios de contrato A2A ni de datos.

---

## Contexto

### Estado actual (verificado 2026-07-18, dogfood Fase 4)
- Gate: `reglas/software.toml` → `build` = `comando` `npm run build`, `timeout_s=600`. Corre en
  el contenedor del Supervisor, cwd = el worktree.
- Worktrees: `/workspace/worktree/<task_id>` (git worktree de `origin/master`). `node_modules` +
  `package.json` COMPARTIDOS en el PADRE `/workspace/worktree/` (PRP-007, resolución upward de Node).
- `next.config.ts`: `turbopack.root = __dirname`, `outputFileTracingRoot = __dirname`,
  `output: 'standalone'` (PRP-004: un package-lock huérfano en $HOME hacía inferir mal el root).
- Error observado: `next build` → *"We couldn't find the Next.js package from the project
  directory: .../<task>/src/app ... files outside of the project directory will not be compiled"*.
  Symlinkear `node_modules` dentro del worktree → `TurbopackInternalError: Symlink node_modules is
  invalid, it points out of the filesystem root`.
- Ya arreglado y fuera de este PRP: `typecheck` (PR #70, tsconfig acotado al scaffold), OOM (PR #69,
  2G), uid 1000 (PR #68).

### Opciones (a validar en Fase 1, todas cero-tokens en el contenedor)
- **(b) `turbopack.root` configurable → el padre en el trío [CANDIDATA LÍDER].** En `next.config.ts`:
  `turbopack.root = process.env.TURBOPACK_ROOT || __dirname` (ídem `outputFileTracingRoot`). El
  gate corre con `TURBOPACK_ROOT=/workspace/worktree` (el padre, donde vive `node_modules`); el app
  del worktree es un subdir del root → Next resuelve módulos desde el padre y compila el app.
  Preserva el node_modules compartido; una línea + el env del gate. Riesgo: confirmar que `next
  build` compila bien con root=ancestro y cwd=worktree.
- **(d) `node_modules` real por worktree con hardlinks (`cp -al`).** `turbopack.root=__dirname` se
  queda; el worktree tiene `node_modules` de archivos REALES (mismos inodes) → Turbopack lo acepta
  (no es symlink). Rápido y de poco disco. Cambio en `workspace.py` (prep del worktree). Riesgo:
  overhead del hardlink de un árbol grande por tarea.
- **(a) `npm ci` real por worktree.** Aislamiento perfecto pero revierte la optimización del
  enjambre (minutos + disco por tarea). Fallback pesado.
- **(c) Gate por tipo de tarea.** Un task de utilidad pura (p.ej. `clamp`) no necesita `next
  build`; solo tasks que tocan la app Next. El skill/contrato declararía qué gates aplican, o el
  Supervisor los infiere por los archivos cambiados. Es lo más "correcto" a largo plazo pero el
  cambio más grande (clasificación de tareas + contrato de gates) y con riesgo de saltarse un gate
  necesario. Candidato para una mejora aparte, no para el fix mínimo.

### Archivos probables a tocar
- `next.config.ts` (opción b), o `businessos/ejecutor-a2a/workspace.py` (opción d), o
  `businessos/supervisor-a2a/{gates.py, reglas/software.toml}` (opción c). NO tocar los frontends.

---

## Blueprint (Assembly Line)

### Fase 1: Elegir el mecanismo (cero tokens)
**Objetivo**: validar en el contenedor del Supervisor, sobre un worktree desechable de
`origin/master` con un scaffold correcto, cuál opción hace pasar `npm run build`.
**Validación**: probar (b) primero (env `TURBOPACK_ROOT=/workspace/worktree` + patch de
next.config en el worktree) → `next build` exit 0. Si no, probar (d) (`cp -al`). Registrar cuál
funcionó y su costo. (Mismo patrón de validación in-container que usé para el tsconfig, sin GLM.)

### Fase 2: Implementar el mecanismo elegido
**Objetivo**: aplicar el fix en el repo/servicio correcto y desplegarlo (rebuild/redeploy según
toque; recordar: el server construye desde el snapshot `/home/hermes/repo/businessos`).
**Validación**: `npm run build` exit 0 sobre un worktree nuevo, en runtime.

### Fase 3: Dogfood real (con OK de la dueña — tokens)
**Objetivo**: una tarea `clamp` bien formada (misma que Fase 4 de PRP-011) llega a **veredicto**.
**Validación**: veredicto `aprobado` (o rechazo legítimo de CÓDIGO, no de infra); los 4 gates
verdes; worktree owned 1000, 0 objetos root, token_usage con fila, fetch host verde; limpiar el
worktree/tarea después. Verificar `EJECUTOR_ENGINE` antes (ver [[trio-motor-real-y-huerfanas]]).

### Fase 4: Doctrina
**Objetivo**: cerrar el arco. Aprendizajes en este PRP + memoria; marcar el trío como capaz de
aprobar. Si se eligió (c), documentar la política de gates por tipo de tarea.

---

## 🧠 Aprendizajes (Self-Annealing)

*(vacío — PRP aún no ejecutado)*

---

## Gotchas

- [ ] **Dos fixes previos chocan**: turbopack.root=__dirname (PRP-004) vs node_modules compartido
      (PRP-007). No romper ninguno: cualquier cambio a next.config debe seguir evitando el
      re-anidado de `.next/standalone` en dev normal.
- [ ] **Turbopack rechaza symlinks de node_modules** ("points out of the filesystem root") — la
      opción "symlink al padre" NO es viable (ya probada y descartada).
- [ ] **Validar en el contenedor, cero tokens**, ANTES de cualquier dogfood con GLM (el dogfood
      cuesta ~54k tokens/tarea). El build in-container reproduce el fallo sin motor.
- [ ] **Deploy = rebuild del snapshot** del server (`/home/hermes/repo/businessos`), no editar
      volumen. Si el fix toca un servicio (workspace.py/gates.py), su Dockerfile/COPY debe
      incluir el cambio (gotchas 2026-07-08/07-10).
- [ ] **`npm run build` masking**: `sh -c "npm run build | tail"` devuelve el exit de `tail`, no
      del build. Capturar el exit real (`npm run build >log 2>&1; echo $?`).

## Anti-Patrones
- NO tocar los frontends (`businessos/frontends/*`) para "arreglar el build": el gate debe pasar
  sobre el SCAFFOLD, no obligar a que el monorepo entero compile.
- NO revertir el node_modules compartido (opción a) sin medir antes si (b)/(d) resuelven con menos
  costo.
- NO dar por bueno con un dogfood: el fix se valida primero in-container (cero tokens); el dogfood
  es la confirmación final, no la prueba principal.
- NO saltarse un gate para "pasar" (si se hace (c), es por diseño explícito y auditable, no un hack).

---

*PRP PENDIENTE de aprobación. No se ha modificado código. Los prerequisitos (uid 1000, 2G,
tsconfig acotado) ya están en master (PR #68/#69/#70).*
