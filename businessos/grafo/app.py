"""app.py — API del grafo (cerebro regulatorio de Hermes OS · A2A, Fase 2).

Gotcha de diseno (PRP-002): el openapi.json DEBE generarse sin postgres, porque
el CLI se imprime desde el contrato. Por eso `db` se importa DENTRO de las
dependencias (lazy): importar `app` nunca abre conexiones.
"""
from __future__ import annotations

from fastapi import Depends, FastAPI, HTTPException, Query

import evaluador
from schemas import (
    EvaluacionListada,
    EvaluacionRequest,
    EvaluacionResponse,
    Salud,
    SaludConocimiento,
)

app = FastAPI(
    title="grafo",
    version="2.0.0",
    description=(
        "Cerebro regulatorio fiscal de Hermes OS · A2A. Evalua deducibilidad de conceptos "
        "de gasto (MX, dimension fiscal) con veredicto por concepto y fuente citada. "
        "Senala riesgos; NO asesora."
    ),
)


def dep_conocimiento() -> dict:
    """{'reglas': [...], 'categorias': [...]} desde postgres (lazy, cacheado en db)."""
    import db  # lazy: el import de app no toca la DB

    try:
        return db.conocimiento()
    except Exception as exc:  # DB caida != API caida, pero /evaluaciones no puede operar
        raise HTTPException(status_code=503, detail=f"base de conocimiento no disponible: {exc}")


def dep_guardar():
    """callable(contexto, entrada, salida) -> uuid str | None (best-effort)."""
    import db

    return db.guardar_evaluacion


@app.get("/health", response_model=Salud, tags=["salud"])
def health() -> Salud:
    """Salud del servicio; reporta el estado de la DB sin caerse por ella."""
    try:
        import db

        n = db.contar_reglas()
        return Salud(status="ok", db="ok", reglas=n)
    except Exception as exc:
        return Salud(status="ok", db=str(exc), reglas=None)


@app.get("/salud-conocimiento", response_model=SaludConocimiento, tags=["salud"])
def salud_conocimiento(conocimiento: dict = Depends(dep_conocimiento)) -> SaludConocimiento:
    """Radiografia del conocimiento: reglas vencidas, montos sin cotejo, ambitos.

    La consume el cron `revisar-vigencias.py` (un grafo desactualizado miente
    con certeza — ROADMAP Fase 3).
    """
    return SaludConocimiento(**evaluador.salud_conocimiento(conocimiento["reglas"]))


def dep_listar():
    """callable(limit) -> list[dict] (lazy, igual que dep_guardar)."""
    import db

    return db.listar_evaluaciones


@app.get("/evaluaciones", response_model=list[EvaluacionListada], tags=["evaluaciones"])
def listar_evaluaciones(
    limit: int = Query(20, ge=1, le=100, description="Cuantas evaluaciones recientes"),
    listar=Depends(dep_listar),
) -> list[EvaluacionListada]:
    """Evaluaciones persistidas, mas reciente primero (solo lectura, Fase 4).

    Sin secretos ni escritura: la consume Mission Control y cualquier agente
    por HTTP interno. La `salida` conserva fuentes y disclaimer integros.
    """
    try:
        return [EvaluacionListada(**fila) for fila in listar(limit)]
    except HTTPException:
        raise
    except Exception as exc:  # DB caida: el listado no puede operar
        raise HTTPException(status_code=503, detail=f"evaluaciones no disponibles: {exc}")


@app.post("/evaluaciones", response_model=EvaluacionResponse, tags=["evaluaciones"])
def crear_evaluacion(
    req: EvaluacionRequest,
    conocimiento: dict = Depends(dep_conocimiento),
    guardar=Depends(dep_guardar),
) -> EvaluacionResponse:
    """Evalua deducibilidad de conceptos: veredicto + fuente citada + banderas + checklist.

    Fail-safe: lo no clasificable sale `dudoso` con razon 'sin regla aplicable'.
    La respuesta SIEMPRE incluye disclaimer (esto no es asesoria).
    """
    contexto = req.contexto.model_dump(mode="json")
    entrada = [c.model_dump(mode="json") for c in req.conceptos]
    salida = evaluador.evaluar(
        entrada, conocimiento["reglas"], conocimiento["categorias"], contexto
    )
    eval_id = guardar(salida["contexto"], entrada, salida)
    return EvaluacionResponse(id=eval_id, **salida)
