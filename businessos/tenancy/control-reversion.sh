#!/usr/bin/env bash
# ============================================================================
#  control-reversion.sh — La prueba de las pruebas.
#
#  Una suite en verde no dice nada si nunca se la ha visto en rojo. Aquí se
#  ROMPE la migración a propósito, de cuatro maneras distintas, y se exige que
#  la suite lo cace. Si un sabotaje pasa desapercibido, esa prueba es adorno.
#
#  Uso:  businessos/tenancy/control-reversion.sh
#  Tarda unos minutos: cada sabotaje reconstruye el esquema desde cero.
# ============================================================================
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIG="$RAIZ/businessos/supabase-organizaciones.sql"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

fallos=0

# saboteo <nombre> <prueba-esperada> <expresión sed sobre la migración>
saboteo() {
  local nombre="$1" espera="$2" sed_expr="$3"
  local copia="$TMP/mig.sql"
  sed -E "$sed_expr" "$MIG" > "$copia"

  if cmp -s "$copia" "$MIG"; then
    echo "✗ $nombre — el sabotaje NO modificó el archivo (la expresión ya no aplica)"
    fallos=$((fallos+1)); return
  fi

  if MIGRACION="$copia" PG_CONTENEDOR=pg-reversion PG_PUERTO=5434 \
     "$RAIZ/businessos/tenancy/replay.sh" >"$TMP/salida.txt" 2>&1; then
    echo "✗ $nombre — TODO PASÓ EN VERDE con la migración rota. $espera no protege nada."
    fallos=$((fallos+1))
  else
    echo "✓ $nombre — cazado (esperábamos que fallara $espera)"
    grep -oE "FALLO: [^\"]{0,110}" "$TMP/salida.txt" | head -1 | sed 's/^/    /'
  fi
}

echo "▶ Control de reversión: rompiendo la migración a propósito…"

# 1 · Un `with check` permisivo: filtra lo que se LEE pero deja ESCRIBIR en
#     otro tenant. Es el fallo silencioso que motiva T2.
#
#     OJO — el sabotaje evidente (borrar la línea `with check`) NO abre ningún
#     agujero: en una política FOR ALL, Postgres usa la expresión de `using`
#     también como check cuando `with check` falta. Esa es la razón por la que
#     la primera versión de este control daba "verde con la migración rota":
#     la rota no lo estaba. Para probar T2 de verdad hay que poner un check
#     permisivo de forma explícita.
saboteo "with check permisivo (true)" "T2" \
  's/with check  \(tenant_id = app\.tenant_actual\(\)\)/with check  (true)/'

# 2 · Sin FORCE, el dueño de la tabla evade su propia política.
saboteo "sin FORCE row level security" "T6" \
  "s/execute format\('alter table %I\.%I force  row level security', r\.esquema, r\.tabla\);//"

# 3 · Sin lower() en el puente de costo, 'ACME' y 'acme' dejan de ser el mismo
#     tenant y el gasto de un cliente se atribuye a otro.
saboteo "puente de costo sin lower()" "T12" \
  's/join token_usage t on lower\(t\.tenant_id\) = lower\(o\.slug\)/join token_usage t on t.tenant_id = o.slug/'

# 4 · Sin el índice sobre tenant_id, cada consulta escanea la tabla entera.
saboteo "sin índice en tenant_id" "T8" \
  "s/^      'create index if not exists %I on %I\.%I \(tenant_id\)',$/      'select %I, %I, %I',/"

docker rm -f pg-reversion >/dev/null 2>&1

echo
if (( fallos > 0 )); then
  echo "✗ $fallos sabotaje(s) pasaron sin ser detectados: la suite tiene huecos."
  exit 1
fi
echo "✓ Los 4 sabotajes fueron cazados. La suite se pone roja cuando debe."
