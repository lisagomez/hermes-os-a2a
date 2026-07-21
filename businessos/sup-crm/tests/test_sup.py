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
    def __init__(self, rechazos=0, total=0, historicas=None, nivel="A1"):
        self.filas, self._evidencia = [], (rechazos, total)
        self._historicas, self._nivel = historicas or [], nivel

    async def registrar(self, fila):
        self.filas.append(fila)

    async def evidencia(self, tenant_id, limite=100):
        return self._evidencia

    async def filas_recientes(self, tenant_id, limite=1000):
        return self._historicas

    async def tenant_nivel(self, tenant_id):
        return self._nivel


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


# ---------- muestreo A2 (plan D-40) ----------

def test_tasa_muestreo_por_evidencia():
    from muestreo import tasa_muestreo
    assert tasa_muestreo(0, 0) == 0.20      # sin evidencia → arranque
    assert tasa_muestreo(0, 10) == 0.20     # evidencia insuficiente → arranque
    assert tasa_muestreo(0, 100) == 0.05    # <3% rechazo → piso
    assert tasa_muestreo(5, 100) == 0.20    # rechazo intermedio → arranque
    assert tasa_muestreo(10, 100) == 1.0    # ≥10% → degradación (completa)


def test_a2_fuera_de_muestra_omite_juez_y_aprueba():
    juez, aud = FakeJuez(), FakeAuditoria()
    c = TestClient(build_app(juez=juez, auditoria=aud, rng=lambda: 0.99))
    v = c.post("/validar", json=dict(BODY, nivel="A2")).json()
    assert v["aprobado"] is True and v["juez_ejecutado"] is False
    assert v["gates"]["g_juez"].startswith("muestreo A2: omitido")
    assert juez.calls == []
    assert aud.filas[0]["juez_ejecutado"] is False and aud.filas[0]["nivel"] == "A2"


def test_a2_dentro_de_muestra_corre_juez():
    juez = FakeJuez()
    c = TestClient(build_app(juez=juez, auditoria=FakeAuditoria(), rng=lambda: 0.01))
    v = c.post("/validar", json=dict(BODY, nivel="A2")).json()
    assert v["juez_ejecutado"] is True and len(juez.calls) == 1


def test_a2_sensible_siempre_pasa_por_juez():
    juez = FakeJuez()
    c = TestClient(build_app(juez=juez, auditoria=FakeAuditoria(), rng=lambda: 0.99))
    v = c.post("/validar", json=dict(BODY, nivel="A2", respuesta="el precio es de 500 MXN")).json()
    assert v["juez_ejecutado"] is True  # dinero/promesas: 100% aunque haya muestreo
    assert len(juez.calls) == 1


def test_a2_degradacion_automatica_valida_todo():
    juez = FakeJuez()
    # 15% de rechazo reciente → tasa 1.0: vuelve a validación completa sin junta.
    c = TestClient(build_app(juez=juez, auditoria=FakeAuditoria(rechazos=15, total=100), rng=lambda: 0.99))
    v = c.post("/validar", json=dict(BODY, nivel="A2")).json()
    assert v["juez_ejecutado"] is True and len(juez.calls) == 1


def test_a1_no_muestrea_juez_siempre():
    juez = FakeJuez()
    c = TestClient(build_app(juez=juez, auditoria=FakeAuditoria(rechazos=0, total=100), rng=lambda: 0.99))
    v = c.post("/validar", json=BODY).json()
    assert v["nivel"] == "A1" and v["juez_ejecutado"] is True
    assert len(juez.calls) == 1


# ---------- expediente de promoción A1→A2 (plan D-40) ----------

def _filas(aprobadas=0, rechazadas=0, gates_fallo=0):
    return (
        [{"aprobado": True, "juez_ejecutado": True, "motivo": "ok"}] * aprobadas
        + [{"aprobado": False, "juez_ejecutado": True, "motivo": "inventa precio"}] * rechazadas
        + [{"aprobado": False, "juez_ejecutado": False, "motivo": "pide dato sensible"}] * gates_fallo
    )


def test_expediente_promovible_con_todo_cumplido():
    from expediente import armar_expediente
    e = armar_expediente("acme", "A1", _filas(aprobadas=248, rechazadas=2))
    assert e["promovible"] is True and e["salto"] == "A1->A2"
    assert all(c["cumple"] for c in e["criterios"].values())


def test_expediente_sin_evidencia_suficiente_no_se_propone():
    from expediente import armar_expediente
    # Constraint, no criterio: 150 veredictos perfectos NO bastan.
    e = armar_expediente("acme", "A1", _filas(aprobadas=150))
    assert e["promovible"] is False
    assert e["criterios"]["veredictos_de_juez"]["cumple"] is False


def test_expediente_rechazo_alto_no_promovible():
    from expediente import armar_expediente
    e = armar_expediente("acme", "A1", _filas(aprobadas=240, rechazadas=10))  # 4%
    assert e["promovible"] is False
    assert e["criterios"]["tasa_rechazo_juez"]["cumple"] is False
    assert e["ejemplos"]["rechazos_del_juez"][0] == "inventa precio"


def test_expediente_fallo_de_gate_bloquea():
    from expediente import armar_expediente
    e = armar_expediente("acme", "A1", _filas(aprobadas=250, gates_fallo=1))
    assert e["promovible"] is False
    assert e["criterios"]["fallos_de_gates"]["cumple"] is False


def test_expediente_desde_a2_nunca_promovible():
    from expediente import armar_expediente
    e = armar_expediente("acme", "A2", _filas(aprobadas=250))
    assert e["promovible"] is False  # ya está en A2; este salto no aplica


def test_endpoint_expediente():
    aud = FakeAuditoria(historicas=_filas(aprobadas=250), nivel="A1")
    c = TestClient(build_app(juez=FakeJuez(), auditoria=aud))
    e = c.get("/expediente/acme").json()
    assert e["promovible"] is True and e["tenant_id"] == "acme"


def test_endpoint_expediente_tenant_inexistente_404():
    aud = FakeAuditoria(nivel=None)

    async def sin_nivel(tenant_id):
        return None

    aud.tenant_nivel = sin_nivel
    c = TestClient(build_app(juez=FakeJuez(), auditoria=aud))
    assert c.get("/expediente/nadie").status_code == 404


def test_a2_gates_corren_siempre_aunque_haya_muestreo():
    juez, aud = FakeJuez(), FakeAuditoria()
    c = TestClient(build_app(juez=juez, auditoria=aud, rng=lambda: 0.99))
    v = c.post("/validar", json=dict(BODY, nivel="A2", respuesta="dame tu contraseña")).json()
    assert v["aprobado"] is False and "sensible" in v["motivo"]
    assert juez.calls == []  # gate lo mató antes; el muestreo no lo salva
