"""pipeline.py — lo que se le HACE a una tarea (PRP-010): worktree → motor → Supervisor.

Antes vivia dentro de `executor.py::execute`, atado a la conexion HTTP del que pedia. Con
la cola se separa: `execute` solo ENCOLA (rapido), y esto lo ejecuta el WORKER minutos
despues, sin nadie escuchando. Por eso el pipeline no sabe nada de A2A (ni updater, ni
event_queue): recibe una tarea, la trabaja y devuelve resultado+veredicto (o falla con
razon clara). Quien avisa al equipo es el host-job, no una respuesta HTTP.

Fronteras (SPEC-trio §2), intactas: no decide QUE hacer, no se auto-aprueba.
"""
from __future__ import annotations

from pathlib import Path

import workspace as ws
from contrato import ContratoInvalido, validar_resultado, validar_veredicto
from engine import EngineError
from supervisor_cliente import SupervisorError


class PipelineError(RuntimeError):
    """La tarea no llego a veredicto. `.razon` explica por que; `.escalar` si toca escalar.

    `transitorio` marca un fallo del proveedor (rate-limit/5xx/conexion): el worker lo
    reintenta sin consumir un intento (y pausa hasta `reanudar_epoch` si es un 429 duro),
    en vez de escalarlo como si la tarea hubiera fallado.
    """

    def __init__(
        self,
        razon: str,
        escalar: bool = True,
        transitorio: bool = False,
        reanudar_epoch: int | None = None,
    ) -> None:
        super().__init__(razon)
        self.razon = razon
        self.escalar = escalar
        self.transitorio = transitorio
        self.reanudar_epoch = reanudar_epoch


class Pipeline:
    """Todas las dependencias inyectables: los tests corren sin red ni tokens."""

    def __init__(self, engine, supervisor, estado, repo: Path, workspace_root: Path) -> None:
        self._engine = engine
        self._supervisor = supervisor
        self._estado = estado
        self._repo = repo
        self._workspace_root = workspace_root

    async def procesar(self, tarea: dict) -> dict:
        """Trabaja UNA tarea de principio a fin. La fila ya esta en `en_ejecucion` (la
        reclamo el worker por CAS): aqui solo se escriben las transiciones siguientes."""
        task_id = tarea["task_id"]

        try:
            worktree = ws.preparar(self._repo, self._workspace_root, task_id)
        except Exception as exc:  # WorkspaceError o fallo git inesperado
            raise PipelineError(f"workspace: {exc}") from exc

        try:
            salida_motor = await self._engine.run(tarea, worktree)
        except EngineError as exc:
            # Un fallo TRANSITORIO del proveedor (429/5xx/conexion) no es culpa de la tarea:
            # no se escala, se reintenta luego (mismo trato que el Supervisor caido).
            transitorio = getattr(exc, "transitorio", False)
            raise PipelineError(
                f"motor: {exc}",
                escalar=not transitorio,
                transitorio=transitorio,
                reanudar_epoch=getattr(exc, "reanudar_epoch", None),
            ) from exc

        try:
            resultado = validar_resultado(
                {
                    "task_id": task_id,
                    "departamento": tarea["departamento"],  # el Supervisor rutea reglas por esto
                    "worktree": f"worktree/{task_id}",
                    "diff": ws.diff_de(worktree),
                    "archivos": ws.archivos_cambiados(worktree),
                    "artefactos": salida_motor.get("artefactos", {}),
                    "notas": salida_motor.get("notas", ""),
                }
            )
        except (ContratoInvalido, ws.WorkspaceError) as exc:
            raise PipelineError(f"resultado invalido: {exc}") from exc

        await self._estado.transicionar(task_id, "en_revision", resultado=resultado)

        try:
            veredicto = validar_veredicto(await self._supervisor.evaluar(resultado))
        except SupervisorError as exc:
            # El Supervisor caido NO es culpa de la tarea: no se escala, se reintenta luego.
            raise PipelineError(f"supervisor: {exc}", escalar=False) from exc
        except ContratoInvalido as exc:
            raise PipelineError(f"veredicto del supervisor invalido: {exc}") from exc

        estado_final = "aprobada" if veredicto["veredicto"] == "aprobado" else "rechazada"
        await self._estado.transicionar(task_id, estado_final, veredicto=veredicto)
        return {"resultado": resultado, "veredicto": veredicto}
