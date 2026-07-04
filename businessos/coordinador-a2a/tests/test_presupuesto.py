"""Tests del lector de presupuesto (Fase 7, Fase 3): suma por token_usage.task_id."""
import asyncio

import httpx

from presupuesto import Presupuesto


def _cliente(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


def test_suma_costo_por_task_id():
    vistos = {}

    def handler(request: httpx.Request) -> httpx.Response:
        vistos["url"] = str(request.url)
        return httpx.Response(200, json=[{"costo_usd": 0.5}, {"costo_usd": 0.7}])

    p = Presupuesto(url="http://sb", key="k", http_client=_cliente(handler))
    total = asyncio.run(p.gasto_acumulado(["a", "b", "p"]))
    assert total == 1.2
    # El filtro pide EXACTAMENTE esos task_id (atribución, no ventana temporal).
    assert "task_id=in.(a,b,p)" in vistos["url"]
    assert "token_usage" in vistos["url"]


def test_inactivo_devuelve_cero():
    """Sin SUPABASE_URL/KEY (dev, tests) no corta: gasto 0.0."""
    p = Presupuesto(url="", key="")
    assert asyncio.run(p.gasto_acumulado(["a"])) == 0.0


def test_sin_task_ids_devuelve_cero():
    p = Presupuesto(url="http://sb", key="k", http_client=_cliente(lambda r: httpx.Response(200, json=[])))
    assert asyncio.run(p.gasto_acumulado([])) == 0.0


def test_error_de_red_no_corta():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("sin red")

    p = Presupuesto(url="http://sb", key="k", http_client=_cliente(handler))
    assert asyncio.run(p.gasto_acumulado(["a"])) == 0.0
