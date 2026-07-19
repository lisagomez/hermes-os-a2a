"""Tests del escritor de leads del chat: fila correcta, upsert idempotente, origen web2.

Patrón del repo: async probado con asyncio.run() (sin pytest-asyncio).
"""
from __future__ import annotations

import asyncio

from leads import LeadsStore, lead_id_de_email


class FakeResp:
    def __init__(self, status_code=201):
        self.status_code = status_code


class FakeHttp:
    def __init__(self, status_code=201):
        self.status_code = status_code
        self.calls = []

    async def post(self, url, headers=None, json=None):
        self.calls.append({"url": url, "headers": headers, "json": json})
        return FakeResp(self.status_code)


def _store(http, url="https://proj.supabase.co", key="svc"):
    return LeadsStore(url=url, key=key, http_client=http)


def test_lead_id_determinista_por_email():
    a = lead_id_de_email("Ana@Empresa.com")
    b = lead_id_de_email("ana@empresa.com  ")
    assert a == b  # case + espacios normalizados → mismo id (upsert idempotente)
    assert a.startswith("web2chat-")


def test_upsert_construye_fila_web2():
    http = FakeHttp()
    ok = asyncio.run(
        _store(http).upsert(
            {"nombre": "Ana", "email": "ana@empresa.com", "empresa": "Panadería Ana", "interes": "agente de pedidos"}
        )
    )
    assert ok is True
    call = http.calls[0]
    assert "on_conflict=lead_id" in call["url"]
    assert "merge-duplicates" in call["headers"]["Prefer"]
    fila = call["json"]
    assert fila["origen"] == "web2"
    assert fila["etapa"] == "nuevo"
    assert fila["contacto"] == "Ana <ana@empresa.com>"
    assert fila["mensaje"] == "agente de pedidos"
    assert fila["lead_id"] == lead_id_de_email("ana@empresa.com")
    assert fila["datos"]["source"] == "web2-chat"


def test_upsert_sin_supabase_devuelve_false():
    store = LeadsStore(url="", key="", http_client=FakeHttp())
    assert asyncio.run(store.upsert({"email": "x@y.com"})) is False


def test_upsert_http_error_loguea_y_false():
    http = FakeHttp(status_code=500)
    assert asyncio.run(_store(http).upsert({"email": "x@y.com", "nombre": None})) is False
