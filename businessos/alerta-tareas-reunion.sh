#!/usr/bin/env bash
# Alerta de tareas de reunion por vencer/vencidas (Fase 10).
# Lee el snapshot tareas_reunion_due.json (lo genera snapshot-tareas-reunion.py, que
# corre justo antes en el mismo cron), y por cada tarea pendiente con fecha_limite <=
# manana manda UN push por Telegram a la dueña vía `hermes send` de negocio (sin LLM,
# reusa credenciales del gateway) y, si el canal_sugerido de la tarea mapea a un canal
# Slack YA conocido (ver businessos/negocio/slack-config-fragment.yaml), tambien ahi.
#
# NOTA DE DISEÑO (para revisar): el brief de esta feature asumia que ya existia un cron
# de Telegram que avisa "PRs pendientes" y que este job solo lo extendia. Se revisaron
# nightly-jobs.sh, weekly-jobs.sh, COMO-RETOMAR.md (tabla de crons) y todo el repo: ese
# notificador NO existe (los 4 crons documentados son nightly/weekly/backup/alerta-
# presupuesto). Este script es NUEVO, calcado del patron de alerta-presupuesto.sh (mismo
# host-job+snapshot, mismo `hermes send`), no una extension de algo preexistente.
#
# Dedupe: un flag por (reunion_id, id_tarea, fecha_limite): avisa UNA vez por tarea/fecha
# (si se reingesta la reunion con una fecha_limite distinta, vuelve a avisar).
# Cron sugerido: 5 8 * * * (justo despues de snapshot-tareas-reunion.py a las 08:00; el
# nightly de las 03:10 ya publicaria el snapshot antes si se decide moverlo ahi).
# Uso: alerta-tareas-reunion.sh [--dry-run]
set -uo pipefail

ELISA="telegram:7022378429"
STATE=/home/hermes/state
LOG=/home/hermes/logs/host-jobs.log
DRY="${1:-}"

# Canales Slack YA confirmados (Channel ID real, bot invitado), ver
# businessos/negocio/slack-config-fragment.yaml. Canales sugeridos por el prompt de
# ingesta que AUN no tienen Channel ID confirmado (#alertas, #presupuesto) se dejan solo
# en Telegram hasta que alguien invite al bot y anote el ID ahi (no se inventa aqui).
declare -A CANAL_A_SLACK_ID=(
  ["#dep-negocio"]="C0BG28N7E6Q"
  ["#dep-legal"]="C0BH2RKA8QG"
  ["#reuniones"]="C0BH84H1HBR"
)

mkdir -p "$STATE" /home/hermes/logs

SNAP=$(docker exec -u hermes hermes-negocio cat /opt/data/workspace/tareas_reunion_due.json 2>/dev/null) || {
  echo "=== $(date -Is) alerta-tareas-reunion: sin snapshot (¿negocio caido, o snapshot-tareas-reunion.py no ha corrido?) ===" >> "$LOG"; exit 0; }

# El python solo TRANSFORMA (json -> lineas pipe-delimited); cero llamadas de red/credenciales.
LINEAS=$(python3 - <<PY
import json
d = json.loads('''$SNAP''')
for t in d.get("tareas", []):
    partes = [t.get("reunion_id",""), t.get("id",""), t.get("fecha_limite") or "",
              t.get("tarea","").replace("|","/"), t.get("responsable") or "sin dueno",
              t.get("canal") or "", "1" if t.get("vencida") else "0"]
    print("|".join(partes))
PY
) || { echo "=== $(date -Is) alerta-tareas-reunion: snapshot ilegible ===" >> "$LOG"; exit 0; }
LINEAS=$(printf '%s' "$LINEAS" | tr -d '\r')  # defensa: algunos python en Windows emiten CRLF en print()

if [ -z "$LINEAS" ]; then
  exit 0  # nada por vencer/vencido ahora mismo
fi

ENVIADAS=0
while IFS='|' read -r REUNION_ID TAREA_ID FECHA TAREA RESP CANAL VENCIDA; do
  [ -z "$REUNION_ID" ] && continue
  FLAG="$STATE/tarea-reunion-${REUNION_ID}-${TAREA_ID}-${FECHA}.sent"
  if [ -e "$FLAG" ]; then
    continue  # ya se avisó esta tarea con esta fecha
  fi

  PREFIJO="Vence"
  [ "$VENCIDA" = "1" ] && PREFIJO="⚠️ Vencida"
  MSG="${PREFIJO} ${FECHA}: '${TAREA}', responsable: ${RESP} (${REUNION_ID})"

  if [ "$DRY" = "--dry-run" ]; then
    echo "=== $(date -Is) alerta-tareas-reunion DRY-RUN: $MSG ===" >> "$LOG"
    echo "DRY-RUN OK: $MSG"
    continue
  fi

  OK=1
  if docker exec hermes-negocio hermes send -t "$ELISA" "$MSG" >/dev/null 2>&1; then
    OK=0
  fi
  SLACK_ID="${CANAL_A_SLACK_ID[$CANAL]:-}"
  if [ -n "$SLACK_ID" ]; then
    docker exec hermes-negocio hermes send -t "slack:${SLACK_ID}" "$MSG" >/dev/null 2>&1 || true
  fi

  if [ "$OK" = "0" ]; then
    touch "$FLAG"
    ENVIADAS=$((ENVIADAS + 1))
    echo "=== $(date -Is) alerta-tareas-reunion: ENVIADA ${REUNION_ID}/${TAREA_ID} (canal=${CANAL:-telegram-only}) ===" >> "$LOG"
  else
    echo "=== $(date -Is) alerta-tareas-reunion: FALLO el envio de ${REUNION_ID}/${TAREA_ID} ===" >> "$LOG"
  fi
done <<< "$LINEAS"

[ "$DRY" != "--dry-run" ] && echo "alerta-tareas-reunion: $ENVIADAS enviada(s)."
exit 0
