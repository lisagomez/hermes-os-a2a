"""executor.py — puente A2A determinista del waterfall enrichment (App A).

Sin LLM: parsea el DataPart, consulta el gate del grafo (fail-closed), corre
la cascada y devuelve el artifact. Fallos VISIBLES siempre:
- entrada invalida            -> task failed con la razon exacta
- grafo caido                 -> task failed (nada corre sin gate LFPDPPP)
- lead inexistente (con BD)   -> task failed
- ledger no escribible        -> task failed (el costeo no se miente)

Fronteras (las mismas de la card): JAMAS escribe public.leads, no contacta a
nadie, no decide nada comercial; entrega hallazgos con procedencia + el
dictamen 69-B + el disclaimer del grafo.
"""
from __future__ import annotations

import re

from a2a.helpers import get_data_parts, new_data_part, new_task, new_text_part
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.server.tasks import TaskUpdater
from a2a.types import TaskState

from almacen import Almacen, AlmacenError
from cascada import CAMPOS_PRODUCIBLES, enriquecer
from denue import Denue
from gate_grafo import GateGrafo, GateGrafoError


class EntradaInvalida(ValueError):
    """El mensaje A2A no forma una peticion de enriquecimiento valida."""


# ventas-a2a genera "lead-{uuid4}"; el margen cubre ids legados razonables.
# Defensa en profundidad contra inyeccion PostgREST (el almacen ademas escapa
# todo valor con _q(); QA PR #210): jamas separadores de query (&, =, ?, #).
RE_LEAD_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$")


def peticion_desde_mensaje(message) -> dict:
    """DataPart -> {lead_id, campos, forzar, extras}. Solo entrada estructurada."""
    datas = get_data_parts(message.parts)
    if len(datas) != 1:
        raise EntradaInvalida(
            "envia UN DataPart {lead_id, campos?, rfc?, nombre?, apellido?, forzar?}"
        )
    d = datas[0]
    if not isinstance(d, dict):
        raise EntradaInvalida("el DataPart debe ser un objeto JSON")

    lead_id = d.get("lead_id")
    if not (isinstance(lead_id, str) and lead_id.strip()):
        raise EntradaInvalida('falta "lead_id" (string no vacio)')
    lead_id = lead_id.strip()
    if not RE_LEAD_ID.fullmatch(lead_id):
        raise EntradaInvalida(
            '"lead_id" invalido: solo letras/digitos/._:- (max 64, empieza alfanumerico)'
        )

    campos = d.get("campos", list(CAMPOS_PRODUCIBLES))
    if not (isinstance(campos, list) and campos
            and all(c in CAMPOS_PRODUCIBLES for c in campos)):
        raise EntradaInvalida(
            f'"campos" debe ser una lista no vacia dentro de {list(CAMPOS_PRODUCIBLES)} '
            "(el RFC no es producible: solo se valida el provisto)"
        )

    extras = {}
    for llave in ("rfc", "empresa", "contacto", "nombre", "apellido"):
        valor = d.get(llave)
        if valor is not None:
            if not isinstance(valor, str):
                raise EntradaInvalida(f'"{llave}" debe ser string')
            extras[llave] = valor.strip()

    forzar = d.get("forzar", False)
    if not isinstance(forzar, bool):
        raise EntradaInvalida('"forzar" debe ser booleano')

    return {"lead_id": lead_id, "campos": campos,
            "forzar": forzar, "extras": extras}


class EnriquecimientoExecutor(AgentExecutor):
    """Colaboradores inyectables para tests (gate, almacen, denue)."""

    def __init__(self, gate: GateGrafo | None = None,
                 almacen: Almacen | None = None,
                 denue: Denue | None = None) -> None:
        self._gate = gate if gate is not None else GateGrafo()
        self._almacen = almacen if almacen is not None else Almacen()
        self._denue = denue if denue is not None else Denue()

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
            peticion = peticion_desde_mensaje(context.message)
        except EntradaInvalida as exc:
            await self._fallar(updater, f"peticion invalida: {exc}")
            return

        try:
            evaluacion = await self._gate.consultar()
        except GateGrafoError as exc:
            await self._fallar(updater, str(exc))
            return

        lead = {"lead_id": peticion["lead_id"], "empresa": "",
                "contacto": "", "telefono": "", "datos": {}}
        try:
            if self._almacen.activo:
                fila = await self._almacen.leer_lead(peticion["lead_id"])
                if fila is None:
                    await self._fallar(
                        updater, f"lead {peticion['lead_id']} no existe en public.leads")
                    return
                lead.update(fila)
            # lo provisto inline manda sobre lo leido (el caller sabe mas fresco)
            for llave in ("empresa", "contacto"):
                if peticion["extras"].get(llave):
                    lead[llave] = peticion["extras"][llave]

            salida = await enriquecer(
                lead, peticion["extras"], peticion["campos"], peticion["forzar"],
                evaluacion, self._almacen, self._denue,
            )
        except AlmacenError as exc:
            # Ledger/BD no escribible = fallo del task, jamas un exito a medias.
            await self._fallar(updater, str(exc))
            return

        salida["gate_grafo"] = {
            c: {"estado": ev["estado"]}
            for c, ev in evaluacion["por_concepto"].items()
        }
        salida["disclaimer"] = evaluacion["disclaimer"]
        salida["fuentes"] = evaluacion["fuentes"]

        await updater.add_artifact(
            [new_data_part(salida)], name="lead-enriquecido",
        )
        await updater.complete()

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        updater = TaskUpdater(event_queue, context.task_id, context.context_id)
        await updater.cancel()

    @staticmethod
    async def _fallar(updater: TaskUpdater, razon: str) -> None:
        await updater.failed(updater.new_agent_message(parts=[new_text_part(razon)]))
