"""Tests Fase 3 (F3-A): multi-jurisdiccion, multi-dimension, no-cruce de dominios
y regimen GENERAL como wildcard."""
import json
from pathlib import Path

from evaluador import evaluar

SEED = json.loads(
    (Path(__file__).resolve().parent.parent / "seed" / "reglas.json").read_text(encoding="utf-8")
)
REGLAS = SEED["reglas"]
CATEGORIAS = SEED["categorias"]


def ev(conceptos, **ctx):
    base = {"jurisdiccion": "MX", "dimension": "fiscal", "regimen": "PM_TITULO_II", "fecha": "2026-06-15"}
    return evaluar(conceptos, REGLAS, CATEGORIAS, {**base, **ctx})


# --- Fiscal CO ----------------------------------------------------------------

def test_co_honorarios_deducible_con_fuente_co():
    r = ev([{"descripcion": "Honorarios de consultoria tributaria"}], jurisdiccion="CO")
    c = r["conceptos"][0]
    assert c["estado"] == "deducible"
    assert c["fuente"]["clave"] == "CO-ET-107-EXPENSAS"
    assert "Estatuto Tributario" in c["fuente"]["cita"]
    assert any("factura electronica" in req.lower() for req in c["checklist"])

def test_co_no_ve_reglas_mx():
    r = ev([{"descripcion": "Honorarios de consultoria"}], jurisdiccion="CO")
    assert r["fuentes"], "CO debe citar fuentes propias"
    assert all(f["clave"].startswith("CO-") for f in r["fuentes"])

def test_co_regimen_cualquiera_por_wildcard_general():
    # Los impactos CO son regimen GENERAL: aplican aunque el contexto traiga otro regimen
    r = ev([{"descripcion": "Honorarios de consultoria"}], jurisdiccion="CO", regimen="ORDINARIO")
    assert r["conceptos"][0]["estado"] == "deducible"

def test_mx_fiscal_no_usa_impactos_co():
    r = ev([{"descripcion": "Honorarios de consultoria"}])
    assert all(not f["clave"].startswith("CO-") for f in r["fuentes"])


# --- Contable MX ----------------------------------------------------------------

def test_contable_equipo_computo_nif_c6():
    r = ev([{"descripcion": "MacBook Pro para desarrollo", "importe": 45000}], dimension="contable")
    c = r["conceptos"][0]
    assert c["estado"] == "dudoso"
    assert c["fuente"]["clave"] == "MX-NIF-C6-ACTIVO-FIJO"
    assert any("NIF C-6" in b or "LISR 34" in b for b in c["banderas"])
    # requisitos generales contables presentes (CFF 28/30)
    assert any("CFF 30" in req or "5 anos" in req for req in c["checklist"])

def test_contable_no_cita_reglas_fiscales():
    r = ev([{"descripcion": "MacBook Pro"}], dimension="contable")
    assert all(f["clave"] != "MX-LISR-34-VII" for f in r["fuentes"])

def test_fiscal_sigue_igual_tras_v2():
    # regresion: la expansion no cambia el dictamen fiscal MX de Fase 2
    r = ev([{"descripcion": "Honorarios de consultoria fiscal"}])
    assert r["conceptos"][0]["fuente"]["clave"] == "MX-LISR-27-V"


# --- Contractual MX -------------------------------------------------------------

def test_clausula_penal_dudoso_con_ccf_1843():
    r = ev([{"descripcion": "Clausula penal del 20% por incumplimiento"}], dimension="contractual")
    c = r["conceptos"][0]
    assert c["categoria"] == "CLAUSULA_PENAL"
    assert c["estado"] == "dudoso"
    assert c["fuente"]["clave"] == "MX-CCF-1843-PENA"
    assert any("1843" in b for b in c["banderas"])

def test_clausula_confidencialidad():
    r = ev([{"descripcion": "Confidencialidad y no divulgacion de informacion"}], dimension="contractual")
    c = r["conceptos"][0]
    assert c["categoria"] == "CLAUSULA_CONFIDENCIALIDAD"
    assert c["fuente"]["clave"] == "MX-LFPDPPP-21-CONFIDENCIALIDAD"

def test_contractual_checklist_incluye_elementos_del_contrato():
    r = ev([{"descripcion": "Condiciones de pago: 50% anticipo"}], dimension="contractual")
    c = r["conceptos"][0]
    assert c["categoria"] == "CLAUSULA_PAGO"
    assert any("Consentimiento" in req or "firma" in req.lower() for req in c["checklist"])

def test_contractual_nunca_afirma_deducible():
    # dimension contractual: el grafo solo marca 'dudoso' o requisitos; nunca 'deducible'
    textos = ["Condiciones de pago mensuales", "Clausula penal", "Confidencialidad",
              "Terminacion anticipada con preaviso de 30 dias"]
    r = ev([{"descripcion": t} for t in textos], dimension="contractual")
    assert all(c["estado"] == "dudoso" for c in r["conceptos"])


# --- No-cruce de dominios --------------------------------------------------------

def test_texto_contractual_no_clasifica_en_fiscal():
    r = ev([{"descripcion": "Clausula de confidencialidad del contrato"}])  # dimension fiscal
    c = r["conceptos"][0]
    assert c["categoria"] is None
    assert c["estado"] == "dudoso"
    assert c["razon"] == "sin regla aplicable"

def test_texto_de_gasto_no_clasifica_en_contractual():
    r = ev([{"descripcion": "Carga de gasolina magna"}], dimension="contractual")
    assert r["conceptos"][0]["categoria"] is None
