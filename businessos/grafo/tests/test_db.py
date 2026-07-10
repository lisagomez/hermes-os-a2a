"""Test de la parte pura de db.py (ensamblado filas -> forma del evaluador).
La conexion real a postgres se valida en Fase D con docker compose up."""
from datetime import date

import evaluador
from db import ensamblar_conocimiento


CATEGORIAS = [
    {"clave": "VIATICOS", "nombre": "Viaticos", "descripcion": None, "keywords": ["hotel", "hospedaje"], "exclusiones": []},
]
REGLAS = [
    {
        "id": 1, "clave": "MX-TEST-1", "jurisdiccion": "MX", "dimension": "fiscal",
        "titulo": "Regla de prueba", "texto_resumen": "x", "fuente_cita": "Ley Art. 1",
        "fuente_url": "https://example.org", "source_version": "v1",
        "vigente_desde": date(2014, 1, 1), "vigente_hasta": None,
    },
]
IMPACTOS = [
    {
        "regla_id": 1, "categoria": "VIATICOS", "regimen": "PM_TITULO_II",
        "veredicto_base": "dudoso", "tope_monto": None, "tope_pct": None,
        "requisitos": ["CFDI"], "banderas": [], "parametros": {},
    },
]


def test_ensamblado_y_compatibilidad_con_evaluador():
    con = ensamblar_conocimiento(CATEGORIAS, REGLAS, IMPACTOS)
    regla = con["reglas"][0]
    assert regla["vigente_desde"] == "2014-01-01"  # date -> ISO str
    assert regla["impactos"][0]["categoria"] == "VIATICOS"

    r = evaluador.evaluar(
        [{"descripcion": "Hotel en Cancun"}], con["reglas"], con["categorias"],
        {"jurisdiccion": "MX", "dimension": "fiscal", "regimen": "PM_TITULO_II", "fecha": "2026-01-01"},
    )
    c = r["conceptos"][0]
    assert c["estado"] == "dudoso"
    assert c["fuente"]["clave"] == "MX-TEST-1"
    assert "CFDI" in c["checklist"]


def test_importar_db_no_conecta():
    """Gotcha PRP: importar db (via app) jamas abre conexiones."""
    import db  # noqa: F401 — si conectara al importar, esto explotaria sin postgres
