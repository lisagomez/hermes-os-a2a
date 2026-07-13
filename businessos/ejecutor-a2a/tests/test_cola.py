"""Tests de la COLA contra PostgREST simulado (httpx.MockTransport) — cero red.

El test estrella es `test_recupera_huerfanas_de_los_DOS_estados_en_vuelo`: reproduce el bug
que solo aparecio en runtime (smoke del 2026-07-12, `docker restart` con trabajo en vuelo).
Una tarea muerta en `en_revision` —la ventana MAS LARGA, minutos de build/tests— se quedaba
en el LIMBO: nadie la ejecutaba, no estaba en la cola, y el equipo no se enteraba.
"""
from __future__ import annotations

import asyncio
import json

import httpx
import pytest

from cola import ColaError, ColaSupabase


def cliente(manejador) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(manejador))


def cola_con(manejador) -> ColaSupabase:
    return ColaSupabase(url="https://x.supabase.co", key="k", http_client=cliente(manejador))


def tarea(task_id: str = "t-1") -> dict:
    return {
        "task_id": task_id, "departamento": "software", "objetivo": "x",
        "contexto": {}, "criterios_aceptacion": ["build verde"],
        "limites": {"intentos_max": 3, "max_turns": 120}, "observaciones": [],
    }


# ---------- el bug del limbo ----------

def test_recupera_huerfanas_de_los_DOS_estados_en_vuelo():
    """`en_ejecucion` Y `en_revision`. Olvidar el segundo = tarea perdida para siempre."""
    patches: list[tuple[str, dict]] = []

    def manejador(req: httpx.Request) -> httpx.Response:
        if req.method == "GET" and "estado=eq.en_ejecucion" in str(req.url):
            return httpx.Response(200, json=[
                {"task_id": "murio-ejecutando", "intentos": 1, "intentos_max": 3}])
        if req.method == "GET" and "estado=eq.en_revision" in str(req.url):
            return httpx.Response(200, json=[
                {"task_id": "murio-en-revision", "intentos": 1, "intentos_max": 3},
                {"task_id": "sin-intentos", "intentos": 3, "intentos_max": 3}])
        if req.method == "PATCH":
            patches.append((str(req.url), json.loads(req.content)))
            return httpx.Response(200, json=[{}])
        return httpx.Response(200, json=[])

    recuperadas = asyncio.run(cola_con(manejador).recuperar_huerfanas())

    assert recuperadas == [
        "murio-ejecutando (en_ejecucion)→recibida",
        "murio-en-revision (en_revision)→recibida",
        "sin-intentos (en_revision)→escalada",  # sin intentos: que lo mire un humano
    ]
    # La que vuelve a la cola se re-encola al FINAL (no se cuela con su hueco viejo).
    vuelta = next(c for u, c in patches if "murio-en-revision" in u)
    assert vuelta["estado"] == "recibida" and vuelta["encolada_en"] == "now()"
    # El CAS va en la URL: solo se toca si SIGUE en el estado que creiamos.
    assert all("estado=eq.en_" in u for u, _ in patches)


# ---------- encolar: autoritativo ----------

def test_encolar_escribe_el_payload_completo_y_devuelve_posicion():
    """Sin `payload` el worker perderia los limites (y volveria al techo de 40 turnos)."""
    escrito: dict = {}

    def manejador(req: httpx.Request) -> httpx.Response:
        if req.method == "POST":
            escrito.update(json.loads(req.content))
            return httpx.Response(201, json=[])
        if "estado=eq.recibida" in str(req.url):
            return httpx.Response(200, json=[
                {"task_id": "otra", "objetivo": "o", "prioridad": 0},
                {"task_id": "t-1", "objetivo": "x", "prioridad": 0}])
        return httpx.Response(200, json=[])  # en_ejecucion: nada

    cola = asyncio.run(cola_con(manejador).encolar(tarea()))

    assert cola["posicion"] == 2
    assert [f["task_id"] for f in cola["cola"]] == ["otra", "t-1"]
    assert escrito["estado"] == "recibida"
    assert escrito["payload"]["limites"]["max_turns"] == 120  # la fila basta para ejecutar
    assert escrito["encolada_en"] == "now()"


def test_si_supabase_falla_encolar_LEVANTA_no_miente():
    def manejador(req: httpx.Request) -> httpx.Response:
        return httpx.Response(503, text="upstream down")

    with pytest.raises(ColaError, match="HTTP 503"):
        asyncio.run(cola_con(manejador).encolar(tarea()))


# ---------- claim por CAS ----------

def test_reclamar_usa_CAS_y_si_lo_pierde_no_devuelve_tarea():
    def manejador(req: httpx.Request) -> httpx.Response:
        if req.method == "GET":
            return httpx.Response(200, json=[
                {"task_id": "t-1", "payload": tarea(), "intentos": 0}])
        if req.method == "PATCH":
            assert "estado=eq.recibida" in str(req.url)  # el CAS
            return httpx.Response(200, json=[])  # 0 filas: otro se la llevo
        return httpx.Response(200, json=[])

    assert asyncio.run(cola_con(manejador).reclamar()) is None


def test_reclamar_incrementa_intentos_y_devuelve_el_payload():
    patch: dict = {}

    def manejador(req: httpx.Request) -> httpx.Response:
        if req.method == "GET":
            return httpx.Response(200, json=[
                {"task_id": "t-1", "payload": tarea(), "intentos": 1}])
        if req.method == "PATCH":
            patch.update(json.loads(req.content))
            return httpx.Response(200, json=[{"task_id": "t-1"}])
        return httpx.Response(200, json=[])

    t = asyncio.run(cola_con(manejador).reclamar())

    assert t["task_id"] == "t-1"
    assert t["limites"]["max_turns"] == 120  # el ruteo sobrevive al viaje por la fila
    assert patch["estado"] == "en_ejecucion" and patch["intentos"] == 2


def test_fila_sin_payload_es_error_explicito():
    """Una fila encolada por una version vieja no se puede ejecutar: se dice, no se adivina."""
    def manejador(req: httpx.Request) -> httpx.Response:
        if req.method == "GET":
            return httpx.Response(200, json=[{"task_id": "vieja", "payload": None, "intentos": 0}])
        return httpx.Response(200, json=[{"task_id": "vieja"}])

    with pytest.raises(ColaError, match="sin `payload`"):
        asyncio.run(cola_con(manejador).reclamar())
