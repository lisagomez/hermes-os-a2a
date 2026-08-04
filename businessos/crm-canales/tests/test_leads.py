"""Tests del puente CRM → leads (origen 'crm', un escritor por origen)."""
from __future__ import annotations

import asyncio

from leads import LeadsCrm, lead_id_de_contacto


class FakeHttp:
    """Espía mínimo del AsyncClient: guarda la llamada y responde lo pedido.
    `body` simula return=representation: [fila] = insertó, [] = ya existía."""

    def __init__(self, status_code=201, body=None):
        self.status_code, self.llamadas = status_code, []
        self.body = [{"lead_id": "x"}] if body is None else body

    def _resp(self):
        cuerpo = self.body
        return type("R", (), {"status_code": self.status_code, "json": lambda self_: cuerpo})()

    async def post(self, url, headers=None, json=None):
        self.llamadas.append({"metodo": "post", "url": url, "headers": headers, "json": json})
        return self._resp()

    async def patch(self, url, headers=None, json=None):
        self.llamadas.append({"metodo": "patch", "url": url, "headers": headers, "json": json})
        return self._resp()


def _capturar(leads, canal="whatsapp", canal_uid="5215512345678", nombre="Eli W",
              texto="precio del tour", referral=None):
    return asyncio.run(leads.capturar("acme", canal, canal_uid, nombre, texto, referral=referral))


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


def test_lead_ya_existente_devuelve_false_sin_error():
    """return=representation con cuerpo [] = ya existía → False (no dispara
    calificación) y SIN log de error (no es un fallo)."""
    http = FakeHttp(status_code=201, body=[])
    assert _capturar(LeadsCrm(url="http://sb", key="k", http_client=http)) is False


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


# --- atribución de campaña (referral de Meta, §8) -------------------------------

def test_referral_captura_campana_y_utm():
    http = FakeHttp()
    referral = {"source_id": "camp-123", "source_type": "ad", "source_url": "https://fb.me/x",
                "ctwa_clid": "clid-9"}
    _capturar(LeadsCrm(url="http://sb", key="k", http_client=http), referral=referral)
    fila = http.llamadas[0]["json"]
    assert fila["campana_id"] == "camp-123"
    assert fila["utm"] == referral  # el bloque completo, tal como llegó


def test_sin_referral_no_manda_columnas_de_campana():
    http = FakeHttp()
    _capturar(LeadsCrm(url="http://sb", key="k", http_client=http))
    fila = http.llamadas[0]["json"]
    assert "campana_id" not in fila and "utm" not in fila


# --- señal de calificación (§4) — jamás toca etapa ------------------------------

def test_calificar_escribe_senal_y_nunca_etapa():
    http = FakeHttp(status_code=204, body=[])
    leads = LeadsCrm(url="http://sb", key="k", http_client=http)
    ok = asyncio.run(leads.calificar("acme", "whatsapp", "521551", {
        "decision": "califica", "senales": ["pide cotización"], "confianza": 0.9,
    }))
    assert ok
    llamada = http.llamadas[0]
    assert llamada["metodo"] == "patch"
    assert "lead_id=eq.crm-acme-whatsapp-521551" in llamada["url"]
    parche = llamada["json"]
    assert parche["calificacion"] == "califica"
    assert parche["calificacion_senales"] == {"senales": ["pide cotización"], "confianza": 0.9}
    assert parche["calificado_en"]
    assert "etapa" not in parche  # regla dura: el escritor de la etapa es el funnel


def test_calificar_fallo_es_ruidoso(caplog):
    http = FakeHttp(status_code=500)
    leads = LeadsCrm(url="http://sb", key="k", http_client=http)
    ok = asyncio.run(leads.calificar("acme", "telegram", "42", {
        "decision": "indeterminado", "senales": [], "confianza": 0.0,
    }))
    assert not ok
    assert any("calificación NO guardada" in r.message for r in caplog.records)
