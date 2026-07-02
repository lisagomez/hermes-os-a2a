"""evaluador.py — motor puro de deducibilidad (sin DB, sin LLM, sin red).

Porta la semantica de inferenceEngine.js del repo viejo:
  - vigencia a la fecha de operacion (desde <= fecha <= hasta, inclusive);
  - regla rectora = impacto vivo con vigente_desde mas reciente;
  - contradiccion entre veredictos vivos -> dudoso + bandera;
  - importe > tope_monto -> degradar deducible a dudoso;
  - requisitos de TODOS los impactos vigentes aplicables -> checklist.

Overrides del PRP-002 (fail-safe, el grafo nunca afirma sin fuente):
  - concepto sin categoria o sin regla aplicable -> dudoso "sin regla aplicable"
    (el motor viejo decia NO_DEDUCIBLE; eso ya es una afirmacion sin fuente);
  - disclaimer SIEMPRE en la respuesta.

Entrada de conocimiento: lista de reglas con impactos anidados, misma forma que
seed/reglas_mx.json (los tests la cargan del JSON; db.py la lee de postgres).
"""
from __future__ import annotations

import re
import unicodedata
from datetime import date
from typing import Any

DISCLAIMER = (
    "Este dictamen es informativo y automatizado: senala riesgos y cita fuentes, "
    "NO es asesoria fiscal. La decision final corresponde al contribuyente y su contador. "
    "Cifras y topes pendientes de cotejo contra DOF donde se indique."
)

RAZON_SIN_REGLA = "sin regla aplicable"

ESTADOS = ("deducible", "no_deducible", "dudoso")


def _normalizar(texto: str) -> str:
    """minusculas + sin acentos, para casar keywords deterministicamente."""
    nfd = unicodedata.normalize("NFD", texto.lower())
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")


def clasificar(descripcion: str, categorias: list[dict]) -> str | None:
    """Categoria por keyword mas larga con frontera de palabra; None si nada casa.

    Empates de longitud se resuelven por orden de catalogo (determinista).
    """
    texto = _normalizar(descripcion)
    mejor: tuple[int, str] | None = None
    for cat in categorias:
        for kw in cat["keywords"]:
            kw_n = _normalizar(kw)
            patron = r"(?<![a-z0-9])" + re.escape(kw_n) + r"(?![a-z0-9])"
            if re.search(patron, texto):
                if mejor is None or len(kw_n) > mejor[0]:
                    mejor = (len(kw_n), cat["clave"])
    return mejor[1] if mejor else None


def _vigente(regla: dict, fecha: date) -> bool:
    desde = date.fromisoformat(regla["vigente_desde"])
    hasta = regla.get("vigente_hasta")
    if fecha < desde:
        return False
    if hasta is not None and fecha > date.fromisoformat(str(hasta)):
        return False
    return True


def _fuente(regla: dict) -> dict:
    return {
        "clave": regla["clave"],
        "cita": regla["fuente_cita"],
        "url": regla["fuente_url"],
        "vigencia": {"desde": regla["vigente_desde"], "hasta": regla.get("vigente_hasta")},
    }


def _dedup(items: list) -> list:
    vistos: set[str] = set()
    out = []
    for it in items:
        llave = repr(it)
        if llave not in vistos:
            vistos.add(llave)
            out.append(it)
    return out


def _impactos_vivos(
    reglas: list[dict], fecha: date, regimen: str
) -> list[tuple[dict, dict]]:
    """[(regla, impacto)] de reglas vigentes a la fecha, filtrado por regimen."""
    pares = []
    for regla in reglas:
        if not _vigente(regla, fecha):
            continue
        for imp in regla.get("impactos", []):
            if imp.get("regimen", "PM_TITULO_II") == regimen:
                pares.append((regla, imp))
    return pares


def evaluar_concepto(
    concepto: dict, reglas: list[dict], categorias: list[dict], fecha: date, regimen: str
) -> dict:
    """Veredicto de un concepto: estado + razon + fuente + banderas + checklist."""
    descripcion = concepto["descripcion"]
    importe = concepto.get("importe")
    categoria = clasificar(descripcion, categorias)

    vivos = _impactos_vivos(reglas, fecha, regimen)
    generales = [(r, i) for r, i in vivos if i.get("categoria") is None]
    especificos = [(r, i) for r, i in vivos if categoria and i.get("categoria") == categoria]

    banderas = [b for _, imp in especificos for b in imp.get("banderas", [])]
    checklist = [req for _, imp in generales + especificos for req in imp.get("requisitos", [])]

    # Fail-safe del PRP: sin categoria o sin impacto con veredicto -> dudoso sin afirmar.
    con_veredicto = [(r, i) for r, i in especificos if i.get("veredicto_base")]
    if not con_veredicto:
        return {
            "descripcion": descripcion,
            "categoria": categoria,
            "estado": "dudoso",
            "razon": RAZON_SIN_REGLA,
            "fuente": None,
            "banderas": _dedup(banderas),
            "checklist": _dedup(checklist),
            "fuentes": _dedup([_fuente(r) for r, _ in generales + especificos]),
        }

    # Regla rectora: la viva con vigente_desde mas reciente.
    con_veredicto.sort(key=lambda par: par[0]["vigente_desde"], reverse=True)
    rectora, imp_rector = con_veredicto[0]
    estado = imp_rector["veredicto_base"]
    razon = f"{rectora['titulo']} ({rectora['fuente_cita']})"

    # Contradiccion entre veredictos vivos -> dudoso + bandera.
    distintos = {i["veredicto_base"] for _, i in con_veredicto}
    if len(distintos) > 1:
        estado = "dudoso"
        banderas.append(
            "Reglas vigentes en conflicto: "
            + ", ".join(sorted(f"{r['clave']}={i['veredicto_base']}" for r, i in con_veredicto))
            + " — requiere revision"
        )
        razon = f"contradiccion entre reglas vigentes; rectora: {rectora['fuente_cita']}"

    # Tope: importe conocido que excede tope_monto degrada deducible -> dudoso.
    tope = imp_rector.get("tope_monto")
    if estado == "deducible" and tope is not None and importe is not None and importe > tope:
        estado = "dudoso"
        banderas.append(
            f"Importe {importe:,.2f} excede el tope de {tope:,.2f} MXN ({rectora['fuente_cita']})"
        )
        razon = f"excede tope de {rectora['fuente_cita']}"

    return {
        "descripcion": descripcion,
        "categoria": categoria,
        "estado": estado,
        "razon": razon,
        "fuente": _fuente(rectora),
        "banderas": _dedup(banderas),
        "checklist": _dedup(checklist),
        # todo impacto vivo que aporto requisitos/banderas se cita, tenga o no veredicto
        "fuentes": _dedup([_fuente(r) for r, _ in generales + especificos]),
    }


def evaluar(
    conceptos: list[dict],
    reglas: list[dict],
    categorias: list[dict],
    contexto: dict[str, Any],
) -> dict:
    """Evalua una lista de conceptos (p.ej. los renglones de una factura).

    contexto: {jurisdiccion, dimension, regimen, fecha} — el "proyecto" del PRP.
    Agregacion de factura: todos los estados iguales -> ese estado; si no -> dudoso.
    """
    fecha = date.fromisoformat(str(contexto.get("fecha") or date.today().isoformat()))
    regimen = contexto.get("regimen", "PM_TITULO_II")
    ambito = [
        r for r in reglas
        if r.get("jurisdiccion", "MX") == contexto.get("jurisdiccion", "MX")
        and r.get("dimension", "fiscal") == contexto.get("dimension", "fiscal")
    ]

    resultados = [evaluar_concepto(c, ambito, categorias, fecha, regimen) for c in conceptos]

    estados = {r["estado"] for r in resultados}
    estado_global = estados.pop() if len(estados) == 1 else "dudoso"

    return {
        "contexto": {
            "jurisdiccion": contexto.get("jurisdiccion", "MX"),
            "dimension": contexto.get("dimension", "fiscal"),
            "regimen": regimen,
            "fecha": fecha.isoformat(),
        },
        "estado": estado_global,
        "conceptos": [
            {k: v for k, v in r.items() if k != "fuentes"} for r in resultados
        ],
        "banderas_rojas": _dedup([b for r in resultados for b in r["banderas"]]),
        "checklist": _dedup([c for r in resultados for c in r["checklist"]]),
        "fuentes": _dedup([f for r in resultados for f in r["fuentes"]]),
        "disclaimer": DISCLAIMER,
    }
