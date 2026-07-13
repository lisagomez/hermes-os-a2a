"""workspace.py — un git worktree por tarea (PRP-006). Nunca sobre main.

`preparar()` crea `<workspace_root>/worktree/<task_id>` con branch `tarea/<task_id>`;
si ya existe (reintento), lo reutiliza. `limpiar()` lo retira al concretar/cancelar
(los worktrees huerfanos bloquean branches — gotcha del PRP).
"""
from __future__ import annotations

import subprocess
from pathlib import Path


class WorkspaceError(RuntimeError):
    """No se pudo preparar el workspace aislado; el mensaje trae el porque."""


def _git(repo: Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", "-C", str(repo), *args],
        capture_output=True,
        text=True,
        timeout=60,
    )


def refrescar_master(repo: Path) -> str:
    """Intenta refrescar el remoto. Devuelve QUE paso (el que llama lo LOGUEA, no lo tira).

    Quien refresca de VERDAD en runtime es un cron del HOST (`git -C <repo> fetch origin`):
    el contenedor del Ejecutor no tiene ssh ni llave de GitHub, y no debe tenerla — ahi
    dentro corre el modelo con permisos amplios, y una llave (aunque sea de solo lectura) le
    daria acceso a los repos privados de la cuenta. La llave se queda en el host, como todos
    los secretos del trio.

    Esta funcion se conserva porque en DEV (donde si hay credencial de usuario) mantiene la
    promesa "cada tarea sale del master mas fresco", que es la mitigacion barata del choque
    entre ramas. En runtime devolvera "fetch no disponible" — y eso se VE en el log, en vez
    de fingir que el repo esta al dia (que es lo que hacia antes: mentir en silencio).
    """
    if not repo.is_dir():
        return "repo ausente"
    r = _git(repo, "fetch", "origin", "--prune")
    if r.returncode != 0:
        return (
            f"NO refrescado ({(r.stderr or '').strip()[:60]}) — en runtime lo hace el cron "
            "del host; si ESE cron no corre, las tareas salen de un master viejo"
        )
    return "master refrescado"


def _base_ref(repo: Path) -> str | None:
    """`origin/master` si existe (runtime); None en dev/tests (worktree desde HEAD)."""
    for ref in ("origin/master", "origin/main"):
        if _git(repo, "rev-parse", "--verify", "--quiet", ref).returncode == 0:
            return ref
    return None


def preparar(repo: Path, workspace_root: Path, task_id: str) -> Path:
    """Devuelve la ruta del worktree de la tarea, creandolo si no existe."""
    destino = workspace_root / "worktree" / task_id
    if destino.is_dir() and (destino / ".git").exists():
        return destino  # reintento: se reutiliza el mismo workspace

    if not repo.is_dir():
        raise WorkspaceError(f"repo objetivo no existe: {repo}")

    destino.parent.mkdir(parents=True, exist_ok=True)
    branch = f"tarea/{task_id}"
    # Primera vez: crear branch desde el master REMOTO (el mas fresco) si existe; en dev y
    # en los tests no hay remoto → desde HEAD, como siempre.
    base = _base_ref(repo)
    args = ["worktree", "add", "-b", branch, str(destino)] + ([base] if base else [])
    r = _git(repo, *args)
    if r.returncode != 0 and "already exists" in (r.stderr or ""):
        r = _git(repo, "worktree", "add", str(destino), branch)
    if r.returncode != 0:
        raise WorkspaceError(f"git worktree add fallo: {(r.stderr or r.stdout).strip()[:300]}")
    return destino


def limpiar(repo: Path, workspace_root: Path, task_id: str) -> None:
    """Retira el worktree (al concretar/cancelar). Best-effort: no truena si no esta."""
    destino = workspace_root / "worktree" / task_id
    _git(repo, "worktree", "remove", "--force", str(destino))
    _git(repo, "worktree", "prune")


def diff_de(worktree: Path) -> str:
    """Diff del trabajo hecho en el worktree (staged + unstaged vs HEAD)."""
    _git(worktree, "add", "-A")
    r = _git(worktree, "diff", "--cached")
    if r.returncode != 0:
        raise WorkspaceError(f"git diff fallo: {(r.stderr or '').strip()[:300]}")
    return r.stdout


def archivos_cambiados(worktree: Path) -> list[str]:
    r = _git(worktree, "diff", "--cached", "--name-only")
    if r.returncode != 0:
        return []
    return [linea for linea in r.stdout.splitlines() if linea.strip()]
