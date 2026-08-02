"""fakes.py — dobles de prueba compartidos: PostgREST (Supabase) y grafo.

Sin red: httpx.MockTransport. El fake de Supabase ademas VIGILA la frontera
dura del servicio: cualquier escritura sobre /rest/v1/leads queda registrada
en `escrituras_leads` (y los tests exigen que este vacia SIEMPRE).
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

import httpx


def _filtro(params, llave: str, prefijo: str = "eq.") -> str | None:
    valor = params.get(llave)
    if valor is None or not valor.startswith(prefijo):
        return None
    return valor[len(prefijo):]


class FakeSupabase:
    def __init__(self) -> None:
        self.leads: dict[str, dict] = {}
        self.consolidado: dict[tuple[str, str], dict] = {}
        self.filas_69b: dict[str, dict] = {}
        self.overrides: list[dict] = []
        self.patrones: dict[str, dict] = {}
        self.ledger: list[dict] = []
        self.refuerzos: list[dict] = []
        self.escrituras_leads: list[str] = []
        self.fallar_ledger = False

    def client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(transport=httpx.MockTransport(self._handler))

    def _handler(self, request: httpx.Request) -> httpx.Response:
        path, metodo, params = request.url.path, request.method, request.url.params

        if path == "/rest/v1/leads":
            if metodo != "GET":
                self.escrituras_leads.append(f"{metodo} {request.url}")
                return httpx.Response(405)
            fila = self.leads.get(_filtro(params, "lead_id") or "")
            return httpx.Response(200, json=[fila] if fila else [])

        if path == "/rest/v1/enriquecimiento_intento":
            if metodo == "GET":
                filas = [f for f in self.ledger
                         if _filtro(params, "fuente") in (None, f["fuente"])]
                return httpx.Response(200, json=filas)
            if self.fallar_ledger:
                return httpx.Response(500)
            fila = json.loads(request.content)
            fila["id"] = len(self.ledger) + 1
            self.ledger.append(fila)
            return httpx.Response(201, json=[{"id": fila["id"]}])

        if path == "/rest/v1/lead_enriquecimiento":
            if metodo == "GET":
                lead_id = _filtro(params, "lead_id")
                filas = [f for (lid, _), f in self.consolidado.items() if lid == lead_id]
                return httpx.Response(200, json=filas)
            fila = json.loads(request.content)
            self.consolidado[(fila["lead_id"], fila["campo"])] = fila
            return httpx.Response(201)

        if path == "/rest/v1/contraparte_69b":
            fila = self.filas_69b.get(_filtro(params, "rfc") or "")
            if fila is not None and "consultado_en" not in fila:
                # espejo del runtime: la vigilancia SIEMPRE escribe consultado_en
                # (y la columna tiene default). Fixture sin el = dictamen fresco;
                # un test de rancidez lo fija explicito.
                fila = {**fila,
                        "consultado_en": datetime.now(timezone.utc).isoformat()}
            return httpx.Response(200, json=[fila] if fila else [])

        if path == "/rest/v1/override_69b":
            rfc = _filtro(params, "rfc")
            corte = _filtro(params, "vence_en", "gt.") or ""
            vivos = [o for o in self.overrides
                     if o["rfc"] == rfc and not o["invalidado"] and o["vence_en"] > corte]
            return httpx.Response(200, json=vivos)

        if path == "/rest/v1/dominio_patron":
            fila = self.patrones.get(_filtro(params, "dominio") or "")
            return httpx.Response(200, json=[fila] if fila else [])

        if path == "/rest/v1/rpc/dominio_patron_reforzar":
            self.refuerzos.append(json.loads(request.content))
            return httpx.Response(204)

        return httpx.Response(404)


# RFCs fixture con digito verificador calculado A MANO (ver test_rfc.py)
RFC_PM = "ABC680524P73"
RFC_PF = "GOML851230AB8"

DENUE_ACME = [{"Id": "1", "CLEE": "c1", "Nombre": "ACME",
               "Razon_social": "ACME SA DE CV", "Telefono": "5511112222",
               "Correo_e": "ventas@acme.mx"}]


class FakeDenueAPI:
    """API DENUE falsa que CUENTA llamadas (para asegurar que un escalon
    bloqueado o ya consolidado no paga lookup)."""

    def __init__(self, respuesta=None, status=200) -> None:
        self.respuesta, self.status, self.llamadas = respuesta, status, 0

    def cliente(self, token="tok"):
        from denue import Denue

        def handler(request: httpx.Request) -> httpx.Response:
            self.llamadas += 1
            if self.status != 200:
                return httpx.Response(self.status)
            return httpx.Response(200, json=self.respuesta or [])
        http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        return Denue(token=token, base="http://denue-fake", http_client=http)


# estados del grafo por defecto = los del seed real (contrato PR #198)
ESTADOS_GRAFO = {
    "consulta a fuente publica oficial": "permitido",
    "inferencia de correo corporativo por patron de correo de dominio": "permitido",
    "dato de persona fisica para prospeccion": "dudoso",
    "transferencia internacional de datos a proveedor de enriquecimiento": "dudoso",
}


class FakeGrafo:
    def __init__(self, estados: dict | None = None, status_code: int = 200,
                 omitir: set | None = None) -> None:
        self.estados = {**ESTADOS_GRAFO, **(estados or {})}
        self.status_code = status_code
        self.omitir = omitir or set()
        self.llamadas = 0

    def client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(transport=httpx.MockTransport(self._handler))

    def _handler(self, request: httpx.Request) -> httpx.Response:
        self.llamadas += 1
        if self.status_code != 200:
            return httpx.Response(self.status_code)
        pedido = json.loads(request.content)
        conceptos = []
        for c in pedido["conceptos"]:
            desc = c["descripcion"]
            if desc in self.omitir:
                continue
            conceptos.append({
                "descripcion": desc,
                "estado": self.estados.get(desc, "dudoso"),
                "razon": f"razon de prueba para {desc}",
                "fuente": {"clave": "MX-LFPDPPP2025-TEST", "cita": "cita", "url": "u",
                           "vigencia": {"desde": "2025-03-21", "hasta": None}},
                "checklist": [f"checklist de {desc}"],
                "banderas": [],
            })
        return httpx.Response(200, json={
            "conceptos": conceptos,
            "estado": "dudoso",
            "banderas_rojas": [],
            "checklist": [],
            "fuentes": [{"clave": "MX-LFPDPPP2025-TEST"}],
            "disclaimer": "esto no es asesoria (prueba)",
        })
