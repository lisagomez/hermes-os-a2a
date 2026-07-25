"""errores_proveedor.py — clasificar fallos TRANSITORIOS del proveedor (compartido).

Vive en `trio-contrato/` porque lo usan DOS servicios hermanos del trío: el
Ejecutor (`claude_engine.py`) y el Coordinador (`claude_planner.py`). Ambos hablan
con el mismo modelo vía z.ai y sufren los mismos cortes del proveedor (rate-limit
5h, 5xx, conexión caída). Doctrina "arreglar lo compartido, no el caso aislado":
una sola implementación del criterio transitorio-vs-definitivo, no dos que deriven.

El SDK `claude-agent-sdk` 0.2.110 expone la señal de forma ESTRUCTURAL — no hay que
parsear ningún transcript:
  - `ResultMessage.api_error_status` = 429/5xx/529 cuando `is_error=True` y
    `subtype="success"` (el críptico "returned an error result: success").
  - `AssistantMessage.error` / `ResultMessage.errors` ∈ {rate_limit, server_error, …}.
  - `RateLimitEvent.rate_limit_info.status == "rejected"` trae `resets_at` (Unix ts).
  - `CLIConnectionError` = transporte caído ("Connection closed mid-response").

Sin dependencia dura del SDK: el import de `CLIConnectionError` es lazy (dentro de
la función), así que importar este módulo NO exige el SDK — solo clasificar lo hace.
"""
from __future__ import annotations

from typing import Any

# Códigos HTTP del proveedor que son TRANSITORIOS: reintentar, no escalar.
STATUS_TRANSITORIOS = frozenset({429, 500, 502, 503, 504, 529})
# Marcadores de texto (fallback cuando no hay señal estructural). Conservador a
# proposito: solo lo inequivocamente transitorio. Ante la duda → definitivo (escala).
MARCAS_TRANSITORIAS = (
    "rate_limit", "rate limit", "overloaded", "server_error",
    "connection closed", "connection error", "connection reset",
)


def _texto_transitorio(*textos: Any) -> bool:
    """True si algun texto contiene un marcador inequivoco de fallo transitorio."""
    blob = " ".join(str(t) for t in textos if t).lower()
    return any(m in blob for m in MARCAS_TRANSITORIAS)


def clasificar_transitorio(
    result: Any,
    rate_info: Any,
    exc: BaseException | None,
    errores_stream: list[str] | None = None,
) -> tuple[bool, int | None]:
    """¿El fallo es del PROVEEDOR (transitorio) o DEFINITIVO? Devuelve (transitorio, reanudar_epoch).

    Fail-safe: solo devuelve True con señal de ALTA confianza (estructural del SDK o
    marcador de texto inequivoco). Cualquier otra cosa —error del codigo, max_turns,
    billing/auth— cae a definitivo y escala como siempre. Nunca empeora el caso: solo
    convierte en reintento lo que hoy se escala por error.
    """
    reanudar = None
    if rate_info is not None and getattr(rate_info, "status", None) == "rejected":
        # Rate-limit DURO de la cuenta: hasta `resets_at` no vale reintentar.
        reanudar = getattr(rate_info, "resets_at", None) or getattr(
            rate_info, "overage_resets_at", None
        )
        return True, reanudar

    from claude_agent_sdk import CLIConnectionError

    if isinstance(exc, CLIConnectionError):
        return True, None

    if result is not None and getattr(result, "api_error_status", None) in STATUS_TRANSITORIOS:
        return True, reanudar

    errores = list(errores_stream or [])
    errores += list(getattr(result, "errors", None) or [])
    if _texto_transitorio(getattr(result, "result", None), *errores, exc):
        return True, reanudar

    return False, None
