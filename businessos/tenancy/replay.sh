#!/usr/bin/env bash
# ============================================================================
#  replay.sh — Reconstruye el esquema en un Postgres efímero y valida la
#              capa de tenencia (migración + suite + idempotencia).
#
#  Uso:
#     businessos/tenancy/replay.sh              # ciclo completo
#     businessos/tenancy/replay.sh --solo-esquema
#
#  Requiere docker. No toca producción ni lee ninguna credencial.
#  Todo fallo de archivo se IMPRIME (ningún best-effort silencioso) y hace
#  salir con código ≠ 0 al final: un esquema incompleto vuelve mentirosa a la
#  prueba T5, que solo puede ver las tablas que existen.
# ============================================================================
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIR="$RAIZ/businessos/tenancy"

CONTENEDOR="${PG_CONTENEDOR:-pg-tenencia}"
# Sobreescribibles para el control de reversión (control-reversion.sh), que
# corre este mismo ciclo con copias deliberadamente rotas.
MIGRACION="${MIGRACION:-}"
SUITE="${SUITE:-}"
PUERTO="${PG_PUERTO:-5433}"
IMAGEN="${PG_IMAGEN:-postgres:16-alpine}"
SOLO_ESQUEMA=0
[[ "${1:-}" == "--solo-esquema" ]] && SOLO_ESQUEMA=1

psql_f() { docker exec -i "$CONTENEDOR" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f - ; }

echo "▶ Levantando $IMAGEN como '$CONTENEDOR'…"
docker rm -f "$CONTENEDOR" >/dev/null 2>&1
docker run -d --name "$CONTENEDOR" -e POSTGRES_PASSWORD=x -p "$PUERTO:5432" "$IMAGEN" >/dev/null || exit 1
# La espera corre DENTRO del contenedor: un `sleep` de primer plano en el
# anfitrión puede estar bloqueado según dónde se ejecute este script, y sin
# espera real el bucle se agota en milisegundos y declara un arranque fallido
# que en realidad iba en camino.
listo=0
for _ in $(seq 1 60); do
  if docker exec "$CONTENEDOR" pg_isready -U postgres >/dev/null 2>&1; then listo=1; break; fi
  docker exec "$CONTENEDOR" sh -c 'sleep 1' >/dev/null 2>&1 || command sleep 1
done
if (( listo == 0 )); then
  echo "✗ Postgres no arrancó. Últimas líneas del log:"
  docker logs "$CONTENEDOR" 2>&1 | tail -5
  exit 1
fi

echo "▶ Prelude (roles, auth, extensiones)…"
psql_f < "$DIR/00-prelude.sql" || { echo "✗ El prelude falló: nada más tiene sentido"; exit 1; }

echo "▶ Replay del esquema según orden.txt…"
FALLIDOS=()
TOTAL=0
while IFS= read -r linea; do
  linea="${linea%%#*}"; linea="$(echo "$linea" | xargs)"
  [[ -z "$linea" ]] && continue
  TOTAL=$((TOTAL+1))
  ruta="$RAIZ/$linea"
  if [[ ! -f "$ruta" ]]; then
    echo "  ✗ $linea — NO EXISTE en el repo"
    FALLIDOS+=("$linea :: archivo inexistente")
    continue
  fi
  salida="$(psql_f < "$ruta" 2>&1)"
  if [[ $? -ne 0 ]]; then
    motivo="$(echo "$salida" | grep -iE '^psql:|ERROR' | head -2 | tr '\n' ' ')"
    echo "  ✗ $linea — $motivo"
    FALLIDOS+=("$linea :: $motivo")
  else
    echo "  ✓ $linea"
  fi
done < "$DIR/orden.txt"

echo "▶ $((TOTAL - ${#FALLIDOS[@]}))/$TOTAL archivos aplicados."
if (( ${#FALLIDOS[@]} > 0 )); then
  echo "▶ FALLIDOS (el esquema replicado está incompleto):"
  printf '   - %s\n' "${FALLIDOS[@]}"
fi

if (( SOLO_ESQUEMA == 1 )); then
  (( ${#FALLIDOS[@]} > 0 )) && exit 1
  exit 0
fi

# Orden deliberado: las DOS corridas de la migración van ANTES de la suite.
# La suite siembra tablas append-only (buzon_bitacora, enriquecimiento_intento)
# cuyos datos no se pueden retirar, así que solo puede correr una vez por base
# — y corriéndola al final se verifica el aislamiento sobre una base que YA
# aguantó la migración dos veces, que es el estado real de producción tras un
# reintento.
echo "▶ Migración de tenencia (1ª corrida)…"
psql_f < "${MIGRACION:-$RAIZ/businessos/supabase-organizaciones.sql}" || { echo "✗ La migración falló"; exit 1; }

echo "▶ Migración de tenencia (2ª corrida — idempotencia)…"
psql_f < "${MIGRACION:-$RAIZ/businessos/supabase-organizaciones.sql}" || { echo "✗ La migración NO es idempotente"; exit 1; }

echo "▶ Suite de aislamiento…"
psql_f < "${SUITE:-$RAIZ/businessos/test-aislamiento-tenants.sql}" || { echo "✗ La suite falló"; exit 1; }

if (( ${#FALLIDOS[@]} > 0 )); then
  echo "✗ Tenencia OK, pero el esquema base quedó incompleto (ver FALLIDOS)."
  exit 1
fi

echo "✓ TODO VERDE: esquema completo (38/38), migración idempotente, suite en verde."
