"""schemas.py — contratos Pydantic de flujos-a2a (App C, paso 2).

Doctrina de tolerancia (gotcha 2026-07-23): este servicio es un PROXY de
lectura — jamas debe ser mas estricto que su fuente. Las reglas y
evaluaciones del grafo viajan como dicts intactos (el grafo ya las valido);
aqui solo se tipa la ESTRUCTURA que este servicio compone (arbol,
constructor, salud).
"""
from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class Salud(BaseModel):
    """Salud propia + estado del grafo (la API responde aunque el grafo caiga)."""

    status: str = Field("ok", description="Salud de flujos-a2a (siempre 'ok' si responde)")
    grafo: str = Field(..., description="'ok' o motivo de no-conexion con el grafo")
    reglas: int | None = Field(None, description="Reglas que reporta el grafo; null si no responde")


class ArbolDimension(BaseModel):
    codigo: str
    nombre: str
    reglas: list[dict] = Field(
        ..., description="Reglas del grafo INTACTAS (con vigente, fuente e impactos)"
    )


class ArbolJurisdiccion(BaseModel):
    codigo: str
    nombre: str
    dimensiones: list[ArbolDimension] = Field(
        ...,
        description=(
            "TODAS las dimensiones del catalogo, con reglas [] donde no hay "
            "cobertura — el hueco es informacion, no se oculta"
        ),
    )


class Arbol(BaseModel):
    """Arbol jurisdiccion→dimension→reglas para el explorador (paso 3)."""

    fecha: date | None = Field(
        None, description="Fecha a la que el grafo evaluo `vigente`; null = hoy del grafo"
    )
    total_reglas: int
    jurisdicciones: list[ArbolJurisdiccion]


class Constructor(BaseModel):
    """Insumos para armar el payload de POST /evaluaciones del grafo (un ambito).

    Derivado SOLO de reglas vigentes a la fecha pedida: una regla derogada no
    debe guiar la captura. `regimenes` excluye el comodin GENERAL (es wildcard
    de reglas, no un regimen de contribuyente).
    """

    jurisdiccion: str
    dimension: str
    fecha: date | None = None
    regimenes: list[str] = Field(
        ..., description="Regimenes con impactos propios en el ambito (sin GENERAL)"
    )
    regimen_default: str = Field(..., description="Regimen que usa la plantilla")
    categorias: list[dict] = Field(
        ...,
        description=(
            "Categorias {clave, nombre, descripcion} referenciadas por impactos "
            "de reglas vigentes del ambito (mismo criterio que evaluador.evaluar)"
        ),
    )
    plantilla_payload: dict = Field(
        ..., description="Esqueleto del body de POST /evaluaciones del grafo"
    )


class Catalogos(BaseModel):
    """Catalogos crudos del grafo para los selectores del explorador."""

    jurisdicciones: list[dict]
    dimensiones: list[dict]
