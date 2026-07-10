"""executor.py — puente determinista de leads (Fase 9, departamento adquisicion).

El executor NO es un LLM: normaliza el interes recibido (DataPart estructurado
o texto libre), lo persiste en `leads` y devuelve {lead_id, etapa, oferta,
disclaimer}. Sin motor, sin generacion: la oferta es la estatica aprobada
(oferta.py). Entrada invalida o lead no persistible (con Supabase configurado)
-> tarea `failed` con razon clara; nunca un lead perdido en silencio.

Fronteras (las mismas de la card): no cierra tratos, no fija precios finales,
no firma, no envia correos. Un humano da seguimiento a cada lead.
"""
from __future__ import annotations

import uuid

from a2a.helpers import get_data_parts, get_text_parts, new_data_part, new_task, new_text_part
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.server.tasks import TaskUpdater
from a2a.types import TaskState

from leads import LeadsError, LeadsStore
from oferta import DISCLAIMER, OFERTA

MENSAJE_MAX = 4_000


class EntradaInvalida(ValueError):
    """El mensaje A2A no forma un lead registrable."""


def lead_desde_mensaje(message) -> dict:
    """Parts del mensaje -> lead normalizado, sin interpretar con IA.

    - DataPart (uno): {"empresa", "contacto", "mensaje"?, "presupuesto"?} —
      empresa y contacto obligatorios (un lead incontactable no es un lead).
    - TextPart(s): texto libre entero como `mensaje` (el contacto suele venir
      dentro; un humano lo revisa igual que todo lead).
    """
    datas = get_data_parts(message.parts)
    if len(datas) > 1:
        raise EntradaInvalida("envia UN lead por mensaje (un solo DataPart)")
    if datas:
        d = datas[0]
        if not isinstance(d, dict):
            raise EntradaInvalida("el DataPart debe ser un objeto JSON")
        empresa = d.get("empresa")
        contacto = d.get("contacto")
        if not (isinstance(empresa, str) and empresa.strip()):
            raise EntradaInvalida('falta "empresa" (string no vacio)')
        if not (isinstance(contacto, str) and contacto.strip()):
            raise EntradaInvalida('falta "contacto" (string no vacio: email u otro canal)')
        mensaje = d.get("mensaje", "")
        if not isinstance(mensaje, str):
            raise EntradaInvalida('"mensaje" debe ser string')
        presupuesto = d.get("presupuesto")
        if presupuesto is not None and not isinstance(presupuesto, (int, float)):
            raise EntradaInvalida('"presupuesto" debe ser numero')
        return {
            "empresa": empresa.strip(),
            "contacto": contacto.strip(),
            "mensaje": mensaje.strip()[:MENSAJE_MAX],
            "datos": {k: v for k, v in d.items() if k not in ("empresa", "contacto", "mensaje")},
        }

    texto = "\n".join(t.strip() for t in get_text_parts(message.parts) if t.strip())
    if not texto:
        raise EntradaInvalida(
            "mensaje vacio: envia un DataPart {empresa, contacto, mensaje?} o texto libre"
        )
    return {"empresa": "", "contacto": "", "mensaje": texto[:MENSAJE_MAX], "datos": {}}


class VentasExecutor(AgentExecutor):
    """Puente A2A -> tabla leads. `store` inyectable para tests."""

    def __init__(self, store: LeadsStore | None = None) -> None:
        self._store = store if store is not None else LeadsStore()

    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
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

        try:
            lead = lead_desde_mensaje(context.message)
        except EntradaInvalida as exc:
            await self._fallar(updater, f"lead invalido: {exc}")
            return

        lead_id = f"lead-{uuid.uuid4()}"
        fila = {
            "lead_id": lead_id,
            "origen": "a2a",
            "empresa": lead["empresa"],
            "contacto": lead["contacto"],
            "mensaje": lead["mensaje"],
            "etapa": "nuevo",
            "datos": lead["datos"],
        }
        try:
            persistido = await self._store.insertar(fila)
        except LeadsError as exc:
            # Fallo VISIBLE: mejor un task failed reintentable que un lead perdido.
            await self._fallar(updater, str(exc))
            return

        await updater.add_artifact(
            [new_data_part({
                "lead_id": lead_id,
                "etapa": "nuevo",
                "persistido": persistido,
                "oferta": OFERTA,
                "disclaimer": DISCLAIMER,
            })],
            name="lead-registrado",
        )
        await updater.complete()

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        updater = TaskUpdater(event_queue, context.task_id, context.context_id)
        await updater.cancel()

    @staticmethod
    async def _fallar(updater: TaskUpdater, razon: str) -> None:
        await updater.failed(updater.new_agent_message(parts=[new_text_part(razon)]))
