"""Tests de las dos categorias de logistica (LCPAF autotransporte + LAC carga aerea).

Existen para cerrar una divergencia real: el escaneo regulatorio del Pre-Discovery
esperaba `AUTOTRANSPORTE_CARGA` y `CARGA_AEREA_EAWB`, el seed no las tenia, y su mock
las dictaminaba con fuente IATA sin anclaje en ley mexicana. Estos tests fijan que la
base sea nacional y que el limite (la NOM del formato) quede DECLARADO, no escondido.
"""
import json
from pathlib import Path

from evaluador import clasificar, evaluar

SEED = json.loads(
    (Path(__file__).resolve().parent.parent / "seed" / "reglas.json").read_text(encoding="utf-8")
)
REGLAS = SEED["reglas"]
CATEGORIAS = SEED["categorias"]


def ev(conceptos, **ctx):
    base = {"jurisdiccion": "MX", "dimension": "regulatorio", "regimen": "GENERAL",
            "fecha": "2026-09-02"}
    return evaluar(conceptos, REGLAS, CATEGORIAS, {**base, **ctx})


# --- las categorias que el escaneo del Pre-Discovery esperaba ---------------------

def test_las_dos_categorias_del_escaneo_existen_en_el_seed():
    claves = {c["clave"] for c in CATEGORIAS}
    assert {"AUTOTRANSPORTE_CARGA", "CARGA_AEREA_EAWB"} <= claves


def test_clasificacion_terrestre_y_aerea():
    sondas = {
        "autotransporte federal": "AUTOTRANSPORTE_CARGA",
        "carta de porte": "AUTOTRANSPORTE_CARGA",
        "paqueteria y mensajeria": "AUTOTRANSPORTE_CARGA",
        "guia de carga aerea": "CARGA_AEREA_EAWB",
        "air waybill": "CARGA_AEREA_EAWB",
        "e-awb": "CARGA_AEREA_EAWB",
    }
    for texto, esperada in sondas.items():
        assert clasificar(texto, CATEGORIAS) == esperada, f"{texto!r} -> {esperada}"


def test_los_dos_modos_no_se_pisan():
    """'carta de porte aerea' contiene 'carta de porte': gana la keyword mas larga."""
    assert clasificar("carta de porte aerea", CATEGORIAS) == "CARGA_AEREA_EAWB"
    # y la exclusion protege al terrestre cuando el texto es claramente aereo
    assert clasificar("agencia de carga aerea", CATEGORIAS) == "CARGA_AEREA_EAWB"


def test_drones_no_colisiona_con_carga_aerea():
    """Ambos cuelgan de la Ley de Aviacion Civil pero son categorias distintas."""
    assert clasificar("entrega por dron", CATEGORIAS) == "DRONES_DELIVERY"
    assert clasificar("guia aerea", CATEGORIAS) == "CARGA_AEREA_EAWB"


# --- autotransporte: base LCPAF ---------------------------------------------------

def test_autotransporte_permitido_con_permiso_de_la_secretaria():
    c = ev([{"descripcion": "Servicio de autotransporte federal de carga"}])["conceptos"][0]
    assert c["estado"] == "permitido"
    assert c["fuente"]["clave"] == "MX-LCPAF-8-50-66-68-AUTOTRANSPORTE"
    assert "Caminos, Puentes y Autotransporte Federal" in c["fuente"]["cita"]
    checklist = " ".join(c["checklist"])
    assert "permiso de la Secretaria" in checklist
    assert "paqueteria y mensajeria" in checklist


def test_carta_porte_clasifica_y_declara_que_el_complemento_cfdi_no_esta_sembrado():
    """Clasificar y nombrar el hueco es mejor que quedarse mudo ante un termino comun."""
    c = ev([{"descripcion": "Complemento carta porte del CFDI"}])["conceptos"][0]
    assert c["categoria"] == "AUTOTRANSPORTE_CARGA"
    banderas = " ".join(c["banderas"])
    assert "complemento Carta Porte del CFDI" in banderas
    assert "NO forman parte de este grafo" in banderas


def test_autotransporte_declara_el_limite_de_responsabilidad_y_su_desfase_a_uma():
    c = ev([{"descripcion": "Carta de porte del embarque"}])["conceptos"][0]
    banderas = " ".join(c["banderas"])
    assert "15 dias de salario minimo por tonelada" in banderas
    assert "UMA" in banderas, "el desfase salario minimo -> UMA debe estar declarado"


# --- carga aerea: base mexicana, NO IATA -------------------------------------------

def test_carga_aerea_se_ancla_en_ley_de_aviacion_civil_no_en_iata():
    c = ev([{"descripcion": "Guia de carga aerea del embarque"}])["conceptos"][0]
    assert c["estado"] == "permitido"
    assert c["fuente"]["clave"] == "MX-LAC-55-56-CARGA-AEREA"
    assert "Ley de Aviacion Civil" in c["fuente"]["cita"]
    assert c["fuente"]["url"].startswith("https://www.diputados.gob.mx/")
    assert any("carta de porte o guia de carga aerea" in r for r in c["checklist"])


def test_el_e_awb_queda_como_limite_declarado_y_iata_como_estandar_sectorial():
    """El mock daba 'permitido' citando IATA. La regla real declara los dos limites."""
    c = ev([{"descripcion": "Emision de e-awb"}])["conceptos"][0]
    banderas = " ".join(c["banderas"])
    assert "norma oficial mexicana" in banderas and "NO esta sembrada" in banderas
    assert "estandar SECTORIAL" in banderas
    assert "no exigencia de autoridad mexicana" in banderas


def test_informacion_anticipada_de_carga_se_declara_obligacion_paralela():
    c = ev([{"descripcion": "Transporte aereo de carga internacional"}])["conceptos"][0]
    assert any("PARALELA" in b for b in c["banderas"])


# --- procedencia y no-cruce ---------------------------------------------------------

def test_ambas_reglas_citan_ley_primaria_fechada():
    claves = {"MX-LCPAF-8-50-66-68-AUTOTRANSPORTE", "MX-LAC-55-56-CARGA-AEREA"}
    reglas = [r for r in REGLAS if r["clave"] in claves]
    assert len(reglas) == 2
    for r in reglas:
        assert r["jurisdiccion"] == "MX" and r["dimension"] == "regulatorio"
        assert r["fuente_url"].startswith("https://www.diputados.gob.mx/")
        assert "DOF 14-11-2025" in r["fuente_cita"], f"{r['clave']} no fecha su texto vigente"
        assert all(i["regimen"] == "GENERAL" for i in r["impactos"])


def test_el_monto_del_limite_declara_verificar():
    r = next(x for x in REGLAS if x["clave"] == "MX-LCPAF-8-50-66-68-AUTOTRANSPORTE")
    assert r["impactos"][0]["parametros"]["verificar"] is True


def test_logistica_no_se_cuela_en_fiscal():
    r = evaluar([{"descripcion": "Guia de carga aerea"}], REGLAS, CATEGORIAS,
                {"jurisdiccion": "MX", "dimension": "fiscal", "fecha": "2026-09-02"})
    c = r["conceptos"][0]
    assert c["categoria"] is None and c["razon"] == "sin regla aplicable"
