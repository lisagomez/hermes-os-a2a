"""Tests del FabricChaincodeEngine (PRP-013, Fase 3).

Specs que encajan producen un paquete con diff acotado y manifest completo;
specs que NO encajan en la maquina de estados de escrow-v1 revientan con el
porque exacto ANTES de escribir un solo archivo. Cero modelo, cero red.

La compilacion/tests Go del paquete generado los cubre el gate fabric y el
smoke (test_engine_go.py se salta si no hay toolchain go en la maquina).
"""
from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "engine"))

from fabrica import EngineError, FabricChaincodeEngine, MockEngine  # noqa: E402
from test_contrato_sc import spec_escrow  # noqa: E402


@pytest.fixture()
def engine() -> FabricChaincodeEngine:
    return FabricChaincodeEngine()


def _mutada(camino: list, valor) -> dict:
    d = copy.deepcopy(spec_escrow())
    nodo = d["sc_spec"]
    for paso in camino[:-1]:
        nodo = nodo[paso]
    if valor is None:
        del nodo[camino[-1]]
    else:
        nodo[camino[-1]] = valor
    return d


# --- fabricacion feliz -------------------------------------------------------

def test_fabrica_paquete_completo(engine, tmp_path):
    manifest = engine.fabricar(spec_escrow(), tmp_path / "out")
    out = tmp_path / "out"
    for rel in ("go.mod", "go.sum", "cmd/main.go", "chaincode/escrow.go",
                "chaincode/criterios_test.go", "collections_config.json",
                "manifest.json"):
        assert (out / rel).is_file(), f"falta {rel}"
    assert manifest["nombre"] == "escrow-compraventa-maquinaria"
    assert manifest["paquete_sha256"]
    assert manifest["politica_endorsement"] == "AND('Org1MSP.peer','Org2MSP.peer')"
    # los tests base de la plantilla NO viajan al paquete
    assert not (out / "chaincode" / "escrow_test.go").exists()


def test_fabricacion_es_determinista(engine, tmp_path):
    m1 = engine.fabricar(spec_escrow(), tmp_path / "a")
    m2 = engine.fabricar(spec_escrow(), tmp_path / "b")
    assert m1["paquete_sha256"] == m2["paquete_sha256"]


def test_diff_acotado_a_parametrizacion(engine, tmp_path):
    spec = spec_escrow()
    spec["sc_spec"]["roles"][1]["msp"] = "AcmeMSP"
    spec["sc_spec"]["organizaciones"] = ["Org1MSP", "AcmeMSP"]
    spec["sc_spec"]["datos_privados"][0]["organizaciones"] = ["Org1MSP", "AcmeMSP"]
    spec["sc_spec"]["politica_endorsement"] = "AND('Org1MSP.peer','AcmeMSP.peer')"
    manifest = engine.fabricar(spec, tmp_path / "out")
    cambios = {d["despues"] for d in manifest["diff"]}
    assert 'mspVendedor  = "AcmeMSP"' in cambios
    # nada fuera del bloque de parametrizacion cambio: el diff es corto
    assert len(manifest["diff"]) <= 12
    generado = (tmp_path / "out" / "chaincode" / "escrow.go").read_text()
    assert 'AcmeMSP' in generado and 'GetTxTimestamp' in generado


def test_parametriza_eventos_plazo_monedas_prefijo(engine, tmp_path):
    spec = spec_escrow()
    sc = spec["sc_spec"]
    sc["eventos"] = [
        {"nombre": "Fondeado", "en": "fondear"},
        {"nombre": "Pelea", "en": "abrir_disputa"},
        {"nombre": "Pagado", "en": "liberar_pago"},
    ]
    sc["transiciones"][4]["regla"] = "dentro_de_plazo(fecha_limite + 45d)"
    sc["activos"][0]["campos"][1]["enum"] = ["USDC", "COP", "EUR"]
    sc["activos"][0]["id"] = "garantia"
    manifest = engine.fabricar(spec, tmp_path / "out")
    generado = (tmp_path / "out" / "chaincode" / "escrow.go").read_text()
    assert 'eventoPagoLiberado     = "Pagado"' in generado
    assert "45 * 24 * 60 * 60" in generado
    assert 'case "USDC", "COP", "EUR":' in generado
    assert 'prefijoClave = "garantia:"' in generado
    assert manifest["parametros"]["plazo_dias"] == 45
    tests = (tmp_path / "out" / "chaincode" / "criterios_test.go").read_text()
    assert '"Pagado"' in tests and "46*24*3600" in tests


def test_colecciones_privadas_a_config_de_despliegue(engine, tmp_path):
    engine.fabricar(spec_escrow(), tmp_path / "out")
    cols = json.loads((tmp_path / "out" / "collections_config.json").read_text())
    assert cols[0]["name"] == "terminos-comerciales"
    assert cols[0]["policy"] == "OR('Org1MSP.member', 'Org2MSP.member')"
    assert cols[0]["memberOnlyRead"] is True


def test_spec_sin_datos_privados_no_emite_config(engine, tmp_path):
    spec = _mutada(["datos_privados"], [])
    engine.fabricar(spec, tmp_path / "out")
    assert not (tmp_path / "out" / "collections_config.json").exists()


def test_destino_no_vacio_rechazado(engine, tmp_path):
    out = tmp_path / "out"
    out.mkdir()
    (out / "previo.txt").write_text("x")
    with pytest.raises(EngineError, match="no esta vacio"):
        engine.fabricar(spec_escrow(), out)


# --- specs que NO encajan: rechazo con el porque, sin archivos ---------------

@pytest.mark.parametrize(
    "mutacion, fragmento",
    [
        # transicion extra: la maquina de estados no es parametrizable
        (lambda s: s["sc_spec"]["transiciones"].append(
            {"de": "entregado", "a": "disputado", "quien": ["vendedor"],
             "funcion": "disputar_entrega"}), "no son 1:1"),
        # quien ampliado en una transicion existente
        (lambda s: s["sc_spec"]["transiciones"][0].update(
            {"quien": ["comprador", "vendedor"]}), "no son 1:1"),
        # estados renombrados
        (lambda s: s["sc_spec"].update(
            {"estados": ["nuevo", "fondeado", "entregado", "liberado",
                         "disputado", "resuelto", "cancelado"],
             "transiciones": [dict(t, de="nuevo") if t["de"] == "creado"
                              else t for t in s["sc_spec"]["transiciones"]]}),
         "EXACTAMENTE los estados"),
        # rol faltante
        (lambda s: s["sc_spec"].update(
            {"roles": s["sc_spec"]["roles"][:2],
             "transiciones": [t for t in s["sc_spec"]["transiciones"]
                              if "arbitro" not in t["quien"]],
             "estados": s["sc_spec"]["estados"]}), None),
        # arbitro sin atributo ABAC
        (lambda s: s["sc_spec"]["roles"][2].pop("atributo"), "atributo ABAC"),
        # regla de resolver con formato ajeno
        (lambda s: s["sc_spec"]["transiciones"][4].update(
            {"regla": "cuando el arbitro quiera"}), "no soportada"),
        # campo extra en el activo
        (lambda s: s["sc_spec"]["activos"][0]["campos"].append(
            {"nombre": "interes", "tipo": "uint"}), "no implementa los campos"),
        # sin enum de monedas
        (lambda s: s["sc_spec"]["activos"][0]["campos"][1].pop("enum"),
         "enum de monedas"),
        # eventos incompletos (falta el de liberar_pago)
        (lambda s: s["sc_spec"].update(
            {"eventos": s["sc_spec"]["eventos"][:2]}), "1:1 obligatorio"),
    ],
)
def test_specs_que_no_encajan_revientan(engine, tmp_path, mutacion, fragmento):
    spec = spec_escrow()
    mutacion(spec)
    out = tmp_path / "out"
    with pytest.raises(EngineError) as exc:
        engine.fabricar(spec, out)
    if fragmento:
        assert fragmento in str(exc.value)
    assert not out.exists() or not any(out.rglob("*.go")), \
        "una spec rechazada no debe dejar codigo en el destino"


def test_spec_invalida_de_contrato_tambien_reventa(engine, tmp_path):
    spec = _mutada(["plantilla"], "plantilla-pirata")
    with pytest.raises(EngineError, match="contrato_sc"):
        engine.fabricar(spec, tmp_path / "out")


# --- MockEngine ---------------------------------------------------------------

def test_mock_engine_copia_plantilla(tmp_path):
    manifest = MockEngine().fabricar(spec_escrow(), tmp_path / "out")
    assert manifest["mock"] is True
    assert (tmp_path / "out" / "chaincode" / "escrow.go").is_file()
