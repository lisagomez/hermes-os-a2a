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
# Desde 2026-09-04 este gate hace DOS cosas, y la segunda es la que faltaba:
#   (1) docs vivos  — código sustantivo debe dejar rastro en un documento vivo;
#   (2) CDC (C1)    — tocar un skill, un subagente, prp-base.md o la config de MCP exige
#       entrada en .claude/gobernanza/BITACORA-CDC.md.
#
# Antes, `.claude/*` estaba EXENTO por completo: justo el material que C1 vigila. Los
# prompts y los skills son el mayor radio de cambio del sistema —cambian el comportamiento
# de todo lo que se produzca después— y eran lo único que no pasaba por ningún gate. El
# código generado (menos alcance) pasaba por typecheck, build y revisión; el prompt que lo
# genera (todo el alcance) no pasaba por nada.
#
# Entradas (env, para poder correrlo fuera de CI):
#   CHANGED_FILES   rutas cambiadas, una por línea
#   PR_BODY         cuerpo del PR (para la escapatoria)
#   PR_LABELS       etiquetas del PR, una por línea
#   BITACORA_DIFF   (opcional) diff de BITACORA-CDC.md. Con él se exige que la entrada sea
#                   NUEVA; sin él solo se puede comprobar que el archivo fue tocado, y el
#                   gate lo dice en voz alta en vez de aparentar que comprobó más.
#
# Salida: 0 = pasa, 1 = falla con explicación.
set -uo pipefail

ESCAPE="sin-impacto-doc"

CHANGED_FILES="${CHANGED_FILES:-}"
PR_BODY="${PR_BODY:-}"
PR_LABELS="${PR_LABELS:-}"
BITACORA_DIFF="${BITACORA_DIFF:-}"

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
    .claude/*) return 1 ;;   # no es "sustantivo" para docs vivos: tiene su propia regla (CDC)
    *) return 0 ;;
  esac
}

# --- Material de CDC: lo que cambia el comportamiento de los AGENTES ---------------
#   Control C1 de .claude/gobernanza/GOBERNANZA.md. El radio no es este repo: es todo lo
#   que la fábrica produzca después. Por eso no hay escapatoria por etiqueta — la entrada
#   es barata y puede declarar "radio: menor"; lo que no vale es que no exista.
es_material_cdc() {
  case "$1" in
    .claude/gobernanza/*) return 1 ;;   # la propia capa no se vigila a sí misma aquí
    .claude/skills/*) return 0 ;;
    .claude/agents/*) return 0 ;;
    .claude/PRPs/prp-base.md) return 0 ;;
    .claude/settings.json|.claude/settings.local.json) return 0 ;;
    .claude/example.mcp.json|.mcp.json) return 0 ;;
    CLAUDE.md|GEMINI.md) return 0 ;;
    *) return 1 ;;
  esac
}

sustantivos=""
vivos=""
cdc=""
bitacora_tocada=0
while IFS= read -r archivo; do
  [ -z "$archivo" ] && continue
  if [ "$archivo" = ".claude/gobernanza/BITACORA-CDC.md" ]; then
    bitacora_tocada=1
  fi
  if es_material_cdc "$archivo"; then
    cdc="${cdc}${archivo}"$'\n'
  fi
  if es_doc_vivo "$archivo"; then
    vivos="${vivos}${archivo}"$'\n'
  elif es_sustantivo "$archivo"; then
    sustantivos="${sustantivos}${archivo}"$'\n'
  fi
done <<< "$CHANGED_FILES"

# --- Gate 1: CDC (C1) -------------------------------------------------------------
if [ -n "$cdc" ] && [ "$bitacora_tocada" -eq 0 ]; then
  cat >&2 <<FINCDC
❌ Gate CDC (control C1): este PR cambia el comportamiento de los agentes y no deja
   entrada en .claude/gobernanza/BITACORA-CDC.md.

Material de CDC tocado (primeros 15):
$(printf '   · %s\n' $(echo "$cdc") | head -15)

Un skill, un subagente, prp-base.md o la configuración del agente cambian TODO lo que el
sistema produzca después. El código generado pasa por typecheck, build y revisión; el
prompt que lo genera tiene que pasar por esto.

Añade una entrada a .claude/gobernanza/BITACORA-CDC.md con este formato:

   ### $(date +%Y-%m-%d) — <qué cambió> — radio: <sistema | skill | vertical | plantilla | menor>
   - **Cambio**:
   - **Motivo**:
   - **Gate aplicado**: diff revisado ☐ · regresión verde ☐ · aprobación humana ☐ · pineo ☐
   - **Regresión**: <salida de npm run regresion>
   - **Runtime**: repo ☐ / volumen ☐ / n/a
   - **Aprobado por**:

No hay escapatoria por etiqueta, a propósito: la entrada es barata y puede declarar
"radio: menor". Lo que no vale es que no exista.
(Control C1 de .claude/gobernanza/GOBERNANZA.md §2.)
FINCDC
  exit 1
fi
# Tocar la bitácora no es dejar una entrada: un cambio de espacios satisfacía el gate.
# Con el diff delante se exige una cabecera de entrada NUEVA (una línea `### ` añadida).
if [ -n "$cdc" ]; then
  if [ -n "$BITACORA_DIFF" ]; then
    if printf '%s' "$BITACORA_DIFF" | grep -qE '^\+### '; then
      echo "✅ Gate CDC (C1): material de agente tocado, con entrada NUEVA en BITACORA-CDC.md."
    else
      cat >&2 <<FINENTRADA
❌ Gate CDC (control C1): BITACORA-CDC.md cambió, pero el diff no añade ninguna entrada.

Se esperaba al menos una línea nueva que empiece por '### ' (la cabecera de una entrada).
Tocar el archivo no es registrar el cambio: corregir una errata dejaría el gate en verde
con el CDC sin declarar, que es exactamente el agujero que esto cierra.
FINENTRADA
      exit 1
    fi
  else
    echo "✅ Gate CDC (C1): material de agente tocado, con BITACORA-CDC.md en el cambio."
    echo "   ⚠ Sin BITACORA_DIFF no se pudo comprobar que la entrada sea NUEVA (solo que el"
    echo "     archivo fue tocado). En CI sí se comprueba."
  fi
fi

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
