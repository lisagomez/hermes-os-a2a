"""claude_engine.py — el motor REAL del Ejecutor: Claude Agent SDK (PRP-006, Fase 4).

Detras de la MISMA interfaz `Engine` que MockEngine: `run(tarea, worktree) →
{artefactos, notas}`. Construido contra el SDK instalado (0.2.110, introspeccion
del 2026-07-03: `query()` one-shot + `ClaudeAgentOptions` + `ResultMessage`) —
nunca contra blogs.

Presupuesto: cada corrida escribe su gasto en `token_usage` (vertical='trio',
una fila por modelo usado — `ResultMessage.model_usage`), best-effort como
estado.py: el registro nunca tumba la tarea. Si la corrida MUERE antes del
ResultMessage, se registra el gasto acumulado turno a turno (`acumular_parcial`):
los tokens quemados son reales aunque el trabajo se haya perdido. Limites de la
TAREA respetados:
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
# Criterio transitorio-vs-definitivo COMPARTIDO con el Coordinador (trio-contrato):
# una sola implementacion para los dos servicios que hablan con el proveedor.
from errores_proveedor import clasificar_transitorio

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
                r = await client.post(
                    f"{self._url}/rest/v1/token_usage",
                    headers={
                        "apikey": self._key,
                        "Authorization": f"Bearer {self._key}",
                        "Content-Type": "application/json",
                    },
                    json=filas,
                )
            # Best-effort NO es silencioso: un 4xx/5xx (p.ej. el 409 del indice
            # unico que se trago el gasto del dogfood 2026-07-11) debe VERSE en
            # los logs aunque no tumbe la tarea.
            if r.status_code >= 300:
                print(
                    f"[token_usage] POST fallo HTTP {r.status_code}: "
                    f"{r.text[:200]} (gasto NO registrado, la tarea sigue)",
                    flush=True,
                )
        except httpx.HTTPError as exc:
            # best-effort: el presupuesto no tumba la tarea, pero queda rastro
            print(f"[token_usage] POST fallo: {type(exc).__name__}: {exc}", flush=True)


def _entero(u: dict, *claves: str) -> int:
    """model_usage viene del CLI (camelCase) o de docs viejas (snake_case)."""
    for k in claves:
        v = u.get(k)
        if isinstance(v, (int, float)):
            return int(v)
    return 0


def acumular_parcial(parciales: dict[str, dict[str, int]], mensaje: Any) -> None:
    """Suma el gasto de un AssistantMessage al acumulador por modelo.

    Es la UNICA fuente de gasto cuando la corrida muere antes del ResultMessage
    (motor abortado, CLI caido): esos tokens ya se quemaron y deben contarse. El
    ResultMessage, cuando llega, es autoritativo y REEMPLAZA a este acumulado.
    """
    usage = getattr(mensaje, "usage", None)
    if not isinstance(usage, dict):
        return
    modelo = getattr(mensaje, "model", None) or "desconocido"
    fila = parciales.setdefault(modelo, {"tokens_in": 0, "tokens_out": 0})
    fila["tokens_in"] += _entero(usage, "inputTokens", "input_tokens")
    fila["tokens_out"] += _entero(usage, "outputTokens", "output_tokens")


def filas_parciales(
    parciales: dict[str, dict[str, int]], task_id: str | None = None
) -> list[dict]:
    """Gasto de una corrida MUERTA a media faena. Sin costo: el precio por token no
    lo sabe el motor (con GLM el CLI ni siquiera tarifa bien) y los tokens son el dato
    real. `costo_usd=0` es honesto — el recalculo es del host-job, no de aqui."""
    return [
        {
            "vertical": VERTICAL_TRIO,
            "task_id": task_id,
            "modelo": modelo,
            "tokens_in": t["tokens_in"],
            "tokens_out": t["tokens_out"],
            "costo_usd": 0.0,
        }
        for modelo, t in parciales.items()
        if t["tokens_in"] or t["tokens_out"]
    ]


def filas_token_usage(result: Any, modelo_pedido: str | None, task_id: str | None = None) -> list[dict]:
    """Una fila por modelo de `model_usage`; si no viene, una fila con el total.

    `task_id` (Fase 7): atribuye el gasto a la sub-tarea para el corte EXACTO de
    presupuesto del enjambre (columna nullable de token_usage). Sin él (uso suelto
    de Fase 6) queda null — retrocompatible.

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
            "task_id": task_id,
            "modelo": modelo,
            "tokens_in": _entero(u, "inputTokens", "input_tokens"),
            "tokens_out": _entero(u, "outputTokens", "output_tokens"),
            "costo_usd": float(u.get("costUSD") or u.get("cost_usd") or 0),
        })
    if not filas:  # fallback: el total de la corrida
        usage = getattr(result, "usage", None) or {}
        filas.append({
            "vertical": VERTICAL_TRIO,
            "task_id": task_id,
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
        from claude_agent_sdk import ClaudeAgentOptions, RateLimitEvent, ResultMessage
        from claude_agent_sdk.types import AssistantMessage

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

        task_id = tarea.get("task_id")
        result = None
        # Gasto acumulado turno a turno: si la corrida muere antes del ResultMessage
        # (1a corrida real, 2026-07-12: el motor abortado no registro NADA) este es el
        # unico rastro de los tokens quemados.
        parciales: dict[str, dict[str, int]] = {}
        # Señales de fallo TRANSITORIO del proveedor, capturadas del stream (el CLI las
        # emite como mensajes propios, no en el ResultMessage): el ultimo estado de
        # rate-limit (trae `resets_at`) y los `error` de los AssistantMessage.
        rate_info: Any = None
        errores_stream: list[str] = []
        try:
            async for mensaje in self._query(prompt=_prompt_de(tarea), options=options):
                if isinstance(mensaje, ResultMessage):
                    result = mensaje
                elif isinstance(mensaje, RateLimitEvent):
                    rate_info = mensaje.rate_limit_info
                else:
                    if isinstance(mensaje, AssistantMessage) and getattr(mensaje, "error", None):
                        errores_stream.append(str(mensaje.error))
                    acumular_parcial(parciales, mensaje)
        except Exception as exc:  # CLI ausente, transporte roto, motor abortado, etc.
            # GOTCHA (2026-07-12): cuando el CLI aborta por sus propios limites (p.ej.
            # error_max_turns) PRIMERO emite un ResultMessage con is_error=True — con su
            # `model_usage` completo — y LUEGO sale con exit!=0, que el SDK convierte en
            # excepcion (query.py: "Claude Code returned an error result"). O sea: el gasto
            # real ya llego. Si aqui solo miraramos el acumulado turno a turno, tirariamos
            # el dato bueno (paso: la corrida de 40 turnos se registro como "sin gasto").
            await self._registrar_gasto(result, parciales, options.model, task_id,
                                        motivo=f"{type(exc).__name__}: {exc}")
            raise self._engine_error(
                f"claude-agent-sdk: {type(exc).__name__}: {exc}",
                result, rate_info, exc, errores_stream,
            ) from exc

        if result is None:
            await self._registrar_gasto(result, parciales, options.model, task_id,
                                        motivo="sin ResultMessage")
            # Sin ResultMessage puede ser una conexion caida a media respuesta (transitorio):
            # el rate_info/errores del stream, si los hubo, mandan.
            raise self._engine_error(
                "claude-agent-sdk: la corrida no entrego ResultMessage",
                None, rate_info, None, errores_stream,
            )

        # El gasto se registra SIEMPRE (tambien en error): tokens quemados son reales.
        # task_id atribuye el gasto a la (sub-)tarea → corte exacto de presupuesto (Fase 7).
        await self._registrar_gasto(result, parciales, options.model, task_id)

        if result.is_error:
            detalle = result.result or "; ".join(result.errors or []) or result.subtype
            raise self._engine_error(
                f"claude-agent-sdk: corrida en error: {str(detalle)[:300]}",
                result, rate_info, None, errores_stream,
            )

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

    def _engine_error(
        self,
        mensaje: str,
        result: Any,
        rate_info: Any,
        exc: BaseException | None,
        errores_stream: list[str],
    ) -> EngineError:
        """Envuelve el fallo clasificando si es transitorio (reintentar) o definitivo."""
        transitorio, reanudar = clasificar_transitorio(result, rate_info, exc, errores_stream)
        if transitorio:
            espera = f" (reanuda ~{reanudar})" if reanudar else ""
            print(f"[motor] fallo TRANSITORIO del proveedor{espera}: {mensaje}", flush=True)
        return EngineError(mensaje, transitorio=transitorio, reanudar_epoch=reanudar)

    async def _registrar_gasto(
        self,
        result: Any,
        parciales: dict[str, dict[str, int]],
        modelo: str | None,
        task_id: str | None,
        motivo: str | None = None,
    ) -> None:
        """Escribe el gasto de la corrida, haya terminado bien o mal.

        Orden de preferencia (el dato bueno gana): el ResultMessage —AUNQUE venga con
        is_error— trae el `model_usage` real; solo si la corrida murio sin entregarlo se
        usa el acumulado turno a turno. Si no hay ni uno ni otro, se DICE en el log: un
        gasto perdido en silencio es como no tener presupuesto.
        """
        if result is not None:
            filas, fuente = filas_token_usage(result, modelo, task_id), "ResultMessage"
        else:
            filas, fuente = filas_parciales(parciales, task_id), "acumulado parcial"

        if motivo:
            tokens = sum(f["tokens_in"] + f["tokens_out"] for f in filas)
            detalle = (
                f"registrando {tokens} tokens desde {fuente}"
                if filas
                else "SIN gasto registrable (tokens quemados que no veremos)"
            )
            print(f"[token_usage] corrida {task_id} murio ({motivo}): {detalle}", flush=True)
        await self._registro.registrar(filas)
