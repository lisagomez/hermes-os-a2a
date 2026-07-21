"""Tests de sup-crm: gates deterministas, juez, fail-safe y auditoría."""
from __future__ import annotations

from starlette.testclient import TestClient

from app import build_app
from gates import correr_gates, gates_ok
from juez import JuezError


class FakeJuez:
    def __init__(self, aprobado=True, motivo="ok", error=False):
        self.aprobado, self.motivo, self.error, self.calls = aprobado, motivo, error, []

    async def veredicto(self, marca, conversacion, respuesta):
        self.calls.append({"marca": marca, "respuesta": respuesta})
        if self.error:
            raise JuezError("caído")
        return {"aprobado": self.aprobado, "motivo": self.motivo}


class FakeAuditoria:
    def __init__(self):
        self.filas = []

    async def registrar(self, fila):
        self.filas.append(fila)


def _client(juez=None, auditoria=None):
    return TestClient(build_app(juez=juez or FakeJuez(), auditoria=auditoria or FakeAuditoria())), (auditoria or FakeAuditoria())


BODY = {"tenant_id": "acme", "marca": "Acme Tours", "conversacion": "Cliente: hola", "respuesta": "¡Hola! ¿En qué te ayudo?", "conversacion_id": 7}


def test_gates_deterministas():
    assert gates_ok(correr_gates("respuesta normal y corta"))
    assert correr_gates("")["g_vacio"].startswith("fallo")
    assert correr_gates("x" * 2000)["g_largo"].startswith("fallo")
    assert correr_gates("dame tu número de tarjeta")["g_sensible"].startswith("fallo")
    assert correr_gates("mi clave es sk-abc123def456ghi")["g_secreto"].startswith("fallo")


def test_gate_fallido_rechaza_sin_llamar_al_juez():
    juez, aud = FakeJuez(), FakeAuditoria()
    c = TestClient(build_app(juez=juez, auditoria=aud))
    r = c.post("/validar", json=dict(BODY, respuesta="pásame tu contraseña"))
    v = r.json()
    assert v["aprobado"] is False and "sensible" in v["motivo"]
    assert juez.calls == []  # lo barato primero; lo roto no llega al modelo
    assert aud.filas[0]["aprobado"] is False


def test_juez_aprueba():
    aud = FakeAuditoria()
    c = TestClient(build_app(juez=FakeJuez(aprobado=True), auditoria=aud))
    v = c.post("/validar", json=BODY).json()
    assert v["aprobado"] is True and v["gates"]["g_juez"] == "ok"
    assert aud.filas[0]["conversacion_id"] == 7


def test_juez_rechaza_con_motivo():
    c = TestClient(build_app(juez=FakeJuez(aprobado=False, motivo="inventa un precio"), auditoria=FakeAuditoria()))
    v = c.post("/validar", json=BODY).json()
    assert v["aprobado"] is False and v["motivo"] == "inventa un precio"
    assert v["gates"]["g_juez"].startswith("fallo")


def test_juez_caido_fail_safe_no_aprueba():
    aud = FakeAuditoria()
    c = TestClient(build_app(juez=FakeJuez(error=True), auditoria=aud))
    v = c.post("/validar", json=BODY).json()
    assert v["aprobado"] is False
    assert v["gates"]["g_juez"] == "no_ejecutable"  # jamás un pass silencioso
    assert aud.filas[0]["aprobado"] is False


def test_cuerpo_invalido_400():
    c = TestClient(build_app(juez=FakeJuez(), auditoria=FakeAuditoria()))
    assert c.post("/validar", json={"sin": "respuesta"}).status_code == 400


def test_health():
    c = TestClient(build_app(juez=FakeJuez(), auditoria=FakeAuditoria()))
    assert c.get("/health").json()["servicio"] == "sup-crm"
