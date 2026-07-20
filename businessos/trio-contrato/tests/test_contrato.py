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


# --- la cola (PRP-010): tres vueltas a `recibida` ---

def test_vuelve_a_la_cola_en_los_tres_casos():
    """Las tres son 'vuelve a la FILA', nunca un atajo para saltarsela."""
    # Recuperacion de reinicio: la huerfana que nadie corre vuelve a la cola.
    assert transicion_valida("en_ejecucion", "recibida")
    # Reintento re-encolado: entra por la cola, al final (FIFO justo).
    assert transicion_valida("rechazada", "recibida")
    # Relanzar tras escalada (analoga a la ya existente escalada → en_ejecucion).
    assert transicion_valida("escalada", "recibida")


def test_la_cola_no_abre_atajos_nuevos():
    """Volver a `recibida` NO convierte a la cola en una puerta trasera."""
    # Lo terminal sigue siendo terminal: nada resucita.
    assert not transicion_valida("concretada", "recibida")
    assert not transicion_valida("cancelada", "recibida")
    # `recibida → en_ejecucion` sigue siendo la UNICA puerta a la ejecucion:
    # nada salta de la cola directo a revision o aprobacion.
    assert not transicion_valida("recibida", "en_revision")
    assert not transicion_valida("recibida", "aprobada")
    # Y una tarea aprobada no vuelve a la cola por la puerta de atras.
    assert not transicion_valida("aprobada", "recibida")


# --- tarea ---

def test_tarea_valida_y_normalizada():
    t = validar_tarea(TAREA_OK)
    assert t["departamento"] == "software"
    assert t["limites"]["intentos_max"] == 3
    assert t["observaciones"] == []


def test_tarea_intentos_max_default():
    t = validar_tarea({**TAREA_OK, "limites": {}})
    assert t["limites"]["intentos_max"] == INTENTOS_MAX_DEFAULT


def test_tarea_intentos_max_float_integral_se_normaliza():
    """Gotcha A2A: protobuf Struct entrega TODO numero JSON como float (3 → 3.0)."""
    t = validar_tarea({**TAREA_OK, "limites": {"intentos_max": 3.0}})
    assert t["limites"]["intentos_max"] == 3
    with pytest.raises(ContratoInvalido):
        validar_tarea({**TAREA_OK, "limites": {"intentos_max": 2.5}})


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
    assert r["departamento"] == "software"  # default retrocompatible (Fase 6/7)


def test_resultado_worktree_sin_escapes():
    with pytest.raises(ContratoInvalido):
        validar_resultado({**RESULTADO_OK, "worktree": "../fuera-del-volumen"})


# --- departamento adquisicion (Fase 9) ---

def test_tarea_adquisicion_valida():
    t = validar_tarea({**TAREA_OK, "departamento": "adquisicion"})
    assert t["departamento"] == "adquisicion"


def test_resultado_adquisicion_valido():
    r = validar_resultado({**RESULTADO_OK, "departamento": "adquisicion"})
    assert r["departamento"] == "adquisicion"


def test_resultado_departamento_desconocido_es_invalido():
    with pytest.raises(ContratoInvalido, match="departamento"):
        validar_resultado({**RESULTADO_OK, "departamento": "finanzas"})


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


# --- departamento contratos_inteligentes (Fase 12, PRP-013) ---

def test_tarea_contratos_inteligentes_valida():
    t = validar_tarea({**TAREA_OK, "departamento": "contratos_inteligentes"})
    assert t["departamento"] == "contratos_inteligentes"


def test_resultado_contratos_inteligentes_valido():
    r = validar_resultado({**RESULTADO_OK, "departamento": "contratos_inteligentes"})
    assert r["departamento"] == "contratos_inteligentes"
