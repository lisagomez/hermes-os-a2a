#!/usr/bin/env python3
"""detector-swm-act.py — el detector de activos del ERP (swm-act, ERP-MAESTRO §4B paso 3).

PROPONE, NO CATALOGA. Conecta a la BD con `set local role rol_swm` (solo SELECT —
la prueba estructural de que no puede escribir es parte del gate de esta fase) y
compara las FUENTES REALES contra `erp.act_activo`:

  · archivos de `businessos/erp/{bin,reglas,packs,migrations}` (sha256)
  · CLIs impresos según el ÍNDICE versionado `cli-library-index.json` (la librería
    de binarios solo existe en la máquina que imprime — doctrina cli-audit 2026-07-12:
    el índice viaja en el repo, que es donde este job corre)
  · activos catalogados con origen en ramas del trío (deriva de hash / rama borrada)

Hallazgos (mismo vocabulario del maestro):
  NUEVO    — existe en la fuente y no está catalogado
  CAMBIADO — el hash de la fuente difiere del hash_vigente catalogado
  HUÉRFANO — catalogado (estado=activo) pero ya no existe en la fuente

Para cada hallazgo PROPONE clasificación con heurísticas declaradas (eje por origen,
defensibilidad por ubicación — D-12; hoy sin repos separados TODO se propone
'reemplazable' y se dice). La escritura la hace el cosechador/humano, jamás este job.

Salida: stdout + ~/state/hallazgos-swm-act.jsonl (append, una corrida por línea) +
resumen a Slack. Cadencia: semanal + al cierre de fase (D-09).

Uso:  cd ~/repo/businessos && set -a && . ./.env && set +a && python3 detector-swm-act.py [--dry-run]
"""
import hashlib
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ERP_DB_URL = os.environ.get("ERP_DB_URL", "")
CASA = os.environ.get("ERP_CLIENTE_CASA", "")
CANAL = os.environ.get("SLACK_DEV_CHANNEL", "C0BGL2DMNLB")
REPO_BUSINESSOS = Path(os.environ.get("REPO_BUSINESSOS", "/home/hermes/repo/businessos"))
REPO_TRIO = os.environ.get("TRIO_REPO_DIR", "/home/hermes/trio/hermes-os-a2a")
SALIDA = Path(os.environ.get("SWM_ACT_SALIDA", "/home/hermes/state/hallazgos-swm-act.jsonl"))
ENV_NEGOCIO = "/home/hermes/businessos/negocio/.hermes/.env"
DRY = "--dry-run" in sys.argv[1:]

DIRS_ERP = ("erp/bin", "erp/reglas", "erp/packs", "erp/migrations")


def sql_lectura(consulta: str) -> tuple[bool, list[str]]:
    """SELECT bajo rol_swm (cero escritura posible: el rol no tiene ni INSERT)."""
    if not (ERP_DB_URL and CASA):
        return False, ["ERP_DB_URL/ERP_CLIENTE_CASA no definidos"]
    script = (f"begin;\nset local role rol_swm;\n"
              f"set local app.cliente_id = '{CASA}';\n{consulta}\ncommit;\n")
    r = subprocess.run(["psql", ERP_DB_URL, "-qAt", "-v", "ON_ERROR_STOP=1"],
                       input=script, capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        return False, [r.stderr.strip()[:300]]
    return True, [l for l in r.stdout.splitlines() if l.strip()]


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    h.update(p.read_bytes())
    return h.hexdigest()


def catalogo() -> dict[str, dict]:
    """{ubicacion: {folio, hash, estado}} de act_activo del tenant de la casa."""
    ok, filas = sql_lectura(
        "select folio || '|' || coalesce(hash_vigente,'') || '|' || estado || '|' || ubicacion "
        "from erp.act_activo;")
    if not ok:
        sys.exit(f"catálogo ilegible: {filas}")
    out = {}
    for f in filas:
        folio, h, estado, ubic = f.split("|", 3)
        out[ubic] = {"folio": folio, "hash": h, "estado": estado}
    return out


def escanear_erp_dirs(cat: dict[str, dict]) -> list[dict]:
    hallazgos = []
    vistos: set[str] = set()
    for d in DIRS_ERP:
        base = REPO_BUSINESSOS / d
        if not base.is_dir():
            continue
        for p in sorted(base.rglob("*")):
            if not p.is_file() or p.name.startswith("."):
                continue
            ubic = f"businessos/{p.relative_to(REPO_BUSINESSOS)}"
            vistos.add(ubic)
            h = sha256(p)
            reg = cat.get(ubic)
            if reg is None:
                hallazgos.append({
                    "tipo": "NUEVO", "ubicacion": ubic, "hash": h,
                    "propuesta": {"tipo_activo": "documento" if p.suffix in (".md", ".sql") else "software",
                                  "eje_dei": "desarrollo",
                                  "defensibilidad": "reemplazable",
                                  "nota": "heurística D-12 sin repos separados: se propone "
                                          "reemplazable; la confirmación es humana"}})
            elif reg["estado"] == "activo" and reg["hash"] and reg["hash"] != h:
                hallazgos.append({"tipo": "CAMBIADO", "ubicacion": ubic,
                                  "folio": reg["folio"], "hash_catalogo": reg["hash"],
                                  "hash_fuente": h})
    # HUÉRFANOS de estos directorios: catalogado activo cuyo archivo ya no existe.
    for ubic, reg in cat.items():
        if reg["estado"] != "activo":
            continue
        if any(ubic.startswith(f"businessos/{d}/") for d in DIRS_ERP) and ubic not in vistos:
            hallazgos.append({"tipo": "HUERFANO", "ubicacion": ubic, "folio": reg["folio"]})
    return hallazgos


def escanear_clis(cat: dict[str, dict]) -> list[dict]:
    """CLIs impresos según el índice del repo. Fuente declarada: índice, no librería."""
    idx = REPO_BUSINESSOS / "cli-library-index.json"
    if not idx.is_file():
        return []
    try:
        impresos = json.loads(idx.read_text()).get("impresos") or {}
    except json.JSONDecodeError:
        print("AVISO: cli-library-index.json ilegible — se omite (no se adivina)")
        return []
    hallazgos = []
    for slug in impresos:
        ubic = f"cli:{slug}"
        if ubic not in cat:
            hallazgos.append({
                "tipo": "NUEVO", "ubicacion": ubic,
                "propuesta": {"tipo_activo": "software", "eje_dei": "desarrollo",
                              "defensibilidad": "reemplazable",
                              "nota": "CLI genérico (§1.7 explícito: reemplazable); "
                                      "fuente: índice versionado, no la librería"}})
    for ubic, reg in cat.items():
        if reg["estado"] == "activo" and ubic.startswith("cli:") and ubic[4:] not in impresos:
            hallazgos.append({"tipo": "HUERFANO", "ubicacion": ubic, "folio": reg["folio"]})
    return hallazgos


def escanear_ramas() -> list[dict]:
    """Activos cosechados de tareas: rama borrada tras merge NO es huérfano (el
    activo vive en master); solo se reporta deriva si la rama EXISTE con otro hash."""
    ok, filas = sql_lectura(
        "select folio || '|' || coalesce(origen_task_id,'') || '|' || coalesce(hash_vigente,'') "
        "from erp.act_activo where origen_task_id is not null and estado = 'activo';")
    if not ok:
        return []
    hallazgos = []
    for f in filas:
        folio, tid, h = f.split("|", 2)
        r = subprocess.run(["git", "-C", REPO_TRIO, "rev-parse", "--verify", "--quiet",
                            f"tarea/{tid}"], capture_output=True, text=True)
        if r.returncode == 0 and h and r.stdout.strip() != h:
            hallazgos.append({"tipo": "CAMBIADO", "ubicacion": f"rama tarea/{tid}",
                              "folio": folio, "hash_catalogo": h,
                              "hash_fuente": r.stdout.strip(),
                              "nota": "la rama siguió moviéndose tras la cosecha"})
    return hallazgos


def avisar(texto: str) -> None:
    if DRY:
        print("[dry-run] Slack:", texto.replace("\n", " | ")[:200])
        return
    tok = os.environ.get("SLACK_BOT_TOKEN", "")
    if not tok:
        r = subprocess.run(["sudo", "grep", "-m1", "^SLACK_BOT_TOKEN=", ENV_NEGOCIO],
                           capture_output=True, text=True)
        tok = r.stdout.strip().split("=", 1)[1] if r.returncode == 0 and "=" in r.stdout else ""
    if not tok:
        print("SIN TOKEN de Slack: el reporte queda en stdout/jsonl")
        return
    req = urllib.request.Request(
        "https://slack.com/api/chat.postMessage",
        data=json.dumps({"channel": CANAL, "text": texto}).encode(),
        headers={"Authorization": f"Bearer {tok}",
                 "Content-type": "application/json; charset=utf-8"})
    try:
        d = json.load(urllib.request.urlopen(req, timeout=30))
        if not d.get("ok"):
            print("Slack error:", d.get("error"))
    except urllib.error.HTTPError as e:
        print("Slack HTTP", e.code)


def main() -> None:
    cat = catalogo()
    hallazgos = escanear_erp_dirs(cat) + escanear_clis(cat) + escanear_ramas()
    corrida = {"corrida": datetime.now(timezone.utc).isoformat(timespec="seconds"),
               "catalogados": len(cat), "hallazgos": hallazgos}
    for h in hallazgos:
        print(f"{h['tipo']:9s} {h['ubicacion']}" + (f" ({h.get('folio')})" if h.get("folio") else ""))
    print(f"{len(hallazgos)} hallazgo(s) sobre {len(cat)} activo(s) catalogados")
    if not DRY:
        SALIDA.parent.mkdir(parents=True, exist_ok=True)
        with SALIDA.open("a", encoding="utf-8") as f:
            f.write(json.dumps(corrida, ensure_ascii=False) + "\n")
    if hallazgos:
        lineas = "\n".join(f"• {h['tipo']}: `{h['ubicacion']}`" for h in hallazgos[:10])
        extra = f"\n(+{len(hallazgos) - 10} más en el jsonl)" if len(hallazgos) > 10 else ""
        avisar(f"🔎 *swm-act* — {len(hallazgos)} hallazgo(s) del detector de activos "
               f"(propone, no cataloga):\n{lineas}{extra}\n"
               f"Catalogar: `cosechar-activos.py` / alta manual con ratificación humana.")


if __name__ == "__main__":
    main()
