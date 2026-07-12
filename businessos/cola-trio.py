#!/usr/bin/env python3
"""cola-trio.py — la cola del trio, para Elisa (PRP-010, Fase 5).

Ver la cola, adelantar algo urgente y cancelar lo que aun no arranco. Es un host-job: tiene
el `service_role`. **El bot NO puede hacer esto** — y no es un descuido, es el diseño: si
cualquiera del canal pudiera colarse en la fila, el orden no significaria nada. La autoridad
es la credencial, y la credencial la tienes tu.

    python3 businessos/cola-trio.py list
    python3 businessos/cola-trio.py prioriza <task_id> [n]     # n>0 adelanta (default 10)
    python3 businessos/cola-trio.py cancela  <task_id>

Lo que NO hace, a proposito:
  - No toca una tarea que ya arranco (`en_ejecucion`): esa fila es del worker (un escritor
    por fila). Para pararla: se para el worker. Cancelar a media corrida dejaria un motor
    huerfano escribiendo en un worktree.
  - No cambia veredictos ni aprueba nada. Eso es del Supervisor y del humano en GitHub.
"""
import json
import os
import sys
import urllib.error
import urllib.request

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
HDRS = {"apikey": KEY, "Authorization": "Bearer " + KEY,
        "Content-Type": "application/json", "User-Agent": "curl/8.0"}


def pedir(metodo: str, path: str, cuerpo=None, prefer: str | None = None):
    h = dict(HDRS)
    if prefer:
        h["Prefer"] = prefer
    req = urllib.request.Request(
        f"{URL}/rest/v1/{path}",
        data=json.dumps(cuerpo).encode() if cuerpo is not None else None,
        headers=h, method=metodo)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            cuerpo_r = r.read().decode()
            return json.loads(cuerpo_r) if cuerpo_r.strip() else []
    except urllib.error.HTTPError as e:
        print("ERROR HTTP", e.code, e.read().decode()[:300])
        sys.exit(1)


def listar() -> None:
    ejecutando = pedir("GET", "tareas?estado=eq.en_ejecucion&select=task_id,objetivo,intentos")
    cola = pedir("GET", "tareas?estado=eq.recibida&select=task_id,objetivo,prioridad,encolada_en"
                        "&order=prioridad.desc,encolada_en.asc")
    if ejecutando:
        t = ejecutando[0]
        print(f"🔨 EJECUTANDO  {t['task_id']}  (intento {t.get('intentos')})")
        print(f"               {(t.get('objetivo') or '')[:80]}")
    else:
        print("🔨 EJECUTANDO  (nada)")
    print(f"\n📋 EN COLA ({len(cola)})  — orden real de ejecucion:")
    for i, t in enumerate(cola, start=1):
        prio = f"  [prioridad {t['prioridad']}]" if t.get("prioridad") else ""
        print(f"  {i}. {t['task_id']}{prio}\n     {(t.get('objetivo') or '')[:80]}")
    if not cola:
        print("  (vacia)")


def priorizar(task_id: str, n: int) -> None:
    # CAS sobre `recibida`: si la tarea ya arranco, NO se toca (es del worker).
    filas = pedir("PATCH", f"tareas?task_id=eq.{task_id}&estado=eq.recibida",
                  {"prioridad": n, "updated_at": "now()"}, prefer="return=representation")
    if not filas:
        print(f"NO se cambio: '{task_id}' no esta en la cola (¿ya arranco, o no existe?).")
        sys.exit(1)
    print(f"✔ {task_id} → prioridad {n}. Nuevo orden:\n")
    listar()


def cancelar(task_id: str) -> None:
    filas = pedir("PATCH", f"tareas?task_id=eq.{task_id}&estado=eq.recibida",
                  {"estado": "cancelada", "updated_at": "now()"}, prefer="return=representation")
    if not filas:
        print(f"NO se cancelo: '{task_id}' no esta en la cola. Si YA arranco, no se cancela "
              "desde aqui (la fila es del worker: pararia un motor a media faena).")
        sys.exit(1)
    print(f"✔ {task_id} cancelada (no llego a ejecutarse).\n")
    listar()


def main() -> None:
    args = sys.argv[1:]
    cmd = args[0] if args else "list"
    if cmd == "list":
        listar()
    elif cmd == "prioriza" and len(args) >= 2:
        priorizar(args[1], int(args[2]) if len(args) > 2 else 10)
    elif cmd == "cancela" and len(args) >= 2:
        cancelar(args[1])
    else:
        print(__doc__)
        sys.exit(2)


if __name__ == "__main__":
    main()
