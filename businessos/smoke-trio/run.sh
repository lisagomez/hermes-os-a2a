#!/usr/bin/env bash
# run.sh — smoke A2A EN VIVO del trío + enjambre (Fases 6/7) en la máquina de
# desarrollo: levanta supervisor/ejecutor/coordinador con uvicorn REAL (TCP real,
# motores mock, CERO tokens, SIN docker), corre client.py y limpia.
#
# Uso:  bash businessos/smoke-trio/run.sh
# Requiere: businessos/.venv con pytest+a2a-sdk (ver reference/maquinas-entornos.md).
# NO toca Supabase (sin credenciales => estado.py es no-op, por diseño).
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOS="$(dirname "$HERE")"
VENV="$BOS/.venv/bin/python"
[ -x "$VENV" ] || { echo "falta $VENV (crea el venv, ver maquinas-entornos.md)"; exit 2; }

TMP="$(mktemp -d)"
REPO="$TMP/repo"; WS="$TMP/workspace"; TOML="$TMP/gates.toml"; LOGS="$TMP/logs"
mkdir -p "$WS" "$LOGS" "$REPO"
cleanup(){ for pid in "${PIDS[@]:-}"; do kill "$pid" 2>/dev/null; done; rm -rf "$TMP"; }
trap cleanup EXIT

# repo objetivo temporal + gates ligeros (sin npm build/playwright: son de CI/runtime)
git -C "$REPO" init -b main -q
git -C "$REPO" config user.email t@t; git -C "$REPO" config user.name t
echo app > "$REPO/README.md"; git -C "$REPO" add -A; git -C "$REPO" commit -qm init
printf 'departamento="software"\n[[gate]]\nregla="sin_any"\nrunner="estatico"\nchequeo="sin_any"\n[[gate]]\nregla="smoke"\nrunner="comando"\ncomando="git status --short"\ntimeout_s=60\n' > "$TOML"

export PYTHONPATH="$BOS/trio-contrato"
export EJECUTOR_ENGINE=mock COORDINADOR_PLANNER=mock
export TRIO_REPO="$REPO" TRIO_WORKSPACE="$WS" SUPERVISOR_REGLAS="$TOML"
export SUPERVISOR_URL="http://127.0.0.1:4200" EJECUTOR_URL="http://127.0.0.1:4100"
export EJECUTOR_PUBLIC_URL="http://127.0.0.1:4100"
export SUPERVISOR_PUBLIC_URL="http://127.0.0.1:4200"
export COORDINADOR_PUBLIC_URL="http://127.0.0.1:4300"
unset SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY

PIDS=()
( cd "$BOS/supervisor-a2a"  && exec "$VENV" -m uvicorn app:app --host 127.0.0.1 --port 4200 ) > "$LOGS/supervisor.log"  2>&1 & PIDS+=($!)
( cd "$BOS/ejecutor-a2a"    && exec "$VENV" -m uvicorn app:app --host 127.0.0.1 --port 4100 ) > "$LOGS/ejecutor.log"    2>&1 & PIDS+=($!)
( cd "$BOS/coordinador-a2a" && exec "$VENV" -m uvicorn app:app --host 127.0.0.1 --port 4300 ) > "$LOGS/coordinador.log" 2>&1 & PIDS+=($!)

for port in 4200 4100 4300; do
  for _ in $(seq 1 40); do
    [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "http://127.0.0.1:$port/health" 2>/dev/null)" = "200" ] && break
    sleep 0.5
  done
done

"$VENV" "$HERE/client.py"; RC=$?
[ $RC -ne 0 ] && for f in "$LOGS"/*.log; do echo "### $(basename "$f")"; tail -15 "$f"; done
exit $RC
