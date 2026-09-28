"""Controles del gate que exige la firma del laboratorio al subir el pin (scripts/gate-pin-grafo.sh).

Corre dentro del job obligatorio `grafo-congelado`. Aqui se mide que dice que no cuando debe:
sin entrada, con la entrada "_pendiente de firma_" (la bitacora la acepta; el pin no), con una
firma que no nombra el pin, o con un marcador en vez de firma.
"""
import json
import os
import subprocess
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]
GATE = RAIZ / "scripts" / "gate-pin-grafo.sh"
CAMBIA_PIN = "businessos/grafo/seed/paquete/PIN.json\nbusinessos/grafo/seed/reglas.json"


def _corre(tmp_path, cambios, diff):
    pin = tmp_path / "PIN.json"
    pin.write_text(json.dumps({"nombre": "@tu-scope/conocimiento", "version": "0.3.0"}), encoding="utf-8")
    env = {**os.environ, "CHANGED_FILES": cambios, "BITACORA_DIFF": diff, "PIN": str(pin)}
    return subprocess.run(["bash", str(GATE)], env=env, capture_output=True, text=True, cwd=RAIZ)


def _entrada(firma, pin="@tu-scope/conocimiento@0.3.0"):
    return "\n".join([
        "+++ b/.claude/gobernanza/BITACORA-CDC.md",
        f"+### 2026-10-01 — sube el pin del grafo a {pin} — radio: conocimiento",
        "+- **Cambio**: pin nuevo",
        f"+- **Aprobado por**: {firma}",
    ])


def test_sin_cambio_de_pin_no_pide_nada(tmp_path):
    assert _corre(tmp_path, "businessos/grafo/app.py", "").returncode == 0


def test_pin_sin_entrada_en_la_bitacora_es_rojo(tmp_path):
    r = _corre(tmp_path, CAMBIA_PIN, "")
    assert r.returncode == 1 and "no añade ninguna entrada" in r.stdout


def test_pin_con_entrada_pendiente_de_firma_es_rojo(tmp_path):
    r = _corre(tmp_path, CAMBIA_PIN, _entrada("_pendiente de firma_"))
    assert r.returncode == 1 and "pendiente de firma" in r.stdout


def test_pin_con_marcador_en_vez_de_firma_es_rojo(tmp_path):
    assert _corre(tmp_path, CAMBIA_PIN, _entrada("☐")).returncode == 1


def test_firma_que_no_nombra_el_pin_es_roja(tmp_path):
    r = _corre(tmp_path, CAMBIA_PIN, _entrada("Laboratorio, 2026-10-01", pin="@tu-scope/conocimiento@0.2.0"))
    assert r.returncode == 1 and "nombra el pin nuevo" in r.stdout


def test_pin_con_entrada_firmada_pasa(tmp_path):
    r = _corre(tmp_path, CAMBIA_PIN, _entrada("Laboratorio, 2026-10-01"))
    assert r.returncode == 0, r.stdout
