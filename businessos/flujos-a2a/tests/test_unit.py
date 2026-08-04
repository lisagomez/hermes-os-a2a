"""Unit tests de flujos-a2a con httpx.MockTransport.

El handler RECHAZA cualquier path no esperado y los tests assertan las URLs
exactas pedidas al grafo (gotcha 2026-08-02: un mock que responde 200 a todo
esconde bugs como el filtro `now()` que PostgREST nunca evaluo).
"""
from __future__ import annotations

import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app import crear_app

JURISDICCIONES = [{"codigo": "MX", "nombre": "Mexico"}, {"codigo": "CO", "nombre": "Colombia"}]
DIMENSIONES = [{"codigo": "fiscal", "nombre": "Fiscal"}, {"codigo": "contable", "nombre": "Contable"}]
CATEGORIAS = [
    {"clave": "VIATICOS", "nombre": "Viaticos", "descripcion": "Gastos de viaje"},
    {"clave": "NOMINA", "nombre": "Nomina", "descripcion": "Sueldos y salarios"},
    {"clave": "AJENA", "nombre": "De otro ambito", "descripcion": "No referenciada aqui"},
]


def _regla(clave, jur, dim, vigente=True, impactos=None):
    return {
        "clave": clave,
        "jurisdiccion": jur,
        "dimension": dim,
        "titulo": f"Regla {clave}",
        "texto_resumen": "…",
        "fuente_cita": "Ley X Art. 1",
        "fuente_url": "https://example.org",
        "source_version": None,
        "vigente_desde": "2024-01-01",
        "vigente_hasta": None if vigente else "2024-12-31",
        "vigente": vigente,
        "impactos": impactos or [],
    }


REGLAS = [
    _regla("MX-F-1", "MX", "fiscal", impactos=[
        {"categoria": "VIATICOS", "regimen": "PM_TITULO_II", "veredicto_base": "deducible",
         "tope_monto": None, "tope_pct": None, "requisitos": [], "banderas": [], "parametros": {}},
        {"categoria": None, "regimen": "GENERAL", "veredicto_base": None,
         "tope_monto": None, "tope_pct": None, "requisitos": ["CFDI"], "banderas": [], "parametros": {}},
    ]),
    _regla("MX-F-2", "MX", "fiscal", vigente=False, impactos=[
        {"categoria": "AJENA", "regimen": "RESICO", "veredicto_base": "deducible",
         "tope_monto": None, "tope_pct": None, "requisitos": [], "banderas": [], "parametros": {}},
    ]),
    _regla("CO-F-1", "CO", "fiscal", impactos=[
        {"categoria": "NOMINA", "regimen": "GENERAL", "veredicto_base": "deducible",
         "tope_monto": None, "tope_pct": None, "requisitos": [], "banderas": [], "parametros": {}},
    ]),
]

EVALUACIONES = [
    {"id": "u-1", "created_at": "2026-08-01T00:00:00", "contexto": {"jurisdiccion": "MX"},
     "salida": {"estado": "dudoso", "disclaimer": "Esto no es asesoria fiscal."}},
]


def _cliente(respuestas_por_path=None, fallo=None):
    """(TestClient, urls_pedidas) con un grafo simulado que solo conoce sus paths."""
    urls: list[str] = []
    base = {
        "/health": {"status": "ok", "db": "ok", "reglas": len(REGLAS)},
        "/jurisdicciones": JURISDICCIONES,
        "/dimensiones": DIMENSIONES,
        "/categorias": CATEGORIAS,
        "/reglas": REGLAS,
        "/evaluaciones": EVALUACIONES,
    }
    base.update(respuestas_por_path or {})

    def handler(request: httpx.Request) -> httpx.Response:
        urls.append(str(request.url))
        if fallo is not None:
            raise fallo
        path = request.url.path
        if path not in base:
            raise AssertionError(f"path inesperado hacia el grafo: {path}")
        cuerpo = base[path]
        if isinstance(cuerpo, httpx.Response):
            return cuerpo
        return httpx.Response(200, content=json.dumps(cuerpo))

    app = crear_app(transport=httpx.MockTransport(handler))
    return TestClient(app), urls


def test_solo_rutas_de_lectura():
    """'Jamas escribe' por construccion: ninguna ruta acepta POST/PUT/PATCH/DELETE."""
    app = crear_app()
    metodos = {m for r in app.routes for m in getattr(r, "methods", set())}
    assert not metodos & {"POST", "PUT", "PATCH", "DELETE"}, metodos


def test_health_con_grafo_vivo():
    client, urls = _cliente()
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "grafo": "ok", "reglas": 3}
    assert [httpx.URL(u).path for u in urls] == ["/health"]


def test_health_con_grafo_caido_responde_igual():
    client, _ = _cliente(fallo=httpx.ConnectError("boom"))
    r = client.get("/health")
    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["status"] == "ok" and cuerpo["reglas"] is None
    # el motivo jamas viaja vacio (str(ConnectError) puede serlo; se usa repr)
    assert cuerpo["grafo"] not in ("", "ok")


def test_arbol_compone_y_pide_las_urls_exactas():
    client, urls = _cliente()
    r = client.get("/arbol")
    assert r.status_code == 200
    assert r.headers["cache-control"] == "no-store"
    assert {httpx.URL(u).path for u in urls} == {"/jurisdicciones", "/dimensiones", "/reglas"}
    cuerpo = r.json()
    assert cuerpo["total_reglas"] == 3
    mx = next(j for j in cuerpo["jurisdicciones"] if j["codigo"] == "MX")
    fiscal = next(d for d in mx["dimensiones"] if d["codigo"] == "fiscal")
    assert [x["clave"] for x in fiscal["reglas"]] == ["MX-F-1", "MX-F-2"]
    # la regla viaja INTACTA (vigencia + fuente, tal como la dio el grafo)
    assert fiscal["reglas"][0]["fuente_cita"] and fiscal["reglas"][0]["vigente"] is True
    # el hueco de cobertura se ve, no se oculta
    contable = next(d for d in mx["dimensiones"] if d["codigo"] == "contable")
    assert contable["reglas"] == []


def test_arbol_propaga_fecha_al_grafo():
    client, urls = _cliente()
    r = client.get("/arbol?fecha=2025-01-15")
    assert r.status_code == 200
    assert r.json()["fecha"] == "2025-01-15"
    reglas_url = next(httpx.URL(u) for u in urls if httpx.URL(u).path == "/reglas")
    assert reglas_url.params["fecha"] == "2025-01-15"


def test_arbol_con_grafo_caido_es_503():
    client, _ = _cliente(fallo=httpx.ConnectError("boom"))
    r = client.get("/arbol")
    assert r.status_code == 503
    assert "grafo no disponible" in r.json()["detail"]


def test_arbol_con_grafo_en_error_es_503():
    client, _ = _cliente(respuestas_por_path={"/reglas": httpx.Response(500, text="pum")})
    r = client.get("/arbol")
    assert r.status_code == 503
    assert "respondio 500" in r.json()["detail"]


def test_constructor_deriva_solo_de_reglas_vigentes():
    client, urls = _cliente()
    r = client.get("/constructor?jurisdiccion=mx&dimension=FISCAL")
    assert r.status_code == 200
    assert r.headers["cache-control"] == "no-store"
    cuerpo = r.json()
    # el filtro viajo al grafo tal cual (el grafo normaliza mayusculas)
    reglas_url = next(httpx.URL(u) for u in urls if httpx.URL(u).path == "/reglas")
    assert reglas_url.params["jurisdiccion"] == "mx" and reglas_url.params["dimension"] == "FISCAL"
    assert {httpx.URL(u).path for u in urls} == {"/reglas", "/categorias"}
    # GENERAL (wildcard) fuera; RESICO fuera porque su regla NO esta vigente
    assert cuerpo["regimenes"] == ["PM_TITULO_II"]
    assert cuerpo["regimen_default"] == "PM_TITULO_II"
    # AJENA (regla vencida) y NOMINA (otro ambito... aqui el mock devuelve todas
    # las reglas sin filtrar, asi que NOMINA si aparece: lo que se prueba es el
    # criterio "solo categorias referenciadas por impactos de reglas VIGENTES")
    assert {c["clave"] for c in cuerpo["categorias"]} == {"VIATICOS", "NOMINA"}
    plantilla = cuerpo["plantilla_payload"]
    assert plantilla["contexto"] == {
        "jurisdiccion": "MX", "dimension": "fiscal", "regimen": "PM_TITULO_II",
    }
    assert plantilla["conceptos"] == [{"descripcion": "", "importe": None}]


def test_constructor_con_fecha_la_incluye_en_contexto():
    client, _ = _cliente()
    r = client.get("/constructor?jurisdiccion=MX&dimension=fiscal&fecha=2025-06-01")
    assert r.status_code == 200
    assert r.json()["plantilla_payload"]["contexto"]["fecha"] == "2025-06-01"


def test_constructor_requiere_ambito():
    client, _ = _cliente()
    assert client.get("/constructor").status_code == 422
    assert client.get("/constructor?jurisdiccion=MX").status_code == 422


def test_catalogos_passthrough():
    client, urls = _cliente()
    r = client.get("/catalogos")
    assert r.status_code == 200
    assert r.json() == {"jurisdicciones": JURISDICCIONES, "dimensiones": DIMENSIONES}
    assert {httpx.URL(u).path for u in urls} == {"/jurisdicciones", "/dimensiones"}


def test_evaluaciones_passthrough_integro():
    client, urls = _cliente()
    r = client.get("/evaluaciones?limit=5")
    assert r.status_code == 200
    assert r.headers["cache-control"] == "no-store"
    # cuerpo INTACTO: disclaimer y fuentes tal como los persistio el grafo
    assert r.json() == EVALUACIONES
    url = httpx.URL(urls[0])
    assert url.path == "/evaluaciones" and url.params["limit"] == "5"


def test_evaluaciones_limit_invalido_es_422_local():
    client, urls = _cliente()
    assert client.get("/evaluaciones?limit=0").status_code == 422
    assert client.get("/evaluaciones?limit=101").status_code == 422
    assert urls == []  # el request invalido jamas toca el grafo
