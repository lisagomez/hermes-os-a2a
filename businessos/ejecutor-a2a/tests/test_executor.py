"""Tests del EjecutorA2A (Fase 2 del PRP-006), con MockEngine y dobles — cero red/tokens.

Cubren la validacion de la fase: worktree creado y aislado (nunca main), resultado
bien formado (diff real desde git, no testimonio), veredicto del Supervisor de vuelta
en el artifact, y TODO error (entrada, workspace, motor, supervisor) → tarea failed
con razon clara + transicion de estado correcta.
"""
from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path

import pytest

from a2a.helpers import get_data_parts, new_data_message, new_text_message
from a2a.server.agent_execution import RequestContext
from a2a.server.context import ServerCallContext
from a2a.types import (
    SendMessageRequest,
    Task,
    TaskArtifactUpdateEvent,
    TaskState,
    TaskStatusUpdateEvent,
)

from engine import MockEngine
from executor import EjecutorA2A
from supervisor_cliente import SupervisorError


# ---------- dobles ----------

class ColaEspia:
    def __init__(self) -> None:
        self.eventos: list = []

    async def enqueue_event(self, evento) -> None:
        self.eventos.append(evento)


class SupervisorFake:
    """Doble del cliente A2A al Supervisor: veredicto fijo o excepcion."""

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
    """Doble de EstadoTareas: registra transiciones sin tocar Supabase."""

    def __init__(self) -> None:
        self.transiciones: list[tuple[str, str]] = []
        self.ejecuciones: list[str] = []

    async def registrar_ejecucion(self, tarea: dict) -> None:
        self.ejecuciones.append(tarea["task_id"])

    async def transicionar(self, task_id: str, estado: str, **campos) -> None:
        self.transiciones.append((task_id, estado))


# ---------- fixtures / helpers ----------

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
        "objetivo": "crear el modulo x",
        "contexto": {"mock_cambios": {"src/x.ts": "export const x = 1\n"}},
        "criterios_aceptacion": ["build verde"],
        "limites": {"intentos_max": 3},
    }
    base.update(extra)
    return base


def contexto_con(mensaje) -> RequestContext:
    return RequestContext(
        ServerCallContext(),
        request=SendMessageRequest(message=mensaje),
        task_id="tarea-a2a-1",
        context_id="ctx-1",
    )


def ejecutor_con(repo: Path, tmp_path: Path, supervisor, estado=None) -> tuple[EjecutorA2A, EstadoEspia]:
    estado = estado or EstadoEspia()
    ej = EjecutorA2A(
        engine=MockEngine(),
        supervisor=supervisor,
        estado=estado,
        repo=repo,
        workspace_root=tmp_path / "espacio",
    )
    return ej, estado


def ejecutar(ejecutor: EjecutorA2A, mensaje) -> ColaEspia:
    cola = ColaEspia()
    asyncio.run(ejecutor.execute(contexto_con(mensaje), cola))
    return cola


def estados(cola: ColaEspia) -> list[int]:
    return [e.status.state for e in cola.eventos if isinstance(e, TaskStatusUpdateEvent)]


def artifacts(cola: ColaEspia) -> list:
    return [e.artifact for e in cola.eventos if isinstance(e, TaskArtifactUpdateEvent)]


def razon_de_fallo(cola: ColaEspia) -> str:
    fallos = [e for e in cola.eventos if isinstance(e, TaskStatusUpdateEvent)
              and e.status.state == TaskState.TASK_STATE_FAILED]
    assert fallos, "no hubo status FAILED"
    return fallos[-1].status.message.parts[0].text


def rama_de(directorio: Path) -> str:
    r = subprocess.run(
        ["git", "-C", str(directorio), "branch", "--show-current"],
        capture_output=True, text=True,
    )
    return r.stdout.strip()


# ---------- happy path ----------

def test_tarea_valida_entrega_resultado_y_veredicto(repo, tmp_path):
    supervisor = SupervisorFake(veredicto=VEREDICTO_APROBADO)
    ejecutor, estado = ejecutor_con(repo, tmp_path, supervisor)
    cola = ejecutar(ejecutor, new_data_message(tarea_valida()))

    # Gotcha SDK v1: el Task va encolado ANTES del primer status update.
    assert isinstance(cola.eventos[0], Task)
    assert estados(cola)[-1] == TaskState.TASK_STATE_COMPLETED

    [artifact] = artifacts(cola)
    assert artifact.name == "resultado-revisado"
    [entregado] = get_data_parts(artifact.parts)
    resultado, veredicto = entregado["resultado"], entregado["veredicto"]

    # Resultado bien formado: diff REAL desde git, no testimonio del motor.
    assert resultado["task_id"] == "t-100"
    assert resultado["departamento"] == "software"  # el Supervisor rutea por esto (Fase 9)
    assert resultado["worktree"] == "worktree/t-100"
    assert "export const x = 1" in resultado["diff"]
    assert resultado["archivos"] == ["src/x.ts"]
    assert resultado["artefactos"]["engine"] == "mock"

    # El veredicto vuelve integro (gates con evidencia).
    assert veredicto["veredicto"] == "aprobado"
    assert veredicto["gates"][0]["evidencia"] == "npm run build → exit 0"

    # El Supervisor recibio ESE resultado, no otra cosa.
    assert supervisor.resultados_recibidos[0]["task_id"] == "t-100"

    # Trazabilidad: en_ejecucion → en_revision → aprobada.
    assert estado.ejecuciones == ["t-100"]
    assert estado.transiciones == [("t-100", "en_revision"), ("t-100", "aprobada")]


def test_worktree_aislado_nunca_main(repo, tmp_path):
    ejecutor, _ = ejecutor_con(repo, tmp_path, SupervisorFake(veredicto=VEREDICTO_APROBADO))
    ejecutar(ejecutor, new_data_message(tarea_valida("t-101")))

    wt = tmp_path / "espacio" / "worktree" / "t-101"
    assert wt.is_dir()
    assert rama_de(wt) == "tarea/t-101"
    assert rama_de(repo) == "main"  # el repo base no se mueve
    assert not (repo / "src" / "x.ts").exists()  # el cambio vive SOLO en el worktree


def test_rechazo_del_supervisor_completa_con_veredicto_rechazado(repo, tmp_path):
    """Un rechazo NO es un fallo A2A: es un veredicto que Hermes usa para reintentar."""
    ejecutor, estado = ejecutor_con(repo, tmp_path, SupervisorFake(veredicto=VEREDICTO_RECHAZADO))
    cola = ejecutar(ejecutor, new_data_message(tarea_valida("t-102")))

    assert estados(cola)[-1] == TaskState.TASK_STATE_COMPLETED
    [entregado] = get_data_parts(artifacts(cola)[0].parts)
    assert entregado["veredicto"]["veredicto"] == "rechazado"
    assert entregado["veredicto"]["hallazgos"][0]["regla"] == "tests_verdes"
    assert estado.transiciones[-1] == ("t-102", "rechazada")


# ---------- errores → failed con razon clara ----------

def test_mensaje_sin_datapart_falla_sin_tocar_nada(repo, tmp_path):
    supervisor = SupervisorFake(veredicto=VEREDICTO_APROBADO)
    ejecutor, estado = ejecutor_con(repo, tmp_path, supervisor)
    cola = ejecutar(ejecutor, new_text_message("hazme un login"))

    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert "tarea invalida" in razon_de_fallo(cola)
    assert supervisor.resultados_recibidos == []
    assert estado.ejecuciones == []  # ni se registro ejecucion
    assert not (tmp_path / "espacio").exists()  # ni se toco el workspace


def test_dos_dataparts_falla(repo, tmp_path):
    m = new_data_message(tarea_valida("t-103"))
    m.parts.append(new_data_message(tarea_valida("t-104")).parts[0])
    ejecutor, _ = ejecutor_con(repo, tmp_path, SupervisorFake(veredicto=VEREDICTO_APROBADO))
    cola = ejecutar(ejecutor, m)

    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert "UNA tarea por mensaje" in razon_de_fallo(cola)


def test_tarea_sin_criterios_falla_con_razon_del_contrato(repo, tmp_path):
    tarea = tarea_valida("t-105")
    del tarea["criterios_aceptacion"]
    ejecutor, _ = ejecutor_con(repo, tmp_path, SupervisorFake(veredicto=VEREDICTO_APROBADO))
    cola = ejecutar(ejecutor, new_data_message(tarea))

    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert "criterios_aceptacion" in razon_de_fallo(cola)


def test_workspace_roto_falla_y_escala(tmp_path):
    ejecutor, estado = ejecutor_con(
        tmp_path / "repo-que-no-existe", tmp_path, SupervisorFake(veredicto=VEREDICTO_APROBADO)
    )
    cola = ejecutar(ejecutor, new_data_message(tarea_valida("t-106")))

    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert "workspace:" in razon_de_fallo(cola)
    assert estado.transiciones == [("t-106", "escalada")]


def test_motor_que_truena_falla_y_escala(repo, tmp_path):
    tarea = tarea_valida("t-107", contexto={"mock_falla": "presupuesto agotado"})
    supervisor = SupervisorFake(veredicto=VEREDICTO_APROBADO)
    ejecutor, estado = ejecutor_con(repo, tmp_path, supervisor)
    cola = ejecutar(ejecutor, new_data_message(tarea))

    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert "motor: presupuesto agotado" in razon_de_fallo(cola)
    assert estado.transiciones == [("t-107", "escalada")]
    assert supervisor.resultados_recibidos == []  # sin resultado no hay revision


def test_supervisor_caido_falla_con_razon(repo, tmp_path):
    ejecutor, estado = ejecutor_con(
        repo, tmp_path, SupervisorFake(error=SupervisorError("supervisor no disponible"))
    )
    cola = ejecutar(ejecutor, new_data_message(tarea_valida("t-108")))

    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert "supervisor: supervisor no disponible" in razon_de_fallo(cola)
    # Llego a en_revision; el veredicto nunca llego, no hay aprobada/rechazada.
    assert estado.transiciones == [("t-108", "en_revision")]


def test_veredicto_contradictorio_no_se_acepta(repo, tmp_path):
    """Anti-sello-de-goma end-to-end: aprobado con gate en fallo = payload invalido."""
    contradictorio = {
        "veredicto": "aprobado",
        "gates": [{"regla": "tests", "estado": "fallo", "evidencia": "1 failed"}],
        "hallazgos": [],
    }
    ejecutor, _ = ejecutor_con(repo, tmp_path, SupervisorFake(veredicto=contradictorio))
    cola = ejecutar(ejecutor, new_data_message(tarea_valida("t-109")))

    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert "veredicto del supervisor invalido" in razon_de_fallo(cola)
    assert artifacts(cola) == []  # nada contradictorio sale del Ejecutor
