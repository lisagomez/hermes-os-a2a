"""Tests de la frontera de envio (enviar-salientes.py) — sin red ni SMTP.

Cubren la replica de integridad del gate del Supervisor (la parte de
seguridad que antes solo se habia verificado por lectura) y la generacion
de Message-Id. La autenticidad contra Supabase y el envio real quedan
detras del gate humano; sus caminos offline (aborto sin env, dry-run) se
ejercitan como subproceso.

Correr: cd businessos && .venv/bin/python -m pytest tests/ -q
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import subprocess
import sys
from pathlib import Path

BUSINESSOS = Path(__file__).resolve().parent.parent
SCRIPT = BUSINESSOS / "enviar-salientes.py"

spec = importlib.util.spec_from_file_location("enviar_salientes", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def worktree_con_saliente(tmp_path: Path, contenido: bytes = b"CLAIM: x\nhola\n",
                          aprobacion: dict | None = None) -> tuple[Path, Path]:
    base = tmp_path / "wt"
    (base / "salientes").mkdir(parents=True)
    saliente = base / "salientes" / "lead-1-propuesta.md"
    saliente.write_bytes(contenido)
    if aprobacion is not None:
        apr_dir = base / "aprobaciones" / "salientes"
        apr_dir.mkdir(parents=True)
        (apr_dir / "lead-1-propuesta.md.json").write_text(json.dumps(aprobacion))
    return base, saliente


def aprobacion_valida(saliente: Path) -> dict:
    return {
        "aprobado_por": "PM",
        "fecha": "2026-07-24",
        "sha256": hashlib.sha256(saliente.read_bytes()).hexdigest(),
    }


# ---------- replica de integridad (fiel al gate del Supervisor) ----------

def test_integridad_ok(tmp_path):
    base, saliente = worktree_con_saliente(tmp_path)
    apr = aprobacion_valida(saliente)
    (base / "aprobaciones" / "salientes").mkdir(parents=True)
    (base / "aprobaciones" / "salientes" / "lead-1-propuesta.md.json").write_text(json.dumps(apr))
    resultado, err = mod.verificar_integridad(base, saliente)
    assert err == "" and resultado is not None
    assert resultado["_sha256_actual"] == apr["sha256"]


def test_sin_aprobacion_falla(tmp_path):
    base, saliente = worktree_con_saliente(tmp_path)
    resultado, err = mod.verificar_integridad(base, saliente)
    assert resultado is None and "sin registro" in err


def test_rol_invalido_falla(tmp_path):
    base, saliente = worktree_con_saliente(tmp_path)
    apr = aprobacion_valida(saliente)
    apr["aprobado_por"] = "becario"  # no esta en la matriz PM/CEO/CFO
    (base / "aprobaciones" / "salientes").mkdir(parents=True)
    (base / "aprobaciones" / "salientes" / "lead-1-propuesta.md.json").write_text(json.dumps(apr))
    resultado, err = mod.verificar_integridad(base, saliente)
    assert resultado is None and "aprobado_por invalido" in err


def test_documento_cambiado_tras_aprobar_falla(tmp_path):
    """El corazon del gate: sha vigente o no hay envio."""
    base, saliente = worktree_con_saliente(tmp_path)
    apr = aprobacion_valida(saliente)
    (base / "aprobaciones" / "salientes").mkdir(parents=True)
    (base / "aprobaciones" / "salientes" / "lead-1-propuesta.md.json").write_text(json.dumps(apr))
    saliente.write_bytes(b"contenido alterado DESPUES de aprobarse")
    resultado, err = mod.verificar_integridad(base, saliente)
    assert resultado is None and "sha256 NO coincide" in err


def test_sin_fecha_falla(tmp_path):
    base, saliente = worktree_con_saliente(tmp_path)
    apr = aprobacion_valida(saliente)
    apr["fecha"] = "  "
    (base / "aprobaciones" / "salientes").mkdir(parents=True)
    (base / "aprobaciones" / "salientes" / "lead-1-propuesta.md.json").write_text(json.dumps(apr))
    resultado, err = mod.verificar_integridad(base, saliente)
    assert resultado is None and "sin fecha" in err


# ---------- Message-Id real, no ficcion ----------

def test_enviar_smtp_pone_message_id(monkeypatch):
    enviados = {}

    class SMTPFake:
        def __init__(self, *a, **k): ...
        def __enter__(self): return self
        def __exit__(self, *a): return False
        def starttls(self): ...
        def login(self, *a): ...
        def send_message(self, msg): enviados["msg"] = msg

    monkeypatch.setattr(mod.smtplib, "SMTP", SMTPFake)
    monkeypatch.setenv("SMTP_HOST", "smtp.fake")
    monkeypatch.setenv("SMTP_USER", "u@fake")
    monkeypatch.setenv("SMTP_PASS", "p")
    mid = mod.enviar_smtp("cliente@acme.mx", "Propuesta", "hola")
    assert mid and mid.startswith("<") and mid.endswith(">")
    assert enviados["msg"]["Message-Id"] == mid


# ---------- caminos offline del script completo (subproceso) ----------

def test_sin_supabase_aborta_con_rc2(tmp_path):
    base, _ = worktree_con_saliente(tmp_path)
    env = {k: v for k, v in os.environ.items()
           if k not in ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")}
    r = subprocess.run([sys.executable, str(SCRIPT), "--dir", str(base)],
                       capture_output=True, text=True, env=env)
    assert r.returncode == 2
    assert "ABORTO" in r.stdout


def test_integridad_fallida_no_toca_red(tmp_path):
    """Sin aprobacion en worktree se SKIPea ANTES de consultar Supabase
    (URL dummy inalcanzable: si tocara red, el test fallaria por excepcion)."""
    base, _ = worktree_con_saliente(tmp_path)
    env = {**os.environ, "SUPABASE_URL": "https://dummy.invalid",
           "SUPABASE_SERVICE_ROLE_KEY": "k"}
    r = subprocess.run([sys.executable, str(SCRIPT), "--dir", str(base)],
                       capture_output=True, text=True, env=env)
    assert r.returncode == 0
    assert "integridad fallida" in r.stdout
    assert "0 enviado(s), 1 saltado(s)" in r.stdout
