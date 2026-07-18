#!/usr/bin/env bash
# Alert VISIBLE si el master del trío se congela (2026-07-18).
# Contexto: el cron `git fetch` del host refresca origin/master del repo del trío
# (/home/hermes/trio/hermes-os-a2a). Si ese fetch falla, origin/master deja de avanzar
# y el trío construye sobre código VIEJO — en silencio (el fallo solo iba a host-jobs.log,
# que nadie lee; así estuvo congelado ~24h el 2026-07-18). Este job cierra ese agujero.
#
# Cómo: compara el master REAL de GitHub (`git ls-remote`, read-only, NO escribe objetos ni
# sufre el bug de permisos root/hermes) contra el origin/master LOCAL del server. Si difieren
# más de THRESHOLD (default 30 min = 6 fetches perdidos), manda UN aviso por Telegram a la
# dueña vía `hermes send` de negocio (reusa credenciales del gateway; sin tokens en el host).
# Re-avisa cada REALERT (6h) mientras siga roto; se auto-silencia solo al recuperarse.
#
# Cron sugerido: */10 * * * *  (el fetch corre cada 5 min; con 30 min de gracia = 6 intentos).
# Uso: alerta-fetch-trio.sh [--dry-run]
#   Hooks de prueba (env): FORCE_REMOTE=<sha>  fuerza el sha "de GitHub" para simular desfase;
#                          FETCH_ALERT_THRESHOLD=<seg>  baja la gracia.
set -uo pipefail

REPO=/home/hermes/trio/hermes-os-a2a
ELISA="telegram:7022378429"
STATE=/home/hermes/state/fetch-trio.state
LOG=/home/hermes/logs/host-jobs.log
THRESHOLD="${FETCH_ALERT_THRESHOLD:-1800}"   # 30 min
REALERT=21600                                # 6 h
DRY="${1:-}"

mkdir -p /home/hermes/state /home/hermes/logs
NOW=$(date +%s)
log() { echo "=== $(date -Is) alerta-fetch-trio: $* ===" >> "$LOG"; }

# master REAL de GitHub (read-only; hermes tiene la llave que usa el fetch)
if [ -n "${FORCE_REMOTE:-}" ]; then
  REMOTE="$FORCE_REMOTE"
else
  REMOTE=$(git -C "$REPO" ls-remote origin refs/heads/master 2>>"$LOG" | awk '{print $1}')
fi
if [ -z "$REMOTE" ]; then
  log "no pude consultar GitHub (ls-remote vacío) — sin veredicto"   # no falso-alarmar
  exit 0
fi
LOCAL=$(git -C "$REPO" rev-parse origin/master 2>>"$LOG")

# Sano: local == GitHub. Limpia estado y sale.
if [ "$REMOTE" = "$LOCAL" ]; then
  [ -e "$STATE" ] && { rm -f "$STATE"; log "recuperado (origin/master al día: ${LOCAL:0:7})"; }
  exit 0
fi

# Desfasado. Arranca/continúa el temporizador por-sha.
PREV_SHA=""; FIRST="$NOW"; LAST_ALERT=0
if [ -e "$STATE" ]; then read -r PREV_SHA FIRST LAST_ALERT < "$STATE" 2>/dev/null || true; fi
if [ "$PREV_SHA" != "$REMOTE" ]; then FIRST="$NOW"; LAST_ALERT=0; fi   # commit nuevo → reinicia reloj
ELAPSED=$(( NOW - FIRST ))
MINS=$(( ELAPSED / 60 ))

if [ "$ELAPSED" -ge "$THRESHOLD" ] && [ $(( NOW - LAST_ALERT )) -ge "$REALERT" ]; then
  MSG="🔴 Master del trío CONGELADO ~${MINS} min: el servidor tiene ${LOCAL:0:7} pero GitHub ya va en ${REMOTE:0:7}. El fetch del host debe estar fallando → el trío está construyendo sobre código viejo. Revisa ~/logs/host-jobs.log (permisos de .git/objects)."
  if [ "$DRY" = "--dry-run" ]; then
    echo "DRY-RUN: $MSG"; log "DRY-RUN: $MSG"
  elif docker exec hermes-negocio hermes send -t "$ELISA" "$MSG" >/dev/null 2>&1; then
    LAST_ALERT="$NOW"; log "ENVIADA (desfase ${MINS}min, local ${LOCAL:0:7} vs github ${REMOTE:0:7})"
  else
    log "FALLO el envío del aviso (¿negocio caído?)"
  fi
else
  log "desfasado ${MINS}min (< ${THRESHOLD}s o ya avisado); vigilando"
fi

echo "$REMOTE $FIRST $LAST_ALERT" > "$STATE"
