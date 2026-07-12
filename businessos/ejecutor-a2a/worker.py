"""worker.py — el que SI construye (PRP-010). UNO SOLO, en serie.

Vive dentro del proceso del Ejecutor (asyncio task del `lifespan`), no en un contenedor
aparte: necesita los mismos mounts (`/repo`, `/workspace`) y, sobre todo, ser el MISMO
escritor de `tareas`. Un contenedor hermano seria un segundo escritor — justo el invariante
que nos ha evitado las carreras desde la Fase 6.

Ciclo (concurrencia 1, de verdad):
    al arrancar → recuperar huerfanas (lo que quedo `en_ejecucion` no lo corre nadie)
    loop:
      1. ¿hay margen de presupuesto?   (tokens, no dolares — ver presupuesto.py)
      2. reclamar la 1a de la cola      (CAS: si otro se la llevo, no pasa nada)
      3. refrescar master               (serial ⇒ cada tarea sale del master mas fresco)
      4. pipeline: worktree → motor → Supervisor → estado final
      5. dormir un poco y repetir

Nunca dos motores a la vez: hay UN worker y este bucle es secuencial. Ese es todo el punto
(el cx33 tiene 8 GB y cada tarea son un CLI + `npm build` + Playwright, dos veces).
"""
from __future__ import annotations

import asyncio
import os
from pathlib import Path

import workspace as ws
from cola import Cola, ColaError, ColaMemoria, crear_cola
from engine import crear_engine
from estado import EstadoTareas
from pipeline import Pipeline, PipelineError
from presupuesto import Presupuesto
from supervisor_cliente import SupervisorCliente

DEFAULT_WORKSPACE = "/workspace"
PAUSA_S = 5.0  # cola vacia o sin margen: no martillear Supabase


class Worker:
    """Todo inyectable: los tests corren el bucle completo sin red, sin tokens y sin git."""

    def __init__(
        self,
        cola: Cola | None = None,
        pipeline: Pipeline | None = None,
        estado: EstadoTareas | None = None,
        presupuesto: Presupuesto | None = None,
        repo: Path | None = None,
        pausa_s: float = PAUSA_S,
    ) -> None:
        self._cola = cola or crear_cola(os.environ.get("EJECUTOR_COLA"))
        self._estado = estado or EstadoTareas()
        self._presupuesto = presupuesto or Presupuesto()
        self._repo = repo or Path(os.environ.get("TRIO_REPO", "/repo"))
        self._pausa_s = pausa_s
        self._pipeline = pipeline or Pipeline(
            engine=crear_engine(os.environ.get("EJECUTOR_ENGINE", "mock")),
            supervisor=SupervisorCliente(),
            estado=self._estado,
            repo=self._repo,
            workspace_root=Path(os.environ.get("TRIO_WORKSPACE", DEFAULT_WORKSPACE)),
        )
        self._corriendo = False
        self._sin_margen = False  # para no repetir el aviso de "presupuesto agotado"
        # Concurrencia 1 ESTRUCTURAL, no por convencion: aunque alguien llame `un_ciclo` en
        # paralelo (un bug futuro, un test, un segundo lifespan), jamas habra dos motores +
        # dos `npm build` peleandose los 8 GB. El CAS de la cola protege de OTRO proceso;
        # esto protege de nosotros mismos dentro del proceso.
        self._turno = asyncio.Lock()

    async def arrancar(self) -> None:
        """Bucle infinito. Lo lanza el lifespan de app.py como una asyncio task."""
        self._corriendo = True
        try:
            recuperadas = await self._cola.recuperar_huerfanas()
            if recuperadas:
                print(f"[worker] huerfanas recuperadas: {', '.join(recuperadas)}", flush=True)
        except ColaError as exc:
            print(f"[worker] no se pudieron recuperar huerfanas: {exc}", flush=True)

        print("[worker] arrancado (concurrencia 1, serial)", flush=True)
        while self._corriendo:
            try:
                trabajo = await self.un_ciclo()
            except Exception as exc:  # el bucle NUNCA muere: si muere, la cola se congela
                print(f"[worker] error inesperado en el ciclo: {type(exc).__name__}: {exc}",
                      flush=True)
                trabajo = False
            if not trabajo:
                await asyncio.sleep(self._pausa_s)

    def parar(self) -> None:
        self._corriendo = False

    async def un_ciclo(self) -> bool:
        """Un pick + su ejecucion, en exclusiva. True si hubo trabajo (para no dormir)."""
        async with self._turno:
            return await self._un_ciclo()

    async def _un_ciclo(self) -> bool:
        margen, motivo = await self._presupuesto.hay_margen()
        if not margen:
            if not self._sin_margen:  # avisar UNA vez, no en cada vuelta del bucle
                print(f"[worker] NO se saca tarea — {motivo}", flush=True)
                self._sin_margen = True
            return False
        self._sin_margen = False

        try:
            tarea = await self._cola.reclamar()
        except ColaError as exc:
            print(f"[worker] no se pudo reclamar: {exc}", flush=True)
            return False
        if tarea is None:
            return False

        task_id = tarea["task_id"]
        print(f"[worker] ejecutando {task_id} ({motivo})", flush=True)
        # Serial ⇒ cada tarea puede arrancar del master MAS FRESCO (con lo ya mergeado).
        # Es la mitigacion barata del choque entre ramas: lo que quede sera un conflicto en
        # GitHub, donde lo ve un humano — el trio detecta y escala, no resuelve merges.
        ws.refrescar_master(self._repo)

        try:
            salida = await self._pipeline.procesar(tarea)
        except PipelineError as exc:
            await self._fallar(task_id, exc)
            return True
        finally:
            if isinstance(self._cola, ColaMemoria):
                self._cola.soltar()

        veredicto = salida["veredicto"]["veredicto"]
        print(f"[worker] {task_id} → {veredicto}", flush=True)
        return True

    async def _fallar(self, task_id: str, exc: PipelineError) -> None:
        """Un fallo de la tarea la escala; un fallo de INFRAESTRUCTURA la devuelve a la cola.

        La diferencia importa: si el Supervisor esta caido, escalar la tarea a Elisa seria
        culpar al trabajo de un problema nuestro (justo el pecado del 2026-07-12).
        """
        destino = "escalada" if exc.escalar else "recibida"
        print(f"[worker] {task_id} FALLO ({exc.razon}) → {destino}", flush=True)
        await self._estado.transicionar(task_id, destino, **(
            {} if exc.escalar else {"encolada_en": "now()"}  # vuelve al final de la cola
        ))
