"""schemas.py — contratos Pydantic de la API del grafo (Fase C).

El contrato ES el producto: de aqui sale el openapi.json que imprime el CLI.
Descripciones en espanol porque el CLI generado las hereda.
"""
from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

Estado = Literal["deducible", "no_deducible", "dudoso"]


class Contexto(BaseModel):
    """El 'proyecto' de la evaluacion: ambito juridico y fecha de operacion."""

    jurisdiccion: str = Field("MX", description="Codigo ISO-2 de la jurisdiccion")
    dimension: str = Field("fiscal", description="Dimension regulatoria (V1: fiscal)")
    regimen: str = Field("PM_TITULO_II", description="Regimen fiscal del contribuyente")
    fecha: date | None = Field(
        None, description="Fecha de la operacion (vigencia de reglas); default: hoy"
    )


class Concepto(BaseModel):
    descripcion: str = Field(..., min_length=1, description="Texto libre del gasto")
    importe: float | None = Field(None, ge=0, description="Importe en MXN (para topes)")


class EvaluacionRequest(BaseModel):
    contexto: Contexto = Field(default_factory=Contexto)
    conceptos: list[Concepto] = Field(..., min_length=1)


class Vigencia(BaseModel):
    desde: date
    hasta: date | None = None


class Fuente(BaseModel):
    clave: str = Field(..., description="Clave de la regla, ej. MX-LISR-28-V")
    cita: str = Field(..., description="Cita legal, ej. 'LISR Art. 28, fraccion V'")
    url: str
    vigencia: Vigencia


class ConceptoEvaluado(BaseModel):
    descripcion: str
    categoria: str | None = Field(None, description="Categoria clasificada; null = no clasificable")
    estado: Estado
    razon: str = Field(..., description="Razon del veredicto; nombra la fuente o 'sin regla aplicable'")
    fuente: Fuente | None = Field(None, description="Regla rectora; null solo si 'sin regla aplicable'")
    banderas: list[str]
    checklist: list[str]


class ContextoResuelto(BaseModel):
    jurisdiccion: str
    dimension: str
    regimen: str
    fecha: date


class EvaluacionResponse(BaseModel):
    id: str | None = Field(None, description="UUID de la evaluacion persistida; null si no se guardo")
    contexto: ContextoResuelto
    estado: Estado = Field(..., description="Agregado: uniforme -> ese estado; mixto -> dudoso")
    conceptos: list[ConceptoEvaluado]
    banderas_rojas: list[str]
    checklist: list[str]
    fuentes: list[Fuente] = Field(..., description="Fuentes citadas, deduplicadas")
    disclaimer: str = Field(..., description="SIEMPRE presente: esto no es asesoria fiscal")


class Salud(BaseModel):
    status: Literal["ok"]
    db: str = Field(..., description="'ok' o motivo de no-conexion (la API responde igual)")
    reglas: int | None = Field(None, description="Reglas cargadas; null si DB no disponible")
