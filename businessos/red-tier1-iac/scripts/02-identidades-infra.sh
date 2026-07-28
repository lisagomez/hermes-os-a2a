#!/usr/bin/env bash
# 02-identidades-infra.sh — Registra y enrola las identidades de INFRAESTRUCTURA:
# peers, orderer, MSP de cada org (con NodeOUs) y admin-despliegue-op.
# SE EJECUTA EN: Máquina A. CEREMONIA.md Fases 2-3.
#
# ⚠ EXCEPCIÓN DE CEREMONIA (Fase 3): admin-despliegue-tg NO se enrola aquí.
#   Este script solo lo REGISTRA (con secreto de un solo uso). El ENROLL —donde
#   nace la llave privada— se ejecuta en la MÁQUINA B con el bloque marcado abajo.
set -euo pipefail
cd "$(dirname "$0")/.."
source .env
RAIZ="$PWD/organizaciones"
TLS_CERT_TLS="$RAIZ/fabric-ca/ca-tls/tls-cert.pem"
TLS_CERT_OP="$RAIZ/fabric-ca/ca-operadora/tls-cert.pem"
TLS_CERT_TG="$RAIZ/fabric-ca/ca-testigo/tls-cert.pem"
# RAICES de firma de cada CA (ca-cert.pem) — NO confundir con los tls-cert.pem
# de arriba: esos son certs HOJA del servidor CA (solo para --tls.certfiles).
# Meter una hoja como cacert del MSP rompe la cadena y el orderer PANIQUEA al
# arrancar ("failed to traverse certificate verification chain") — lo cazó el
# dry-run del 2026-07-28.
CA_CERT_OP="$RAIZ/fabric-ca/ca-operadora/ca-cert.pem"
CA_CERT_TG="$RAIZ/fabric-ca/ca-testigo/ca-cert.pem"
CA_CERT_TLS="$RAIZ/fabric-ca/ca-tls/ca-cert.pem"

# Escribe el config.yaml de NodeOUs en un MSP (clasifica certificados por OU:
# admin/peer/orderer/client — sin esto las políticas 'OperadoraMSP.admin' no evalúan)
escribir_nodeous() { # $1 = dir msp ; $2 = pem de la CA
  mkdir -p "$1/cacerts"; cp "$2" "$1/cacerts/ca.pem"
  cat > "$1/config.yaml" <<EOF
NodeOUs:
  Enable: true
  ClientOUIdentifier:  {Certificate: cacerts/ca.pem, OrganizationalUnitIdentifier: client}
  PeerOUIdentifier:    {Certificate: cacerts/ca.pem, OrganizationalUnitIdentifier: peer}
  AdminOUIdentifier:   {Certificate: cacerts/ca.pem, OrganizationalUnitIdentifier: admin}
  OrdererOUIdentifier: {Certificate: cacerts/ca.pem, OrganizationalUnitIdentifier: orderer}
EOF
}

registrar() { # $1 home-admin  $2 caname  $3 puerto  $4 tlscert  $5 id  $6 secreto  $7 tipo  $8 attrs(opcional)
  export FABRIC_CA_CLIENT_HOME="$1"
  local extra=(); [ -n "${8:-}" ] && extra=(--id.attrs "$8")
  # --id.maxenrollments 1: el secreto es de UN SOLO USO de verdad (el default de
  # la CA es ilimitado — sin esto, el paso 11 de CEREMONIA.md "el segundo enroll
  # debe fallar" NO se cumple; lo cazó el dry-run del 2026-07-28).
  fabric-ca-client register --caname "$2" -u "https://localhost:$3" \
    --tls.certfiles "$4" --id.name "$5" --id.secret "$6" --id.type "$7" \
    --id.maxenrollments 1 "${extra[@]}"
}

enrolar() { # $1 caname $2 puerto $3 tlscert $4 id $5 secreto $6 msp-destino $7 pem-ca
  fabric-ca-client enroll --caname "$1" -u "https://$4:$5@localhost:$2" \
    --tls.certfiles "$3" -M "$6"
  escribir_nodeous "$6" "$7"
}

echo ">> Secretos de un solo uso (guárdalos en el gestor: se consumen al enrolar)"
S_PEER_OP=$(openssl rand -hex 16); S_PEER_TG=$(openssl rand -hex 16)
S_ORDERER=$(openssl rand -hex 16);  S_ADMIN_OP=$(openssl rand -hex 16)
S_ADMIN_TG=$(openssl rand -hex 16)

echo ">> [Operadora] registrar peer0, orderer, admin-despliegue-op"
H_OP="$RAIZ/clientes-ca/op-admin"
registrar "$H_OP" ca-operadora "$CA_OP_PORT" "$TLS_CERT_OP" peer0-operadora "$S_PEER_OP" peer
registrar "$H_OP" ca-operadora "$CA_OP_PORT" "$TLS_CERT_OP" orderer "$S_ORDERER" orderer
registrar "$H_OP" ca-operadora "$CA_OP_PORT" "$TLS_CERT_OP" admin-despliegue-op "$S_ADMIN_OP" admin

echo ">> [Testigo] registrar peer0 y admin-despliegue-tg (SOLO registro)"
H_TG="$RAIZ/clientes-ca/tg-admin"
registrar "$H_TG" ca-testigo "$CA_TG_PORT" "$TLS_CERT_TG" peer0-testigo "$S_PEER_TG" peer
registrar "$H_TG" ca-testigo "$CA_TG_PORT" "$TLS_CERT_TG" admin-despliegue-tg "$S_ADMIN_TG" admin

echo ">> Enrolar identidades MSP (Máquina A)"
enrolar ca-operadora "$CA_OP_PORT" "$TLS_CERT_OP" peer0-operadora "$S_PEER_OP" \
  "$RAIZ/operadora/peer0/msp" "$CA_CERT_OP"
enrolar ca-operadora "$CA_OP_PORT" "$TLS_CERT_OP" orderer "$S_ORDERER" \
  "$RAIZ/operadora/orderer/msp" "$CA_CERT_OP"
enrolar ca-operadora "$CA_OP_PORT" "$TLS_CERT_OP" admin-despliegue-op "$S_ADMIN_OP" \
  "$RAIZ/operadora/usuarios/admin-despliegue-op/msp" "$CA_CERT_OP"
enrolar ca-testigo "$CA_TG_PORT" "$TLS_CERT_TG" peer0-testigo "$S_PEER_TG" \
  "$RAIZ/testigo/peer0/msp" "$CA_CERT_TG"

echo ">> TLS de nodos (contra ca-tls, con SANs correctos)"
tls_nodo() { # $1 id $2 secreto $3 hosts $4 destino
  export FABRIC_CA_CLIENT_HOME="$RAIZ/clientes-ca/tls-admin"
  fabric-ca-client register --caname ca-tls -u "https://localhost:${CA_TLS_PORT}" \
    --tls.certfiles "$TLS_CERT_TLS" --id.name "$1" --id.secret "$2" --id.type client || true
  fabric-ca-client enroll --caname ca-tls \
    -u "https://$1:$2@localhost:${CA_TLS_PORT}" --tls.certfiles "$TLS_CERT_TLS" \
    --enrollment.profile tls --csr.hosts "$3" -M "$4"
  cp "$4"/signcerts/* "$4"/server.crt
  cp "$4"/keystore/*  "$4"/server.key
  cp "$4"/tlscacerts/* "$4"/ca.crt
}
tls_nodo tls-peer-op   "$(openssl rand -hex 16)" "peer-operadora,localhost" "$RAIZ/operadora/peer0/tls"
tls_nodo tls-peer-tg   "$(openssl rand -hex 16)" "peer-testigo,localhost"   "$RAIZ/testigo/peer0/tls"
tls_nodo tls-orderer   "$(openssl rand -hex 16)" "orderer,localhost"        "$RAIZ/operadora/orderer/tls"

echo ">> MSP de ORGANIZACIÓN (para configtx: cacerts + NodeOUs + tlscacerts)"
for org in operadora testigo; do
  case $org in operadora) PEM="$CA_CERT_OP";; testigo) PEM="$CA_CERT_TG";; esac
  M="$RAIZ/$org/msp"; escribir_nodeous "$M" "$PEM"
  # RAIZ de ca-tls (no su hoja): un cert sin atributo CA en tlscacerts hace que
  # el orderer rechace el join block ("CA Certificate did not have the CA
  # attribute") — hermano del fix de cacerts, dry-run 2026-07-28.
  mkdir -p "$M/tlscacerts"; cp "$CA_CERT_TLS" "$M/tlscacerts/tlsca.pem"
done

cat <<EOF

============================================================================
⚠ BLOQUE PARA LA MÁQUINA B (ceremonia Fase 3 — admin Testigo)
Copia y ejecuta ESTO en la Máquina B (con fabric-ca-client instalado y el
tls-cert.pem de ca-testigo transferido por canal seguro). La llave privada
de admin-despliegue-tg NACE en B y JAMÁS se copia a la Máquina A:

  export FABRIC_CA_CLIENT_HOME=\$HOME/testigo-admin
  mkdir -p \$HOME/testigo-admin
  # OJO: --tls.certfiles RELATIVO se resuelve contra FABRIC_CA_CLIENT_HOME, no
  # contra el directorio actual (lo cazó el dry-run 2026-07-28) — usa path ABSOLUTO:
  fabric-ca-client enroll --caname ca-testigo \\
    -u "https://admin-despliegue-tg:${S_ADMIN_TG}@<IP-MAQUINA-A>:${CA_TG_PORT}" \\
    --tls.certfiles /ruta/absoluta/a/tls-cert-ca-testigo.pem \\
    -M \$HOME/testigo-admin/msp
  # (después: escribir NodeOUs config.yaml igual que en la Máquina A)

El secreto de arriba es de UN SOLO USO: al enrolar, deja de servir.
Registra en el acta: fecha, quién ejecutó, hash del certificado emitido.
============================================================================
EOF
echo ">> OK infra. Siguiente: 03-identidades-servicio.sh"
