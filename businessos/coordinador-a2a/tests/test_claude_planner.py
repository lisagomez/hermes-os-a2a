"""Tests del Planner real ClaudePlanner (Fase 7, Fase 5) — SDK MOCKEADO, cero tokens.

`query_fn` inyectado captura prompt/options y devuelve ResultMessage REALES del SDK
instalado (misma dataclass que produciria el CLI). Se valida el mapeo tarea→prompt,
el respeto de límites, la extracción/validación del DAG y el registro en token_usage.
El planner con modelo real NO vive aquí (opt-in, decisión de la dueña).
"""
from __future__ import annotations

import asyncio
import json

import pytest

from claude_agent_sdk import (
    CLIConnectionError,
    RateLimitEvent,
    RateLimitInfo,
    ResultMessage,
)
from claude_agent_sdk.types import AssistantMessage

from claude_planner import ClaudePlanner, _extraer_json
from planner import PlannerError, crear_planner

PLAN = {"sub_tareas": [
    {"task_id": "auth", "objetivo": "auth google", "criterios_aceptacion": ["build verde"],
     "depende_de": [], "alcance": ["app/auth/**"]},
    {"task_id": "perfil", "objetivo": "perfil editable", "criterios_aceptacion": ["build verde"],
     "depende_de": ["auth"], "alcance": ["app/perfil/**"]},
]}


def result_message(**extra) -> ResultMessage:
    base = dict(
        subtype="success", duration_ms=1234, duration_api_ms=1000, is_error=False,
        num_turns=2, session_id="s-1", total_cost_usd=0.03,
        usage={"input_tokens": 200, "output_tokens": 80},
        model_usage={"claude-sonnet-5": {"inputTokens": 200, "outputTokens": 80, "costUSD": 0.03}},
        result=json.dumps(PLAN),
    )
    base.update(extra)
    return ResultMessage(**base)


class QueryFake:
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

    async def registrar(self, filas) -> None:
        self.filas.extend(filas)


def tarea(**extra) -> dict:
    base = {
        "task_id": "cuentas-0007",
        "objetivo": "modulo de cuentas completo",
        "criterios_aceptacion": ["build verde en el todo"],
        "contexto": {"repo": "recetas"},
        "limites": {"fan_out_max": 3, "modelo_pref": "claude-sonnet-5"},
    }
    base.update(extra)
    return base


def plan_de(planner, t):
    return asyncio.run(planner.plan(t))


# ---------- extracción de JSON ----------

def test_extraer_json_directo():
    assert _extraer_json('{"a": 1}') == {"a": 1}


def test_extraer_json_con_fences_y_prosa():
    txt = "Aquí tienes el plan:\n```json\n{\"a\": 1}\n```\nListo."
    assert _extraer_json(txt) == {"a": 1}


def test_extraer_json_invalido_es_planner_error():
    with pytest.raises(PlannerError, match="JSON"):
        _extraer_json("no soy json")


# ---------- planificación ----------

def test_planifica_desde_el_modelo():
    query = QueryFake([result_message()])
    plan = plan_de(ClaudePlanner(query_fn=query, registro=RegistroEspia()), tarea())

    # El prompt lleva objetivo, criterios y repo; las opciones respetan el modelo pedido.
    assert "modulo de cuentas completo" in query.prompt
    assert "- build verde en el todo" in query.prompt
    assert "recetas" in query.prompt
    assert query.options.model == "claude-sonnet-5"

    # El DAG salió validado (orden topológico: auth antes que perfil).
    assert [s["task_id"] for s in plan["sub_tareas"]] == ["auth", "perfil"]
    assert plan["orden"].index("auth") < plan["orden"].index("perfil")


def test_gasto_del_planner_va_a_token_usage_del_padre():
    registro = RegistroEspia()
    plan_de(ClaudePlanner(query_fn=QueryFake([result_message()]), registro=registro), tarea())

    [fila] = registro.filas
    assert fila["vertical"] == "trio"
    assert fila["task_id"] == "cuentas-0007"      # atribuido a la fila PADRE
    assert fila["modelo"] == "claude-sonnet-5"
    assert fila["costo_usd"] == 0.03


def test_json_del_modelo_con_fences_se_parsea():
    rm = result_message(result="```json\n" + json.dumps(PLAN) + "\n```")
    plan = plan_de(ClaudePlanner(query_fn=QueryFake([rm]), registro=RegistroEspia()), tarea())
    assert len(plan["sub_tareas"]) == 2


# ---------- errores → PlannerError ----------

def test_dag_invalido_del_modelo_es_planner_error():
    ciclico = {"sub_tareas": [
        {"task_id": "a", "objetivo": "a", "criterios_aceptacion": ["x"], "depende_de": ["b"]},
        {"task_id": "b", "objetivo": "b", "criterios_aceptacion": ["x"], "depende_de": ["a"]},
    ]}
    rm = result_message(result=json.dumps(ciclico))
    with pytest.raises(PlannerError, match="invalido del modelo"):
        plan_de(ClaudePlanner(query_fn=QueryFake([rm]), registro=RegistroEspia()), tarea())


def test_texto_no_json_es_planner_error():
    rm = result_message(result="no pude, lo siento")
    with pytest.raises(PlannerError, match="JSON"):
        plan_de(ClaudePlanner(query_fn=QueryFake([rm]), registro=RegistroEspia()), tarea())


def test_corrida_en_error_es_planner_error_pero_registra_gasto():
    registro = RegistroEspia()
    rm = result_message(is_error=True, subtype="error", result="presupuesto agotado")
    with pytest.raises(PlannerError, match="en error"):
        plan_de(ClaudePlanner(query_fn=QueryFake([rm]), registro=registro), tarea())
    assert registro.filas  # los tokens quemados son reales aunque falle


def test_sin_result_message_es_planner_error():
    with pytest.raises(PlannerError, match="ResultMessage"):
        plan_de(ClaudePlanner(query_fn=QueryFake([]), registro=RegistroEspia()), tarea())


def test_transporte_roto_es_planner_error():
    def query_rota(*, prompt, options=None):
        async def gen():
            raise RuntimeError("CLI not found")
            yield  # pragma: no cover

        return gen()

    with pytest.raises(PlannerError, match="claude-agent-sdk"):
        plan_de(ClaudePlanner(query_fn=query_rota, registro=RegistroEspia()), tarea())


def test_fabrica_claude_devuelve_claude_planner():
    assert isinstance(crear_planner("claude"), ClaudePlanner)


# ---------- clasificacion de errores transitorios del proveedor (2026-07-25) ----------
# Mismo criterio que el Ejecutor (errores_proveedor.clasificar_transitorio, compartido):
# un 429/5xx/conexion caida del Planner es transitorio (lo reintenta el Coordinador),
# un plan invalido / max_turns es definitivo (escala).


def query_yield_luego_raise(mensajes, exc):
    """Como el CLI real ante su propio error: emite mensajes y LUEGO sale con exit!=0."""
    def _q(*, prompt, options=None):
        async def gen():
            for m in mensajes:
                yield m
            raise exc
        return gen()
    return _q


def test_429_del_planner_es_transitorio():
    rm = result_message(is_error=True, subtype="success", api_error_status=429, result="")
    engine = ClaudePlanner(
        query_fn=query_yield_luego_raise(
            [rm], RuntimeError("Claude Code returned an error result: success")),
        registro=RegistroEspia(),
    )
    with pytest.raises(PlannerError) as e:
        plan_de(engine, tarea())
    assert e.value.transitorio is True


def test_rate_limit_rejected_trae_resets_at_para_pausar():
    rate = RateLimitEvent(
        rate_limit_info=RateLimitInfo(status="rejected", resets_at=1893456000),
        uuid="u", session_id="s",
    )
    rm = result_message(is_error=True, subtype="success", api_error_status=429, result="")
    with pytest.raises(PlannerError) as e:
        plan_de(ClaudePlanner(query_fn=QueryFake([rate, rm]), registro=RegistroEspia()), tarea())
    assert e.value.transitorio is True
    assert e.value.reanudar_epoch == 1893456000


def test_conexion_caida_es_transitorio():
    engine = ClaudePlanner(
        query_fn=query_yield_luego_raise([], CLIConnectionError("Connection closed mid-response")),
        registro=RegistroEspia(),
    )
    with pytest.raises(PlannerError) as e:
        plan_de(engine, tarea())
    assert e.value.transitorio is True


def test_error_del_stream_rate_limit_es_transitorio():
    msg = AssistantMessage(content=[], model="claude-sonnet-5", usage={}, error="rate_limit")
    engine = ClaudePlanner(
        query_fn=query_yield_luego_raise([msg], RuntimeError("boom")), registro=RegistroEspia())
    with pytest.raises(PlannerError) as e:
        plan_de(engine, tarea())
    assert e.value.transitorio is True


def test_plan_invalido_NO_es_transitorio():
    """Un DAG malo es culpa del modelo, no del proveedor: definitivo (escala, no reintenta)."""
    ciclico = {"sub_tareas": [
        {"task_id": "a", "objetivo": "a", "criterios_aceptacion": ["x"], "depende_de": ["b"]},
        {"task_id": "b", "objetivo": "b", "criterios_aceptacion": ["x"], "depende_de": ["a"]},
    ]}
    rm = result_message(result=json.dumps(ciclico))
    with pytest.raises(PlannerError) as e:
        plan_de(ClaudePlanner(query_fn=QueryFake([rm]), registro=RegistroEspia()), tarea())
    assert e.value.transitorio is False


def test_corrida_en_error_normal_NO_es_transitorio():
    rm = result_message(is_error=True, subtype="error_during_execution",
                        result="TypeError: undefined")
    with pytest.raises(PlannerError) as e:
        plan_de(ClaudePlanner(query_fn=QueryFake([rm]), registro=RegistroEspia()), tarea())
    assert e.value.transitorio is False


# ---------- ruteo por dificultad (doctrina §3.5, 2026-07-27) ----------

from claude_planner import ENV_RUTEO, PROMPT_SISTEMA, mapa_ruteo_de_env  # noqa: E402

PLAN_CON_DIFICULTAD = {"sub_tareas": [
    {"task_id": "scaffold", "objetivo": "scaffolding de vistas", "criterios_aceptacion": ["build verde"],
     "depende_de": [], "alcance": ["app/ui/**"], "dificultad": "mecanica",
     "por_que": "bien especificada, una carpeta, la verifica el build"},
    {"task_id": "contrato", "objetivo": "contrato entre modulos", "criterios_aceptacion": ["tests verdes"],
     "depende_de": ["scaffold"], "alcance": ["app/lib/**"], "dificultad": "delicada",
     "por_que": "toca el contrato compartido; verificar reciprocas antes de integrar"},
    {"task_id": "docs", "objetivo": "documentar el modulo", "criterios_aceptacion": ["docs al dia"],
     "depende_de": ["contrato"], "alcance": ["docs/**"]},
]}


def test_mapa_ruteo_parse_completo_y_parcial():
    assert mapa_ruteo_de_env("mecanica=glm-4.7, delicada=glm-5.2") == {
        "mecanica": "glm-4.7", "delicada": "glm-5.2",
    }
    assert mapa_ruteo_de_env("") == {}
    assert mapa_ruteo_de_env("estandar=glm-5.2") == {"estandar": "glm-5.2"}


@pytest.mark.parametrize("crudo", ["mecanica", "facil=glm-5.2", "mecanica=", "=glm-5.2"])
def test_mapa_ruteo_malformado_es_config_invalida(crudo):
    with pytest.raises(PlannerError, match="malformado"):
        mapa_ruteo_de_env(crudo)


def test_env_malformada_no_deja_arrancar_el_planner(monkeypatch):
    monkeypatch.setenv(ENV_RUTEO, "facil=glm-5.2")
    with pytest.raises(PlannerError, match="malformado"):
        crear_planner("claude")


def test_ruteo_estampa_modelo_pref_por_dificultad():
    rm = result_message(result=json.dumps(PLAN_CON_DIFICULTAD))
    planner = ClaudePlanner(
        query_fn=QueryFake([rm]), registro=RegistroEspia(),
        ruteo={"mecanica": "glm-4.7", "delicada": "glm-5.2"},
    )
    plan = plan_de(planner, tarea())
    prefs = {s["task_id"]: s.get("limites", {}).get("modelo_pref") for s in plan["sub_tareas"]}
    assert prefs["scaffold"] == "glm-4.7"
    assert prefs["contrato"] == "glm-5.2"
    # Sin dificultad y sin mapeo: queda para la herencia del padre (executor).
    assert prefs["docs"] is None


def test_modelo_pref_propio_de_la_subtarea_gana_al_ruteo():
    con_propio = {"sub_tareas": [dict(
        PLAN_CON_DIFICULTAD["sub_tareas"][0],
        limites={"modelo_pref": "el-que-pidio-la-subtarea"},
    )]}
    rm = result_message(result=json.dumps(con_propio))
    planner = ClaudePlanner(
        query_fn=QueryFake([rm]), registro=RegistroEspia(), ruteo={"mecanica": "glm-4.7"},
    )
    plan = plan_de(planner, tarea())
    assert plan["sub_tareas"][0]["limites"]["modelo_pref"] == "el-que-pidio-la-subtarea"


def test_ruteo_apagado_no_cambia_el_plan():
    rm = result_message(result=json.dumps(PLAN_CON_DIFICULTAD))
    planner = ClaudePlanner(query_fn=QueryFake([rm]), registro=RegistroEspia(), ruteo={})
    plan = plan_de(planner, tarea())
    assert all(not s.get("limites", {}).get("modelo_pref") for s in plan["sub_tareas"])


def test_dificultad_desconocida_no_rompe_el_plan():
    raro = {"sub_tareas": [dict(PLAN_CON_DIFICULTAD["sub_tareas"][0], dificultad="imposible")]}
    rm = result_message(result=json.dumps(raro))
    planner = ClaudePlanner(
        query_fn=QueryFake([rm]), registro=RegistroEspia(), ruteo={"mecanica": "glm-4.7"},
    )
    plan = plan_de(planner, tarea())
    assert not plan["sub_tareas"][0].get("limites", {}).get("modelo_pref")


def test_prompt_del_sistema_pide_dificultad():
    for termino in ("dificultad", "mecanica", "estandar", "delicada", "por_que"):
        assert termino in PROMPT_SISTEMA
