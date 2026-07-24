#!/usr/bin/env python3
"""Frontera de ENVIO de salientes del depto adquisicion (EG.CRM Hito 6).

El gate `salientes_con_aprobacion` del Supervisor garantiza INTEGRIDAD (el
documento no cambio tras aprobarse — sha256 en aprobaciones/<ruta>.json del
worktree). Este host-job agrega la AUTENTICIDAD que el gate declara fuera de
su alcance: exige que la aprobacion exista TAMBIEN como fila de
`aprobaciones_salientes` en Supabase — fila que el motor del Ejecutor no puede
fabricar (no tiene credenciales; patron host-job, CLAUDE.md 2026-06-30).

Solo envia lo que pasa AMBAS verificaciones, y solo con ENVIAR_REAL=1 (el
default es dry-run: muestra el plan y no toca nada). Doble candado del
departamento: gates deterministas + gate humano en lo irreversible.

Uso (host con .env cargado: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY):
    python3 enviar-salientes.py --dir <worktree>            # dry-run (default)
    ENVIAR_REAL=1 SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... SMTP_PASS=... \
      SMTP_FROM=... python3 enviar-salientes.py --dir <worktree>

Reglas no negociables:
  - Sin Supabase configurado ABORTA (la autenticidad ES el punto; no hay
    modo degradado silencioso — todo fallo se IMPRIME, 2026-07-13).
  - Idempotente: una fila con enviado_at no se re-envia.
  - El destinatario sale de la FILA (fuente de verdad humana), no del worktree.
  - GATE PENDIENTE de la duena: este job existe para que lo pueda aprobar;
    activarlo en cron/produccion es decision suya, no del agente.
"""
from __future__ import annotations

import argparse
import email.utils
import hashlib
import json
import os
import smtplib
import sys
import urllib.parse
import urllib.request
from email.message import EmailMessage
from pathlib import Path

ROLES_APROBADORES = ("PM", "CEO", "CFO")  # matriz de equipo-y-slack.md
# Cloudflare 1010: urllib con su UA default es rechazado (aprendizaje 2026-07-02)
UA = "curl/8.0"


def log(msg: str) -> None:
    print(f"[enviar-salientes] {msg}")


def http(url: str, data: bytes | None = None, headers: dict | None = None,
         method: str | None = None) -> str:
    h = {"User-Agent": UA, **(headers or {})}
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode()


class Supabase:
    def __init__(self) -> None:
        url = os.environ.get("SUPABASE_URL", "").rstrip("/")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        if not (url and key):
            log("ABORTO: sin SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY no hay "
                "autenticidad que verificar (no existe modo degradado).")
            sys.exit(2)
        self.url = url
        self.headers = {"apikey": key, "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json"}

    def aprobacion(self, ruta: str, sha256: str) -> dict | None:
        q = urllib.parse.urlencode({"ruta": f"eq.{ruta}", "sha256": f"eq.{sha256}",
                                    "select": "*"})
        filas = json.loads(http(f"{self.url}/rest/v1/aprobaciones_salientes?{q}",
                                headers=self.headers))
        return filas[0] if filas else None

    def marcar_enviado(self, fila_id: str, mensaje_id: str) -> None:
        q = urllib.parse.urlencode({"id": f"eq.{fila_id}"})
        body = json.dumps({"enviado_at": "now()", "mensaje_id": mensaje_id}).encode()
        http(f"{self.url}/rest/v1/aprobaciones_salientes?{q}", data=body,
             headers={**self.headers, "Prefer": "return=minimal"}, method="PATCH")


def verificar_integridad(base: Path, saliente: Path) -> tuple[dict | None, str]:
    """Replica del gate del Supervisor: aprobaciones/<rel>.json con sha vigente."""
    rel = str(saliente.relative_to(base))
    apr_path = base / "aprobaciones" / f"{rel}.json"
    if not apr_path.is_file():
        return None, f"sin registro de aprobacion en worktree ({apr_path.name})"
    try:
        apr = json.loads(apr_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return None, f"aprobacion ilegible: {exc}"
    if apr.get("aprobado_por") not in ROLES_APROBADORES:
        return None, f"aprobado_por invalido: {apr.get('aprobado_por')!r}"
    if not str(apr.get("fecha", "")).strip():
        return None, "aprobacion sin fecha"
    sha = hashlib.sha256(saliente.read_bytes()).hexdigest()
    if apr.get("sha256") != sha:
        return None, "sha256 NO coincide (el documento cambio tras aprobarse)"
    apr["_sha256_actual"] = sha
    return apr, ""


def enviar_smtp(destinatario: str, asunto: str, cuerpo: str) -> str:
    host = os.environ["SMTP_HOST"]
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ["SMTP_USER"]
    remitente = os.environ.get("SMTP_FROM", user)
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = remitente, destinatario, asunto
    # Message-Id propio: smtplib no lo genera; sin esto mensaje_id seria ficcion.
    msg["Message-Id"] = email.utils.make_msgid()
    msg.set_content(cuerpo)
    with smtplib.SMTP(host, port, timeout=30) as s:
        s.starttls()
        s.login(user, os.environ["SMTP_PASS"])
        s.send_message(msg)
    return msg["Message-Id"]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--dir", required=True,
                    help="base con salientes/ y aprobaciones/ (worktree aprobado)")
    args = ap.parse_args()
    base = Path(args.dir).resolve()
    salientes = sorted((base / "salientes").rglob("*.md")) if (base / "salientes").is_dir() else []
    if not salientes:
        log(f"nada bajo {base}/salientes/ — no hay envios que considerar")
        return 0

    real = os.environ.get("ENVIAR_REAL") == "1"
    if real:
        faltan = [v for v in ("SMTP_HOST", "SMTP_USER", "SMTP_PASS") if not os.environ.get(v)]
        if faltan:
            log(f"ABORTO: ENVIAR_REAL=1 pero faltan {faltan} en el env")
            return 2
    else:
        log("modo DRY-RUN (sin ENVIAR_REAL=1 nada sale): mostrando el plan")

    sb = Supabase()
    enviados = saltados = 0
    for saliente in salientes:
        rel = str(saliente.relative_to(base))
        apr, err = verificar_integridad(base, saliente)
        if apr is None:
            log(f"SKIP {rel}: integridad fallida — {err}")
            saltados += 1
            continue
        fila = sb.aprobacion(rel, apr["_sha256_actual"])
        if fila is None:
            log(f"SKIP {rel}: SIN fila autentica en aprobaciones_salientes "
                "(el JSON del worktree no basta: la fila la crea un humano)")
            saltados += 1
            continue
        if fila.get("aprobado_por") != apr.get("aprobado_por"):
            log(f"SKIP {rel}: aprobador difiere (worktree {apr.get('aprobado_por')!r} "
                f"vs fila {fila.get('aprobado_por')!r})")
            saltados += 1
            continue
        if fila.get("enviado_at"):
            log(f"SKIP {rel}: ya enviado el {fila['enviado_at']} (idempotencia)")
            saltados += 1
            continue
        destinatario = fila["destinatario"]
        asunto = f"Propuesta — {fila.get('lead_id') or rel}"
        if not real:
            log(f"PLAN {rel} → {destinatario} (aprobado por {fila['aprobado_por']}, "
                f"sha ok, fila {fila['id']})")
            continue
        try:
            mensaje_id = enviar_smtp(destinatario, asunto,
                                     saliente.read_text(encoding="utf-8"))
        except Exception as exc:
            log(f"FALLO {rel} → {destinatario}: {type(exc).__name__}: {exc}")
            saltados += 1
            continue
        try:
            sb.marcar_enviado(fila["id"], mensaje_id)
        except Exception as exc:
            # El correo YA salio: si esto muriera sin marcar, la siguiente
            # corrida RE-ENVIARIA al cliente. Se ABORTA la corrida (no se
            # procesa nada mas) y se exige el marcado manual — jamas doble envio.
            log(f"CRITICO {rel}: enviado ({mensaje_id}) pero NO marcado en "
                f"aprobaciones_salientes (fila {fila['id']}): "
                f"{type(exc).__name__}: {exc}")
            log(f"CRITICO: marcar A MANO antes de re-correr: PATCH "
                f"aprobaciones_salientes id=eq.{fila['id']} "
                f"{{enviado_at: now(), mensaje_id: {mensaje_id!r}}}")
            return 1
        log(f"ENVIADO {rel} → {destinatario} ({mensaje_id})")
        enviados += 1

    log(f"fin: {enviados} enviado(s), {saltados} saltado(s), "
        f"{len(salientes)} considerado(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
