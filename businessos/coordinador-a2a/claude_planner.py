"""claude_planner.py — el Planner REAL del Coordinador: Claude Agent SDK (PRP-007, Fase 5).

Detrás de la MISMA interfaz `Planner` que MockPlanner: `plan(tarea) → PLAN` (DAG
validado por `validar_plan`). Espejo de claude_engine.py del Ejecutor: construido
contra el SDK instalado (claude-agent-sdk 0.2.110 — `query()` one-shot +
`ClaudeAgentOptions` + `ResultMessage`), nunca contra blogs.

El Planner es JUICIO, no ejecución: descompone la feature en un DAG de sub-tareas y
devuelve SOLO JSON — no edita archivos ni corre el repo (eso es del Ejecutor). Su
gasto se atribuye a la fila PADRE (task_id del padre) en `token_usage`, para el
corte de presupuesto del enjambre (el mismo que suma el scheduler).

Selección por env: COORDINADOR_PLANNER=claude|mock (default mock — planner.crear_planner).
Este módulo solo se importa si se pide el planner real (lazy import en la fábrica).
"""
from __future__ import annotations

import json
import os
import re
from typing import Any

import httpx

from contrato import ContratoInvalido, validar_plan
from planner import PlannerError

MAX_TURNS_DEFAULT = 12
VERTICAL_TRIO = "trio"
TIMEOUT_S = 10.0

PROMPT_SISTEMA = (
    "Eres el Planner del Coordinador de un enjambre de desarrollo de software. "
    "Recibes UNA feature grande con criterios de aceptacion globales y la descompones "
    "en un DAG de sub-tareas con ALCANCES DISJUNTOS, para que un enjambre de Ejecutores "
    "las haga en paralelo. NO escribes codigo, NO tocas archivos, NO ejecutas el repo: "
    "solo razonas y devuelves el plan. Reglas del DAG: (1) cada sub-tarea trae un "
    "task_id corto y unico [A-Za-z0-9._-], un objetivo claro y su propia lista de "
    "criterios_aceptacion; (2) depende_de lista los task_id que deben terminar antes "
    "(sin ciclos, hacia ids existentes); (3) alcance lista los globs de rutas que la "
    "sub-tarea tocara — dos sub-tareas SIN dependencia entre si NO deben solapar alcance. "
    "Responde EXCLUSIVAMENTE con JSON valido de la forma "
    '{"sub_tareas": [{"task_id": "...", "objetivo": "...", '
    '"criterios_aceptacion": ["..."], "depende_de": [], "alcance": ["..."]}]}. '
    "Sin texto antes ni despues, sin markdown."
)

_JSON_FENCE = re.compile(r"```(?:json)?\s*(\{.*\})\s*```", re.DOTALL)


def _prompt_de(tarea: dict) -> str:
    lineas = [f"OBJETIVO (feature grande): {tarea['objetivo']}", "", "CRITERIOS DE ACEPTACION GLOBALES:"]
    lineas += [f"- {c}" for c in tarea["criterios_aceptacion"]]
    contexto = tarea.get("contexto", {})
    repo = contexto.get("repo") if isinstance(contexto, dict) else None
    if repo:
        lineas += ["", f"REPO OBJETIVO: {repo}"]
    fan_out = tarea.get("limites", {}).get("fan_out_max")
    if fan_out:
        lineas += ["", f"Hasta {fan_out} sub-tareas pueden correr en paralelo; agrupa con criterio."]
    lineas += ["", "Devuelve SOLO el JSON del plan."]
    return "\n".join(lineas)


def _extraer_json(texto: str) -> dict:
    """Saca el objeto JSON del texto del modelo (con o sin fences de markdown)."""
    m = _JSON_FENCE.search(texto)
    crudo = m.group(1) if m else texto
    inicio, fin = crudo.find("{"), crudo.rfind("}")
    if inicio == -1 or fin == -1 or fin < inicio:
        raise PlannerError("el Planner no devolvio un objeto JSON")
    try:
        return json.loads(crudo[inicio : fin + 1])
    except json.JSONDecodeError as exc:
        raise PlannerError(f"el plan del Planner no es JSON valido: {exc}") from exc


def _entero(u: dict, *claves: str) -> int:
    for k in claves:
        v = u.get(k)
        if isinstance(v, (int, float)):
            return int(v)
    return 0


def filas_token_usage(result: Any, task_id: str | None) -> list[dict]:
    """Una fila por modelo de `model_usage` (gasto del Planner, atribuido al padre)."""
    filas: list[dict] = []
    for modelo, u in (getattr(result, "model_usage", None) or {}).items():
        if not isinstance(u, dict):
            continue
        filas.append({
            "vertical": VERTICAL_TRIO,
            "task_id": task_id,
            "modelo": modelo,
            "tokens_in": _entero(u, "inputTokens", "input_tokens"),
            "tokens_out": _entero(u, "outputTokens", "output_tokens"),
            "costo_usd": float(u.get("costUSD") or u.get("cost_usd") or 0),
        })
    if not filas:
        usage = getattr(result, "usage", None) or {}
        filas.append({
            "vertical": VERTICAL_TRIO,
            "task_id": task_id,
            "modelo": "claude-code-default",
            "tokens_in": _entero(usage, "input_tokens", "inputTokens"),
            "tokens_out": _entero(usage, "output_tokens", "outputTokens"),
            "costo_usd": float(getattr(result, "total_cost_usd", None) or 0),
        })
    return filas


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
                r = await client.post(
                    f"{self._url}/rest/v1/token_usage",
                    headers={
                        "apikey": self._key,
                        "Authorization": f"Bearer {self._key}",
                        "Content-Type": "application/json",
                    },
                    json=filas,
                )
            # Best-effort NO es silencioso (leccion del 409 del dogfood 2026-07-11):
            # un 4xx/5xx debe VERSE en los logs aunque no tumbe la planificacion.
            if r.status_code >= 300:
                print(
                    f"[token_usage] POST fallo HTTP {r.status_code}: "
                    f"{r.text[:200]} (gasto del Planner NO registrado, la tarea sigue)",
                    flush=True,
                )
        except httpx.HTTPError as exc:
            print(f"[token_usage] POST fallo: {type(exc).__name__}: {exc}", flush=True)


class ClaudePlanner:
    """Planner real. `query_fn` y `registro` inyectables: los tests NUNCA queman tokens."""

    def __init__(self, query_fn=None, registro: RegistroTokenUsage | None = None) -> None:
        if query_fn is None:
            from claude_agent_sdk import query as query_fn  # el SDK instalado manda
        self._query = query_fn
        self._registro = registro or RegistroTokenUsage()

    async def plan(self, tarea: dict) -> dict:
        from claude_agent_sdk import ClaudeAgentOptions, ResultMessage

        limites = tarea.get("limites", {})
        options = ClaudeAgentOptions(
            system_prompt=PROMPT_SISTEMA,
            # El Planner es juicio, no ejecucion; el prompt le prohibe tocar archivos.
            permission_mode="bypassPermissions",
            model=limites.get("modelo_pref"),
            max_turns=int(limites.get("max_turns", MAX_TURNS_DEFAULT)),
        )

        result = None
        try:
            async for mensaje in self._query(prompt=_prompt_de(tarea), options=options):
                if isinstance(mensaje, ResultMessage):
                    result = mensaje
        except Exception as exc:  # CLI ausente, transporte roto, etc.
            raise PlannerError(f"claude-agent-sdk: {type(exc).__name__}: {exc}") from exc

        if result is None:
            raise PlannerError("claude-agent-sdk: la corrida no entrego ResultMessage")

        # El gasto se registra SIEMPRE (tambien en error), atribuido al padre.
        await self._registro.registrar(filas_token_usage(result, tarea.get("task_id")))

        if result.is_error:
            detalle = result.result or "; ".join(result.errors or []) or result.subtype
            raise PlannerError(f"claude-agent-sdk: corrida en error: {str(detalle)[:300]}")

        crudo = _extraer_json(result.result or "")
        try:
            return validar_plan(crudo)
        except ContratoInvalido as exc:
            raise PlannerError(f"plan invalido del modelo: {exc}") from exc
