"""Tests de ingest-token-usage.py v3 (costeo por tarea): solo las funciones PURAS.

parsear_logs()/rest_*/pricing() hacen I/O real (docker + PostgREST + OpenRouter) y no
se prueban aqui; la logica que puede fallar en silencio es la REGLA del recalculo
(que fila se toca y cual jamas) y el armado del bloque por-tarea, y esa si queda
cubierta. Control aplicado: cada assert se puso rojo quitando la regla que fija.
"""
from conftest import load_script

mod = load_script("ingest-token-usage.py")

# Catalogo OpenRouter minimo: {id: ($/tok_in, $/tok_out, $/tok_cache_read)}
PRECIOS = {
    "z-ai/glm-5.2": (0.0000009, 0.0000029, 0.0),
    "anthropic/claude-opus-4.8": (0.000015, 0.000075, 0.0),
}


def test_mal_tarifado_glm_se_recalcula_aunque_traiga_costo():
    # Fila real del gotcha 2026-07-04: el CLI tarifo GLM a precio Anthropic (~12x).
    filas = [{"id": 1, "modelo": "glm-5.2", "tokens_in": 1_000_000, "tokens_out": 100_000,
              "costo_usd": 4.50}]
    cambios, sin_precio = mod.recalcular_ledger_tarea(filas, PRECIOS)
    assert sin_precio == 0
    assert cambios == [(1, round(1_000_000 * 0.0000009 + 100_000 * 0.0000029, 6))]


def test_modelo_bien_tarifado_con_costo_no_se_toca():
    # El CLI tarifa bien lo de Anthropic: un costo > 0 de opus es la verdad, no se pisa.
    filas = [{"id": 2, "modelo": "claude-opus-4-8[1m]", "tokens_in": 50_000,
              "tokens_out": 5_000, "costo_usd": 1.125}]
    cambios, sin_precio = mod.recalcular_ledger_tarea(filas, PRECIOS)
    assert cambios == [] and sin_precio == 0


def test_costo_cero_se_recalcula_si_hay_precio():
    # filas_parciales (corrida muerta a media faena) deja costo 0 con tokens reales.
    filas = [{"id": 3, "modelo": "claude-opus-4-8[1m]", "tokens_in": 10_000,
              "tokens_out": 1_000, "costo_usd": 0}]
    cambios, _ = mod.recalcular_ledger_tarea(filas, PRECIOS)
    assert cambios == [(3, round(10_000 * 0.000015 + 1_000 * 0.000075, 6))]


def test_costo_cero_sin_precio_se_declara_no_se_inventa():
    filas = [{"id": 4, "modelo": "modelo-desconocido", "tokens_in": 10, "tokens_out": 1,
              "costo_usd": 0}]
    cambios, sin_precio = mod.recalcular_ledger_tarea(filas, PRECIOS)
    assert cambios == [] and sin_precio == 1


def test_fila_sin_tokens_no_se_toca():
    filas = [{"id": 5, "modelo": "glm-5.2", "tokens_in": 0, "tokens_out": 0, "costo_usd": 0}]
    cambios, sin_precio = mod.recalcular_ledger_tarea(filas, PRECIOS)
    assert cambios == [] and sin_precio == 0


def test_recalculo_es_idempotente():
    filas = [{"id": 6, "modelo": "glm-5.2", "tokens_in": 1000, "tokens_out": 100,
              "costo_usd": 9.99}]
    cambios, _ = mod.recalcular_ledger_tarea(filas, PRECIOS)
    assert len(cambios) == 1
    filas[0]["costo_usd"] = cambios[0][1]  # lo que persistiria el PATCH
    assert mod.recalcular_ledger_tarea(filas, PRECIOS) == ([], 0)


def test_match_precio_normaliza_sufijos_y_guiones():
    assert mod.match_precio("glm-5.2", PRECIOS) == "z-ai/glm-5.2"
    assert mod.match_precio("glm-5.2:nitro", PRECIOS) == "z-ai/glm-5.2"
    # '[1m]' fuera y '-4-8' -> '-4.8' (el motor escribe pelado; OpenRouter usa puntos)
    assert mod.match_precio("claude-opus-4-8[1m]", PRECIOS) == "anthropic/claude-opus-4.8"
    assert mod.match_precio("modelo-inexistente", PRECIOS) is None
    assert mod.match_precio("", PRECIOS) is None


def test_resumen_por_tarea_agrupa_ordena_y_declara_huecos():
    filas = [
        {"task_id": "t-cara", "modelo": "glm-5.2", "tokens_in": 1, "tokens_out": 1, "costo_usd": 2.0},
        {"task_id": "t-cara", "modelo": "glm-5.2", "tokens_in": 1, "tokens_out": 1, "costo_usd": 1.0},
        {"task_id": "t-barata", "modelo": "glm-5.2", "tokens_in": 1, "tokens_out": 1, "costo_usd": 0.5},
        # hueco: tokens reales, costo 0 (sin precio) -> declarado, no inventado
        {"task_id": "t-hueco", "modelo": "raro", "tokens_in": 10, "tokens_out": 1, "costo_usd": 0},
    ]
    r = mod.resumen_por_tarea(filas)
    assert r["gasto_usd"] == 3.5
    assert r["tareas_con_gasto"] == 3
    assert r["filas_sin_costo"] == 1
    assert list(r["top"]) == ["t-cara", "t-barata", "t-hueco"]  # orden por costo desc


def test_resumen_por_tarea_respeta_el_top():
    filas = [{"task_id": f"t{i}", "modelo": "m", "tokens_in": 1, "tokens_out": 1,
              "costo_usd": float(i)} for i in range(1, 12)]
    r = mod.resumen_por_tarea(filas, top=3)
    assert list(r["top"]) == ["t11", "t10", "t9"]
    assert r["tareas_con_gasto"] == 11          # los totales cubren TODO, no solo el top
    assert r["gasto_usd"] == float(sum(range(1, 12)))


def test_mes_rango_evita_fechas_invalidas():
    # Bug latente de v2: 'lte.2026-02-31' revienta el parser de fechas de Postgres.
    assert mod.mes_rango("2026-02") == ("2026-02-01", "2026-03-01")
    assert mod.mes_rango("2026-12") == ("2026-12-01", "2027-01-01")
