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
COMMITS=$(git -C "$REPO_DIR" rev-list --count "origin/master..$RAMA" 2>/dev/null || echo "?")
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
