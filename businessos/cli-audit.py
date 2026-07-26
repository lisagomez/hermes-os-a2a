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
# Indice VERSIONADO de lo impreso (slug -> grade). Es la unica forma de que el
# auditor corra en una maquina SIN la libreria de binarios — p. ej. el servidor,
# que es la unica maquina 24/7 (2026-07-12). La libreria vive donde se imprime
# (Claude Code + Go); el indice viaja en el repo. Se regenera con --emit-index
# EN la maquina que tiene la libreria, y se commitea.
INDEX = HERE / "cli-library-index.json"
EMIT = "--emit" in sys.argv[1:]
EMIT_INDEX = "--emit-index" in sys.argv[1:]

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


# Subdominios genericos de documentacion: no identifican a la API. Sin esto,
# "docs.hetzner.cloud" -> "docs" y "developers.circle.com" -> "developers", que
# no casan con NADA impreso => falsos "FALTA" permanentes (hetzner llevaba asi
# desde el 2026-07-04, impreso y reportado como faltante en cada corrida).
SUBDOMINIOS_GENERICOS = {"docs", "doc", "api", "developer", "developers", "dev"}
TLDS = {"www", "com", "sh", "io", "org", "dev", "net", "cloud", "ai", "co"}


def slug(name: str) -> str:
    """Nombre del CLI tal como lo guardaria Printing Press (catalog = literal; URL = host)."""
    if "://" not in name:
        return name.lower()
    host = re.sub(r"^https?://", "", name).split("/")[0]
    host = host.split(":")[0]  # descarta el puerto: "grafo:3000" -> "grafo"
    partes = [p for p in host.split(".") if p not in TLDS]
    significativas = [p for p in partes if p not in SUBDOMINIOS_GENERICOS] or partes
    return (significativas[0] if significativas else host).lower()


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


def scan_library(library: Path) -> dict[str, dict]:
    """{slug: {grade, medicion, verdict}} leido de la libreria de binarios.

    `medicion` dice DE DONDE salio el grado, y es la pieza que evita el fallo
    silencioso: Printing Press 4.27 NO deja `scorecard.json` al publicar (el
    grado del skill /printing-press-score se queda en la conversacion), asi que
    sin esto el grado sale None, la comparacion contra `min_grade` nunca se
    evalua y el auditor reporta "0 desactualizados" cuando lo cierto es "no se".
    Mismo error que motivo `fuente_impresos`, un nivel mas abajo:
    no medido != aprobado. Se cae a `dogfood-results.json` (verdict PASS/FAIL),
    que si viaja con el CLI publicado, y si no hay nada se DICE.
    """
    found: dict[str, dict] = {}
    for entry in library.iterdir():
        if not entry.is_dir():
            continue
        grade, medicion, verdict = None, "no_disponible", None
        for sc in (entry / "scorecard.json", entry / "scorecard.md"):
            if sc.exists():
                m = re.search(r"\b([A-F][+-]?)\b", sc.read_text(encoding="utf-8")[:2000])
                grade, medicion = (m.group(1) if m else None), "scorecard"
                break
        dogfood = entry / "dogfood-results.json"
        if dogfood.exists():
            try:
                verdict = json.loads(dogfood.read_text(encoding="utf-8")).get("verdict")
                if medicion == "no_disponible" and verdict:
                    medicion = "dogfood"
            except (json.JSONDecodeError, OSError):
                pass
        found[entry.name.lower()] = {"grade": grade, "medicion": medicion, "verdict": verdict}
    return found


def leer_indice() -> dict[str, dict]:
    if not INDEX.exists():
        return {}
    try:
        return {k.lower(): v for k, v in (json.loads(
            INDEX.read_text(encoding="utf-8")).get("impresos") or {}).items()}
    except json.JSONDecodeError:
        return {}


def heredar_grados(impresos: dict[str, dict], previo: dict[str, dict]) -> dict[str, dict]:
    """Completa con el indice el grado que la libreria no puede medir.

    Lo medido ahora manda; lo no medible se hereda marcado como tal y NUNCA se
    degrada a null en silencio. Se aplica en las DOS rutas (--emit-index y la
    auditoria normal): sin esto, la maquina que si tiene la libreria reporta
    "sin grado" para CLIs que el indice ya tiene medidos — la libreria publicada
    no conserva el scorecard.
    """
    for sl, datos in impresos.items():
        # Se elige el candidato que TENGA grado, no el primero que exista: un
        # dict con grade=None es truthy y un `or` encadenado nunca llegaria al
        # alias (el dir 'telegram-bot' hereda del slug historico 'telegram').
        candidatos = [previo.get(sl), previo.get(sl.replace("-bot", ""))]
        anterior = next((c for c in candidatos if c and c.get("grade")), {})
        if datos.get("grade") is None and anterior.get("grade"):
            datos.update({
                "grade": anterior["grade"],
                "score": anterior.get("score"),
                "medicion": "heredado_del_indice",
                "nota": anterior.get("nota"),
            })
    return impresos


def printed_clis(library: Path | None) -> tuple[dict[str, dict], str]:
    """({slug: {grade}}, fuente). Prefiere la libreria real; si no esta (p. ej. en
    el servidor, que no imprime), cae al indice versionado del repo. Sin ninguna
    de las dos degrada a vacio — y el snapshot lo DICE (fuente='ninguna'), para
    que nadie confunda "no se" con "no hay nada impreso"."""
    if library:
        return heredar_grados(scan_library(library), leer_indice()), "libreria"
    clis = leer_indice()
    if clis:
        return clis, "indice"
    return {}, "ninguna"


def slug_de_entrada(cli: dict) -> str:
    """Slug del CLI: `slug:` explicito del manifiesto, o derivado del nombre.

    El override existe porque el nombre publicado no siempre se deduce de la URL:
    el CLI de Hetzner se llama `hcloud` (como su CLI oficial), no `hetzner`.
    """
    return str(cli.get("slug") or slug(cli["name"])).lower()


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

    if EMIT_INDEX:
        # Regenera el indice versionado DESDE la libreria real. Correr en la maquina
        # que imprime (Claude Code + Printing Press) y commitear el resultado.
        if not library:
            print("ERROR: --emit-index requiere la libreria (~/printing-press/library "
                  "o CLI_PRESS_LIBRARY). Esta maquina no la tiene.", file=sys.stderr)
            sys.exit(1)
        # FUSIONAR, no pisar: la libreria publicada no conserva el grado del
        # scorecard, asi que un --emit-index ingenuo BORRA grados que ya se
        # habian medido (paso el 2026-07-26: A/87, A/83, A/87 -> null). Lo
        # medido ahora manda; lo que no se puede medir se hereda del indice
        # anterior marcado como tal, y jamas se degrada a null en silencio.
        impresos = heredar_grados(scan_library(library), leer_indice())
        idx = {
            "_nota": ("Generado con `cli-audit.py --emit-index` desde la libreria real. "
                      "Lo lee el auditor en maquinas SIN libreria (el servidor). "
                      "Regenerar y commitear tras imprimir/mejorar cualquier CLI. "
                      "`medicion` dice de donde sale el grado: scorecard | dogfood | "
                      "heredado_del_indice | no_disponible — nunca confundir no medido "
                      "con aprobado."),
            "generado": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ"),
            "library_path": str(library),
            "impresos": impresos,
        }
        INDEX.write_text(json.dumps(idx, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Indice -> {INDEX} ({len(idx['impresos'])} CLIs)")
        return

    printed, fuente_impresos = printed_clis(library)

    faltantes, desactualizados, no_due_aun, sin_grado = [], [], [], []
    due_keys: list[str] = []

    for key, phase in phases.items():
        due = phase_earliest(key) <= fase
        for cli in phase.get("clis", []):
            if cli.get("deprecated"):
                continue  # superseded (p. ej. digitalocean -> hcloud): no se audita ni cuenta
            name = cli["name"]
            sl = slug_de_entrada(cli)
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
                elif not grade:
                    # Impreso pero SIN grado medible: no se puede afirmar que
                    # cumple el minimo. Se reporta aparte para no contarlo como
                    # aprobado (doctrina: no medido != aprobado).
                    sin_grado.append({**entry, "medicion": pr.get("medicion", "no_disponible"),
                                      "verdict_dogfood": pr.get("verdict"),
                                      "comando": f"/printing-press-score {name}"})

    mapped = {slug_de_entrada(c) for p in phases.values() for c in p.get("clis", [])}
    apis_sin_entrada = [s for s in compose_services()
                        if s not in INTERNAL_SERVICES and slug(s) not in mapped]

    # Solo las fases que REALMENTE tienen algo que imprimir: `due_keys` junta
    # todas las fases vencidas, asi que sugeria re-imprimir fases ya completas
    # (y con --emit las corria de verdad, gastando tokens en nada).
    cmd_phases = sorted({f["fase"] for f in faltantes})
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
        "fuente_impresos": fuente_impresos,           # libreria | indice | ninguna
        "impresos": sorted(printed.keys()),
        "faltantes": faltantes,
        "desactualizados": desactualizados,
        "sin_grado": sin_grado,
        "apis_sin_entrada": apis_sin_entrada,
        "no_due_aun": no_due_aun,
        "comando_sugerido": comando_sugerido,
        "nota": ("Printing Press corre en Claude Code (no en cron/servidor). Este auditor solo "
                 "prepara y avisa: para imprimir, corre el comando sugerido en Claude Code. "
                 + {"libreria": f"Impresos leidos de la libreria real: {library}.",
                    "indice": ("Impresos leidos del INDICE versionado del repo "
                               "(esta maquina no imprime). Si alguien imprimio un CLI y no "
                               "regenero el indice (--emit-index), aqui saldra como faltante."),
                    "ninguna": ("SIN libreria NI indice: no se que hay impreso, asi que todo lo "
                                "'due' sale como faltante. No confundir con 'no hay nada impreso'."),
                    }[fuente_impresos]),
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
