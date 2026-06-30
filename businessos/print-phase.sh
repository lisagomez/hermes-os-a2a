#!/usr/bin/env bash
# print-phase.sh — Generación automática de CLIs por fase para BusinessOS.
#
# Lee cli-manifest.yaml y, para la fase indicada, prepara las instrucciones de
# impresión de cada CLI. Printing Press corre dentro de Claude Code (comando
# /printing-press), así que este script tiene dos modos:
#
#   --plan   (default): imprime el plan — qué CLIs, en qué orden, con qué comando.
#                       No ejecuta nada. Seguro de correr siempre.
#   --emit   : genera un archivo de prompts listo para pegar/alimentar a un
#              agente de Claude Code que tenga Printing Press instalado.
#
# Uso:
#   ./print-phase.sh 0-1            # plan de la fase 0-1
#   ./print-phase.sh 3 --emit       # genera prompts para imprimir los CLIs de fase 3
#
# Requiere: yq (https://github.com/mikefarah/yq) para leer el YAML.
#   instalar: sudo snap install yq   (o brew install yq)

set -euo pipefail

MANIFEST="$(dirname "$0")/cli-manifest.yaml"
PHASE="${1:-}"
MODE="${2:---plan}"

if [ -z "$PHASE" ]; then
  echo "Uso: $0 <fase> [--plan|--emit]"
  echo "Fases disponibles:"
  yq '.phases | keys | .[]' "$MANIFEST" | sed 's/^/  - /'
  exit 1
fi

if ! command -v yq >/dev/null; then
  echo "ERROR: falta 'yq'. Instala con: sudo snap install yq  (o brew install yq)"
  exit 1
fi

LABEL=$(yq ".phases.\"$PHASE\".label" "$MANIFEST")
COUNT=$(yq ".phases.\"$PHASE\".clis | length" "$MANIFEST")
MODE_DEFAULT=$(yq '.defaults.mode' "$MANIFEST")
MIN_GRADE=$(yq '.defaults.min_grade' "$MANIFEST")

if [ "$LABEL" = "null" ]; then
  echo "No existe la fase '$PHASE' en el manifiesto."
  exit 1
fi

echo "============================================================"
echo " Fase $PHASE — $LABEL"
echo " $COUNT CLI(s) a imprimir · modo $MODE_DEFAULT · grado mínimo $MIN_GRADE"
echo "============================================================"

EMIT_FILE="/tmp/printing-press-fase-$PHASE.txt"
[ "$MODE" = "--emit" ] && : > "$EMIT_FILE"

for i in $(seq 0 $((COUNT - 1))); do
  NAME=$(yq ".phases.\"$PHASE\".clis[$i].name" "$MANIFEST")
  SRC=$(yq ".phases.\"$PHASE\".clis[$i].source" "$MANIFEST")
  WHY=$(yq ".phases.\"$PHASE\".clis[$i].why" "$MANIFEST")
  NOTE=$(yq ".phases.\"$PHASE\".clis[$i].note // \"\"" "$MANIFEST")

  CMD="/printing-press $NAME $MODE_DEFAULT"

  echo ""
  echo "  [$((i + 1))/$COUNT] $NAME  ($SRC)"
  echo "      para: $WHY"
  [ -n "$NOTE" ] && echo "      nota: $NOTE"
  echo "      comando en Claude Code:  $CMD"

  if [ "$MODE" = "--emit" ]; then
    {
      echo "# $NAME — $WHY"
      echo "$CMD"
      echo ""
    } >> "$EMIT_FILE"
  fi
done

echo ""
if [ "$MODE" = "--emit" ]; then
  echo "============================================================"
  echo " Prompts escritos en: $EMIT_FILE"
  echo " Ábrelo en Claude Code (con Printing Press instalado) y corre cada uno."
  echo " O dile a un agente Hermes: 'imprime los CLIs de este archivo, uno por uno,"
  echo " verificando grado $MIN_GRADE antes de pasar al siguiente'."
  echo "============================================================"
else
  echo "Plan mostrado. Para generar los prompts ejecutables:  $0 $PHASE --emit"
fi
