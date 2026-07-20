#!/usr/bin/env bash
# 05-simulacro-revocacion.sh — La revocación se prueba ANTES del primer cliente
# real, no después del primer incidente (arquitectura §4). Fase 7 de la ceremonia.
# Emite una identidad dummy -> revoca -> genera CRL -> actualiza el MSP -> el acta
# registra el resultado. La verificación final es que una tx firmada por la dummy
# sea RECHAZADA por el peer.
set -euo pipefail
cd "$(dirname "$0")/.."
source .env
RAIZ="$PWD/organizaciones"
TLS_CERT_OP="$RAIZ/fabric-ca/ca-operadora/tls-cert.pem"
export FABRIC_CA_CLIENT_HOME="$RAIZ/clientes-ca/op-admin"
S=$(openssl rand -hex 16)

echo ">> 1) Emitir dummy-revocable"
fabric-ca-client register --caname ca-operadora -u "https://localhost:${CA_OP_PORT}" \
  --tls.certfiles "$TLS_CERT_OP" --id.name dummy-revocable --id.secret "$S" --id.type client
fabric-ca-client enroll --caname ca-operadora \
  -u "https://dummy-revocable:${S}@localhost:${CA_OP_PORT}" \
  --tls.certfiles "$TLS_CERT_OP" -M "$RAIZ/tmp-dummy/msp"

echo ">> 2) Revocar y generar CRL"
fabric-ca-client revoke --caname ca-operadora -u "https://localhost:${CA_OP_PORT}" \
  --tls.certfiles "$TLS_CERT_OP" --revoke.name dummy-revocable --revoke.reason cessationofoperation
fabric-ca-client gencrl --caname ca-operadora -u "https://localhost:${CA_OP_PORT}" \
  --tls.certfiles "$TLS_CERT_OP"

echo ">> 3) Publicar la CRL en el MSP de la org (y del canal, vía config update si aplica)"
mkdir -p "$RAIZ/operadora/msp/crls"
cp "$FABRIC_CA_CLIENT_HOME/msp/crls/crl.pem" "$RAIZ/operadora/msp/crls/"
echo "   CRL copiada. Reiniciar el peer Operadora para recargar MSP local:"
echo "   docker restart peer-operadora"

cat <<'EOF'
>> 4) VERIFICACIÓN (manual, va al acta):
   a. Intentar una consulta al canal firmando con tmp-dummy/msp -> debe FALLAR
      con error de identidad revocada.
   b. rm -rf organizaciones/tmp-dummy
   c. Acta: fecha, ejecutor, resultado (rechazo observado sí/no), tiempo total.
   Si el rechazo NO se observa, la red NO recibe clientes hasta resolverlo.
EOF
