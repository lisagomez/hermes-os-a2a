#!/usr/bin/env bash
# Gate "documentos vivos": un PR que cambia código sustantivo debe dejar rastro en
# alguno de los documentos que el equipo lee para saber en qué va el proyecto.
#
# Por qué existe: entre el 2026-07-30 y el 2026-08-02 se fusionaron 13 PRs y NINGUNO
# tocó el ROADMAP, el README ni los aprendizajes. El mapa de ruta se leía como si el
# proyecto se hubiera detenido en la Fase 13. La regla "mantener docs vivas" existía
# desde 2026-06-28 como doctrina; sin gate, era una costumbre — y una costumbre no es
# una garantía (mismo criterio que el asyncio.Lock de la cola, 2026-07-13).
#
# Entradas (env, para poder correrlo fuera de CI):
#   CHANGED_FILES  rutas cambiadas, una por línea
#   PR_BODY        cuerpo del PR (para la escapatoria)
#   PR_LABELS      etiquetas del PR, una por línea
#
# Salida: 0 = pasa, 1 = falla con explicación.
set -uo pipefail

ESCAPE="sin-impacto-doc"

CHANGED_FILES="${CHANGED_FILES:-}"
PR_BODY="${PR_BODY:-}"
PR_LABELS="${PR_LABELS:-}"

# --- Documentos vivos: los que responden "¿en qué va el proyecto?" -----------------
#   Un SPEC, un PROGRESS o un runbook NO cuentan: son de una iniciativa concreta y
#   varios de los 13 PRs sí los tocaron sin que nadie se enterara del avance.
es_doc_vivo() {
  case "$1" in
    businessos/ROADMAP.md|README.md|CLAUDE.md|DECISIONES.md|BUSINESS_LOGIC.md) return 0 ;;
    .claude/memory/*) return 0 ;;
    *) return 1 ;;
  esac
}

# --- Código sustantivo: lo que cambia el comportamiento del sistema ----------------
#   Fuera: markdown (documentar más no puede disparar el gate), la propia carpeta
#   .github (un arreglo de CI no cuenta como avance de producto) y los lockfiles.
es_sustantivo() {
  case "$1" in
    *.md) return 1 ;;
    .github/*) return 1 ;;
    *package-lock.json|*.lock|*.lockb) return 1 ;;
    .claude/*) return 1 ;;
    *) return 0 ;;
  esac
}

sustantivos=""
vivos=""
while IFS= read -r archivo; do
  [ -z "$archivo" ] && continue
  if es_doc_vivo "$archivo"; then
    vivos="${vivos}${archivo}"$'\n'
  elif es_sustantivo "$archivo"; then
    sustantivos="${sustantivos}${archivo}"$'\n'
  fi
done <<< "$CHANGED_FILES"

if [ -z "$sustantivos" ]; then
  echo "✅ Gate docs vivos: el PR no cambia código sustantivo. Nada que registrar."
  exit 0
fi

if [ -n "$vivos" ]; then
  echo "✅ Gate docs vivos: el avance quedó registrado en:"
  printf '   · %s\n' $(echo "$vivos")
  exit 0
fi

# --- Escapatoria explícita --------------------------------------------------------
if echo "$PR_LABELS" | grep -qx "$ESCAPE"; then
  echo "✅ Gate docs vivos: exento por la etiqueta '$ESCAPE'."
  exit 0
fi

motivo="$(echo "$PR_BODY" | grep -i -m1 "^${ESCAPE}:" | sed "s/^[^:]*: *//")"
if [ "${#motivo}" -ge 10 ]; then
  echo "✅ Gate docs vivos: exento por declaración en el cuerpo del PR."
  echo "   Motivo: $motivo"
  exit 0
fi

# --- Rojo -------------------------------------------------------------------------
cat >&2 <<FIN
❌ Gate docs vivos: este PR cambia código sustantivo y no actualiza ningún documento vivo.

Archivos sustantivos (primeros 15):
$(printf '   · %s\n' $(echo "$sustantivos") | head -15)

Actualiza al menos uno de estos, según lo que corresponda:
   · businessos/ROADMAP.md   — el avance de la fase/línea que tocas
   · CLAUDE.md               — el gotcha que costó iteraciones (auto-blindaje)
   · DECISIONES.md           — la decisión cerrada, en una línea (append-only)
   · README.md               — solo si cambia el estado general del proyecto
   · .claude/memory/**       — el estado por iniciativa
   · BUSINESS_LOGIC.md       — si cambia la lógica de negocio

Si de verdad no hay nada que registrar, dilo explícitamente: pon la etiqueta
'${ESCAPE}' en el PR, o una línea en el cuerpo del PR con el motivo:

   ${ESCAPE}: refactor interno sin cambio de comportamiento observable

(La regla viene del feedback de Elisa del 2026-06-28 y del cierre del 2026-08-02:
13 PRs seguidos dejaron el mapa de ruta congelado en la Fase 13.)
FIN
exit 1
