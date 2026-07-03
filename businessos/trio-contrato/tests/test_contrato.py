"""Tests del contrato del trio (Fase 1 del PRP-006): vocabulario e invariantes."""
import pytest

from contrato import (
    ContratoInvalido,
    ESTADOS,
    INTENTOS_MAX_DEFAULT,
    TRANSICIONES,
    transicion_valida,
    validar_resultado,
    validar_tarea,
    validar_veredicto,
)

TAREA_OK = {
    "task_id": "rec-2026-0042",
    "objetivo": "Auth email+password y Google OAuth, con profiles y RLS",
    "contexto": {"repo": "recetas", "business_logic": "app de recetas"},
    "criterios_aceptacion": ["build, typecheck y lint verdes", "login probado en browser"],
    "limites": {"intentos_max": 3, "modelo_pref": "sonnet"},
}

RESULTADO_OK = {
    "task_id": "rec-2026-0042",
    "worktree": "worktree/rec-2026-0042",
    "diff": "--- a/x\n+++ b/x\n",
    "archivos": ["app/auth/callback/route.ts"],
    "artefactos": {"build": "ok", "typecheck": "ok"},
    "notas": "OAuth Google; migracion profiles",
}

VEREDICTO_RECHAZO = {
    "task_id": "rec-2026-0042",
    "veredicto": "rechazado",
    "gates": [
        {"regla": "compila", "estado": "paso", "evidencia": "npm run build: exit 0"},
        {"regla": "tests_verdes", "estado": "fallo", "evidencia": "login-google.spec falla, callback 500"},
    ],
    "hallazgos": [
        {
            "regla": "tests_verdes",
            "evidencia": "playwright: login-google.spec falla, callback 500",
            "archivo": "app/auth/callback/route.ts",
        }
    ],
}


# --- ciclo de estados (SPEC §7.2, 1:1) ---

def test_ciclo_de_estados_completo():
    assert set(TRANSICIONES) == set(ESTADOS)
    # El camino feliz de la SPEC existe completo:
    camino = ["recibida", "en_ejecucion", "en_revision", "aprobada", "concretada"]
    for desde, hacia in zip(camino, camino[1:]):
        assert transicion_valida(desde, hacia), f"{desde}→{hacia}"
    # El lazo de reintento y el escalado tambien:
    assert transicion_valida("en_revision", "rechazada")
    assert transicion_valida("rechazada", "en_ejecucion")  # reintento
    assert transicion_valida("rechazada", "escalada")  # tope agotado
    assert transicion_valida("escalada", "en_ejecucion")  # humano: reintentar
    # Estados finales no salen a ningun lado:
    assert TRANSICIONES["concretada"] == frozenset()
    assert TRANSICIONES["cancelada"] == frozenset()


def test_no_hay_atajos_peligrosos():
    """Nada llega a `concretada` sin pasar por aprobacion; nadie se auto-aprueba."""
    assert not transicion_valida("recibida", "concretada")
    assert not transicion_valida("en_ejecucion", "aprobada")  # sin revision no hay aprobado
    assert not transicion_valida("en_ejecucion", "concretada")
    assert not transicion_valida("rechazada", "aprobada")  # rechazo no se vuelve aprobado solo


# --- tarea ---

def test_tarea_valida_y_normalizada():
    t = validar_tarea(TAREA_OK)
    assert t["departamento"] == "software"
    assert t["limites"]["intentos_max"] == 3
    assert t["observaciones"] == []


def test_tarea_intentos_max_default():
    t = validar_tarea({**TAREA_OK, "limites": {}})
    assert t["limites"]["intentos_max"] == INTENTOS_MAX_DEFAULT


@pytest.mark.parametrize(
    "mutacion,fragmento",
    [
        ({"task_id": "../evil"}, "task_id"),
        ({"task_id": ""}, "task_id"),
        ({"objetivo": "  "}, "objetivo"),
        ({"criterios_aceptacion": []}, "criterios"),
        ({"criterios_aceptacion": None}, "criterios"),
        ({"limites": {"intentos_max": 0}}, "intentos_max"),
        ({"limites": {"intentos_max": True}}, "intentos_max"),
        ({"departamento": "finanzas"}, "departamento"),
    ],
)
def test_tarea_invalida(mutacion, fragmento):
    with pytest.raises(ContratoInvalido) as exc:
        validar_tarea({**TAREA_OK, **mutacion})
    assert fragmento in str(exc.value)


# --- resultado ---

def test_resultado_valido():
    r = validar_resultado(RESULTADO_OK)
    assert r["worktree"] == "worktree/rec-2026-0042"


def test_resultado_worktree_sin_escapes():
    with pytest.raises(ContratoInvalido):
        validar_resultado({**RESULTADO_OK, "worktree": "../fuera-del-volumen"})


# --- veredicto (invariantes anti-sello-de-goma) ---

def test_veredicto_rechazo_valido():
    v = validar_veredicto(VEREDICTO_RECHAZO)
    assert v["veredicto"] == "rechazado"
    assert v["hallazgos"][0]["regla"] == "tests_verdes"


def test_rechazado_sin_hallazgos_es_invalido():
    with pytest.raises(ContratoInvalido, match="hallazgos"):
        validar_veredicto({**VEREDICTO_RECHAZO, "hallazgos": []})


def test_aprobado_con_gate_fallado_es_contradiccion():
    with pytest.raises(ContratoInvalido, match="anti-sello-de-goma"):
        validar_veredicto({**VEREDICTO_RECHAZO, "veredicto": "aprobado", "hallazgos": []})


def test_aprobado_con_gate_no_ejecutable_es_contradiccion():
    gates = [{"regla": "tests_verdes", "estado": "no_ejecutable", "evidencia": "worktree ausente"}]
    with pytest.raises(ContratoInvalido, match="anti-sello-de-goma"):
        validar_veredicto(
            {"task_id": "t1", "veredicto": "aprobado", "gates": gates, "hallazgos": []}
        )


def test_gate_sin_evidencia_es_invalido():
    gates = [{"regla": "compila", "estado": "paso", "evidencia": " "}]
    with pytest.raises(ContratoInvalido, match="evidencia"):
        validar_veredicto(
            {"task_id": "t1", "veredicto": "aprobado", "gates": gates, "hallazgos": []}
        )


def test_veredicto_sin_gates_es_invalido():
    with pytest.raises(ContratoInvalido, match="gates"):
        validar_veredicto({"task_id": "t1", "veredicto": "aprobado", "gates": [], "hallazgos": []})
