"""Tests del techo estructural, el prompt marca blanca y el envío por canal."""
from __future__ import annotations

import asyncio

from canales import Canales
from prompt import requiere_humano, system_prompt


def test_requiere_humano_disparadores():
    assert requiere_humano("Quiero hablar con una PERSONA")
    assert requiere_humano("necesito un reembolso del pedido")
    assert requiere_humano("mi abogado dice que es un tema legal")
    assert not requiere_humano("¿a qué hora abren el sábado?")
    assert not requiere_humano("me interesa el tour, ¿precio?")


def test_system_prompt_es_del_tenant():
    t = {"marca": "Café Lima", "tono": "cálido, tuteo.", "casos_uso": ["soporte"]}
    s = system_prompt(t, "whatsapp")
    assert "Café Lima" in s and "cálido, tuteo." in s and "soporte" in s and "WhatsApp" in s
    # Techo estructural presente aunque el tenant no lo pida:
    assert "JAMÁS inventas" in s and "ESCALAN a humano" in s


def test_system_prompt_defaults():
    s = system_prompt({"marca": "X", "tono": "", "casos_uso": []}, "telegram")
    assert "atención general" in s and "profesional" in s


class FakeHttp:
    def __init__(self, status=200):
        self.status, self.calls = status, []

    async def post(self, url, json=None, headers=None):
        self.calls.append({"url": url, "json": json, "headers": headers})

        class R:
            status_code = self.status

        return R()


def test_telegram_sin_token_false_sin_llamar(monkeypatch):
    monkeypatch.delenv("CRM_TELEGRAM_TOKEN__ACME", raising=False)
    http = FakeHttp()
    ok = asyncio.run(Canales(http_client=http).telegram("acme", "42", "hola"))
    assert ok is False and http.calls == []


def test_telegram_con_token_llama_api(monkeypatch):
    monkeypatch.setenv("CRM_TELEGRAM_TOKEN__ACME", "123:abc")
    http = FakeHttp()
    ok = asyncio.run(Canales(http_client=http).telegram("acme", "42", "hola"))
    assert ok is True
    assert http.calls[0]["url"] == "https://api.telegram.org/bot123:abc/sendMessage"
    assert http.calls[0]["json"] == {"chat_id": "42", "text": "hola"}


def test_whatsapp_con_token_llama_graph(monkeypatch):
    monkeypatch.setenv("CRM_WHATSAPP_TOKEN__MI_MARCA", "EAAG...x")
    http = FakeHttp()
    ok = asyncio.run(Canales(http_client=http).whatsapp("mi-marca", "555000", "5215512345678", "hola"))
    assert ok is True
    llamada = http.calls[0]
    assert "graph.facebook.com" in llamada["url"] and "/555000/messages" in llamada["url"]
    assert llamada["json"]["to"] == "5215512345678"
    assert llamada["headers"]["Authorization"].startswith("Bearer ")
