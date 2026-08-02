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

Gates 3 y 4 (SPEC-buzon-a2a §2.2), SOLO para salientes del buzon (ruta
'buzon/<correos_salientes.id>'): destinatarios ⊆ participantes del hilo (+ sin
Bcc) y cuota por buzon/hora y por hilo + interruptor del Guardian. Los
salientes de EG.CRM no cambian de comportamiento: no llevan ese prefijo.

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

# Salientes del buzon (SPEC-buzon-a2a §2.2): la firma de A5 entra en
# aprobaciones_salientes con ruta 'buzon/<correos_salientes.id>'. Ese prefijo es
# lo que activa los gates 3 y 4; el resto de rutas (EG.CRM) no los ve.
PREFIJO_BUZON = "buzon/"
CUOTA_HORA_DEFAULT = 10
CUOTA_HILO_DEFAULT = 5


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

    # --- soporte de los gates 3 y 4 del buzon (SPEC-buzon-a2a §2.2) ---

    def saliente_buzon(self, saliente_id: str) -> dict | None:
        """Fila de correos_salientes para una ruta 'buzon/<uuid>'."""
        q = urllib.parse.urlencode({"id": f"eq.{saliente_id}", "select": "*"})
        filas = json.loads(http(f"{self.url}/rest/v1/correos_salientes?{q}",
                                headers=self.headers))
        return filas[0] if filas else None

    def participantes_hilo(self, hilo_id: str) -> set[str]:
        """Direcciones vistas en el hilo (remitentes + to/cc de los entrantes)."""
        q = urllib.parse.urlencode({"hilo_id": f"eq.{hilo_id}",
                                    "select": "remitente,destinatarios"})
        filas = json.loads(http(f"{self.url}/rest/v1/correos_entrantes?{q}",
                                headers=self.headers))
        vistos: set[str] = set()
        for f in filas:
            if f.get("remitente"):
                vistos.add(f["remitente"].strip().lower())
            dest = f.get("destinatarios") or {}
            for lista in ("to", "cc"):
                vistos.update(d.strip().lower() for d in (dest.get(lista) or []))
        return vistos

    def pausa_global(self) -> bool:
        filas = json.loads(http(
            f"{self.url}/rest/v1/buzon_control?id=eq.1&select=pausa_global",
            headers=self.headers))
        return bool(filas and filas[0].get("pausa_global"))

    def cuotas_buzon(self, buzon_id: str) -> tuple[int, int]:
        q = urllib.parse.urlencode({"id": f"eq.{buzon_id}",
                                    "select": "cuota_hora,cuota_hilo"})
        filas = json.loads(http(f"{self.url}/rest/v1/buzones?{q}", headers=self.headers))
        if not filas:
            return CUOTA_HORA_DEFAULT, CUOTA_HILO_DEFAULT
        return (int(filas[0].get("cuota_hora") or CUOTA_HORA_DEFAULT),
                int(filas[0].get("cuota_hilo") or CUOTA_HILO_DEFAULT))

    def enviados(self, filtro: str) -> int:
        filas = json.loads(http(
            f"{self.url}/rest/v1/correos_salientes?{filtro}&estado=eq.enviado&select=id",
            headers=self.headers))
        return len(filas)


def saliente_id_de_ruta(ruta: str) -> str | None:
    """'buzon/<uuid>' → uuid. None si la ruta no es del buzon (EG.CRM sigue igual)."""
    if not ruta.startswith(PREFIJO_BUZON):
        return None
    resto = ruta[len(PREFIJO_BUZON):].strip()
    return resto or None


def gate_destinatarios_del_hilo(sb: Supabase, fila_buzon: dict,
                                destinatario: str) -> str:
    """Gate 3 (SPEC §2.2): destinatarios ⊆ participantes del hilo. '' = pasa."""
    dest = fila_buzon.get("destinatarios") or {}
    if dest.get("bcc"):
        return f"Bcc presente ({len(dest['bcc'])}): prohibido en todo saliente"
    objetivo = {d.strip().lower()
                for d in (dest.get("to") or []) + (dest.get("cc") or []) if d}
    objetivo.add(destinatario.strip().lower())
    participantes = sb.participantes_hilo(fila_buzon["hilo_id"])
    fuera = sorted(objetivo - participantes)
    if fuera:
        return f"{len(fuera)} destinatario(s) fuera del hilo: {', '.join(fuera)}"
    return ""


def gate_cuota_y_pausa(sb: Supabase, fila_buzon: dict) -> str:
    """Gate 4 (SPEC §2.2): cuota por buzon/hora y por hilo + pausa del Guardian."""
    if sb.pausa_global():
        return "pausa global del Guardian activa: nada sale"
    cuota_hora, cuota_hilo = sb.cuotas_buzon(fila_buzon["buzon_id"])
    en_hora = sb.enviados(
        f"buzon_id=eq.{fila_buzon['buzon_id']}&enviado_en=gte.now()-interval'1hour'")
    if en_hora >= cuota_hora:
        return f"cuota por hora agotada ({en_hora}/{cuota_hora})"
    en_hilo = sb.enviados(f"hilo_id=eq.{fila_buzon['hilo_id']}")
    if en_hilo >= cuota_hilo:
        return f"cuota por hilo agotada ({en_hilo}/{cuota_hilo})"
    return ""


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

        # --- gates 3 y 4: SOLO para salientes del buzon (ruta 'buzon/<id>').
        # Los salientes de EG.CRM no llevan hilo ni buzon: siguen exactamente
        # igual que antes (gates 1 y 2 intactos, SPEC-buzon-a2a §2.2).
        saliente_id = saliente_id_de_ruta(rel)
        if saliente_id is not None:
            fila_buzon = sb.saliente_buzon(saliente_id)
            if fila_buzon is None:
                log(f"SKIP {rel}: sin fila en correos_salientes (id {saliente_id})")
                saltados += 1
                continue
            if fila_buzon.get("estado") != "aprobado":
                log(f"SKIP {rel}: estado {fila_buzon.get('estado')!r} != 'aprobado'")
                saltados += 1
                continue
            motivo = (gate_destinatarios_del_hilo(sb, fila_buzon, destinatario)
                      or gate_cuota_y_pausa(sb, fila_buzon))
            if motivo:
                log(f"SKIP {rel}: gate del buzon en rojo — {motivo}")
                saltados += 1
                continue
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
