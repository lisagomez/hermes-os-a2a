"""app.py — API del grafo (cerebro regulatorio de Hermes OS · A2A, Fase 2).

Gotcha de diseno (PRP-002): el openapi.json DEBE generarse sin postgres, porque
el CLI se imprime desde el contrato. Por eso `db` se importa DENTRO de las
dependencias (lazy): importar `app` nunca abre conexiones.
"""
from __future__ import annotations

from datetime import date

from fastapi import Depends, FastAPI, HTTPException, Query, Response

import evaluador
from schemas import (
    CatalogoItem,
    CategoriaItem,
    EvaluacionListada,
    EvaluacionRequest,
    EvaluacionResponse,
    ReglaListada,
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


def dep_catalogos() -> dict:
    """{'jurisdicciones': [...], 'dimensiones': [...]} desde postgres (lazy, cacheado)."""
    import db  # lazy: el import de app no toca la DB

    try:
        return db.catalogos()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"catalogos no disponibles: {exc}")


def _regla_listada(r: dict, corte: date) -> ReglaListada:
    """Arma la vista de lectura de una regla; tolera las dos formas del conocimiento

    (DB via ensamblar_conocimiento y seed crudo de tests: el seed no trae
    source_version ni regimen/topes en todos los impactos).
    """
    desde = date.fromisoformat(r["vigente_desde"]) if isinstance(r["vigente_desde"], str) else r["vigente_desde"]
    hasta = r.get("vigente_hasta")
    if isinstance(hasta, str):
        hasta = date.fromisoformat(hasta)
    return ReglaListada(
        clave=r["clave"],
        jurisdiccion=r["jurisdiccion"],
        dimension=r["dimension"],
        titulo=r["titulo"],
        texto_resumen=r["texto_resumen"],
        fuente_cita=r["fuente_cita"],
        fuente_url=r["fuente_url"],
        source_version=r.get("source_version"),
        vigente_desde=desde,
        vigente_hasta=hasta,
        vigente=desde <= corte and (hasta is None or hasta >= corte),
        impactos=[
            {
                "categoria": i.get("categoria"),
                "regimen": i.get("regimen", "PM_TITULO_II"),
                "veredicto_base": i.get("veredicto_base"),
                "tope_monto": i.get("tope_monto"),
                "tope_pct": i.get("tope_pct"),
                "requisitos": i.get("requisitos", []),
                "banderas": i.get("banderas", []),
                "parametros": i.get("parametros", {}),
            }
            for i in r.get("impactos", [])
        ],
    )


@app.get("/reglas", response_model=list[ReglaListada], tags=["conocimiento"])
def listar_reglas(
    response: Response,
    jurisdiccion: str | None = Query(
        None, description="Filtro exacto por codigo ISO-2 (se normaliza a MAYUSCULAS)"
    ),
    dimension: str | None = Query(
        None, description="Filtro exacto por codigo de dimension (se normaliza a minusculas)"
    ),
    fecha: date | None = Query(
        None,
        description="Fecha a la que se evalua `vigente` (reproducible/auditable); default: hoy",
    ),
    conocimiento: dict = Depends(dep_conocimiento),
) -> list[ReglaListada]:
    """Reglas del conocimiento con impactos y fuente (lectura pura, App C).

    Sin paginacion a proposito: el conocimiento completo es chico y el consumidor
    (flujos-a2a / explorador) lo quiere entero. `vigente` depende de `fecha`, por
    eso la respuesta viaja con Cache-Control: no-store.
    """
    response.headers["Cache-Control"] = "no-store"
    corte = fecha or date.today()
    reglas = conocimiento["reglas"]
    if jurisdiccion:
        j = jurisdiccion.upper()
        reglas = [r for r in reglas if r["jurisdiccion"] == j]
    if dimension:
        d = dimension.lower()
        reglas = [r for r in reglas if r["dimension"] == d]
    return [_regla_listada(r, corte) for r in reglas]


@app.get("/jurisdicciones", response_model=list[CatalogoItem], tags=["conocimiento"])
def listar_jurisdicciones(catalogos: dict = Depends(dep_catalogos)) -> list[CatalogoItem]:
    """Catalogo de jurisdicciones (codigo, nombre) — lectura pura para el explorador."""
    return [CatalogoItem(**c) for c in catalogos["jurisdicciones"]]


@app.get("/categorias", response_model=list[CategoriaItem], tags=["conocimiento"])
def listar_categorias(conocimiento: dict = Depends(dep_conocimiento)) -> list[CategoriaItem]:
    """Categorias de gasto del conocimiento (lectura pura, App C paso 2).

    Las categorias no tienen dimension propia: el ambito se deriva de que
    reglas las referencian (evaluador.evaluar). Este catalogo da nombre y
    descripcion; el cruce por ambito lo compone flujos-a2a.
    """
    return [
        CategoriaItem(clave=c["clave"], nombre=c["nombre"], descripcion=c["descripcion"])
        for c in conocimiento["categorias"]
    ]


@app.get("/dimensiones", response_model=list[CatalogoItem], tags=["conocimiento"])
def listar_dimensiones(catalogos: dict = Depends(dep_catalogos)) -> list[CatalogoItem]:
    """Catalogo de dimensiones (codigo, nombre) — lectura pura para el explorador."""
    return [CatalogoItem(**c) for c in catalogos["dimensiones"]]


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
