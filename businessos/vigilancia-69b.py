#!/usr/bin/env python3
"""vigilancia-69b.py — host-job: alimenta contraparte_69b desde el listado 69-B del SAT.

El PRODUCTOR del gate 69-B de enriquecimiento-a2a (el servicio solo LEE la
tabla; sin este job el gate queda bloqueado para todo RFC — fail-closed
correcto, pero inutil si nadie lo alimenta: objecion ALTA del ataque
adversarial al diseno de App A).

Que hace, en orden:
  1. Junta los RFCs objetivo: los vistos por la cascada (ledger
     enriquecimiento_intento, fuente=rfc_offline, hits no suprimidos) + los ya
     vigilados (contraparte_69b, para refrescar su dictamen) + los de --rfc.
  2. Descarga el listado COMPLETO 69-B del SAT (CSV publico) con UA curl/8.0
     (aprendizaje 2026-07-02) y lo indexa por RFC quedandose con la situacion
     MAS SEVERA si un RFC aparece varias veces (fail-safe).
  3. Guardas de plausibilidad ANTES de escribir (QA PR #210): el SAT solo sirve
     este CSV por HTTP sin TLS (https verificado inalcanzable el 2026-08-02),
     y 'no_listado' es el dato POSITIVO que ABRE el gate — un CSV truncado o
     alterado en transito que conserve el encabezado seria fail-open. Por eso:
     (a) listado con menos de VIGILANCIA_69B_MIN_FILAS RFCs (default 5000; el
         real trae >10k) = aborta sin escribir;
     (b) un RFC vigilado con estatus presunto/definitivo que "desaparezca" del
         listado (→ no_listado) = aborta sin escribir, salvo --permitir-descensos
         (un RFC no suele salir del listado 69-B: sospechar del CSV, no del SAT).
  4. UPSERT por RFC (on_conflict=rfc, resolution=merge-duplicates): estatus del
     listado, o 'no_listado' si no aparece. Jamas DELETE+INSERT (los overrides
     anclan con FK restrict). Si un estatus EMPEORA, el trigger de la tabla
     invalida los overrides vivos: ese es el comportamiento deseado, no un
     efecto colateral.

Las lecturas de objetivos van PAGINADAS (Range): sin eso, el max-rows de
PostgREST (1000 por default) truncaria los objetivos EN SILENCIO y los
dictamenes fuera del corte envejecerian sin refresco (el gate ademas ya
bloquea dictamenes rancios: gate_69b.MAX_EDAD_DIAS_DEFAULT).

Todo fallo IMPRIME y el exit code lo refleja (doctrina 2026-07-13: ningun
best-effort silencioso). Secretos: solo via env, jamas impresos.

Uso (en el servidor, con ~/repo/businessos/.env cargado):
  python3 vigilancia-69b.py [--rfc RFC ...] [--dry-run]
Cron: nightly-jobs.sh (despues del ingest, antes del snapshot del trio).
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

SAT_69B_URL_DEFAULT = (
    "http://omawww.sat.gob.mx/cifras_sat/Documents/Listado_Completo_69-B.csv"
)
TOMBSTONE = "[suprimido-lfpdppp]"

# misma escala que public.severidad_69b (fail-safe: lo peor gana)
SEVERIDAD = {"no_listado": 0, "sentencia_favorable": 1, "desvirtuado": 1,
             "presunto": 2, "definitivo": 3}


def http(url: str, *, headers: dict | None = None, data: bytes | None = None,
         method: str = "GET", timeout: int = 120) -> tuple[int, bytes]:
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("User-Agent", "curl/8.0")  # Cloudflare 1010 (aprendizaje 2026-07-02)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


PAGINA = 1000


def supabase_get(base: str, key: str, ruta: str) -> list:
    """GET paginado por Range: acumula hasta la pagina corta (jamas trunca)."""
    filas: list = []
    inicio = 0
    while True:
        status, cuerpo = http(
            f"{base}/rest/v1/{ruta}",
            headers={"apikey": key, "Authorization": f"Bearer {key}",
                     "Range-Unit": "items",
                     "Range": f"{inicio}-{inicio + PAGINA - 1}"},
            timeout=60,
        )
        if status not in (200, 206):
            raise RuntimeError(f"GET {ruta.split('?')[0]} -> HTTP {status}")
        pagina = json.loads(cuerpo)
        filas.extend(pagina)
        if len(pagina) < PAGINA:
            return filas
        inicio += PAGINA


def estatus_de(situacion: str) -> str | None:
    s = situacion.strip().lower()
    if "definitiv" in s:
        return "definitivo"
    if "sentencia" in s:
        return "sentencia_favorable"
    if "desvirtuad" in s:
        return "desvirtuado"
    if "presunt" in s:
        return "presunto"
    return None


def parsear_listado(crudo: bytes) -> dict[str, str]:
    """CSV del SAT -> {RFC: estatus}. Robusto a lineas de preambulo y encoding."""
    try:
        texto = crudo.decode("utf-8")
    except UnicodeDecodeError:
        texto = crudo.decode("latin-1")
    lineas = texto.splitlines()
    inicio, col_rfc, col_sit = None, None, None
    for i, linea in enumerate(lineas[:20]):
        celdas = next(csv.reader([linea]))
        normales = [c.strip().lower() for c in celdas]
        if any(c == "rfc" for c in normales) and any("situaci" in c for c in normales):
            inicio = i
            col_rfc = next(j for j, c in enumerate(normales) if c == "rfc")
            col_sit = next(j for j, c in enumerate(normales) if "situaci" in c)
            break
    if inicio is None:
        raise RuntimeError("el CSV del SAT no trae encabezado con columnas RFC/Situacion")

    mapa: dict[str, str] = {}
    for fila in csv.reader(io.StringIO("\n".join(lineas[inicio + 1:]))):
        if len(fila) <= max(col_rfc, col_sit):
            continue
        rfc = fila[col_rfc].strip().upper()
        estatus = estatus_de(fila[col_sit])
        if not rfc or estatus is None:
            continue
        previo = mapa.get(rfc)
        if previo is None or SEVERIDAD[estatus] > SEVERIDAD[previo]:
            mapa[rfc] = estatus
    return mapa


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--rfc", nargs="*", default=[], help="RFCs extra a vigilar")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--permitir-descensos", action="store_true",
                    help="deja escribir aunque un RFC presunto/definitivo "
                         "desaparezca del listado (verificar el CSV a mano antes)")
    args = ap.parse_args()

    base = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
    if not (base and key):
        print("vigilancia-69b: falta SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el env")
        return 1

    # 1. objetivos: vistos por la cascada + ya vigilados + explicitos
    objetivos: set[str] = {r.strip().upper() for r in args.rfc if r.strip()}
    try:
        vistos = supabase_get(
            base, key,
            "enriquecimiento_intento?fuente=eq.rfc_offline&resultado=eq.hit"
            "&veredicto=in.(valido,dudoso)&select=valor",
        )
        objetivos |= {f["valor"].upper() for f in vistos
                      if f.get("valor") and f["valor"] != TOMBSTONE}
        vigilados = supabase_get(base, key, "contraparte_69b?select=rfc,estatus")
        objetivos |= {f["rfc"] for f in vigilados}
        estatus_previo = {f["rfc"]: f.get("estatus", "") for f in vigilados}
    except (RuntimeError, ValueError) as exc:
        print(f"vigilancia-69b: no se pudieron leer los RFCs objetivo: {exc}")
        return 1

    if not objetivos:
        print("vigilancia-69b: 0 RFCs objetivo (cascada sin RFCs aun) — nada que hacer")
        return 0

    # 2. listado del SAT
    sat_url = os.environ.get("SAT_69B_URL", SAT_69B_URL_DEFAULT)
    status, crudo = http(sat_url)
    if status != 200:
        print(f"vigilancia-69b: descarga del listado SAT fallo (HTTP {status}) — "
              "sin datos frescos NO se escribe nada (el gate sigue fail-closed)")
        return 1
    try:
        listado = parsear_listado(crudo)
    except RuntimeError as exc:
        print(f"vigilancia-69b: {exc}")
        return 1
    print(f"vigilancia-69b: listado SAT con {len(listado)} RFCs; "
          f"{len(objetivos)} objetivos a dictaminar")

    # guardas de plausibilidad (canal HTTP sin TLS; 'no_listado' abre el gate)
    min_filas = int(os.environ.get("VIGILANCIA_69B_MIN_FILAS", "5000"))
    if len(listado) < min_filas:
        print(f"vigilancia-69b: listado implausiblemente corto ({len(listado)} "
              f"RFCs < umbral {min_filas}) — NO se escribe nada (un CSV truncado "
              "que conserve el encabezado seria fail-open). Si el listado real "
              "encogio, ajustar VIGILANCIA_69B_MIN_FILAS a conciencia")
        return 1
    descensos = sorted(
        rfc for rfc, previo in estatus_previo.items()
        if previo in ("presunto", "definitivo")
        and listado.get(rfc, "no_listado") == "no_listado")
    if descensos and not args.permitir_descensos:
        muestra = ", ".join(descensos[:5]) + ("..." if len(descensos) > 5 else "")
        print(f"vigilancia-69b: {len(descensos)} RFC(s) presunto/definitivo "
              f"desaparecerian del listado y ABRIRIAN el gate ({muestra}) — NO se "
              "escribe nada. Un RFC no suele salir del listado 69-B: verificar el "
              "CSV a mano y re-correr con --permitir-descensos solo si es real")
        return 1

    # 3. upsert (jamas DELETE+INSERT: los overrides anclan con FK restrict).
    # consultado_en explicito: en un upsert el default de la columna no re-aplica.
    ahora = datetime.now(timezone.utc).isoformat()
    filas = [{"rfc": rfc,
              "estatus": listado.get(rfc, "no_listado"),
              "fuente": sat_url,
              "consultado_en": ahora} for rfc in sorted(objetivos)]

    en_listado = sum(1 for f in filas if f["estatus"] != "no_listado")
    if args.dry_run:
        print(f"vigilancia-69b [dry-run]: escribiria {len(filas)} dictamenes "
              f"({en_listado} listados, {len(filas) - en_listado} no_listado)")
        return 0

    cuerpo = json.dumps(filas).encode()
    status, resp = http(
        f"{base}/rest/v1/contraparte_69b?on_conflict=rfc",
        headers={"apikey": key, "Authorization": f"Bearer {key}",
                 "Content-Type": "application/json",
                 "Prefer": "resolution=merge-duplicates,return=minimal"},
        data=cuerpo, method="POST", timeout=60,
    )
    if status not in (200, 201, 204):
        print(f"vigilancia-69b: upsert fallo (HTTP {status}): {resp[:300]!r}")
        return 1
    print(f"vigilancia-69b: OK — {len(filas)} dictamenes escritos "
          f"({en_listado} en el listado, {len(filas) - en_listado} no_listado)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
