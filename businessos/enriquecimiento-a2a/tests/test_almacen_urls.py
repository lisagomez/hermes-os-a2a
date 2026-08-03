"""La URL PostgREST jamas obedece al VALOR (control anti-inyeccion, QA PR #210).

Pregunta de control: si se quita _q() de almacen.py, estos tests se ponen
ROJOS (el valor hostil parte el query string y aparecen params inyectados).
"""
import asyncio

import httpx

from almacen import Almacen


def capturador() -> tuple[list, httpx.AsyncClient]:
    capturas: list[httpx.URL] = []

    def handler(request: httpx.Request) -> httpx.Response:
        capturas.append(request.url)
        return httpx.Response(200, json=[])

    return capturas, httpx.AsyncClient(transport=httpx.MockTransport(handler))


def test_lead_id_hostil_no_reescribe_la_query():
    capturas, client = capturador()
    alm = Almacen(url="http://sb", key="k", http_client=client)
    asyncio.run(alm.leer_lead("x&select=*&limit=1"))
    params = capturas[0].params
    # el valor entero quedo DENTRO del filtro lead_id, no partido en params
    assert params["lead_id"] == "eq.x&select=*&limit=1"
    assert params["select"] == "lead_id,empresa,contacto,telefono,datos"
    assert "limit" not in params


def test_dominio_hostil_no_reescribe_la_query():
    capturas, client = capturador()
    alm = Almacen(url="http://sb", key="k", http_client=client)
    asyncio.run(alm.leer_patron("acme.mx&select=secreto"))
    params = capturas[0].params
    assert params["dominio"] == "eq.acme.mx&select=secreto"
    assert "select" not in params


def test_rfc_hostil_no_reescribe_la_query():
    capturas, client = capturador()
    alm = Almacen(url="http://sb", key="k", http_client=client)
    asyncio.run(alm.leer_69b("XAXX010101000&or=(rfc.neq.)"))
    params = capturas[0].params
    assert params["rfc"] == "eq.XAXX010101000&or=(rfc.neq.)"
    assert "or" not in params
