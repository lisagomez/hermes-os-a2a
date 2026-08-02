#!/usr/bin/env python3
"""ingerir-entrantes.py — host-job de entrada del buzon (SPEC-buzon-a2a §2.1).

Trae correo nuevo de cada buzon activo (M365 Graph / Gmail API / IMAP), lo sanea
(buzon-a2a/saneado.py) y lo deja en public.correos_entrantes. ESCRITOR UNICO de
esa tabla, origen 'buzon'. En modo abierto_cuarentena, el primer mensaje de un
remitente desconocido crea un lead (origen 'correo', ignore-duplicates: jamas
pisa la etapa del funnel — contrato de crm-canales/leads.py).

Invariantes:
  - Las credenciales de correo viven SOLO aqui (el .env del host); el contenedor
    buzon-a2a NUNCA las ve (patron host-job, CLAUDE.md 2026-06-30).
  - Dry-run por defecto: sin INGERIR_REAL=1 imprime el PLAN y no escribe nada.
  - Todo fallo IMPRIME (nada de best-effort silencioso, CLAUDE.md 2026-07-13).
  - Modo 'cerrado': el correo de desconocidos SE GUARDA con remitente_conocido=false
    (carpeta de revision humana en la UI); el agente no lo procesa — eso lo aplica
    buzon-a2a, no este job.
  - El Protocol de la SPEC §5.1 trae enviar(); aqui NO: la unica salida es
    enviar-salientes.py (A4). Este job solo lee y sanea.

Uso:
  cd ~/repo/businessos && set -a && . ./.env && set +a && python3 ingerir-entrantes.py
  Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INGERIR_REAL=1 (para escribir),
       BUZON_IMAP_HOST/USER/PASS | BUZON_GRAPH_TENANT_ID/CLIENT_ID/CLIENT_SECRET |
       BUZON_GMAIL_TOKEN (segun buzones.proveedor).
  NO auto-registrar en nightly-jobs.sh: activarlo en cron es decision de la duena
  (mismo gate que enviar-salientes.py, COMO-RETOMAR.md).
"""

from __future__ import annotations

import email
import email.policy
import hashlib
import imaplib
import json
import os
import sys
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "buzon-a2a"))
import saneado  # noqa: E402

UA = "curl/8.0"  # Cloudflare bloquea el UA de urllib (error 1010)
DRY = os.environ.get("INGERIR_REAL") != "1"


def log(msg: str) -> None:
    print(f"[ingerir-entrantes] {msg}", flush=True)


def env(nombre: str) -> str:
    val = os.environ.get(nombre, "")
    if not val:
        log(f"ABORT: falta {nombre} en el entorno (source businessos/.env)")
        sys.exit(1)
    return val


def http(url: str, data: bytes | None = None, headers: dict | None = None,
         method: str | None = None) -> str:
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={"User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode()


def sb_headers(extra: dict | None = None) -> dict:
    key = env("SUPABASE_SERVICE_ROLE_KEY")
    return {"apikey": key, "Authorization": f"Bearer {key}",
            "Content-Type": "application/json", **(extra or {})}


@dataclass
class SobreCrudo:
    proveedor_id: str
    remitente: str
    destinatarios: dict            # {"to": [...], "cc": [...]}
    asunto: str
    cuerpo: str
    es_html: bool
    cabeceras: dict
    hilo_id: str
    recibido_en: str               # ISO
    adjuntos: list = field(default_factory=list)  # [{nombre,tipo,bytes}] — contenido NO viaja


# ------------------------------------------------------------------ adaptadores
class AdaptadorImap:
    """IMAP4_SSL con stdlib. El mas simple; sirve para el primer buzon (modo cerrado)."""

    def __init__(self) -> None:
        self.host = env("BUZON_IMAP_HOST")
        self.user = env("BUZON_IMAP_USER")
        self.pas = env("BUZON_IMAP_PASS")

    def listar_nuevos(self, buzon: str, desde: str) -> list[SobreCrudo]:
        con = imaplib.IMAP4_SSL(self.host)
        try:
            con.login(self.user, self.pas)
            con.select("INBOX", readonly=True)
            _, datos = con.search(None, "UNSEEN")
            sobres = []
            for num in (datos[0].split() if datos and datos[0] else []):
                _, crudo = con.fetch(num, "(RFC822)")
                if crudo and crudo[0]:
                    sobres.append(_sobre_desde_mime(crudo[0][1]))
            return sobres
        finally:
            con.logout()

    def marcar_leido(self, buzon: str, mensaje_id: str) -> None:
        con = imaplib.IMAP4_SSL(self.host)
        try:
            con.login(self.user, self.pas)
            con.select("INBOX")
            _, datos = con.search(None, f'(HEADER Message-ID "{mensaje_id}")')
            for num in (datos[0].split() if datos and datos[0] else []):
                con.store(num, "+FLAGS", "\\Seen")
        finally:
            con.logout()


class AdaptadorGraph:
    """Microsoft 365 via Graph, permisos de APLICACION (SPEC §5.1: exige
    ApplicationAccessPolicy en el tenant o la app ve TODOS los buzones)."""

    def __init__(self) -> None:
        tenant = env("BUZON_GRAPH_TENANT_ID")
        cuerpo = urllib.parse.urlencode({
            "client_id": env("BUZON_GRAPH_CLIENT_ID"),
            "client_secret": env("BUZON_GRAPH_CLIENT_SECRET"),
            "scope": "https://graph.microsoft.com/.default",
            "grant_type": "client_credentials",
        }).encode()
        r = json.loads(http(
            f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
            data=cuerpo, headers={"Content-Type": "application/x-www-form-urlencoded"}))
        self.token = r["access_token"]

    def _h(self) -> dict:
        return {"Authorization": f"Bearer {self.token}"}

    def listar_nuevos(self, buzon: str, desde: str) -> list[SobreCrudo]:
        filtro = urllib.parse.quote(f"isRead eq false and receivedDateTime ge {desde}")
        r = json.loads(http(
            f"https://graph.microsoft.com/v1.0/users/{buzon}/messages"
            f"?$filter={filtro}&$top=25"
            "&$select=id,conversationId,from,toRecipients,ccRecipients,subject,body,"
            "receivedDateTime,internetMessageHeaders,hasAttachments", headers=self._h()))
        sobres = []
        for m in r.get("value", []):
            cab = {h["name"]: h["value"] for h in m.get("internetMessageHeaders") or []}
            sobres.append(SobreCrudo(
                proveedor_id=m["id"],
                remitente=(m.get("from") or {}).get("emailAddress", {}).get("address", ""),
                destinatarios={
                    "to": [d["emailAddress"]["address"] for d in m.get("toRecipients") or []],
                    "cc": [d["emailAddress"]["address"] for d in m.get("ccRecipients") or []]},
                asunto=m.get("subject") or "",
                cuerpo=(m.get("body") or {}).get("content", ""),
                es_html=(m.get("body") or {}).get("contentType", "") == "html",
                cabeceras=cab,
                hilo_id=m.get("conversationId") or m["id"],
                recibido_en=m.get("receivedDateTime") or "",
            ))
        return sobres

    def marcar_leido(self, buzon: str, mensaje_id: str) -> None:
        http(f"https://graph.microsoft.com/v1.0/users/{buzon}/messages/{mensaje_id}",
             data=json.dumps({"isRead": True}).encode(),
             headers={**self._h(), "Content-Type": "application/json"}, method="PATCH")


class AdaptadorGmail:
    """Gmail API con token OAuth ya emitido (delegacion de dominio o OAuth de
    escritorio por buzon, SPEC §5.1). El refresh del token es asunto del .env."""

    def __init__(self) -> None:
        self.token = env("BUZON_GMAIL_TOKEN")

    def _h(self) -> dict:
        return {"Authorization": f"Bearer {self.token}"}

    def listar_nuevos(self, buzon: str, desde: str) -> list[SobreCrudo]:
        base = f"https://gmail.googleapis.com/gmail/v1/users/{urllib.parse.quote(buzon)}"
        r = json.loads(http(f"{base}/messages?q=is:unread&maxResults=25", headers=self._h()))
        sobres = []
        for ref in r.get("messages", []):
            m = json.loads(http(f"{base}/messages/{ref['id']}?format=raw", headers=self._h()))
            import base64
            crudo = base64.urlsafe_b64decode(m["raw"] + "==")
            sobre = _sobre_desde_mime(crudo)
            sobre.proveedor_id = m["id"]
            sobre.hilo_id = m.get("threadId") or sobre.hilo_id
            sobres.append(sobre)
        return sobres

    def marcar_leido(self, buzon: str, mensaje_id: str) -> None:
        base = f"https://gmail.googleapis.com/gmail/v1/users/{urllib.parse.quote(buzon)}"
        http(f"{base}/messages/{mensaje_id}/modify",
             data=json.dumps({"removeLabelIds": ["UNREAD"]}).encode(),
             headers={**self._h(), "Content-Type": "application/json"})


def _sobre_desde_mime(crudo: bytes) -> SobreCrudo:
    msg = email.message_from_bytes(crudo, policy=email.policy.default)
    cuerpo, es_html = "", False
    parte = msg.get_body(preferencelist=("html", "plain"))
    if parte is not None:
        cuerpo = parte.get_content()
        es_html = parte.get_content_type() == "text/html"
    adjuntos = [{"nombre": p.get_filename() or "sin-nombre",
                 "tipo": p.get_content_type(),
                 "bytes": len(p.get_payload(decode=True) or b"")}
                for p in msg.iter_attachments()]
    refs = (msg.get("References") or msg.get("In-Reply-To") or "").split()
    return SobreCrudo(
        proveedor_id=msg.get("Message-ID", "").strip() or hashlib.sha256(crudo).hexdigest(),
        remitente=str(msg.get("From", "")).split("<")[-1].rstrip(">").strip().lower(),
        destinatarios={"to": [a.strip() for a in str(msg.get("To", "")).split(",") if a.strip()],
                       "cc": [a.strip() for a in str(msg.get("Cc", "")).split(",") if a.strip()]},
        asunto=str(msg.get("Subject", "")),
        cuerpo=cuerpo, es_html=es_html,
        cabeceras={k: str(v) for k, v in msg.items()},
        hilo_id=(refs[0] if refs else msg.get("Message-ID", "").strip()) or "sin-hilo",
        recibido_en=str(msg.get("Date", "")),
        adjuntos=adjuntos,
    )


ADAPTADORES = {"imap": AdaptadorImap, "m365": AdaptadorGraph, "google": AdaptadorGmail}


# ------------------------------------------------------------------ persistencia
def buzones_activos(url: str) -> list[dict]:
    return json.loads(http(f"{url}/rest/v1/buzones?activo=eq.true&select=*",
                           headers=sb_headers()))


def remitente_conocido(direccion: str, contrapartes: list) -> bool:
    d = direccion.strip().lower()
    dominio = d.split("@")[-1]
    for c in contrapartes or []:
        c = str(c).strip().lower().lstrip("@")
        if d == c or dominio == c or dominio.endswith("." + c):
            return True
    return False


def insertar_entrante(url: str, fila: dict) -> bool:
    """Idempotente: unique(buzon_id, proveedor_id) + ignore-duplicates."""
    try:
        http(f"{url}/rest/v1/correos_entrantes?on_conflict=buzon_id,proveedor_id",
             data=json.dumps(fila).encode(),
             headers=sb_headers({"Prefer": "resolution=ignore-duplicates,return=minimal"}))
        return True
    except Exception as e:  # noqa: BLE001 — se imprime, nunca silencioso
        log(f"FALLO insert correos_entrantes {fila.get('proveedor_id', '')[:40]}: {e}")
        return False


def capturar_lead(url: str, buzon: dict, remitente: str) -> None:
    """Primer mensaje de desconocido en abierto_cuarentena → lead origen 'correo'."""
    fila = {
        "lead_id": f"correo-{buzon.get('tenant_id', 'a2a')}-{remitente}",
        "origen": "correo", "empresa": "", "contacto": remitente,
        "mensaje": f"correo entrante a {buzon['direccion']}",
        "etapa": "nuevo", "canal": "email",
        "datos": {"source": "buzon", "buzon": buzon["direccion"]},
    }
    if DRY:
        log(f"PLAN lead correo → {remitente}")
        return
    try:
        http(f"{url}/rest/v1/leads?on_conflict=lead_id", data=json.dumps(fila).encode(),
             headers=sb_headers({"Prefer": "resolution=ignore-duplicates,return=minimal"}))
        log(f"lead correo → {remitente}")
    except Exception as e:  # noqa: BLE001
        log(f"FALLO lead {remitente}: {e}")


def bitacora(url: str, evento: str, detalle: dict, buzon_id: str | None = None,
             hilo_id: str | None = None, correo_id: str | None = None) -> None:
    """Append-only con hash encadenado (ISO 27001 5.33). Fallo = impreso, no fatal."""
    if DRY:
        return
    try:
        prev = json.loads(http(
            f"{url}/rest/v1/buzon_bitacora?select=hash_fila&order=id.desc&limit=1",
            headers=sb_headers()))
        hash_prev = prev[0]["hash_fila"] if prev else ""
        cuerpo = json.dumps(detalle, sort_keys=True, ensure_ascii=False)
        hash_fila = hashlib.sha256(
            f"{hash_prev}|ingerir-entrantes|{evento}|{cuerpo}".encode()).hexdigest()
        http(f"{url}/rest/v1/buzon_bitacora", data=json.dumps({
            "actor": "ingerir-entrantes", "evento": evento, "detalle": detalle,
            "buzon_id": buzon_id, "hilo_id": hilo_id, "correo_id": correo_id,
            "hash_prev": hash_prev, "hash_fila": hash_fila}).encode(),
            headers=sb_headers({"Prefer": "return=minimal"}))
    except Exception as e:  # noqa: BLE001
        log(f"FALLO bitacora {evento}: {e}")


# ------------------------------------------------------------------------- main
def procesar_buzon(url: str, buzon: dict) -> tuple[int, int]:
    proveedor = buzon["proveedor"]
    if proveedor not in ADAPTADORES:
        log(f"SKIP {buzon['direccion']}: proveedor desconocido {proveedor!r}")
        return 0, 1
    adaptador = ADAPTADORES[proveedor]()
    sobres = adaptador.listar_nuevos(buzon["direccion"], "1970-01-01T00:00:00Z")
    ok, mal = 0, 0
    for s in sobres:
        limpio = saneado.sanear(s.cuerpo, s.es_html)
        conocido = remitente_conocido(s.remitente, buzon.get("contrapartes") or [])
        fila = {
            "buzon_id": buzon["id"], "proveedor_id": s.proveedor_id,
            "hilo_id": s.hilo_id, "remitente": s.remitente,
            "destinatarios": s.destinatarios, "asunto": s.asunto,
            "cuerpo_saneado": limpio["texto"],
            "saneado_meta": {"eliminados": limpio["eliminados"]},
            "hash_original": saneado.hash_cuerpo(s.cuerpo),
            "dmarc_alineado": saneado.dmarc_alineado(s.cabeceras),
            "remitente_conocido": conocido,
            "adjuntos": s.adjuntos,       # metadata; el contenido NO entra al contexto
            "recibido_en": s.recibido_en or None,
        }
        if DRY:
            log(f"PLAN {buzon['direccion']} ← {s.remitente} ({s.asunto[:40]!r}, "
                f"conocido={conocido}, dmarc={fila['dmarc_alineado']}, "
                f"eliminados={len(limpio['eliminados'])})")
            ok += 1
            continue
        if insertar_entrante(url, fila):
            ok += 1
            bitacora(url, "ingerido", {"remitente": s.remitente, "conocido": conocido,
                                       "dmarc": fila["dmarc_alineado"],
                                       "eliminados": limpio["eliminados"]},
                     buzon_id=buzon["id"], hilo_id=s.hilo_id)
            if not conocido and buzon.get("modo_contraparte") == "abierto_cuarentena":
                capturar_lead(url, buzon, s.remitente)
            try:
                adaptador.marcar_leido(buzon["direccion"], s.proveedor_id)
            except Exception as e:  # noqa: BLE001
                log(f"FALLO marcar_leido {s.proveedor_id[:40]}: {e}")
        else:
            mal += 1
    return ok, mal


def main() -> int:
    url = env("SUPABASE_URL").rstrip("/")
    buzones = buzones_activos(url)
    if not buzones:
        log("sin buzones activos: nada que ingerir")
        return 0
    total_ok = total_mal = 0
    for b in buzones:
        try:
            ok, mal = procesar_buzon(url, b)
        except Exception as e:  # noqa: BLE001
            log(f"FALLO buzon {b.get('direccion')}: {e}")
            ok, mal = 0, 1
        total_ok += ok
        total_mal += mal
    sufijo = " (DRY-RUN, no se escribio nada)" if DRY else ""
    log(f"fin: {total_ok} ingerido(s), {total_mal} con problema{sufijo}")
    return 1 if total_mal else 0


if __name__ == "__main__":
    sys.exit(main())
