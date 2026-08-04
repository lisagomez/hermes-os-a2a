"""motor.py — llamada LLM del CRM (OpenRouter, mismo patrón que chat-web2).

Sin streaming: los canales de mensajería entregan mensajes completos. Modelo
barato por defecto (el CRM N1 es informativo); override por env, y por llamada
vía `modelo` (el routing lo decide la guardia de presupuesto, no este módulo).

Tras cada respuesta exitosa, `ultimo_uso` trae tokens y costo REAL del proveedor
(usage.include de OpenRouter) para registrarlo en token_usage — sin catálogo de
precios propio que derive (doctrina: sin precio del proveedor, 0 declarado y el
ingest nocturno lo recalcula o lo declara).
"""
from __future__ import annotations

import os

import httpx

OR_API = "https://openrouter.ai/api/v1/chat/completions"
MODELO = os.environ.get("CRM_MODELO", "google/gemini-2.5-flash-lite")
TIMEOUT_S = 30.0


class MotorError(RuntimeError):
    """OpenRouter no respondió correctamente."""


class MotorOpenRouter:
    def __init__(self, api_key: str | None = None, http_client: httpx.AsyncClient | None = None) -> None:
        self._key = api_key or os.environ.get("OPENROUTER_API_KEY") or ""
        self._http = http_client
        self.ultimo_uso: dict | None = None

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self._key}", "Content-Type": "application/json"}

    async def responder(
        self, system: str, historial: list[dict], mensaje: str, modelo: str | None = None
    ) -> str:
        """`historial` = [{"role": "user"|"assistant", "content": str}] previos."""
        body = {
            "model": modelo or MODELO,
            "messages": [{"role": "system", "content": system}, *historial, {"role": "user", "content": mensaje}],
            "max_tokens": 500,
            # OpenRouter devuelve el costo real en usage.cost (USD) con esto:
            "usage": {"include": True},
        }
        self.ultimo_uso = None
        client = self._http or httpx.AsyncClient(timeout=TIMEOUT_S)
        try:
            resp = await client.post(OR_API, headers=self._headers(), json=body)
            if resp.status_code != 200:
                raise MotorError(f"OpenRouter HTTP {resp.status_code}")
            data = resp.json()
            uso = data.get("usage") or {}
            self.ultimo_uso = {
                "modelo": data.get("model") or body["model"],
                "tokens_in": int(uso.get("prompt_tokens") or 0),
                "tokens_out": int(uso.get("completion_tokens") or 0),
                "costo_usd": float(uso.get("cost") or 0),
            }
            return data["choices"][0]["message"]["content"].strip()
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
            raise MotorError(f"OpenRouter: {type(exc).__name__}") from exc
        finally:
            if self._http is None:
                await client.aclose()
