#!/usr/bin/env bash
# slack-piloto.sh — host-job de la MAQUINA RUNTIME: cablea Slack (Socket Mode)
# en la vertical negocio. Piloto acotado a #dep-negocio (equipo-y-slack.md §c).
#
# Prerrequisitos (los hace la dueña en api.slack.com/apps; NUNCA pegar tokens
# en un chat): app creada, Socket Mode ON (xapp-, scope connections:write),
# Bot Token Scopes + Event Subscriptions de la doc (ver equipo-y-slack.md),
# app instalada (xoxb-), bot invitado a #dep-negocio, Messages Tab habilitado.
#
# Uso:  ./slack-piloto.sh
# Idempotente: si el bloque platforms.slack ya existe, no lo duplica.

set -euo pipefail

VOL="${HOME}/businessos/negocio/.hermes"
ENV_FILE="$VOL/.env"
CONFIG="$VOL/config.yaml"
FRAGMENT="$(dirname "$0")/negocio/slack-config-fragment.yaml"

echo "== 1/4 verificando tokens en el .env del volumen (sin imprimirlos) =="
[ -f "$ENV_FILE" ] || { echo "ERROR: no existe $ENV_FILE"; exit 1; }
for var in SLACK_BOT_TOKEN SLACK_APP_TOKEN SLACK_ALLOWED_USERS; do
  if ! grep -q "^${var}=..*" "$ENV_FILE"; then
    echo "ERROR: falta ${var} en $ENV_FILE (agregarlo a mano, perms 600)."
    echo "  SLACK_ALLOWED_USERS = Member IDs (U…) separados por coma: SIN esta"
    echo "  variable el gateway rechaza TODO por diseño (doc oficial)."
    exit 1
  fi
done
# Formato esperado, sin volcar el valor: xoxb- / xapp-
grep -q "^SLACK_BOT_TOKEN=xoxb-" "$ENV_FILE" || echo "AVISO: SLACK_BOT_TOKEN no empieza con xoxb- (¿token correcto?)"
grep -q "^SLACK_APP_TOKEN=xapp-" "$ENV_FILE" || echo "AVISO: SLACK_APP_TOKEN no empieza con xapp- (Socket Mode requiere xapp-)"
chmod 600 "$ENV_FILE" || true
echo "   tokens presentes."

echo "== 2/4 verificando el fragmento =="
[ -f "$FRAGMENT" ] || { echo "ERROR: no existe $FRAGMENT"; exit 1; }
if grep -q "C_REEMPLAZA" "$FRAGMENT"; then
  # El Channel ID también puede venir del .env (SLACK_CHANNEL_ID=C…): así la
  # dueña solo toca UN archivo y el piloto corre sin ediciones manuales.
  CH_ID=$(grep "^SLACK_CHANNEL_ID=" "$ENV_FILE" | cut -d= -f2 | tr -d "[:space:]")
  if [ -n "${CH_ID:-}" ] && case "$CH_ID" in C*) true;; *) false;; esac; then
    TMP_FRAGMENT=$(mktemp)
    sed "s/C_REEMPLAZA_DEP_NEGOCIO/$CH_ID/g" "$FRAGMENT" > "$TMP_FRAGMENT"
    FRAGMENT="$TMP_FRAGMENT"
    echo "   Channel ID tomado de SLACK_CHANNEL_ID del .env (sin imprimirlo entero)."
  else
    echo "ERROR: el fragmento aun trae el placeholder C_REEMPLAZA_DEP_NEGOCIO."
    echo "  Opcion A: agrega SLACK_CHANNEL_ID=C… al .env del volumen (recomendado)."
    echo "  Opcion B: pon el ID real en el fragmento (canal → View details → Channel ID)."
    exit 1
  fi
fi

echo "== 3/4 mergeando platforms.slack en config.yaml (con backup) =="
[ -f "$CONFIG" ] || { echo "ERROR: no existe $CONFIG (¿corriste el wizard?)"; exit 1; }
cp "$CONFIG" "$CONFIG.bak.$(date +%Y%m%d%H%M%S)"
python3 - "$CONFIG" "$FRAGMENT" << 'EOF'
import sys

try:
    import yaml
except ImportError:
    sys.exit("ERROR: falta pyyaml en el host (pip install pyyaml)")

config_path, fragment_path = sys.argv[1], sys.argv[2]
config = yaml.safe_load(open(config_path)) or {}
fragment = yaml.safe_load(open(fragment_path)) or {}

platforms = config.setdefault("platforms", {}) or {}
if "slack" in platforms:
    print("   platforms.slack ya existe: se REEMPLAZA con el fragmento (backup hecho).")
platforms["slack"] = fragment["platforms"]["slack"]
config["platforms"] = platforms

yaml.safe_dump(config, open(config_path, "w"), allow_unicode=True, sort_keys=False)
print("   config.yaml actualizado.")
EOF

echo "== 4/4 reiniciando hermes-negocio =="
docker compose -f "$(dirname "$0")/docker-compose.yml" restart hermes-negocio
echo
echo "LISTO. Verificacion manual: @mencionar al bot en #dep-negocio → debe"
echo "responder EN HILO. Probar tambien que un usuario FUERA de"
echo "SLACK_ALLOWED_USERS sea ignorado. Logs: docker logs -f hermes-negocio"
