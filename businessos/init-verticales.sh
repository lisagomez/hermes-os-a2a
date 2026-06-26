#!/usr/bin/env bash
# init-verticales.sh — Fase 0, pasos 6 y 7 automatizados.
# Correr como el usuario 'hermes' desde ~/businessos, DESPUÉS de tener
# docker-compose.yml, .env y las carpetas personal/ negocio/ clientes/ con sus
# SOUL.md, AGENTS.md y MEMORY.md ya copiados.
#
#   cd ~/businessos && bash init-verticales.sh
#
# Lanza el wizard de cada vertical (interactivo) y luego copia los archivos de
# persona (SOUL/AGENTS/MEMORY) a cada volumen. El wizard te pedirá proveedor,
# modelo, token de Telegram y allowlist por cada vertical.

set -euo pipefail

BASE="$HOME/businessos"
# Tag pineado (verificado en Docker Hub a 2026-06-26). Revisa releases por uno
# mas nuevo: github.com/NousResearch/hermes-agent/releases. No uses :latest/:main.
IMG="nousresearch/hermes-agent:v2026.6.19"
VERTICALES=("personal" "negocio" "clientes")
ARCHIVOS=("SOUL.md" "AGENTS.md" "MEMORY.md")

cd "$BASE"

for v in "${VERTICALES[@]}"; do
  echo ""
  echo "============================================================"
  echo " WIZARD: $v"
  echo " Proveedor: OpenRouter | Modelo: uno barato | Telegram: token de $v"
  echo "============================================================"
  mkdir -p "$BASE/$v/.hermes"
  docker run -it --rm -v "$BASE/$v/.hermes:/opt/data" "$IMG" setup
done

echo ""
echo "==> Copiando SOUL.md / AGENTS.md / MEMORY.md a cada volumen..."
faltantes=0
for v in "${VERTICALES[@]}"; do
  for f in "${ARCHIVOS[@]}"; do
    if [ -f "$BASE/$v/$f" ]; then
      cp "$BASE/$v/$f" "$BASE/$v/.hermes/$f"
      echo "    $v/$f  → volumen"
    else
      echo "    AVISO: falta $v/$f (cópialo antes de levantar el stack)"
      faltantes=$((faltantes + 1))
    fi
  done
done

echo ""
if [ "$faltantes" -gt 0 ]; then
  echo "============================================================"
  echo " ATENCIÓN: faltan $faltantes archivo(s). Cópialos y vuelve a correr"
  echo " este script (o cópialos a mano) ANTES de 'docker compose up -d'."
  echo "============================================================"
  exit 1
fi

echo "============================================================"
echo " LISTO. Ahora levanta el stack:"
echo "   docker compose up -d"
echo "   docker compose ps"
echo " Luego prueba cada bot por Telegram (paso 8 de FASE0.md)."
echo "============================================================"
