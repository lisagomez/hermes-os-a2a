"""Tests del motor puro (Fase B): clasificacion, vigencia, rectora, topes,
contradiccion, agregacion e invariante de fuente. Sin DB, sin red."""
import json
from pathlib import Path

import pytest

from evaluador import DISCLAIMER, RAZON_SIN_REGLA, clasificar, evaluar

SEED = json.loads(
    (Path(__file__).resolve().parent.parent / "seed" / "reglas.json").read_text(encoding="utf-8")
)
REGLAS = SEED["reglas"]
CATEGORIAS = SEED["categorias"]

CTX_2026 = {"jurisdiccion": "MX", "dimension": "fiscal", "regimen": "PM_TITULO_II", "fecha": "2026-06-15"}


def ev(conceptos, **ctx):
    return evaluar(conceptos, REGLAS, CATEGORIAS, {**CTX_2026, **ctx})


# --- Clasificacion determinista ---------------------------------------------

def test_clasifica_por_keyword():
    assert clasificar("Hospedaje en hotel CDMX", CATEGORIAS) == "VIATICOS"
    assert clasificar("Honorarios contables del mes", CATEGORIAS) == "SERVICIOS_PROFESIONALES"
    assert clasificar("Laptop para desarrollo", CATEGORIAS) == "EQUIPO_DE_COMPUTO"

def test_clasifica_con_acentos():
    assert clasificar("Boleto de avión a Monterrey", CATEGORIAS) == "VIATICOS"
    assert clasificar("Crédito bancario, intereses", CATEGORIAS) == "INTERESES"

def test_frontera_de_palabra():
    # "interesante" NO debe casar la keyword "interes"
    assert clasificar("Platica interesante de ventas", CATEGORIAS) is None

def test_keyword_mas_larga_gana():
    # "renta de auto" (ARRENDAMIENTO, via "renta"/"renta de auto") es mas larga que "auto"-nada;
    # "renta de oficina" debe ir a ARRENDAMIENTO aunque "renta" tambien casa
    assert clasificar("Renta de oficina en Polanco", CATEGORIAS) == "ARRENDAMIENTO"

def test_no_clasificable():
    assert clasificar("Ajuste contable interno XYZ", CATEGORIAS) is None


# --- Fail-safe: sin regla aplicable -> dudoso, nunca afirma ------------------

def test_sin_regla_aplicable_es_dudoso():
    r = ev([{"descripcion": "Ajuste contable interno XYZ"}])
    c = r["conceptos"][0]
    assert c["estado"] == "dudoso"
    assert c["razon"] == RAZON_SIN_REGLA
    assert c["fuente"] is None
    # los requisitos generales (CFDI etc.) siguen aplicando al checklist
    assert any("CFDI" in req for req in c["checklist"])


# --- Vigencia a fecha de operacion ------------------------------------------

def test_vigencia_28_xxxii_no_aplica_antes_de_2020():
    antes = ev([{"descripcion": "Intereses del credito"}], fecha="2019-06-01")
    despues = ev([{"descripcion": "Intereses del credito"}], fecha="2021-06-01")
    claves_antes = {f["clave"] for f in antes["fuentes"]}
    claves_despues = {f["clave"] for f in despues["fuentes"]}
    assert "MX-LISR-28-XXXII" not in claves_antes
    assert "MX-LISR-28-XXXII" in claves_despues

def test_vigencia_criterio_sat_desde_2026():
    antes = ev([{"descripcion": "Viaticos: hotel en Guadalajara"}], fecha="2025-06-01")
    despues = ev([{"descripcion": "Viaticos: hotel en Guadalajara"}], fecha="2026-06-01")
    assert all(f["clave"] != "MX-SAT-CRIT-VIATICOS" for f in antes["fuentes"])
    assert any(f["clave"] == "MX-SAT-CRIT-VIATICOS" for f in despues["fuentes"])


# --- Veredictos con fuente citada -------------------------------------------

def test_honorarios_deducible_con_fuente():
    c = ev([{"descripcion": "Honorarios de consultoria fiscal"}])["conceptos"][0]
    assert c["estado"] == "deducible"
    assert c["fuente"]["clave"] == "MX-LISR-27-V"
    assert "27" in c["fuente"]["cita"]
    assert c["fuente"]["url"].startswith("https://")
    assert any("10%" in req or "retencion" in req.lower() for req in c["checklist"])

def test_equipo_computo_dudoso_con_bandera_depreciacion():
    c = ev([{"descripcion": "MacBook para la disenadora", "importe": 45000}])["conceptos"][0]
    assert c["estado"] == "dudoso"
    assert any("30%" in b for b in c["banderas"])
    assert c["fuente"]["clave"] == "MX-LISR-34-VII"

def test_combustible_dudoso_con_bandera_efectivo():
    c = ev([{"descripcion": "Carga de gasolina magna"}])["conceptos"][0]
    assert c["estado"] == "dudoso"
    assert any("efectivo" in b.lower() for b in c["banderas"])


# --- Regla rectora, contradiccion y topes (fixtures sinteticos) --------------

def _regla(clave, desde, veredicto, categoria="VIATICOS", tope_monto=None, hasta=None):
    return {
        "clave": clave,
        "titulo": f"Regla {clave}",
        "texto_resumen": "x",
        "fuente_cita": f"Cita {clave}",
        "fuente_url": "https://example.org/ley",
        "vigente_desde": desde,
        "vigente_hasta": hasta,
        "impactos": [{
            "categoria": categoria,
            "veredicto_base": veredicto,
            "tope_monto": tope_monto,
            "requisitos": [f"req-{clave}"],
            "banderas": [],
            "parametros": {},
        }],
    }

def test_rectora_es_la_mas_reciente():
    reglas = [_regla("R-VIEJA", "2014-01-01", "dudoso"), _regla("R-NUEVA", "2020-01-01", "dudoso")]
    r = evaluar([{"descripcion": "hotel"}], reglas, CATEGORIAS, CTX_2026)
    assert r["conceptos"][0]["fuente"]["clave"] == "R-NUEVA"

def test_contradiccion_da_dudoso_y_bandera():
    reglas = [_regla("R-SI", "2014-01-01", "deducible"), _regla("R-NO", "2020-01-01", "no_deducible")]
    c = evaluar([{"descripcion": "hotel"}], reglas, CATEGORIAS, CTX_2026)["conceptos"][0]
    assert c["estado"] == "dudoso"
    assert any("conflicto" in b for b in c["banderas"])

def test_regla_derogada_no_rige():
    reglas = [
        _regla("R-DEROGADA", "2020-01-01", "no_deducible", hasta="2023-12-31"),
        _regla("R-VIVA", "2014-01-01", "deducible"),
    ]
    c = evaluar([{"descripcion": "hotel"}], reglas, CATEGORIAS, CTX_2026)["conceptos"][0]
    assert c["estado"] == "deducible"
    assert c["fuente"]["clave"] == "R-VIVA"

def test_importe_sobre_tope_degrada_a_dudoso():
    reglas = [_regla("R-TOPE", "2014-01-01", "deducible", tope_monto=850)]
    c = evaluar([{"descripcion": "hotel", "importe": 2000}], reglas, CATEGORIAS, CTX_2026)["conceptos"][0]
    assert c["estado"] == "dudoso"
    assert any("tope" in b.lower() for b in c["banderas"])

def test_importe_bajo_tope_sigue_deducible():
    reglas = [_regla("R-TOPE", "2014-01-01", "deducible", tope_monto=850)]
    c = evaluar([{"descripcion": "hotel", "importe": 500}], reglas, CATEGORIAS, CTX_2026)["conceptos"][0]
    assert c["estado"] == "deducible"


# --- Agregacion de factura ----------------------------------------------------

def test_agregacion_uniforme():
    r = ev([
        {"descripcion": "Honorarios de consultoria"},
        {"descripcion": "Honorarios del notario"},
    ])
    assert r["estado"] == "deducible"

def test_agregacion_mixta_es_dudoso():
    r = ev([
        {"descripcion": "Honorarios de consultoria"},
        {"descripcion": "Carga de gasolina"},
    ])
    assert r["estado"] == "dudoso"


# --- Invariantes de la respuesta ---------------------------------------------

def test_disclaimer_siempre():
    assert ev([{"descripcion": "Honorarios"}])["disclaimer"] == DISCLAIMER
    assert ev([{"descripcion": "zzz sin categoria"}])["disclaimer"] == DISCLAIMER

def test_invariante_fuente():
    """Cero afirmacion sin fuente: todo estado != dudoso lleva fuente citada."""
    r = ev([
        {"descripcion": "Honorarios de consultoria"},
        {"descripcion": "Carga de gasolina"},
        {"descripcion": "Ajuste interno XYZ"},
        {"descripcion": "Donativo a la Cruz Roja"},
    ])
    for c in r["conceptos"]:
        if c["estado"] != "dudoso":
            assert c["fuente"] is not None, c
        if c["fuente"] is not None:
            assert c["fuente"]["cita"] and c["fuente"]["url"] and c["fuente"]["vigencia"]["desde"]
        else:
            assert c["razon"] == RAZON_SIN_REGLA

def test_fuentes_deduplicadas():
    r = ev([{"descripcion": "Honorarios A"}, {"descripcion": "Honorarios B"}])
    claves = [f["clave"] for f in r["fuentes"]]
    assert len(claves) == len(set(claves))
