"""claude_engine.py — el motor REAL del Ejecutor: Claude Agent SDK (PRP-006, Fase 4).

Detras de la MISMA interfaz `Engine` que MockEngine: `run(tarea, worktree) →
{artefactos, notas}`. Construido contra el SDK instalado (0.2.110, introspeccion
del 2026-07-03: `query()` one-shot + `ClaudeAgentOptions` + `ResultMessage`) —
nunca contra blogs.

Presupuesto: cada corrida escribe su gasto en `token_usage` (vertical='trio',
una fila por modelo usado — `ResultMessage.model_usage`), best-effort como
estado.py: el registro nunca tumba la tarea. Limites de la TAREA respetados:
`modelo_pref` → options.model, `presupuesto_usd` → options.max_budget_usd,
`max_turns` → options.max_turns.

Seleccion por env: EJECUTOR_ENGINE=claude|mock (default mock — engine.crear_engine).
Este modulo solo se importa si se pide el motor real (lazy import en la fabrica).
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import httpx

from engine import EngineError

MAX_TURNS_DEFAULT = 40
VERTICAL_TRIO = "trio"
TIMEOUT_S = 10.0

PROMPT_SISTEMA = (
    "Eres el Ejecutor del trio de un departamento de software. Recibes UNA tarea "
    "con criterios de aceptacion y trabajas SOLO dentro del directorio actual (un "
    "git worktree aislado de la tarea). Fronteras estrictas: no decides el alcance, "
    "no haces merge a main, no despliegas, no tocas nada fuera del worktree. Un "
    "Supervisor independiente re-ejecutara los gates (build, typecheck, lint, "
    "tests) sobre tu trabajo: deja el worktree en estado verificable."
)


def _prompt_de(tarea: dict) -> str:
    lineas = [f"OBJETIVO: {tarea['objetivo']}", "", "CRITERIOS DE ACEPTACION:"]
    lineas += [f"- {c}" for c in tarea["criterios_aceptacion"]]
    if tarea.get("observaciones"):
        lineas += ["", "OBSERVACIONES DEL RECHAZO ANTERIOR (corrigelas):"]
        lineas += [f"- {o}" for o in tarea["observaciones"]]
    return "\n".join(lineas)


class RegistroTokenUsage:
    """Escritor best-effort de `token_usage` (PostgREST, service_role del servicio)."""

    def __init__(self, url: str | None = None, key: str | None = None) -> None:
        self._url = (url or os.environ.get("SUPABASE_URL") or "").rstrip("/")
        self._key = key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""

    @property
    def activo(self) -> bool:
        return bool(self._url and self._key)

    async def registrar(self, filas: list[dict]) -> None:
        if not self.activo or not filas:
            return
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
                await client.post(
                    f"{self._url}/rest/v1/token_usage",
                    headers={
                        "apikey": self._key,
                        "Authorization": f"Bearer {self._key}",
                        "Content-Type": "application/json",
                    },
                    json=filas,
                )
        except httpx.HTTPError:
            pass  # best-effort: el presupuesto no tumba la tarea


def _entero(u: dict, *claves: str) -> int:
    """model_usage viene del CLI (camelCase) o de docs viejas (snake_case)."""
    for k in claves:
        v = u.get(k)
        if isinstance(v, (int, float)):
            return int(v)
    return 0


def filas_token_usage(result: Any, modelo_pedido: str | None) -> list[dict]:
    """Una fila por modelo de `model_usage`; si no viene, una fila con el total.

    GOTCHA (modo GLM-5.2 vía z.ai): el CLI calcula `costUSD`/`total_cost_usd` con
    TARIFAS DE ANTHROPIC → contra el endpoint z.ai el costo puede venir 0 o erróneo.
    Los TOKENS sí son fiables. Para `token_usage` vertical 'trio' con GLM, recalcular
    el costo aparte con tarifa z.ai (patrón host-job como ingest-token-usage.py) o
    aceptar tokens-only. No es un bug del motor: es que el precio no es de Anthropic.
    """
    filas: list[dict] = []
    for modelo, u in (getattr(result, "model_usage", None) or {}).items():
        if not isinstance(u, dict):
            continue
        filas.append({
            "vertical": VERTICAL_TRIO,
            "modelo": modelo,
            "tokens_in": _entero(u, "inputTokens", "input_tokens"),
            "tokens_out": _entero(u, "outputTokens", "output_tokens"),
            "costo_usd": float(u.get("costUSD") or u.get("cost_usd") or 0),
        })
    if not filas:  # fallback: el total de la corrida
        usage = getattr(result, "usage", None) or {}
        filas.append({
            "vertical": VERTICAL_TRIO,
            "modelo": modelo_pedido or "claude-code-default",
            "tokens_in": _entero(usage, "input_tokens", "inputTokens"),
            "tokens_out": _entero(usage, "output_tokens", "outputTokens"),
            "costo_usd": float(getattr(result, "total_cost_usd", None) or 0),
        })
    return filas


class ClaudeAgentEngine:
    """Motor real. `query_fn` y `registro` inyectables: los tests NUNCA queman tokens."""

    def __init__(self, query_fn=None, registro: RegistroTokenUsage | None = None) -> None:
        if query_fn is None:
            from claude_agent_sdk import query as query_fn  # el SDK instalado manda
        self._query = query_fn
        self._registro = registro or RegistroTokenUsage()

    async def run(self, tarea: dict, worktree: Path) -> dict[str, Any]:
        from claude_agent_sdk import ClaudeAgentOptions, ResultMessage

        limites = tarea.get("limites", {})
        options = ClaudeAgentOptions(
            cwd=str(worktree),
            system_prompt=PROMPT_SISTEMA,
            # Autonomo dentro del worktree aislado; el juicio es del Supervisor
            # (gates) y de la dueña (gate humano), no de prompts de permiso.
            permission_mode="bypassPermissions",
            model=limites.get("modelo_pref"),
            max_turns=int(limites.get("max_turns", MAX_TURNS_DEFAULT)),
            max_budget_usd=limites.get("presupuesto_usd"),
        )

        result = None
        try:
            async for mensaje in self._query(prompt=_prompt_de(tarea), options=options):
                if isinstance(mensaje, ResultMessage):
                    result = mensaje
        except Exception as exc:  # CLI ausente, transporte roto, etc.
            raise EngineError(f"claude-agent-sdk: {type(exc).__name__}: {exc}") from exc

        if result is None:
            raise EngineError("claude-agent-sdk: la corrida no entrego ResultMessage")

        # El gasto se registra SIEMPRE (tambien en error): tokens quemados son reales.
        await self._registro.registrar(filas_token_usage(result, options.model))

        if result.is_error:
            detalle = result.result or "; ".join(result.errors or []) or result.subtype
            raise EngineError(f"claude-agent-sdk: corrida en error: {str(detalle)[:300]}")

        return {
            "artefactos": {
                "engine": "claude-agent-sdk",
                "num_turns": result.num_turns,
                "duracion_ms": result.duration_ms,
                "costo_usd": result.total_cost_usd or 0,
                "session_id": result.session_id,
            },
            "notas": (result.result or "")[:2000],
        }
