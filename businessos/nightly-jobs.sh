#!/usr/bin/env bash
# Host-jobs nocturnos de negocio (Fase 1 + Fase 4). Corre como hermes, sin sudo.
# - ingest-token-usage: alimenta token_usage + snapshot presupuesto.json (lo lee el bot)
# - snapshot-pantheon:   alimenta la vista Pantheon del dashboard
set -uo pipefail
cd /home/hermes/repo/businessos
set -a; . ./.env 2>/dev/null; set +a
mkdir -p /home/hermes/logs
{
  echo "=== $(date -Is) nightly inicio ==="
  # token_usage: ayer (día completo) + hoy (parcial), en UTC. UPSERT idempotente,
  # así el conteo de cada día se completa en la corrida siguiente.
  python3 ingest-token-usage.py "$(date -u -d 'yesterday' +%F)"
  python3 ingest-token-usage.py
  # dashboard: pantheon de las verticales vivas en esta máquina
  python3 snapshot-pantheon.py
  # inyectar el presupuesto en el SOUL del bot (contexto siempre cargado; el bot no puede
  # leer archivos porque no hay Docker en el contenedor). Idempotente (bloque con marcadores).
  docker exec -i -u hermes hermes-negocio python3 - < /home/hermes/bin/inject-presupuesto.py
  echo "=== $(date -Is) nightly fin ==="
} >> /home/hermes/logs/host-jobs.log 2>&1
