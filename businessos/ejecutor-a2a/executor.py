"""executor.py — el AgentExecutor A2A del Ejecutor (PRP-006 Fase 2 → PRP-010: la cola).

Ya NO construye software aqui: **valida y ENCOLA**, y responde en segundos
`{encolada, posicion, en_ejecucion, cola}`. El trabajo lo hace el WORKER (uno solo, serial)
leyendo la cola de `tareas` — ver `worker.py` y `pipeline.py`.

Por que cambio (PRP-010): el bot se quedaba BLOQUEADO 15+ min esperando el veredicto, y si
dos personas de #dep-desarrollo pedian features a la vez se lanzaban dos motores + dos
`npm build` en un servidor de 8 GB. Ahora la peticion se acepta (o se rechaza) al instante y
la ejecucion se serializa.

Honestidad (lo que mas importa aqui): **jamas se dice "encolada" sin fila escrita**. El
encolado es autoritativo — si Supabase falla, la tarea A2A falla con razon clara. Mentirle
al equipo es peor que fallar (`cola.py`, invariante 1).

Fronteras (SPEC-trio §2), intactas: no decide QUE hacer, no se auto-aprueba.
"""
from __future__ import annotations

import asyncio
import os

from a2a.helpers import get_data_parts, new_data_part, new_task, new_text_part
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.server.tasks import TaskUpdater
from a2a.types import TaskState

from cola import Cola, ColaError, crear_cola
from contrato import ContratoInvalido, validar_tarea


class EjecutorA2A(AgentExecutor):
    """Solo encola. La cola es inyectable (tests con `ColaMemoria`, cero red)."""

    def __init__(self, cola: Cola | None = None) -> None:
        self._cola = cola or crear_cola(os.environ.get("EJECUTOR_COLA"))

    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        # El encolado es corto, pero una vez empezado se termina: un cliente que cuelga a
        # media escritura no debe dejar la fila a medias (hermano del shield del PR #37,
        # que ahora protege al worker — que ya no depende de ninguna conexion HTTP).
        await asyncio.shield(asyncio.ensure_future(self._encolar(context, event_queue)))

    async def _encolar(self, context: RequestContext, event_queue: EventQueue) -> None:
        # Gotcha SDK v1: el Task va encolado ANTES del primer status update.
        if context.current_task is None:
            await event_queue.enqueue_event(
                new_task(
                    context.task_id,
                    context.context_id,
                    TaskState.TASK_STATE_SUBMITTED,
                    history=[context.message] if context.message else None,
                )
            )
        updater = TaskUpdater(event_queue, context.task_id, context.context_id)
        await updater.start_work()

        datas = get_data_parts(context.message.parts) if context.message else []
        try:
            if len(datas) != 1:
                raise ContratoInvalido("envia UNA tarea por mensaje (un DataPart)")
            tarea = validar_tarea(datas[0])
        except ContratoInvalido as exc:
            await self._fallar(updater, f"tarea invalida: {exc}")
            return

        try:
            cola = await self._cola.encolar(tarea)
        except ColaError as exc:
            # NO se responde "encolada" si la fila no se escribio.
            await self._fallar(updater, f"cola: {exc}")
            return

        print(
            f"[ejecutor] encolada {tarea['task_id']} en posicion {cola.get('posicion')} "
            f"(en ejecucion: {cola.get('en_ejecucion') or 'nada'})",
            flush=True,
        )
        await updater.add_artifact(
            [new_data_part({
                "encolada": True,
                "task_id": tarea["task_id"],
                "posicion": cola.get("posicion"),
                "en_ejecucion": cola.get("en_ejecucion"),
                "cola": cola.get("cola", []),
            })],
            name="encolada",
        )
        await updater.complete()

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        updater = TaskUpdater(event_queue, context.task_id, context.context_id)
        await updater.cancel()

    @staticmethod
    async def _fallar(updater: TaskUpdater, razon: str) -> None:
        # El log LOCAL va primero: la razon viaja por A2A, y si el cliente ya se fue se
        # pierde. Sin esta linea cada fallo es una autopsia a ciegas (aprendido en carne
        # propia el 2026-07-12: media hora de forense por una linea que no estaba).
        print(f"[ejecutor] FALLO {updater.task_id}: {razon}", flush=True)
        await updater.failed(updater.new_agent_message(parts=[new_text_part(razon)]))
