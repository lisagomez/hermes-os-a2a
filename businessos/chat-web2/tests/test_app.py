"""Tests del daemon del chat: auth (falla cerrado), streaming SSE y degradación."""
from __future__ import annotations

from starlette.testclient import TestClient

from app import build_app, _texto_usuario, _validar, EMAIL_RE
from motor import MotorError


class FakeMotor:
    def __init__(self, deltas=None, error=False, lead=None):
        self._deltas = deltas or []
        self._error = error
        self.lead = lead

    async def stream(self, mensajes):
        if self._error:
            raise MotorError("boom")
        for d in self._deltas:
            yield d

    async def extraer_lead(self, conversacion):
        return self.lead


class FakeLeads:
    def __init__(self):
        self.guardados = []

    async def upsert(self, lead):
        self.guardados.append(lead)
        return True


def _app(motor=None, leads=None, token="secreto"):
    return build_app(motor=motor or FakeMotor(), leads=leads or FakeLeads(), token=token)


def test_health_ok():
    r = TestClient(_app()).get("/health")
    assert r.status_code == 200 and r.json() == {"status": "ok"}


def test_sin_token_configurado_falla_cerrado():
    # Sin OPENCLAW_GATEWAY_TOKEN el daemon NO atiende (503), aunque manden Bearer.
    client = TestClient(_app(token=""))
    r = client.post("/chat/stream", json={"message": "hola"}, headers={"Authorization": "Bearer lo-que-sea"})
    assert r.status_code == 503


def test_bearer_incorrecto_401():
    client = TestClient(_app(token="secreto"))
    r = client.post("/chat/stream", json={"message": "hola"}, headers={"Authorization": "Bearer malo"})
    assert r.status_code == 401


def test_sin_authorization_401():
    r = TestClient(_app(token="secreto")).post("/chat/stream", json={"message": "hola"})
    assert r.status_code == 401


def test_stream_emite_deltas_y_done():
    motor = FakeMotor(deltas=["Hola", " qué", " tal"])
    client = TestClient(_app(motor=motor))
    r = client.post("/chat/stream", json={"message": "hola"}, headers={"Authorization": "Bearer secreto"})
    assert r.status_code == 200
    cuerpo = r.text
    assert '"type": "text_delta"' in cuerpo
    assert '"text": "Hola"' in cuerpo
    assert "data: [DONE]" in cuerpo


def test_stream_degrada_si_motor_falla():
    client = TestClient(_app(motor=FakeMotor(error=True)))
    r = client.post("/chat/stream", json={"message": "hola"}, headers={"Authorization": "Bearer secreto"})
    assert r.status_code == 200
    assert "Agendar llamada" in r.text  # texto de degradación honesta
    assert "data: [DONE]" in r.text


def test_json_invalido_400():
    client = TestClient(_app())
    r = client.post("/chat/stream", content="no-json", headers={"Authorization": "Bearer secreto"})
    assert r.status_code == 400


def test_mensaje_vacio_rechazado():
    assert _validar({"message": "   "}) is None
    assert _validar({}) is None
    assert _validar("nope") is None


def test_validar_recorta_historial():
    hist = [{"role": "user", "text": f"m{i}"} for i in range(40)]
    mensaje, historial = _validar({"message": "hola", "history": hist})
    assert mensaje == "hola"
    assert len(historial) == 16  # MAX_HISTORIAL


def test_gate_email_solo_texto_del_visitante():
    # El email del AGENTE no debe disparar captura; solo el del visitante.
    hist = [{"role": "agent", "text": "escríbenos a ventas@a2a.mx"}]
    assert not EMAIL_RE.search(_texto_usuario(hist, "no dejé correo"))
    assert EMAIL_RE.search(_texto_usuario(hist, "soy ana@empresa.com"))
