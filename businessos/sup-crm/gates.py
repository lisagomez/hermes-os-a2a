"""gates.py — gates DETERMINISTAS de sup-crm (corren siempre, cuestan cero).

Doctrina de la casa (fase 6): un gate activo sin runner ejecutable = config
inválida; aquí cada gate ES una función. Binarios: pasan o fallan con motivo.
El juez LLM (juez.py) va DESPUÉS y solo si estos pasan — lo barato primero.
"""
from __future__ import annotations

import re

MAX_RESPUESTA = 1500  # un saliente de CRM no es un ensayo

# Un agente de CRM JAMÁS pide esto (techo estructural, lado saliente).
_SENSIBLE = re.compile(
    r"(n[úu]mero de tarjeta|cvv|cvc|contraseñ|password|c[óo]digo de verificaci[óo]n|pin\b)",
    re.IGNORECASE,
)
# Un saliente jamás debe contener pinta de secreto/credencial propio.
_SECRETO = re.compile(r"(sk-[A-Za-z0-9]{8,}|sbp_[A-Za-z0-9]{8,}|polar_oat_|Bearer [A-Za-z0-9._-]{15,}|eyJ[A-Za-z0-9_-]{20,})")


def correr_gates(respuesta: str) -> dict[str, str]:
    """Devuelve {gate: 'ok' | 'fallo: <motivo>'} — SIEMPRE todos los gates."""
    resultados: dict[str, str] = {}

    resultados["g_vacio"] = "ok" if respuesta.strip() else "fallo: respuesta vacía"
    resultados["g_largo"] = (
        "ok" if len(respuesta) <= MAX_RESPUESTA else f"fallo: {len(respuesta)} chars > {MAX_RESPUESTA}"
    )
    m = _SENSIBLE.search(respuesta)
    resultados["g_sensible"] = "ok" if not m else f"fallo: pide dato sensible ({m.group(0)!r})"
    resultados["g_secreto"] = "ok" if not _SECRETO.search(respuesta) else "fallo: contiene patrón de credencial"

    return resultados


def gates_ok(resultados: dict[str, str]) -> bool:
    return all(v == "ok" for v in resultados.values())
