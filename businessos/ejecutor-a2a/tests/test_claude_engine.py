"""Tests del motor real ClaudeAgentEngine (Fase 4 del PRP-006) — SDK MOCKEADO.

Cero tokens: `query_fn` inyectado captura prompt/options y devuelve ResultMessage
REALES del SDK instalado (misma dataclass que produciria el CLI). Se valida el
mapeo tarea→sesion, el respeto de limites y el registro en token_usage.
El smoke con modelo real NO vive aqui (gated, opt-in, decision de la dueña).
"""
from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from claude_agent_sdk import ResultMessage
from claude_agent_sdk.types import AssistantMessage

from claude_engine import ClaudeAgentEngine, filas_token_usage
from engine import EngineError, MockEngine, crear_engine


def turno(modelo: str, tin: int, tout: int) -> AssistantMessage:
    """Un turno del motor con su gasto (lo que llega ANTES del ResultMessage)."""
    return AssistantMessage(
        content=[], model=modelo, usage={"input_tokens": tin, "output_tokens": tout}
    )


def result_message(**extra) -> ResultMessage:
    base = dict(
        subtype="success",
        duration_ms=1234,
        duration_api_ms=1000,
        is_error=False,
        num_turns=3,
        session_id="sesion-1",
        total_cost_usd=0.12,
        usage={"input_tokens": 100, "output_tokens": 50},
        model_usage={
            "claude-haiku-4-5": {"inputTokens": 80, "outputTokens": 40, "costUSD": 0.02},
            "claude-sonnet-5": {"inputTokens": 20, "outputTokens": 10, "costUSD": 0.10},
        },
        result="login implementado; build y tests verdes en el worktree",
    )
    base.update(extra)
    return ResultMessage(**base)


class QueryFake:
    """Doble de claude_agent_sdk.query: captura kwargs y emite mensajes fijos."""

    def __init__(self, mensajes) -> None:
        self._mensajes = mensajes
        self.prompt = None
        self.options = None

    def __call__(self, *, prompt, options=None):
        self.prompt = prompt
        self.options = options

        async def gen():
            for m in self._mensajes:
                yield m

        return gen()


class RegistroEspia:
    def __init__(self) -> None:
        self.filas: list[dict] = []

    async def registrar(self, filas: list[dict]) -> None:
        self.filas.extend(filas)


def tarea(**extra) -> dict:
    base = {
        "task_id": "t-200",
        "departamento": "software",
        "objetivo": "añade login con Google",
        "contexto": {},
        "criterios_aceptacion": ["build verde", "flujo probado en browser"],
        "limites": {"intentos_max": 3},
        "observaciones": [],
    }
    base.update(extra)
    return base


def correr(engine: ClaudeAgentEngine, t: dict, worktree: Path) -> dict:
    return asyncio.run(engine.run(t, worktree))


def test_mapeo_tarea_a_sesion(tmp_path):
    query = QueryFake([result_message()])
    salida = correr(ClaudeAgentEngine(query_fn=query, registro=RegistroEspia()), tarea(), tmp_path)

    # El prompt lleva objetivo y criterios; el cwd es EL WORKTREE (nunca otro lado).
    assert "añade login con Google" in query.prompt
    assert "- build verde" in query.prompt
    assert query.options.cwd == str(tmp_path)
    assert query.options.max_turns > 0
    assert query.options.permission_mode == "bypassPermissions"

    assert salida["artefactos"]["engine"] == "claude-agent-sdk"
    assert salida["artefactos"]["num_turns"] == 3
    assert salida["artefactos"]["costo_usd"] == 0.12
    assert "login implementado" in salida["notas"]


def test_observaciones_del_rechazo_van_en_el_prompt(tmp_path):
    query = QueryFake([result_message()])
    t = tarea(observaciones=["tests: callback OAuth 500 en src/auth.ts"])
    correr(ClaudeAgentEngine(query_fn=query, registro=RegistroEspia()), t, tmp_path)

    assert "OBSERVACIONES DEL RECHAZO ANTERIOR" in query.prompt
    assert "callback OAuth 500" in query.prompt


def test_limites_de_la_tarea_se_respetan(tmp_path):
    query = QueryFake([result_message()])
    t = tarea(limites={"intentos_max": 3, "modelo_pref": "claude-haiku-4-5",
                       "presupuesto_usd": 2.5, "max_turns": 10})
    correr(ClaudeAgentEngine(query_fn=query, registro=RegistroEspia()), t, tmp_path)

    assert query.options.model == "claude-haiku-4-5"
    assert query.options.max_budget_usd == 2.5
    assert query.options.max_turns == 10


def test_cada_modelo_usado_escribe_en_token_usage(tmp_path):
    registro = RegistroEspia()
    correr(ClaudeAgentEngine(query_fn=QueryFake([result_message()]), registro=registro),
           tarea(), tmp_path)

    por_modelo = {f["modelo"]: f for f in registro.filas}
    assert set(por_modelo) == {"claude-haiku-4-5", "claude-sonnet-5"}
    assert all(f["vertical"] == "trio" for f in registro.filas)
    assert por_modelo["claude-haiku-4-5"]["tokens_in"] == 80
    assert por_modelo["claude-sonnet-5"]["costo_usd"] == 0.10


def test_sin_model_usage_registra_el_total(tmp_path):
    registro = RegistroEspia()
    rm = result_message(model_usage=None)
    correr(ClaudeAgentEngine(query_fn=QueryFake([rm]), registro=registro), tarea(), tmp_path)

    [fila] = registro.filas
    assert fila["tokens_in"] == 100 and fila["tokens_out"] == 50
    assert fila["costo_usd"] == 0.12


def test_corrida_en_error_es_engine_error_pero_registra_gasto(tmp_path):
    registro = RegistroEspia()
    rm = result_message(is_error=True, subtype="error_during_execution",
                        result="presupuesto agotado")
    engine = ClaudeAgentEngine(query_fn=QueryFake([rm]), registro=registro)

    with pytest.raises(EngineError, match="presupuesto agotado"):
        correr(engine, tarea(), tmp_path)
    assert registro.filas  # los tokens quemados son reales aunque la corrida fallo


def test_sin_result_message_es_engine_error(tmp_path):
    engine = ClaudeAgentEngine(query_fn=QueryFake([]), registro=RegistroEspia())
    with pytest.raises(EngineError, match="no entrego ResultMessage"):
        correr(engine, tarea(), tmp_path)


def test_transporte_roto_es_engine_error(tmp_path):
    def query_rota(*, prompt, options=None):
        async def gen():
            raise RuntimeError("CLI not found")
            yield  # pragma: no cover

        return gen()

    engine = ClaudeAgentEngine(query_fn=query_rota, registro=RegistroEspia())
    with pytest.raises(EngineError, match="claude-agent-sdk"):
        correr(engine, tarea(), tmp_path)


def test_corrida_muerta_a_media_faena_registra_el_gasto_parcial(tmp_path):
    """El bug de la 1a corrida real: el motor abortado NO registraba los tokens
    quemados (el raise ocurria antes del registro). El gasto se perdia en silencio."""
    registro = RegistroEspia()

    def query_abortada(*, prompt, options=None):
        async def gen():
            yield turno("glm-5.2", 1000, 200)
            yield turno("glm-5.2", 500, 300)
            raise RuntimeError("proceso del motor muerto")  # cliente se desconecto

        return gen()

    engine = ClaudeAgentEngine(query_fn=query_abortada, registro=registro)
    with pytest.raises(EngineError):
        correr(engine, tarea(), tmp_path)

    [fila] = registro.filas  # se acumulan los DOS turnos, un solo modelo
    assert fila["task_id"] == "t-200"
    assert fila["vertical"] == "trio"
    assert (fila["tokens_in"], fila["tokens_out"]) == (1500, 500)
    assert fila["costo_usd"] == 0.0  # el motor no tarifa: honesto en vez de inventado


def test_max_turns_registra_el_gasto_del_result_no_el_parcial(tmp_path):
    """Lo que pasó de verdad (2026-07-12, intento 3 de mission-control-2026-0001): al topar
    `max_turns` el CLI emite un ResultMessage is_error CON su model_usage y DESPUÉS sale con
    exit!=0, que el SDK convierte en excepción. El gasto bueno ya llegó: hay que registrar ESE,
    no el acumulado turno a turno (que en la corrida real vino vacío → 'sin gasto registrable',
    y ~$1 de tokens quemados desapareció del presupuesto)."""
    registro = RegistroEspia()

    def query_max_turns(*, prompt, options=None):
        async def gen():
            yield turno("glm-5.2", 1000, 200)  # los turnos NO traen usage en el CLI real
            yield result_message(
                is_error=True,
                subtype="error_max_turns",
                model_usage={"glm-5.2": {"inputTokens": 64979, "outputTokens": 23038,
                                         "costUSD": 1.4753}},
            )
            raise RuntimeError(
                "Claude Code returned an error result: Reached maximum number of turns (40)"
            )

        return gen()

    engine = ClaudeAgentEngine(query_fn=query_max_turns, registro=registro)
    with pytest.raises(EngineError, match="maximum number of turns"):
        correr(engine, tarea(), tmp_path)

    [fila] = registro.filas  # el ResultMessage manda: cifras reales, no el parcial
    assert fila["modelo"] == "glm-5.2"
    assert (fila["tokens_in"], fila["tokens_out"]) == (64979, 23038)
    assert fila["costo_usd"] == 1.4753
    assert fila["task_id"] == "t-200"


def test_sin_result_message_pero_con_turnos_registra_lo_quemado(tmp_path):
    registro = RegistroEspia()
    engine = ClaudeAgentEngine(
        query_fn=QueryFake([turno("glm-5.2", 10, 5)]), registro=registro
    )
    with pytest.raises(EngineError, match="no entrego ResultMessage"):
        correr(engine, tarea(), tmp_path)

    assert [(f["tokens_in"], f["tokens_out"]) for f in registro.filas] == [(10, 5)]


def test_con_result_message_el_parcial_no_duplica_el_gasto(tmp_path):
    """El ResultMessage es autoritativo: los turnos NO se suman encima de el."""
    registro = RegistroEspia()
    mensajes = [turno("claude-haiku-4-5", 80, 40), result_message()]
    correr(ClaudeAgentEngine(query_fn=QueryFake(mensajes), registro=registro), tarea(), tmp_path)

    por_modelo = {f["modelo"]: f for f in registro.filas}
    assert set(por_modelo) == {"claude-haiku-4-5", "claude-sonnet-5"}  # los del result
    assert por_modelo["claude-haiku-4-5"]["tokens_in"] == 80  # NO 160
    assert por_modelo["claude-haiku-4-5"]["costo_usd"] == 0.02  # con su costo real


def test_fabrica_por_env():
    assert isinstance(crear_engine("mock"), MockEngine)
    assert isinstance(crear_engine("claude"), ClaudeAgentEngine)
    with pytest.raises(EngineError, match="desconocido"):
        crear_engine("gpt")


def test_filas_token_usage_maneja_snake_case():
    rm = result_message(model_usage={"m1": {"input_tokens": 5, "output_tokens": 7, "cost_usd": 0.01}})
    [fila] = filas_token_usage(rm, None)
    assert (fila["tokens_in"], fila["tokens_out"], fila["costo_usd"]) == (5, 7, 0.01)
