"""enjambre.py — scheduler determinista del DAG (PRP-007, Fase 3).

El corazón NO-modelo del Coordinador: reparte las sub-tareas del plan al Ejecutor
respetando (1) el orden del DAG (una sub-tarea corre solo cuando sus `depende_de`
están aprobadas), (2) el tope de concurrencia `fan_out_max`, (3) el reintento por
sub-tarea con su `intentos_max` (devuelve la sub-tarea al Ejecutor con las
observaciones del rechazo), y (4) el corte por `presupuesto_usd` (gasto acumulado
de token_usage por task_id). Determinista y testeable al 100% con dobles.

Modelo por OLAS (v1): cada iteración lanza hasta `fan_out_max` sub-tareas listas
en paralelo y espera la ola completa antes de re-evaluar. Acota la concurrencia
(el requisito) aunque no maximice el solape entre olas — refinar el llenado
continuo de slots es futuro (fuera de alcance, v1).

Salida: {estado: "aprobado"|"escalado", sub_resultados: {task_id: {resultado,
veredicto}}, orden: [...], motivo?: str}. "aprobado" = TODAS las sub-tareas
pasaron su gate; la integración y la verificación FINAL del todo son Fase 4.
"""
from __future__ import annotations

import asyncio
from typing import Any


def _con_observaciones(sub: dict, observaciones: list[str]) -> dict:
    """Copia de la sub-tarea con las observaciones del rechazo (para el reintento)."""
    return {**sub, "observaciones": observaciones} if observaciones else dict(sub)


def _resumen(estado: str, resultados: dict, orden: list[str], motivo: str | None = None) -> dict:
    r: dict[str, Any] = {"estado": estado, "sub_resultados": resultados, "orden": orden}
    if motivo:
        r["motivo"] = motivo
    return r


async def correr(
    plan: dict,
    ejecutor: Any,
    presupuesto: Any,
    fan_out_max: int,
    presupuesto_usd: float | None,
    parent_id: str,
) -> dict:
    """Ejecuta el DAG del plan. `ejecutor.ejecutar(sub)`→{resultado,veredicto};
    `presupuesto.gasto_acumulado(task_ids)`→float. Ambos inyectables (tests)."""
    subs = {s["task_id"]: s for s in plan["sub_tareas"]}
    orden = plan["orden"]
    estado = {tid: "pendiente" for tid in subs}
    intentos = {tid: 0 for tid in subs}
    observaciones: dict[str, list[str]] = {tid: [] for tid in subs}
    resultados: dict[str, dict] = {}
    ids_gasto = list(subs) + [parent_id]

    while True:
        if all(estado[t] == "aprobada" for t in subs):
            return _resumen("aprobado", resultados, orden)

        fallidas = [t for t in subs if estado[t] == "fallida"]
        if fallidas:
            return _resumen("escalado", resultados, orden,
                            f"sub-tareas sin pasar el gate tras agotar reintentos: {fallidas}")

        if presupuesto_usd is not None:
            gastado = await presupuesto.gasto_acumulado(ids_gasto)
            if gastado >= presupuesto_usd:
                return _resumen("escalado", resultados, orden,
                                f"presupuesto agotado ({gastado:.4f}/{presupuesto_usd:.4f} USD)")

        listas = [
            t for t in subs
            if estado[t] == "pendiente"
            and all(estado[d] == "aprobada" for d in subs[t]["depende_de"])
        ]
        if not listas:  # defensivo: en un DAG válido siempre hay una fuente ejecutable
            return _resumen("escalado", resultados, orden,
                            "no hay sub-tareas ejecutables (posible bloqueo del DAG)")

        ola = listas[:fan_out_max]
        for t in ola:
            estado[t] = "en_vuelo"
        salidas = await asyncio.gather(
            *[ejecutor.ejecutar(_con_observaciones(subs[t], observaciones[t])) for t in ola],
            return_exceptions=True,
        )
        for t, salida in zip(ola, salidas):
            if isinstance(salida, Exception):
                estado[t] = "fallida"  # el Ejecutor cayó/no entregó: escala (verificar antes de confiar)
                continue
            resultados[t] = salida
            veredicto = salida.get("veredicto", {}) if isinstance(salida, dict) else {}
            if veredicto.get("veredicto") == "aprobado":
                estado[t] = "aprobada"
            else:
                intentos[t] += 1
                observaciones[t] = [h.get("evidencia", "") for h in veredicto.get("hallazgos", [])]
                intentos_max = subs[t].get("limites", {}).get("intentos_max", 3)
                estado[t] = "pendiente" if intentos[t] < intentos_max else "fallida"
