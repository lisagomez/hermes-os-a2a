"""muestreo.py — política de muestreo del nivel A2 (plan D-40).

A2: el agente envía directo; el juez LLM corre sobre una MUESTRA — arranque
20%, piso 5% cuando la evidencia lo respalda — más el 100% de lo sensible.
La tasa se calcula CON EVIDENCIA REAL (crm_supervision), no por fe; y si la
tasa de rechazo sube, la validación vuelve a ser completa en el acto
(BAJAR = regla automática; SUBIR a A2 = botón humano en crm_tenants.nivel).
Los gates deterministas NO se muestrean: corren siempre, cuestan cero.
"""
from __future__ import annotations

import re

TASA_ARRANQUE = 0.20   # sin evidencia suficiente, se muestrea 1 de cada 5
TASA_PISO = 0.05       # el muestreo nunca baja de 1 de cada 20
UMBRAL_PISO = 0.03     # <3% de rechazo del juez → puede bajar al piso
UMBRAL_DEGRADA = 0.10  # ≥10% de rechazo → validación COMPLETA (degradación operativa)
MIN_EVIDENCIA = 20     # con menos veredictos de juez, tasa de arranque

# Lo "sensible" del lado saliente SIEMPRE pasa por juez, sin importar la tasa:
# dinero, promesas, contratos, facturación — donde un invento cuesta caro.
_SENSIBLE_SALIENTE = re.compile(
    r"(\$\s?\d|\d+\s?(usd|mxn|pesos|d[óo]lares)|precio|costo|cotizaci|reembolso|"
    r"descuento|garantiz|promet|contrato|legal|factur)",
    re.IGNORECASE,
)


def es_sensible(respuesta: str) -> bool:
    return bool(_SENSIBLE_SALIENTE.search(respuesta))


def tasa_muestreo(rechazos: int, total: int) -> float:
    """Tasa de juez para A2 según la evidencia (rechazos del juez / veredictos)."""
    if total < MIN_EVIDENCIA:
        return TASA_ARRANQUE
    tasa_rechazo = rechazos / total
    if tasa_rechazo >= UMBRAL_DEGRADA:
        return 1.0  # proteger primero, explicar después
    if tasa_rechazo < UMBRAL_PISO:
        return TASA_PISO
    return TASA_ARRANQUE
