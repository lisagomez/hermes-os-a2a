"""contratos_sc.py — registro de fabricaciones en la tabla `contratos_sc` (PRP-013 F5).

El Ejecutor es el escritor de la transicion `fabricando`: al fabricar un paquete
el FabricPaqueteEngine deja aqui la fila con la spec confirmada, el manifest, el
hash del arbol (G5), las banderas G1 y el lineage `origen` (gobernanza-ciclo-de-
vida §2). Los demas estados los escriben otros actores (red efimera → host-job;
aprobado/rechazado → Mission Control; desplegado → desplegar-chaincode.py).

Best-effort que NO tumba la fabricacion, pero JAMAS silencioso (aprendizaje
2026-07-13: un best-effort que nadie loguea es un fallo invisible): todo fallo
se imprime a stderr con el task_id.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys

import httpx

TIMEOUT_S = 10.0


def spec_sha256(spec_normalizada: dict) -> str:
    """Hash canonico de la spec (lineage): JSON ordenado y compacto."""
    canon = json.dumps(spec_normalizada, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canon.encode("utf-8")).hexdigest()


class RegistroContratosSC:
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

    async def registrar_fabricacion(
        self,
        tarea: dict,
        manifest: dict,
        banderas: list[dict],
        spec_normalizada: dict,
    ) -> None:
        """Upsert por task_id de la fila `fabricando` (reintentos re-registran)."""
        if not self.activo:
            print(
                f"[contratos_sc] sin credenciales Supabase: fabricacion de "
                f"{tarea.get('task_id')} NO registrada en contratos_sc",
                file=sys.stderr,
            )
            return
        try:
            await self._registrar(tarea, manifest, banderas, spec_normalizada)
        except Exception as e:  # noqa: BLE001 — canal lateral: jamas tumba la tarea
            print(
                f"[contratos_sc] fallo al registrar {tarea.get('task_id')}: {e!r}",
                file=sys.stderr,
            )

    async def _registrar(
        self,
        tarea: dict,
        manifest: dict,
        banderas: list[dict],
        spec_normalizada: dict,
    ) -> None:
        contexto = tarea.get("contexto") or {}
        fila = {
            "task_id": tarea["task_id"],
            "solicitante": str(contexto.get("solicitante") or "desconocido"),
            "spec": contexto.get("sc_spec"),
            "origen": {
                "task_id": tarea["task_id"],
                "spec_sha256": spec_sha256(spec_normalizada),
                "chat": contexto.get("origen") or {},
            },
            "plantilla": manifest["plantilla"],
            "manifest": manifest,
            "banderas": banderas,
            "hash_paquete": manifest["paquete_sha256"],
            "canal_destino": manifest.get("canal_destino"),
            "estado": "fabricando",
            "updated_at": "now()",
        }
        url = f"{self._url}/rest/v1/contratos_sc?on_conflict=task_id"
        headers = {
            "apikey": self._key,
            "Authorization": f"Bearer {self._key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates",
        }
        if self._http is not None:
            r = await self._http.post(url, headers=headers, json=fila)
        else:
            async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
                r = await client.post(url, headers=headers, json=fila)
        if r.status_code >= 400:
            print(
                f"[contratos_sc] Supabase respondio {r.status_code} al "
                f"registrar {tarea['task_id']}: {r.text[:200]}",
                file=sys.stderr,
            )
