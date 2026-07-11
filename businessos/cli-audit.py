#!/usr/bin/env python3
"""Auditor de CLIs agente-nativos (Printing Press) -> snapshot para el skill cli-audit.

Detecta BRECHAS (CLIs que el manifiesto pide para la fase actual y aun no estan
impresos, fases cumplidas sin su CLI, servicios del stack sin entrada en el
manifiesto) y CANDIDATOS de calidad (CLIs impresos por debajo del grado minimo).
NO imprime nada: Printing Press solo corre en Claude Code (Go + /printing-press)
en tu maquina de desarrollo. Este job solo PREPARA y AVISA.

Es un job de confianza del HOST (como ingest-token-usage.py): lee docker-compose
y escribe el snapshot dentro del volumen de negocio via `docker exec`. Hermes
scrubbea los secretos del sandbox del agente, asi que el agente solo LEE el
snapshot (skill cli-audit); nunca corre este script ni toca credenciales.

Uso:
    python3 businessos/cli-audit.py            # audita la fase actual (ROADMAP)
    python3 businessos/cli-audit.py --emit     # ademas deja los prompts (print-phase.sh)

Sin secretos: este auditor NO necesita el service_role (no toca Supabase).
Pensado para correr on-demand o por cron de SO en el servidor (escalonado tras la
ingesta de tokens). Idempotente: re-correr recalcula desde el manifiesto + stack.
"""
import json, re, subprocess, datetime, sys, os
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
MANIFEST = HERE / "cli-manifest.yaml"
COMPOSE = HERE / "docker-compose.yml"
ROADMAP = HERE / "ROADMAP.md"
PRINT_PHASE = HERE / "print-phase.sh"
LOCAL_SNAPSHOT = Path("/tmp/cli-audit.json")
EMIT = "--emit" in sys.argv[1:]

# Servicios internos del propio Hermes OS · A2A: no son APIs externas que requieran CLI.
INTERNAL_SERVICES = {"hermes-personal", "hermes-negocio", "hermes-clientes", "dashboard"}
# Donde Printing Press deja los CLIs publicados: ~/printing-press/library/<slug>
# (confirmado con cli-printing-press 4.27.0: `publish ... --dir ~/printing-press/library/notion`).
# Degrada con gracia si aun no existe (nada impreso todavia).
LIBRARY_CANDIDATES = [
    os.environ.get("CLI_PRESS_LIBRARY", ""),
    str(Path.home() / "printing-press" / "library"),
]
COST_BY_SOURCE = {
    "catalog": "bajo (en catalogo, impresion casi directa)",
    "spec": "medio (desde OpenAPI)",
    "own": "medio (spec propia)",
    "sniff": "medio-alto (husmeo de web/docs)",
}


def slug(name: str) -> str:
    """Nombre del CLI tal como lo guardaria Printing Press (catalog = literal; URL = host)."""
    if "://" not in name:
        return name.lower()
    host = re.sub(r"^https?://", "", name).split("/")[0]
    parts = [p for p in host.split(".") if p not in ("www", "com", "sh", "io", "org", "dev", "net")]
    return (parts[0] if parts else host).lower()


def current_phase() -> tuple[int, str]:
    """Fase actual = la marcada 'EN CURSO' en el ROADMAP; si no, la mayor cumplida."""
    text = ROADMAP.read_text(encoding="utf-8")
    en_curso = re.search(r"^## FASE (\d+).*EN CURSO", text, re.MULTILINE)
    if en_curso:
        n = int(en_curso.group(1))
    else:
        nums = [int(m) for m in re.findall(r"^## FASE (\d+)", text, re.MULTILINE)]
        n = max(nums) if nums else 0
    label = re.search(rf"^## FASE {n} [—-]+\s*(.+)$", text, re.MULTILINE)
    return n, (label.group(1).split("←")[0].strip() if label else "")


def phase_earliest(phase_key: str) -> int:
    """'0-1' -> 0, '1-2' -> 1, '2' -> 2: la fase mas temprana donde el CLI ya aplica."""
    return int(phase_key.split("-")[0])


def find_library() -> Path | None:
    for cand in LIBRARY_CANDIDATES:
        if cand and Path(cand).is_dir():
            return Path(cand)
    return None


def printed_clis(library: Path | None) -> dict[str, dict]:
    """{slug: {grade}}: lo que Printing Press ya imprimio. Vacio si no hay libreria."""
    if not library:
        return {}
    found: dict[str, dict] = {}
    for entry in library.iterdir():
        if not entry.is_dir():
            continue
        grade = None
        for sc in (entry / "scorecard.json", entry / "scorecard.md"):
            if sc.exists():
                m = re.search(r"\b([A-F][+-]?)\b", sc.read_text(encoding="utf-8")[:2000])
                grade = m.group(1) if m else None
                break
        found[entry.name.lower()] = {"grade": grade}
    return found


def match_printed(sl: str, printed: dict[str, dict]) -> dict | None:
    """Entrada impresa que corresponde al slug del manifiesto, o None. Tolera el
    sufijo descriptivo que Printing Press agrega desde el display name
    (p.ej. 'telegram' -> dir 'telegram-bot')."""
    if sl in printed:
        return printed[sl]
    for name, info in printed.items():
        if name.startswith(sl + "-") or sl.startswith(name + "-"):
            return info
    return None


def compose_services() -> list[str]:
    if not COMPOSE.exists():
        return []
    data = yaml.safe_load(COMPOSE.read_text(encoding="utf-8")) or {}
    return list((data.get("services") or {}).keys())


def write_snapshot(snapshot: dict) -> None:
    payload = json.dumps(snapshot, ensure_ascii=False, indent=2)
    LOCAL_SNAPSHOT.write_text(payload, encoding="utf-8")
    print(f"Snapshot local -> {LOCAL_SNAPSHOT}")
    # negocio vive en el runtime (Hetzner) desde 2026-07-05: el docker exec local
    # quedo huerfano tras la migracion. Con CLI_AUDIT_SSH_HOST (p. ej.
    # hermes@<ip>) el snapshot viaja por ssh; sin la var se intenta el contenedor
    # local (util si algun dia vuelve a correr aqui).
    exec_sh = ("docker exec -i -u hermes hermes-negocio sh -c "
               "'mkdir -p /opt/data/workspace && cat > /opt/data/workspace/cli-audit.json'")
    ssh_host = os.environ.get("CLI_AUDIT_SSH_HOST", "")
    cmd = ["ssh", ssh_host, exec_sh] if ssh_host else ["sh", "-c", exec_sh]
    destino = (f"{ssh_host} -> " if ssh_host else "") + "negocio:/opt/data/workspace/cli-audit.json"
    try:
        r = subprocess.run(cmd, input=payload, text=True, capture_output=True)
        ok = r.returncode == 0
    except FileNotFoundError:
        ok = False
    print(f"Snapshot a {destino}",
          "ok" if ok else "FALLO (destino no disponible; solo copia local — define "
                          "CLI_AUDIT_SSH_HOST=hermes@<runtime> si negocio vive remoto)")


def main() -> None:
    manifest = yaml.safe_load(MANIFEST.read_text(encoding="utf-8"))
    phases = manifest.get("phases", {})
    defaults = manifest.get("defaults", {})
    mode = defaults.get("mode", "codex")
    min_grade = str(defaults.get("min_grade", "A"))

    fase, fase_label = current_phase()
    library = find_library()
    printed = printed_clis(library)

    faltantes, desactualizados, no_due_aun = [], [], []
    due_keys: list[str] = []

    for key, phase in phases.items():
        due = phase_earliest(key) <= fase
        for cli in phase.get("clis", []):
            if cli.get("deprecated"):
                continue  # superseded (p. ej. digitalocean -> hcloud): no se audita ni cuenta
            name = cli["name"]
            sl = slug(name)
            entry = {
                "name": name, "fase": key, "source": cli.get("source"),
                "verticales": cli.get("verticales", []), "why": cli.get("why", ""),
                "costo_estimado": COST_BY_SOURCE.get(cli.get("source", ""), "desconocido"),
                "comando": f"/printing-press {name} {mode}",
            }
            if not due:
                no_due_aun.append({**entry, "nota": f"aplica desde fase {key}"})
                continue
            due_keys.append(key)
            pr = match_printed(sl, printed)
            if pr is None:
                faltantes.append(entry)
            else:
                grade = pr.get("grade")
                if grade and grade.rstrip("+-") > min_grade.rstrip("+-"):
                    desactualizados.append({**entry, "grado": grade,
                                            "motivo": f"grado {grade} < minimo {min_grade}",
                                            "comando": f"/printing-press-amend {name}"})

    mapped = {slug(c["name"]) for p in phases.values() for c in p.get("clis", [])}
    apis_sin_entrada = [s for s in compose_services()
                        if s not in INTERNAL_SERVICES and slug(s) not in mapped]

    cmd_phases = sorted(set(due_keys))
    comando_sugerido = (
        " ; ".join(f"./print-phase.sh {k} --emit" for k in cmd_phases)
        if faltantes else "nada pendiente para la fase actual"
    )

    snapshot = {
        "generado": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ"),
        "fase_actual": fase,
        "fase_actual_label": fase_label,
        "min_grade": min_grade,
        "mode": mode,
        "library_path": str(library) if library else None,
        "faltantes": faltantes,
        "desactualizados": desactualizados,
        "apis_sin_entrada": apis_sin_entrada,
        "no_due_aun": no_due_aun,
        "comando_sugerido": comando_sugerido,
        "nota": ("Printing Press corre en Claude Code (no en cron/servidor). Este auditor solo "
                 "prepara y avisa: para imprimir, corre el comando sugerido en Claude Code. "
                 + ("Sin libreria de CLIs detectada: todo lo 'due' se reporta como faltante."
                    if not library else f"Libreria: {library}.")),
    }

    print(f"=== Auditoria CLIs · fase {fase} ({fase_label}) ===")
    print(f"  faltantes: {len(faltantes)} · desactualizados: {len(desactualizados)} · "
          f"apis sin entrada: {len(apis_sin_entrada)} · futuros: {len(no_due_aun)}")
    for f in faltantes:
        print(f"  FALTA  {f['name']:<28} (fase {f['fase']}, {f['source']}) -> {f['comando']}")
    for d in desactualizados:
        print(f"  REVISA {d['name']:<28} {d['motivo']} -> {d['comando']}")
    if faltantes:
        print(f"  sugerido: {comando_sugerido}")

    write_snapshot(snapshot)

    if EMIT and PRINT_PHASE.exists():
        for k in cmd_phases:
            subprocess.run(["bash", str(PRINT_PHASE), k, "--emit"],
                           env={**os.environ, "PATH": os.environ.get("PATH", "") + ":" + str(Path.home() / ".local/bin")})


if __name__ == "__main__":
    main()
