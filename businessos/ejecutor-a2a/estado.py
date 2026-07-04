"""estado.py — transiciones de la tabla `tareas` (PRP-006).

El Ejecutor es EL escritor de confianza de `tareas` (service_role via PostgREST):
un solo escritor por fila evita carreras; el Supervisor juzga puro (stateless) y
el agente Hermes JAMAS toca credenciales (consulta por A2A o snapshot).

Best-effort a proposito: sin SUPABASE_URL/KEY (dev, tests, CI) es no-op — el
flujo A2A nunca depende de Supabase para operar (igual que db.guardar_evaluacion
en el grafo). El diff se recorta para el jsonb; el integro viaja en el artifact.
"""
from __future__ import annotations

import os
from typing import Any

import httpx

DIFF_MAX_JSONB = 20_000
TIMEOUT_S = 10.0


class EstadoTareas:
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

    async def registrar_ejecucion(self, tarea: dict) -> None:
        """Insert o re-intento: fija en_ejecucion e incrementa `intentos`."""
        if not self.activo:
            return
        try:
            r = await self._request(
                "GET", f"tareas?task_id=eq.{tarea['task_id']}&select=intentos"
            )
            filas = r.json() if r.status_code == 200 else []
            intentos = (filas[0]["intentos"] + 1) if filas else 1
            fila = {
                "task_id": tarea["task_id"],
                "departamento": tarea["departamento"],
                "objetivo": tarea["objetivo"],
                "contexto": tarea["contexto"],
                "criterios": tarea["criterios_aceptacion"],
                "estado": "en_ejecucion",
                "intentos": intentos,
                "intentos_max": tarea["limites"]["intentos_max"],
                "updated_at": "now()",
            }
            await self._upsert(fila)
        except httpx.HTTPError:
            pass  # best-effort: el estado nunca tumba la tarea

    async def _upsert(self, fila: dict) -> None:
        url = f"{self._url}/rest/v1/tareas?on_conflict=task_id"
        headers = self._headers() | {"Prefer": "resolution=merge-duplicates"}
        if self._http is not None:
            await self._http.post(url, headers=headers, json=fila)
            return
        async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
            await client.post(url, headers=headers, json=fila)

    async def transicionar(self, task_id: str, estado: str, **campos: Any) -> None:
        """PATCH de estado (+resultado/veredicto). Recorta diffs para el jsonb."""
        if not self.activo:
            return
        cuerpo: dict[str, Any] = {"estado": estado, "updated_at": "now()"}
        for k, v in campos.items():
            if isinstance(v, dict) and isinstance(v.get("diff"), str):
                v = {**v, "diff": v["diff"][:DIFF_MAX_JSONB]}
            cuerpo[k] = v
        try:
            await self._request("PATCH", f"tareas?task_id=eq.{task_id}", json=cuerpo)
        except httpx.HTTPError:
            pass  # best-effort
