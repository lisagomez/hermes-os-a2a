"""Tests de snapshot-tareas-reunion.py (Fase 10): ventana de deteccion (hoy/manana/vencida).

Solo prueba build_snapshot() (pura). fetch_due()/write_snapshot() hacen I/O real
(PostgREST + docker exec) y no se prueban aqui sin un contenedor/credenciales reales;
la logica de que se considera "vencida" es la que puede fallar en silencio, y esa si
queda cubierta.
"""
from conftest import load_script

mod = load_script("snapshot-tareas-reunion.py")


def test_build_snapshot_marca_vencida_correctamente():
    hoy = "2026-07-16"
    rows = [
        {"id": "T1", "reunion_id": "r1", "fecha_limite": "2026-07-10", "tarea": "vieja"},   # vencida
        {"id": "T2", "reunion_id": "r1", "fecha_limite": "2026-07-16", "tarea": "hoy"},      # hoy, no vencida
        {"id": "T3", "reunion_id": "r1", "fecha_limite": "2026-07-17", "tarea": "manana"},   # manana, no vencida
    ]
    snap = mod.build_snapshot(rows, hoy)
    por_id = {r["id"]: r["vencida"] for r in snap["tareas"]}
    assert por_id == {"T1": True, "T2": False, "T3": False}
    assert snap["total"] == 3
    assert snap["vencidas"] == 1
    assert snap["hoy"] == hoy


def test_build_snapshot_vacio():
    snap = mod.build_snapshot([], "2026-07-16")
    assert snap["total"] == 0 and snap["vencidas"] == 0 and snap["tareas"] == []


def test_build_snapshot_no_falla_con_fecha_limite_ausente():
    # fetch_due() nunca deberia traer filas con fecha_limite NULL (el filtro lte las
    # excluye), pero build_snapshot no debe reventar si alguna llegara sin ese campo.
    rows = [{"id": "T1", "reunion_id": "r1", "tarea": "x"}]
    snap = mod.build_snapshot(rows, "2026-07-16")
    assert snap["tareas"][0]["vencida"] is False
