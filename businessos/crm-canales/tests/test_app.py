"""Tests del conector CRM: webhooks, techo estructural, marca blanca, bitácora.

Patrón del repo: async con fakes inyectados; TestClient de Starlette.
"""
from __future__ import annotations

from starlette.testclient import TestClient

from app import build_app
from motor import MotorError

TG_SECRET = "s3cr3t"
WA_VERIFY = "v3r1fy"

TENANT = {
    "tenant_id": "acme",
    "marca": "Acme Tours",
    "tono": "alegre y directo.",
    "casos_uso": ["preventa", "agenda"],
    "canales": {"telegram": {"habilitado": True}, "whatsapp": {"habilitado": True, "phone_id": "555000"}},
    "activo": True,
}


class FakeMotor:
    def __init__(self, respuesta="Claro, con gusto.", error=False):
        self.respuesta, self.error, self.calls = respuesta, error, []

    async def responder(self, system, historial, mensaje):
        self.calls.append({"system": system, "historial": historial, "mensaje": mensaje})
        if self.error:
            raise MotorError("boom")
        return self.respuesta


class FakeStore:
    def __init__(self, tenant=TENANT):
        self._tenant = tenant
        self.mensajes, self.escaladas, self.contactos = [], [], []

    async def tenant(self, tenant_id):
        return self._tenant if self._tenant and tenant_id == self._tenant["tenant_id"] else None

    async def contacto(self, tenant_id, canal, canal_uid, nombre):
        self.contactos.append({"canal": canal, "canal_uid": canal_uid, "nombre": nombre})
        return {"id": 1}

    async def conversacion(self, tenant_id, contacto_id):
        return {"id": 7}

    async def escalar(self, conversacion_id):
        self.escaladas.append(conversacion_id)

    async def mensaje(self, tenant_id, conversacion_id, direccion, canal, texto, emisor, enviado=None):
        self.mensajes.append({"direccion": direccion, "canal": canal, "texto": texto, "emisor": emisor, "enviado": enviado})

    async def historial(self, conversacion_id, limite=12):
        return []


class FakeCanales:
    def __init__(self, ok=True):
        self.ok, self.enviados = ok, []

    async def telegram(self, tenant_id, chat_id, texto):
        self.enviados.append({"canal": "telegram", "chat_id": chat_id, "texto": texto})
        return self.ok

    async def whatsapp(self, tenant_id, phone_id, wa_id, texto):
        self.enviados.append({"canal": "whatsapp", "phone_id": phone_id, "wa_id": wa_id, "texto": texto})
        return self.ok


class FakeSup:
    """None = sup caído (fail-closed); dict = veredicto."""

    def __init__(self, veredicto={"aprobado": True, "gates": {}, "motivo": ""}):
        self.veredicto, self.calls = veredicto, []

    async def validar(self, tenant_id, marca, conversacion, respuesta, conversacion_id=None, nivel="A1"):
        self.calls.append({"respuesta": respuesta, "conversacion": conversacion, "nivel": nivel})
        return self.veredicto


def _client(motor=None, store=None, canales=None, sup=None):
    app = build_app(
        motor=motor or FakeMotor(),
        store=store or FakeStore(),
        canales=canales or FakeCanales(),
        sup=sup or FakeSup(),
        tg_secret=TG_SECRET,
        wa_verify=WA_VERIFY,
    )
    return TestClient(app)


def _tg_update(texto, chat_id=42, nombre="Eli"):
    return {"message": {"text": texto, "chat": {"id": chat_id}, "from": {"first_name": nombre}}}


def _wa_payload(texto, wa_id="5215512345678", nombre="Eli W"):
    return {
        "entry": [{"changes": [{"value": {
            "contacts": [{"wa_id": wa_id, "profile": {"name": nombre}}],
            "messages": [{"type": "text", "from": wa_id, "text": {"body": texto}}],
        }}]}]
    }


def test_health_ok():
    assert _client().get("/health").json()["status"] == "ok"


def test_telegram_sin_secret_403():
    r = _client().post("/webhook/telegram/acme", json=_tg_update("hola"))
    assert r.status_code == 403


def test_telegram_flujo_feliz_guarda_y_envia():
    store, canales = FakeStore(), FakeCanales()
    c = _client(store=store, canales=canales)
    r = c.post("/webhook/telegram/acme", json=_tg_update("¿tienen tours el sábado?"),
               headers={"X-Telegram-Bot-Api-Secret-Token": TG_SECRET})
    assert r.status_code == 200
    dirs = [m["direccion"] for m in store.mensajes]
    assert dirs == ["entrante", "saliente"]
    assert store.mensajes[1]["enviado"] is True
    assert canales.enviados[0]["chat_id"] == "42"


def test_telegram_update_sin_texto_ignorado():
    store = FakeStore()
    c = _client(store=store)
    r = c.post("/webhook/telegram/acme", json={"message": {"chat": {"id": 1}}},
               headers={"X-Telegram-Bot-Api-Secret-Token": TG_SECRET})
    assert r.status_code == 200 and store.mensajes == []


def test_tenant_inexistente_no_crash_ni_guarda():
    store = FakeStore(tenant=None)
    c = _client(store=store)
    r = c.post("/webhook/telegram/otro", json=_tg_update("hola"),
               headers={"X-Telegram-Bot-Api-Secret-Token": TG_SECRET})
    assert r.status_code == 200 and store.mensajes == []


def test_canal_deshabilitado_ignora():
    tenant = dict(TENANT, canales={"telegram": {"habilitado": False}})
    store = FakeStore(tenant=tenant)
    c = _client(store=store)
    c.post("/webhook/telegram/acme", json=_tg_update("hola"),
           headers={"X-Telegram-Bot-Api-Secret-Token": TG_SECRET})
    assert store.mensajes == []


def test_techo_estructural_escala_sin_llamar_al_motor():
    motor, store = FakeMotor(), FakeStore()
    c = _client(motor=motor, store=store)
    c.post("/webhook/telegram/acme", json=_tg_update("quiero hablar con una persona ya"),
           headers={"X-Telegram-Bot-Api-Secret-Token": TG_SECRET})
    assert store.escaladas == [7]
    assert motor.calls == []  # el techo NO depende de que el LLM obedezca
    assert "equipo de Acme Tours" in store.mensajes[1]["texto"]


def test_motor_caido_degrada_honesto():
    store = FakeStore()
    c = _client(motor=FakeMotor(error=True), store=store)
    c.post("/webhook/telegram/acme", json=_tg_update("hola"),
           headers={"X-Telegram-Bot-Api-Secret-Token": TG_SECRET})
    assert "no puedo responderte" in store.mensajes[1]["texto"]
    assert store.mensajes[1]["enviado"] is True  # la degradación TAMBIÉN se envía


def test_marca_blanca_en_el_system_prompt():
    motor = FakeMotor()
    c = _client(motor=motor)
    c.post("/webhook/telegram/acme", json=_tg_update("hola"),
           headers={"X-Telegram-Bot-Api-Secret-Token": TG_SECRET})
    system = motor.calls[0]["system"]
    assert "Acme Tours" in system and "alegre y directo." in system and "preventa" in system


def test_whatsapp_verify_challenge_y_403():
    c = _client()
    ok = c.get(f"/webhook/whatsapp/acme?hub.mode=subscribe&hub.verify_token={WA_VERIFY}&hub.challenge=abc123")
    assert ok.status_code == 200 and ok.text == "abc123"
    mal = c.get("/webhook/whatsapp/acme?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=x")
    assert mal.status_code == 403


def test_whatsapp_flujo_feliz_con_perfil():
    store, canales = FakeStore(), FakeCanales()
    c = _client(store=store, canales=canales)
    r = c.post("/webhook/whatsapp/acme", json=_wa_payload("precio del tour"))
    assert r.status_code == 200
    assert store.contactos[0] == {"canal": "whatsapp", "canal_uid": "5215512345678", "nombre": "Eli W"}
    assert canales.enviados[0]["phone_id"] == "555000"
    assert [m["direccion"] for m in store.mensajes] == ["entrante", "saliente"]


def test_sup_valida_cada_saliente_generado():
    sup = FakeSup()
    c = _client(sup=sup)
    c.post("/webhook/telegram/acme", json=_tg_update("hola"),
           headers={"X-Telegram-Bot-Api-Secret-Token": TG_SECRET})
    assert len(sup.calls) == 1  # nivel A1: todo saliente de modelo pasa por sup
    assert sup.calls[0]["respuesta"] == "Claro, con gusto."
    assert sup.calls[0]["nivel"] == "A1"  # tenant sin nivel explícito → A1


def test_nivel_a2_del_tenant_viaja_a_sup():
    sup = FakeSup()
    tenant_a2 = dict(TENANT, nivel="A2")
    c = _client(store=FakeStore(tenant=tenant_a2), sup=sup)
    c.post("/webhook/telegram/acme", json=_tg_update("hola"),
           headers={"X-Telegram-Bot-Api-Secret-Token": TG_SECRET})
    assert sup.calls[0]["nivel"] == "A2"  # el botón humano (crm_tenants.nivel) manda


def test_sup_rechaza_traspasa_a_humano():
    store = FakeStore()
    sup = FakeSup(veredicto={"aprobado": False, "gates": {}, "motivo": "inventa precio"})
    c = _client(store=store, sup=sup)
    c.post("/webhook/telegram/acme", json=_tg_update("¿cuánto cuesta?"),
           headers={"X-Telegram-Bot-Api-Secret-Token": TG_SECRET})
    assert store.escaladas == [7]
    assert "una persona del equipo de Acme Tours" in store.mensajes[1]["texto"]
    assert "Claro, con gusto." not in store.mensajes[1]["texto"]  # el saliente rechazado NO sale


def test_sup_caido_fail_closed():
    store = FakeStore()
    c = _client(store=store, sup=FakeSup(veredicto=None))
    c.post("/webhook/telegram/acme", json=_tg_update("hola"),
           headers={"X-Telegram-Bot-Api-Secret-Token": TG_SECRET})
    assert store.escaladas == [7]  # sin veredicto no sale respuesta de modelo
    assert "una persona del equipo" in store.mensajes[1]["texto"]


def test_escalado_y_degradacion_no_pasan_por_sup():
    sup = FakeSup()
    c = _client(motor=FakeMotor(error=True), sup=sup)
    c.post("/webhook/telegram/acme", json=_tg_update("hola"),
           headers={"X-Telegram-Bot-Api-Secret-Token": TG_SECRET})
    c.post("/webhook/telegram/acme", json=_tg_update("quiero hablar con una persona"),
           headers={"X-Telegram-Bot-Api-Secret-Token": TG_SECRET})
    assert sup.calls == []  # plantillas fijas de la casa: no las generó un modelo


def test_canal_sin_token_bitacora_enviado_false():
    store = FakeStore()
    c = _client(store=store, canales=FakeCanales(ok=False))
    c.post("/webhook/whatsapp/acme", json=_wa_payload("hola"))
    assert store.mensajes[1]["enviado"] is False  # trazable, jamás silencioso
