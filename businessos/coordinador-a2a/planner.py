"""planner.py — motor pluggable del Coordinador (PRP-007, Fase 7).

El ÚNICO punto del enjambre que usa un modelo es el Planner: descompone una
feature grande (tarea padre) en un PLAN (DAG de sub-tareas). Todo lo demás
—reparto, reintento, presupuesto, integración— es determinista. Por eso el
Planner es pluggable/mockeable igual que el `Engine` del Ejecutor:

- MockPlanner  — cero tokens: lee el DAG de `contexto["mock_plan"]` y lo valida
  con el contrato. Es el planner de tests y del end-to-end de dev.
- ClaudePlanner — modelo real (Claude Agent SDK), opt-in por env
  `COORDINADOR_PLANNER=claude`. Vive en `claude_planner.py`, detrás de ESTA
  misma interfaz.

El plan es DATOS validados por `validar_plan`: el servicio, el fan-out y la
integración se prueban al 100% sin modelo.
"""
from __future__ import annotations

from typing import Any, Protocol

from contrato import ContratoInvalido, validar_plan


class PlannerError(RuntimeError):
    """El Planner no pudo producir un plan válido; el mensaje trae el porqué.

    `transitorio` marca un fallo del PROVEEDOR (rate-limit 429/5xx/conexión caída) —
    no un plan inválido ni un error de juicio. El Coordinador lo reintenta con backoff
    (y pausa hasta `reanudar_epoch` si es un 429 duro) en vez de tirar la feature entera,
    igual que hace el worker del Ejecutor. Por defecto False → todo error se comporta como
    hoy salvo que quien lo levanta diga lo contrario.
    """

    def __init__(
        self,
        mensaje: str,
        transitorio: bool = False,
        reanudar_epoch: int | None = None,
    ) -> None:
        super().__init__(mensaje)
        self.transitorio = transitorio
        self.reanudar_epoch = reanudar_epoch


class Planner(Protocol):
    async def plan(self, tarea: dict) -> dict:
        """Descompone la tarea padre en un PLAN normalizado (validar_plan)."""
        ...


class MockPlanner:
    """Planner determinista para tests/dev: el DAG viaja en la tarea, cero tokens.

    Convenio (solo para tests; el planner real ignora esta clave):
    - contexto["mock_plan"]: {"sub_tareas": [...]} — el DAG a validar.
    """

    async def plan(self, tarea: dict) -> dict:
        contexto = tarea.get("contexto", {}) if isinstance(tarea, dict) else {}
        crudo: Any = contexto.get("mock_plan")
        if crudo is None:
            raise PlannerError(
                "MockPlanner: falta contexto['mock_plan'] (DAG de sub-tareas del enjambre)"
            )
        try:
            return validar_plan(crudo)
        except ContratoInvalido as exc:
            raise PlannerError(f"plan inválido: {exc}") from exc


def crear_planner(nombre: str) -> Planner:
    """Fábrica por env (`COORDINADOR_PLANNER=mock|claude`)."""
    if nombre == "mock":
        return MockPlanner()
    if nombre == "claude":
        from claude_planner import ClaudePlanner  # lazy: solo si se pide el real (Fase 5)

        return ClaudePlanner()
    raise PlannerError(f"planner desconocido: {nombre!r} (usa 'mock' o 'claude')")
