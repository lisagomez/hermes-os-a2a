"""Cliente DENUE: match EXACTO normalizado o nada; errores VISIBLES."""
import asyncio
import json

import httpx
import pytest

from denue import Denue, DenueError, normalizar_nombre

CANDIDATOS = [
    {"Id": "1", "CLEE": "clee-1", "Nombre": "ACME",
     "Razon_social": "ACME S.A. DE C.V.", "Telefono": "5512345678",
     "Correo_e": "Contacto@Acme.mx", "Sitio_internet": "www.acme.mx"},
    {"Id": "2", "CLEE": "clee-2", "Nombre": "ACME NORTE",
     "Razon_social": "ACME NORTE SA DE CV", "Telefono": "", "Correo_e": ""},
]


def cliente(respuesta) -> Denue:
    def handler(request: httpx.Request) -> httpx.Response:
        if isinstance(respuesta, int):
            return httpx.Response(respuesta)
        return httpx.Response(200, json=respuesta)
    http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return Denue(token="tok", base="http://denue-fake", http_client=http)


def buscar(d: Denue, nombre: str) -> dict:
    return asyncio.run(d.buscar(nombre))


def test_normalizar_quita_sufijos_societarios_y_acentos():
    assert normalizar_nombre("Acmé, S.A. de C.V.") == "ACME"
    assert normalizar_nombre("ACME NORTE SA DE CV") == "ACME NORTE"


def test_match_exacto_normalizado_es_hit():
    r = buscar(cliente(CANDIDATOS), "Acme, S.A. de C.V.")
    assert r["encontrado"] is True
    assert r["telefono"] == "5512345678"
    assert r["correo"] == "contacto@acme.mx"
    assert r["razon_social"] == "ACME S.A. DE C.V."
    assert r["detalle"]["clee"] == "clee-1"


def test_sin_match_exacto_es_miss_con_candidatos():
    r = buscar(cliente(CANDIDATOS), "ACME SUR")
    assert r["encontrado"] is False
    assert r["detalle"]["candidatos"] == 2


def test_404_de_denue_es_cero_candidatos_no_error():
    r = buscar(cliente(404), "ACME")
    assert r["encontrado"] is False
    assert r["detalle"]["candidatos"] == 0


def test_sin_token_es_error_visible():
    with pytest.raises(DenueError, match="DENUE_TOKEN"):
        buscar(Denue(token="", base="http://denue-fake"), "ACME")


def test_http_500_es_error_visible():
    with pytest.raises(DenueError, match="500"):
        buscar(cliente(500), "ACME")


def test_respuesta_no_json_es_error_visible():
    def handler(request):
        return httpx.Response(200, text="<html>error</html>")
    http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    with pytest.raises(DenueError, match="no-JSON"):
        buscar(Denue(token="tok", base="http://f", http_client=http), "ACME")
