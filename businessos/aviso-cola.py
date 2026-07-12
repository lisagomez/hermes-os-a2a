#!/usr/bin/env python3
"""aviso-cola.py — el trio AVISA en #dep-desarrollo (PRP-010, Fase 4).

Con la cola, la respuesta A2A ya no trae el veredicto: el bot contesta "encolada, posicion 3"
y se va. Alguien tiene que contar el desenlace — y ese alguien NO puede ser el agente (no
tiene el token de Slack, por diseño). Es un job de confianza del HOST, como publicar-rama.sh.

Que avisa (leyendo `tareas`, SIN escribirla — el ciclo de estados es del Ejecutor):
  - arranco una tarea      → "empezo X. Quedan en cola: ..."
  - termino (aprobada/rechazada/escalada) → veredicto + gates + que sigue en la cola
  - no avisa el encolado: eso ya lo dice el bot en el canal al recibir {encolada, posicion}.

Idempotente: la memoria de "ya avise" vive en un ARCHIVO del host (no en la tabla: meter una
columna 'avisado' seria convertir al avisador en un segundo escritor de `tareas`, justo el
invariante que protegemos). Correr dos veces seguidas NO duplica avisos.

Uso:  source businessos/.env && python3 businessos/aviso-cola.py [--dry-run]
Cron: cada 2 min en el servidor.
"""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
CANAL = os.environ.get("SLACK_DEV_CHANNEL", "C0BGL2DMNLB")  # #dep-desarrollo
MEMORIA = Path(os.environ.get("AVISO_COLA_MEMORIA", "/home/hermes/state/aviso-cola.json"))
ENV_NEGOCIO = "/home/hermes/businessos/negocio/.hermes/.env"
DRY = "--dry-run" in sys.argv[1:]

TERMINALES = {"aprobada", "rechazada", "escalada"}
EMOJI = {"aprobada": "✅", "rechazada": "❌", "escalada": "⚠️", "en_ejecucion": "🔨"}


def http(path: str) -> list[dict]:
    req = urllib.request.Request(
        f"{URL}/rest/v1/{path}",
        headers={"apikey": KEY, "Authorization": "Bearer " + KEY,
                 "User-Agent": "curl/8.0"},  # Cloudflare 1010 (aprendizaje 2026-07-02)
    )
    return json.load(urllib.request.urlopen(req, timeout=30))


def token_slack() -> str:
    """El token vive en el .env del volumen de negocio (root). Mismo patron que
    publicar-rama.sh: el HOST lo lee; el agente jamas lo toca."""
    if os.environ.get("SLACK_BOT_TOKEN"):
        return os.environ["SLACK_BOT_TOKEN"]
    r = subprocess.run(["sudo", "grep", "-m1", "^SLACK_BOT_TOKEN=", ENV_NEGOCIO],
                       capture_output=True, text=True)
    return r.stdout.strip().split("=", 1)[1] if r.returncode == 0 and "=" in r.stdout else ""


def avisar(texto: str) -> bool:
    if DRY:
        print("[dry-run] Slack:", texto.replace("\n", " | ")[:200])
        return True
    tok = token_slack()
    if not tok:
        # No inventamos nada: si no hay token, se DICE y se sale sin marcar como avisado.
        print("SIN TOKEN de Slack: no se avisa (y no se marca como avisado)")
        return False
    req = urllib.request.Request(
        "https://slack.com/api/chat.postMessage",
        data=json.dumps({"channel": CANAL, "text": texto}).encode(),
        headers={"Authorization": f"Bearer {tok}",
                 "Content-type": "application/json; charset=utf-8"},
    )
    try:
        d = json.load(urllib.request.urlopen(req, timeout=30))
    except urllib.error.HTTPError as e:
        print("Slack HTTP", e.code, e.read().decode()[:200])
        return False
    if not d.get("ok"):
        print("Slack error:", d.get("error"))
        return False
    return True


def linea_cola(cola: list[dict]) -> str:
    if not cola:
        return "La cola queda vacía."
    orden = "  ".join(f"{i}) `{t['task_id']}`" for i, t in enumerate(cola, start=1))
    return f"En cola ({len(cola)}): {orden}"


def texto_terminal(t: dict, cola: list[dict]) -> str:
    v = t.get("veredicto") or {}
    estado = t["estado"]
    cabeza = f"{EMOJI.get(estado, '•')} *{t['task_id']}* → *{estado.upper()}*"
    partes = [cabeza, f"_{(t.get('objetivo') or '')[:120]}_"]
    gates = v.get("gates") or []
    if gates:
        ok = sum(1 for g in gates if g.get("estado") == "paso")
        partes.append(f"Gates: {ok}/{len(gates)} verdes.")
    for h in (v.get("hallazgos") or [])[:3]:
        partes.append(f"• {h.get('regla')}: {str(h.get('evidencia'))[:100]}")
    if estado == "aprobada":
        partes.append(
            f"Rama `tarea/{t['task_id']}` lista en el servidor. Para publicarla y abrir el PR: "
            f"`ssh hetzner '~/bin/publicar-rama.sh {t['task_id']}'` (el merge lo aprueba un humano)."
        )
    if estado == "escalada":
        partes.append("Necesita una decisión humana: no quedan reintentos o falló la infraestructura.")
    partes.append(linea_cola(cola))
    return "\n".join(partes)


def main() -> None:
    tareas = http("tareas?select=task_id,estado,objetivo,veredicto,intentos,intentos_max,"
                  "updated_at&order=updated_at.desc&limit=50")
    cola = [t for t in http(
        "tareas?estado=eq.recibida&select=task_id,objetivo&order=prioridad.desc,encolada_en.asc")]

    MEMORIA.parent.mkdir(parents=True, exist_ok=True)
    try:
        visto = json.loads(MEMORIA.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        visto = {}

    nuevos = 0
    for t in reversed(tareas):  # cronologico: se cuenta la historia en orden
        tid, estado = t["task_id"], t["estado"]
        clave = f"{tid}:{estado}"
        if visto.get(tid) == estado or estado not in (TERMINALES | {"en_ejecucion"}):
            continue
        if estado == "en_ejecucion":
            texto = (f"{EMOJI['en_ejecucion']} Empezó *{tid}* "
                     f"(intento {t.get('intentos')}/{t.get('intentos_max')}).\n"
                     f"_{(t.get('objetivo') or '')[:120]}_\n{linea_cola(cola)}")
        else:
            texto = texto_terminal(t, cola)
        if avisar(texto):
            visto[tid] = estado  # solo se marca si SE avisó de verdad
            nuevos += 1
            print(f"avisado: {clave}")

    if not DRY:
        MEMORIA.write_text(json.dumps(visto, indent=2), encoding="utf-8")
    print(f"{nuevos} aviso(s); {len(cola)} en cola")


if __name__ == "__main__":
    main()
