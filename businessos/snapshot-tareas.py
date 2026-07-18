#!/usr/bin/env python3
"""Snapshot de la tabla `tareas` -> lo lee el bot (skill trio-software), sin credenciales.

El agente Hermes NO puede consultar Supabase (scrubbing de secretos, por diseno): este
job de confianza del HOST -- que si tiene el service_role -- deja el estado del trio ya
resuelto dentro del volumen de negocio, y el skill solo LO LEE. Mismo patron que
presupuesto.json (ingest-token-usage.py) y cli-audit.json.

Nace del 5o hallazgo de la 1a corrida real (2026-07-12): cuando su llamada expiro, el bot
no tenia forma de saber que la tarea seguia viva -- y ADIVINO ("el trio no esta levantado"),
justo lo contrario de la verdad. Con este snapshot no adivina: lee.

Uso:
    source businessos/.env            # SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
    python3 businessos/snapshot-tareas.py

Corre en el SERVIDOR (nightly-jobs.sh + cron), donde vive el contenedor de negocio. Si
algun dia negocio se muda, TAREAS_SSH_HOST=hermes@<runtime> lo empuja por ssh (leccion de
los host-jobs huerfanos tras la migracion a Hetzner, 2026-07-11).
"""
import datetime
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

LIMITE = 30           # el snapshot lo carga el bot en contexto: pocas tareas, recientes
OBJETIVO_MAX = 200
EVIDENCIA_MAX = 200
LOCAL_SNAPSHOT = Path("/tmp/tareas.json")
DESTINO = "/opt/data/workspace/tareas.json"
# Estados de los que el bot debe hablar en presente ("sigue corriendo"): el resto ya cerro.
EN_CURSO = {"recibida", "en_ejecucion", "en_revision"}


def corta(texto, n):
    t = str(texto or "")
    return t if len(t) <= n else t[: n - 1] + "…"


def leer_tareas() -> list[dict]:
    campos = ("task_id,departamento,objetivo,estado,intentos,intentos_max,"
              "resultado,veredicto,created_at,updated_at")
    req = urllib.request.Request(
        f"{URL}/rest/v1/tareas?select={campos}&order=updated_at.desc&limit={LIMITE}",
        headers={
            "apikey": KEY,
            "Authorization": "Bearer " + KEY,
            # Cloudflare 1010 rechaza el UA por defecto de urllib (aprendizaje 2026-07-02).
            "User-Agent": "curl/8.0",
        },
    )
    return json.load(urllib.request.urlopen(req, timeout=30))


def resumir(t: dict) -> dict:
    """Lo justo para que el bot informe con verdad. SIN el diff (pesa y no lo necesita:
    para el detalle esta la respuesta A2A y el worktree en el servidor)."""
    resultado = t.get("resultado") or {}
    veredicto = t.get("veredicto") or {}
    fila = {
        "task_id": t["task_id"],
        "estado": t["estado"],
        "en_curso": t["estado"] in EN_CURSO,
        "departamento": t.get("departamento", "software"),
        "objetivo": corta(t.get("objetivo"), OBJETIVO_MAX),
        "intentos": f"{t.get('intentos', 0)}/{t.get('intentos_max', 3)}",
        "actualizada": t.get("updated_at"),
    }
    if resultado:
        fila["rama"] = f"tarea/{t['task_id']}"
        fila["archivos"] = (resultado.get("archivos") or [])[:20]
    if veredicto:
        fila["veredicto"] = veredicto.get("veredicto")
        fila["gates"] = [
            {"regla": g.get("regla"), "estado": g.get("estado")}
            for g in (veredicto.get("gates") or [])
        ]
        fila["hallazgos"] = [
            {
                "regla": h.get("regla"),
                "evidencia": corta(h.get("evidencia"), EVIDENCIA_MAX),
                "archivo": h.get("archivo"),
            }
            for h in (veredicto.get("hallazgos") or [])[:10]
        ]
    return fila


def escribir(snapshot: dict) -> None:
    payload = json.dumps(snapshot, ensure_ascii=False, indent=2)
    LOCAL_SNAPSHOT.write_text(payload, encoding="utf-8")
    print(f"Snapshot local -> {LOCAL_SNAPSHOT}")

    exec_sh = ("docker exec -i -u hermes hermes-negocio sh -c "
               f"'mkdir -p /opt/data/workspace && cat > {DESTINO}'")
    ssh_host = os.environ.get("TAREAS_SSH_HOST", "")
    cmd = ["ssh", ssh_host, exec_sh] if ssh_host else ["sh", "-c", exec_sh]
    destino = (f"{ssh_host} -> " if ssh_host else "") + f"negocio:{DESTINO}"
    try:
        r = subprocess.run(cmd, input=payload, text=True, capture_output=True)
        ok = r.returncode == 0
        err = r.stderr.strip()[:200]
    except FileNotFoundError:
        ok, err = False, "docker/ssh no disponible"
    print(f"Snapshot a {destino}: " + ("ok" if ok else f"FALLO ({err}) — solo copia local"))
    if not ok:
        sys.exit(1)  # que el fallo SE VEA en host-jobs.log: un snapshot rancio miente


def leer_cola() -> list[dict]:
    """La COLA en su orden REAL de ejecucion (PRP-010): prioridad primero, luego FIFO.

    Es el mismo `order` que usa el worker para su pick, asi que lo que el bot le cuenta al
    equipo es exactamente lo que va a pasar — no una version aproximada.
    """
    req = urllib.request.Request(
        f"{URL}/rest/v1/tareas?estado=eq.recibida&select=task_id,objetivo,prioridad,encolada_en"
        "&order=prioridad.desc,encolada_en.asc",
        headers={"apikey": KEY, "Authorization": "Bearer " + KEY, "User-Agent": "curl/8.0"},
    )
    return [
        {
            "posicion": i,
            "task_id": t["task_id"],
            "objetivo": corta(t.get("objetivo"), OBJETIVO_MAX),
            "prioridad": t.get("prioridad", 0),
            "encolada_en": t.get("encolada_en"),
        }
        for i, t in enumerate(json.load(urllib.request.urlopen(req, timeout=30)), start=1)
    ]


def main() -> None:
    try:
        tareas = leer_tareas()
        cola = leer_cola()
    except urllib.error.HTTPError as e:
        print("SNAPSHOT ERROR", e.code, e.read().decode()[:300])
        sys.exit(1)

    filas = [resumir(t) for t in tareas]
    por_estado: dict[str, int] = {}
    for f in filas:
        por_estado[f["estado"]] = por_estado.get(f["estado"], 0) + 1
    ejecutando = next((f["task_id"] for f in filas if f["estado"] == "en_ejecucion"), None)

    escribir({
        # `generado` es obligatorio: sin el, el bot no puede distinguir "no hay tareas"
        # de "el job no corre desde hace una semana" (leccion del cli-audit rancio).
        "generado": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "fuente": "supabase.tareas (host-job snapshot-tareas.py)",
        # La COLA: lo que el equipo pregunta de verdad ("¿cuándo me toca?").
        "en_ejecucion": ejecutando,
        "cola": cola,
        "total": len(filas),
        "por_estado": por_estado,
        "tareas": filas,
    })
    print(f"{len(filas)} tareas ({por_estado}); ejecutando: {ejecutando or 'nada'}; "
          f"en cola: {[c['task_id'] for c in cola] or 'ninguna'}")


if __name__ == "__main__":
    main()
