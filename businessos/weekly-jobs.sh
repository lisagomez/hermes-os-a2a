#!/usr/bin/env bash
# Host-jobs SEMANALES de negocio.
#  - revisar-vigencias (Fase 3): reglas vencidas / cifras a cotejar -> vigencias.json.
#  - arena-watch (PRP-002 Fase 2): señal externa gated de benchmarking -> arena-watch.json
#    SOLO si un candidato cruza el doble umbral (>25 Elo Y >=2x más barato). Independiente:
#    su fallo (mirror caído/stale) no afecta al resto; nunca cambia config ni gasta tokens.
set -uo pipefail
cd /home/hermes/repo/businessos
set -a; . ./.env 2>/dev/null; set +a
mkdir -p /home/hermes/logs
{
  echo "=== $(date -Is) weekly (vigencias) inicio ==="
  python3 revisar-vigencias.py
  echo "rc=$? === $(date -Is) weekly (vigencias) fin ==="
  echo "=== $(date -Is) weekly (arena-watch) inicio ==="
  python3 arena-watch.py
  echo "rc=$? === $(date -Is) weekly (arena-watch) fin ==="
} >> /home/hermes/logs/host-jobs.log 2>&1
