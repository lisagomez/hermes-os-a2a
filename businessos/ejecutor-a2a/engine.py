"""engine.py — motor pluggable del Ejecutor (PRP-006).

Interfaz minima: `Engine.run(tarea, worktree) -> dict parcial de RESULTADO`
(diff/archivos los calcula el Ejecutor desde git; el motor aporta artefactos y
notas). Implementaciones:

- MockEngine  — determinista, cero tokens: aplica los cambios que la tarea trae
  en `contexto["mock_cambios"]` (o `mock_correccion` si hay observaciones de un
  rechazo previo). Es el motor de tests y del end-to-end de dev.
- ClaudeAgentEngine — el motor real (Claude Agent SDK) llega en la Fase 4 del
  blueprint, detras de ESTA misma interfaz.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Protocol


class EngineError(RuntimeError):
    """El motor no pudo completar la tarea; el mensaje trae el porque."""


class Engine(Protocol):
    async def run(self, tarea: dict, worktree: Path) -> dict[str, Any]:
        """Hace la tarea DENTRO del worktree; devuelve {artefactos, notas}."""
        ...


class MockEngine:
    """Motor determinista para tests/dev: escribe los archivos que dicta la tarea.

    Convenio del mock (solo para tests; el motor real ignora estas claves):
    - contexto["mock_cambios"]:    {ruta: contenido} — primer intento
    - contexto["mock_correccion"]: {ruta: contenido} — si la tarea trae observaciones
    - contexto["mock_falla"]:      string — simula un motor que truena (EngineError)
    """

    async def run(self, tarea: dict, worktree: Path) -> dict[str, Any]:
        contexto = tarea.get("contexto", {})
        if contexto.get("mock_falla"):
            raise EngineError(str(contexto["mock_falla"]))

        con_observaciones = bool(tarea.get("observaciones"))
        cambios = contexto.get(
            "mock_correccion" if con_observaciones else "mock_cambios", {}
        )
        for ruta, contenido in cambios.items():
            destino = worktree / ruta
            destino.parent.mkdir(parents=True, exist_ok=True)
            destino.write_text(contenido, encoding="utf-8")

        return {
            "artefactos": {"engine": "mock", "cambios_aplicados": len(cambios)},
            "notas": f"MockEngine: {len(cambios)} archivo(s) "
            + ("(correccion tras observaciones)" if con_observaciones else "(primer intento)"),
        }


def crear_engine(nombre: str) -> Engine:
    """Fabrica por env (`EJECUTOR_ENGINE=mock|claude`)."""
    if nombre == "mock":
        return MockEngine()
    if nombre == "claude":
        from claude_engine import ClaudeAgentEngine  # lazy: solo si se pide el real

        return ClaudeAgentEngine()
    raise EngineError(f"engine desconocido: {nombre!r} (usa 'mock' o 'claude')")
