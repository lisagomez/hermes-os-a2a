"""Tests del ambito comercio exterior MX (Ley Aduanera + Ley de Comercio Exterior).

Cubren lo que el gate de procedencia NO puede ver: que cada categoria clasifique
con la fuente correcta, que los dos veredictos `dudoso` sean fail-safe DECLARADO
(no un hueco accidental), que el unico `no_permitido` vaya solo en su categoria,
y que el ambito no cruce con fiscal en ninguna de las dos direcciones.
"""
import json
from pathlib import Path

from evaluador import clasificar, evaluar

SEED = json.loads(
    (Path(__file__).resolve().parent.parent / "seed" / "reglas.json").read_text(encoding="utf-8")
)
REGLAS = SEED["reglas"]
CATEGORIAS = SEED["categorias"]

CATS_COMEX = {
    "PADRON_IMPORTADORES", "DESPACHO_ADUANERO", "REPRESENTACION_ADUANAL",
    "CLASIFICACION_ARANCELARIA", "VALOR_ADUANA", "ORIGEN_MERCANCIAS",
    "REGULACIONES_NO_ARANCELARIAS", "PRACTICAS_DESLEALES", "REGIMENES_ADUANEROS",
    "INFRACCIONES_ADUANERAS",
}


def ev(conceptos, **ctx):
    base = {"jurisdiccion": "MX", "dimension": "regulatorio", "regimen": "GENERAL",
            "fecha": "2026-09-02"}
    return evaluar(conceptos, REGLAS, CATEGORIAS, {**base, **ctx})


# --- clasificacion por categoria ------------------------------------------------

def test_cada_categoria_comex_clasifica():
    """Una regla que existe pero nunca dispara es indistinguible de una que no existe."""
    sondas = {
        "padron de importadores": "PADRON_IMPORTADORES",
        "pedimento": "DESPACHO_ADUANERO",
        "agente aduanal": "REPRESENTACION_ADUANAL",
        "fraccion arancelaria": "CLASIFICACION_ARANCELARIA",
        "valor en aduana": "VALOR_ADUANA",
        "certificado de origen": "ORIGEN_MERCANCIAS",
        "permiso previo": "REGULACIONES_NO_ARANCELARIAS",
        "cuota compensatoria": "PRACTICAS_DESLEALES",
        "deposito fiscal": "REGIMENES_ADUANEROS",
        "importacion prohibida": "INFRACCIONES_ADUANERAS",
    }
    for texto, esperada in sondas.items():
        assert clasificar(texto, CATEGORIAS) == esperada, f"{texto!r} no clasifico en {esperada}"


def test_valor_en_aduana_gana_a_aduana_por_keyword_mas_larga():
    """'aduana' (DESPACHO) y 'valor en aduana' (VALOR) coexisten: gana la mas larga."""
    assert clasificar("valor en aduana declarado", CATEGORIAS) == "VALOR_ADUANA"
    assert clasificar("tramite en la aduana", CATEGORIAS) == "DESPACHO_ADUANERO"


# --- veredicto + fuente ---------------------------------------------------------

def test_padron_permitido_con_fuente_ley_aduanera():
    c = ev([{"descripcion": "Inscripcion en el padron de importadores"}])["conceptos"][0]
    assert c["estado"] == "permitido"
    assert c["fuente"]["clave"] == "MX-LADUA-59-PADRON-IMPORTADORES"
    assert "Ley Aduanera" in c["fuente"]["cita"]
    assert "19-11-2025" in c["fuente"]["cita"]
    assert any("Padron de Importadores" in req for req in c["checklist"])


def test_representacion_exige_los_cuatro_requisitos_del_representante():
    c = ev([{"descripcion": "Despacho por agencia aduanal"}])["conceptos"][0]
    assert c["estado"] == "permitido"
    assert c["fuente"]["clave"] == "MX-LADUA-40-REPRESENTACION"
    checklist = " ".join(c["checklist"])
    for exigencia in ("nacionalidad mexicana", "relacion laboral", "experiencia o conocimientos"):
        assert exigencia in checklist, f"falta el requisito: {exigencia}"


def test_infracciones_es_el_unico_no_permitido_y_va_solo_en_su_categoria():
    c = ev([{"descripcion": "Mercancia de importacion prohibida"}])["conceptos"][0]
    assert c["estado"] == "no_permitido"
    assert c["fuente"]["clave"] == "MX-LADUA-176-INFRACCIONES"
    # sin conflicto de veredictos: nadie mas dictamina sobre esta categoria
    veredictos = {
        imp["veredicto_base"]
        for r in REGLAS for imp in r["impactos"]
        if imp.get("categoria") == "INFRACCIONES_ADUANERAS"
    }
    assert veredictos == {"no_permitido"}
    assert not any("conflicto" in b.lower() for b in c["banderas"])


# --- fail-safe DECLARADO (no un hueco accidental) --------------------------------

def test_clasificacion_arancelaria_es_dudoso_y_declara_que_falta_la_tarifa():
    c = ev([{"descripcion": "Clasificacion arancelaria de la mercancia"}])["conceptos"][0]
    assert c["estado"] == "dudoso"
    # dudoso CON fuente: es un limite declarado, no "sin regla aplicable"
    assert c["razon"] != "sin regla aplicable"
    assert c["fuente"] is not None
    assert any("Tarifa" in b and "NO esta sembrada" in b for b in c["banderas"])


def test_practicas_desleales_es_dudoso_porque_la_resolucion_vive_en_el_dof():
    c = ev([{"descripcion": "Cuota compensatoria por dumping"}])["conceptos"][0]
    assert c["estado"] == "dudoso"
    assert c["razon"] != "sin regla aplicable"
    assert c["fuente"]["clave"] == "MX-LCE-28-62-63-PRACTICAS-DESLEALES"
    assert any("no puede determinar" in b.lower() for b in c["banderas"])


def test_rrna_acumula_requisitos_de_sus_cuatro_reglas_sin_contradiccion():
    """Cuatro reglas vivas sobre la misma categoria, todas 'permitido': suman checklist."""
    c = ev([{"descripcion": "Permiso previo de importacion"}])["conceptos"][0]
    assert c["estado"] == "permitido"
    assert not any("conflicto" in b.lower() for b in c["banderas"])
    claves = {
        r["clave"] for r in REGLAS
        for imp in r["impactos"] if imp.get("categoria") == "REGULACIONES_NO_ARANCELARIAS"
    }
    assert len(claves) == 4, f"se esperaban 4 reglas de RRNA, hay {len(claves)}: {claves}"
    assert len(c["checklist"]) >= 10


# --- no-cruce de dominio, en ambas direcciones -----------------------------------

def test_concepto_aduanero_en_fiscal_no_se_cuela():
    r = evaluar([{"descripcion": "Pedimento de importacion"}], REGLAS, CATEGORIAS,
                {"jurisdiccion": "MX", "dimension": "fiscal", "fecha": "2026-09-02"})
    c = r["conceptos"][0]
    assert c["categoria"] is None
    assert c["estado"] == "dudoso"
    assert c["razon"] == "sin regla aplicable"


def test_concepto_fiscal_en_regulatorio_no_toca_categorias_comex():
    c = ev([{"descripcion": "Viaticos de hospedaje"}])["conceptos"][0]
    assert c["categoria"] not in CATS_COMEX


def test_comex_solo_cita_fuentes_mx_de_las_dos_leyes():
    r = ev([{"descripcion": "Despacho aduanero de mercancias"}])
    urls = {f["url"] for f in r["fuentes"]}
    assert urls, "debe citar al menos una fuente"
    assert all("diputados.gob.mx" in u for u in urls)


# --- procedencia -----------------------------------------------------------------

def test_toda_regla_comex_cita_ley_primaria_y_trae_disclaimer():
    comex = [
        r for r in REGLAS
        if any(imp.get("categoria") in CATS_COMEX for imp in r["impactos"])
    ]
    assert len(comex) == 13, f"se esperaban 13 reglas de comercio exterior, hay {len(comex)}"
    for r in comex:
        assert r["jurisdiccion"] == "MX"
        assert r["dimension"] == "regulatorio"
        assert r["fuente_url"].startswith("https://www.diputados.gob.mx/")
        assert "DOF" in r["fuente_cita"], f"{r['clave']} no fecha su texto vigente"
        assert all(imp["regimen"] == "GENERAL" for imp in r["impactos"])
    assert ev([{"descripcion": "pedimento"}])["disclaimer"]


def test_el_unico_parametro_numerico_declara_verificar():
    for r in REGLAS:
        for imp in r["impactos"]:
            if imp.get("categoria") not in CATS_COMEX:
                continue
            numericos = [
                v for v in imp.get("parametros", {}).values()
                if isinstance(v, (int, float)) and not isinstance(v, bool)
            ]
            if numericos:
                assert imp["parametros"].get("verificar") is True, r["clave"]
