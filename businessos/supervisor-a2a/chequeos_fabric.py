"""chequeos_fabric.py — chequeos estaticos del departamento CONTRATOS_INTELIGENTES
(Fase 12, PRP-013). Mismo patron que chequeos_adquisicion.py: funciones
(gate, worktree, archivos) → ResultadoGate, registradas en gates.CHEQUEOS.

El objeto juzgado es el PAQUETE de chaincode que el FabricChaincodeEngine dejo
en `paquete-sc/` dentro del worktree. El juicio de dominio (que el codigo sea
EXACTAMENTE la plantilla auditada + parametrizacion declarada, determinista y
con manifest integro) va aqui; la compilacion/tests van como gates `comando`
en reglas/contratos_inteligentes.toml. La red efimera NO corre en este
contenedor (sin socket Docker): es gate del host-job en el nodo sandbox,
ANTES de la aprobacion humana (PRP-013 Fase 5).

Regla de oro heredada: no correr ≠ pasar. Paquete ausente o manifest ilegible
es FALLO con hallazgo (una fabricacion que no dejo paquete es una fabricacion
fallida), y plantilla de referencia ausente es NO_EJECUTABLE (problema de
despliegue del juez, jamas un aprobado).
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import gates
from gates import Gate, ResultadoGate

PAQUETE_DIR = "paquete-sc"

# La plantilla auditada de referencia: horneada en la imagen del Supervisor
# (mismo commit que el resto del build). Override por env para dev/tests.
PLANTILLAS_DEFAULT = "/app/fabrica-sc/plantillas"

# Tokens de NO-determinismo prohibidos en chaincode (Gotcha del PRP-013):
# el endorsement diverge si dos peers evaluan distinto. Se revisan lineas de
# CODIGO (los comentarios que documentan la regla no cuentan).
TOKENS_PROHIBIDOS = (
    "time.Now(",
    "math/rand",
    "crypto/rand",
    "os.Getenv(",
    "net/http",
    "exec.Command",
    "os.Open(",
    "os.ReadFile(",
)

# Archivos que el Engine copia VERBATIM de la plantilla (byte a byte).
COPIADOS_VERBATIM = ("go.mod", "go.sum", "cmd/main.go")


def _paso(gate: Gate, evidencia: str) -> ResultadoGate:
    return ResultadoGate(regla=gate.regla, estado="paso", evidencia=evidencia)


def _fallo(gate: Gate, evidencia: str, hallazgos: list[dict]) -> ResultadoGate:
    return ResultadoGate(
        regla=gate.regla, estado="fallo", evidencia=evidencia, hallazgos=hallazgos
    )


def _no_ejecutable(gate: Gate, evidencia: str) -> ResultadoGate:
    return ResultadoGate(
        regla=gate.regla, estado="no_ejecutable", evidencia=evidencia,
        hallazgos=[{"regla": gate.regla, "evidencia": evidencia}],
    )


def _sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def _paquete(worktree: Path) -> Path:
    return worktree / PAQUETE_DIR


def _manifest(worktree: Path) -> dict | None:
    ruta = _paquete(worktree) / "manifest.json"
    if not ruta.is_file():
        return None
    try:
        m = json.loads(ruta.read_text())
    except (json.JSONDecodeError, OSError):
        return None
    return m if isinstance(m, dict) else None


def _plantillas_dir() -> Path:
    return Path(os.environ.get("FABRICA_PLANTILLAS", PLANTILLAS_DEFAULT))


# ---------- paquete_sc_presente ----------

def _paquete_sc_presente(gate: Gate, worktree: Path, archivos) -> ResultadoGate:
    paq = _paquete(worktree)
    faltan = [
        rel for rel in ("go.mod", "go.sum", "chaincode/escrow.go",
                        "chaincode/criterios_test.go", "cmd/main.go",
                        "manifest.json")
        if not (paq / rel).is_file()
    ]
    if faltan:
        return _fallo(
            gate,
            f"paquete-sc incompleto o ausente en el worktree",
            [{"regla": gate.regla,
              "evidencia": f"faltan: {', '.join(faltan)} bajo {PAQUETE_DIR}/"}],
        )
    return _paso(gate, f"{PAQUETE_DIR}/ completo (chaincode + tests + manifest)")


# ---------- manifest_integro (lo gateado es bit a bit lo fabricado) ----------

def _manifest_integro(gate: Gate, worktree: Path, archivos) -> ResultadoGate:
    paq = _paquete(worktree)
    m = _manifest(worktree)
    if m is None or not isinstance(m.get("archivos"), dict):
        return _fallo(gate, "manifest.json ausente o ilegible",
                      [{"regla": gate.regla,
                        "evidencia": "sin manifest no hay trazabilidad del paquete"}])
    hallazgos = []
    for rel, esperado in sorted(m["archivos"].items()):
        f = paq / rel
        if not f.is_file():
            hallazgos.append({"regla": gate.regla,
                              "evidencia": f"{rel}: en el manifest pero no en disco"})
        elif _sha256(f) != esperado:
            hallazgos.append({"regla": gate.regla, "archivo": rel,
                              "evidencia": f"{rel}: sha256 distinto al del manifest "
                                           "(el paquete fue tocado tras fabricarse)"})
    en_disco = {
        str(f.relative_to(paq))
        for f in paq.rglob("*") if f.is_file()
    } - {"manifest.json"}
    contrabando = sorted(en_disco - set(m["archivos"]))
    for rel in contrabando:
        hallazgos.append({"regla": gate.regla, "archivo": rel,
                          "evidencia": f"{rel}: archivo fuera del manifest "
                                       "(nada viaja de contrabando en el paquete)"})
    if hallazgos:
        return _fallo(gate, f"manifest vs disco: {len(hallazgos)} hallazgo(s)", hallazgos)
    return _paso(gate, f"{len(m['archivos'])} archivo(s) del manifest verificados por sha256")


# ---------- diff_acotado_plantilla ----------

def _diff_acotado_plantilla(gate: Gate, worktree: Path, archivos) -> ResultadoGate:
    m = _manifest(worktree)
    if m is None:
        return _fallo(gate, "manifest.json ausente o ilegible",
                      [{"regla": gate.regla, "evidencia": "sin manifest no hay diff declarado"}])
    plantilla_dir = _plantillas_dir() / str(m.get("plantilla", ""))
    if not plantilla_dir.is_dir():
        return _no_ejecutable(
            gate,
            f"plantilla de referencia {m.get('plantilla')!r} no disponible en "
            f"{_plantillas_dir()} (env FABRICA_PLANTILLAS) — juez mal desplegado",
        )
    paq = _paquete(worktree)
    hallazgos = []
    for rel in COPIADOS_VERBATIM:
        ref, gen = plantilla_dir / rel, paq / rel
        if not gen.is_file() or not ref.is_file() or ref.read_bytes() != gen.read_bytes():
            hallazgos.append({"regla": gate.regla, "archivo": rel,
                              "evidencia": f"{rel}: debe ser byte a byte la plantilla"})
    ref = (plantilla_dir / "chaincode" / "escrow.go").read_text().splitlines()
    gen_path = paq / "chaincode" / "escrow.go"
    gen = gen_path.read_text().splitlines() if gen_path.is_file() else []
    if len(ref) != len(gen):
        hallazgos.append({"regla": gate.regla, "archivo": "chaincode/escrow.go",
                          "evidencia": "el chaincode cambio el numero de lineas de la plantilla"})
    else:
        permitidas = {d.get("despues", "").strip() for d in m.get("diff", [])}
        for i, (lr, lg) in enumerate(zip(ref, gen), start=1):
            if lr != lg and lg.strip() not in permitidas:
                hallazgos.append({
                    "regla": gate.regla, "archivo": "chaincode/escrow.go",
                    "evidencia": f"linea {i} difiere fuera del diff declarado: {lg.strip()[:120]!r}",
                })
    if hallazgos:
        return _fallo(gate, f"diff contra plantilla: {len(hallazgos)} hallazgo(s)", hallazgos)
    return _paso(gate, f"diff acotado: {len(m.get('diff', []))} linea(s) declaradas, "
                       "todo lo demas identico a la plantilla auditada")


# ---------- determinismo_chaincode ----------

def _determinismo_chaincode(gate: Gate, worktree: Path, archivos) -> ResultadoGate:
    paq = _paquete(worktree) / "chaincode"
    fuentes = [f for f in sorted(paq.glob("*.go")) if not f.name.endswith("_test.go")]
    if not fuentes:
        return _fallo(gate, "sin fuentes de chaincode que revisar",
                      [{"regla": gate.regla, "evidencia": f"{PAQUETE_DIR}/chaincode/ sin .go"}])
    hallazgos = []
    for f in fuentes:
        for num, linea in enumerate(f.read_text().splitlines(), start=1):
            codigo = linea.strip()
            if codigo.startswith("//"):
                continue  # los comentarios que documentan la regla no cuentan
            for token in TOKENS_PROHIBIDOS:
                if token in codigo:
                    hallazgos.append({
                        "regla": gate.regla,
                        "archivo": f"{PAQUETE_DIR}/chaincode/{f.name}",
                        "evidencia": f"{f.name}:{num} usa {token!r} — no determinista: "
                                     "el endorsement divergiria entre peers",
                    })
    if hallazgos:
        return _fallo(gate, f"no-determinismo: {len(hallazgos)} hallazgo(s)", hallazgos)
    return _paso(gate, f"{len(fuentes)} fuente(s) sin tokens de no-determinismo "
                       f"({', '.join(TOKENS_PROHIBIDOS[:3])}, …)")


CHEQUEOS_FABRIC = {
    "paquete_sc_presente": _paquete_sc_presente,
    "manifest_integro": _manifest_integro,
    "diff_acotado_plantilla": _diff_acotado_plantilla,
    "determinismo_chaincode": _determinismo_chaincode,
}

gates.CHEQUEOS.update(CHEQUEOS_FABRIC)
