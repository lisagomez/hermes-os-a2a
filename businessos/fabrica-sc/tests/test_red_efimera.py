"""Tests del gate de red efímera (PRP-013, Fase 5).

La mitad pura (plan + integridad) se prueba al 100% en dev; el contrato del
host-job (estados que escribe, cortes, orden) se prueba con un runner espía
(patrón MockEngine, 2026-07-03). Los comandos reales contra fabric-samples se
validan en el nodo sandbox (Fase 6) — aquí se fija TODO lo demás.
"""
from __future__ import annotations

import copy
import importlib.util
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "engine"))

from contrato_sc import validar_sc_spec  # noqa: E402
from fabrica import FabricChaincodeEngine  # noqa: E402
from integridad import verificar_paquete
from red_efimera import plan_red_efimera
from test_contrato_sc import spec_escrow

_JOB = Path(__file__).parent.parent / "verificar-red-efimera.py"
_spec_mod = importlib.util.spec_from_file_location("verificar_red_efimera", _JOB)
job = importlib.util.module_from_spec(_spec_mod)
_spec_mod.loader.exec_module(job)

AHORA = 1_760_000_000


def _norm(mutar=None) -> dict:
    d = copy.deepcopy(spec_escrow())
    if mutar is not None:
        mutar(d["sc_spec"])
    return validar_sc_spec(d)


@pytest.fixture()
def paquete(tmp_path) -> Path:
    destino = tmp_path / "paquete-sc"
    FabricChaincodeEngine().fabricar(spec_escrow(), destino)
    return destino


def _manifest(paquete: Path) -> dict:
    return json.loads((paquete / "manifest.json").read_text())


# ---------- plan_red_efimera (puro) ----------

def test_plan_cubre_cada_transicion_con_instancia_fresca(paquete):
    plan = plan_red_efimera(_norm(), _manifest(paquete), AHORA)
    assert plan["resumen"]["transiciones"] == 6
    creaciones = [p for p in plan["pasos"]
                  if p["tipo"] == "invoke" and p["funcion"] == "CrearDeposito"]
    assert len(creaciones) == 6  # una instancia por transicion
    assert len({c["args"][0] for c in creaciones}) == 6  # todas distintas


def test_plan_negativo_va_antes_del_positivo_y_con_credencial_que_no_autoriza(paquete):
    plan = plan_red_efimera(_norm(), _manifest(paquete), AHORA)
    invokes_fondear = [p for p in plan["pasos"]
                       if p["tipo"] == "invoke" and p["funcion"] == "Fondear"
                       and "verif-1-" in p["args"][0]]
    # rechazo primero (vendedor, Org2MSP: MSP que NO autoriza), exito despues
    assert [p["espera"] for p in invokes_fondear] == ["rechazo", "exito"]
    assert invokes_fondear[0]["como"] == "vendedor"
    assert invokes_fondear[1]["como"] == "comprador"


def test_plan_omite_negativo_cuando_ninguna_credencial_lo_probaria(paquete):
    # abrir_disputa autoriza comprador+vendedor (Org1 y Org2): el arbitro
    # comparte MSP con comprador, un "rechazo" pasaria por razones equivocadas.
    plan = plan_red_efimera(_norm(), _manifest(paquete), AHORA)
    assert plan["resumen"]["sin_negativo"] == ["abrir_disputa"]
    assert plan["resumen"]["negativos"] == 5


def test_plan_resolver_llega_por_el_camino_de_disputa_con_identidad_de_atributo(paquete):
    plan = plan_red_efimera(_norm(), _manifest(paquete), AHORA)
    identidades = [p for p in plan["pasos"] if p["tipo"] == "identidad"]
    assert identidades == [{"tipo": "identidad", "rol": "arbitro",
                            "msp": "Org1MSP", "atributo": "rol=arbitro"}]
    resolver = [p for p in plan["pasos"]
                if p["tipo"] == "invoke" and p["funcion"] == "Resolver"
                and p["espera"] == "exito"]
    assert resolver[0]["como"] == "arbitro"
    assert resolver[0]["args"][1:] == ["liberar"]  # arg extra de la plantilla
    # instancia de resolver: crear → fondear → abrir_disputa → (neg) → resolver
    instancia = resolver[0]["args"][0]
    funciones = [p["funcion"] for p in plan["pasos"]
                 if p["tipo"] == "invoke" and p["args"][0] == instancia]
    assert funciones == ["CrearDeposito", "Fondear", "AbrirDisputa",
                         "Resolver", "Resolver"]


def test_plan_verifica_estado_tras_cada_transicion(paquete):
    plan = plan_red_efimera(_norm(), _manifest(paquete), AHORA)
    queries = [p for p in plan["pasos"] if p["tipo"] == "query"]
    assert len(queries) == 6
    assert {q["espera_estado"] for q in queries} == {
        "fondeado", "entregado", "liberado", "disputado", "resuelto", "cancelado"}


def test_plan_msp_fuera_de_la_test_network_no_es_ejecutable(paquete):
    def mutar(sc):
        sc["roles"][1]["msp"] = "AcmeMSP"
        sc["organizaciones"] = ["Org1MSP", "AcmeMSP"]
        sc["datos_privados"] = []
        sc["politica_endorsement"] = "AND('Org1MSP.peer','AcmeMSP.peer')"
    plan = plan_red_efimera(_norm(mutar), _manifest(paquete), AHORA)
    assert "AcmeMSP" in plan["no_ejecutable"]


# ---------- integridad (espejo de la formula del manifest) ----------

def test_paquete_recien_fabricado_pasa_integridad(paquete):
    r = verificar_paquete(paquete)
    assert r["ok"] and r["hallazgos"] == []
    assert r["paquete_sha256"] == _manifest(paquete)["paquete_sha256"]


def test_archivo_alterado_y_contrabando_se_detectan(paquete):
    (paquete / "chaincode" / "escrow.go").write_text("package sabotaje\n")
    (paquete / "colado.txt").write_text("x")
    r = verificar_paquete(paquete)
    assert not r["ok"]
    assert any("sha256 distinto" in h for h in r["hallazgos"])
    assert any("colado.txt" in h for h in r["hallazgos"])


def test_manifest_ausente_es_rojo(tmp_path):
    r = verificar_paquete(tmp_path)
    assert not r["ok"] and "ausente" in r["hallazgos"][0]


# ---------- contrato del host-job (runner espia) ----------

class _RunnerEspia:
    def __init__(self, fallar_en: str | None = None) -> None:
        self.ejecutados: list[dict] = []
        self._fallar_en = fallar_en

    def preparar(self, roles):
        self.roles = roles

    def ejecutar(self, paso: dict) -> dict:
        self.ejecutados.append(paso)
        if self._fallar_en and paso["tipo"] == self._fallar_en:
            return {"ok": False, "detalle": "fallo simulado"}
        return {"ok": True, "detalle": "ok"}


def _fila(paquete: Path, **extra) -> dict:
    return {"id": "u1", "task_id": "t1", "spec": spec_escrow(),
            "hash_paquete": _manifest(paquete)["paquete_sha256"], **extra}


def test_candidato_verde_pasa_a_en_revision(paquete):
    runner = _RunnerEspia()
    estado, resultado = job.procesar_candidato(_fila(paquete), paquete, runner, AHORA)
    assert estado == "en_revision"
    assert resultado["verde"] and resultado["fase"] == "red"
    assert runner.ejecutados[0]["tipo"] == "red_up"
    assert runner.ejecutados[-1]["tipo"] == "red_down"


def test_paso_rojo_escala_y_aun_baja_la_red(paquete):
    runner = _RunnerEspia(fallar_en="desplegar")
    estado, resultado = job.procesar_candidato(_fila(paquete), paquete, runner, AHORA)
    assert estado == "escalado" and not resultado["verde"]
    tipos = [p["tipo"] for p in runner.ejecutados]
    assert tipos[-1] == "red_down"          # la red no queda huerfana
    assert "invoke" not in tipos            # tras el rojo no se siguio invocando


def test_paquete_alterado_escala_sin_gastar_red(paquete):
    (paquete / "chaincode" / "escrow.go").write_text("package sabotaje\n")
    runner = _RunnerEspia()
    estado, resultado = job.procesar_candidato(_fila(paquete), paquete, runner, AHORA)
    assert estado == "escalado" and resultado["fase"] == "integridad"
    assert runner.ejecutados == []          # ni un contenedor


def test_hash_distinto_del_registrado_escala(paquete):
    runner = _RunnerEspia()
    fila = _fila(paquete, hash_paquete="0" * 64)
    estado, resultado = job.procesar_candidato(fila, paquete, runner, AHORA)
    assert estado == "escalado"
    assert "distinto del registrado" in resultado["motivo"]
    assert runner.ejecutados == []
