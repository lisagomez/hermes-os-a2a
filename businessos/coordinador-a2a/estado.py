"""estado.py — la fila PADRE de `tareas` (PRP-007, Fase 7).

El Coordinador es EL escritor de confianza de la fila PADRE (es_padre=true):
plan, límites del enjambre, presupuesto/gasto acumulado y estado global. Un solo
escritor por fila (aprendizaje F3 de Fase 6, extendido a padre/hija): las filas
HIJAS las escribe cada Ejecutor (estado.py del ejecutor-a2a); el Supervisor sigue
stateless. Nadie escribe la fila de otro.

Best-effort a propósito: sin SUPABASE_URL/KEY (dev, tests, CI) es no-op — el flujo
A2A del enjambre nunca depende de Supabase para operar. El plan se guarda como
jsonb; el gasto acumulado se actualiza en cada vuelta del scheduler (Fase 3).
"""
from __future__ import annotations

import os
from typing import Any

import httpx

TIMEOUT_S = 10.0


class EstadoCoordinador:
    """Escritor único de la fila padre. Todas las dependencias inyectables (tests)."""

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

    def _headers(self) -> dict[str, str]:
        return {
            "apikey": self._key,
            "Authorization": f"Bearer {self._key}",
            "Content-Type": "application/json",
        }

    async def _request(self, metodo: str, path: str, **kwargs) -> httpx.Response:
        url = f"{self._url}/rest/v1/{path}"
        if self._http is not None:
            return await self._http.request(metodo, url, headers=self._headers(), **kwargs)
        async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
            return await client.request(metodo, url, headers=self._headers(), **kwargs)

    async def _upsert(self, fila: dict) -> None:
        headers = self._headers() | {"Prefer": "resolution=merge-duplicates"}
        path = "tareas?on_conflict=task_id"
        if self._http is not None:
            await self._http.post(f"{self._url}/rest/v1/{path}", headers=headers, json=fila)
            return
        async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
            await client.post(f"{self._url}/rest/v1/{path}", headers=headers, json=fila)

    async def registrar_padre(
        self, tarea: dict, plan: dict, fan_out_max: int, presupuesto_usd: float | None
    ) -> None:
        """Crea/actualiza la fila padre (es_padre=true) con el plan y los límites."""
        if not self.activo:
            return
        fila = {
            "task_id": tarea["task_id"],
            "departamento": tarea["departamento"],
            "objetivo": tarea["objetivo"],
            "contexto": tarea["contexto"],
            "criterios": tarea["criterios_aceptacion"],
            "estado": "en_ejecucion",
            "intentos_max": tarea["limites"]["intentos_max"],
            "es_padre": True,
            "fan_out_max": fan_out_max,
            "plan": plan,
            "presupuesto_usd": presupuesto_usd,
            "gasto_usd": 0,
            "updated_at": "now()",
        }
        try:
            await self._upsert(fila)
        except httpx.HTTPError:
            pass  # best-effort: el estado nunca tumba el enjambre

    async def transicionar(self, task_id: str, estado: str, **campos: Any) -> None:
        """PATCH del estado global de la fila padre (+plan/gasto/veredicto final)."""
        if not self.activo:
            return
        cuerpo: dict[str, Any] = {"estado": estado, "updated_at": "now()", **campos}
        try:
            await self._request("PATCH", f"tareas?task_id=eq.{task_id}&es_padre=is.true", json=cuerpo)
        except httpx.HTTPError:
            pass  # best-effort
