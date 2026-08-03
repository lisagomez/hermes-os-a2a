"""gate_grafo.py — gate LFPDPPP del waterfall enrichment (App A).

UN POST a grafo:3000/evaluaciones por ejecucion, con los 4 conceptos CANONICOS
de la dimension datos-personales. Los strings son un CONTRATO DE DETERMINISMO:
estan fijados verbatim en businessos/grafo/tests/test_multiambito.py (seccion
"Datos personales") — cambiarlos aqui sin cambiar alla rompe el determinismo
del gate (test_contrato_grafo.py vigila la paridad).

Fail-closed: grafo caido, timeout, respuesta invalida o concepto faltante =
GateGrafoError = la ejecucion NO corre (task failed, reintentable). Un gate
que no puede consultar su fuente no adivina.

Que se gatea y que no (decision explicita, no omision):
- denue           -> "consulta a fuente publica oficial"           (corre si permitido)
- patron_dominio  -> "inferencia de correo corporativo por patron" (corre si permitido)
- contacto de PF  -> "dato de persona fisica para prospeccion"     (hoy dudoso = bloqueado)
- proveedor intl  -> "transferencia internacional ..."             (sin escalon hoy; cualquier
                     proveedor de pago futuro DEBE declararse bajo este concepto)
- rfc_offline y la lectura de contraparte_69b NO se gatean por grafo: procesan
  datos ya provistos por el caller / tabla propia de compliance — no hay
  tratamiento nuevo de datos personales que evaluar.
"""
from __future__ import annotations

import os

import httpx

TIMEOUT_S = 10.0
DEFAULT_GRAFO_URL = "http://grafo:3000"

CONCEPTO_FUENTE_PUBLICA = "consulta a fuente publica oficial"
CONCEPTO_PATRON = "inferencia de correo corporativo por patron de correo de dominio"
CONCEPTO_PF = "dato de persona fisica para prospeccion"
CONCEPTO_TRANSFERENCIA_INTL = "transferencia internacional de datos a proveedor de enriquecimiento"

CONCEPTOS = [
    CONCEPTO_FUENTE_PUBLICA,
    CONCEPTO_PATRON,
    CONCEPTO_PF,
    CONCEPTO_TRANSFERENCIA_INTL,
]

# escalon de la cascada -> concepto canonico que lo gatea
CONCEPTO_POR_ESCALON = {
    "denue": CONCEPTO_FUENTE_PUBLICA,
    "patron_dominio": CONCEPTO_PATRON,
}


class GateGrafoError(RuntimeError):
    """El grafo no pudo evaluar: la cascada NO corre (fail-closed)."""


class GateGrafo:
    """Cliente minimo del grafo; http_client inyectable para tests."""

    def __init__(self, url: str | None = None,
                 http_client: httpx.AsyncClient | None = None) -> None:
        self._url = (url or os.environ.get("GRAFO_URL") or DEFAULT_GRAFO_URL).rstrip("/")
        self._http = http_client

    async def consultar(self) -> dict:
        """Evalua los 4 conceptos canonicos. Devuelve:

        {"por_concepto": {concepto: {estado, razon, fuente, checklist, banderas}},
         "disclaimer": str, "fuentes": list}
        """
        payload = {
            "contexto": {"jurisdiccion": "MX", "dimension": "datos-personales"},
            "conceptos": [{"descripcion": c} for c in CONCEPTOS],
        }
        try:
            if self._http is not None:
                r = await self._http.post(f"{self._url}/evaluaciones", json=payload)
            else:
                async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
                    r = await client.post(f"{self._url}/evaluaciones", json=payload)
        except httpx.HTTPError as exc:
            raise GateGrafoError(
                f"grafo inalcanzable ({type(exc).__name__}): la cascada no corre sin gate"
            ) from exc
        if r.status_code != 200:
            raise GateGrafoError(f"grafo respondio HTTP {r.status_code}: la cascada no corre sin gate")

        cuerpo = r.json()
        por_concepto: dict[str, dict] = {}
        for c in cuerpo.get("conceptos", []):
            por_concepto[c.get("descripcion", "")] = {
                "estado": c.get("estado", "dudoso"),
                "razon": c.get("razon", ""),
                "fuente": c.get("fuente"),
                "checklist": c.get("checklist", []),
                "banderas": c.get("banderas", []),
            }
        faltantes = [c for c in CONCEPTOS if c not in por_concepto]
        if faltantes:
            raise GateGrafoError(f"el grafo no evaluo los conceptos {faltantes}: fail-closed")
        return {
            "por_concepto": por_concepto,
            "disclaimer": cuerpo.get("disclaimer", ""),
            "fuentes": cuerpo.get("fuentes", []),
        }


def permite(evaluacion: dict, escalon: str) -> bool:
    """True SOLO si el concepto del escalon salio 'permitido' (fail-closed)."""
    concepto = CONCEPTO_POR_ESCALON[escalon]
    return evaluacion["por_concepto"][concepto]["estado"] == "permitido"


def bloqueo_de(evaluacion: dict, escalon_o_concepto: str) -> dict:
    """Detalle reportable de un bloqueo: concepto + estado + razon + checklist."""
    concepto = CONCEPTO_POR_ESCALON.get(escalon_o_concepto, escalon_o_concepto)
    ev = evaluacion["por_concepto"][concepto]
    return {
        "concepto": concepto,
        "estado": ev["estado"],
        "razon": ev["razon"],
        "fuente": ev["fuente"],
        "checklist": ev["checklist"],
    }
