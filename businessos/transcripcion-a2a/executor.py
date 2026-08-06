"""executor.py — puente determinista de transcripcion (EG.CRM Hito 3).

El executor NO es un LLM: valida la peticion (DataPart estructurado), corre el
motor STT pluggable (stt.py), formatea la transcripcion literal (hablantes +
[mm:ss] + [inaudible] bajo umbral) y la persiste anclada al lead. Fidelidad,
no interpretacion: no resume, no opina, no completa lo dudoso.

Contrato de entrada (UN DataPart):
  {lead_id, audio_path, asesor, modalidad: visita|llamada,
   idioma?: es-MX, tipo_reunion?: discovery}
`audio_path` refiere a un archivo del volumen compartido (el audio no viaja
por JSON-RPC). Guardado fallido con Supabase configurado -> task failed
reintentable (la transcripcion ES el producto; nunca se pierde en silencio).
"""
from __future__ import annotations

import asyncio
from pathlib import Path

from a2a.helpers import get_data_parts, new_data_part, new_task, new_text_part
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.server.tasks import TaskUpdater
from a2a.types import TaskState

from stt import Segmento, crear_motor
from transcripciones import TranscripcionesError, TranscripcionesStore

MODALIDADES = ("visita", "llamada")
TIPOS_REUNION = ("discovery", "demo", "negociacion", "revision_tecnica", "cierre")
UMBRAL_INAUDIBLE = 0.5  # confianza bajo esto -> [inaudible], jamas se adivina


class EntradaInvalida(ValueError):
    """El mensaje A2A no forma una peticion de transcripcion valida."""


def peticion_desde_mensaje(message) -> dict:
    """Parts del mensaje -> peticion normalizada, sin interpretar con IA."""
    datas = get_data_parts(message.parts)
    if len(datas) != 1:
        raise EntradaInvalida(
            "envia UNA peticion por mensaje (un solo DataPart "
            '{lead_id, audio_path, asesor, modalidad, idioma?, tipo_reunion?})'
        )
    d = datas[0]
    if not isinstance(d, dict):
        raise EntradaInvalida("el DataPart debe ser un objeto JSON")
    peticion: dict = {}
    for campo in ("lead_id", "audio_path", "asesor"):
        valor = d.get(campo)
        if not (isinstance(valor, str) and valor.strip()):
            raise EntradaInvalida(f'falta "{campo}" (string no vacio)')
        peticion[campo] = valor.strip()
    modalidad = d.get("modalidad")
    if modalidad not in MODALIDADES:
        raise EntradaInvalida(f'"modalidad" debe ser una de {MODALIDADES}')
    peticion["modalidad"] = modalidad
    idioma = d.get("idioma", "es-MX")
    if not (isinstance(idioma, str) and idioma.strip()):
        raise EntradaInvalida('"idioma" debe ser string no vacio')
    peticion["idioma"] = idioma.strip()
    tipo = d.get("tipo_reunion", "discovery")
    if tipo not in TIPOS_REUNION:
        raise EntradaInvalida(f'"tipo_reunion" debe ser uno de {TIPOS_REUNION}')
    peticion["tipo_reunion"] = tipo
    return peticion


def _mmss(segundos: float) -> str:
    total = int(segundos)
    return f"{total // 60:02d}:{total % 60:02d}"


def confianza_global(segmentos: list[Segmento]) -> str:
    """alta/media/baja deterministica desde las confianzas por segmento."""
    if not segmentos:
        return "baja"
    promedio = sum(s.confianza for s in segmentos) / len(segmentos)
    if promedio >= 0.9:
        return "alta"
    if promedio >= 0.7:
        return "media"
    return "baja"


def formatear(peticion: dict, segmentos: list[Segmento], motor: str) -> str:
    """Transcripcion literal en el formato fijo del skill. Sin resumen."""
    lineas = [
        f"# Transcripcion — Descubrimiento (lead {peticion['lead_id']})",
        f"Lead: {peticion['lead_id']} · Modalidad: {peticion['modalidad']} · "
        f"Idioma: {peticion['idioma']} · Tipo: {peticion['tipo_reunion']} · Motor: {motor}",
        f"Confianza global: {confianza_global(segmentos)}",
        "",
    ]
    for s in segmentos:
        texto = s.texto.strip() if s.confianza >= UMBRAL_INAUDIBLE else "[inaudible]"
        if not texto:
            texto = "[inaudible]"
        lineas.append(f"[{_mmss(s.inicio_s)}] {s.hablante.capitalize()}: {texto}")
    lineas += ["", "> Transcripcion literal. Sin resumen ni interpretacion."]
    return "\n".join(lineas)


class TranscripcionExecutor(AgentExecutor):
    """Puente A2A -> motor STT -> tabla transcripciones. Todo inyectable."""

    def __init__(self, motor=None, store: TranscripcionesStore | None = None) -> None:
        self._motor = motor if motor is not None else crear_motor()
        self._store = store if store is not None else TranscripcionesStore()

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

        audio = Path(peticion["audio_path"])
        if not audio.is_file():
            await self._fallar(
                updater, f"audio inexistente en el volumen: {peticion['audio_path']}"
            )
            return

        try:
            # to_thread: un motor sincrono con red (groq) no debe bloquear el
            # event loop — bloquearlo congela /health y el healthcheck del
            # contenedor lo mataria a media transcripcion larga.
            segmentos = await asyncio.to_thread(
                self._motor.transcribir, audio, peticion["idioma"]
            )
        except Exception as exc:  # motor STT reventado: fallo VISIBLE, reintentable
            await self._fallar(updater, f"motor STT fallo: {type(exc).__name__}: {exc}")
            return

        contenido = formatear(peticion, segmentos, self._motor.nombre)
        fila = {
            "lead_id": peticion["lead_id"],
            "modalidad": peticion["modalidad"],
            "idioma": peticion["idioma"],
            "asesor": peticion["asesor"],
            "tipo_reunion": peticion["tipo_reunion"],
            "motor": self._motor.nombre,
            "confianza_global": confianza_global(segmentos),
            "contenido": contenido,
            "segmentos": [
                {
                    "inicio_s": s.inicio_s,
                    "hablante": s.hablante,
                    "texto": s.texto,
                    "confianza": s.confianza,
                }
                for s in segmentos
            ],
        }
        try:
            persistido = await self._store.insertar(fila)
        except TranscripcionesError as exc:
            # Fallo VISIBLE: mejor un task failed reintentable que perderla.
            await self._fallar(updater, str(exc))
            return

        await updater.add_artifact(
            [new_data_part({
                "lead_id": peticion["lead_id"],
                "persistido": persistido,
                "motor": self._motor.nombre,
                "confianza_global": confianza_global(segmentos),
                "contenido": contenido,
            })],
            name="transcripcion",
        )
        await updater.complete()

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        updater = TaskUpdater(event_queue, context.task_id, context.context_id)
        await updater.cancel()

    @staticmethod
    async def _fallar(updater: TaskUpdater, razon: str) -> None:
        # Log LOCAL antes de que el error viaje por A2A: si el cliente ya se
        # fue, el protocolo se lo traga y nadie se entera (regla 2026-07-12).
        print(f"[transcripcion-a2a] task failed: {razon}", flush=True)
        await updater.failed(updater.new_agent_message(parts=[new_text_part(razon)]))
