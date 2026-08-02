"""El adaptador de los gates del buzon: traduce politicas.py al motor de gates.

Lo que se prueba aqui NO son los 11 gates (eso vive en buzon-a2a/tests/
test_politicas.py, contra la MISMA implementacion): es el adaptador — que
registre los chequeos, que enrute borradores del worktree, y que lo no juzgable
salga `no_ejecutable` (fail-safe) en vez de `paso`.
"""
from __future__ import annotations

import json
from pathlib import Path

import gates
import politicas
from gates import Gate

import chequeos_buzon  # noqa: F401 — registra en gates.CHEQUEOS al importarse

BORRADOR_OK = {
    "hilo_id": "h1",
    "destinatarios": {"to": ["cliente@externo.com"], "cc": [], "bcc": []},
    "asunto": "Re: consulta",
    "cuerpo": "Hola.\n\nDetalles: https://miempresa.com/faq\n\n--\nLEYENDA",
    "cabeceras": {"Auto-Submitted": "auto-replied"},
    "adjuntos": [],
    "automatico": True,
    "derivado_de_hilos": ["h1"],
}

CONTEXTO_OK = {
    "hilo_id": "h1",
    "participantes_hilo": ["cliente@externo.com", "ventas@miempresa.com"],
    "dominios_institucionales": ["miempresa.com"],
    "catalogo_adjuntos": [],
    "pii_otros_hilos": [],
    "leyenda_divulgacion": "LEYENDA",
    "canario": "CANARIO-1",
    "enviados_ultima_hora": 0,
    "enviados_en_hilo": 0,
    "cuota_hora": 10,
    "cuota_hilo": 5,
    "pausa_global": False,
}


def gate(regla: str) -> Gate:
    return Gate(regla=regla, runner="estatico", chequeo=regla)


def escribir(worktree: Path, nombre: str, payload: dict) -> Path:
    destino = worktree / "buzon" / "borradores" / nombre
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps(payload), encoding="utf-8")
    return destino


def test_los_11_gates_quedan_registrados_con_prefijo():
    esperados = {f"buzon_{n}" for n in politicas.GATES}
    assert esperados <= set(gates.CHEQUEOS)
    assert len(esperados) == 11
    # el sin_secretos base del supervisor NO fue pisado por el del buzon
    assert gates.CHEQUEOS["sin_secretos"] is not gates.CHEQUEOS["buzon_sin_secretos"]


def test_borrador_sano_pasa(tmp_path):
    archivo = escribir(tmp_path, "b1.json", {"borrador": BORRADOR_OK, "contexto": CONTEXTO_OK})
    for regla in (f"buzon_{n}" for n in politicas.GATES):
        r = gates.CHEQUEOS[regla](gate(regla), tmp_path, [archivo])
        assert r.estado == "paso", f"{regla}: {r.evidencia}"


def test_borrador_con_bcc_falla_y_cita_archivo_y_severidad(tmp_path):
    malo = {**BORRADOR_OK, "destinatarios": {**BORRADOR_OK["destinatarios"],
                                             "bcc": ["espia@fuera.com"]}}
    archivo = escribir(tmp_path, "b2.json", {"borrador": malo, "contexto": CONTEXTO_OK})
    r = gates.CHEQUEOS["buzon_sin_bcc"](gate("buzon_sin_bcc"), tmp_path, [archivo])
    assert r.estado == "fallo"
    assert r.hallazgos[0]["archivo"] == "buzon/borradores/b2.json"
    assert "CRITICA" in r.hallazgos[0]["evidencia"]


def test_sin_borradores_en_el_cambio_pasa(tmp_path):
    otro = tmp_path / "src" / "algo.ts"
    otro.parent.mkdir(parents=True, exist_ok=True)
    otro.write_text("export const x = 1", encoding="utf-8")
    r = gates.CHEQUEOS["buzon_sin_bcc"](gate("buzon_sin_bcc"), tmp_path, [otro])
    assert r.estado == "paso" and "ningun borrador" in r.evidencia


def test_sin_git_es_no_ejecutable(tmp_path):
    r = gates.CHEQUEOS["buzon_sin_bcc"](gate("buzon_sin_bcc"), tmp_path, None)
    assert r.estado == "no_ejecutable"


def test_payload_sin_contexto_es_no_ejecutable_no_paso(tmp_path):
    """Fail-safe: sin contexto NO se puede juzgar → no_ejecutable (= rechazo)."""
    archivo = escribir(tmp_path, "b3.json", {"borrador": BORRADOR_OK})
    r = gates.CHEQUEOS["buzon_sin_bcc"](gate("buzon_sin_bcc"), tmp_path, [archivo])
    assert r.estado == "no_ejecutable" and "contexto" in r.evidencia


def test_json_ilegible_es_no_ejecutable(tmp_path):
    destino = tmp_path / "buzon" / "borradores" / "roto.json"
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text("{no es json", encoding="utf-8")
    r = gates.CHEQUEOS["buzon_sin_bcc"](gate("buzon_sin_bcc"), tmp_path, [destino])
    assert r.estado == "no_ejecutable"


def test_config_buzon_carga_y_sus_chequeos_existen():
    """Un gate activo con chequeo inexistente = ConfigInvalida = no arranca."""
    reglas = Path(__file__).resolve().parent.parent / "reglas"
    por_dep = gates.cargar_configs(reglas)
    assert "buzon" in por_dep
    activos = [g for g in por_dep["buzon"] if g.activo]
    assert len(activos) == 12  # 11 del buzon + sin_secretos base
    for g in activos:
        assert g.chequeo in gates.CHEQUEOS, g.regla
