#!/usr/bin/env bash
# 04-red-y-canal.sh — Levanta la red y crea el primer canal por participación.
# SE EJECUTA EN: Máquina A. CEREMONIA.md Fase 6 (con la Fase 5 —respaldos— HECHA).
# Uso: ./scripts/04-red-y-canal.sh canal-clientes-demo
set -euo pipefail
cd "$(dirname "$0")/.."
source .env
CANAL="${1:?uso: 04-red-y-canal.sh <nombre-canal>}"
RAIZ="$PWD/organizaciones"

echo ">> Levantando peers + orderer (RAM cap total ~2.5G)"
docker compose --env-file .env -f docker-compose-red.yaml up -d
sleep 5

echo ">> Génesis del canal ${CANAL} (perfil CanalTier1)"
export FABRIC_CFG_PATH="$PWD/config"
configtxgen -profile CanalTier1 -outputBlock "config/${CANAL}.block" -channelID "$CANAL"

echo ">> Unir el orderer al canal (osnadmin, TLS mutuo con cert de admin)"
osnadmin channel join --channelID "$CANAL" \
  --config-block "config/${CANAL}.block" -o localhost:${ORDERER_ADMIN_PORT} \
  --ca-file "$RAIZ/operadora/orderer/tls/ca.crt" \
  --client-cert "$RAIZ/operadora/orderer/tls/server.crt" \
  --client-key "$RAIZ/operadora/orderer/tls/server.key"

echo ">> Unir peer Operadora"
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=OperadoraMSP
export CORE_PEER_MSPCONFIGPATH="$RAIZ/operadora/usuarios/admin-despliegue-op/msp"
export CORE_PEER_TLS_ROOTCERT_FILE="$RAIZ/operadora/peer0/tls/ca.crt"
export CORE_PEER_ADDRESS=localhost:${PEER_OP_PORT}
peer channel join -b "config/${CANAL}.block"

cat <<EOF
>> Peer Testigo: la unión la ejecuta el ADMIN TESTIGO (Máquina B, o sesión
   separada con SU msp) — no este script, para que la separación sea real:
     CORE_PEER_LOCALMSPID=TestigoMSP CORE_PEER_MSPCONFIGPATH=<msp admin-tg> \\
     CORE_PEER_ADDRESS=localhost:${PEER_TG_PORT} \\
     CORE_PEER_TLS_ROOTCERT_FILE=$RAIZ/testigo/peer0/tls/ca.crt \\
     peer channel join -b config/${CANAL}.block
>> Verificación: peer channel list debe mostrar ${CANAL} en AMBOS peers.
>> Despliegue de chaincode: host-job desplegar-chaincode.py (PRP-013 F5);
   con LifecycleEndorsement=MAJORITY, exige approveformyorg de LAS DOS orgs.
EOF
