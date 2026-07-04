"""Interop end-to-end del trio (Fase 6 del PRP-006) — cero red, cero tokens.

El lazo COMPLETO de la SPEC §7.5 con los DOS servicios reales in-process
(httpx.ASGITransport) y un cliente del SDK haciendo de Hermes:

  TAREA (codigo con `any`) → Ejecutor (MockEngine) → Supervisor re-ejecuta gates
  reales sobre el worktree → RECHAZADO con hallazgo → Hermes reenvia con
  observaciones (mismo task_id) → correccion → APROBADO → transiciones correctas.

Este test caza el gotcha del SDK que la cola espia NO caza (`new_task` antes del
primer status update) en AMBOS servicios, porque el cliente real del SDK valida
la secuencia de eventos.
"""
from __future__ import annotations

import asyncio
import importlib
import subprocess
import sys
from pathlib import Path

import httpx
import pytest

from a2a.client import A2ACardResolver, ClientConfig, ClientFactory
from a2a.helpers import get_data_parts, new_data_message
from a2a.types import SendMessageRequest, TaskState

from app import build_app
from engine import MockEngine
from executor import EjecutorA2A
from supervisor_cliente import SupervisorCliente

SUPERVISOR_DIR = Path(__file__).resolve().parent.parent.parent / "supervisor-a2a"


@pytest.fixture(scope="module")
def supervisor_mod():
    """Importa los modulos del supervisor-a2a aislando los nombres que chocan
    (app/card/executor existen en ambos servicios)."""
    clashes = ("app", "card", "executor")
    originales = {m: sys.modules.pop(m) for m in clashes if m in sys.modules}
    sys.path.insert(0, str(SUPERVISOR_DIR))
    try:
        mods = {}
        for nombre in ("gates", "veredicto", "card", "executor", "app"):
            sys.modules.pop(nombre, None) if nombre in clashes else None
            mods[nombre] = importlib.import_module(nombre)
            assert Path(mods[nombre].__file__).parent == SUPERVISOR_DIR, nombre
        return mods
    finally:
        sys.path.remove(str(SUPERVISOR_DIR))
        for m in clashes:
            sys.modules.pop(m, None)
        sys.modules.update(originales)


class EstadoEspia:
    def __init__(self) -> None:
        self.transiciones: list[tuple[str, str]] = []
        self.ejecuciones: list[str] = []

    async def registrar_ejecucion(self, tarea: dict) -> None:
        self.ejecuciones.append(tarea["task_id"])

    async def transicionar(self, task_id: str, estado: str, **campos) -> None:
        self.transiciones.append((task_id, estado))


def crear_repo(base: Path) -> Path:
    repo = base / "repo"
    repo.mkdir(parents=True)
    for cmd in (
        ["git", "init", "-b", "main"],
        ["git", "config", "user.email", "trio@test"],
        ["git", "config", "user.name", "trio"],
    ):
        subprocess.run(cmd, cwd=repo, check=True, capture_output=True)
    (repo / "README.md").write_text("app\n")
    subprocess.run(["git", "add", "-A"], cwd=repo, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "init"], cwd=repo, check=True, capture_output=True)
    return repo


def test_lazo_completo_rechazo_reintento_aprobado(supervisor_mod, tmp_path):
    repo = crear_repo(tmp_path)
    workspace = tmp_path / "espacio"
    estado = EstadoEspia()

    # Supervisor REAL con gates reales (estatico + comando) sobre el volumen compartido.
    Gate = supervisor_mod["gates"].Gate
    supervisor_app = supervisor_mod["app"].build_app(
        executor=supervisor_mod["executor"].SupervisorA2A(
            gates=[
                Gate("sin_any", "estatico", chequeo="sin_any"),
                Gate("smoke", "comando", comando="git status --short"),
            ],
            workspace_root=workspace,
        )
    )

    async def lazo():
        # Ejecutor→Supervisor: cliente A2A real del Ejecutor sobre ASGITransport.
        puente = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=supervisor_app), timeout=30
        )
        ejecutor_app = build_app(
            executor=EjecutorA2A(
                engine=MockEngine(),
                supervisor=SupervisorCliente(
                    base_url="http://supervisor-a2a:4200", http_client=puente
                ),
                estado=estado,
                repo=repo,
                workspace_root=workspace,
            )
        )

        # Hermes (cliente del SDK): descubre al Ejecutor por su card, como un tercero.
        http = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=ejecutor_app),
            base_url="http://ejecutor-a2a:4100",
            timeout=30,
        )
        card = await A2ACardResolver(http, "http://ejecutor-a2a:4100").get_agent_card()
        assert card.skills[0].id == "construir-software"
        cliente = ClientFactory(ClientConfig(httpx_client=http, streaming=False)).create(card)

        async def enviar(tarea: dict):
            final = None
            async for r in cliente.send_message(
                SendMessageRequest(message=new_data_message(tarea))
            ):
                if r.HasField("task"):
                    final = r.task
            assert final is not None, "el cliente del SDK no recibio tarea"
            return final

        # --- intento 1: el "codigo" trae `any` → un gate real lo caza ---
        tarea = {
            "task_id": "trio-e2e-1",
            "objetivo": "modulo x sin any",
            "contexto": {"mock_cambios": {"src/x.ts": "export const x: any = 1\n"}},
            "criterios_aceptacion": ["sin any"],
            "limites": {"intentos_max": 3},
        }
        t1 = await enviar(tarea)
        assert t1.status.state == TaskState.TASK_STATE_COMPLETED
        [e1] = get_data_parts(t1.artifacts[0].parts)
        assert e1["veredicto"]["veredicto"] == "rechazado"
        hallazgos = e1["veredicto"]["hallazgos"]
        assert hallazgos and hallazgos[0]["regla"] == "sin_any"
        assert hallazgos[0]["archivo"] == "src/x.ts"

        # --- intento 2 (Hermes): observaciones del rechazo, MISMO task_id ---
        tarea_reintento = {
            **tarea,
            "observaciones": [
                f"{h['regla']}: {h['evidencia']} ({h.get('archivo', '?')})" for h in hallazgos
            ],
            "contexto": {
                "mock_correccion": {"src/x.ts": "export const x: unknown = 1\n"}
            },
        }
        t2 = await enviar(tarea_reintento)
        assert t2.status.state == TaskState.TASK_STATE_COMPLETED
        [e2] = get_data_parts(t2.artifacts[0].parts)
        assert e2["veredicto"]["veredicto"] == "aprobado"
        assert all(g["estado"] == "paso" for g in e2["veredicto"]["gates"])
        assert e2["resultado"]["archivos"] == ["src/x.ts"]
        assert "unknown" in e2["resultado"]["diff"]

        await http.aclose()
        await puente.aclose()

    asyncio.run(lazo())

    # Trazabilidad completa del lazo en `tareas` (espia): dos ejecuciones,
    # rechazo del intento 1, aprobacion del intento 2.
    assert estado.ejecuciones == ["trio-e2e-1", "trio-e2e-1"]
    assert estado.transiciones == [
        ("trio-e2e-1", "en_revision"),
        ("trio-e2e-1", "rechazada"),
        ("trio-e2e-1", "en_revision"),
        ("trio-e2e-1", "aprobada"),
    ]

    # El worktree quedo en la rama de la tarea; el repo base jamas se movio.
    rama = subprocess.run(
        ["git", "-C", str(repo), "branch", "--show-current"],
        capture_output=True, text=True,
    ).stdout.strip()
    assert rama == "main"
    assert not (repo / "src").exists()


def test_worktree_ausente_a_traves_del_protocolo_es_rechazo(supervisor_mod, tmp_path):
    """Anti-sello-de-goma por el lazo completo: si el Supervisor no ve el worktree
    (volumen mal montado), el veredicto que llega es RECHAZADO, no un fallo mudo."""
    repo = crear_repo(tmp_path)
    Gate = supervisor_mod["gates"].Gate
    supervisor_app = supervisor_mod["app"].build_app(
        executor=supervisor_mod["executor"].SupervisorA2A(
            gates=[Gate("smoke", "comando", comando="git status --short")],
            workspace_root=tmp_path / "OTRO-volumen",  # el supervisor mira otro lado
        )
    )

    async def flujo():
        puente = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=supervisor_app), timeout=30
        )
        ejecutor_app = build_app(
            executor=EjecutorA2A(
                engine=MockEngine(),
                supervisor=SupervisorCliente(
                    base_url="http://supervisor-a2a:4200", http_client=puente
                ),
                estado=EstadoEspia(),
                repo=repo,
                workspace_root=tmp_path / "espacio",
            )
        )
        http = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=ejecutor_app),
            base_url="http://ejecutor-a2a:4100",
            timeout=30,
        )
        card = await A2ACardResolver(http, "http://ejecutor-a2a:4100").get_agent_card()
        cliente = ClientFactory(ClientConfig(httpx_client=http, streaming=False)).create(card)
        final = None
        async for r in cliente.send_message(
            SendMessageRequest(
                message=new_data_message({
                    "task_id": "trio-e2e-2",
                    "objetivo": "cualquier cosa",
                    "contexto": {"mock_cambios": {"a.txt": "a"}},
                    "criterios_aceptacion": ["x"],
                    "limites": {"intentos_max": 1},
                })
            )
        ):
            if r.HasField("task"):
                final = r.task
        await http.aclose()
        await puente.aclose()
        return final

    tarea = asyncio.run(flujo())
    assert tarea.status.state == TaskState.TASK_STATE_COMPLETED
    [entregado] = get_data_parts(tarea.artifacts[0].parts)
    assert entregado["veredicto"]["veredicto"] == "rechazado"
    assert any("worktree ausente" in h["evidencia"] for h in entregado["veredicto"]["hallazgos"])
