"""Interop end-to-end del trio CON COLA (PRP-010) — cero red, cero tokens.

El lazo COMPLETO con los DOS servicios reales in-process (httpx.ASGITransport) y un cliente
del SDK haciendo de Hermes. Lo que cambia respecto a la Fase 6: la respuesta A2A ya no trae
el veredicto, trae la POSICION EN LA COLA. El veredicto lo produce el WORKER, despues:

  TAREA (codigo con `any`) → Ejecutor ENCOLA (responde posicion 1)
    → worker drena → Supervisor re-ejecuta gates REALES sobre el worktree → RECHAZADO
    → Hermes reenvia con observaciones (mismo task_id) → se re-encola AL FINAL
    → worker drena → APROBADO → transiciones correctas.

Este test sigue cazando el gotcha del SDK que la cola espia NO caza (`new_task` antes del
primer status update), porque el cliente real del SDK valida la secuencia de eventos.
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
from cola import ColaMemoria
from engine import MockEngine
from executor import EjecutorA2A
from pipeline import Pipeline
from supervisor_cliente import SupervisorCliente
from worker import Worker

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
    """Guarda tambien los CAMPOS: con la cola, el veredicto ya no vuelve por A2A — la unica
    forma de verlo es donde de verdad queda (la fila de `tareas`)."""

    def __init__(self) -> None:
        self.transiciones: list[tuple[str, str]] = []
        self.veredictos: list[dict] = []
        self.resultados: list[dict] = []

    async def transicionar(self, task_id: str, estado: str, **campos) -> None:
        self.transiciones.append((task_id, estado))
        if "veredicto" in campos:
            self.veredictos.append(campos["veredicto"])
        if "resultado" in campos:
            self.resultados.append(campos["resultado"])


class SinTope:
    async def hay_margen(self):
        return True, "test"


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


def montar(supervisor_mod, repo: Path, workspace: Path, estado, gates):
    """Los dos servicios reales + la cola compartida entre el Ejecutor (encola) y el
    worker (drena) — que es exactamente como viven en runtime."""
    Gate = supervisor_mod["gates"].Gate
    supervisor_app = supervisor_mod["app"].build_app(
        executor=supervisor_mod["executor"].SupervisorA2A(
            gates=gates(Gate), workspace_root=workspace
        )
    )
    puente = httpx.AsyncClient(transport=httpx.ASGITransport(app=supervisor_app), timeout=30)
    cola = ColaMemoria()
    # worker=None: en los tests el drenado se dispara a mano (`un_ciclo`), para poder
    # observar cada paso; en runtime lo arranca el lifespan.
    ejecutor_app = build_app(executor=EjecutorA2A(cola=cola), worker=None)
    worker = Worker(
        cola=cola,
        pipeline=Pipeline(
            engine=MockEngine(),
            supervisor=SupervisorCliente(base_url="http://supervisor-a2a:4200",
                                         http_client=puente),
            estado=estado,
            repo=repo,
            workspace_root=workspace,
        ),
        estado=estado,
        presupuesto=SinTope(),
        repo=repo,
        pausa_s=0.001,
    )
    return ejecutor_app, worker, puente


def test_lazo_completo_encolar_rechazo_reintento_aprobado(supervisor_mod, tmp_path):
    repo = crear_repo(tmp_path)
    workspace = tmp_path / "espacio"
    estado = EstadoEspia()

    ejecutor_app, worker, puente = montar(
        supervisor_mod, repo, workspace, estado,
        gates=lambda Gate: [
            Gate("sin_any", "estatico", chequeo="sin_any"),
            Gate("smoke", "comando", comando="git status --short"),
        ],
    )

    async def lazo():
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

        # --- se encola: respuesta INMEDIATA, sin veredicto (esa es la promesa nueva) ---
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
        assert e1 == {
            "encolada": True, "task_id": "trio-e2e-1", "posicion": 1,
            "en_ejecucion": None,
            "cola": [{"pos": 1, "task_id": "trio-e2e-1", "objetivo": "modulo x sin any",
                      "prioridad": 0}],
        }
        assert "veredicto" not in e1  # el veredicto NO vuelve por aqui: llega despues

        # --- el worker drena: el Supervisor REAL caza el `any` sobre el worktree ---
        assert await worker.un_ciclo() is True
        assert estado.transiciones[-1] == ("trio-e2e-1", "rechazada")
        hallazgos = estado.veredictos[-1]["hallazgos"]
        assert hallazgos and hallazgos[0]["regla"] == "sin_any"
        assert hallazgos[0]["archivo"] == "src/x.ts"

        # --- reintento de Hermes: mismo task_id, con observaciones → se re-encola ---
        t2 = await enviar({
            **tarea,
            "observaciones": [
                f"{h['regla']}: {h['evidencia']} ({h.get('archivo', '?')})" for h in hallazgos
            ],
            "contexto": {"mock_correccion": {"src/x.ts": "export const x: unknown = 1\n"}},
        })
        [e2] = get_data_parts(t2.artifacts[0].parts)
        assert e2["encolada"] is True and e2["posicion"] == 1

        assert await worker.un_ciclo() is True
        assert estado.transiciones[-1] == ("trio-e2e-1", "aprobada")
        veredicto = estado.veredictos[-1]
        assert veredicto["veredicto"] == "aprobado"
        assert all(g["estado"] == "paso" for g in veredicto["gates"])
        assert estado.resultados[-1]["archivos"] == ["src/x.ts"]
        assert "unknown" in estado.resultados[-1]["diff"]

        await http.aclose()
        await puente.aclose()

    asyncio.run(lazo())

    # Trazabilidad del lazo: dos vueltas por revision, rechazo y luego aprobacion.
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
    (volumen mal montado), el veredicto que queda es RECHAZADO, no un fallo mudo."""
    repo = crear_repo(tmp_path)
    estado = EstadoEspia()
    ejecutor_app, worker, puente = montar(
        supervisor_mod, repo, tmp_path / "OTRO-volumen", estado,  # el supervisor mira otro lado
        gates=lambda Gate: [Gate("smoke", "comando", comando="git status --short")],
    )
    # OJO: el worker prepara el worktree en SU workspace; el Supervisor mira otro. Por eso
    # el pipeline del worker usa el workspace bueno y el Supervisor el malo:
    worker._pipeline._workspace_root = tmp_path / "espacio"

    async def flujo():
        http = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=ejecutor_app),
            base_url="http://ejecutor-a2a:4100",
            timeout=30,
        )
        card = await A2ACardResolver(http, "http://ejecutor-a2a:4100").get_agent_card()
        cliente = ClientFactory(ClientConfig(httpx_client=http, streaming=False)).create(card)
        async for _ in cliente.send_message(
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
            pass
        await worker.un_ciclo()
        await http.aclose()
        await puente.aclose()

    asyncio.run(flujo())

    assert estado.transiciones[-1] == ("trio-e2e-2", "rechazada")
    veredicto = estado.veredictos[-1]
    assert veredicto["veredicto"] == "rechazado"
    assert any("worktree ausente" in h["evidencia"] for h in veredicto["hallazgos"])
