"""schemas.py — contratos Pydantic de la API del grafo (Fase C).

El contrato ES el producto: de aqui sale el openapi.json que imprime el CLI.
Descripciones en espanol porque el CLI generado las hereda.
"""
from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

Estado = Literal["deducible", "no_deducible", "permitido", "no_permitido", "dudoso"]
# "deducible"/"no_deducible": dimensiones fiscal/contable/contractual (V1-V3).
# "permitido"/"no_permitido": dimension "regulatorio" (permisos y cumplimiento
# operativo, ej. RPAS/drones) — anadida sin tocar el vocabulario existente
# porque las categorias no cruzan de dimension (evaluador.py filtra por
# ambito), asi que ambos vocabularios conviven sin ambiguedad. "dudoso" es el
# fail-safe compartido por todas las dimensiones.


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


class EvaluacionListada(BaseModel):
    """Item del listado de evaluaciones persistidas (solo lectura, Mission Control).

    `salida` es la EvaluacionResponse completa tal como se persistio (jsonb):
    veredictos + fuentes + banderas + checklist + disclaimer.
    """

    id: str = Field(..., description="UUID de la evaluacion")
    created_at: str = Field(..., description="Timestamp ISO-8601 de la evaluacion")
    contexto: dict = Field(..., description="Contexto resuelto {jurisdiccion, dimension, regimen, fecha}")
    salida: dict = Field(..., description="Respuesta completa persistida (incluye disclaimer y fuentes)")


class Salud(BaseModel):
    status: Literal["ok"]
    db: str = Field(..., description="'ok' o motivo de no-conexion (la API responde igual)")
    reglas: int | None = Field(None, description="Reglas cargadas; null si DB no disponible")


class CatalogoItem(BaseModel):
    """Entrada de catalogo (jurisdicciones/dimensiones) para el explorador (App C)."""

    codigo: str = Field(..., description="Codigo corto, ej. 'MX' o 'fiscal'")
    nombre: str


class CategoriaItem(BaseModel):
    """Categoria de gasto del conocimiento (lectura pura, App C paso 2).

    Solo los campos que necesita el constructor de flujos (clave/nombre/
    descripcion); keywords y exclusiones son maquinaria interna del
    clasificador y no viajan.
    """

    clave: str = Field(..., description="Clave de la categoria, ej. 'VIATICOS'")
    nombre: str
    descripcion: str


class ImpactoRegla(BaseModel):
    """Impacto de una regla tal como lo consume el evaluador (lectura pura).

    `veredicto_base` null = la regla no determina veredicto, solo aporta
    requisitos/banderas (asi existe en el seed real; el contrato lo tolera).
    """

    categoria: str | None = Field(None, description="null = aplica a todas las categorias")
    regimen: str = Field("PM_TITULO_II", description="Regimen al que aplica; GENERAL = wildcard")
    veredicto_base: str | None = Field(
        None, description="Veredicto que dicta la regla; null = solo requisitos/banderas"
    )
    tope_monto: float | None = None
    tope_pct: float | None = None
    requisitos: list[str]
    banderas: list[str]
    parametros: dict


class ReglaListada(BaseModel):
    """Regla del conocimiento con sus impactos (lectura pura para el explorador).

    `vigente` se calcula contra el parametro `fecha` del request (default: hoy);
    por eso la respuesta viaja con Cache-Control: no-store.
    """

    clave: str
    jurisdiccion: str
    dimension: str
    titulo: str
    texto_resumen: str
    fuente_cita: str = Field(..., description="Cita legal (regla de oro: nunca sin fuente)")
    fuente_url: str
    source_version: str | None = Field(None, description="Procedencia del seed")
    vigente_desde: date
    vigente_hasta: date | None = Field(None, description="null = sin fecha de derogacion conocida")
    vigente: bool = Field(..., description="Evaluada a la `fecha` del request (badge del explorador)")
    impactos: list[ImpactoRegla]


class ReglaVencida(BaseModel):
    clave: str
    vigente_hasta: date


class VerificarPendiente(BaseModel):
    regla: str
    cita: str
    categoria: str | None = None
    parametros: dict


class AmbitoConocimiento(BaseModel):
    jurisdiccion: str
    dimension: str
    reglas: int


class SaludConocimiento(BaseModel):
    """Radiografia del seed: lo que consume el cron de vigencias (Fase 3)."""

    generado: date
    source_versions: list[str]
    reglas_total: int
    reglas_vencidas: list[ReglaVencida] = Field(..., description="Derogadas que siguen en el seed")
    verificar_pendientes: list[VerificarPendiente] = Field(
        ..., description="Montos/topes con verificar:true (cotejo contra fuente oficial pendiente)"
    )
    ambitos: list[AmbitoConocimiento]
    advertencia: str | None = None
