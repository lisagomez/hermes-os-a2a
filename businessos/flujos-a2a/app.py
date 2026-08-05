"""app.py — flujos-a2a (App C, paso 2): proxy de LECTURA sobre el grafo.

Compone vistas del grafo regulatorio para la capa visual de Mission Control
(paso 3, /grafo/explorador). Contrato del ROADMAP §App C:

- Solo LECTURA: hacia el grafo salen unicamente GETs — "jamas escribe reglas"
  queda garantizado por construccion, no por disciplina.
- :5100 nunca expuesto al navegador: lo consume Mission Control server-side
  dentro de hermes-net (compose lo publica solo en 127.0.0.1).
- Nota de nomenclatura: el sufijo -a2a aqui viene del encargo (ROADMAP paso 2);
  este servicio es REST plano, NO habla el protocolo A2A (sin Agent Card) —
  para agentes ya existe grafo-a2a. Ver README.md.

Fallos del grafo → 503 honesto Y logueado (regla 2026-07-13: un best-effort
silencioso es un fallo invisible). Sin reintentos: el consumidor decide.
"""
from __future__ import annotations

import asyncio
import logging
import os
from datetime import date

import httpx
from fastapi import FastAPI, HTTPException, Query, Response

from schemas import (
    Arbol,
    ArbolDimension,
    ArbolJurisdiccion,
    Catalogos,
    Constructor,
    Salud,
)

log = logging.getLogger("flujos-a2a")

GRAFO_URL = os.environ.get("GRAFO_URL", "http://grafo:3000")
# Deadline AGREGADO por request de composicion (no por llamada): el peor caso
# de /arbol con el grafo lento es ~este valor, no 3x.
TIMEOUT_S = float(os.environ.get("FLUJOS_TIMEOUT_S", "10"))

REGIMEN_WILDCARD = "GENERAL"  # comodin de impactos (evaluador.py), no un regimen real
REGIMEN_DEFAULT = "PM_TITULO_II"  # default del Contexto del grafo (schemas.py del grafo)


def crear_app(transport: httpx.AsyncBaseTransport | None = None) -> FastAPI:
    """Fabrica la app; `transport` inyectable para tests (MockTransport/ASGI)."""
    app = FastAPI(
        title="flujos-a2a",
        version="1.0.0",
        description=(
            "Proxy de lectura del grafo regulatorio para el explorador visual "
            "(App C). Compone arbol jurisdiccion→dimension→reglas, insumos del "
            "constructor de flujos y el listado de evaluaciones. JAMAS escribe."
        ),
    )

    def _client() -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=GRAFO_URL, timeout=TIMEOUT_S, transport=transport
        )

    async def _get(client: httpx.AsyncClient, path: str, params: dict | None = None) -> httpx.Response:
        """GET al grafo; cualquier fallo (red o status) sale como 503 honesto."""
        try:
            r = await client.get(path, params=params)
        except httpx.HTTPError as exc:
            motivo = str(exc) or repr(exc)  # str(ConnectError) puede ser vacio
            log.warning("grafo inalcanzable: GET %s -> %s", path, motivo)
            raise HTTPException(
                status_code=503, detail=f"grafo no disponible: GET {path}: {motivo}"
            )
        if r.status_code != 200:
            log.warning("grafo respondio %s en GET %s: %s", r.status_code, path, r.text[:200])
            raise HTTPException(
                status_code=503,
                detail=f"grafo respondio {r.status_code} en GET {path}",
            )
        return r

    @app.get("/health", response_model=Salud, tags=["salud"])
    async def health() -> Salud:
        """Salud propia; reporta el estado del grafo sin caerse por el.

        El probe al grafo lleva timeout CORTO (3s) propio: el HEALTHCHECK del
        contenedor corta a los 5s, y un grafo colgado no debe hacer parpadear
        la salud de este servicio.
        """
        async with _client() as client:
            try:
                r = await client.get("/health", timeout=3.0)
                r.raise_for_status()
                cuerpo = r.json()
                return Salud(status="ok", grafo=cuerpo.get("db", "ok"), reglas=cuerpo.get("reglas"))
            except Exception as exc:  # grafo caido != flujos caido, pero se ve y se loguea
                motivo = str(exc) or repr(exc)  # str(ConnectError) puede ser vacio
                log.warning("health del grafo fallo: %s", motivo)
                return Salud(status="ok", grafo=motivo, reglas=None)

    @app.get("/arbol", response_model=Arbol, tags=["explorador"])
    async def arbol(
        response: Response,
        fecha: date | None = Query(
            None, description="Fecha a la que el grafo evalua `vigente`; default: hoy"
        ),
    ) -> Arbol:
        """Arbol jurisdiccion→dimension→reglas (badge de vigencia + fuente).

        Composicion de 3 lecturas del grafo en paralelo con deadline unico.
        `vigente` depende de `fecha` → Cache-Control: no-store (hereda la
        semantica de /reglas del grafo).
        """
        response.headers["Cache-Control"] = "no-store"
        params_reglas = {"fecha": fecha.isoformat()} if fecha else None
        async with _client() as client:
            jur, dim, reglas = await asyncio.gather(
                _get(client, "/jurisdicciones"),
                _get(client, "/dimensiones"),
                _get(client, "/reglas", params_reglas),
            )
        jurisdicciones, dimensiones, todas = jur.json(), dim.json(), reglas.json()

        por_ambito: dict[tuple[str, str], list[dict]] = {}
        for r in todas:
            por_ambito.setdefault((r["jurisdiccion"], r["dimension"]), []).append(r)

        return Arbol(
            fecha=fecha,
            total_reglas=len(todas),
            jurisdicciones=[
                ArbolJurisdiccion(
                    codigo=j["codigo"],
                    nombre=j["nombre"],
                    dimensiones=[
                        ArbolDimension(
                            codigo=d["codigo"],
                            nombre=d["nombre"],
                            reglas=por_ambito.get((j["codigo"], d["codigo"]), []),
                        )
                        for d in dimensiones
                    ],
                )
                for j in jurisdicciones
            ],
        )

    @app.get("/constructor", response_model=Constructor, tags=["explorador"])
    async def constructor(
        response: Response,
        jurisdiccion: str = Query(..., description="Codigo ISO-2, ej. MX"),
        dimension: str = Query(..., description="Codigo de dimension, ej. fiscal"),
        fecha: date | None = Query(None, description="Vigencia a esta fecha; default: hoy"),
    ) -> Constructor:
        """Insumos del constructor de flujos para UN ambito (paso 3).

        Regimenes y categorias derivados de reglas VIGENTES del ambito, con el
        mismo criterio que evaluador.evaluar del grafo (solo categorias que
        algun impacto referencia). La plantilla es el body de POST
        /evaluaciones del grafo, listo para completar conceptos.
        """
        response.headers["Cache-Control"] = "no-store"
        params: dict = {"jurisdiccion": jurisdiccion, "dimension": dimension}
        if fecha:
            params["fecha"] = fecha.isoformat()
        async with _client() as client:
            r_reglas, r_cats = await asyncio.gather(
                _get(client, "/reglas", params),
                _get(client, "/categorias"),
            )
        vigentes = [r for r in r_reglas.json() if r["vigente"]]
        impactos = [i for r in vigentes for i in r.get("impactos", [])]

        regimenes = sorted(
            {i.get("regimen", REGIMEN_DEFAULT) for i in impactos} - {REGIMEN_WILDCARD}
        )
        regimen_default = (
            REGIMEN_DEFAULT if not regimenes or REGIMEN_DEFAULT in regimenes else regimenes[0]
        )
        claves_ambito = {i["categoria"] for i in impactos if i.get("categoria")}
        categorias = [c for c in r_cats.json() if c["clave"] in claves_ambito]

        contexto: dict = {
            "jurisdiccion": jurisdiccion.upper(),
            "dimension": dimension.lower(),
            "regimen": regimen_default,
        }
        if fecha:
            contexto["fecha"] = fecha.isoformat()
        return Constructor(
            jurisdiccion=jurisdiccion.upper(),
            dimension=dimension.lower(),
            fecha=fecha,
            regimenes=regimenes,
            regimen_default=regimen_default,
            categorias=categorias,
            plantilla_payload={
                "contexto": contexto,
                "conceptos": [{"descripcion": "", "importe": None}],
            },
        )

    @app.get("/catalogos", response_model=Catalogos, tags=["explorador"])
    async def catalogos() -> Catalogos:
        """Catalogos {jurisdicciones, dimensiones} para los selectores."""
        async with _client() as client:
            jur, dim = await asyncio.gather(
                _get(client, "/jurisdicciones"), _get(client, "/dimensiones")
            )
        return Catalogos(jurisdicciones=jur.json(), dimensiones=dim.json())

    @app.get("/evaluaciones", tags=["explorador"])
    async def evaluaciones(
        response: Response,
        limit: int = Query(20, ge=1, le=100, description="Cuantas evaluaciones recientes"),
    ) -> list[dict]:
        """Passthrough del historial de evaluaciones del grafo, INTACTO.

        La `salida` conserva fuentes y disclaimer integros (regla de oro del
        grafo); este proxy no toca el cuerpo.
        """
        response.headers["Cache-Control"] = "no-store"
        async with _client() as client:
            r = await _get(client, "/evaluaciones", {"limit": limit})
        return r.json()

    return app


app = crear_app()
