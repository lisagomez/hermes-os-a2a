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
  # maxenrollments 1: secreto de un solo uso (mismo fix que 02, dry-run 2026-07-28).
  fabric-ca-client register --caname ca-operadora -u "https://localhost:${CA_OP_PORT}" \
    --tls.certfiles "$TLS_CERT_OP" --id.name "$1" --id.secret "$S" \
    --id.type client --id.maxenrollments 1 --id.attrs "$2"
  # Sin --enrollment.attrs: el sufijo ":ecert" del registro ya mete el atributo
  # al certificado por defecto. (El bug original pedia un atributo llamado
  # "rol=oraculo" — ${2%%:*} recorta el :ecert pero no el =valor — y la CA
  # respondia "required attributes missing"; lo cazó el dry-run 2026-07-28.)
  fabric-ca-client enroll --caname ca-operadora \
    -u "https://$1:${S}@localhost:${CA_OP_PORT}" --tls.certfiles "$TLS_CERT_OP" \
    -M "$3"
  # Verificación: el atributo DEBE venir dentro del certificado (extensión
  # 1.2.3.4.5.6.7.8.1) — es lo que el chaincode lee; sin esto la identidad es inútil.
  grep -q "\"${2%%=*}\"" <(openssl x509 -in "$3/signcerts/cert.pem" -noout -text) \
    || { echo "ERROR: el certificado de $1 NO trae el atributo ${2%%=*}"; exit 1; }
  echo "   emitida: $1 [$2] -> $3 (atributo verificado en el cert)"
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
