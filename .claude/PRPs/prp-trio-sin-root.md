# PRP-011: El trío corre como uid 1000 (no root)

> **Estado**: PENDIENTE (esperando aprobación de la dueña)
> **Fecha**: 2026-07-18
> **Proyecto**: businessos — departamento software (trío + enjambre)
> **Origen**: sesión 2026-07-18 (fetch del master congelado 24h por objetos root en `/repo/.git`).
> Ver `.claude/memory/reference/trio-fetch-root-objects.md`.

---

## Objetivo

Que los tres contenedores del trío (`ejecutor-a2a`, `supervisor-a2a`, `coordinador-a2a`)
corran como un usuario **no-root con uid 1000** (el mismo `hermes` del host), en vez de root.
Un único escritor sobre `/repo` y `/workspace` elimina de raíz el choque de permisos que
congeló el master, y de paso **retira tres hacks** que hoy existen sólo porque corren como root.

## Por Qué

| Problema (hoy, por correr como root) | Se elimina al correr como uid 1000 |
|--------------------------------------|-------------------------------------|
| Los contenedores escriben objetos `root:root` en el `.git` **compartido** de `/repo`; el cron `git fetch` del host (uid 1000/hermes) no puede escribir → fetch muere en silencio, master se congela, el trío construye sobre código viejo (pasó 24h el 2026-07-18). | Contenedor y host escriben con la **misma identidad** (uid 1000) → cero choque. |
| `IS_SANDBOX=1` en ejecutor y coordinador existe **sólo** porque el CLI de Claude Code *rehúsa `--dangerously-skip-permissions` como root*. | Como no-root el CLI lo acepta → `IS_SANDBOX` pierde su razón (cleanup opcional). |
| `git config --system --add safe.directory '*'` en las 3 imágenes existe porque el bind-mount llega con uid del host ≠ root del contenedor ("dubious ownership"). El `'*'` es además olorcillo de seguridad. | El contenedor **es** uid 1000 = dueño del mount → sin dubious ownership → se puede quitar. |

**Valor**: cierra en la fuente el bug de master-congelado (no sólo lo monitorea), y baja la
deuda de la superficie más crítica (la que escribe código sobre master). Rollback de una línea
por servicio.

**Nota**: el fix ya aplicado en runtime (`core.sharedRepository=group` + setgid + el alert
`alerta-fetch-trio.sh`) **se queda como piso de seguridad**: es inofensivo y hace la transición
más segura (aunque falle algo, el master no se vuelve a congelar en silencio). Este PRP es el
arreglo *de raíz* que vuelve redundante —no obligatorio— ese piso.

## Qué

### Criterios de Éxito
- [ ] `docker exec ejecutor-a2a id` (y supervisor/coordinador) → `uid=1000`.
- [ ] Los 3 servicios arrancan `healthy` con `--profile trio` tras rebuild.
- [ ] Un worktree creado por el contenedor queda **owned 1000:1000**; `git status`/`git add`
      dentro NO dan "dubious ownership" (con `safe.directory '*'` ya removido).
- [ ] Los 4 gates del Supervisor corren (build/typecheck/lint/test) sobre un worktree de prueba
      = **ejecutables** (no `no_ejecutable`), desde el contenedor, con cero tokens.
- [ ] El motor real (GLM-5.2 o Anthropic) del Ejecutor arranca **sin `IS_SANDBOX=1`** (o, si
      lo necesita por otra razón, se documenta y se conserva).
- [ ] Dogfood real de una feature chica: worktree owned 1000, gates verdes, `token_usage`
      registrado, integración limpia.
- [ ] Tras el dogfood, `find /repo/.git/objects -user root` → **0** objetos nuevos root
      (la causa raíz del fetch congelado desaparece).
- [ ] El cron `git fetch` del host sigue verde después de una corrida del trío.

### Comportamiento Esperado
Idéntico al de hoy desde afuera (mismos endpoints, mismo protocolo A2A, mismos gates y
veredictos). El único cambio observable es interno: quién es el dueño de los archivos que el
trío escribe. Ningún cambio de contrato, de red ni de datos.

---

## Contexto

### Estado actual (verificado 2026-07-18)
- Las 3 imágenes: `FROM python:3.12-slim`, **sin `USER`**, HOME=`/root`, `WORKDIR /app`.
- Cada Dockerfile trae `RUN git config --system --add safe.directory '*'`.
- `ejecutor`/`coordinador`: `npm i -g @anthropic-ai/claude-code` (el motor escribe en `$HOME/.claude`).
- `supervisor`: `PLAYWRIGHT_BROWSERS_PATH=/ms-playwright` con browsers instalados en build
  (owned root, 755 → legibles; sólo se **leen** en runtime salvo re-descarga por mismatch de versión).
- Compose: los 3 con `IS_SANDBOX=1` (ejecutor/coordinador), `TRIO_REPO=/repo`,
  `TRIO_WORKSPACE=/workspace`, volúmenes `trio-workspace:/workspace` (named volume, nace root)
  y `${TRIO_REPO_HOST}:/repo` (bind-mount, host uid 1000).
- Server: `/repo` = `/home/hermes/trio/hermes-os-a2a` (owned hermes:hermes uid 1000).

### Archivos a tocar
- `businessos/ejecutor-a2a/Dockerfile`, `businessos/supervisor-a2a/Dockerfile`,
  `businessos/coordinador-a2a/Dockerfile`.
- `businessos/docker-compose.yml` (bloques `ejecutor-a2a`, `supervisor-a2a`, `coordinador-a2a`).
- Volumen existente `businessos_trio-workspace` (chown one-time en el server).

### Diseño técnico
1. **Usuario en la imagen** (las 3): crear grupo+usuario uid/gid **1000** para que coincida con
   `hermes` del host (el nombre interno da igual):
   ```dockerfile
   RUN groupadd -g 1000 app && useradd -m -u 1000 -g 1000 -s /bin/bash app
   ENV HOME=/home/app
   ```
   `-m` crea `/home/app` escribible → `$HOME/.claude` (CLI) y `$HOME/.cache` (npm/playwright) funcionan.
2. **Mountpoint `/workspace` en la imagen** owned 1000 (para que un volumen *nuevo* nazca bien):
   ```dockerfile
   RUN mkdir -p /workspace && chown 1000:1000 /workspace
   ```
3. **`USER app`** al final del Dockerfile (después de todos los `apt`/`npm -g`/`pip`, que
   necesitan root en build).
4. **Supervisor `/ms-playwright`**: `chown -R 1000:1000 /ms-playwright` en build, por si un
   mismatch de versión dispara re-descarga en runtime (owned root fallaría como uid 1000).
5. **Quitar `git config --system safe.directory '*'`** de las 3 imágenes — YA NO hace falta
   (owner coincide). *Validar con `git status` en un worktree antes de confiar.*
6. **Compose**: quitar `IS_SANDBOX=1` de ejecutor y coordinador. *Si el dogfood muestra que el
   motor/planner real aún lo pide, se conserva y se documenta por qué.*
7. **Volumen existente en el server** (one-time, patrón privilegiado de la doctrina de migración):
   ```
   docker compose --profile trio down
   docker run --rm -v businessos_trio-workspace:/w alpine chown -R 1000:1000 /w
   docker compose --profile trio up -d --build
   ```
   (Alternativa si algo se enreda: borrar el volumen — los worktrees son scratch efímero; sólo
   se recuesta el `node_modules` compartido en la primera tarea.)

### Deploy (no es "editar un volumen", es rebuild)
El server construye desde `/home/hermes/repo/businessos/` (snapshot, NO git). El cambio debe
llegar ahí (vía merge a master + re-sync del snapshot, o scp de los Dockerfiles+compose) y luego
`docker compose --profile trio up -d --build`. Ver doctrina 2026-07-05 (migración) y 2026-07-08
("el compose es parte de la definición de terminado").

---

## Blueprint (Assembly Line)

### Fase 1: Imágenes no-root
**Objetivo**: los 3 Dockerfiles crean uid/gid 1000, `HOME=/home/app`, `/workspace` y
`/ms-playwright` (supervisor) owned 1000, `USER app` al final, sin `safe.directory '*'`.
**Validación**: `docker build` de las 3 OK; `docker run --rm <img> id` → uid 1000; el CLI
(`claude --version` como app) y `git` corren sin quejarse.

### Fase 2: Compose + volumen
**Objetivo**: quitar `IS_SANDBOX=1`; chown one-time del volumen `trio-workspace`; `up --build`.
**Validación**: los 3 `healthy`; `docker exec <c> id` → 1000; `docker exec <c> touch /workspace/.probe && rm` OK.

### Fase 3: Verificación estática (cero tokens)
**Objetivo**: probar filesystem+git+gates sin quemar modelo.
**Validación**:
- [ ] Crear un worktree desechable desde el contenedor → owned 1000; `git status`/`git add -A` sin "dubious ownership".
- [ ] Correr los 4 gates del Supervisor sobre ese worktree → ejecutables (no `no_ejecutable`).
- [ ] `smoke-trio/runtime.py` (protocolo A2A + escritura en `tareas`) verde.
- [ ] `git fetch` del host como hermes → rc 0; `find /repo/.git/objects -user root -newer <marca>` → 0.

### Fase 4: Dogfood real
**Objetivo**: una feature chica de punta a punta (mock engine primero = cero tokens para validar
protocolo+git+worktree; luego motor real GLM/Anthropic para un run completo).
**Validación**:
- [ ] worktree owned 1000, gates verdes, veredicto correcto, `token_usage` con fila de la tarea.
- [ ] tras la corrida: cero objetos root nuevos en `/repo/.git`; el fetch del host sigue verde.
- [ ] Criterios de Éxito cumplidos.

### Fase 5: Doctrina + limpieza
**Objetivo**: dejar la verdad escrita y el runtime coherente.
**Validación**: aprendizaje en CLAUDE.md + memoria actualizada (el fetch-root-objects pasa a
"cerrado de raíz"); decidir si el piso (sharedRepository/setgid) y el alert se conservan (sí,
como redundancia barata); PR a master con los 3 Dockerfiles + compose.

---

## 🧠 Aprendizajes (Self-Annealing)

> Crece durante la implementación.

*(vacío — PRP aún no ejecutado)*

---

## Gotchas

- [ ] **HOME es el punto de quiebre clásico.** El motor escribe en `$HOME/.claude`
      (transcripts en `$HOME/.claude/projects/*`). Sin HOME escribible como uid 1000, el motor
      muere. `-m` + `ENV HOME=/home/app` lo cubre; verificar en el dogfood, no asumir.
- [ ] **Named volume ya existe = no se re-chownea solo.** Cambiar la imagen NO re-chownea el
      volumen `trio-workspace` viejo (creado root). Hay que chownearlo a mano una vez (contenedor
      privilegiado) o recrearlo.
- [ ] **Quitar `IS_SANDBOX` es hipótesis, no certeza.** Es cierto que el CLI acepta
      `--dangerously-skip-permissions` como no-root, pero `IS_SANDBOX` podría tener otros efectos.
      Quitarlo y **validar**; si el motor se queja, restaurarlo (es inofensivo).
- [ ] **`safe.directory '*'` sólo se puede quitar si TODO git dir es owned 1000.** /repo (host
      1000) y los worktrees (creados por el contenedor uid 1000) lo son. Validar con `git status`
      en un worktree antes de confiar.
- [ ] **COPY explícito + compose = parte de "terminado"** (2026-07-08/07-10): estos cambios
      tocan Dockerfile y compose; no dar por hecho hasta rebuild + smoke en runtime.
- [ ] **El default sigue siendo mock.** El dogfood con motor real (GLM/Anthropic) es decisión
      explícita de la dueña (quema tokens). La validación estática (Fases 1-3) es cero tokens.
- [ ] **Deploy = rebuild del snapshot del server**, no editar volumen. El cambio debe llegar a
      `/home/hermes/repo/businessos/` antes del `up --build`.

## Anti-Patrones
- NO usar un uid arbitrario: DEBE ser 1000 para coincidir con `hermes` del host (si no, el
  choque de permisos sólo cambia de bando).
- NO borrar el fix shared-repository / setgid ni el alert como parte de esto: se quedan de piso.
- NO hacer `USER app` antes de los `apt/npm -g/pip` del build (fallan sin root).
- NO dar por bueno con tests de dev: este cambio se valida en runtime (dogfood), es el patrón
  recurrente "dev verde, runtime roto".

---

*PRP PENDIENTE de aprobación. No se ha modificado código de los servicios. El fix de piso
(sharedRepository + alert) ya está en runtime y es independiente de este PRP.*
