#!/usr/bin/env bash
# 03-identidades-servicio.sh — Identidades de SERVICIO con atributos ABAC
# (tabla §4 de arquitectura-red-fabric.md). SE EJECUTA EN: Máquina A. Fase 4.
# Los atributos van con ":ecert" para quedar DENTRO del certificado — es lo que
# el chaincode lee con GetAttributeValue (escrow.go / exigirArbitro).
set -euo pipefail
cd "$(dirname "$0")/.."
source .env
RAIZ="$PWD/organizaciones"
TLS_CERT_OP="$RAIZ/fabric-ca/ca-operadora/tls-cert.pem"
export FABRIC_CA_CLIENT_HOME="$RAIZ/clientes-ca/op-admin"

emitir() { # $1 id  $2 attrs  $3 destino
  local S; S=$(openssl rand -hex 16)
  fabric-ca-client register --caname ca-operadora -u "https://localhost:${CA_OP_PORT}" \
    --tls.certfiles "$TLS_CERT_OP" --id.name "$1" --id.secret "$S" \
    --id.type client --id.attrs "$2"
  fabric-ca-client enroll --caname ca-operadora \
    -u "https://$1:${S}@localhost:${CA_OP_PORT}" --tls.certfiles "$TLS_CERT_OP" \
    --enrollment.attrs "${2%%:*}" -M "$3"
  echo "   emitida: $1 [$2] -> $3"
}

echo ">> oraculo-pm: SOLO registrar_evidencia/declarar_vencido (techo en chaincode)"
emitir oraculo-pm "rol=oraculo:ecert" "$RAIZ/operadora/usuarios/oraculo-pm/msp"

echo ">> arbitro-1: resolver, nada más"
emitir arbitro-1 "rol=arbitro:ecert" "$RAIZ/operadora/usuarios/arbitro-1/msp"

echo ">> listener-hermes: SOLO lectura (el listener NO usa la wallet del oráculo)"
emitir listener-hermes "rol=lector:ecert" "$RAIZ/operadora/usuarios/listener-hermes/msp"

cat <<'EOF'
>> OK. Recordatorios de ceremonia:
   - La wallet de oraculo-pm se COPIA (mueve) a businessos/pm-a2a/identidad/ y se
     borra de aquí; permisos 0400; dueña del proceso pm-a2a únicamente.
   - Las llaves de PARTES (comprador/vendedor) NO se emiten en este script:
     en tier 1 se emiten una por cliente en su alta (con acta), custodia de la parte.
   - Registrar en el acta los hashes de los 3 certificados emitidos.
EOF
