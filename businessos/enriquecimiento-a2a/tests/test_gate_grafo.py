"""Gate LFPDPPP: fail-closed ante grafo caido/incompleto; mapeo escalon->concepto."""
import asyncio

import pytest

import gate_grafo
from fakes import FakeGrafo
from gate_grafo import GateGrafo, GateGrafoError, bloqueo_de, permite


def consultar(fake: FakeGrafo) -> dict:
    async def _run():
        async with fake.client() as http:
            return await GateGrafo(url="http://grafo-fake", http_client=http).consultar()
    return asyncio.run(_run())


def test_consulta_feliz_trae_los_4_conceptos():
    ev = consultar(FakeGrafo())
    assert set(ev["por_concepto"]) == set(gate_grafo.CONCEPTOS)
    assert ev["disclaimer"]
    assert ev["fuentes"]


def test_grafo_http_500_es_fail_closed():
    with pytest.raises(GateGrafoError):
        consultar(FakeGrafo(status_code=500))


def test_concepto_faltante_es_fail_closed():
    with pytest.raises(GateGrafoError):
        consultar(FakeGrafo(omitir={gate_grafo.CONCEPTO_PF}))


def test_grafo_inalcanzable_es_fail_closed():
    async def _run():
        # sin transport fake y con URL invalida: httpx truena -> GateGrafoError
        await GateGrafo(url="http://127.0.0.1:1").consultar()
    with pytest.raises(GateGrafoError):
        asyncio.run(_run())


def test_permite_solo_con_permitido():
    ev = consultar(FakeGrafo())
    assert permite(ev, "denue") is True
    assert permite(ev, "patron_dominio") is True
    ev2 = consultar(FakeGrafo(estados={gate_grafo.CONCEPTO_FUENTE_PUBLICA: "dudoso"}))
    assert permite(ev2, "denue") is False


def test_solo_denue_y_patron_se_gatean_por_grafo():
    # rfc_offline y sat_69b NO estan gateados (decision explicita del diseno)
    assert set(gate_grafo.CONCEPTO_POR_ESCALON) == {"denue", "patron_dominio"}


def test_bloqueo_de_trae_fuente_y_checklist():
    ev = consultar(FakeGrafo(estados={gate_grafo.CONCEPTO_FUENTE_PUBLICA: "dudoso"}))
    b = bloqueo_de(ev, "denue")
    assert b["estado"] == "dudoso"
    assert b["fuente"]["clave"]
    assert b["checklist"]
