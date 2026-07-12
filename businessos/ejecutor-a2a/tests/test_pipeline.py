"""Tests del Pipeline (PRP-010): lo que se le HACE a una tarea ya reclamada de la cola.

Es el contenido que antes vivia en test_executor.py (cuando `execute` construia). Sigue
cubriendo lo mismo — worktree aislado (nunca main), diff REAL desde git (no testimonio),
veredicto del Supervisor, y todo error con razon clara — pero ya sin A2A de por medio: el
worker lo llama sin que nadie escuche por HTTP.
"""
from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path

import pytest

from engine import MockEngine
from pipeline import Pipeline, PipelineError
from supervisor_cliente import SupervisorError


# ---------- dobles ----------

class SupervisorFake:
    def __init__(self, veredicto=None, error: Exception | None = None) -> None:
        self._veredicto = veredicto
        self._error = error
        self.resultados_recibidos: list[dict] = []

    async def evaluar(self, resultado: dict) -> dict:
        self.resultados_recibidos.append(resultado)
        if self._error is not None:
            raise self._error
        v = dict(self._veredicto)
        v.setdefault("task_id", resultado["task_id"])
        return v


class EstadoEspia:
    def __init__(self) -> None:
        self.transiciones: list[tuple[str, str]] = []

    async def transicionar(self, task_id: str, estado: str, **campos) -> None:
        self.transiciones.append((task_id, estado))


VEREDICTO_APROBADO = {
    "veredicto": "aprobado",
    "gates": [{"regla": "build", "estado": "paso", "evidencia": "npm run build → exit 0"}],
    "hallazgos": [],
}

VEREDICTO_RECHAZADO = {
    "veredicto": "rechazado",
    "gates": [{"regla": "tests", "estado": "fallo", "evidencia": "1 failed: callback OAuth 500"}],
    "hallazgos": [
        {"regla": "tests_verdes", "evidencia": "callback OAuth 500", "archivo": "src/auth.ts"}
    ],
}


@pytest.fixture()
def repo(tmp_path: Path) -> Path:
    r = tmp_path / "repo"
    r.mkdir()
    for cmd in (
        ["git", "init", "-b", "main"],
        ["git", "config", "user.email", "test@test"],
        ["git", "config", "user.name", "test"],
    ):
        subprocess.run(cmd, cwd=r, check=True, capture_output=True)
    (r / "README.md").write_text("hola\n")
    subprocess.run(["git", "add", "-A"], cwd=r, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "init"], cwd=r, check=True, capture_output=True)
    return r


def tarea_valida(task_id: str = "t-100", **extra) -> dict:
    base = {
        "task_id": task_id,
        "departamento": "software",
        "objetivo": "crear el modulo x",
        "contexto": {"mock_cambios": {"src/x.ts": "export const x = 1\n"}},
        "criterios_aceptacion": ["build verde"],
        "limites": {"intentos_max": 3},
        "observaciones": [],
    }
    base.update(extra)
    return base


def pipeline_con(repo: Path, tmp_path: Path, supervisor, engine=None):
    estado = EstadoEspia()
    p = Pipeline(
        engine=engine or MockEngine(),
        supervisor=supervisor,
        estado=estado,
        repo=repo,
        workspace_root=tmp_path / "espacio",
    )
    return p, estado


def rama_de(directorio: Path) -> str:
    r = subprocess.run(["git", "-C", str(directorio), "branch", "--show-current"],
                       capture_output=True, text=True)
    return r.stdout.strip()


# ---------- happy path ----------

def test_tarea_entrega_resultado_y_veredicto(repo, tmp_path):
    supervisor = SupervisorFake(veredicto=VEREDICTO_APROBADO)
    p, estado = pipeline_con(repo, tmp_path, supervisor)
    salida = asyncio.run(p.procesar(tarea_valida()))

    resultado, veredicto = salida["resultado"], salida["veredicto"]
    # Diff REAL desde git, no testimonio del motor.
    assert resultado["task_id"] == "t-100"
    assert resultado["worktree"] == "worktree/t-100"
    assert "export const x = 1" in resultado["diff"]
    assert resultado["archivos"] == ["src/x.ts"]
    assert veredicto["veredicto"] == "aprobado"
    assert supervisor.resultados_recibidos[0]["task_id"] == "t-100"
    # La fila ya venia en `en_ejecucion` (la reclamo el worker): de aqui en adelante.
    assert estado.transiciones == [("t-100", "en_revision"), ("t-100", "aprobada")]


def test_worktree_aislado_nunca_main(repo, tmp_path):
    p, _ = pipeline_con(repo, tmp_path, SupervisorFake(veredicto=VEREDICTO_APROBADO))
    asyncio.run(p.procesar(tarea_valida("t-101")))

    wt = tmp_path / "espacio" / "worktree" / "t-101"
    assert wt.is_dir()
    assert rama_de(wt) == "tarea/t-101"
    assert rama_de(repo) == "main"  # el repo base no se mueve
    assert not (repo / "src" / "x.ts").exists()  # el cambio vive SOLO en el worktree


def test_rechazo_no_es_fallo_es_veredicto(repo, tmp_path):
    p, estado = pipeline_con(repo, tmp_path, SupervisorFake(veredicto=VEREDICTO_RECHAZADO))
    salida = asyncio.run(p.procesar(tarea_valida("t-102")))

    assert salida["veredicto"]["veredicto"] == "rechazado"
    assert salida["veredicto"]["hallazgos"][0]["regla"] == "tests_verdes"
    assert estado.transiciones[-1] == ("t-102", "rechazada")


# ---------- errores: razon clara y quien escala ----------

def test_workspace_roto_escala(tmp_path):
    p, _ = pipeline_con(tmp_path / "repo-que-no-existe", tmp_path,
                        SupervisorFake(veredicto=VEREDICTO_APROBADO))
    with pytest.raises(PipelineError) as e:
        asyncio.run(p.procesar(tarea_valida("t-106")))
    assert "workspace:" in e.value.razon
    assert e.value.escalar is True


def test_motor_que_truena_escala(repo, tmp_path):
    supervisor = SupervisorFake(veredicto=VEREDICTO_APROBADO)
    p, _ = pipeline_con(repo, tmp_path, supervisor)
    tarea = tarea_valida("t-107", contexto={"mock_falla": "presupuesto agotado"})

    with pytest.raises(PipelineError) as e:
        asyncio.run(p.procesar(tarea))
    assert "motor: presupuesto agotado" in e.value.razon
    assert e.value.escalar is True
    assert supervisor.resultados_recibidos == []  # sin resultado no hay revision


def test_supervisor_caido_NO_escala_la_tarea(repo, tmp_path):
    """El Supervisor caido no es culpa de la tarea: se reintenta, no se escala a Elisa."""
    p, estado = pipeline_con(repo, tmp_path,
                             SupervisorFake(error=SupervisorError("supervisor no disponible")))
    with pytest.raises(PipelineError) as e:
        asyncio.run(p.procesar(tarea_valida("t-108")))

    assert "supervisor: supervisor no disponible" in e.value.razon
    assert e.value.escalar is False
    assert estado.transiciones == [("t-108", "en_revision")]


def test_veredicto_contradictorio_no_se_acepta(repo, tmp_path):
    """Anti-sello-de-goma: aprobado con un gate en fallo = payload invalido."""
    contradictorio = {
        "veredicto": "aprobado",
        "gates": [{"regla": "tests", "estado": "fallo", "evidencia": "1 failed"}],
        "hallazgos": [],
    }
    p, _ = pipeline_con(repo, tmp_path, SupervisorFake(veredicto=contradictorio))
    with pytest.raises(PipelineError) as e:
        asyncio.run(p.procesar(tarea_valida("t-109")))
    assert "veredicto del supervisor invalido" in e.value.razon
