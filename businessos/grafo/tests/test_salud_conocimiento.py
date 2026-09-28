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


def test_vencida_con_reemplazo_no_es_hueco_y_sin_reemplazo_si():
    """Solo-anadir: cerrar una regla no es error si otra viva cubre su categoria hoy."""
    def con_cat(clave, desde, hasta=None, cat="C1"):
        r = _regla(clave, hasta=hasta)
        r["vigente_desde"] = desde
        r["impactos"][0]["categoria"] = cat
        return r

    hoy = date(2026, 7, 2)
    s = salud_conocimiento([con_cat("VIEJA", "2010-01-01", "2025-03-20"), con_cat("NUEVA", "2025-03-21")], hoy=hoy)
    assert s["reglas_vencidas"] == [{"clave": "VIEJA", "vigente_hasta": "2025-03-20", "sin_reemplazo": []}]
    s = salud_conocimiento([con_cat("VIEJA", "2010-01-01", "2025-03-20")], hoy=hoy)
    assert s["reglas_vencidas"][0]["sin_reemplazo"] == ["C1"]
    # Un reemplazo que todavia no entra en vigor no cubre hoy.
    s = salud_conocimiento([con_cat("VIEJA", "2010-01-01", "2025-03-20"), con_cat("FUTURA", "2027-01-01")], hoy=hoy)
    assert s["reglas_vencidas"][0]["sin_reemplazo"] == ["C1"]


def test_sin_vencidas_ni_pendientes_sin_advertencia():
    s = salud_conocimiento([_regla("R-VIVA")], hoy=date(2026, 7, 2))
    assert s["reglas_vencidas"] == []
    assert s["advertencia"] is None


def test_endpoint_salud_conocimiento():
    r = client.get("/salud-conocimiento")
    assert r.status_code == 200
    body = r.json()
    # 98 del corte congelado + la LFPDPPP de 2010, de vuelta y cerrada (paquete de conocimiento 0.2.0)
    assert body["reglas_total"] == 99
    # Cerrada CON reemplazo (la LFPDPPP 2025 cubre su categoria hoy): no es hueco ni alarma
    assert body["reglas_vencidas"] == [
        {"clave": "MX-LFPDPPP-21-CONFIDENCIALIDAD", "vigente_hasta": "2025-03-20", "sin_reemplazo": []}
    ]
    assert body["verificar_pendientes"], "el seed v2 tiene montos por cotejar"
    ambitos = {(a["jurisdiccion"], a["dimension"]) for a in body["ambitos"]}
    assert {
        ("MX", "fiscal"), ("MX", "contable"), ("MX", "contractual"),
        ("MX", "regulatorio"), ("CO", "fiscal"), ("MX", "datos-personales"),
    } <= ambitos
