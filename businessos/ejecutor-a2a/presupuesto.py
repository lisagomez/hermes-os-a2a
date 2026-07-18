"""presupuesto.py — el tope de gasto de la COLA (PRP-010, Gotcha #1).

Antes de sacar CADA tarea de la cola, el worker pregunta aqui: "¿queda presupuesto?".
Si no, no saca nada, la cola se queda intacta y se avisa. Sin esto, encolar 8 features es
tan facil como escribir 8 mensajes en Slack — y el gasto no lo acota nadie.

**Por que el tope se mide en TOKENS y no en dolares** (esto es lo importante):
`claude_engine.py::filas_token_usage` lo deja escrito y lo vimos en vivo el 2026-07-12 —
con GLM-5.2 via z.ai el CLI **tarifa con precios de Anthropic**, asi que `costo_usd` llega
0 o erroneo (las filas de una corrida muerta van con `costo_usd: 0.0` a proposito). Un tope
que sume `costo_usd` (como hace hoy `coordinador-a2a/presupuesto.py`) leeria ~0 y **nunca
cortaria**: seria un cinturon de seguridad de mentira. Los TOKENS si son fiables.

El costo en dolares se ESTIMA con una tarifa configurable, solo para informar al equipo.
La tarifa por defecto es 0 = "no la sé": preferimos no decir nada a inventar un precio.
Config: TRIO_TOPE_TOKENS_DIA (default 3_000_000), TRIO_TARIFA_IN / TRIO_TARIFA_OUT
(USD por 1M tokens; 0 = desconocida).
"""
from __future__ import annotations

import datetime
import os

import httpx

TIMEOUT_S = 10.0
VERTICAL_TRIO = "trio"
TOPE_TOKENS_DIA_DEFAULT = 3_000_000  # ~lo que gastaron 4 corridas reales, con holgura


def _num(env: str, default: float) -> float:
    try:
        return float(os.environ.get(env) or default)
    except ValueError:
        return default


class Presupuesto:
    """Lectura best-effort: si no se puede consultar, NO se corta (no bloquear por una
    caida de red es lo mismo que hace el Coordinador). Lo que nunca se hace es cortar por
    un dato falso."""

    def __init__(
        self,
        url: str | None = None,
        key: str | None = None,
        http_client: httpx.AsyncClient | None = None,
        tope_tokens: int | None = None,
    ) -> None:
        self._url = (url or os.environ.get("SUPABASE_URL") or "").rstrip("/")
        self._key = key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
        self._http = http_client
        self._tope = int(tope_tokens or _num("TRIO_TOPE_TOKENS_DIA", TOPE_TOKENS_DIA_DEFAULT))

    @property
    def activo(self) -> bool:
        return bool(self._url and self._key)

    async def tokens_de_hoy(self) -> int:
        """Tokens (in+out) que el trio ya quemo hoy. -1 si no se pudo saber."""
        if not self.activo:
            return 0
        hoy = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
        url = (f"{self._url}/rest/v1/token_usage?vertical=eq.{VERTICAL_TRIO}"
               f"&fecha=eq.{hoy}&select=tokens_in,tokens_out")
        headers = {"apikey": self._key, "Authorization": f"Bearer {self._key}"}
        try:
            if self._http is not None:
                r = await self._http.get(url, headers=headers)
            else:
                async with httpx.AsyncClient(timeout=TIMEOUT_S) as c:
                    r = await c.get(url, headers=headers)
            if r.status_code >= 300:
                print(f"[presupuesto] consulta HTTP {r.status_code}: no se corta", flush=True)
                return -1
            return sum((f.get("tokens_in") or 0) + (f.get("tokens_out") or 0) for f in r.json())
        except httpx.HTTPError as exc:
            print(f"[presupuesto] consulta fallo ({type(exc).__name__}): no se corta", flush=True)
            return -1

    async def hay_margen(self) -> tuple[bool, str]:
        """(¿se puede sacar otra tarea?, motivo legible para el equipo)."""
        gastados = await self.tokens_de_hoy()
        if gastados < 0:
            return True, "presupuesto no verificable (se sigue, sin cortar)"
        if gastados >= self._tope:
            return False, (
                f"tope diario alcanzado: {gastados:,} de {self._tope:,} tokens. "
                "La cola queda intacta; se retoma cuando Elisa suba el tope o cambie el dia."
            )
        return True, f"{gastados:,} de {self._tope:,} tokens usados hoy"

    @staticmethod
    def estimar_usd(tokens_in: int, tokens_out: int) -> float | None:
        """USD estimado, o None si no hay tarifa configurada. NO se inventa un precio:
        con GLM via z.ai el costo que reporta el CLI es de Anthropic, o sea, mentira."""
        t_in, t_out = _num("TRIO_TARIFA_IN", 0), _num("TRIO_TARIFA_OUT", 0)
        if not (t_in or t_out):
            return None
        return (tokens_in / 1_000_000) * t_in + (tokens_out / 1_000_000) * t_out
