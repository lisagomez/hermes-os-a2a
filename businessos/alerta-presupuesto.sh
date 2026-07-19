#!/usr/bin/env bash
# Alerta AUTOMÁTICA de presupuesto al 80% (Fase 1, residual cerrado 2026-07-08).
# Lee el snapshot presupuesto.json (lo genera ingest-token-usage.py cada noche),
# y si el gasto del mes cruzó el 80% manda UN push proactivo por Telegram a la
# dueña vía `hermes send` de negocio (sin LLM, reusa credenciales del gateway).
# Dedupe: un flag por mes en ~/state — avisa UNA vez por cruce, no cada día.
# Cron sugerido: 0 8 * * * (hora humana; el nightly de las 03:10 ya refrescó el snapshot).
# Uso: alerta-presupuesto.sh [--dry-run]
set -uo pipefail

ELISA="telegram:7022378429"
STATE=/home/hermes/state
LOG=/home/hermes/logs/host-jobs.log
DRY="${1:-}"

mkdir -p "$STATE" /home/hermes/logs

SNAP=$(docker exec -u hermes hermes-negocio cat /opt/data/workspace/presupuesto.json 2>/dev/null) || {
  echo "=== $(date -Is) alerta-presupuesto: sin snapshot (¿negocio caído?) ===" >> "$LOG"; exit 0; }

# Parsea el snapshot v2: alerta de 80% Y alerta de caché (pct_cache bajo umbral).
LINEA=$(python3 - <<PY
import json
d = json.loads('''$SNAP''')
mes = d.get("mes", "?")
alerta = int(bool(d.get("alerta_80pct")))
pct = d.get("pct_presupuesto", 0)
gasto = d.get("costo_total_usd", 0)
tope = d.get("presupuesto_usd", 0)
# Aviso de caché: la ingesta v2 pone cache_bajo_umbral={modelo,pct_cache,umbral} o null.
cb = d.get("cache_bajo_umbral") or {}
c_alerta = int(bool(cb))
c_modelo = cb.get("modelo", "")
c_pct = cb.get("pct_cache", 0)
c_umbral = cb.get("umbral", 0)
print(f"{alerta}|{mes}|{pct}|{gasto:.2f}|{tope:.0f}|{c_alerta}|{c_modelo}|{c_pct}|{c_umbral}")
PY
) || { echo "=== $(date -Is) alerta-presupuesto: snapshot ilegible ===" >> "$LOG"; exit 0; }

IFS='|' read -r ALERTA MES PCT GASTO TOPE C_ALERTA C_MODELO C_PCT C_UMBRAL <<< "$LINEA"

# --- envío deduplicado por flag mensual (helper) ---
enviar() { # $1=mensaje  $2=flag
  local msg="$1" flag="$2"
  [ -e "$flag" ] && return 0                       # ya se avisó este mes
  if [ "$DRY" = "--dry-run" ]; then
    echo "=== $(date -Is) alerta DRY-RUN: $msg ===" >> "$LOG"; echo "DRY-RUN OK: $msg"; return 0
  fi
  if docker exec hermes-negocio hermes send -t "$ELISA" "$msg" >/dev/null 2>&1; then
    touch "$flag"; echo "=== $(date -Is) alerta: ENVIADA -> $flag ===" >> "$LOG"
  else
    echo "=== $(date -Is) alerta: FALLO el envío -> $flag ===" >> "$LOG"
  fi
}

# 1) Presupuesto al 80%
if [ "$ALERTA" = "1" ]; then
  enviar "⚠️ Presupuesto de IA: vas en \$$GASTO de \$$TOPE este mes ($PCT%). Cruzaste el 80% — revisa el gasto con 'cómo va el presupuesto' o en Mission Control." "$STATE/alerta80-$MES.sent"
fi

# 2) Caché de prefijo bajo umbral (la variable que decide el costo en esta arquitectura;
#    un drop 97%→60% por churn de SOUL/MEMORY hoy solo se vería en la factura — incidente nemotron).
if [ "$C_ALERTA" = "1" ]; then
  enviar "⚠️ Caché de prefijo bajo: el modelo $C_MODELO va en $C_PCT% (umbral $C_UMBRAL%). Cada turno cuesta más — revisa si el SOUL/MEMORY cambió mucho (churn del prefijo)." "$STATE/alerta-cache-$MES.sent"
fi
