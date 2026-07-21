"""juez.py — juez LLM de sup-crm (lente adversarial, stateless).

Recibe la conversación y la respuesta propuesta y busca REFUTARLA en tres
frentes: hechos inventados, resolución indebida de dinero/legal (debía escalar)
y fuga de tono/marca. Fail-safe de la casa: si el juez no puede correr, el
veredicto es NO aprobado (proteger primero) — nunca un pass silencioso.
"""
from __future__ import annotations

import json
import os

import httpx

OR_API = "https://openrouter.ai/api/v1/chat/completions"
MODELO = os.environ.get("SUP_MODELO", "google/gemini-2.5-flash-lite")
TIMEOUT_S = 20.0

_SYSTEM = """\
Eres el SUPERVISOR de un CRM conversacional. Te dan la conversación con un
cliente y la RESPUESTA PROPUESTA por el agente de la marca {marca}. Tu trabajo
es intentar REFUTARLA. Rechaza (aprobado=false) si encuentras CUALQUIERA de:
1. HECHOS INVENTADOS: precios, fechas, existencias, direcciones, políticas o
   capacidades concretas que NO aparecen en la conversación ni son genéricas.
2. RESOLUCIÓN INDEBIDA: la respuesta resuelve o promete temas de dinero
   (reembolsos, descuentos, cobros), legales o de salud en vez de escalarlos
   a un humano.
3. FUGA DE MARCA/TONO: menciona otra empresa como si fuera propia, o contradice
   la identidad de {marca}.
Una respuesta prudente, genérica y que ofrece seguimiento humano se APRUEBA.
Responde SOLO un objeto JSON: {{"aprobado": true|false, "motivo": "una frase"}}.
"""


class JuezError(RuntimeError):
    """El juez no pudo emitir veredicto."""


class JuezLLM:
    def __init__(self, api_key: str | None = None, http_client: httpx.AsyncClient | None = None) -> None:
        self._key = api_key or os.environ.get("OPENROUTER_API_KEY") or ""
        self._http = http_client

    async def veredicto(self, marca: str, conversacion: str, respuesta: str) -> dict:
        body = {
            "model": MODELO,
            "messages": [
                {"role": "system", "content": _SYSTEM.format(marca=marca)},
                {
                    "role": "user",
                    "content": f"CONVERSACIÓN:\n{conversacion[:4000]}\n\nRESPUESTA PROPUESTA:\n{respuesta[:2000]}",
                },
            ],
            "response_format": {"type": "json_object"},
            "max_tokens": 150,
        }
        headers = {"Authorization": f"Bearer {self._key}", "Content-Type": "application/json"}
        client = self._http or httpx.AsyncClient(timeout=TIMEOUT_S)
        try:
            resp = await client.post(OR_API, headers=headers, json=body)
            if resp.status_code != 200:
                raise JuezError(f"OpenRouter HTTP {resp.status_code}")
            datos = json.loads(resp.json()["choices"][0]["message"]["content"])
        except (httpx.HTTPError, KeyError, IndexError, json.JSONDecodeError) as exc:
            raise JuezError(f"juez: {type(exc).__name__}") from exc
        finally:
            if self._http is None:
                await client.aclose()
        return {"aprobado": bool(datos.get("aprobado")), "motivo": str(datos.get("motivo") or "")[:300]}
