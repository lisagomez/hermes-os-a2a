"""Tests de cosechar-prediscovery.py: validación del contrato de export y SQL generado.

Solo funciones PURAS (validar_export, generar_sql, traza_de); la ejecución psql real
requiere credenciales cli_fin y se hace a mano con --dry-run/--confirmar.
"""
import json

import pytest

from conftest import load_script

mod = load_script("cosechar-prediscovery.py")

EXPORT_OK = {
    "esquema": "meeting-copilot/activo-export@1",
    "exportadoAt": "2026-07-26T12:00:00.000Z",
    "activo": {
        "id": "act-1",
        "folio": "ACT-LOC-0001",
        "clase": "pre_discovery",
        "tipo": "datos",
        "nombre": "Pre-Discovery — Agencia de carga",
        "ubicacion": "meeting-copilot://caso/caso-gal",
        "ejeDei": "desarrollo",
        "defensibilidad": "reemplazable",
        "estadoDefensibilidad": "propuesta",
        "estatus": "propuesto",
        "versiones": [{"version": "v1", "hash": "abc123", "origen": "caso:caso-gal bloque:brief", "at": "2026-07-26"}],
        "refs": {"leadId": "lead-gal", "casoId": "caso-gal", "reunionId": None},
        "creadoAt": "2026-07-26",
    },
    "costoAcumuladoUsd": 0.0123,
    "ledger": [
        {"id": "c1", "activoId": "act-1", "componente": "tokens", "tokensIn": 1000, "tokensOut": 500,
         "modelo": "google/gemini-2.5-flash-lite", "montoUsd": 0.0123,
         "fuente": "openrouter_usage·tarifa google/gemini-2.5-flash-lite", "at": "2026-07-26"},
    ],
    "contenido": {"bloques": "…"},
}


def test_export_valido_pasa():
    assert mod.validar_export(EXPORT_OK) == []


def test_esquema_desconocido_rechazado():
    errores = mod.validar_export({**EXPORT_OK, "esquema": "otro@9"})
    assert any("esquema" in e for e in errores)


def test_fuente_obligatoria_en_ledger():
    roto = json.loads(json.dumps(EXPORT_OK))
    roto["ledger"][0]["fuente"] = ""
    assert any("fuente" in e for e in mod.validar_export(roto))


def test_costo_declarado_debe_ser_suma_del_ledger():
    roto = json.loads(json.dumps(EXPORT_OK))
    roto["costoAcumuladoUsd"] = 99.0
    assert any("SUMA del ledger" in e for e in mod.validar_export(roto))


def test_clasificacion_en_origen_obligatoria():
    roto = json.loads(json.dumps(EXPORT_OK))
    roto["activo"]["ejeDei"] = "operacion"
    assert any("ejeDei" in e for e in mod.validar_export(roto))


def test_sql_generado_respeta_invariantes_act():
    sql = mod.generar_sql(EXPORT_OK, "2de8835a-0000-0000-0000-000000000000", "prediscovery-t1")
    # Idempotencia por traza (el bloque entero se salta si ya se cosechó):
    assert "sis_bitacora where traza_id = 'prediscovery-t1'" in sql
    # Folio ERP asignado por la BD; el local queda como ref_catalogo:
    assert "on conflict (cliente_id, ref_catalogo) do nothing" in sql
    assert "'ACT-LOC-0001'" in sql
    # Clasificación EN ORIGEN, estatus contable pendiente, defensibilidad propuesta:
    assert "'desarrollo'" in sql and "'pendiente'" in sql and "'propuesta'" in sql
    # Costos con fuente declarada y tokens autoritativos:
    assert "meeting-copilot: openrouter_usage" in sql
    # Sin DELETE ni UPDATE de ledger (append-only):
    assert "delete" not in sql.lower()
    assert "update erp.act_costo" not in sql.lower()
    assert "update erp.act_version" not in sql.lower()


def test_componente_fetch_se_mapea_a_infraestructura():
    con_fetch = json.loads(json.dumps(EXPORT_OK))
    con_fetch["ledger"].append({"id": "c2", "activoId": "act-1", "componente": "fetch", "tokensIn": None,
                                "tokensOut": None, "modelo": None, "montoUsd": 0.0, "fuente": "fetch del sitio", "at": "x"})
    con_fetch["costoAcumuladoUsd"] = 0.0123
    sql = mod.generar_sql(con_fetch, "casa", "t2")
    assert "'infraestructura'" in sql


def test_sql_escapa_comillas():
    raro = json.loads(json.dumps(EXPORT_OK))
    raro["activo"]["nombre"] = "Pre-Discovery — L'Aduana"
    sql = mod.generar_sql(raro, "casa", "t3")
    assert "L''Aduana" in sql


def test_traza_estable_por_archivo():
    crudo = json.dumps(EXPORT_OK).encode()
    assert mod.traza_de(EXPORT_OK, crudo) == mod.traza_de(EXPORT_OK, crudo)
    assert mod.traza_de(EXPORT_OK, crudo) != mod.traza_de(EXPORT_OK, crudo + b" ")


def test_main_rechaza_export_invalido(tmp_path, monkeypatch, capsys):
    archivo = tmp_path / "roto.json"
    archivo.write_text(json.dumps({"esquema": "otro"}), encoding="utf-8")
    monkeypatch.setattr("sys.argv", ["cosechar-prediscovery.py", str(archivo), "--dry-run"])
    assert mod.main() == 1
    assert "NO cumple el contrato" in capsys.readouterr().out


def test_main_dry_run_imprime_sql(tmp_path, monkeypatch, capsys):
    archivo = tmp_path / "ok.json"
    archivo.write_text(json.dumps(EXPORT_OK), encoding="utf-8")
    monkeypatch.setattr("sys.argv", ["cosechar-prediscovery.py", str(archivo), "--dry-run"])
    assert mod.main() == 0
    salida = capsys.readouterr().out
    assert "set local role rol_exe_fin" in salida
    assert "insert into erp.act_activo" in salida
