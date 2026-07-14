#!/usr/bin/env python3
"""Sync bidireccional Todoist <-> Board (tasks), GATED por un label.

El modelo:
- Solo se sincronizan tareas que tienen el label gate (TODOIST_SYNC_LABEL,
  default "business-os") en cualquiera de los dos lados. El label es el
  interruptor: sin label, la tarea vive solo en su sistema de origen.
- Board -> Todoist: tareas activas con el label -> Todoist (proyecto
  TODOIST_PROJECT_NAME). Mapea titulo, priority 1-4, labels y due.
- Todoist -> Board: tareas con @<gate> -> board (asignadas al owner).
- Completar en cualquier lado marca done en el otro.
- El link vive en dos lugares: tasks.todoist_id en la BD y un marcador
  "mc:<uuid>" en la descripcion del task de Todoist (belt & suspenders).

Idempotente. Pensado para correr cada pocos minutos (launchd/cron —
ver com.businessos.todoist-sync.plist en este directorio).

Config por variables de entorno:
  TODOIST_API_TOKEN          Token de la API de Todoist (Settings > Integrations)
  NEXT_PUBLIC_SUPABASE_URL   URL del proyecto Supabase de la app
  SUPABASE_SERVICE_ROLE_KEY  Service-role key (server-side, nunca en el cliente)
  OWNER_PROFILE_ID           UUID del profile del owner (asignee de las tareas nuevas)
  TODOIST_SYNC_LABEL         Label gate (default: business-os)
  TODOIST_PROJECT_NAME       Proyecto Todoist destino (default: Business OS)
"""
import os, json, re, urllib.request, urllib.parse

GATE = os.environ.get("TODOIST_SYNC_LABEL", "business-os")
OWNER = os.environ.get("OWNER_PROFILE_ID", "")
MC_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
TOK = os.environ.get("TODOIST_API_TOKEN", "")
SVC = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
TD = "https://api.todoist.com/api/v1"
ACTIVE = {"todo", "in_progress", "review", "backlog"}  # status del board considerados activos
DEFAULT_PROJECT_NAME = os.environ.get("TODOIST_PROJECT_NAME", "Business OS")

if not (TOK and MC_URL and SVC):
    raise SystemExit(
        "Config incompleta: exporta TODOIST_API_TOKEN, NEXT_PUBLIC_SUPABASE_URL y "
        "SUPABASE_SERVICE_ROLE_KEY (ver README, seccion Todoist)."
    )


def _req(url, method="GET", headers=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            t = resp.read().decode()
            return resp.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        return e.code, (e.read().decode()[:300])


def td(method, path, body=None):
    h = {"Authorization": f"Bearer {TOK}", "Content-Type": "application/json"}
    return _req(f"{TD}{path}", method, h, body)


def mc(method, path, body=None, prefer=None):
    h = {"apikey": SVC, "Authorization": f"Bearer {SVC}", "Content-Type": "application/json"}
    if prefer: h["Prefer"] = prefer
    return _req(f"{MC_URL}/rest/v1{path}", method, h, body)


# ---------- priority / due mapping ----------
def to_td_priority(mc_pri):
    p = mc_pri if isinstance(mc_pri, int) else 1
    return max(1, min(4, p or 1))


def to_mc_priority(td_pri):
    return max(1, min(4, td_pri or 1))


def mc_due_to_td(due_at):
    if not due_at: return None
    return {"due_datetime": due_at.replace("Z", "")[:19]}


def td_due_to_mc(due):
    if not due: return None
    if due.get("datetime"): return due["datetime"]
    if due.get("date"): return due["date"] + "T12:00:00"
    return None


# ---------- helpers board ----------
def mc_get_synced_tasks():
    st, rows = mc("GET", f"/task_labels?select=task_id&label_id=eq.{BOS_LABEL_ID}")
    ids = [r["task_id"] for r in (rows or [])]
    if not ids: return []
    inlist = "(" + ",".join(ids) + ")"
    st, tasks = mc("GET", f"/tasks?select=id,title,description,status,priority,due_at,todoist_id&id=in.{inlist}")
    out = []
    for t in (tasks or []):
        st2, tl = mc("GET", f"/task_labels?select=labels(name)&task_id=eq.{t['id']}")
        t["label_names"] = [x["labels"]["name"] for x in (tl or []) if x.get("labels")]
        out.append(t)
    return out


def mc_label_id(name):
    st, rows = mc("GET", f"/labels?select=id&name=eq.{urllib.parse.quote(name)}")
    if rows: return rows[0]["id"]
    st, created = mc("POST", "/labels", {"name": name, "color": "#8C27F1", "tenant_id": "default"}, prefer="return=representation")
    return created[0]["id"] if created else None


def mc_create_task(td_task):
    due_at = td_due_to_mc(td_task.get("due"))
    desc = re.sub(r"\s*mc:[0-9a-f-]{36}\s*", "", td_task.get("description") or "").strip()
    body = {
        "title": td_task["content"],
        "description": desc,
        "status": "todo",
        "priority": to_mc_priority(td_task.get("priority", 1)),
        "due_at": due_at,
        "todoist_id": td_task["id"],
    }
    st, created = mc("POST", "/tasks", body, prefer="return=representation")
    if not created: return None
    tid = created[0]["id"]
    if OWNER:
        mc("POST", "/task_assignees", {"task_id": tid, "profile_id": OWNER})
    names = set(td_task.get("labels", [])) | {GATE}
    for n in names:
        lid = mc_label_id(n)
        if lid: mc("POST", "/task_labels", {"task_id": tid, "label_id": lid})
    return tid


def mc_update_from_td(mc_task, td_task):
    due_at = td_due_to_mc(td_task.get("due"))
    patch = {
        "title": td_task["content"],
        "priority": to_mc_priority(td_task.get("priority", 1)),
        "due_at": due_at,
    }
    mc("PATCH", f"/tasks?id=eq.{mc_task['id']}", patch)


# ---------- helpers Todoist ----------
def td_get_synced():
    # El param ?filter=@label de la API v1 NO funciona (se ignora). Traemos todas
    # las activas (paginado) y filtramos del lado cliente por el array de labels.
    out, cursor = [], None
    while True:
        path = "/tasks?limit=200" + (f"&cursor={urllib.parse.quote(cursor)}" if cursor else "")
        st, res = td("GET", path)
        if not isinstance(res, dict): break
        out += res.get("results", [])
        cursor = res.get("next_cursor")
        if not cursor: break
    return [t for t in out if GATE in (t.get("labels") or [])]


def td_create_from_mc(mc_task):
    labels = list(set(mc_task.get("label_names", [])) | {GATE})
    body = {
        "content": mc_task["title"],
        "description": f"mc:{mc_task['id']}",
        "project_id": PROJECT_ID,
        "labels": labels,
        "priority": to_td_priority(mc_task.get("priority")),
    }
    d = mc_due_to_td(mc_task.get("due_at"))
    if d: body.update(d)
    st, created = td("POST", "/tasks", body)
    return created["id"] if isinstance(created, dict) and created.get("id") else None


def td_update_from_mc(td_id, mc_task):
    labels = list(set(mc_task.get("label_names", [])) | {GATE})
    body = {
        "content": mc_task["title"],
        "labels": labels,
        "priority": to_td_priority(mc_task.get("priority")),
    }
    d = mc_due_to_td(mc_task.get("due_at"))
    if d: body.update(d)
    td("POST", f"/tasks/{td_id}", body)


# ---------- main reconcile ----------
def main():
    global BOS_LABEL_ID, PROJECT_ID
    st, projs = td("GET", "/projects")
    plist = projs.get("results", []) if isinstance(projs, dict) else (projs or [])
    pid = next((p["id"] for p in plist if p["name"] == DEFAULT_PROJECT_NAME), None)
    if not pid:
        st, p = td("POST", "/projects", {"name": DEFAULT_PROJECT_NAME, "color": "orange"})
        pid = p["id"]
    PROJECT_ID = pid
    BOS_LABEL_ID = mc_label_id(GATE)

    log = {"mc_to_td_created": 0, "mc_to_td_updated": 0, "mc_to_td_closed": 0,
           "td_to_mc_created": 0, "td_to_mc_updated": 0, "completed_td_to_mc": 0}

    mc_tasks = mc_get_synced_tasks()
    td_tasks = td_get_synced()
    td_by_id = {t["id"]: t for t in td_tasks}
    active_td_ids = set(td_by_id.keys())
    td_mc_link = {}
    for t in td_tasks:
        m = re.search(r"mc:([0-9a-f-]{36})", t.get("description") or "")
        if m: td_mc_link[m.group(1)] = t["id"]
    mc_by_id = {t["id"]: t for t in mc_tasks}
    mc_by_tdid = {t["todoist_id"]: t for t in mc_tasks if t.get("todoist_id")}

    # ---- Board -> Todoist ----
    for t in mc_tasks:
        active = t["status"] in ACTIVE
        tid = t.get("todoist_id")
        if active:
            if not tid:
                tid = td_mc_link.get(t["id"])
                if tid:
                    mc("PATCH", f"/tasks?id=eq.{t['id']}", {"todoist_id": tid})
                else:
                    new = td_create_from_mc(t)
                    if new:
                        mc("PATCH", f"/tasks?id=eq.{t['id']}", {"todoist_id": new})
                        log["mc_to_td_created"] += 1
            elif tid in active_td_ids:
                td_update_from_mc(tid, t)
                log["mc_to_td_updated"] += 1
        else:  # done/archived en el board -> cerrar en Todoist
            if tid and tid in active_td_ids:
                td("POST", f"/tasks/{tid}/close")
                log["mc_to_td_closed"] += 1

    # ---- Todoist -> Board ----
    for t in td_tasks:
        linked_mc = None
        m = re.search(r"mc:([0-9a-f-]{36})", t.get("description") or "")
        if m and m.group(1) in mc_by_id: linked_mc = mc_by_id[m.group(1)]
        if not linked_mc and t["id"] in mc_by_tdid: linked_mc = mc_by_tdid[t["id"]]
        if not linked_mc:
            newid = mc_create_task(t)
            if newid:
                desc = (t.get("description") or "").strip()
                desc = (desc + f"\nmc:{newid}").strip() if "mc:" not in desc else desc
                td("POST", f"/tasks/{t['id']}", {"description": desc})
                log["td_to_mc_created"] += 1
        else:
            if linked_mc["status"] in ACTIVE:
                mc_update_from_td(linked_mc, t)
                log["td_to_mc_updated"] += 1

    # ---- completions Todoist -> Board ----
    # Un task no aparece en la lista activa por 3 razones: completado, borrado,
    # o le quitaron el label. GET para distinguir (cerrado = 200 + checked:true).
    for t in mc_tasks:
        tid = t.get("todoist_id")
        if tid and t["status"] in ACTIVE and tid not in active_td_ids:
            st, task = td("GET", f"/tasks/{tid}")
            if st == 404 or (isinstance(task, dict) and (task.get("checked") or task.get("is_deleted"))):
                mc("PATCH", f"/tasks?id=eq.{t['id']}", {"status": "done"})
                log["completed_td_to_mc"] += 1
            elif isinstance(task, dict) and GATE not in (task.get("labels") or []):
                # le quitaron el label gate en Todoist -> dejar de sincronizar
                mc("PATCH", f"/tasks?id=eq.{t['id']}", {"todoist_id": None})
                log["unlinked"] = log.get("unlinked", 0) + 1

    print(json.dumps(log))


if __name__ == "__main__":
    main()
