"""executor.py — puente A2A del buzon (SPEC-buzon-a2a §2).

Dos acciones, dos actores del diseño:
  - "leer" (A2, lector en cuarentena): devuelve salida TIPADA del hilo con
    referencias simbolicas (ids) y extractos SANEADOS. Nunca HTML crudo.
  - "redactar" (A3, redactor privilegiado): motor pluggable (plantilla
    determinista por defecto) produce un borrador sobre estructura; los 11
    gates de politicas.py corren SIEMPRE; un gate CRITICO en rojo →
    estado 'rechazado_gates' (el borrador ni llega a la bandeja de A5).

Este servicio NO tiene credenciales de correo y NO envia. La firma humana
(A5) va por la UI a aprobaciones_salientes; el envio es de enviar-salientes.py.
"""
from __future__ import annotations

import hashlib
import os
from dataclasses import asdict
from datetime import datetime, timezone

from a2a.helpers import get_data_parts, new_data_part, new_task, new_text_part
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.server.tasks import TaskUpdater
from a2a.types import TaskState

import politicas
import redactor as redactor_mod
from correos import BuzonError, BuzonStore

EXTRACTO_MAX = 500
CUARENTENA_MAX_INTERCAMBIOS = 2  # desconocidos: 2 intercambios y escala a humano


class EntradaInvalida(ValueError):
    """El mensaje A2A no forma una peticion valida del buzon."""


def peticion_desde_mensaje(message) -> dict:
    """Parts → peticion tipada. UN DataPart con {"accion": "leer"|"redactar", ...}."""
    datas = get_data_parts(message.parts)
    if len(datas) != 1 or not isinstance(datas[0], dict):
        raise EntradaInvalida("envia UN DataPart objeto: {accion: leer|redactar, ...}")
    d = datas[0]
    accion = d.get("accion")
    if accion == "leer":
        if not (isinstance(d.get("hilo_id"), str) and d["hilo_id"].strip()):
            raise EntradaInvalida('leer requiere "hilo_id" (string no vacio)')
        return {"accion": "leer", "hilo_id": d["hilo_id"].strip()}
    if accion == "redactar":
        if not (isinstance(d.get("correo_entrante_id"), str) and d["correo_entrante_id"].strip()):
            raise EntradaInvalida('redactar requiere "correo_entrante_id" (string no vacio)')
        clase = d.get("clase", "acuse_recibo")
        if not isinstance(clase, str):
            raise EntradaInvalida('"clase" debe ser string')
        return {"accion": "redactar",
                "correo_entrante_id": d["correo_entrante_id"].strip(),
                "clase": clase.strip() or "acuse_recibo"}
    raise EntradaInvalida('accion desconocida: usa "leer" o "redactar"')


def _extracto(entrante: dict) -> dict:
    """Vista en cuarentena de UN entrante: tipada, saneada, con referencias."""
    meta = entrante.get("saneado_meta") or {}
    return {
        "id": entrante.get("id"),
        "remitente": entrante.get("remitente", ""),
        "asunto": entrante.get("asunto", ""),
        "extracto": (entrante.get("cuerpo_saneado") or "")[:EXTRACTO_MAX],
        "dmarc_alineado": bool(entrante.get("dmarc_alineado")),
        "remitente_conocido": bool(entrante.get("remitente_conocido")),
        "eliminados": meta.get("eliminados", []),
    }


class BuzonExecutor(AgentExecutor):
    """`store` y `motor` inyectables para tests (MockTransport / plantilla)."""

    def __init__(self, store: BuzonStore | None = None, motor=None) -> None:
        self._store = store if store is not None else BuzonStore()
        self._motor = motor if motor is not None else redactor_mod.RedactorPlantilla()

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
            if peticion["accion"] == "leer":
                await self._leer(updater, peticion)
            else:
                await self._redactar(updater, peticion)
        except BuzonError as exc:
            # Fallo VISIBLE y reintentable; nunca un borrador perdido en silencio.
            await self._fallar(updater, str(exc))

    async def _leer(self, updater: TaskUpdater, peticion: dict) -> None:
        entrantes = await self._store.hilo(peticion["hilo_id"])
        if not entrantes:
            await self._fallar(updater, f"hilo {peticion['hilo_id']!r} sin correos")
            return
        await updater.add_artifact(
            [new_data_part({
                "hilo_id": peticion["hilo_id"],
                "correos": [_extracto(e) for e in entrantes],
            })],
            name="hilo-en-cuarentena",
        )
        await updater.complete()

    async def _redactar(self, updater: TaskUpdater, peticion: dict) -> None:
        entrante = await self._store.entrante(peticion["correo_entrante_id"])
        if entrante is None:
            await self._fallar(updater, "correo_entrante_id inexistente")
            return
        buzon = await self._store.buzon(entrante["buzon_id"])
        if buzon is None or not buzon.get("activo"):
            await self._fallar(updater, "buzon inexistente o inactivo")
            return

        modo = buzon.get("modo_contraparte", "abierto_cuarentena")
        conocido = bool(entrante.get("remitente_conocido"))
        if modo == "cerrado" and not conocido:
            # Carpeta de revision humana: cero procesamiento por agente (SPEC §4.1).
            await self._fallar(
                updater, "remitente desconocido en buzon cerrado: revision humana")
            return

        clases = [str(c) for c in (buzon.get("clases_permitidas") or [])]
        if clases and peticion["clase"] not in clases:
            await self._fallar(
                updater, f"clase {peticion['clase']!r} fuera de clases_permitidas")
            return

        enviados_hilo = await self._store.enviados_en_hilo(entrante["hilo_id"])
        if not conocido and modo == "abierto_cuarentena" \
                and enviados_hilo >= CUARENTENA_MAX_INTERCAMBIOS:
            await self._fallar(
                updater,
                f"cuarentena: {enviados_hilo} intercambios con desconocido — "
                "escala a un humano nombrado (SPEC §4.1)")
            return

        borrador = self._motor.redactar(entrante, buzon, peticion["clase"])
        ctx = await self._contexto_gates(entrante, buzon, enviados_hilo)
        resultados = politicas.evaluar(borrador, ctx)
        criticos = politicas.criticos_en_rojo(resultados)
        estado = "rechazado_gates" if criticos else "pendiente_aprobacion"
        ahora = datetime.now(timezone.utc).isoformat()

        fila = {
            "buzon_id": buzon["id"],
            "hilo_id": borrador["hilo_id"],
            "en_respuesta_a": entrante["id"],
            "destinatarios": borrador["destinatarios"],
            "asunto": borrador["asunto"],
            "cuerpo": borrador["cuerpo"],
            "cabeceras": borrador["cabeceras"],
            "adjuntos": borrador["adjuntos"],
            "clase": peticion["clase"],
            "automatico": borrador["automatico"],
            "estado": estado,
            "gates": [asdict(r) for r in resultados],
            "sha256": hashlib.sha256(borrador["cuerpo"].encode()).hexdigest(),
            "politica": {"modo": modo, "clase": peticion["clase"],
                         "cuota_hora": buzon.get("cuota_hora"),
                         "cuota_hilo": buzon.get("cuota_hilo"),
                         "remitente_conocido": conocido},
            "historial": [{"de": "borrador", "a": estado, "evento": "gates",
                           "actor": "buzon-a2a", "at": ahora,
                           "detalle": f"{len(criticos)} critico(s) en rojo"}],
        }
        saliente_id = await self._store.insertar_saliente(fila)
        await self._store.bitacora(
            "borrador", {"estado": estado, "clase": peticion["clase"],
                         "criticos_rojos": [r.gate for r in criticos]},
            buzon_id=buzon["id"], hilo_id=borrador["hilo_id"], correo_id=saliente_id)

        await updater.add_artifact(
            [new_data_part({
                "correo_saliente_id": saliente_id,
                "persistido": saliente_id is not None,
                "estado": estado,
                "gates": [asdict(r) for r in resultados],
            })],
            name="borrador-evaluado",
        )
        await updater.complete()

    async def _contexto_gates(self, entrante: dict, buzon: dict,
                              enviados_hilo: int) -> dict:
        participantes = {buzon.get("direccion", ""), entrante.get("remitente", "")}
        for e in await self._store.hilo(entrante["hilo_id"]):
            participantes.add(e.get("remitente", ""))
            dest = e.get("destinatarios") or {}
            participantes.update(dest.get("to") or [])
            participantes.update(dest.get("cc") or [])
        return {
            "hilo_id": entrante["hilo_id"],
            "participantes_hilo": sorted(p for p in participantes if p),
            "dominios_institucionales": buzon.get("dominios_enlaces") or [],
            "catalogo_adjuntos": [],  # la plantilla no adjunta; el catalogo llega con el motor real
            "pii_otros_hilos": [],    # A2/A3 solo cargan UN hilo: sin PII cruzada por construccion
            "leyenda_divulgacion": redactor_mod.leyenda(),
            "canario": os.environ.get("BUZON_CANARIO", ""),
            "enviados_ultima_hora": await self._store.enviados_ultima_hora(buzon["id"]),
            "enviados_en_hilo": enviados_hilo,
            "cuota_hora": buzon.get("cuota_hora"),
            "cuota_hilo": buzon.get("cuota_hilo"),
            "pausa_global": await self._store.pausa_global(),
        }

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        updater = TaskUpdater(event_queue, context.task_id, context.context_id)
        await updater.cancel()

    @staticmethod
    async def _fallar(updater: TaskUpdater, razon: str) -> None:
        await updater.failed(updater.new_agent_message(parts=[new_text_part(razon)]))
