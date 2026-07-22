#!/usr/bin/env python3
"""Snapshot de proyectos de clientes -> lo lee el bot de la vertical CLIENTES.

El control de clientes/proyectos vive en el repo (businessos/activos-clientes/:
CLIENTE.md, PROYECTO.md, activos.jsonl) y lo escribe Claude Code en dev. El bot
de clientes no tiene el repo ni credenciales: este job de confianza del HOST
deja el estado ya resuelto en su volumen y el bot solo LO LEE (mismo patron que
tareas.json / presupuesto.json / cli-audit.json).

Insumo: el ref `origin/master` del repo local (el cron del servidor hace fetch
cada 5 min), NO el working tree — asi la frescura no depende de ningun pull.
Fallback --worktree para probar en dev contra el arbol de trabajo.

Uso:
    python3 businessos/snapshot-proyectos.py              # origin/master (servidor)
    python3 businessos/snapshot-proyectos.py --worktree   # arbol de trabajo (dev)

Si la vertical clientes viviera en otra maquina: PROYECTOS_SSH_HOST=hermes@<host>
(leccion de los host-jobs huerfanos tras la migracion, 2026-07-11).
"""
import datetime
import json
import os
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent          # raiz del repo git
BASE = "businessos/activos-clientes"
CONTENEDOR = os.environ.get("PROYECTOS_CONTENEDOR", "hermes-clientes")
DESTINO = "/opt/data/workspace/proyectos.json"
LOCAL_SNAPSHOT = Path("/tmp/proyectos.json")


def _git(*args: str) -> str:
    r = subprocess.run(["git", "-C", str(REPO), *args],
                       capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)}: {r.stderr.strip()}")
    return r.stdout


class Fuente:
    """Lee archivos de origin/master (git show) o del working tree."""

    def __init__(self, worktree: bool):
        self.worktree = worktree
        if worktree:
            self.ref = "worktree"
        else:
            self.ref = "origin/master@" + _git("rev-parse", "--short", "origin/master").strip()

    def listar(self) -> list[str]:
        if self.worktree:
            base = REPO / BASE
            return [str(p.relative_to(REPO)) for p in base.rglob("*") if p.is_file()]
        out = _git("ls-tree", "-r", "--name-only", "origin/master", "--", BASE)
        return [l for l in out.splitlines() if l.strip()]

    def leer(self, path: str) -> str:
        if self.worktree:
            return (REPO / path).read_text(encoding="utf-8")
        return _git("show", f"origin/master:{path}")


def filas_tabla(md: str) -> list[list[str]]:
    """Todas las filas de tablas markdown (sin encabezados ni separadores)."""
    filas = []
    for linea in md.splitlines():
        if not linea.strip().startswith("|"):
            continue
        celdas = [c.strip() for c in linea.strip().strip("|").split("|")]
        if celdas and not all(re.fullmatch(r":?-{2,}:?", c or "-") for c in celdas):
            filas.append(celdas)
    return filas


def campo(filas: list[list[str]], clave: str) -> str:
    """Valor de una tabla clave-valor buscando por substring en la 1a celda."""
    for f in filas:
        if len(f) >= 2 and clave.lower() in re.sub(r"\*", "", f[0]).lower():
            return re.sub(r"[`*]", "", f[1]).strip()
    return ""


def parse_proyecto(md: str, slug: str) -> dict:
    filas = filas_tabla(md)
    hitos = [f for f in filas if len(f) >= 4 and re.fullmatch(r"\d+", f[0] or "")]
    entregables = [f for f in filas if len(f) >= 4 and re.match(r"[A-Z]{3,}-\d+", f[0] or "")]
    m = re.search(r"^# PROYECTO — (.+?)(?:·|$)", md, re.M)
    return {
        "slug": slug,
        "nombre": (m.group(1).strip() if m else slug),
        "estado": campo(filas, "estado"),
        "servicios": campo(filas, "servicios"),
        "inicio": campo(filas, "inicio"),
        "presupuesto_tokens": campo(filas, "presupuesto"),
        "hitos": [{"hito": h[1], "estado": h[3] if len(h) > 3 else ""} for h in hitos],
        "entregables": [{"id": e[0], "descripcion": e[1], "estado": e[3] if len(e) > 3 else ""}
                        for e in entregables],
    }


def parse_cliente(fuente: Fuente, slug: str, paths: list[str]) -> dict:
    ficha_path = f"{BASE}/{slug}/CLIENTE.md"
    cliente: dict = {"cliente_id": slug, "proyectos": [], "activos": {}}
    if ficha_path in paths:
        md = fuente.leer(ficha_path)
        filas = filas_tabla(md)
        m = re.search(r"^# CLIENTE — (.+)$", md, re.M)
        cliente.update({
            "nombre": (m.group(1).strip() if m else slug),
            "estado": campo(filas, "estado"),
            "industria": campo(filas, "industria"),
            "prefijo_activos": campo(filas, "prefijo"),
        })
    else:
        cliente["nota"] = "sin CLIENTE.md"

    for p in paths:
        m = re.fullmatch(rf"{re.escape(BASE)}/{re.escape(slug)}/proyectos/([^/]+)/PROYECTO\.md", p)
        if m:
            cliente["proyectos"].append(parse_proyecto(fuente.leer(p), m.group(1)))

    ledger_path = f"{BASE}/{slug}/activos.jsonl"
    total, tokens, usd = 0, 0, 0.0
    if ledger_path in paths:
        for linea in fuente.leer(ledger_path).splitlines():
            if not linea.strip():
                continue
            try:
                a = json.loads(linea)
                total += 1
                tokens += int(a.get("tokens_est") or 0)
                usd += float(a.get("costo_usd") or 0)
            except (ValueError, TypeError) as e:
                print(f"[WARN] linea invalida en {ledger_path}: {e}", file=sys.stderr)
    cliente["activos"] = {"total": total, "tokens_est_total": tokens,
                          "costo_usd_total": round(usd, 2)}
    return cliente


def construir(fuente: Fuente) -> dict:
    paths = fuente.listar()
    slugs = sorted({m.group(1) for p in paths
                    if (m := re.match(rf"{re.escape(BASE)}/([^/_][^/]*)/", p))})
    return {
        "generado": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "fuente": fuente.ref,
        "clientes": [parse_cliente(fuente, s, paths) for s in slugs],
        "nota": ("Snapshot generado por host-job (snapshot-proyectos.py); el bot solo LEE. "
                 "Si 'generado' es viejo, decirlo tal cual — nunca aparentar frescura."),
    }


def escribir_en_volumen(payload: str) -> None:
    exec_sh = (f"docker exec -i -u hermes {CONTENEDOR} sh -c "
               f"'mkdir -p /opt/data/workspace && cat > {DESTINO}'")
    ssh_host = os.environ.get("PROYECTOS_SSH_HOST", "")
    cmd = ["ssh", ssh_host, exec_sh] if ssh_host else ["sh", "-c", exec_sh]
    r = subprocess.run(cmd, input=payload, text=True, capture_output=True)
    if r.returncode != 0:
        # best-effort NUNCA silencioso (leccion del fetch fantasma, 2026-07-13)
        print(f"[ERROR] no se pudo escribir {DESTINO} en {CONTENEDOR}: "
              f"{r.stderr.strip()}", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    worktree = "--worktree" in sys.argv
    snapshot = construir(Fuente(worktree))
    payload = json.dumps(snapshot, ensure_ascii=False, indent=1)
    LOCAL_SNAPSHOT.write_text(payload, encoding="utf-8")
    if "--solo-local" in sys.argv:
        print(payload)
        return
    escribir_en_volumen(payload)
    n = len(snapshot["clientes"])
    print(f"proyectos.json actualizado ({n} cliente(s), fuente {snapshot['fuente']})")


if __name__ == "__main__":
    main()
