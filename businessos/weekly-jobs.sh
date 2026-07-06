#!/usr/bin/env bash
# Host-job semanal de negocio (Fase 3): salud del conocimiento del grafo.
# revisar-vigencias: reglas vencidas / cifras a cotejar (verificar:true) -> vigencias.json.
# exit 1 del script si hay reglas vencidas (queda en el log para revisarlo).
set -uo pipefail
cd /home/hermes/repo/businessos
set -a; . ./.env 2>/dev/null; set +a
mkdir -p /home/hermes/logs
{
  echo "=== $(date -Is) weekly (vigencias) inicio ==="
  python3 revisar-vigencias.py
  echo "rc=$? === $(date -Is) weekly fin ==="
} >> /home/hermes/logs/host-jobs.log 2>&1
