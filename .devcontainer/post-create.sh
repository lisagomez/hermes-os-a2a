#!/usr/bin/env bash
# Prepara el entorno de desarrollo remoto (Codespaces / Dev Container).
# NO arranca ninguna vertical (Telegram = 1 conexión por token) ni toca
# secretos de producción: aquí se desarrolla y se corren tests con motores mock.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

echo "▸ git: safe.directory (worktrees / bind-mounts llegan con otro uid)"
git config --global --add safe.directory "$(pwd)" || true

echo "▸ raíz Next.js (dashboard Mission Control): npm install"
npm install

echo "▸ frontends"
for d in businessos/frontends/*/; do
  if [ -f "${d}package.json" ]; then ( cd "$d" && npm install ); fi
done

echo "▸ venv compartido de los servicios A2A (python 3.12, = runtime)"
python3 -m venv businessos/.venv
businessos/.venv/bin/python -m pip install --upgrade pip
for req in businessos/*/requirements.txt; do
  echo "  · $req"
  businessos/.venv/bin/python -m pip install -r "$req"
done

echo ""
echo "✓ Entorno listo."
echo "  dashboard : npm run dev            (http://localhost:3000)"
echo "  tests     : cd businessos/<svc> && ../.venv/bin/python -m pytest -q"
echo "  ⚠ NO 'docker compose up' de negocio/personal/clientes: los bots viven en Hetzner."
