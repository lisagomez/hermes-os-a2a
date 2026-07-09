#!/usr/bin/env python3
"""gen_seed_sql.py — genera 02-seed.sql desde reglas_mx.json (fuente de verdad).

Uso:
  python3 gen_seed_sql.py --check   # solo valida (gate de procedencia), no escribe
  python3 gen_seed_sql.py           # valida y escribe 02-seed.sql

Gate de procedencia (regla de oro: cero afirmacion fiscal sin fuente citada):
toda regla debe traer fuente_cita, fuente_url (http/https) y vigente_desde; el
seed completo lleva source_version. Todo tope/monto numerico exige
parametros.verificar=true (cotejo DOF pendiente hasta produccion).
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

AQUI = Path(__file__).resolve().parent
SEED_JSON = AQUI / "reglas.json"
SEED_SQL = AQUI / "02-seed.sql"

VEREDICTOS = {"deducible", "no_deducible", "permitido", "no_permitido", "dudoso"}


def err(errores: list[str], msg: str) -> None:
    errores.append(msg)


def fecha_valida(s: object) -> bool:
    try:
        date.fromisoformat(str(s))
        return True
    except ValueError:
        return False


def tiene_monto(impacto: dict) -> bool:
    """True si el impacto trae algun tope/umbral numerico (exige verificar=true)."""
    if impacto.get("tope_pct") is not None or impacto.get("tope_monto") is not None:
        return True
    return any(
        isinstance(v, (int, float)) and not isinstance(v, bool)
        for v in impacto.get("parametros", {}).values()
    )


def validar(seed: dict) -> list[str]:
    e: list[str] = []
    meta = seed.get("_meta", {})
    if not str(meta.get("source_version", "")).strip():
        err(e, "_meta.source_version vacio (procedencia obligatoria)")

    for coleccion, pk in (("jurisdicciones", "codigo"), ("dimensiones", "codigo")):
        items = seed.get(coleccion, [])
        if not items:
            err(e, f"{coleccion} vacio")
        vistos: set[str] = set()
        for it in items:
            cod = it.get(pk, "")
            if not cod or not it.get("nombre"):
                err(e, f"{coleccion}: entrada sin {pk}/nombre: {it}")
            if cod in vistos:
                err(e, f"{coleccion}: {pk} duplicado {cod!r}")
            vistos.add(cod)

    claves_cat: set[str] = set()
    kw_global: dict[str, str] = {}  # keyword -> categoria (ambiguedad rompe el clasificador)
    for cat in seed.get("categorias", []):
        clave = cat.get("clave", "")
        if not clave or not cat.get("nombre"):
            err(e, f"categoria sin clave/nombre: {cat}")
        if clave in claves_cat:
            err(e, f"categoria duplicada {clave!r}")
        claves_cat.add(clave)
        kws = cat.get("keywords", [])
        if not kws:
            err(e, f"categoria {clave}: sin keywords (inclasificable)")
        for kw in kws:
            if kw != kw.lower().strip() or not kw:
                err(e, f"categoria {clave}: keyword {kw!r} debe ir en minusculas y sin espacios extremos")
            if kw in kw_global and kw_global[kw] != clave:
                err(e, f"keyword {kw!r} repetida en {kw_global[kw]} y {clave} (clasificacion ambigua)")
            kw_global[kw] = clave

    jurs = {j.get("codigo") for j in seed.get("jurisdicciones", [])}
    dims = {d.get("codigo") for d in seed.get("dimensiones", [])}
    claves_regla: set[str] = set()
    n_impactos = 0
    for regla in seed.get("reglas", []):
        clave = regla.get("clave", "?")
        # v2: con catalogo multiple, el ambito de cada regla debe ser explicito y valido
        jur, dim = regla.get("jurisdiccion"), regla.get("dimension")
        if len(jurs) > 1 and jur is None:
            err(e, f"regla {clave}: falta jurisdiccion (hay {len(jurs)} en el catalogo)")
        if len(dims) > 1 and dim is None:
            err(e, f"regla {clave}: falta dimension (hay {len(dims)} en el catalogo)")
        if jur is not None and jur not in jurs:
            err(e, f"regla {clave}: jurisdiccion desconocida {jur!r}")
        if dim is not None and dim not in dims:
            err(e, f"regla {clave}: dimension desconocida {dim!r}")
        if clave in claves_regla:
            err(e, f"regla duplicada {clave!r}")
        claves_regla.add(clave)
        for campo in ("clave", "titulo", "texto_resumen", "fuente_cita", "fuente_url"):
            if not str(regla.get(campo, "")).strip():
                err(e, f"regla {clave}: campo {campo!r} vacio (gate de procedencia)")
        if not str(regla.get("fuente_url", "")).startswith(("http://", "https://")):
            err(e, f"regla {clave}: fuente_url no es http(s)")
        if not fecha_valida(regla.get("vigente_desde")):
            err(e, f"regla {clave}: vigente_desde invalida o ausente")
        hasta = regla.get("vigente_hasta")
        if hasta is not None:
            if not fecha_valida(hasta):
                err(e, f"regla {clave}: vigente_hasta invalida")
            elif fecha_valida(regla.get("vigente_desde")) and str(hasta) < str(regla["vigente_desde"]):
                err(e, f"regla {clave}: vigente_hasta < vigente_desde")
        impactos = regla.get("impactos", [])
        if not impactos:
            err(e, f"regla {clave}: sin impactos (regla inerte)")
        vistos_imp: set[tuple] = set()
        for imp in impactos:
            n_impactos += 1
            cat = imp.get("categoria")
            if cat is not None and cat not in claves_cat:
                err(e, f"regla {clave}: impacto con categoria desconocida {cat!r}")
            ver = imp.get("veredicto_base")
            if ver is not None and ver not in VEREDICTOS:
                err(e, f"regla {clave}: veredicto_base invalido {ver!r}")
            pct = imp.get("tope_pct")
            if pct is not None and not (0 <= float(pct) <= 100):
                err(e, f"regla {clave}: tope_pct fuera de [0,100]")
            monto = imp.get("tope_monto")
            if monto is not None and float(monto) < 0:
                err(e, f"regla {clave}: tope_monto negativo")
            for lista in ("requisitos", "banderas"):
                val = imp.get(lista, [])
                if not isinstance(val, list) or any(not isinstance(x, str) or not x.strip() for x in val):
                    err(e, f"regla {clave}: {lista} debe ser lista de strings no vacios")
            if not isinstance(imp.get("parametros", {}), dict):
                err(e, f"regla {clave}: parametros debe ser objeto")
            if tiene_monto(imp) and imp.get("parametros", {}).get("verificar") is not True:
                err(e, f"regla {clave}: impacto con monto/tope sin parametros.verificar=true (cotejo DOF pendiente)")
            llave = (cat, imp.get("regimen", seed["_meta"].get("regimen_default", "PM_TITULO_II")))
            if llave in vistos_imp:
                err(e, f"regla {clave}: impacto duplicado para (categoria,regimen)={llave}")
            vistos_imp.add(llave)

    return e


# --- Generacion SQL ---------------------------------------------------------

def lit(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def jsonb(obj: object) -> str:
    return lit(json.dumps(obj, ensure_ascii=False)) + "::jsonb"


def arr(items: list[str]) -> str:
    if not items:
        return "'{}'::text[]"
    return "array[" + ", ".join(lit(x) for x in items) + "]::text[]"


def opt(v: object, wrap=lambda x: str(x)) -> str:
    return "null" if v is None else wrap(v)


def generar_sql(seed: dict) -> str:
    meta = seed["_meta"]
    source_version = meta["source_version"]
    regimen_default = meta.get("regimen_default", "PM_TITULO_II")
    jur_default = seed["jurisdicciones"][0]["codigo"] if len(seed["jurisdicciones"]) == 1 else None
    dim_default = seed["dimensiones"][0]["codigo"] if len(seed["dimensiones"]) == 1 else None

    out: list[str] = [
        "-- 02-seed.sql — GENERADO por gen_seed_sql.py desde reglas_mx.json. NO EDITAR A MANO.",
        f"-- source_version: {source_version}",
        "-- Idempotente: upserts sobre claves naturales (reseed real = volumen virgen).",
        "begin;",
        "",
    ]

    for j in seed["jurisdicciones"]:
        out.append(
            f"insert into jurisdicciones (codigo, nombre) values ({lit(j['codigo'])}, {lit(j['nombre'])})\n"
            "  on conflict (codigo) do update set nombre = excluded.nombre;"
        )
    out.append("")
    for d in seed["dimensiones"]:
        out.append(
            f"insert into dimensiones (codigo, nombre) values ({lit(d['codigo'])}, {lit(d['nombre'])})\n"
            "  on conflict (codigo) do update set nombre = excluded.nombre;"
        )
    out.append("")
    for c in seed["categorias"]:
        out.append(
            "insert into categorias_gasto (clave, nombre, descripcion, keywords) values\n"
            f"  ({lit(c['clave'])}, {lit(c['nombre'])}, {opt(c.get('descripcion'), lit)}, {arr(c['keywords'])})\n"
            "  on conflict (clave) do update set nombre = excluded.nombre,\n"
            "    descripcion = excluded.descripcion, keywords = excluded.keywords;"
        )
    out.append("")

    for r in seed["reglas"]:
        jur = r.get("jurisdiccion", jur_default)
        dim = r.get("dimension", dim_default)
        if jur is None or dim is None:
            raise ValueError(f"regla {r['clave']}: jurisdiccion/dimension ambigua (especificar en la regla)")
        out.append(
            "insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,\n"
            "                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values\n"
            f"  ({lit(r['clave'])}, {lit(jur)}, {lit(dim)}, {lit(r['titulo'])}, {lit(r['texto_resumen'])},\n"
            f"   {lit(r['fuente_cita'])}, {lit(r['fuente_url'])}, {lit(source_version)},\n"
            f"   {lit(r['vigente_desde'])}::date, {opt(r.get('vigente_hasta'), lambda v: lit(v) + '::date')})\n"
            "  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,\n"
            "    dimension = excluded.dimension, titulo = excluded.titulo,\n"
            "    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,\n"
            "    fuente_url = excluded.fuente_url, source_version = excluded.source_version,\n"
            "    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;"
        )
        for imp in r["impactos"]:
            regimen = imp.get("regimen", regimen_default)
            out.append(
                "insert into impactos (regla_id, categoria, regimen, veredicto_base,\n"
                "                      tope_monto, tope_pct, requisitos, banderas, parametros)\n"
                f"  select r.id, {opt(imp.get('categoria'), lit)}, {lit(regimen)}, {opt(imp.get('veredicto_base'), lit)},\n"
                f"         {opt(imp.get('tope_monto'))}, {opt(imp.get('tope_pct'))},\n"
                f"         {jsonb(imp.get('requisitos', []))}, {jsonb(imp.get('banderas', []))}, {jsonb(imp.get('parametros', {}))}\n"
                f"  from reglas r where r.clave = {lit(r['clave'])}\n"
                "  on conflict (regla_id, categoria, regimen) do update set\n"
                "    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,\n"
                "    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,\n"
                "    banderas = excluded.banderas, parametros = excluded.parametros;"
            )
        out.append("")

    out.append("commit;")
    out.append("")
    return "\n".join(out)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true", help="solo validar, no escribir SQL")
    ap.add_argument("--json", type=Path, default=SEED_JSON)
    ap.add_argument("--out", type=Path, default=SEED_SQL)
    args = ap.parse_args()

    seed = json.loads(args.json.read_text(encoding="utf-8"))
    errores = validar(seed)
    n_reglas = len(seed.get("reglas", []))
    n_imp = sum(len(r.get("impactos", [])) for r in seed.get("reglas", []))
    n_cat = len(seed.get("categorias", []))

    if errores:
        print(f"GATE DE PROCEDENCIA: FALLO ({len(errores)} errores)", file=sys.stderr)
        for msg in errores:
            print(f"  - {msg}", file=sys.stderr)
        return 1

    print(f"GATE DE PROCEDENCIA: OK — {n_reglas} reglas, {n_imp} impactos, {n_cat} categorias")
    if args.check:
        return 0

    args.out.write_text(generar_sql(seed), encoding="utf-8")
    print(f"Escrito {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
