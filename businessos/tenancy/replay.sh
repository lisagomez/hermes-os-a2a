#!/usr/bin/env bash
# ============================================================================
#  replay.sh — Reconstruye el esquema en un Postgres efímero y valida la
#              capa de tenencia (migración + suite + idempotencia).
#
#  Uso:
#     businessos/tenancy/replay.sh              # ciclo completo
#     businessos/tenancy/replay.sh --solo-esquema
#
#  DOS MODOS DE CONEXIÓN (PG_MODO=auto|docker|tcp; por defecto `auto`):
#
#    docker — levanta y tira su propio `postgres:16-alpine`. Es lo que corre
#             en CI y no cambió. `auto` lo elige cuando no hay PGHOST.
#    tcp    — habla por TCP con un Postgres YA levantado, con el `psql` del
#             anfitrión. Existe porque hay máquinas con el cliente de docker
#             pero sin acceso al daemon, donde este gate era inejecutable y por
#             tanto se saltaba — un gate que no se puede correr no protege nada.
#             `auto` lo elige en cuanto PGHOST está definida.
#
#             Variables (las estándar de libpq): PGHOST, PGPORT (5432),
#             PGUSER (postgres), PGPASSWORD, PGDATABASE (tenencia_efimera) y
#             PG_BASE_MANTENIMIENTO (postgres, la base desde la que se recrea
#             la de trabajo). ⚠ La base de PGDATABASE se DESTRUYE y se recrea
#             en cada corrida: ver la guarda del bloque de arranque.
#
#  No toca producción ni lee ninguna credencial.
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
IMAGEN="${PG_IMAGEN:-postgres:16-alpine}"
SOLO_ESQUEMA=0
[[ "${1:-}" == "--solo-esquema" ]] && SOLO_ESQUEMA=1

# ── Modo de conexión ────────────────────────────────────────────────────────
# `auto` mira si hay PGHOST: quien exporta las variables de libpq ya declaró
# a qué Postgres quiere hablarle. Sin PGHOST se conserva el comportamiento
# histórico (docker), así que CI no cambia de camino por este añadido.
MODO="${PG_MODO:-auto}"
if [[ "$MODO" == auto ]]; then
  if [[ -n "${PGHOST:-}" ]]; then MODO=tcp; else MODO=docker; fi
fi
case "$MODO" in
  docker|tcp) ;;
  *) echo "✗ PG_MODO='$MODO' no existe. Valores: auto | docker | tcp"; exit 1 ;;
esac

if [[ "$MODO" == tcp ]]; then
  PGHOST="${PGHOST:-127.0.0.1}"
  PGPORT="${PGPORT:-5432}"
  PGUSER="${PGUSER:-postgres}"
  # La base de trabajo NO es `postgres` por defecto a propósito: se destruye en
  # cada corrida, y el default de un script destructivo no debe ser la base que
  # cualquier cliente encuentra ya creada.
  BASE="${PGDATABASE:-tenencia_efimera}"
  MANT="${PG_BASE_MANTENIMIENTO:-postgres}"
  # Exportadas para que las tomen todas las invocaciones de psql. PGDATABASE no
  # se exporta: cada llamada dice con -d a qué base va, para que el drop/create
  # no dependa de una variable de ambiente que alguien pueda haber movido.
  export PGHOST PGPORT PGUSER
  psql_f()    { psql -d "$BASE" -v ON_ERROR_STOP=1 -q -f - ; }
  psql_mant() { psql -d "$MANT" -v ON_ERROR_STOP=1 -qAt -c "$1" ; }

  echo "▶ Modo TCP → $PGUSER@$PGHOST:$PGPORT · base de trabajo '$BASE' (se recrea desde cero)…"

  command -v psql >/dev/null 2>&1 || {
    echo "✗ No hay 'psql' en el PATH y el modo tcp lo necesita (paquete postgresql-client)."
    exit 1
  }

  # ── Guarda · este script es DESTRUCTIVO sobre la base de trabajo ───────────
  # El prelude ya aborta si huele a Supabase real, pero eso solo protege de una
  # plataforma; un Postgres propio con datos no lo detectaría. Dos frenos más:
  # el destino tiene que ser local, y la base de trabajo no puede ser la de
  # mantenimiento (que además es la que suele traer datos de alguien).
  case "$PGHOST" in
    127.0.0.1|::1|localhost|/*) ;;
    *)
      if [[ "${PG_TCP_REMOTO:-0}" != "1" ]]; then
        echo "✗ PGHOST='$PGHOST' no es local y este ciclo DESTRUYE la base '$BASE'."
        echo "  Si de verdad es un Postgres desechable remoto: PG_TCP_REMOTO=1."
        exit 1
      fi
      echo "  ⚠ PG_TCP_REMOTO=1 — destino remoto aceptado bajo tu responsabilidad."
      ;;
  esac
  if [[ "$BASE" == "$MANT" ]]; then
    echo "✗ PGDATABASE ('$BASE') es la base de mantenimiento: no se puede destruir"
    echo "  la base desde la que se ejecuta el drop. Usa otra (p. ej. tenencia_efimera)."
    exit 1
  fi

  # Sonda de disponibilidad contra la base de MANTENIMIENTO (la de trabajo aún
  # no existe). Corta rápido: aquí el Postgres lo levantó alguien más, así que
  # no aparecerá "en camino" como el entrypoint de la imagen en CI.
  listo=0
  for _ in $(seq 1 "${PG_ESPERA_SEG:-15}"); do
    if psql -d "$MANT" -qAt -c 'select 1' >/dev/null 2>&1; then listo=1; break; fi
    command sleep 1
  done
  if (( listo == 0 )); then
    echo "✗ No responde ningún Postgres en $PGHOST:$PGPORT (base '$MANT'). Error real:"
    psql -d "$MANT" -c 'select 1' 2>&1 | head -5 | sed 's/^/    /'
    exit 1
  fi

  # ── Base virgen en cada corrida ───────────────────────────────────────────
  # En modo docker esto sale gratis: cada corrida es un contenedor nuevo. Por
  # TCP el servidor sobrevive entre corridas, y control-reversion.sh ejecuta
  # este ciclo SIETE veces esperando una base limpia; sin el drop/create, del
  # segundo sabotaje en adelante el esquema ya estaría aplicado y el control
  # mediría otra cosa. `with (force)` (Postgres 13+) echa las conexiones vivas.
  echo "▶ Recreando la base '$BASE' desde cero…"
  psql_mant "drop database if exists \"$BASE\" with (force)" >/dev/null || {
    echo "✗ No se pudo destruir '$BASE'"; exit 1; }
  psql_mant "create database \"$BASE\"" >/dev/null || {
    echo "✗ No se pudo crear '$BASE'"; exit 1; }
else
  psql_f() { docker exec -i "$CONTENEDOR" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f - ; }

  echo "▶ Levantando $IMAGEN como '$CONTENEDOR'…"
  docker rm -f "$CONTENEDOR" >/dev/null 2>&1
  # Sin -p: todo acceso va por `docker exec`. Publicar el puerto dejaba un
  # Postgres con contraseña 'x' escuchando en todas las interfaces del anfitrión.
  docker run -d --name "$CONTENEDOR" -e POSTGRES_PASSWORD=x "$IMAGEN" >/dev/null || exit 1
  # La espera corre DENTRO del contenedor: un `sleep` de primer plano en el
  # anfitrión puede estar bloqueado según dónde se ejecute este script, y sin
  # espera real el bucle se agota en milisegundos y declara un arranque fallido
  # que en realidad iba en camino.
  # ⚠ La sonda va por TCP (-h 127.0.0.1), NO pg_isready por socket: el entrypoint
  # de la imagen levanta un servidor TEMPORAL solo-socket durante el init y lo
  # reinicia después — pg_isready da verde en esa ventana y el prelude pega en el
  # hueco (visto en CI, donde la imagen se baja fría y el timing lo expone). El
  # servidor temporal no escucha TCP; el definitivo sí: la sonda TCP no miente.
  listo=0
  for _ in $(seq 1 90); do
    if docker exec -e PGPASSWORD=x "$CONTENEDOR" psql -h 127.0.0.1 -U postgres -d postgres -qAt -c 'select 1' >/dev/null 2>&1; then
      listo=1; break
    fi
    docker exec "$CONTENEDOR" sh -c 'sleep 1' >/dev/null 2>&1 || command sleep 1
  done
  if (( listo == 0 )); then
    echo "✗ Postgres no arrancó. Últimas líneas del log:"
    docker logs "$CONTENEDOR" 2>&1 | tail -5
    exit 1
  fi
fi

echo "▶ Prelude (roles, auth, extensiones)…"
psql_f < "$DIR/00-prelude.sql" || { echo "✗ El prelude falló: nada más tiene sentido"; exit 1; }

# ── El manifiesto es el punto por donde entra la deriva ─────────────────────
# Un .sql que existe en el repo pero NO está en orden.txt no crea sus tablas en
# el efímero, T5 no puede verlas, y la corrida sale verde con menos cobertura.
# Es el mismo colapso silencioso que la aserción de siembra evita una capa más
# abajo. Aquí se caza arriba.
echo "▶ Comprobando que el manifiesto no se quedó atrás…"
EXCLUIDOS=("supabase-organizaciones.sql")
FALTAN=()
en_manifiesto() { grep -qE "^[[:space:]]*$1[[:space:]]*$" "$DIR/orden.txt"; }
# (los globs de las ubicaciones VIEJAS quedan como guarda: un .sql que nazca ahí
#  sale en rojo aquí en vez de perderse — la casa nueva es businessos/migrations/)
for f in "$RAIZ"/businessos/migrations/*.sql \
         "$RAIZ"/businessos/supabase-*.sql \
         "$RAIZ"/businessos/frontends/control-interno/supabase/migrations/*.sql \
         "$RAIZ"/supabase/migrations/*.sql; do
  [[ -f "$f" ]] || continue
  base="$(basename "$f")"
  omitir=0
  for e in "${EXCLUIDOS[@]}"; do [[ "$base" == "$e" ]] && omitir=1; done
  (( omitir )) && continue
  en_manifiesto "${f#"$RAIZ/"}" || FALTAN+=("${f#"$RAIZ/"}")
done
if (( ${#FALTAN[@]} > 0 )); then
  echo "✗ Estos archivos de esquema NO están en businessos/tenancy/orden.txt:"
  printf '   - %s\n' "${FALTAN[@]}"
  echo "  Añádelos (en su posición de dependencia) o decláralos como excluidos"
  echo "  en EXCLUIDOS. Sin esto, sus tablas no existen en el efímero y la"
  echo "  prueba T5 no puede saber que faltan por clasificar."
  exit 1
fi

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

# La migración se prueba contra una base CON datos, como producción. Sin esto,
# el backfill del bloque 4 corre sobre 0 filas, ningún trigger dispara, y un
# backfill que ABORTARÍA en producción (UPDATE sobre tablas append-only) sale
# verde aquí. Cero filas ⇒ cero verdad.
echo "▶ Pre-siembra de datos 'de producción' (append-only pobladas ANTES de migrar)…"
psql_f < "$DIR/01-preseed-produccion.sql" || { echo "✗ La pre-siembra falló"; exit 1; }

# Orden deliberado: las DOS corridas de la migración van ANTES de la suite.
# La suite siembra tablas append-only (buzon_bitacora, enriquecimiento_intento)
# cuyos datos no se pueden retirar, así que solo puede correr una vez por base
# — y corriéndola al final se verifica el aislamiento sobre una base que YA
# aguantó la migración dos veces, que es el estado real de producción tras un
# reintento.
echo "▶ Migración de tenencia (1ª corrida)…"
psql_f < "${MIGRACION:-$RAIZ/businessos/migrations/supabase-organizaciones.sql}" || { echo "✗ La migración falló"; exit 1; }

echo "▶ Migración de tenencia (2ª corrida — idempotencia)…"
psql_f < "${MIGRACION:-$RAIZ/businessos/migrations/supabase-organizaciones.sql}" || { echo "✗ La migración NO es idempotente"; exit 1; }

# La demostración del gate: las filas pre-sembradas en las append-only deben
# haber quedado con tenant_id poblado SIN que la migración tocara sus triggers.
echo "▶ Verificando el backfill sobre las filas pre-sembradas…"
psql_f <<'SQL' || { echo "✗ El backfill no cubrió las tablas append-only pre-sembradas"; exit 1; }
\set ON_ERROR_STOP on
do $$
declare n_filas bigint; n_nulas bigint; t text;
begin
  foreach t in array array['buzon_bitacora','enriquecimiento_intento'] loop
    execute format('select count(*), count(*) filter (where tenant_id is null) from public.%I', t)
      into n_filas, n_nulas;
    if n_filas = 0 then
      raise exception 'GATE CIEGO: % migró VACÍA — la pre-siembra no corrió y este chequeo no prueba nada', t;
    end if;
    if n_nulas > 0 then
      raise exception 'BACKFILL INCOMPLETO: % tiene % filas con tenant_id null tras la migración', t, n_nulas;
    end if;
  end loop;
  raise notice 'BACKFILL verificado sobre filas reales en las 2 tablas append-only.';
end $$;
SQL

echo "▶ Suite de aislamiento…"
psql_f < "${SUITE:-$RAIZ/businessos/tenancy/test-aislamiento-tenants.sql}" || { echo "✗ La suite falló"; exit 1; }

if (( ${#FALLIDOS[@]} > 0 )); then
  echo "✗ Tenencia OK, pero el esquema base quedó incompleto (ver FALLIDOS)."
  exit 1
fi

# En modo tcp la base se deja en pie a propósito: el servidor no es nuestro y
# una base que sobrevive al verde es lo único con lo que se puede depurar
# después. La corrida siguiente la recrea de todos modos.
if [[ "$MODO" == docker ]]; then
  docker rm -f "$CONTENEDOR" >/dev/null 2>&1
fi
echo "✓ TODO VERDE: esquema completo ($TOTAL/$TOTAL), migración idempotente, backfill sobre datos reales, suite en verde."
