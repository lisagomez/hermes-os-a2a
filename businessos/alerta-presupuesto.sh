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

LINEA=$(python3 - <<PY
import json, sys
d = json.loads('''$SNAP''')
pct = d.get("pct_presupuesto", 0)
alerta = bool(d.get("alerta_80pct"))
mes = d.get("mes", "?")
gasto = d.get("costo_total_usd", 0)
tope = d.get("presupuesto_usd", 0)
print(f"{int(alerta)}|{mes}|{pct}|{gasto:.2f}|{tope:.0f}")
PY
) || { echo "=== $(date -Is) alerta-presupuesto: snapshot ilegible ===" >> "$LOG"; exit 0; }

IFS='|' read -r ALERTA MES PCT GASTO TOPE <<< "$LINEA"
FLAG="$STATE/alerta80-$MES.sent"

if [ "$ALERTA" != "1" ]; then
  # bajo el umbral: si el mes cambió, los flags viejos ya no estorban (se quedan como historial)
  exit 0
fi
if [ -e "$FLAG" ]; then
  exit 0  # ya se avisó este mes
fi

MSG="⚠️ Presupuesto de IA: vas en \$$GASTO de \$$TOPE este mes ($PCT%). Cruzaste el 80% — revisa el gasto con 'cómo va el presupuesto' o en Mission Control."
if [ "$DRY" = "--dry-run" ]; then
  echo "=== $(date -Is) alerta-presupuesto DRY-RUN: $MSG ===" >> "$LOG"
  echo "DRY-RUN OK: $MSG"
  exit 0
fi

if docker exec hermes-negocio hermes send -t "$ELISA" "$MSG" >/dev/null 2>&1; then
  touch "$FLAG"
  echo "=== $(date -Is) alerta-presupuesto: ENVIADA ($MES $PCT%) ===" >> "$LOG"
else
  echo "=== $(date -Is) alerta-presupuesto: FALLO el envío ===" >> "$LOG"
fi
