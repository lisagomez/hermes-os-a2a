#!/usr/bin/env python3
"""Detector de deriva repo -> runtime: lo que esta fusionado pero NO esta corriendo.

Por que existe: "un seed mergeado no es un seed aplicado" (2026-08-04), "una migracion
mergeada no es una migracion aplicada" (2026-08-02), "editar un AGENTS.md en el repo no
lo despliega" (2026-07-12), "'integrado y verificado en dev' no es imagen desplegable"
(2026-07-23). Son la MISMA clase de fallo, y siempre se descubre tarde y a mano. El
2026-08-20 un barrido manual encontro cuatro a la vez, uno de ellos un bug vivo: el chat
de la landing seguia regresando leads a etapa 'nuevo' porque su imagen era de 18 dias
antes que el fix. Una doctrina sin mecanismo es una costumbre (2026-08-02): esto es el
mecanismo.

Que revisa (todo de SOLO LECTURA; no aplica nada, no arregla nada, solo NOMBRA):

  1. checkout   — el repo del servidor contra origin/master (los crons corren de ahi)
  2. imagenes   — cada servicio con `build:` en compose: fecha de la imagen viva contra
                  la fecha del ultimo commit de codigo de ese servicio (tests y .md no
                  cuentan: no viajan al comportamiento)
  3. grafo      — reglas en seed/reglas.json contra las reglas de la BD viva
  4. doctrina   — SOUL.md / AGENTS.md del repo contra los del volumen de cada vertical
                  (ignorando los bloques AUTO que inyectan los host-jobs)
  5. host-jobs  — copias en ~/bin contra el repo (los crons ejecutan las copias)

Uso (en el SERVIDOR, que es donde vive el runtime):
    python3 businessos/drift-runtime.py           # informe + snapshot al volumen
    python3 businessos/drift-runtime.py --json    # solo el JSON, para pipes

Salida: 0 si no hay deriva, 1 si la hay (para que el cron destaque en el log).
Sin secretos: no toca Supabase ni credenciales; solo git, docker y el filesystem.

Env:
    DRIFT_REPO       raiz del repo en el servidor (default: ancestro de este archivo)
    DRIFT_VOLUMENES  raiz de los volumenes .hermes (default: ~/businessos)
    DRIFT_BIN        copias de host-jobs que ejecutan los crons (default: ~/bin)
    DRIFT_SIN_FETCH  =1 para no hacer `git fetch` (util en pruebas o sin red)
"""
import datetime
import json
import os
import re
import subprocess
import sys
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
REPO = Path(os.environ.get("DRIFT_REPO", HERE.parent))
COMPOSE = REPO / "businessos" / "docker-compose.yml"
VOLUMENES = Path(os.environ.get("DRIFT_VOLUMENES", Path.home() / "businessos"))
BIN = Path(os.environ.get("DRIFT_BIN", Path.home() / "bin"))
LOCAL_SNAPSHOT = Path("/tmp/drift-runtime.json")

VERTICALES = ("negocio", "personal", "clientes")
DOCTRINA = ("SOUL.md", "AGENTS.md")
# Bloques que un host-job inyecta EN EL VOLUMEN y que el repo nunca tendra
# (patron dato-en-SOUL, 2026-07-06). Compararlos seria pedir una deriva eterna.
BLOQUE_AUTO = re.compile(r"<!--\s*[A-Z_]+:AUTO:START\s*-->.*?<!--\s*[A-Z_]+:AUTO:END\s*-->",
                         re.DOTALL)


# ---------------------------------------------------------------- puro (testeable)

def sin_bloques_auto(texto: str) -> str:
    """Quita los bloques inyectados por host-jobs y normaliza el espacio final."""
    return BLOQUE_AUTO.sub("", texto).strip()


def imagen_desfasada(creada: str | None, ultimo_commit: str | None) -> bool:
    """True si el codigo del servicio cambio DESPUES de construirse la imagen viva.

    Ambas fechas en ISO-8601 con zona. Si falta cualquiera de las dos, no se afirma
    deriva: no saber no es lo mismo que estar al dia (regla del auditor de CLIs).
    """
    if not creada or not ultimo_commit:
        return False
    return _iso(ultimo_commit) > _iso(creada)


def _iso(valor: str) -> datetime.datetime:
    return datetime.datetime.fromisoformat(valor.strip())


def hallazgo(clase: str, objeto: str, detalle: str, accion: str) -> dict:
    return {"clase": clase, "objeto": objeto, "detalle": detalle, "accion": accion}


def construir_snapshot(hallazgos: list[dict], revisados: dict, generado: str) -> dict:
    return {
        "generado": generado,
        "fuente": "drift-runtime.py (host-job de solo lectura)",
        "limpio": not hallazgos,
        "total": len(hallazgos),
        "por_clase": {c: sum(1 for h in hallazgos if h["clase"] == c)
                      for c in sorted({h["clase"] for h in hallazgos})},
        "hallazgos": hallazgos,
        "revisados": revisados,
    }


# ------------------------------------------------------------------------- I/O

def sh(cmd: list[str], entrada: str | None = None) -> tuple[int, str]:
    try:
        r = subprocess.run(cmd, input=entrada, text=True, capture_output=True, timeout=120)
    except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
        return 127, str(exc)
    return r.returncode, (r.stdout or r.stderr).strip()


def revisar_checkout() -> tuple[list[dict], dict]:
    """El repo del servidor contra origin/master: de ahi salen los crons."""
    if not os.environ.get("DRIFT_SIN_FETCH"):
        sh(["git", "-C", str(REPO), "fetch", "origin", "--quiet", "--prune"])
    rc, atras = sh(["git", "-C", str(REPO), "rev-list", "--count", "HEAD..origin/master"])
    if rc != 0:
        return [hallazgo("checkout", str(REPO), f"no se pudo comparar: {atras}",
                         "revisar el repo del servidor a mano")], {"checkout": "error"}
    n = int(atras or 0)
    if n:
        return [hallazgo("checkout", str(REPO), f"{n} commit(s) atras de origin/master",
                         f"git -C {REPO} pull --ff-only origin master")], {"checkout": n}
    return [], {"checkout": 0}


def fuentes_de_dockerfile(texto: str) -> list[str]:
    """Rutas que el Dockerfile COPIA de verdad, relativas al contexto de build.

    Mirar el DIRECTORIO de contexto no sirve: la mitad de los servicios del trio
    construyen con contexto `.` o `..` y un Dockerfile de COPY explicitos (gotcha
    2026-07-23). Con el contexto como proxy, cualquier commit del repo los marcaria
    desfasados y el detector se volveria ruido que nadie mira.

    Ignora los `COPY --from=` (vienen de otra etapa del build, no del repo).
    """
    lineas, acumulado = [], ""
    for cruda in texto.splitlines():
        linea = acumulado + cruda.strip()
        if linea.endswith("\\"):
            acumulado = linea[:-1].strip() + " "
            continue
        acumulado = ""
        lineas.append(linea)

    fuentes: list[str] = []
    for linea in lineas:
        partes = linea.split()
        if not partes or partes[0].upper() not in {"COPY", "ADD"}:
            continue
        if any(p.startswith("--from=") for p in partes):
            continue
        args = [p for p in partes[1:] if not p.startswith("--")]
        fuentes += args[:-1]          # el ultimo argumento es el destino
    return fuentes


def _servicios_con_build() -> dict[str, list[str]]:
    """servicio -> rutas (relativas al repo) que entran en su imagen."""
    if not COMPOSE.exists():
        return {}
    compose = yaml.safe_load(COMPOSE.read_text(encoding="utf-8")) or {}
    fuera: dict[str, list[str]] = {}
    for nombre, cfg in (compose.get("services") or {}).items():
        build = (cfg or {}).get("build")
        if not build:
            continue
        if isinstance(build, dict):
            contexto, dockerfile = build.get("context", "."), build.get("dockerfile", "Dockerfile")
        else:
            contexto, dockerfile = build, "Dockerfile"
        raiz = (COMPOSE.parent / contexto).resolve()
        df = raiz / dockerfile
        if not df.exists():
            continue
        rutas = []
        for fuente in fuentes_de_dockerfile(df.read_text(encoding="utf-8")):
            destino = (raiz / fuente).resolve()
            try:
                rutas.append(str(destino.relative_to(REPO)))
            except ValueError:
                continue          # fuera del repo: no lo podemos fechar
        rutas.append(str(df.resolve().relative_to(REPO)))   # el Dockerfile tambien cuenta
        if rutas:
            fuera[nombre] = sorted(set(rutas))
    return fuera


def _ultimo_commit(rutas: list[str]) -> str | None:
    """Fecha del ultimo commit de CODIGO (tests y .md no cambian el comportamiento)."""
    rc, salida = sh(["git", "-C", str(REPO), "log", "-1", "--format=%cI", "--", *rutas,
                     ":(exclude,glob)**/tests/**", ":(exclude,glob)**/*.md"])
    return salida if rc == 0 and salida else None


def revisar_imagenes() -> tuple[list[dict], dict]:
    rc, corriendo = sh(["docker", "ps", "--format", "{{.Names}}\t{{.Image}}"])
    if rc != 0:
        return [], {"imagenes": "docker no disponible"}
    vivos = dict(linea.split("\t", 1) for linea in corriendo.splitlines() if "\t" in linea)
    hallazgos, revisados = [], 0
    for servicio, rutas in sorted(_servicios_con_build().items()):
        imagen = vivos.get(servicio)
        if not imagen:
            continue          # apagado a proposito: no se afirma nada
        revisados += 1
        rc, creada = sh(["docker", "image", "inspect", imagen, "--format", "{{.Created}}"])
        commit = _ultimo_commit(rutas)
        if rc == 0 and imagen_desfasada(creada, commit):
            hallazgos.append(hallazgo(
                "imagen", servicio,
                f"codigo del {commit[:10]} sobre imagen del {creada[:10]}",
                f"docker compose up -d --build {servicio}  (con el servicio ocioso)"))
    return hallazgos, {"imagenes": revisados}


def revisar_grafo() -> tuple[list[dict], dict]:
    semilla = REPO / "businessos" / "grafo" / "seed" / "reglas.json"
    if not semilla.exists():
        return [], {"grafo": "sin seed en el repo"}
    esperadas = len(json.loads(semilla.read_text(encoding="utf-8")).get("reglas", []))
    rc, vivas = sh(["docker", "exec", "grafo-db", "psql", "-U", "grafo", "-d", "grafo",
                    "-tAc", "select count(*) from reglas;"])
    if rc != 0:
        return [], {"grafo": "grafo-db no disponible"}
    vivas = int(vivas or 0)
    if vivas != esperadas:
        return [hallazgo(
            "grafo", "reglas",
            f"{vivas} en la BD viva contra {esperadas} en seed/reglas.json",
            "aplicar seed/02-seed.sql (idempotente) por psql y reiniciar grafo",
        )], {"grafo": f"{vivas}/{esperadas}"}
    return [], {"grafo": f"{vivas}/{esperadas}"}


def revisar_doctrina() -> tuple[list[dict], dict]:
    """El bot lee el VOLUMEN; el repo es fuente, no despliegue (2026-07-12)."""
    hallazgos, revisados = [], 0
    for vertical in VERTICALES:
        for documento in DOCTRINA:
            en_repo = REPO / "businessos" / vertical / documento
            if not en_repo.exists():
                continue
            rc, en_volumen = sh(["docker", "exec", "-u", "hermes", f"hermes-{vertical}",
                                 "cat", f"/opt/data/{documento}"])
            if rc != 0:
                continue      # vertical apagada: no se afirma nada
            revisados += 1
            if sin_bloques_auto(en_volumen) != sin_bloques_auto(
                    en_repo.read_text(encoding="utf-8")):
                hallazgos.append(hallazgo(
                    "doctrina", f"{vertical}/{documento}",
                    "el volumen no coincide con el repo",
                    f"diffear ANTES de pisar; copiar al volumen, chown 10000:10000 "
                    f"y docker restart hermes-{vertical}"))
    return hallazgos, {"doctrina": revisados}


def revisar_host_jobs() -> tuple[list[dict], dict]:
    """Los crons ejecutan las copias de ~/bin, no el repo."""
    if not BIN.is_dir():
        return [], {"host_jobs": "sin ~/bin"}
    hallazgos, revisados = [], 0
    for copia in sorted(list(BIN.glob("*.sh")) + list(BIN.glob("*.py"))):
        origen = REPO / "businessos" / copia.name
        if not origen.exists():
            continue
        revisados += 1
        if copia.read_bytes() != origen.read_bytes():
            hallazgos.append(hallazgo(
                "host-job", copia.name,
                f"{copia} difiere de {origen.relative_to(REPO)}",
                f"cp {origen} {copia}  (tras revisar el diff)"))
    return hallazgos, {"host_jobs": revisados}


def escribir_snapshot(snapshot: dict) -> None:
    """Copia local + snapshot en el volumen de negocio (el bot lo LEE, no lo calcula)."""
    payload = json.dumps(snapshot, ensure_ascii=False, indent=2)
    LOCAL_SNAPSHOT.write_text(payload, encoding="utf-8")
    print(f"Snapshot local -> {LOCAL_SNAPSHOT}")
    exec_sh = ("docker exec -i -u hermes hermes-negocio sh -c "
               "'cat > /opt/data/workspace/drift-runtime.json'")
    rc, _ = sh(["sh", "-c", exec_sh], entrada=payload)
    print("Snapshot a negocio:/opt/data/workspace/drift-runtime.json",
          "ok" if rc == 0 else "FALLO (solo copia local)")


def main() -> int:
    hallazgos: list[dict] = []
    revisados: dict = {}
    for revision in (revisar_checkout, revisar_imagenes, revisar_grafo,
                     revisar_doctrina, revisar_host_jobs):
        nuevos, resumen = revision()
        hallazgos += nuevos
        revisados.update(resumen)

    generado = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    snapshot = construir_snapshot(hallazgos, revisados, generado)

    if "--json" in sys.argv[1:]:
        print(json.dumps(snapshot, ensure_ascii=False, indent=2))
        return 1 if hallazgos else 0

    print(f"=== Deriva repo->runtime · {generado} ===")
    print(f"  revisado: {revisados}")
    if not hallazgos:
        print("  SIN DERIVA: lo fusionado es lo que corre.")
    for h in hallazgos:
        print(f"  DERIVA [{h['clase']}] {h['objeto']}: {h['detalle']}")
        print(f"          -> {h['accion']}")
    escribir_snapshot(snapshot)
    return 1 if hallazgos else 0


if __name__ == "__main__":
    sys.exit(main())
