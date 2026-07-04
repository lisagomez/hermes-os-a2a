"""gates.py — el motor de reglas determinista del Supervisor (PRP-006, Fase 3).

Tres propiedades no negociables (SPEC-trio §7.4):
1. RE-EJECUTA, no confia: corre los comandos el mismo sobre el worktree.
2. Gate que no puede correr NUNCA se marca pasado: `no_ejecutable` → rechazo.
3. Reglas auditables: config TOML versionada (reglas/software.toml); una regla
   activa sin runner ejecutable = config invalida = el servicio NO arranca.

Sin SDK de modelo: 100% determinista (subprocess + chequeos estaticos puros).
"""
from __future__ import annotations

import re
import shlex
import subprocess
import tomllib
from dataclasses import dataclass, field
from pathlib import Path

EVIDENCIA_MAX = 400
TIMEOUT_DEFAULT_S = 600

RUNNERS_EJECUTABLES = ("comando", "estatico")
RUNNERS_DECLARADOS = RUNNERS_EJECUTABLES + ("modelo",)  # modelo: sin runner real aun


class ConfigInvalida(ValueError):
    """La config de reglas no es ejecutable tal como esta escrita."""


@dataclass(frozen=True)
class Gate:
    regla: str
    runner: str
    activo: bool = True
    comando: str | None = None
    chequeo: str | None = None
    timeout_s: int = TIMEOUT_DEFAULT_S


@dataclass
class ResultadoGate:
    regla: str
    estado: str  # paso | fallo | no_ejecutable
    evidencia: str
    hallazgos: list[dict] = field(default_factory=list)  # {regla, evidencia, archivo?}


# ---------- carga y validacion de config ----------

def cargar_config(path: Path) -> list[Gate]:
    """Carga la config y la valida ENTERA antes de aceptar un solo gate."""
    if not path.is_file():
        raise ConfigInvalida(f"config de reglas no existe: {path}")
    data = tomllib.loads(path.read_text(encoding="utf-8"))
    crudos = data.get("gate", [])
    if not crudos:
        raise ConfigInvalida("config sin gates: un supervisor sin reglas no supervisa nada")

    gates: list[Gate] = []
    vistos: set[str] = set()
    for g in crudos:
        regla = g.get("regla", "")
        if not regla or regla in vistos:
            raise ConfigInvalida(f"gate sin regla o regla duplicada: {regla!r}")
        vistos.add(regla)
        runner = g.get("runner", "")
        if runner not in RUNNERS_DECLARADOS:
            raise ConfigInvalida(f"regla {regla!r}: runner desconocido {runner!r}")
        gate = Gate(
            regla=regla,
            runner=runner,
            activo=bool(g.get("activo", True)),
            comando=g.get("comando"),
            chequeo=g.get("chequeo"),
            timeout_s=int(g.get("timeout_s", TIMEOUT_DEFAULT_S)),
        )
        if gate.activo:
            _exigir_runner_real(gate)
        gates.append(gate)
    return gates


def _exigir_runner_real(gate: Gate) -> None:
    """Imposible por diseño activar una regla que no se puede comprobar."""
    if gate.runner == "modelo":
        raise ConfigInvalida(
            f"regla {gate.regla!r}: runner 'modelo' declarado SIN implementacion — "
            "no puede estar activa (PRP-006: se activa cuando exista runner real)"
        )
    if gate.runner == "comando" and not (gate.comando or "").strip():
        raise ConfigInvalida(f"regla {gate.regla!r}: runner 'comando' sin comando")
    if gate.runner == "estatico" and gate.chequeo not in CHEQUEOS:
        raise ConfigInvalida(
            f"regla {gate.regla!r}: chequeo estatico desconocido {gate.chequeo!r} "
            f"(disponibles: {sorted(CHEQUEOS)})"
        )


# ---------- ejecucion ----------

def correr_gates(gates: list[Gate], worktree: Path) -> list[ResultadoGate]:
    """Corre TODOS los gates activos sobre el worktree (evidencia por gate)."""
    activos = [g for g in gates if g.activo]
    if not worktree.is_dir():
        return [
            ResultadoGate(
                regla=g.regla,
                estado="no_ejecutable",
                evidencia=f"worktree ausente: {worktree} — el gate no se pudo correr",
                hallazgos=[{
                    "regla": g.regla,
                    "evidencia": f"worktree ausente: {worktree}",
                }],
            )
            for g in activos
        ]
    archivos = _archivos_cambiados(worktree)
    return [_correr_gate(g, worktree, archivos) for g in activos]


def _correr_gate(gate: Gate, worktree: Path, archivos: list[Path] | None) -> ResultadoGate:
    if gate.runner == "comando":
        return _correr_comando(gate, worktree)
    return CHEQUEOS[gate.chequeo](gate, worktree, archivos)  # estatico


def _correr_comando(gate: Gate, worktree: Path) -> ResultadoGate:
    try:
        r = subprocess.run(
            shlex.split(gate.comando),
            cwd=worktree,
            capture_output=True,
            text=True,
            timeout=gate.timeout_s,
        )
    except FileNotFoundError as exc:
        return _no_ejecutable(gate, f"$ {gate.comando} → binario no encontrado ({exc.filename})")
    except subprocess.TimeoutExpired:
        return _no_ejecutable(gate, f"$ {gate.comando} → timeout tras {gate.timeout_s}s")
    except OSError as exc:
        return _no_ejecutable(gate, f"$ {gate.comando} → {type(exc).__name__}: {exc}")

    salida = (r.stdout + r.stderr).strip()
    evidencia = f"$ {gate.comando} → exit {r.returncode}; {salida[-EVIDENCIA_MAX:]}".strip("; ")
    if r.returncode == 0:
        return ResultadoGate(regla=gate.regla, estado="paso", evidencia=evidencia)
    return ResultadoGate(
        regla=gate.regla,
        estado="fallo",
        evidencia=evidencia,
        hallazgos=[{"regla": gate.regla, "evidencia": evidencia}],
    )


def _no_ejecutable(gate: Gate, evidencia: str) -> ResultadoGate:
    """Regla de oro del gate: no correr ≠ pasar. Es rechazo con hallazgo."""
    return ResultadoGate(
        regla=gate.regla,
        estado="no_ejecutable",
        evidencia=evidencia,
        hallazgos=[{"regla": gate.regla, "evidencia": evidencia}],
    )


# ---------- chequeos estaticos (deterministas, sobre archivos cambiados) ----------

def _archivos_cambiados(worktree: Path) -> list[Path] | None:
    """Los calcula EL SUPERVISOR desde git (no confia en la lista del Ejecutor)."""
    try:
        subprocess.run(
            ["git", "-C", str(worktree), "add", "-A"],
            capture_output=True, timeout=60, check=True,
        )
        r = subprocess.run(
            ["git", "-C", str(worktree), "diff", "--cached", "--name-only"],
            capture_output=True, text=True, timeout=60, check=True,
        )
    except (subprocess.SubprocessError, OSError):
        return None  # git roto: los chequeos estaticos seran no_ejecutable
    return [worktree / linea for linea in r.stdout.splitlines() if linea.strip()]


def _chequeo(
    gate: Gate, worktree: Path, archivos: list[Path] | None, criterio, descripcion: str
) -> ResultadoGate:
    if archivos is None:
        return _no_ejecutable(gate, "git no pudo listar los archivos cambiados del worktree")
    hallazgos = []
    for archivo in archivos:
        if not archivo.is_file():
            continue  # borrado: nada que revisar
        try:
            texto = archivo.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue  # binario: fuera del alcance de estos chequeos
        evidencia = criterio(archivo, texto)
        if evidencia:
            hallazgos.append({
                "regla": gate.regla,
                "evidencia": evidencia,
                "archivo": str(archivo.relative_to(worktree)),
            })
    if hallazgos:
        return ResultadoGate(
            regla=gate.regla,
            estado="fallo",
            evidencia=f"{descripcion}: {len(hallazgos)} archivo(s) con hallazgo",
            hallazgos=hallazgos,
        )
    return ResultadoGate(
        regla=gate.regla,
        estado="paso",
        evidencia=f"{descripcion}: {len(archivos)} archivo(s) cambiados, sin hallazgos",
    )


_ANY_RE = re.compile(r":\s*any\b|<any>|\bas\s+any\b")

def _sin_any(gate: Gate, worktree: Path, archivos: list[Path] | None) -> ResultadoGate:
    def criterio(archivo: Path, texto: str) -> str | None:
        if archivo.suffix not in (".ts", ".tsx"):
            return None
        m = _ANY_RE.search(texto)
        if m:
            linea = texto[: m.start()].count("\n") + 1
            return f"uso de `any` en linea {linea} (CLAUDE.md: usar `unknown`)"
        return None
    return _chequeo(gate, worktree, archivos, criterio, "sin `any` en TypeScript")


_SECRETO_RE = re.compile(
    r"sk-[A-Za-z0-9]{16,}|sbp_[A-Za-z0-9]{16,}|polar_(oat|pat)_[A-Za-z0-9]{8,}"
    r"|xox[bap]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----"
    r"|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}"
)

def _sin_secretos(gate: Gate, worktree: Path, archivos: list[Path] | None) -> ResultadoGate:
    def criterio(archivo: Path, texto: str) -> str | None:
        m = _SECRETO_RE.search(texto)
        if m:
            linea = texto[: m.start()].count("\n") + 1
            # La evidencia NUNCA repite el secreto (aprendizaje 2026-06-28).
            return f"posible secreto hardcodeado en linea {linea} (patron {m.group()[:6]}…)"
        return None
    return _chequeo(gate, worktree, archivos, criterio, "sin secretos en codigo")


def _archivos_max_500(gate: Gate, worktree: Path, archivos: list[Path] | None) -> ResultadoGate:
    def criterio(archivo: Path, texto: str) -> str | None:
        if archivo.suffix not in (".ts", ".tsx", ".js", ".jsx", ".py"):
            return None
        lineas = texto.count("\n") + (0 if texto.endswith("\n") or not texto else 1)
        if lineas > 500:
            return f"{lineas} lineas (CLAUDE.md: max 500 por archivo)"
        return None
    return _chequeo(gate, worktree, archivos, criterio, "archivos ≤500 lineas")


_CREATE_TABLE_RE = re.compile(r"create\s+table", re.IGNORECASE)
_RLS_RE = re.compile(r"enable\s+row\s+level\s+security", re.IGNORECASE)

def _rls_en_migraciones(gate: Gate, worktree: Path, archivos: list[Path] | None) -> ResultadoGate:
    def criterio(archivo: Path, texto: str) -> str | None:
        if archivo.suffix != ".sql":
            return None
        if _CREATE_TABLE_RE.search(texto) and not _RLS_RE.search(texto):
            return "crea tabla(s) sin `enable row level security` (CLAUDE.md: RLS SIEMPRE)"
        return None
    return _chequeo(gate, worktree, archivos, criterio, "RLS en migraciones nuevas")


CHEQUEOS = {
    "sin_any": _sin_any,
    "sin_secretos": _sin_secretos,
    "archivos_max_500": _archivos_max_500,
    "rls_en_migraciones": _rls_en_migraciones,
}
