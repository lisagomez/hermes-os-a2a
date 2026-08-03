#!/usr/bin/env python3
"""redactar-borradores.py — el eslabon que faltaba entre la ingesta y el buzon.

`ingerir-entrantes.py` deja correo saneado en `correos_entrantes` y ahi se
paraba la cadena: nadie le pedia a buzon-a2a que redactara, asi que el modo
espejo nunca habria acumulado un solo borrador. Este job cierra el circuito.

Que hace: por cada entrante sin borrador, llama a buzon-a2a (JSON-RPC A2A) con
{accion: redactar}. El servicio corre los 11 gates y persiste el borrador; si un
gate CRITICO sale rojo, el borrador queda en 'rechazado_gates' y NO llega a la
bandeja de A5. Este job no juzga nada: solo reparte trabajo.

Fronteras (las mismas del diseño):
  - NO tiene credenciales de correo. Solo habla con Supabase y con el servicio
    interno en 127.0.0.1:4900. El correo entra por ingerir-entrantes.py (host,
    con llaves) y sale por enviar-salientes.py (host, con SMTP).
  - NO envia nada, ni puede: redactar deja un borrador que exige firma humana.
  - Dry-run por defecto. Sin REDACTAR_REAL=1 imprime el plan y no llama a nadie.

Uso:
    cd ~/repo/businessos && set -a && . ./.env && set +a && python3 redactar-borradores.py
  Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BUZON_A2A_URL (default
       http://127.0.0.1:4900), REDACTAR_REAL=1 para llamar de verdad.
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid

UA = "curl/8.0"  # Cloudflare 1010
DRY = os.environ.get("REDACTAR_REAL") != "1"
BUZON_URL = os.environ.get("BUZON_A2A_URL", "http://127.0.0.1:4900").rstrip("/")
LOTE_MAX = int(os.environ.get("REDACTAR_LOTE", "25"))

# Estados de buzon en los que el agente trabaja. 'espejo' redacta pero nada sale;
# 'activo' redacta y el envio pasa por la firma de A5. En cualquier otro estado
# (borrador, configurando, pausado, desconectado) este job no toca el buzon.
ESTADOS_QUE_REDACTAN = ("espejo", "activo")

# No se responde JAMAS a un remitente automatico: es la regla que evita bucles de
# auto-respuesta entre dos sistemas (RFC 3834). El gate auto_submitted_marcado
# marca lo que sale; esto decide que ni siquiera se redacte.
#
# Dos familias, porque no se comportan igual:
#  - EN CUALQUIER PARTE del local-part: las variantes de "no reply" nunca son una
#    persona. Va asi y no anclado al inicio porque `payments-noreply@google.com`
#    es exactamente el caso que hay que cazar (lo destapo el test de esta funcion).
#  - SOLO COMO PREFIJO: palabras que si pueden formar parte del nombre de una
#    persona o area real (`alertas.maria@`, `notificaciones-clientes@` de un
#    humano); anclarlas evita falsos positivos.
#
# Limite honesto: esto es una heuristica sobre la DIRECCION. La señal correcta
# segun RFC 3834 son las cabeceras (Auto-Submitted, Precedence, List-Unsubscribe),
# que hoy la ingesta no persiste. Mejora pendiente, mas robusta que adivinar.
_NO_REPLY_EN_CUALQUIER_PARTE = re.compile(
    r"no-?reply|do-?not-?reply|noresponder|no-?responder", re.IGNORECASE)
_AUTOMATICO_COMO_PREFIJO = re.compile(
    r"^(mailer-daemon|postmaster|bounces?|notifications?|notificaciones?|"
    r"alerts?|alertas?|automated|automatico|daemon|robot|bot)[.\-_+@]",
    re.IGNORECASE)


def log(msg: str) -> None:
    print(f"[redactar-borradores] {msg}", flush=True)


def env(nombre: str) -> str:
    val = os.environ.get(nombre, "")
    if not val:
        log(f"ABORT: falta {nombre} en el entorno (source businessos/.env)")
        sys.exit(1)
    return val


def http(url: str, data: bytes | None = None, headers: dict | None = None,
         method: str | None = None, timeout: int = 120) -> str:
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={"User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode()


def sb_headers() -> dict:
    key = env("SUPABASE_SERVICE_ROLE_KEY")
    return {"apikey": key, "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"}


def remitente_automatico(direccion: str) -> bool:
    """True si responder a esa direccion seria hablarle a una maquina."""
    local = (direccion or "").strip().split("@")[0]
    if not local:
        return True  # sin remitente no hay a quien responder: fail-safe
    return bool(_NO_REPLY_EN_CUALQUIER_PARTE.search(local)
                or _AUTOMATICO_COMO_PREFIJO.match((direccion or "").strip()))


def buzones_que_redactan(url: str) -> dict[str, dict]:
    filas = json.loads(http(
        f"{url}/rest/v1/buzones?activo=eq.true&select=*", headers=sb_headers()))
    return {b["id"]: b for b in filas if b.get("estado") in ESTADOS_QUE_REDACTAN}


def entrantes_sin_borrador(url: str, buzon_id: str) -> list[dict]:
    """Entrantes de un buzon que aun no tienen saliente asociado.

    PostgREST no hace anti-joins, asi que se traen los ids ya respondidos y se
    filtra aqui. El volumen de un buzon es pequeño; si algun dia deja de serlo,
    esto se convierte en una vista.
    """
    entrantes = json.loads(http(
        f"{url}/rest/v1/correos_entrantes?buzon_id=eq.{buzon_id}"
        "&select=id,remitente,asunto,hilo_id&order=ingerido_en.asc",
        headers=sb_headers()))
    salientes = json.loads(http(
        f"{url}/rest/v1/correos_salientes?buzon_id=eq.{buzon_id}"
        "&select=en_respuesta_a", headers=sb_headers()))
    respondidos = {s["en_respuesta_a"] for s in salientes if s.get("en_respuesta_a")}
    return [e for e in entrantes if e["id"] not in respondidos]


def pedir_borrador(correo_id: str, clase: str) -> tuple[bool, str]:
    """Llama a buzon-a2a por JSON-RPC A2A. Devuelve (ok, detalle).

    Formato de cable del a2a-sdk v1 (aprendizaje 2026-07-03): el metodo es
    'SendMessage' (no 'message/send'), hace falta la cabecera A2A-Version, y el
    DataPart lleva el objeto DIRECTO en 'data' — anidarlo entrega el payload
    envuelto y el error resultante engaña.
    """
    cuerpo = json.dumps({
        "jsonrpc": "2.0", "id": 1, "method": "SendMessage",
        "params": {"message": {
            "messageId": str(uuid.uuid4()),
            "role": "ROLE_USER",
            "parts": [{"data": {"accion": "redactar",
                                "correo_entrante_id": correo_id,
                                "clase": clase}}],
        }},
    }).encode()
    try:
        r = json.loads(http(f"{BUZON_URL}/", data=cuerpo, headers={
            "Content-Type": "application/json", "A2A-Version": "1.0"}))
    except (urllib.error.URLError, OSError) as e:
        return False, f"buzon-a2a inalcanzable: {type(e).__name__}"
    if "error" in r:
        return False, f"JSON-RPC error: {str(r['error'])[:160]}"
    tarea = (r.get("result") or {}).get("task") or {}
    estado = ((tarea.get("status") or {}).get("state") or "")
    if estado != "TASK_STATE_COMPLETED":
        partes = ((tarea.get("status") or {}).get("message") or {}).get("parts") or [{}]
        return False, f"{estado}: {partes[0].get('text', '')[:160]}"
    # El artifact trae el veredicto de los gates.
    for art in tarea.get("artifacts") or []:
        for parte in art.get("parts") or []:
            d = parte.get("data") or {}
            if "estado" in d:
                rojos = [g["gate"] for g in d.get("gates", []) if not g.get("paso")]
                return True, f"{d['estado']}" + (f" (gates en rojo: {', '.join(rojos)})" if rojos else "")
    return True, "completado (sin artifact legible)"


def main() -> int:
    url = env("SUPABASE_URL").rstrip("/")
    buzones = buzones_que_redactan(url)
    if not buzones:
        log("sin buzones en espejo/activo: nada que redactar")
        return 0

    total_ok = total_mal = total_saltados = 0
    for buzon_id, buzon in buzones.items():
        clases = [str(c) for c in (buzon.get("clases_permitidas") or [])]
        if not clases:
            log(f"SKIP {buzon['direccion']}: sin clases_permitidas "
                "(el agente puede clasificar pero no redactar)")
            continue
        clase = clases[0]
        pendientes = entrantes_sin_borrador(url, buzon_id)
        log(f"{buzon['direccion']} [{buzon['estado']}]: {len(pendientes)} entrante(s) "
            f"sin borrador, clase '{clase}'")

        for entrante in pendientes[:LOTE_MAX]:
            quien = entrante.get("remitente", "")
            if remitente_automatico(quien):
                log(f"  SALTA {quien}: remitente automatico (no se responde, "
                    "evita bucles)")
                total_saltados += 1
                continue
            if DRY:
                log(f"  PLAN redactar para {quien} ({(entrante.get('asunto') or '')[:40]!r})")
                total_ok += 1
                continue
            ok, detalle = pedir_borrador(entrante["id"], clase)
            if ok:
                log(f"  OK {quien}: {detalle}")
                total_ok += 1
            else:
                log(f"  FALLO {quien}: {detalle}")
                total_mal += 1

    sufijo = " (DRY-RUN, no se llamo al servicio)" if DRY else ""
    log(f"fin: {total_ok} borrador(es), {total_saltados} saltado(s) por automaticos, "
        f"{total_mal} con problema{sufijo}")
    return 1 if total_mal else 0


if __name__ == "__main__":
    sys.exit(main())
