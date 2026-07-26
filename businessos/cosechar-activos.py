#!/usr/bin/env python3
"""cosechar-activos.py — cada feature VENDIBLE aprobada se vuelve ACTIVO DIGITAL (módulo act).

Cierra el ciclo del ERP-MAESTRO §4B sobre el trío: DETECTAR → CATALOGAR → REGISTRAR.
Una tarea con `vendible=true` que el Supervisor aprueba se registra en `erp.act_activo`
con su versión (hash de la rama), su costo REAL desde `token_usage.task_id` (tarea +
sub-tareas del enjambre) y su fila en `sis_bitacora`. El merge del PR a master es el
gate humano que la CONCRETA (contrato.py:57: "concretar = gate humano antes").

Invariantes que este job respeta A PROPÓSITO:
  · UN escritor por fila: `tareas` la escribe el Ejecutor; aquí solo se hace el CAS
    legítimo `aprobada → concretada` (estado terminal sin dueño, mismo patrón que
    cola-trio.py). La memoria de flanco vive en ARCHIVO del host, no en columna
    (aviso-cola.py:13-15 explica por qué).
  · Escritura en `erp` SIN service_role (BYPASSRLS anula la RLS): psql con el login
    `cli_fin` (GRANT rol_exe_fin) + `set local role` — cada escritura ejercita los
    grants y la RLS reales (sin DELETE, tenant forzado). Patrón de 004_seguridad.sql.
  · Las DOS decisiones humanas del maestro son comandos con --confirmar (la
    credencial del host ES la autoridad; sin app Slack de ERP-3 no se fingen
    botones): `ratificar` (defensibilidad, D-10) y la capitalización vive en
    exportar-polizas.py (D-07).
  · Todo best-effort IMPRIME (doctrina 2026-07-13: lo silencioso es invisible).

Uso (en el servidor):
  source ~/businessos/.env
  python3 ~/businessos/cosechar-activos.py detectar   [--dry-run]
  python3 ~/businessos/cosechar-activos.py concretar  <task_id> | --auto [--dry-run]
  python3 ~/businessos/cosechar-activos.py ratificar  ACT-0002 --defensibilidad defendible \
      [--actor elisa] --confirmar
  python3 ~/businessos/cosechar-activos.py ajustar    ACT-0002 --componente horas_humanas \
      --monto 120 --fuente "8h de revision de Elisa a $15/h" --confirmar

Cron: detectar cada 10 min; concretar --auto cada 10 min (tras el fetch del repo).
"""
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import date
from pathlib import Path

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
ERP_DB_URL = os.environ.get("ERP_DB_URL", "")
CASA = os.environ.get("ERP_CLIENTE_CASA", "")
CANAL = os.environ.get("SLACK_DEV_CHANNEL", "C0BGL2DMNLB")  # #dep-desarrollo
MEMORIA = Path(os.environ.get("COSECHA_MEMORIA", "/home/hermes/state/cosecha-activos.json"))
REPO = os.environ.get("TRIO_REPO_DIR", "/home/hermes/trio/hermes-os-a2a")
PRICE_CACHE = os.path.join(os.environ.get("HERMES_STATE", os.path.expanduser("~/state")),
                           "openrouter-models.json")
ENV_NEGOCIO = "/home/hermes/businessos/negocio/.hermes/.env"
DRY = "--dry-run" in sys.argv[1:]

_FOLIO_RE = re.compile(r"^ACT-\d{4}$")


# ---------- HTTP a PostgREST (public.*: tareas, token_usage) ----------

def rest(path: str, method: str = "GET", data: dict | None = None,
         prefer: str | None = None) -> tuple[int, list | dict]:
    headers = {"apikey": KEY, "Authorization": "Bearer " + KEY,
               "User-Agent": "curl/8.0",  # Cloudflare 1010 (aprendizaje 2026-07-02)
               "Content-Type": "application/json"}
    if prefer:
        headers["Prefer"] = prefer
    req = urllib.request.Request(
        f"{URL}/rest/v1/{path}", method=method,
        data=json.dumps(data).encode() if data is not None else None, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            cuerpo = r.read()
            return r.status, (json.loads(cuerpo) if cuerpo else [])
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode()[:300]}


# ---------- psql al esquema erp (cli_fin → set local role) ----------

def _sql_str(v: str | None) -> str:
    """Literal SQL seguro para texto libre (objetivo, fuentes): comilla doblada, sin NUL."""
    if v is None:
        return "null"
    return "'" + v.replace("\x00", "").replace("'", "''") + "'"


def erp_sql(cuerpo_sql: str, rol: str = "rol_exe_fin") -> tuple[bool, str]:
    """Corre un bloque en UNA transacción bajo el rol y tenant reales. Devuelve stdout."""
    if not ERP_DB_URL:
        return False, "ERP_DB_URL no definido en el entorno"
    if not CASA:
        return False, "ERP_CLIENTE_CASA no definido en el entorno"
    script = (f"begin;\nset local role {rol};\n"
              f"set local app.cliente_id = '{CASA}';\n{cuerpo_sql}\ncommit;\n")
    r = subprocess.run(["psql", ERP_DB_URL, "-qAt", "-v", "ON_ERROR_STOP=1"],
                       input=script, capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        return False, r.stderr.strip()[:400]
    return True, r.stdout.strip()


def bitacora(verbo: str, entidad_id: str, payload: dict, traza: str,
             resultado: str = "ok", aprobado_por: str | None = None,
             actor: str = "cosechar-activos(host)", actor_tipo: str = "sistema") -> str:
    return (f"insert into erp.sis_bitacora (cliente_id, traza_id, actor, actor_tipo, "
            f"modulo, verbo, entidad_tipo, entidad_id, payload, resultado, aprobado_por) "
            f"values ('{CASA}', '{traza}', {_sql_str(actor)}, '{actor_tipo}', 'act', "
            f"{_sql_str(verbo)}, 'act_activo', {_sql_str(entidad_id)}, "
            f"{_sql_str(json.dumps(payload, ensure_ascii=False)[:2000])}::jsonb, "
            f"'{resultado}', {_sql_str(aprobado_por)});")


# ---------- Slack (mismo patrón que aviso-cola.py) ----------

def token_slack() -> str:
    if os.environ.get("SLACK_BOT_TOKEN"):
        return os.environ["SLACK_BOT_TOKEN"]
    r = subprocess.run(["sudo", "grep", "-m1", "^SLACK_BOT_TOKEN=", ENV_NEGOCIO],
                       capture_output=True, text=True)
    return r.stdout.strip().split("=", 1)[1] if r.returncode == 0 and "=" in r.stdout else ""


def avisar(texto: str) -> bool:
    if DRY:
        print("[dry-run] Slack:", texto.replace("\n", " | ")[:220])
        return True
    tok = token_slack()
    if not tok:
        print("SIN TOKEN de Slack: no se avisa (el registro en BD sí quedó)")
        return False
    req = urllib.request.Request(
        "https://slack.com/api/chat.postMessage",
        data=json.dumps({"channel": CANAL, "text": texto}).encode(),
        headers={"Authorization": f"Bearer {tok}",
                 "Content-type": "application/json; charset=utf-8"})
    try:
        d = json.load(urllib.request.urlopen(req, timeout=30))
    except urllib.error.HTTPError as e:
        print("Slack HTTP", e.code, e.read().decode()[:200])
        return False
    if not d.get("ok"):
        print("Slack error:", d.get("error"))
        return False
    return True


# ---------- costo real desde token_usage ----------

def _precios() -> dict[str, tuple[float, float]]:
    """{id_openrouter: ($/tok_in, $/tok_out)} desde el cache que mantiene
    ingest-token-usage.py. Vacío si no hay cache (se declara en la fuente)."""
    try:
        data = json.load(open(PRICE_CACHE))["data"]
        return {m["id"]: (float((m.get("pricing") or {}).get("prompt", 0) or 0),
                          float((m.get("pricing") or {}).get("completion", 0) or 0))
                for m in data}
    except Exception:  # noqa: BLE001 — sin cache se degrada VISIBLE en la fuente
        return {}


def costo_tarea(task_ids: list[str]) -> dict:
    """Suma el ledger por-tarea. Tokens = autoritativos; costo = declarado con su fuente.

    Gotcha GLM (claude_engine.py:146-151): con z.ai el CLI tarifa Anthropic → costo 0
    o erróneo. Si una fila trae tokens>0 y costo 0, se intenta recalcular con el cache
    de precios de OpenRouter (mismo cache que ingest-token-usage.py); si el modelo no
    está en el cache, el hueco SE DECLARA en la fuente — jamás se inventa.
    """
    ids = ",".join(f'"{t}"' for t in task_ids)
    st, filas = rest(f"token_usage?task_id=in.({urllib.parse.quote(ids)})"
                     f"&select=task_id,modelo,tokens_in,tokens_out,costo_usd")
    if st != 200:
        return {"ok": False, "error": f"token_usage HTTP {st}: {filas}"}
    precios = _precios()
    tin = tout = 0
    monto = 0.0
    recalculadas = sin_precio = 0
    for f in filas:
        fin, fout = int(f.get("tokens_in") or 0), int(f.get("tokens_out") or 0)
        c = float(f.get("costo_usd") or 0)
        tin, tout = tin + fin, tout + fout
        if c == 0 and (fin or fout):
            modelo = (f.get("modelo") or "").lower()
            match = next((k for k in precios if modelo and modelo in k.lower()), None)
            if match:
                c = fin * precios[match][0] + fout * precios[match][1]
                recalculadas += 1
            else:
                sin_precio += 1
        monto += c
    partes = [f"token_usage.task_id de {len(task_ids)} tarea(s), {len(filas)} fila(s) del ledger"]
    if recalculadas:
        partes.append(f"{recalculadas} fila(s) costo-0 recalculadas con cache OpenRouter (gotcha GLM)")
    if sin_precio:
        partes.append(f"{sin_precio} fila(s) costo-0 SIN precio en cache: monto subestimado, tokens completos")
    return {"ok": True, "tokens_in": tin, "tokens_out": tout,
            "monto": round(monto, 2), "filas": len(filas), "fuente": "; ".join(partes)}


def hash_rama(task_id: str) -> str | None:
    for ref in (f"tarea/{task_id}", f"origin/tarea/{task_id}"):
        r = subprocess.run(["git", "-C", REPO, "rev-parse", "--verify", "--quiet", ref],
                           capture_output=True, text=True)
        if r.returncode == 0:
            return r.stdout.strip()
    return None


# ---------- subcomando: detectar ----------

def _memoria() -> dict:
    try:
        return json.loads(MEMORIA.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _guardar_memoria(m: dict) -> None:
    if not DRY:
        MEMORIA.parent.mkdir(parents=True, exist_ok=True)
        MEMORIA.write_text(json.dumps(m, indent=2), encoding="utf-8")


def detectar() -> None:
    st, aprobadas = rest("tareas?estado=eq.aprobada&vendible=is.true"
                         "&select=task_id,objetivo,eje_dei,departamento,updated_at"
                         "&order=updated_at.asc")
    if st != 200:
        sys.exit(f"tareas HTTP {st}: {aprobadas}")
    visto = _memoria()
    nuevas = [t for t in aprobadas if visto.get(t["task_id"]) not in ("cosechada", "concretada")]
    print(f"{len(aprobadas)} aprobadas vendibles; {len(nuevas)} sin cosechar")
    for t in nuevas:
        tid, eje = t["task_id"], t["eje_dei"]
        if eje == "operacion":
            # Defensa en profundidad (el contrato y el CHECK ya lo impiden): se avisa, no se cosecha.
            print(f"AVISO {tid}: vendible con eje 'operacion' burló el contrato — NO se cosecha")
            continue
        # Idempotencia contra BD (la memoria puede perderse): ¿ya existe el activo?
        ok, existente = erp_sql(
            f"select folio from erp.act_activo where origen_task_id = {_sql_str(tid)};", "rol_swm")
        if ok and existente:
            print(f"{tid}: ya cosechada como {existente} (memoria repuesta)")
            visto[tid] = "cosechada"
            continue
        # Sub-tareas del enjambre: el gasto de las hijas es parte del costo del activo.
        st2, hijas = rest(f"tareas?parent_id=eq.{urllib.parse.quote(tid)}&select=task_id")
        ids = [tid] + [h["task_id"] for h in (hijas if st2 == 200 else [])]
        costo = costo_tarea(ids)
        if not costo.get("ok"):
            print(f"{tid}: costo irrecuperable ({costo.get('error')}) — se reintenta en la próxima corrida")
            continue
        h = hash_rama(tid)
        objetivo = (t.get("objetivo") or "")[:200]
        traza = str(uuid.uuid4())
        if DRY:
            print(f"[dry-run] {tid}: alta act_activo eje={eje} tokens={costo['tokens_in']}/"
                  f"{costo['tokens_out']} monto=${costo['monto']} hash={h and h[:9]}")
            continue
        sql = f"""
with folio as (select erp.siguiente_folio('{CASA}'::uuid, 'ACT') as f),
alta as (
  insert into erp.act_activo (cliente_id, folio, nombre, tipo, descripcion, ubicacion,
                              hash_vigente, version_vigente, responsable, eje_dei,
                              origen_task_id)
  select '{CASA}', f.f, {_sql_str(objetivo)}, 'software',
         {_sql_str(f"Cosechada de la tarea {tid} (depto {t.get('departamento')})")},
         {_sql_str(f"rama tarea/{tid} en {REPO}")},
         {_sql_str(h)}, 'v1', 'dep-desarrollo', {_sql_str(eje)}, {_sql_str(tid)}
  from folio f returning id, folio
),
ver as (
  insert into erp.act_version (cliente_id, activo_id, version, hash, origen, origen_task_id)
  select '{CASA}', id, 'v1', {_sql_str(h)}, {_sql_str(f"tarea:{tid}")}, {_sql_str(tid)}
  from alta returning activo_id
),
costo as (
  insert into erp.act_costo (cliente_id, activo_id, componente, monto, eje_dei,
                             origen_task_id, tokens_in, tokens_out, fuente)
  select '{CASA}', id, 'tokens', {costo['monto']}, {_sql_str(eje)}, {_sql_str(tid)},
         {costo['tokens_in']}, {costo['tokens_out']}, {_sql_str(costo['fuente'])}
  from alta returning activo_id
)
select folio from alta;"""
        ok, salida = erp_sql(sql)
        if not ok:
            print(f"{tid}: FALLO el alta en erp — {salida}")
            continue
        folio = salida.splitlines()[-1].strip()
        okb, sb = erp_sql(bitacora("registrar", folio,
                                   {"task_id": tid, "eje_dei": eje, "monto": costo["monto"],
                                    "tokens": [costo["tokens_in"], costo["tokens_out"]]}, traza))
        if not okb:
            print(f"{tid}: activo {folio} registrado pero bitácora FALLÓ — {sb}")
        visto[tid] = "cosechada"
        print(f"{tid} → {folio} (${costo['monto']}, {costo['tokens_in']}/{costo['tokens_out']} tok)")
        avisar(f"📦 *{folio}* cosechado de `{tid}` — _{objetivo[:100]}_\n"
               f"Costo tokens: ${costo['monto']} ({costo['filas']} filas del ledger). "
               f"Defensibilidad: *propuesta* (reemplazable por default).\n"
               f"Ratificar: `ssh hetzner 'source ~/businessos/.env && python3 "
               f"~/businessos/cosechar-activos.py ratificar {folio} "
               f"--defensibilidad defendible|reemplazable --confirmar'`\n"
               f"Al mergear el PR de `tarea/{tid}`, `concretar --auto` cierra el ciclo.")
    _guardar_memoria(visto)


# ---------- subcomando: concretar ----------

def _mergeada_a_master(tid: str) -> bool:
    subprocess.run(["git", "-C", REPO, "fetch", "origin", "master", "--quiet"],
                   capture_output=True, timeout=60)
    h = hash_rama(tid)
    if not h:
        return False
    r = subprocess.run(["git", "-C", REPO, "merge-base", "--is-ancestor", h, "origin/master"],
                       capture_output=True)
    return r.returncode == 0


def concretar(argv: list[str]) -> None:
    visto = _memoria()
    if "--auto" in argv:
        objetivos = [tid for tid, e in visto.items() if e == "cosechada"]
    else:
        pos = [a for a in argv if not a.startswith("-")]
        if not pos:
            sys.exit("uso: concretar <task_id> | --auto")
        objetivos = pos
    print(f"{len(objetivos)} candidata(s) a concretar")
    for tid in objetivos:
        ok, folio = erp_sql(
            f"select folio from erp.act_activo where origen_task_id = {_sql_str(tid)};", "rol_swm")
        if not (ok and folio):
            print(f"{tid}: sin activo registrado — primero `detectar` (no se concreta)")
            continue
        if not _mergeada_a_master(tid):
            print(f"{tid}: la rama tarea/{tid} NO está mergeada a master — el gate humano manda")
            continue
        if DRY:
            print(f"[dry-run] {tid}: CAS aprobada→concretada")
            continue
        # CAS legítimo (patrón cola-trio.py): solo transiciona si SIGUE en 'aprobada'.
        st, res = rest(f"tareas?task_id=eq.{urllib.parse.quote(tid)}&estado=eq.aprobada",
                       "PATCH", {"estado": "concretada", "updated_at": "now()"},
                       prefer="return=representation")
        if st not in (200, 201) or not res:
            print(f"{tid}: CAS no aplicó (¿ya no estaba en 'aprobada'?) HTTP {st}")
            continue
        traza = str(uuid.uuid4())
        okb, sb = erp_sql(bitacora("concretar", folio, {"task_id": tid,
                                                        "gate": "rama mergeada a master"}, traza))
        if not okb:
            print(f"{tid}: concretada pero bitácora FALLÓ — {sb}")
        visto[tid] = "concretada"
        print(f"{tid} → concretada ({folio})")
        avisar(f"🏁 `{tid}` *concretada*: la rama está en master y el activo {folio} "
               f"queda vigente en el inventario (estatus contable: pendiente de póliza).")
    _guardar_memoria(visto)


# ---------- subcomandos humanos: ratificar / ajustar ----------

def _flag(argv: list[str], nombre: str) -> str | None:
    return argv[argv.index(nombre) + 1] if nombre in argv and argv.index(nombre) + 1 < len(argv) else None


def ratificar(argv: list[str]) -> None:
    folio = next((a for a in argv if _FOLIO_RE.match(a)), None)
    defe = _flag(argv, "--defensibilidad")
    actor = _flag(argv, "--actor") or "elisa(host)"
    if not folio or defe not in ("defendible", "reemplazable"):
        sys.exit("uso: ratificar ACT-NNNN --defensibilidad defendible|reemplazable "
                 "[--actor quien] --confirmar")
    if "--confirmar" not in argv:
        print(f"[sin --confirmar] ratificaría {folio} como {defe} (actor {actor}); no se escribe")
        return
    traza = str(uuid.uuid4())
    ok, salida = erp_sql(
        f"update erp.act_activo set defensibilidad = {_sql_str(defe)}, "
        f"defensibilidad_estado = 'ratificada', ratificado_por = {_sql_str(actor)}, "
        f"ratificado_at = now(), updated_at = now() "
        f"where folio = {_sql_str(folio)} returning folio;\n"
        + bitacora("ratificar", folio, {"defensibilidad": defe}, traza,
                   aprobado_por=actor, actor=actor, actor_tipo="humano"))
    if not ok or folio not in salida:
        sys.exit(f"ratificar FALLÓ: {salida or 'folio inexistente en este tenant'}")
    print(f"{folio} ratificado: {defe} (por {actor})")
    if defe == "defendible":
        print(f"RECORDATORIO: un defendible exige expediente en act_proteccion "
              f"(mecanismo + medidas demostrables) — ERP-MAESTRO §4B paso 6.")


def ajustar(argv: list[str]) -> None:
    folio = next((a for a in argv if _FOLIO_RE.match(a)), None)
    comp = _flag(argv, "--componente")
    monto = _flag(argv, "--monto")
    fuente = _flag(argv, "--fuente")
    if not folio or comp not in ("horas_humanas", "infraestructura") or not monto or not fuente:
        sys.exit("uso: ajustar ACT-NNNN --componente horas_humanas|infraestructura "
                 "--monto N --fuente \"...\" --confirmar")
    try:
        monto_f = round(float(monto), 2)
        assert monto_f >= 0
    except (ValueError, AssertionError):
        sys.exit("--monto debe ser un número >= 0")
    if "--confirmar" not in argv:
        print(f"[sin --confirmar] sumaría ${monto_f} ({comp}) a {folio}; no se escribe")
        return
    traza = str(uuid.uuid4())
    ok, salida = erp_sql(
        f"insert into erp.act_costo (cliente_id, activo_id, componente, monto, eje_dei, fuente, periodo) "
        f"select '{CASA}', id, {_sql_str(comp)}, {monto_f}, eje_dei, {_sql_str(fuente)}, "
        f"'{date.today().replace(day=1).isoformat()}' "
        f"from erp.act_activo where folio = {_sql_str(folio)} returning activo_id;\n"
        + bitacora("ajustar", folio, {"componente": comp, "monto": monto_f, "fuente": fuente},
                   traza, aprobado_por="elisa(host)", actor="elisa(host)", actor_tipo="humano"))
    if not ok or not salida:
        sys.exit(f"ajustar FALLÓ: {salida or 'folio inexistente en este tenant'}")
    print(f"{folio}: +${monto_f} ({comp}) — el trigger recalculó costo_acumulado")


def main() -> None:
    argv = sys.argv[1:]
    sub = argv[0] if argv else ""
    if sub == "detectar":
        detectar()
    elif sub == "concretar":
        concretar(argv[1:])
    elif sub == "ratificar":
        ratificar(argv[1:])
    elif sub == "ajustar":
        ajustar(argv[1:])
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
