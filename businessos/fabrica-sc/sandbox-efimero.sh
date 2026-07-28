#!/usr/bin/env bash
# sandbox-efimero.sh — nodo Fabric EFÍMERO para el gate de red efímera (PRP-013 F5/F6).
#
# Decisión de la dueña (2026-07-28): la línea CX barata ($6.49/mes) está agotada
# en Hetzner y lo disponible cuesta 3.5× ($22.99/mes) — en vez de un nodo fijo,
# el sandbox se CREA, corre el gate y se DESTRUYE (facturación por hora: ~$0.04
# por corrida). Red efímera en nodo efímero.
#
# Reglas duras:
#  - El nodo se destruye SIEMPRE (trap EXIT), incluso si el gate falla: un
#    huérfano a $23/mes es el fallo silencioso clásico. `status` audita huérfanos.
#  - El token HCLOUD vive SOLO en la máquina de dev (~/.config/claude/secrets.env);
#    jamás viaja al sandbox ni al servidor principal.
#  - Go 1.24.5 con el MISMO checksum pineado que el Dockerfile del Supervisor.
#
# Uso (desde dev, con secrets.env sourceado por .bashrc):
#   ./sandbox-efimero.sh smoke               # ciclo completo sin gate: crea →
#                                            #   fabric up/down → destruye (~15 min)
#   ./sandbox-efimero.sh gate <task_id>      # gate real: trae el paquete del server
#                                            #   principal, corre verificar-red-efimera
#                                            #   (escribe contratos_sc) y destruye
#   ./sandbox-efimero.sh status              # lista huérfanos rol=fabric-sandbox
#   ./sandbox-efimero.sh destruir <id|todos> # limpieza manual
set -euo pipefail

H="${HCLOUD_PP_CLI:-$HOME/printing-press/library/hcloud/hcloud-pp-cli}"
TIPO="${SANDBOX_TIPO:-cpx22}"
UBICACION="${SANDBOX_UBICACION:-nbg1}"
IMAGEN="ubuntu-24.04"
SSH_KEY_NOMBRE="businessos-key"
FW_NOMBRE="businessos-fw"
MAIN_SERVER="${MAIN_SERVER:-hermes@167.233.233.56}"
GO_SHA256="10ad9e86233e74c0f6590fe5426895de6bf388964210eac34a6d83f38918ecdc"
SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10)

SERVER_ID=""
SERVER_IP=""

log() { echo "[sandbox] $(date +%H:%M:%S) $*"; }

necesita_token() {
  [ -n "${HCLOUD_TOKEN:-}" ] || { echo "falta HCLOUD_TOKEN (source ~/.config/claude/secrets.env)"; exit 1; }
}

id_de() { # nombre de recurso -> id (ssh-keys | firewalls)
  "$H" "$1" list --agent --data-source live 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
res=d.get('results')
if isinstance(res,dict):  # {'ssh_keys': [...]} / {'firewalls': [...]}
    res=next((v for v in res.values() if isinstance(v,list)),[])
for r in res or []:
    if isinstance(r,dict) and r.get('name')=='$2': print(r['id']); break"
}

user_data() {
  cat <<CLOUDINIT
#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -yq git curl jq python3
curl -fsSL https://get.docker.com | sh
curl -fsSL -o /tmp/go.tgz https://go.dev/dl/go1.24.5.linux-amd64.tar.gz
echo "${GO_SHA256}  /tmp/go.tgz" | sha256sum -c -
tar -C /usr/local -xzf /tmp/go.tgz
ln -sf /usr/local/go/bin/go /usr/local/bin/go
mkdir -p /opt && cd /opt
curl -fsSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh -o install-fabric.sh
chmod +x install-fabric.sh
./install-fabric.sh --fabric-version 2.5.9 --ca-version 1.5.12 binary samples docker
touch /opt/sandbox-listo
CLOUDINIT
}

crear() {
  necesita_token
  local nombre="fabric-sandbox-$(date +%s)"
  local key_id fw_id
  key_id=$(id_de ssh-keys "$SSH_KEY_NOMBRE"); fw_id=$(id_de firewalls "$FW_NOMBRE")
  [ -n "$key_id" ] && [ -n "$fw_id" ] || { echo "ssh-key o firewall no encontrados en vivo"; exit 1; }
  log "creando $nombre ($TIPO @ $UBICACION, key=$key_id fw=$fw_id)…"
  local body respuesta
  body=$(user_data | NOMBRE="$nombre" TIPO="$TIPO" UBICACION="$UBICACION" IMAGEN="$IMAGEN" \
    KEY_ID="$key_id" FW_ID="$fw_id" python3 -c "
import json, os, sys
print(json.dumps({
    'name': os.environ['NOMBRE'], 'server_type': os.environ['TIPO'],
    'location': os.environ['UBICACION'], 'image': os.environ['IMAGEN'],
    'ssh_keys': [int(os.environ['KEY_ID'])],
    'firewalls': [{'firewall': int(os.environ['FW_ID'])}],
    'labels': {'rol': 'fabric-sandbox'},
    'user_data': sys.stdin.read(),
}))")
  respuesta=$("$H" servers create --stdin --agent <<<"$body")
  SERVER_ID=$(python3 -c "
import json,sys
d=json.loads(sys.argv[1]); r=d.get('results',d)
print(r.get('server',r)['id'])" "$respuesta")
  SERVER_IP=$(python3 -c "
import json,sys
d=json.loads(sys.argv[1]); r=d.get('results',d)
print(r.get('server',r)['public_net']['ipv4']['ip'])" "$respuesta")
  log "creado id=$SERVER_ID ip=$SERVER_IP — esperando cloud-init (docker+go+fabric, ~5-10 min)…"
  local intentos=0
  until ssh "${SSH_OPTS[@]}" "root@$SERVER_IP" test -f /opt/sandbox-listo 2>/dev/null; do
    intentos=$((intentos+1))
    [ $intentos -le 60 ] || { echo "cloud-init no terminó en 15 min — revisar y destruir a mano id=$SERVER_ID"; exit 1; }
    sleep 15
  done
  log "sandbox listo (fabric-samples + binarios 2.5.9 + go 1.24.5)"
}

destruir_id() {
  local id="$1"
  # OJO: delete es POSICIONAL (delete <id>). Y el resultado SIEMPRE se imprime:
  # un delete silenciado fue exactamente como un huerfano sobrevivio el 2026-07-28.
  "$H" servers delete "$id" --agent --yes --ignore-missing 2>&1 | tail -1 || true
  # verificar borrado de verdad (un huérfano silencioso cuesta $23/mes)
  for _ in 1 2 3; do
    sleep 3
    if ! "$H" servers list --agent --data-source live 2>/dev/null | grep -q "\"id\": $id"; then
      log "destruido id=$id (verificado en vivo)"; return 0
    fi
  done
  echo "[sandbox] ⚠️ NO pude verificar el borrado de id=$id — revisar YA en la consola" >&2
  return 1
}

limpiar() {
  [ -n "$SERVER_ID" ] && destruir_id "$SERVER_ID"
}

smoke() {
  trap limpiar EXIT
  crear
  log "smoke: levantando test-network en el sandbox…"
  ssh "${SSH_OPTS[@]}" "root@$SERVER_IP" bash -s <<'REMOTO'
set -euo pipefail
cd /opt/fabric-samples/test-network
./network.sh up createChannel -c smoke-canal >/tmp/net.log 2>&1 || { tail -20 /tmp/net.log; exit 1; }
docker ps --format '{{.Names}}' | sort
./network.sh down >/dev/null 2>&1
echo SMOKE-RED-OK
REMOTO
  log "smoke completo — destruyendo"
}

gate() {
  local task_id="$1"
  [ -n "${SUPABASE_URL:-}" ] && [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ] \
    || { echo "faltan SUPABASE_URL/SERVICE_ROLE_KEY (source businessos/.env)"; exit 1; }
  trap limpiar EXIT
  log "trayendo paquete-sc de $task_id desde el server principal…"
  local tmp; tmp=$(mktemp -d)
  ssh "$MAIN_SERVER" "docker cp ejecutor-a2a:/workspace/worktree/$task_id/paquete-sc -" > "$tmp/paquete.tar" \
    || { echo "no pude extraer el paquete del worktree de $task_id"; exit 1; }
  crear
  log "empujando fabrica-sc + paquete al sandbox…"
  local aqui; aqui=$(cd "$(dirname "$0")" && pwd)
  ssh "${SSH_OPTS[@]}" "root@$SERVER_IP" "mkdir -p /opt/gate/fabrica-sc /opt/gate/worktrees/$task_id"
  scp "${SSH_OPTS[@]}" -q "$aqui/contrato_sc.py" "$aqui/banderas.py" "$aqui/integridad.py" \
      "$aqui/red_efimera.py" "$aqui/verificar-red-efimera.py" "root@$SERVER_IP:/opt/gate/fabrica-sc/"
  ssh "${SSH_OPTS[@]}" "root@$SERVER_IP" "tar -xf - -C /opt/gate/worktrees/$task_id" < "$tmp/paquete.tar"
  rm -rf "$tmp"
  log "corriendo verificar-red-efimera (timeout interno 900s por paso)…"
  ssh "${SSH_OPTS[@]}" "root@$SERVER_IP" \
    "cd /opt/gate/fabrica-sc && SUPABASE_URL='$SUPABASE_URL' SUPABASE_SERVICE_ROLE_KEY='$SUPABASE_SERVICE_ROLE_KEY' \
     WORKTREES_DIR=/opt/gate/worktrees FABRIC_SAMPLES_DIR=/opt/fabric-samples \
     python3 verificar-red-efimera.py --task '$task_id'"
  log "gate terminado — destruyendo sandbox"
}

status() {
  necesita_token
  local filas
  filas=$("$H" servers list --agent --data-source live 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
res=d['results'] if isinstance(d.get('results'),list) else d['results'].get('servers',[])
h=[s for s in res if s.get('labels',{}).get('rol')=='fabric-sandbox']
for s in h: print(s['id'], s['name'], s['created'], s['public_net']['ipv4']['ip'])
print(f'-- {len(h)} sandbox(es) vivos', file=sys.stderr)")
  if [ -n "$filas" ]; then
    echo "⚠️ SANDBOXES VIVOS (cada uno cuesta ~\$23/mes si se queda):"; echo "$filas"
    return 1
  fi
  echo "cero sandboxes huérfanos ✓"
}

case "${1:-}" in
  smoke) smoke ;;
  gate) [ -n "${2:-}" ] || { echo "uso: $0 gate <task_id>"; exit 1; }; gate "$2" ;;
  status) status ;;
  destruir)
    necesita_token
    if [ "${2:-}" = "todos" ]; then
      "$H" servers list --agent --data-source live 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
res=d['results'] if isinstance(d.get('results'),list) else d['results'].get('servers',[])
for s in res:
    if s.get('labels',{}).get('rol')=='fabric-sandbox': print(s['id'])" | while read -r id; do destruir_id "$id"; done
    else
      [ -n "${2:-}" ] || { echo "uso: $0 destruir <id|todos>"; exit 1; }
      destruir_id "$2"
    fi ;;
  *) echo "uso: $0 {smoke|gate <task_id>|status|destruir <id|todos>}"; exit 1 ;;
esac
