#!/usr/bin/env bash
# publicar-rama.sh — publica en GitHub la rama de una tarea APROBADA por el Supervisor.
#
# POR QUE EXISTE: el trio (Ejecutor/Supervisor/Coordinador) trabaja en un worktree del
# clon local y su llave de GitHub es de SOLO LECTURA — por diseno NO puede publicar nada.
# Al terminar, la rama `tarea/<task_id>` vive solo en el servidor y el equipo no puede
# revisarla. Este es el eslabon que cierra el circulo, con el patron de siempre:
#
#   *** EL JOB DEL HOST TIENE LA CREDENCIAL. EL AGENTE NO. ***
#
# El agente puede PEDIR que se publique (o la dueña lo corre), pero la llave de escritura
# vive en ~/.ssh del usuario hermes, fuera de los contenedores: el trio no puede empujar
# aunque quisiera, y menos a master.
#
# USO:   ./publicar-rama.sh <task_id> [--dry-run]
#
# GARANTIAS (fail-safe, en este orden):
#   1. Solo publica si `tareas.estado == 'aprobada'` (el veredicto del Supervisor, leido
#      de Supabase). Rechazada/escalada/en_ejecucion => NO publica. Sin fila => NO publica.
#   2. NUNCA empuja master/main. Ni por parametro, ni por accidente.
#   3. No hace merge, no abre el PR por ti, no despliega: deja la rama y te da el link.
#      Abrir/aprobar/mergear el PR es HUMANO (matriz de roles: eso lo aprueba el Developer).
set -uo pipefail

REPO_DIR="${TRIO_REPO_DIR:-/home/hermes/trio/hermes-os-a2a}"
ENV_FILE="${TRIO_ENV_FILE:-/home/hermes/repo/businessos/.env}"
REMOTE="${PUBLISH_REMOTE:-publish}"          # remote con la llave de ESCRITURA (solo el host)
GH_REPO="${GH_REPO:-lisagomez/hermes-os-a2a}"
LOG="${TRIO_LOG:-/home/hermes/logs/host-jobs.log}"

TASK_ID="${1:-}"
DRY="${2:-}"
[ -z "$TASK_ID" ] && { echo "uso: $0 <task_id> [--dry-run]" >&2; exit 2; }

mkdir -p "$(dirname "$LOG")"
log() { echo "$(date -Is) publicar-rama[$TASK_ID]: $*" | tee -a "$LOG"; }

RAMA="tarea/$TASK_ID"
case "$RAMA" in
  tarea/master|tarea/main|master|main) log "ABORTADO: no se publica master/main."; exit 1;;
esac

set -a; . "$ENV_FILE" 2>/dev/null; set +a
: "${SUPABASE_URL:?falta SUPABASE_URL en $ENV_FILE}"
: "${SUPABASE_SERVICE_ROLE_KEY:?falta SUPABASE_SERVICE_ROLE_KEY en $ENV_FILE}"

# --- 1) el veredicto manda: leer el estado de la tarea (jamas confiar en quien lo pide) ---
ESTADO=$(python3 - "$TASK_ID" <<'PY'
import json, os, sys, urllib.request, urllib.parse
task_id = sys.argv[1]
base = os.environ["SUPABASE_URL"].rstrip("/")
key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
q = urllib.parse.urlencode({"task_id": f"eq.{task_id}", "select": "estado,objetivo"})
req = urllib.request.Request(
    f"{base}/rest/v1/tareas?{q}",
    headers={"apikey": key, "Authorization": f"Bearer {key}",
             # Cloudflare devuelve 1010 al User-Agent por defecto de urllib (aprendizaje 2026-07-02)
             "User-Agent": "curl/8.0"},
)
try:
    with urllib.request.urlopen(req, timeout=20) as r:
        filas = json.load(r)
except Exception as exc:                       # sin respuesta => no publicamos (fail-safe)
    print(f"ERROR|{exc}")
    raise SystemExit(0)
if not filas:
    print("SIN_FILA|la tarea no existe en la tabla `tareas`")
else:
    print(f"{filas[0]['estado']}|{filas[0].get('objetivo','')[:80]}")
PY
)
VEREDICTO="${ESTADO%%|*}"; DETALLE="${ESTADO#*|}"

if [ "$VEREDICTO" != "aprobada" ]; then
  log "NO SE PUBLICA — estado='$VEREDICTO' ($DETALLE). Solo se publica lo APROBADO por el Supervisor."
  exit 1
fi
log "estado=aprobada · objetivo: $DETALLE"

# --- 2) la rama debe existir en el clon (la creo el Ejecutor en su worktree) ---
git -C "$REPO_DIR" show-ref --verify --quiet "refs/heads/$RAMA" || {
  log "ABORTADO: la rama '$RAMA' no existe en $REPO_DIR (¿el Ejecutor no la creo?)"; exit 1; }

# --- 2b) COMMITEAR el trabajo aprobado (2026-07-12) -------------------------------------
# NADIE commitea en el trio: el Ejecutor solo hace `git add -A` para CALCULAR el diff, y el
# Supervisor juzga el working tree. El trabajo aprobado se queda staged, sin commit — asi que
# esta rama se publicaba VACIA (`mission-control-2026-0001`: 0 commits, 0 archivos) y encima se
# anunciaba en Slack como publicada. Antes solo "funcionaba" cuando el modelo commiteaba por su
# cuenta: el circuito dependia del capricho del motor. Lo commitea el host, que es de confianza.
WT="/workspace/worktree/$TASK_ID"                    # el worktree vive en el volumen del Ejecutor
CONTENEDOR="${TRIO_EJECUTOR:-ejecutor-a2a}"
if [ "$DRY" = "--dry-run" ]; then
  log "DRY-RUN: no se commitea nada (el commit del trabajo aprobado se hace al publicar)."
elif docker exec "$CONTENEDOR" test -d "$WT" 2>/dev/null; then
  if ! docker exec "$CONTENEDOR" git -C "$WT" diff --quiet HEAD 2>/dev/null; then
    MSG="feat($TASK_ID): $DETALLE"
    # El commit puede FALLAR (p. ej. worktree huerfano: su `.git` es un puntero a
    # `/repo/.git/worktrees/<id>` ya podado -> "fatal: not a git repository"; tambien
    # cazado por el `git diff` de arriba, que ante ese error sale != 0 y entra aqui).
    # Antes se logueaba "commiteado" PASE LO QUE PASE y luego se abortaba confuso
    # ("no tiene commits"): un fallo invisible que mentia. Ahora se comprueba el
    # resultado y se ABORTA honesto (fail-safe: no se publica ni se anuncia nada).
    if COMMIT_OUT=$(docker exec "$CONTENEDOR" sh -c \
        "cd '$WT' && git add -A && git -c user.email='trio@hermes-os' -c user.name='Trio (Ejecutor)' commit -q -m \"\$1\"" \
        _ "$MSG" 2>&1); then
      log "trabajo aprobado commiteado en '$RAMA'"
    else
      [ -n "$COMMIT_OUT" ] && printf '%s\n' "$COMMIT_OUT" >> "$LOG"
      log "ABORTADO: no se pudo commitear el trabajo en '$WT' (worktree roto o .git colgante: ${COMMIT_OUT:-sin detalle}). No se publica ni se anuncia."
      exit 1
    fi
  else
    log "worktree sin cambios pendientes (ya estaba commiteado)"
  fi
else
  log "AVISO: worktree $WT no accesible en '$CONTENEDOR'; se publica lo que tenga la rama"
fi

COMMITS=$(git -C "$REPO_DIR" rev-list --count "origin/master..$RAMA" 2>/dev/null || echo "0")
# Fail-safe: una rama vacia NO se publica y NO se anuncia. Publicar la nada y avisar al equipo
# de que hay algo que revisar es MENTIR (paso el 2026-07-12 y el link llevaba a un diff vacio).
if [ "$COMMITS" = "0" ] || [ "$COMMITS" = "?" ]; then
  log "ABORTADO: '$RAMA' no tiene commits sobre master (nada que publicar). No se anuncia nada."
  exit 1
fi
log "rama '$RAMA' lista ($COMMITS commits sobre master)"

# --- 3) publicar (nunca merge, nunca master) ---
if [ "$DRY" = "--dry-run" ]; then
  log "DRY-RUN: se publicaria '$RAMA' en $GH_REPO. No se empuja nada."
  exit 0
fi
if ! git -C "$REPO_DIR" push -u "$REMOTE" "$RAMA" 2>&1 | tee -a "$LOG"; then
  log "FALLO el push (¿remote '$REMOTE' con llave de escritura configurado?)"; exit 1
fi
URL="https://github.com/$GH_REPO/compare/$RAMA?expand=1"
log "PUBLICADA · abre el PR aqui: $URL"

# --- 4) avisar al equipo en #dep-desarrollo (si hay token; el bot no toca esta llave) ---
SLACK_TOKEN=$(sudo grep -E "^SLACK_BOT_TOKEN=" /home/hermes/businessos/negocio/.hermes/.env 2>/dev/null | cut -d= -f2-)
CANAL="${SLACK_DEV_CHANNEL:-C0BGL2DMNLB}"   # #dep-desarrollo
if [ -n "${SLACK_TOKEN:-}" ]; then
  TEXTO=":package: Rama publicada de la tarea *$TASK_ID* (aprobada por el Supervisor): <$URL|abrir el PR>. El merge lo aprueba un humano."
  curl -s -X POST https://slack.com/api/chat.postMessage \
    -H "Authorization: Bearer $SLACK_TOKEN" -H "Content-type: application/json; charset=utf-8" \
    -d "$(python3 -c 'import json,sys;print(json.dumps({"channel":sys.argv[1],"text":sys.argv[2]}))' "$CANAL" "$TEXTO")" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); print("aviso a Slack:", "ok" if d.get("ok") else d.get("error"))' | tee -a "$LOG"
fi
