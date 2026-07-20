#!/usr/bin/env bash
# 01-cas.sh — Levanta las 3 CAs y enrola sus administradores bootstrap.
# SE EJECUTA EN: Máquina A (servidor de red). CEREMONIA.md Fase 1.
# Requiere: docker compose, binario fabric-ca-client (misma versión que .env),
# y las contraseñas exportadas en la shell (CA_TLS_ADMIN_PW, CA_OP_ADMIN_PW, CA_TG_ADMIN_PW).
set -euo pipefail
cd "$(dirname "$0")/.."
source .env
: "${CA_TLS_ADMIN_PW:?exporta CA_TLS_ADMIN_PW (CEREMONIA.md Fase 1)}"
: "${CA_OP_ADMIN_PW:?exporta CA_OP_ADMIN_PW}"
: "${CA_TG_ADMIN_PW:?exporta CA_TG_ADMIN_PW}"

RAIZ="$PWD/organizaciones"
mkdir -p "$RAIZ/fabric-ca"/{ca-tls,ca-operadora,ca-testigo} "$RAIZ/clientes-ca"

echo ">> Levantando CAs (imágenes pineadas: fabric-ca:${FABRIC_CA_VERSION})"
docker compose --env-file .env -f docker-compose-cas.yaml up -d
sleep 5

# Certificados raíz TLS de cada CA (para hablarles con TLS verificado)
TLS_CERT_TLS="$RAIZ/fabric-ca/ca-tls/tls-cert.pem"
TLS_CERT_OP="$RAIZ/fabric-ca/ca-operadora/tls-cert.pem"
TLS_CERT_TG="$RAIZ/fabric-ca/ca-testigo/tls-cert.pem"
for f in "$TLS_CERT_TLS" "$TLS_CERT_OP" "$TLS_CERT_TG"; do
  [ -f "$f" ] || { echo "Falta $f — ¿arrancó la CA?"; exit 1; }
done

echo ">> Enrolando admin bootstrap de cada CA"
export FABRIC_CA_CLIENT_HOME="$RAIZ/clientes-ca/tls-admin"
fabric-ca-client enroll -u "https://tls-admin:${CA_TLS_ADMIN_PW}@localhost:${CA_TLS_PORT}" \
  --caname ca-tls --tls.certfiles "$TLS_CERT_TLS"

export FABRIC_CA_CLIENT_HOME="$RAIZ/clientes-ca/op-admin"
fabric-ca-client enroll -u "https://op-admin:${CA_OP_ADMIN_PW}@localhost:${CA_OP_PORT}" \
  --caname ca-operadora --tls.certfiles "$TLS_CERT_OP"

export FABRIC_CA_CLIENT_HOME="$RAIZ/clientes-ca/tg-admin"
fabric-ca-client enroll -u "https://tg-admin:${CA_TG_ADMIN_PW}@localhost:${CA_TG_PORT}" \
  --caname ca-testigo --tls.certfiles "$TLS_CERT_TG"

echo ">> OK. Las llaves raíz de las CAs están en organizaciones/fabric-ca/*/"
echo ">> SIGUIENTE (ceremonia): respaldarlas AHORA (CEREMONIA.md Fase 5 anticipada para raíces)"
