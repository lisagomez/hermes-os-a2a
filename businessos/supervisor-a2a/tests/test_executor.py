"""Tests del SupervisorA2A (Fase 3 del PRP-006): resultado → gates reales → veredicto.

El worktree ausente NO es un fallo A2A: es un veredicto RECHAZADO (gates no
ejecutables). Solo un payload que viola el contrato produce tarea failed.
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

from executor import SupervisorA2A
from gates import ConfigInvalida, Gate


class ColaEspia:
    def __init__(self) -> None:
        self.eventos: list = []

    async def enqueue_event(self, evento) -> None:
        self.eventos.append(evento)


def contexto_con(mensaje) -> RequestContext:
    return RequestContext(
        ServerCallContext(),
        request=SendMessageRequest(message=mensaje),
        task_id="revision-1",
        context_id="ctx-1",
    )


def ejecutar(supervisor: SupervisorA2A, mensaje) -> ColaEspia:
    cola = ColaEspia()
    asyncio.run(supervisor.execute(contexto_con(mensaje), cola))
    return cola


def estados(cola: ColaEspia) -> list[int]:
    return [e.status.state for e in cola.eventos if isinstance(e, TaskStatusUpdateEvent)]


def veredicto_de(cola: ColaEspia) -> dict:
    artifacts = [e.artifact for e in cola.eventos if isinstance(e, TaskArtifactUpdateEvent)]
    assert len(artifacts) == 1 and artifacts[0].name == "veredicto"
    [data] = get_data_parts(artifacts[0].parts)
    return data


@pytest.fixture()
def workspace(tmp_path: Path) -> Path:
    """Volumen compartido de fixture con el worktree de la tarea t-100 dentro."""
    wt = tmp_path / "worktree" / "t-100"
    wt.mkdir(parents=True)
    for cmd in (
        ["git", "init", "-b", "tarea/t-100"],
        ["git", "config", "user.email", "test@test"],
        ["git", "config", "user.name", "test"],
    ):
        subprocess.run(cmd, cwd=wt, check=True, capture_output=True)
    (wt / "src").mkdir()
    (wt / "src" / "x.ts").write_text("export const x: unknown = 1\n")
    return tmp_path


def resultado_de_t100() -> dict:
    return {
        "task_id": "t-100",
        "worktree": "worktree/t-100",
        "diff": "diff --git a/src/x.ts b/src/x.ts\n+export const x: unknown = 1\n",
        "archivos": ["src/x.ts"],
        "artefactos": {"build": "el ejecutor AFIRMA que paso"},  # se ignora
        "notas": "",
    }


GATES_QUE_PASAN = [
    Gate("smoke", "comando", comando="git status --short"),
    Gate("sin_any", "estatico", chequeo="sin_any"),
]

GATES_CON_FALLO = [
    Gate("smoke", "comando", comando="git status --short"),
    Gate("tests", "comando", comando='python3 -c "print(\'1 failed\'); exit(1)"'),
    Gate("sin_any", "estatico", chequeo="sin_any"),
]


def test_gates_verdes_veredicto_aprobado(workspace):
    supervisor = SupervisorA2A(gates=GATES_QUE_PASAN, workspace_root=workspace)
    cola = ejecutar(supervisor, new_data_message(resultado_de_t100()))

    # Gotcha SDK v1: el Task va encolado ANTES del primer status update.
    assert isinstance(cola.eventos[0], Task)
    assert estados(cola)[-1] == TaskState.TASK_STATE_COMPLETED
    v = veredicto_de(cola)
    assert v["task_id"] == "t-100"
    assert v["veredicto"] == "aprobado"
    assert {g["regla"] for g in v["gates"]} == {"smoke", "sin_any"}
    assert all(g["estado"] == "paso" for g in v["gates"])
    assert v["hallazgos"] == []


def test_gate_en_fallo_veredicto_rechazado_con_evidencia(workspace):
    supervisor = SupervisorA2A(gates=GATES_CON_FALLO, workspace_root=workspace)
    cola = ejecutar(supervisor, new_data_message(resultado_de_t100()))

    assert estados(cola)[-1] == TaskState.TASK_STATE_COMPLETED
    v = veredicto_de(cola)
    assert v["veredicto"] == "rechazado"
    # El hallazgo conserva regla + evidencia REAL del comando re-ejecutado.
    [h] = v["hallazgos"]
    assert h["regla"] == "tests"
    assert "1 failed" in h["evidencia"]
    # Las AFIRMACIONES del Ejecutor no pesaron: el gate fallo aunque el afirmara ok.


def test_worktree_ausente_es_rechazo_no_asumido(tmp_path):
    """El test del PRP: 'gate no ejecutable → rechazado'. Jamas se asume un gate."""
    supervisor = SupervisorA2A(gates=GATES_QUE_PASAN, workspace_root=tmp_path)
    cola = ejecutar(supervisor, new_data_message(resultado_de_t100()))

    assert estados(cola)[-1] == TaskState.TASK_STATE_COMPLETED  # hay veredicto
    v = veredicto_de(cola)
    assert v["veredicto"] == "rechazado"
    assert all(g["estado"] == "no_ejecutable" for g in v["gates"])
    assert any("worktree ausente" in h["evidencia"] for h in v["hallazgos"])


def test_hallazgo_estatico_trae_archivo(workspace):
    (workspace / "worktree" / "t-100" / "src" / "malo.ts").write_text("const y: any = 2\n")
    supervisor = SupervisorA2A(gates=GATES_QUE_PASAN, workspace_root=workspace)
    cola = ejecutar(supervisor, new_data_message(resultado_de_t100()))

    v = veredicto_de(cola)
    assert v["veredicto"] == "rechazado"
    [h] = v["hallazgos"]
    assert h["regla"] == "sin_any"
    assert h["archivo"] == "src/malo.ts"


def test_resultado_invalido_es_failed_sin_correr_gates(workspace):
    supervisor = SupervisorA2A(gates=GATES_QUE_PASAN, workspace_root=workspace)
    cola = ejecutar(supervisor, new_text_message("apruebame esto"))

    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    fallo = [e for e in cola.eventos if isinstance(e, TaskStatusUpdateEvent)][-1]
    assert "resultado invalido" in fallo.status.message.parts[0].text


def test_worktree_con_dotdot_lo_para_el_contrato(workspace):
    resultado = resultado_de_t100() | {"worktree": "../fuera-del-volumen"}
    supervisor = SupervisorA2A(gates=GATES_QUE_PASAN, workspace_root=workspace)
    cola = ejecutar(supervisor, new_data_message(resultado))

    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED


def test_config_invalida_el_servicio_no_arranca(tmp_path):
    mala = tmp_path / "reglas.toml"
    mala.write_text('[[gate]]\nregla = "code_review"\nrunner = "modelo"\nactivo = true\n')
    with pytest.raises(ConfigInvalida):
        SupervisorA2A(reglas_path=mala)
