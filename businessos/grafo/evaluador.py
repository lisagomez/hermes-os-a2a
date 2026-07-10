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

ESTADOS = ("deducible", "no_deducible", "permitido", "no_permitido", "dudoso")


def _normalizar(texto: str) -> str:
    """minusculas + sin acentos, para casar keywords deterministicamente."""
    nfd = unicodedata.normalize("NFD", texto.lower())
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")


def _casa(texto: str, kw: str) -> bool:
    kw_n = _normalizar(kw)
    patron = r"(?<![a-z0-9])" + re.escape(kw_n) + r"(?![a-z0-9])"
    return re.search(patron, texto) is not None


def clasificar(descripcion: str, categorias: list[dict]) -> str | None:
    """Categoria por keyword mas larga con frontera de palabra; None si nada casa.

    Empates de longitud se resuelven por orden de catalogo (determinista).

    `exclusiones` (opcional, por categoria): si el texto casa alguna, esa
    categoria queda descartada por completo aunque tambien casen sus propias
    keywords — defensa contra colisiones de dominio (ej. "agente de seguros
    para drones" no debe clasificar como DRONES_DELIVERY solo por mencionar
    "drones"; ver fase8-grafo-regulatorio, incidente 2026-07-10).
    """
    texto = _normalizar(descripcion)
    mejor: tuple[int, str] | None = None
    for cat in categorias:
        if any(_casa(texto, kw) for kw in cat.get("exclusiones", [])):
            continue
        for kw in cat["keywords"]:
            if _casa(texto, kw):
                kw_n = _normalizar(kw)
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
    """[(regla, impacto)] de reglas vigentes a la fecha, filtrado por regimen.

    'GENERAL' en el impacto es wildcard: aplica a cualquier regimen del contexto
    (lo usan las jurisdicciones/dimensiones sin regimenes diferenciados, Fase 3).
    """
    pares = []
    for regla in reglas:
        if not _vigente(regla, fecha):
            continue
        for imp in regla.get("impactos", []):
            if imp.get("regimen", "PM_TITULO_II") in (regimen, "GENERAL"):
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


def salud_conocimiento(reglas: list[dict], hoy: date | None = None) -> dict:
    """Radiografia del conocimiento (Fase 3): un grafo desactualizado miente con certeza.

    Reporta reglas vencidas (derogadas que siguen en el seed), montos con
    parametros.verificar=true (pendientes de cotejo contra fuente oficial) y el
    tamano por ambito. La consume GET /salud-conocimiento y el cron
    revisar-vigencias.py.
    """
    hoy = hoy or date.today()
    vencidas = []
    verificar_pendientes = []
    ambitos: dict[tuple[str, str], int] = {}
    for r in reglas:
        llave = (r.get("jurisdiccion", "MX"), r.get("dimension", "fiscal"))
        ambitos[llave] = ambitos.get(llave, 0) + 1
        hasta = r.get("vigente_hasta")
        if hasta is not None and date.fromisoformat(str(hasta)) < hoy:
            vencidas.append({"clave": r["clave"], "vigente_hasta": str(hasta)})
        for imp in r.get("impactos", []):
            if imp.get("parametros", {}).get("verificar") is True:
                verificar_pendientes.append({
                    "regla": r["clave"],
                    "cita": r["fuente_cita"],
                    "categoria": imp.get("categoria"),
                    "parametros": {k: v for k, v in imp["parametros"].items() if k != "verificar"},
                })
    return {
        "generado": hoy.isoformat(),
        "source_versions": sorted({r.get("source_version", "?") for r in reglas}),
        "reglas_total": len(reglas),
        "reglas_vencidas": vencidas,
        "verificar_pendientes": verificar_pendientes,
        "ambitos": [
            {"jurisdiccion": j, "dimension": d, "reglas": n}
            for (j, d), n in sorted(ambitos.items())
        ],
        "advertencia": (
            f"{len(verificar_pendientes)} montos/topes sin cotejo contra fuente oficial"
            if verificar_pendientes else None
        ),
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

    # Clasificacion por ambito (Fase 3): solo categorias que alguna regla del
    # ambito referencia. Evita cruces de dominio (una clausula contractual no
    # debe clasificar en una consulta fiscal y viceversa).
    claves_ambito = {
        imp["categoria"]
        for r in ambito
        for imp in r.get("impactos", [])
        if imp.get("categoria")
    }
    categorias_ambito = [c for c in categorias if c["clave"] in claves_ambito]

    resultados = [
        evaluar_concepto(c, ambito, categorias_ambito, fecha, regimen) for c in conceptos
    ]

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
