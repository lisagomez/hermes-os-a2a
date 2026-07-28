"""Tests del puente CRM → leads (origen 'crm', un escritor por origen)."""
from __future__ import annotations

import asyncio

from leads import LeadsCrm, lead_id_de_contacto


class FakeHttp:
    """Espía mínimo del AsyncClient: guarda la llamada y responde lo pedido."""

    def __init__(self, status_code=201):
        self.status_code, self.llamadas = status_code, []

    async def post(self, url, headers=None, json=None):
        self.llamadas.append({"url": url, "headers": headers, "json": json})
        return type("R", (), {"status_code": self.status_code})()


def _capturar(leads, canal="whatsapp", canal_uid="5215512345678", nombre="Eli W", texto="precio del tour"):
    return asyncio.run(leads.capturar("acme", canal, canal_uid, nombre, texto))


def test_lead_id_determinista():
    assert lead_id_de_contacto("acme", "whatsapp", "521551") == "crm-acme-whatsapp-521551"


def test_whatsapp_persiste_con_telefono_y_origen_crm():
    http = FakeHttp()
    assert _capturar(LeadsCrm(url="http://sb", key="k", http_client=http)) is True
    fila = http.llamadas[0]["json"]
    assert fila["origen"] == "crm" and fila["canal"] == "whatsapp"
    assert fila["telefono"] == "5215512345678"  # el wa_id ES el teléfono
    assert fila["etapa"] == "nuevo"
    assert fila["datos"]["tenant_id"] == "acme"
    assert "on_conflict=lead_id" in http.llamadas[0]["url"]


def test_no_pisa_leads_existentes_ignore_duplicates():
    # ignore-duplicates: el 2º mensaje jamás re-escribe la etapa que movió el funnel.
    http = FakeHttp()
    _capturar(LeadsCrm(url="http://sb", key="k", http_client=http))
    assert "ignore-duplicates" in http.llamadas[0]["headers"]["Prefer"]
    assert "merge-duplicates" not in http.llamadas[0]["headers"]["Prefer"]


def test_telegram_no_contamina_telefono():
    http = FakeHttp()
    _capturar(LeadsCrm(url="http://sb", key="k", http_client=http), canal="telegram", canal_uid="42")
    fila = http.llamadas[0]["json"]
    assert fila["telefono"] == "" and fila["canal"] == "telegram"


def test_sin_supabase_devuelve_false_y_loguea(caplog):
    assert _capturar(LeadsCrm(url="", key="")) is False
    assert any("NO persistido" in r.message for r in caplog.records)


def test_http_error_devuelve_false_y_loguea(caplog):
    assert _capturar(LeadsCrm(url="http://sb", key="k", http_client=FakeHttp(status_code=409))) is False
    assert any("NO guardado" in r.message for r in caplog.records)
