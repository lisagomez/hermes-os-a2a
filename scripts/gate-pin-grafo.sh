#!/usr/bin/env bash
# Gate: subir el pin del paquete de conocimiento exige la FIRMA del laboratorio.
#
# Decisión 4 de la Fase 0 de .claude/PRPs/prp-grafo-lee-paquete.md: el pin lo prepara un agente
# y lo firma el laboratorio, porque cambia lo que el grafo responde. Una regla que solo vive en
# un documento no dispara: por eso corre dentro de `grafo-congelado`, que es check obligatorio.
#
# Si el PR cambia businessos/grafo/seed/paquete/PIN.json, su diff de BITACORA-CDC.md debe AÑADIR:
#   - una entrada nueva (una línea `### `);
#   - que nombre el pin nuevo (`<nombre>@<versión>` de PIN.json);
#   - con `- **Aprobado por**: <firma>`. `_pendiente de firma_` NO vale: la bitácora lo acepta
#     como entrada que espera a una persona, pero un pin sin firmar no se mezcla.
#
# Lo que NO puede comprobar: quién escribió la firma. La pone una persona, como en el resto del CDC.
#
# Entradas (env):
#   CHANGED_FILES   archivos del PR, uno por línea
#   BITACORA_DIFF   diff de .claude/gobernanza/BITACORA-CDC.md contra la base
#   PIN             (opcional) ruta a PIN.json; por defecto la del repo
set -euo pipefail

PIN="${PIN:-businessos/grafo/seed/paquete/PIN.json}"
CHANGED_FILES="${CHANGED_FILES:-}"
BITACORA_DIFF="${BITACORA_DIFF:-}"

if ! printf '%s\n' "$CHANGED_FILES" | grep -qxF "businessos/grafo/seed/paquete/PIN.json"; then
  echo "✅ Gate del pin: el PR no cambia el pin del paquete."
  exit 0
fi

falla() {
  echo "::error::Subir el pin del paquete exige una entrada NUEVA en .claude/gobernanza/BITACORA-CDC.md, firmada por el laboratorio: $1"
  exit 1
}

pin="$(python3 -c 'import json,sys; p=json.load(open(sys.argv[1])); print(p["nombre"] + "@" + p["version"])' "$PIN")"
anadido="$(printf '%s\n' "$BITACORA_DIFF" | grep -E '^\+' | grep -vE '^\+\+\+' || true)"

printf '%s\n' "$anadido" | grep -qE '^\+### ' || falla "el diff no añade ninguna entrada (### )."
printf '%s\n' "$anadido" | grep -qF "$pin" || falla "ninguna línea añadida nombra el pin nuevo ($pin)."

firma="$(printf '%s\n' "$anadido" | sed -nE 's/^\+[-*][[:space:]]+\*\*(Firmado|Aprobado) por\*\*([[:space:]]*\([^)]*\))?:[[:space:]]*(.*)$/\3/p' | head -n 1)"
[ -n "$firma" ] || falla "la entrada nueva no trae el campo «Aprobado por»."
case "$firma" in
  _pendiente\ de\ firma_*) falla "la entrada dice «_pendiente de firma_»: un pin sin firmar no se mezcla." ;;
  \[*|☐*|[Tt][Oo][Dd][Oo]*|—*|[Xx][Xx][Xx]*) falla "«$firma» no es una firma." ;;
esac

echo "✅ Gate del pin: $pin con entrada nueva firmada en BITACORA-CDC.md ($firma)."
