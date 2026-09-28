#!/usr/bin/env python3
"""Que cambia al subir el pin: el motor de aqui (evaluador.py) sobre el seed viejo y el nuevo.

Los casos se DERIVAN de los seeds, no se escriben a mano (salvo los incidentes): cada keyword en
cada ambito de su categoria, cada exclusion, el otro regimen, el fail-safe, la vigencia a ambos
lados de cada `vigente_desde`, la agregacion, el ambito cruzado y los incidentes reales. Es el
mismo generador del corpus de paridad de la fuente unica (medicion/casos.mjs de
@tu-scope/grafo-conocimiento), portado: sobre el seed del corte 97d9f9e da los mismos casos con los
mismos ids. Todo con fecha fija: nada depende del dia en que se corre.

Casos del seed viejo con su id; los que solo existen en el nuevo (una categoria o una vigencia
nueva) llevan el prefijo `nuevo-`. Cada diferencia se clasifica:
  - `orden`: identica al ordenar checklist, banderas y fuentes. El paquete ordena las reglas por
    clave y este motor arma esas listas en el orden del seed: no cambia ningun veredicto.
  - `contenido`: cualquier otra. Se declara y se firma antes de mezclar.
  - `cambia_estado`: la parte de `contenido` en la que cambia un estado (global o de un concepto).

Uso:  python3 diferencias.py <seed-viejo.json> <seed-nuevo.json> [--fecha 2026-09-06]
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import evaluador  # noqa: E402

REGIMEN = "PM_TITULO_II"
OTRO_REGIMEN = "PF_ACTIVIDAD_EMPRESARIAL"
SIN_REGLA = ["compra de flores para la oficina", "¿puedo hacer envios internacionales sin permiso especial?"]
# La fecha del corte congelado: la misma con la que se genero el corpus de paridad.
FECHA = "2026-09-06"


def _dia_antes(iso: str) -> str:
    return (date.fromisoformat(iso) - timedelta(days=1)).isoformat()


def _caso(familia, conceptos, ambito, fecha, regimen=REGIMEN) -> dict:
    jurisdiccion, dimension = ambito
    return {
        "familia": familia,
        "entrada": {
            "conceptos": conceptos,
            "contexto": {"jurisdiccion": jurisdiccion, "dimension": dimension, "regimen": regimen, "fecha": fecha},
        },
    }


def _ambitos_por_categoria(seed: dict) -> dict[str, list[tuple[str, str]]]:
    m: dict[str, set[str]] = {}
    for r in seed["reglas"]:
        for imp in r["impactos"]:
            if imp.get("categoria"):
                m.setdefault(imp["categoria"], set()).add(f"{r['jurisdiccion']}|{r['dimension']}")
    return {k: [tuple(a.split("|")) for a in sorted(v)] for k, v in m.items()}


def _incidentes(fecha: str) -> list[dict]:
    return [
        # 2026-07-09, #dep-legal: sin exclusiones caia en DRONES_DELIVERY (commit 86ee4dc).
        _caso("incidente", [{"descripcion": "quiero ser un agente de seguros para drones delivery"}], ("MX", "regulatorio"), fecha),
        _caso("incidente", [{"descripcion": "Uso de drones para delivery en Mexico"}], ("MX", "regulatorio"), fecha),
        # Conflicto vivo del seed congelado: 27-VII deducible frente a 28-XXVII dudoso.
        _caso("incidente", [{"descripcion": "Intereses del credito bancario"}], ("MX", "fiscal"), fecha),
        # La regla de 2010 se borro (_bajas): un hecho de 2024 se quedaba sin regla.
        _caso("incidente", [{"descripcion": "clausula de confidencialidad"}], ("MX", "contractual"), "2024-06-01"),
        _caso("incidente", [{"descripcion": "clausula de confidencialidad"}], ("MX", "contractual"), "2026-06-01"),
    ]


def construye_casos(seed: dict, fecha: str = FECHA) -> list[dict]:
    ambitos = _ambitos_por_categoria(seed)
    categorias = sorted(seed["categorias"], key=lambda c: c["clave"])
    casos: list[dict] = []
    for cat in categorias:
        for amb in ambitos.get(cat["clave"], []):
            for kw in cat["keywords"]:
                casos.append(_caso("keyword", [{"descripcion": kw}], amb, fecha))
            for x in cat.get("exclusiones", []):
                casos.append(_caso("exclusion", [{"descripcion": f"{x} {cat['keywords'][0]}"}], amb, fecha))
            casos.append(_caso("regimen", [{"descripcion": cat["keywords"][0]}], amb, fecha, OTRO_REGIMEN))
    todos = sorted({"|".join(a) for lista in ambitos.values() for a in lista})
    for amb in todos:
        for t in SIN_REGLA:
            casos.append(_caso("sin_regla", [{"descripcion": t}], tuple(amb.split("|")), fecha))

    kw_de = {c["clave"]: c["keywords"][0] for c in categorias}
    vistos: set[str] = set()
    for r in sorted(seed["reglas"], key=lambda r: r["clave"]):
        cat = next((i["categoria"] for i in r["impactos"] if i.get("categoria")), None)
        if not cat or r["vigente_desde"] <= "1900-01-02":
            continue
        for f in (_dia_antes(r["vigente_desde"]), r["vigente_desde"]):
            llave = f"{cat}|{r['jurisdiccion']}|{r['dimension']}|{f}"
            if llave in vistos:
                continue
            vistos.add(llave)
            casos.append(_caso("vigencia", [{"descripcion": kw_de[cat]}], (r["jurisdiccion"], r["dimension"]), f))

    # Agregacion (uno con regla y otro sin regla) y ambito cruzado (categoria de MX consultada en CO).
    fiscal = next((c for c in categorias if ("MX", "fiscal") in ambitos.get(c["clave"], [])), None)
    if fiscal:
        kw = fiscal["keywords"][0]
        casos.append(_caso("agregado", [{"descripcion": kw}, {"descripcion": SIN_REGLA[0]}], ("MX", "fiscal"), fecha))
        casos.append(_caso("agregado", [{"descripcion": kw}, {"descripcion": kw}], ("MX", "fiscal"), fecha))
        casos.append(_caso("ambito_cruzado", [{"descripcion": kw}], ("CO", "fiscal"), fecha))
    casos.extend(_incidentes(fecha))
    return [{"id": f"{c['familia']}-{n + 1:04d}", **c} for n, c in enumerate(casos)]


def _corre(seed: dict, entrada: dict) -> dict:
    return evaluador.evaluar(entrada["conceptos"], seed["reglas"], seed["categorias"], entrada["contexto"])


def _sin_orden(salida: dict) -> dict:
    ordena = lambda xs: sorted(xs, key=lambda x: json.dumps(x, sort_keys=True, ensure_ascii=False))  # noqa: E731
    return {
        **salida,
        "conceptos": [{**c, "banderas": ordena(c["banderas"]), "checklist": ordena(c["checklist"])} for c in salida["conceptos"]],
        "banderas_rojas": ordena(salida["banderas_rojas"]),
        "checklist": ordena(salida["checklist"]),
        "fuentes": ordena(salida["fuentes"]),
    }


def _estados(salida: dict) -> list[str]:
    return [salida["estado"], *(c["estado"] for c in salida["conceptos"])]


def compara(viejo: dict, nuevo: dict, fecha: str = FECHA) -> dict:
    casos = construye_casos(viejo, fecha)
    ya = {json.dumps(c["entrada"], sort_keys=True) for c in casos}
    casos += [
        {**c, "id": f"nuevo-{c['id']}"}
        for c in construye_casos(nuevo, fecha)
        if json.dumps(c["entrada"], sort_keys=True) not in ya
    ]
    orden, contenido = [], []
    for c in casos:
        a, b = _corre(viejo, c["entrada"]), _corre(nuevo, c["entrada"])
        if a == b:
            continue
        if _sin_orden(a) == _sin_orden(b):
            orden.append(c["id"])
            continue
        contenido.append({
            "id": c["id"],
            "entrada": c["entrada"],
            "cambia_estado": _estados(a) != _estados(b),
            "antes": {"estado": a["estado"], "razon": [x["razon"] for x in a["conceptos"]], "banderas": a["banderas_rojas"]},
            "despues": {"estado": b["estado"], "razon": [x["razon"] for x in b["conceptos"]], "banderas": b["banderas_rojas"]},
        })
    return {
        "fecha_casos": fecha,
        "casos": len(casos),
        "identicos": len(casos) - len(orden) - len(contenido),
        "solo_orden": len(orden),
        "contenido": contenido,
        "cambian_estado": [d["id"] for d in contenido if d["cambia_estado"]],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("viejo", type=Path)
    ap.add_argument("nuevo", type=Path)
    ap.add_argument("--fecha", default=FECHA)
    args = ap.parse_args()
    lee = lambda p: json.loads(p.read_text(encoding="utf-8"))  # noqa: E731
    r = compara(lee(args.viejo), lee(args.nuevo), args.fecha)
    print(json.dumps(r, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
