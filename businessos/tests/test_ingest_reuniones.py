"""Tests de ingest-reuniones.py (Fase 10): parseo/validacion del bloque TAREAS_JSON.

Solo prueba las funciones PURAS (extract_json, normalize_fecha, valid_tarea, build_rows).
upsert()/main() hacen I/O real (PostgREST) y no se prueban aqui sin credenciales; la
lectura del envelope y las reglas de validacion (que es lo que puede corromper datos si
falla) si quedan cubiertas.
"""
import pytest

from conftest import load_script

mod = load_script("ingest-reuniones.py")

ENVUELTO = """
REUNION: Kickoff | FECHA: 2026-07-15 | ID: a2a-reunion-2026-07-15

algo de texto humano aqui, no deberia importar.

<<<TAREAS_JSON
{"negocio":"a2a","reunion_id":"a2a-reunion-2026-07-15","generado":"2026-07-16",
 "tareas":[
   {"id":"T1","tarea":"Cerrar contrato con proveedor X","responsable":"Luis",
    "fecha_limite":"2026-07-24 (dicho: 'el viernes')","canal":"#alertas","fuente":"Johann [12:03]"},
   {"id":"T2","tarea":"Revisar propuesta legal","responsable":"sin dueno asignado",
    "fecha_limite":"sin fecha","canal":"#reuniones","fuente":"Elisa [20:11]"}
 ]}
TAREAS_JSON>>>
""".strip()


def test_extract_json_de_acta_envuelta():
    block = mod.extract_json(ENVUELTO)
    assert block.strip().startswith("{")
    assert '"reunion_id"' in block


def test_extract_json_crudo_sin_marcadores():
    crudo = '{"reunion_id": "x", "generado": "2026-07-16", "tareas": []}'
    assert mod.extract_json(crudo) == crudo


def test_extract_json_sin_bloque_ni_json_lanza():
    with pytest.raises(ValueError):
        mod.extract_json("solo texto humano, sin bloque ni json")


@pytest.mark.parametrize("raw,esperado", [
    (None, None),
    ("", None),
    ("sin fecha", None),
    ("Sin Fecha", None),
    ("2026-07-24", "2026-07-24"),
    ("2026-07-24 (dicho: 'el viernes')", "2026-07-24"),
])
def test_normalize_fecha_casos_validos(raw, esperado):
    fecha, err = mod.normalize_fecha(raw)
    assert fecha == esperado
    assert err is None


def test_normalize_fecha_no_parseable_da_error_no_adivina():
    fecha, err = mod.normalize_fecha("el viernes que viene")
    assert fecha is None
    assert err is not None


def test_valid_tarea_ok():
    t = {"id": "T1", "tarea": "Hacer X", "responsable": "Luis",
         "fecha_limite": "2026-07-24", "canal": "#alertas", "fuente": "Johann [01:00]"}
    fila, err = mod.valid_tarea(t, "a2a", "a2a-reunion-2026-07-15")
    assert err is None
    assert fila == {
        "id": "T1", "negocio": "a2a", "reunion_id": "a2a-reunion-2026-07-15",
        "tarea": "Hacer X", "responsable": "Luis", "fecha_limite": "2026-07-24",
        "canal": "#alertas", "fuente": "Johann [01:00]",
    }


def test_valid_tarea_sin_fecha_da_null_no_rechazo():
    t = {"id": "T2", "tarea": "Revisar", "fecha_limite": "sin fecha"}
    fila, err = mod.valid_tarea(t, "a2a", "r1")
    assert err is None
    assert fila["fecha_limite"] is None
    assert fila["responsable"] is None  # nunca adivina un dueno


def test_valid_tarea_rechaza_si_falta_id_o_tarea():
    fila, err = mod.valid_tarea({"tarea": "Hacer X"}, "a2a", "r1")
    assert fila is None and "id" in err

    fila, err = mod.valid_tarea({"id": "T1"}, "a2a", "r1")
    assert fila is None and "tarea" in err


def test_valid_tarea_rechaza_fecha_no_parseable_sin_tumbar_la_reunion():
    fila, err = mod.valid_tarea({"id": "T1", "tarea": "X", "fecha_limite": "proximamente"},
                                 "a2a", "r1")
    assert fila is None
    assert "fecha_limite" in err


def test_build_rows_completo_dos_tareas_validas():
    envelope = {"negocio": "a2a", "reunion_id": "a2a-reunion-2026-07-15",
                "generado": "2026-07-16",
                "tareas": [
                    {"id": "T1", "tarea": "Hacer X", "fecha_limite": "2026-07-24"},
                    {"id": "T2", "tarea": "Hacer Y", "fecha_limite": "sin fecha"},
                ]}
    rows, errores = mod.build_rows(envelope)
    assert len(rows) == 2
    assert errores == []
    assert {r["id"] for r in rows} == {"T1", "T2"}


def test_build_rows_negocio_default_a2a_si_falta():
    envelope = {"reunion_id": "r1", "generado": "2026-07-16", "tareas": []}
    rows, errores = mod.build_rows(envelope)
    assert rows == [] and errores == []


def test_build_rows_falta_reunion_id_lanza():
    with pytest.raises(ValueError):
        mod.build_rows({"generado": "2026-07-16", "tareas": []})


def test_build_rows_falta_generado_lanza():
    with pytest.raises(ValueError):
        mod.build_rows({"reunion_id": "r1", "tareas": []})


def test_build_rows_aisla_tarea_invalida_sin_tumbar_las_demas():
    envelope = {"reunion_id": "r1", "generado": "2026-07-16",
                "tareas": [
                    {"id": "T1", "tarea": "valida", "fecha_limite": "2026-07-24"},
                    {"id": "T2"},  # falta 'tarea' -> se rechaza sola, no tumba T1
                ]}
    rows, errores = mod.build_rows(envelope)
    assert len(rows) == 1 and rows[0]["id"] == "T1"
    assert len(errores) == 1 and "T2" in errores[0]


def test_extraccion_de_json_real_de_la_acta_produce_dos_filas():
    envelope = __import__("json").loads(mod.extract_json(ENVUELTO))
    rows, errores = mod.build_rows(envelope)
    assert errores == []
    assert len(rows) == 2
    t1 = next(r for r in rows if r["id"] == "T1")
    assert t1["fecha_limite"] == "2026-07-24"  # la anotacion "(dicho: ...)" se descarta
    t2 = next(r for r in rows if r["id"] == "T2")
    assert t2["fecha_limite"] is None
