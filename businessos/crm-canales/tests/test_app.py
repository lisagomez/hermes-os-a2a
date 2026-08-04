"""Tests del conector CRM: webhooks, techo estructural, marca blanca, bitácora.

Patrón del repo: async con fakes inyectados; TestClient de Starlette.
"""
from __future__ import annotations

import hashlib
import hmac
import json

from starlette.testclient import TestClient

from app import build_app
from guardia import Decision
from motor import MotorError

TG_SECRET = "s3cr3t"
WA_VERIFY = "v3r1fy"
WA_APP_SECRET = "app-s3cret-hex"

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
        self.ultimo_uso = None

    async def responder(self, system, historial, mensaje, modelo=None):
        self.calls.append({"system": system, "historial": historial, "mensaje": mensaje, "modelo": modelo})
        if self.error:
            raise MotorError("boom")
        self.ultimo_uso = {"modelo": modelo or "modelo-fake", "tokens_in": 10,
                           "tokens_out": 5, "costo_usd": 0.0001}
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


class FakeLeads:
    """Puente al pipeline de adquisición: registra qué se intentó capturar.
    ok=True simula lead NUEVO (dispara calificación); ok=False, ya existía/falló."""

    def __init__(self, ok=True):
        self.ok, self.capturados, self.calificados = ok, [], []

    async def capturar(self, tenant_id, canal, canal_uid, nombre, texto, referral=None):
        self.capturados.append({"tenant_id": tenant_id, "canal": canal, "canal_uid": canal_uid,
                                "nombre": nombre, "texto": texto, "referral": referral})
        return self.ok

    async def calificar(self, tenant_id, canal, canal_uid, resultado):
        self.calificados.append({"tenant_id": tenant_id, "canal": canal,
                                 "canal_uid": canal_uid, "resultado": resultado})
        return True


class FakeGuardia:
    """Guardia de presupuesto: decisión configurable + espía de registros."""

    def __init__(self, decision=None):
        self.decision = decision or Decision(True, "ok", "modelo-economico")
        self.evaluaciones, self.registros = [], []

    async def evaluar(self, tenant_id, clase="basica"):
        self.evaluaciones.append({"tenant_id": tenant_id, "clase": clase})
        return self.decision

    async def registrar(self, **fila):
        self.registros.append(fila)
        return True


class FakeCalificador:
    def __init__(self, resultado=None):
        self.resultado = resultado or {"decision": "califica", "senales": ["pide precio"], "confianza": 0.8}
        self.calls = []
        self.ultimo_uso = {"modelo": "calificador-fake", "tokens_in": 8, "tokens_out": 4, "costo_usd": 0.00005}

    async def calificar(self, texto):
        self.calls.append(texto)
        return self.resultado


class FakeSup:
    """None = sup caído (fail-closed); dict = veredicto."""

    def __init__(self, veredicto={"aprobado": True, "gates": {}, "motivo": ""}):
        self.veredicto, self.calls = veredicto, []

    async def validar(self, tenant_id, marca, conversacion, respuesta, conversacion_id=None, nivel="A1"):
        self.calls.append({"respuesta": respuesta, "conversacion": conversacion, "nivel": nivel})
        return self.veredicto


def _client(motor=None, store=None, canales=None, sup=None, leads=None,
            guardia=None, calificador=None, wa_app_secret=WA_APP_SECRET):
    app = build_app(
        motor=motor or FakeMotor(),
        store=store or FakeStore(),
        canales=canales or FakeCanales(),
        sup=sup or FakeSup(),
        leads=leads or FakeLeads(),
        guardia=guardia or FakeGuardia(),
        calificador=calificador or FakeCalificador(),
        tg_secret=TG_SECRET,
        wa_verify=WA_VERIFY,
        wa_app_secret=wa_app_secret,
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


def _wa_post(c, payload, secret=WA_APP_SECRET, tenant="acme", firma=None):
    """POST al webhook de WhatsApp firmado como lo hace Meta (HMAC del cuerpo crudo)."""
    cuerpo = json.dumps(payload).encode()
    if firma is None:
        firma = "sha256=" + hmac.new(secret.encode(), cuerpo, hashlib.sha256).hexdigest()
    return c.post(
        f"/webhook/whatsapp/{tenant}",
        content=cuerpo,
        headers={"Content-Type": "application/json", "X-Hub-Signature-256": firma},
    )


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
    r = _wa_post(c, _wa_payload("precio del tour"))
    assert r.status_code == 200
    assert store.contactos[0] == {"canal": "whatsapp", "canal_uid": "5215512345678", "nombre": "Eli W"}
    assert canales.enviados[0]["phone_id"] == "555000"
    assert [m["direccion"] for m in store.mensajes] == ["entrante", "saliente"]


def test_whatsapp_firma_invalida_403_y_no_procesa():
    store = FakeStore()
    c = _client(store=store)
    r = _wa_post(c, _wa_payload("hola"), firma="sha256=" + "0" * 64)
    assert r.status_code == 403 and store.mensajes == []


def test_whatsapp_sin_firma_403():
    store = FakeStore()
    c = _client(store=store)
    r = c.post("/webhook/whatsapp/acme", json=_wa_payload("hola"))
    assert r.status_code == 403 and store.mensajes == []


def test_whatsapp_sin_app_secret_503_fail_closed():
    store = FakeStore()
    c = _client(store=store, wa_app_secret="")
    r = _wa_post(c, _wa_payload("hola"), secret="cualquiera")
    assert r.status_code == 503 and store.mensajes == []


def test_whatsapp_app_secret_por_tenant_gana(monkeypatch):
    # El secret por tenant (CRM_WHATSAPP_APP_SECRET__<TENANT>) manda sobre el global.
    monkeypatch.setenv("CRM_WHATSAPP_APP_SECRET__ACME", "secreto-del-tenant")
    store = FakeStore()
    c = _client(store=store, wa_app_secret="global-que-no-aplica")
    ok = _wa_post(c, _wa_payload("hola"), secret="secreto-del-tenant")
    mal = _wa_post(c, _wa_payload("hola"), secret="global-que-no-aplica")
    assert ok.status_code == 200 and mal.status_code == 403


def test_lead_capturado_desde_whatsapp_y_telegram():
    leads = FakeLeads()
    c = _client(leads=leads)
    _wa_post(c, _wa_payload("precio del tour"))
    c.post("/webhook/telegram/acme", json=_tg_update("hola"),
           headers={"X-Telegram-Bot-Api-Secret-Token": TG_SECRET})
    assert leads.capturados[0]["canal"] == "whatsapp"
    assert leads.capturados[0]["canal_uid"] == "5215512345678"
    assert leads.capturados[1]["canal"] == "telegram"


def test_lead_fallido_no_tumba_la_atencion():
    store, leads = FakeStore(), FakeLeads(ok=False)
    c = _client(store=store, leads=leads)
    r = _wa_post(c, _wa_payload("hola"))
    assert r.status_code == 200
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
    _wa_post(c, _wa_payload("hola"))
    assert store.mensajes[1]["enviado"] is False  # trazable, jamás silencioso


# --- guardia de presupuesto (pieza 1: control ANTES de la llamada) ---------------

def _tg(c, texto="hola"):
    return c.post("/webhook/telegram/acme", json=_tg_update(texto),
                  headers={"X-Telegram-Bot-Api-Secret-Token": TG_SECRET})


def test_guardia_bloquea_escala_sin_llamar_al_motor():
    motor, store = FakeMotor(), FakeStore()
    guardia = FakeGuardia(Decision(False, "tope_mensual", None, gasto_mes=5.5, limite=5.0))
    c = _client(motor=motor, store=store, guardia=guardia, leads=FakeLeads(ok=False))
    _tg(c, "¿precio del tour?")
    assert motor.calls == []                # ni un token después del tope
    assert store.escaladas == [7]           # estado seguro explícito: humano
    assert "equipo de Acme Tours" in store.mensajes[1]["texto"]
    assert guardia.registros == []          # nada que registrar: no hubo llamada


def test_guardia_sin_presupuesto_bloquea_fail_closed():
    motor, store = FakeMotor(), FakeStore()
    guardia = FakeGuardia(Decision(False, "sin_presupuesto", None))
    c = _client(motor=motor, store=store, guardia=guardia, leads=FakeLeads(ok=False))
    _tg(c)
    assert motor.calls == [] and store.escaladas == [7]


def test_guardia_degradar_usa_el_modelo_que_dicta():
    motor = FakeMotor()
    guardia = FakeGuardia(Decision(True, "tope_degradar", "modelo-economico",
                                   degradado=True, aviso=True))
    c = _client(motor=motor, guardia=guardia, leads=FakeLeads(ok=False))
    _tg(c)
    assert motor.calls[0]["modelo"] == "modelo-economico"  # el routing lo decide la guardia


def test_respuesta_registra_el_gasto_en_token_usage():
    guardia = FakeGuardia()
    c = _client(guardia=guardia, leads=FakeLeads(ok=False))
    _tg(c)
    assert len(guardia.registros) == 1
    reg = guardia.registros[0]
    assert reg["tenant_id"] == "acme" and reg["clase"] == "basica"
    assert reg["task_id"] == "crm-acme-7"   # task_id no-nulo: índice único del ledger
    assert reg["tokens_in"] == 10 and reg["costo_usd"] == 0.0001


def test_techo_estructural_no_evalua_guardia_si_no_hay_lead_nuevo():
    guardia = FakeGuardia()
    c = _client(guardia=guardia, leads=FakeLeads(ok=False))
    _tg(c, "quiero hablar con una persona ya")
    assert guardia.evaluaciones == []       # plantilla de la casa: cero modelo, cero guardia


# --- calificador de intención (pieza 2: señal paralela en el lead) ---------------

def test_lead_nuevo_se_califica_y_persiste_senal():
    leads, calificador, guardia = FakeLeads(ok=True), FakeCalificador(), FakeGuardia()
    c = _client(leads=leads, calificador=calificador, guardia=guardia)
    _tg(c, "¿me cotizas un tour para 4?")
    assert calificador.calls == ["¿me cotizas un tour para 4?"]
    assert leads.calificados[0]["resultado"]["decision"] == "califica"
    # el gasto del calificador TAMBIÉN se registra (misma guardia, task propio)
    assert any(r["task_id"] == "crm-acme-cal-7" for r in guardia.registros)


def test_lead_repetido_no_se_recalifica():
    leads, calificador = FakeLeads(ok=False), FakeCalificador()
    c = _client(leads=leads, calificador=calificador)
    _tg(c)
    assert calificador.calls == [] and leads.calificados == []


def test_calificacion_indeterminada_escala_a_humano():
    store, leads = FakeStore(), FakeLeads(ok=True)
    calificador = FakeCalificador({"decision": "indeterminado",
                                   "senales": ["error_calificador: HTTP 500"], "confianza": 0.0})
    c = _client(store=store, leads=leads, calificador=calificador)
    _tg(c)
    assert 7 in store.escaladas            # indeterminado escala, no adivina
    assert leads.calificados[0]["resultado"]["decision"] == "indeterminado"


def test_guardia_bloqueada_omite_calificacion():
    leads, calificador, store = FakeLeads(ok=True), FakeCalificador(), FakeStore()
    guardia = FakeGuardia(Decision(False, "tope_mensual", None))
    c = _client(leads=leads, calificador=calificador, guardia=guardia, store=store)
    _tg(c)
    assert calificador.calls == []          # el calificador también es una llamada a modelo
    assert leads.calificados == []


def test_calificacion_no_toca_etapa():
    leads = FakeLeads(ok=True)
    c = _client(leads=leads)
    _tg(c)
    assert "etapa" not in leads.calificados[0]["resultado"]  # señal paralela


# --- atribución de campaña (pieza 6: referral de Meta) ---------------------------

def test_referral_de_meta_viaja_al_lead():
    leads = FakeLeads()
    c = _client(leads=leads)
    payload = _wa_payload("vengo del anuncio")
    payload["entry"][0]["changes"][0]["value"]["messages"][0]["referral"] = {
        "source_id": "camp-77", "source_type": "ad", "ctwa_clid": "clid-1",
    }
    _wa_post(c, payload)
    assert leads.capturados[0]["referral"]["source_id"] == "camp-77"


def test_sin_referral_el_lead_viaja_sin_atribucion():
    leads = FakeLeads()
    c = _client(leads=leads)
    _wa_post(c, _wa_payload("hola"))
    assert leads.capturados[0]["referral"] is None
