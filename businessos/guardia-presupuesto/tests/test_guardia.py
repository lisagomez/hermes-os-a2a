"""Tests de la guardia de presupuesto: cada camino de decisión y el registro
ruidoso. Sin red: httpx.MockTransport (mismo patrón inyectable que crm-canales);
síncronos vía asyncio.run (convención de tests del repo, sin pytest-asyncio)."""
from __future__ import annotations

import asyncio
import datetime
import json

import httpx

from guardia import Decision, GuardiaPresupuesto, mes_rango

URL = "https://sb.example"


def _guardia(handler) -> GuardiaPresupuesto:
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return GuardiaPresupuesto(url=URL, key="k", http_client=client)


def _respuestas(presupuesto: list | None, usos: list | None):
    """Handler PostgREST: presupuestos_ia y token_usage."""

    def handler(request: httpx.Request) -> httpx.Response:
        if "presupuestos_ia" in str(request.url):
            return httpx.Response(200, json=presupuesto or [])
        if "token_usage" in str(request.url):
            return httpx.Response(200, json=usos or [])
        return httpx.Response(404)

    return handler


def _cfg(limite=10.0, umbral=0.8, accion="bloquear") -> dict:
    return {"tenant_id": "t1", "limite_mensual": limite,
            "umbral_aviso": umbral, "accion_al_tope": accion}


# --- mes_rango -----------------------------------------------------------------

def test_mes_rango_no_usa_dia_31():
    """Gotcha 2026-07-29: 'lte <mes>-31' revienta en meses cortos → [gte, lt)."""
    assert mes_rango(datetime.date(2026, 2, 15)) == ("2026-02-01", "2026-03-01")
    assert mes_rango(datetime.date(2026, 12, 31)) == ("2026-12-01", "2027-01-01")


# --- evaluar: caminos ----------------------------------------------------------

def test_sin_presupuesto_bloquea_fail_closed():
    d = asyncio.run(_guardia(_respuestas(None, None)).evaluar("t1"))
    assert d == Decision(False, "sin_presupuesto", None)


def test_bajo_limite_permite_con_modelo_de_la_clase():
    g = _guardia(_respuestas([_cfg()], [{"costo_usd": 1.0}]))
    basica = asyncio.run(g.evaluar("t1", "basica"))
    assert basica.permitido and basica.motivo == "ok" and not basica.aviso
    assert basica.modelo == "google/gemini-2.5-flash-lite"
    avanzada = asyncio.run(g.evaluar("t1", "avanzada"))
    assert avanzada.modelo == "anthropic/claude-sonnet-4.6"


def test_umbral_de_aviso():
    g = _guardia(_respuestas([_cfg(limite=10.0, umbral=0.8)], [{"costo_usd": 8.5}]))
    d = asyncio.run(g.evaluar("t1"))
    assert d.permitido and d.aviso and d.motivo == "ok"


def test_tope_bloquear():
    g = _guardia(_respuestas([_cfg(limite=5.0)], [{"costo_usd": 3.0}, {"costo_usd": 2.5}]))
    d = asyncio.run(g.evaluar("t1"))
    assert not d.permitido and d.motivo == "tope_mensual" and d.modelo is None
    assert d.gasto_mes == 5.5 and d.limite == 5.0


def test_tope_degradar_cae_al_economico():
    g = _guardia(_respuestas([_cfg(limite=5.0, accion="degradar")], [{"costo_usd": 6.0}]))
    d = asyncio.run(g.evaluar("t1", "avanzada"))
    assert d.permitido and d.degradado and d.aviso
    assert d.modelo == "google/gemini-2.5-flash-lite"  # aunque pidió avanzada


def test_tope_avisar_no_corta():
    g = _guardia(_respuestas([_cfg(limite=5.0, accion="avisar")], [{"costo_usd": 6.0}]))
    d = asyncio.run(g.evaluar("t1", "avanzada"))
    assert d.permitido and d.aviso and not d.degradado
    assert d.motivo == "tope_avisar" and d.modelo == "anthropic/claude-sonnet-4.6"


def test_supabase_caido_bloquea_visible():
    def caido(_request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("boom")

    d = asyncio.run(_guardia(caido).evaluar("t1"))
    assert d == Decision(False, "guardia_no_disponible", None)


def test_http_500_bloquea_visible():
    def error(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text="pg down")

    d = asyncio.run(_guardia(error).evaluar("t1"))
    assert not d.permitido and d.motivo == "guardia_no_disponible"


def test_clase_desconocida_cae_a_basica():
    g = _guardia(_respuestas([_cfg()], []))
    d = asyncio.run(g.evaluar("t1", "rarisima"))
    assert d.modelo == "google/gemini-2.5-flash-lite"


# --- registrar -----------------------------------------------------------------

def test_registrar_escribe_fila_completa():
    capturado = {}

    def handler(request: httpx.Request) -> httpx.Response:
        capturado.update(json.loads(request.content))
        return httpx.Response(201)

    ok = asyncio.run(_guardia(handler).registrar(
        tenant_id="t1", clase="basica", modelo="google/gemini-2.5-flash-lite",
        tokens_in=100, tokens_out=50, costo_usd=0.000123, task_id="crm-t1-7",
    ))
    assert ok
    assert capturado == {
        "vertical": "crm", "tenant_id": "t1", "clase_tarea": "basica",
        "task_id": "crm-t1-7", "modelo": "google/gemini-2.5-flash-lite",
        "tokens_in": 100, "tokens_out": 50, "costo_usd": 0.000123,
    }


def test_registrar_sin_task_id_se_niega():
    """task_id null chocaría con el índice único del agregado diario (409
    silencioso, gotcha 2026-07-11): la guardia lo rechaza ANTES."""
    ok = asyncio.run(_guardia(_respuestas(None, None)).registrar(
        tenant_id="t1", clase="basica", modelo="m", tokens_in=1, tokens_out=1,
        costo_usd=0, task_id="",
    ))
    assert not ok


def test_registrar_fallo_http_es_ruidoso_y_no_lanza(caplog):
    def rechaza(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(409, text="conflict")

    with caplog.at_level("ERROR"):
        ok = asyncio.run(_guardia(rechaza).registrar(
            tenant_id="t1", clase="basica", modelo="m", tokens_in=1, tokens_out=1,
            costo_usd=0, task_id="crm-t1-1",
        ))
    assert not ok
    assert any("NO registrado" in r.message for r in caplog.records)


def test_registrar_excepcion_es_ruidosa_y_no_lanza(caplog):
    def caido(_request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("boom")

    with caplog.at_level("ERROR"):
        ok = asyncio.run(_guardia(caido).registrar(
            tenant_id="t1", clase="basica", modelo="m", tokens_in=1, tokens_out=1,
            costo_usd=0, task_id="crm-t1-1",
        ))
    assert not ok
    assert any("NO registrado" in r.message for r in caplog.records)
