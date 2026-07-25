"""cola.py — LA COLA del trio (PRP-010): la fila `recibida` de `tareas` ES la peticion.

Dos implementaciones tras la MISMA interfaz, igual que el motor (`engine.py`):
  - `ColaSupabase`: la de verdad (PostgREST + service_role). Durable: sobrevive a un
    `docker restart`, que es medio motivo de que la cola exista.
  - `ColaMemoria`: dev y tests, sin red ni credenciales (los 219 tests no tienen Supabase).

Invariantes que este modulo defiende (no son adorno: cada uno costo sangre):

1. **El encolado es AUTORITATIVO.** `estado.py` traga los errores HTTP a proposito ("el
   estado nunca tumba la tarea") porque alli el estado es trazabilidad. Aqui NO: la fila
   ES la tarea. Si el INSERT falla y respondemos "encolada, posicion 3", le mentimos al
   equipo y el trabajo no existe. Por eso `encolar()` LEVANTA `ColaError`.

2. **Un escritor por fila, refinado.** La fila en `recibida` la posee la COLA (la crea el
   `execute` del Ejecutor; la reordena/cancela el host-job de Elisa). Desde `en_ejecucion`
   la posee el WORKER. El claim es un compare-and-swap (`estado=eq.recibida`): si dos
   procesos compiten (rebuild solapado, un `docker run` a mano), solo uno se la lleva —
   nunca dos motores sobre la misma tarea.

3. **La fila basta para ejecutar.** El worker corre MINUTOS despues, cuando el mensaje A2A
   ya no existe: guarda el `payload` completo (limites incluidos). Sin `max_turns` en la
   fila, la tarea volveria al techo de 40 turnos que mato mission-control-2026-0001.

4. **Un reintento va al FINAL de la cola** (`encolada_en = now()`): en serie, una tarea que
   falla 3 veces no puede comerse tres turnos seguidos mientras cinco personas esperan.
"""
from __future__ import annotations

import os
from typing import Any, Protocol

import httpx

TIMEOUT_S = 10.0
ESTADO_COLA = "recibida"
ESTADO_EJECUTANDO = "en_ejecucion"
# Los DOS estados "en vuelo": los escribe solo el worker, asi que una fila en cualquiera
# de ellos tras un arranque es una huerfana (ver recuperar_huerfanas).
ESTADO_REVISION = "en_revision"
# Orden del pick: prioridad primero (solo Elisa la toca), luego FIFO puro.
ORDEN_COLA = "prioridad.desc,encolada_en.asc"


class ColaError(RuntimeError):
    """No se pudo encolar/reclamar. El mensaje dice exactamente que fallo."""


class Cola(Protocol):
    async def encolar(self, tarea: dict) -> dict: ...
    async def estado_cola(self) -> dict: ...
    async def reclamar(self) -> dict | None: ...
    async def recuperar_huerfanas(self) -> list[str]: ...


def _fila_de(tarea: dict) -> dict:
    """La fila que representa a la tarea en la cola. `payload` es la verdad ejecutable."""
    return {
        "task_id": tarea["task_id"],
        "departamento": tarea["departamento"],
        "objetivo": tarea["objetivo"],
        "contexto": tarea["contexto"],
        "criterios": tarea["criterios_aceptacion"],  # denormalizado: snapshot/dashboard
        "payload": tarea,  # <- lo que el worker ejecutara (limites, observaciones, todo)
        "estado": ESTADO_COLA,
        "intentos_max": tarea["limites"]["intentos_max"],
        "encolada_en": "now()",  # un reintento re-encolado va al FINAL (FIFO justo)
        "updated_at": "now()",
    }


class ColaSupabase:
    """La cola real. Todo error de red/HTTP es un ColaError: aqui no se miente."""

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

    def _headers(self, extra: dict[str, str] | None = None) -> dict[str, str]:
        h = {
            "apikey": self._key,
            "Authorization": f"Bearer {self._key}",
            "Content-Type": "application/json",
        }
        return h | (extra or {})

    async def _pedir(self, metodo: str, path: str, **kw) -> httpx.Response:
        url = f"{self._url}/rest/v1/{path}"
        try:
            if self._http is not None:
                r = await self._http.request(metodo, url, **kw)
            else:
                async with httpx.AsyncClient(timeout=TIMEOUT_S) as c:
                    r = await c.request(metodo, url, **kw)
        except httpx.HTTPError as exc:
            raise ColaError(f"{metodo} {path}: {type(exc).__name__}: {exc}") from exc
        if r.status_code >= 300:
            raise ColaError(f"{metodo} {path}: HTTP {r.status_code}: {r.text[:200]}")
        return r

    async def encolar(self, tarea: dict) -> dict:
        """Escribe la fila (autoritativo) y devuelve el estado de la cola con su posicion."""
        if not self.activo:
            raise ColaError("cola sin credenciales (SUPABASE_URL/SERVICE_ROLE_KEY)")
        await self._pedir(
            "POST",
            "tareas?on_conflict=task_id",
            headers=self._headers({"Prefer": "resolution=merge-duplicates"}),
            json=_fila_de(tarea),
        )
        cola = await self.estado_cola()
        cola["posicion"] = next(
            (f["pos"] for f in cola["cola"] if f["task_id"] == tarea["task_id"]), None
        )
        return cola

    async def estado_cola(self) -> dict:
        """Lo que se le puede contar al equipo: quien corre y quien espera, en orden."""
        r = await self._pedir(
            "GET",
            f"tareas?estado=eq.{ESTADO_COLA}&select=task_id,objetivo,prioridad"
            f"&order={ORDEN_COLA}",
            headers=self._headers(),
        )
        cola = [
            {"pos": i, "task_id": f["task_id"], "objetivo": f.get("objetivo", ""),
             "prioridad": f.get("prioridad", 0)}
            for i, f in enumerate(r.json(), start=1)
        ]
        r2 = await self._pedir(
            "GET",
            f"tareas?estado=eq.{ESTADO_EJECUTANDO}&select=task_id&limit=1",
            headers=self._headers(),
        )
        filas = r2.json()
        return {"cola": cola, "en_ejecucion": filas[0]["task_id"] if filas else None}

    async def reclamar(self) -> dict | None:
        """Saca la 1a de la cola con compare-and-swap. None si no hay o si otro se la llevo."""
        if not self.activo:
            raise ColaError("cola sin credenciales")
        r = await self._pedir(
            "GET",
            f"tareas?estado=eq.{ESTADO_COLA}&select=task_id,payload,intentos"
            f"&order={ORDEN_COLA}&limit=1",
            headers=self._headers(),
        )
        filas = r.json()
        if not filas:
            return None
        fila = filas[0]

        # CAS: solo se la lleva quien la ve TODAVIA en `recibida`.
        r2 = await self._pedir(
            "PATCH",
            f"tareas?task_id=eq.{fila['task_id']}&estado=eq.{ESTADO_COLA}",
            headers=self._headers({"Prefer": "return=representation"}),
            json={
                "estado": ESTADO_EJECUTANDO,
                "intentos": (fila.get("intentos") or 0) + 1,
                "updated_at": "now()",
            },
        )
        filas_patch = r2.json()
        if not filas_patch:  # 0 filas => otro proceso se la llevo primero
            return None
        payload = fila.get("payload")
        if not payload:
            raise ColaError(
                f"{fila['task_id']}: fila sin `payload` — no se puede ejecutar desde la fila "
                "(¿encolada por una version vieja del Ejecutor?)"
            )
        # El claim acaba de incrementar `intentos`. Se lo pasamos al worker para que, si el
        # fallo es TRANSITORIO (proveedor caido), pueda devolver el contador y NO gastar un
        # intento por algo que no es culpa de la tarea (2026-07-24). Clave privada (`_`):
        # la ignora todo consumidor del payload (motor, pipeline, contrato).
        payload["_intentos"] = filas_patch[0].get("intentos")
        return payload

    async def recuperar_huerfanas(self) -> list[str]:
        """Al arrancar: lo que quedo EN VUELO no lo corre nadie (el proceso murio).

        En vuelo son DOS estados, no uno (bug cazado por el smoke de runtime del
        2026-07-12): `en_ejecucion` (el motor trabajando) y `en_revision` (el Supervisor
        juzgando — la ventana MAS LARGA: minutos de build/tests, la que mas restarts
        pilla). Ambos los escribe solo el worker, asi que una fila ahi despues de un
        arranque es, por definicion, huerfana. Si se olvida `en_revision`, la tarea se
        queda en el LIMBO: nadie la ejecuta, no esta en la cola, y el equipo no se entera.

        Vuelve a la cola si le quedan intentos; si no, se escala (que alguien la mire).
        """
        if not self.activo:
            raise ColaError("cola sin credenciales")
        recuperadas: list[str] = []
        for estado_vuelo in (ESTADO_EJECUTANDO, ESTADO_REVISION):
            r = await self._pedir(
                "GET",
                f"tareas?estado=eq.{estado_vuelo}&select=task_id,intentos,intentos_max",
                headers=self._headers(),
            )
            for fila in r.json():
                agoto = (fila.get("intentos") or 0) >= (fila.get("intentos_max") or 3)
                destino = "escalada" if agoto else ESTADO_COLA
                cuerpo: dict[str, Any] = {"estado": destino, "updated_at": "now()"}
                if destino == ESTADO_COLA:
                    cuerpo["encolada_en"] = "now()"  # vuelve a la fila, no se cuela
                await self._pedir(
                    "PATCH",
                    f"tareas?task_id=eq.{fila['task_id']}&estado=eq.{estado_vuelo}",
                    headers=self._headers(),
                    json=cuerpo,
                )
                recuperadas.append(f"{fila['task_id']} ({estado_vuelo})→{destino}")
        return recuperadas


class ColaMemoria:
    """Cola en memoria para dev/tests. NO durable — jamas en runtime (por eso lo dice)."""

    def __init__(self) -> None:
        self._pendientes: list[dict] = []  # [{tarea, prioridad}] en orden de llegada
        self._en_ejecucion: str | None = None

    def _ordenada(self) -> list[dict]:
        return sorted(self._pendientes, key=lambda f: -f["prioridad"])  # estable = FIFO

    async def encolar(self, tarea: dict) -> dict:
        # Re-encolar el mismo task_id lo manda al FINAL (misma regla que ColaSupabase).
        self._pendientes = [f for f in self._pendientes if f["tarea"]["task_id"] != tarea["task_id"]]
        self._pendientes.append({"tarea": tarea, "prioridad": 0})
        cola = await self.estado_cola()
        cola["posicion"] = next(
            (f["pos"] for f in cola["cola"] if f["task_id"] == tarea["task_id"]), None
        )
        return cola

    async def estado_cola(self) -> dict:
        return {
            "cola": [
                {"pos": i, "task_id": f["tarea"]["task_id"],
                 "objetivo": f["tarea"].get("objetivo", ""), "prioridad": f["prioridad"]}
                for i, f in enumerate(self._ordenada(), start=1)
            ],
            "en_ejecucion": self._en_ejecucion,
        }

    async def reclamar(self) -> dict | None:
        orden = self._ordenada()
        if not orden:
            return None
        fila = orden[0]
        self._pendientes.remove(fila)
        self._en_ejecucion = fila["tarea"]["task_id"]
        return fila["tarea"]

    async def recuperar_huerfanas(self) -> list[str]:
        return []  # en memoria no hay huerfanas: si el proceso murio, la cola murio con el

    def soltar(self) -> None:
        """El worker avisa que termino (solo memoria: en Supabase lo dice el `estado`)."""
        self._en_ejecucion = None


def crear_cola(tipo: str | None = None) -> Cola:
    """Fabrica por env: COLA=supabase|memoria (default: supabase si hay credenciales)."""
    tipo = (tipo or os.environ.get("EJECUTOR_COLA") or "").lower()
    if tipo == "memoria":
        return ColaMemoria()
    if tipo == "supabase":
        return ColaSupabase()
    cola = ColaSupabase()  # default: la real si hay credenciales; si no, memoria (dev)
    return cola if cola.activo else ColaMemoria()
