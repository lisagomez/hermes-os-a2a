"""Tests de desplegar-chaincode.py (PRP-013, Fase 5).

Validación del PRP: fila NO aprobada → rechazo del host-job; hash distinto al
aprobado → rechazo (G5); flujo aprobado → lifecycle completo con las DOS
firmas. El peer real se valida en la red tier 1 (Fase 6); aquí se fija el
contrato con un runner espía.
"""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "engine"))

from fabrica import FabricChaincodeEngine  # noqa: E402
from test_contrato_sc import spec_escrow  # noqa: E402

_JOB = Path(__file__).parent.parent / "desplegar-chaincode.py"
_spec_mod = importlib.util.spec_from_file_location("desplegar_chaincode", _JOB)
job = importlib.util.module_from_spec(_spec_mod)
_spec_mod.loader.exec_module(job)


@pytest.fixture()
def paquete(tmp_path) -> Path:
    destino = tmp_path / "paquete-sc"
    FabricChaincodeEngine().fabricar(spec_escrow(), destino)
    return destino


def _fila(paquete: Path, **extra) -> dict:
    manifest = json.loads((paquete / "manifest.json").read_text())
    return {
        "id": "u1", "task_id": "t1", "estado": "aprobado",
        "hash_paquete": manifest["paquete_sha256"],
        "canal_destino": "canal-clientes-demo",
        "manifest": manifest, "secuencia": 1, "origen": {}, **extra,
    }


class _RunnerEspia:
    def __init__(self, fallar_en: str | None = None) -> None:
        self.llamadas: list[tuple] = []
        self._fallar_en = fallar_en

    def _r(self, nombre: str, extra: dict | None = None) -> dict:
        if nombre == self._fallar_en:
            return {"ok": False, "detalle": f"fallo simulado en {nombre}"}
        return {"ok": True, "detalle": "", **(extra or {})}

    def package(self, paquete_dir, tar_gz, etiqueta):
        self.llamadas.append(("package", etiqueta))
        tar_gz.write_bytes(b"tar-simulado")
        return self._r("package")

    def install(self, org, tar_gz):
        self.llamadas.append((f"install-{org}",))
        return self._r(f"install-{org}", {"package_id": "escrow_1:abc"})

    def approveformyorg(self, org, canal, nombre, version, secuencia, package_id, politica):
        self.llamadas.append((f"approve-{org}", canal, secuencia, package_id))
        return self._r(f"approve-{org}")

    def commit(self, canal, nombre, version, secuencia, politica):
        self.llamadas.append(("commit", canal, secuencia))
        return self._r("commit", {"txid": "deadbeef"})

    def querycommitted(self, canal, nombre):
        self.llamadas.append(("querycommitted", canal))
        return self._r("querycommitted", {"salida": '{"sequence": 1}'})


def test_flujo_aprobado_lifecycle_completo_con_las_dos_firmas(paquete, tmp_path):
    runner = _RunnerEspia()
    estado, d = job.desplegar(_fila(paquete), paquete, runner, tmp_path / "sc.tar.gz")

    assert estado == "desplegado"
    orden = [c[0] for c in runner.llamadas]
    assert orden == ["package", "install-op", "install-tg",
                     "approve-op", "approve-tg", "commit", "querycommitted"]
    assert set(d["firmas"]) == {"op", "tg"}
    assert d["firmas"]["tg"]["identidad"] == "admin-despliegue-tg"
    assert d["tx_commit"] == "deadbeef"
    assert d["secuencia"] == 1 and d["version"] == "1.0"
    assert d["paquete_tar_sha256"]  # el tar.gz del lifecycle queda hasheado


def test_g5_hash_distinto_al_aprobado_escala_sin_tocar_la_red(paquete, tmp_path):
    runner = _RunnerEspia()
    fila = _fila(paquete, hash_paquete="0" * 64)
    estado, d = job.desplegar(fila, paquete, runner, tmp_path / "sc.tar.gz")
    assert estado == "escalado" and d["fase"] == "G5"
    assert "bit a bit" in d["motivo"]
    assert runner.llamadas == []


def test_g5_paquete_alterado_escala_sin_tocar_la_red(paquete, tmp_path):
    (paquete / "chaincode" / "escrow.go").write_text("package sabotaje\n")
    runner = _RunnerEspia()
    estado, d = job.desplegar(_fila(paquete), paquete, runner, tmp_path / "sc.tar.gz")
    assert estado == "escalado" and d["fase"] == "G5"
    assert runner.llamadas == []


def test_sin_firma_del_testigo_no_hay_commit(paquete, tmp_path):
    runner = _RunnerEspia(fallar_en="approve-tg")
    estado, d = job.desplegar(_fila(paquete), paquete, runner, tmp_path / "sc.tar.gz")
    assert estado == "escalado" and d["fase"] == "approve-tg"
    assert "commit" not in [c[0] for c in runner.llamadas]


def test_secuencia_se_lee_de_la_fila_no_se_adivina(paquete, tmp_path):
    runner = _RunnerEspia()
    estado, d = job.desplegar(_fila(paquete, secuencia=4), paquete, runner,
                              tmp_path / "sc.tar.gz")
    assert estado == "desplegado"
    assert d["secuencia"] == 4 and d["version"] == "4.0"
    assert [c for c in runner.llamadas if c[0] == "approve-op"][0][2] == 4


def test_fila_no_aprobada_rechazo_del_job(paquete, monkeypatch, tmp_path):
    """La validación literal del PRP: intento sobre fila NO aprobada → rechazo."""
    monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "k")
    monkeypatch.setenv("WORKTREES_DIR", str(tmp_path))
    monkeypatch.setattr(job, "_http", lambda *a, **k: [_fila(paquete, estado="en_revision")])
    monkeypatch.setattr(sys, "argv", ["desplegar-chaincode.py", "--task", "t1"])
    with pytest.raises(SystemExit) as e:
        job.main()
    assert "RECHAZO" in str(e.value) and "en_revision" in str(e.value)
