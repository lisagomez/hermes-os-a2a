"""presupuesto.py — corte de gasto acumulado del enjambre (PRP-007, Fase 3).

El segundo tope del enjambre (junto a `fan_out_max`): el gasto acumulado contra
`presupuesto_usd`. Suma EXACTA por `token_usage.task_id` — la columna añadida en
la Fase 1 (DECIDIDO 2026-07-04) — sobre las sub-tareas + la fila padre (el gasto
del propio Planner). Cuando se agota, el scheduler no lanza más sub-tareas.

Best-effort de lectura: sin SUPABASE_URL/KEY (dev, tests) o ante error de red
devuelve 0.0 → NO corta. El presupuesto es una red de seguridad; si no se puede
leer el gasto, no se escala en falso (los topes duros siguen siendo `fan_out_max`
y el `intentos_max` por sub-tarea). Con el motor real (que sí escribe token_usage
con task_id), el corte es exacto.
"""
from __future__ import annotations

import os

import httpx

TIMEOUT_S = 10.0


class Presupuesto:
    def __init__(
        self,
        url: str | None = None,
        key: str | None = None,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._url = (url or os.environ.get("SUPABASE_URL") or "").rstrip("/")
        self._key = key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
        self._http = http_client

    @property
    def activo(self) -> bool:
        return bool(self._url and self._key)

    async def gasto_acumulado(self, task_ids: list[str]) -> float:
        """Suma `costo_usd` de token_usage para esos task_id. 0.0 si no se puede leer."""
        if not self.activo or not task_ids:
            return 0.0
        filtro = ",".join(task_ids)  # los task_id son [A-Za-z0-9._-]: seguros en in.()
        path = f"token_usage?task_id=in.({filtro})&select=costo_usd"
        headers = {"apikey": self._key, "Authorization": f"Bearer {self._key}"}
        try:
            if self._http is not None:
                r = await self._http.get(f"{self._url}/rest/v1/{path}", headers=headers)
            else:
                async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
                    r = await client.get(f"{self._url}/rest/v1/{path}", headers=headers)
            filas = r.json() if r.status_code == 200 else []
            return float(sum((f.get("costo_usd") or 0) for f in filas))
        except httpx.HTTPError:
            return 0.0  # best-effort: no cortamos si no podemos leer el gasto
