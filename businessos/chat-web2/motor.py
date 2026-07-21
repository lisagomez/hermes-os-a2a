"""motor.py — cliente de OpenRouter para el chat de venta (streaming + extracción).

Dos operaciones:
  - `stream(mensajes)` → itera deltas de texto del modelo (para el SSE del chat).
  - `extraer_lead(conversacion)` → una llamada estructurada (JSON) que saca
    {nombre, email, empresa, interes} de la charla. Solo se invoca cuando ya hay
    un email en la conversación (gate barato en app.py), así el costo extra es
    marginal.

Gotcha Cloudflare 1010: OpenRouter está detrás de Cloudflare y bloquea el UA por
defecto de las libs → mandamos `User-Agent: curl/8.0` (mismo patrón que
probe-glm.py / polar-cobros.py). NUNCA se imprime la key ni el contenido.
"""
from __future__ import annotations

import json
import os
from typing import AsyncIterator

import httpx

OR_API = "https://openrouter.ai/api/v1/chat/completions"
# gemini-2.5-flash-lite: barato, rápido y con caché de prefijo (mismo modelo del
# loop de Hermes). Configurable por si se quiere otro.
MODELO_CHAT = os.environ.get("CHAT_MODEL", "google/gemini-2.5-flash-lite")
MODELO_EXTRACT = os.environ.get("CHAT_EXTRACT_MODEL", MODELO_CHAT)
TIMEOUT_S = 120.0

_EXTRACT_SYSTEM = (
    "Extraes datos de contacto de una conversación entre un visitante y un "
    "asistente de ventas. Devuelve SOLO un objeto JSON con las claves: "
    "nombre (string|null), email (string|null), telefono (string|null, con lada/"
    "código de país si aparece), empresa (string|null), "
    "interes (string|null, una frase de qué quiere construir), "
    "horario (string|null, día y hora que el visitante eligió para la llamada, "
    "tal como lo dijo). Usa null cuando el dato no aparezca. No inventes."
)


class MotorError(RuntimeError):
    """OpenRouter no respondió correctamente."""


class MotorOpenRouter:
    def __init__(self, api_key: str | None = None, http_client: httpx.AsyncClient | None = None) -> None:
        self._key = api_key or os.environ.get("OPENROUTER_API_KEY") or ""
        self._http = http_client

    @property
    def activo(self) -> bool:
        return bool(self._key)

    def _headers(self) -> dict:
        # UA curl/8.0 por el gotcha Cloudflare 1010; Referer/Title son opcionales de OR.
        return {
            "Authorization": f"Bearer {self._key}",
            "Content-Type": "application/json",
            "User-Agent": "curl/8.0",
            "HTTP-Referer": "https://cliente-web2.vercel.app",
            "X-Title": "A2A Factory web2 chat",
        }

    async def stream(self, mensajes: list[dict]) -> AsyncIterator[str]:
        """Itera los deltas de texto del modelo. Lanza MotorError si el HTTP falla."""
        body = {"model": MODELO_CHAT, "messages": mensajes, "stream": True, "max_tokens": 800}
        client = self._http or httpx.AsyncClient(timeout=TIMEOUT_S)
        try:
            async with client.stream("POST", OR_API, headers=self._headers(), json=body) as resp:
                if resp.status_code != 200:
                    await resp.aread()
                    raise MotorError(f"OpenRouter HTTP {resp.status_code}")
                async for linea in resp.aiter_lines():
                    if not linea.startswith("data:"):
                        continue
                    dato = linea[5:].strip()
                    if dato == "[DONE]":
                        break
                    try:
                        obj = json.loads(dato)
                        delta = obj["choices"][0]["delta"].get("content")
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue
                    if delta:
                        yield delta
        except httpx.HTTPError as exc:
            raise MotorError(f"OpenRouter stream: {type(exc).__name__}") from exc
        finally:
            if self._http is None:
                await client.aclose()

    async def extraer_lead(self, conversacion: str) -> dict | None:
        """Extrae {nombre,email,telefono,empresa,interes,horario} de la charla.

        None si no hay NINGÚN dato de contacto (ni email ni teléfono)."""
        body = {
            "model": MODELO_EXTRACT,
            "messages": [
                {"role": "system", "content": _EXTRACT_SYSTEM},
                {"role": "user", "content": conversacion[:6000]},
            ],
            "response_format": {"type": "json_object"},
            "max_tokens": 300,
        }
        client = self._http or httpx.AsyncClient(timeout=TIMEOUT_S)
        try:
            resp = await client.post(OR_API, headers=self._headers(), json=body)
            if resp.status_code != 200:
                raise MotorError(f"OpenRouter extract HTTP {resp.status_code}")
            contenido = resp.json()["choices"][0]["message"]["content"]
            datos = json.loads(contenido)
        except (httpx.HTTPError, KeyError, IndexError, json.JSONDecodeError) as exc:
            raise MotorError(f"OpenRouter extract: {type(exc).__name__}") from exc
        finally:
            if self._http is None:
                await client.aclose()
        email = (datos.get("email") or "").strip()
        telefono = (datos.get("telefono") or "").strip()
        if not email and not telefono:
            return None
        return {
            "nombre": (datos.get("nombre") or "").strip() or None,
            "email": email or None,
            "telefono": telefono or None,
            "empresa": (datos.get("empresa") or "").strip() or None,
            "interes": (datos.get("interes") or "").strip() or None,
            "horario": (datos.get("horario") or "").strip() or None,
        }
