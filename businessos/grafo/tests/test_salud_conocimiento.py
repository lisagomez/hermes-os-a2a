"""Tests F3-B: salud del conocimiento (motor puro + endpoint)."""
from datetime import date

from evaluador import salud_conocimiento
from tests.test_api import client  # reusa el TestClient con overrides


def _regla(clave, hasta=None, verificar=False, jur="MX", dim="fiscal"):
    return {
        "clave": clave, "jurisdiccion": jur, "dimension": dim,
        "titulo": "t", "texto_resumen": "x", "fuente_cita": f"Cita {clave}",
        "fuente_url": "https://example.org", "source_version": "v-test",
        "vigente_desde": "2014-01-01", "vigente_hasta": hasta,
        "impactos": [{
            "categoria": None, "regimen": "GENERAL", "veredicto_base": None,
            "requisitos": ["r"], "banderas": [],
            "parametros": {"tope": 100, "verificar": True} if verificar else {},
        }],
    }


def test_detecta_vencidas_y_pendientes():
    reglas = [
        _regla("R-VIVA"),
        _regla("R-VENCIDA", hasta="2020-12-31"),
        _regla("R-PENDIENTE", verificar=True),
        _regla("R-CO", jur="CO"),
    ]
    s = salud_conocimiento(reglas, hoy=date(2026, 7, 2))
    assert [v["clave"] for v in s["reglas_vencidas"]] == ["R-VENCIDA"]
    assert [p["regla"] for p in s["verificar_pendientes"]] == ["R-PENDIENTE"]
    assert "verificar" not in s["verificar_pendientes"][0]["parametros"]
    assert {"jurisdiccion": "CO", "dimension": "fiscal", "reglas": 1} in s["ambitos"]
    assert s["advertencia"]  # hay pendientes


def test_sin_vencidas_ni_pendientes_sin_advertencia():
    s = salud_conocimiento([_regla("R-VIVA")], hoy=date(2026, 7, 2))
    assert s["reglas_vencidas"] == []
    assert s["advertencia"] is None


def test_endpoint_salud_conocimiento():
    r = client.get("/salud-conocimiento")
    assert r.status_code == 200
    body = r.json()
    assert body["reglas_total"] == 83  # Fases A-D + LMV 225 + LFPPI + servicios legales transversal (LRArt5 + LFPIORPI) + comercio exterior MX (LAdua + LCE) + logistica MX (LCPAF + LAC)
    assert body["reglas_vencidas"] == []  # el seed v3 no trae derogadas
    assert body["verificar_pendientes"], "el seed v2 tiene montos por cotejar"
    ambitos = {(a["jurisdiccion"], a["dimension"]) for a in body["ambitos"]}
    assert {
        ("MX", "fiscal"), ("MX", "contable"), ("MX", "contractual"),
        ("MX", "regulatorio"), ("CO", "fiscal"), ("MX", "datos-personales"),
    } <= ambitos
