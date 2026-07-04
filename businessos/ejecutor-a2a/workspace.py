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


def preparar(repo: Path, workspace_root: Path, task_id: str) -> Path:
    """Devuelve la ruta del worktree de la tarea, creandolo si no existe."""
    destino = workspace_root / "worktree" / task_id
    if destino.is_dir() and (destino / ".git").exists():
        return destino  # reintento: se reutiliza el mismo workspace

    if not repo.is_dir():
        raise WorkspaceError(f"repo objetivo no existe: {repo}")

    destino.parent.mkdir(parents=True, exist_ok=True)
    branch = f"tarea/{task_id}"
    # Primera vez: crear branch. Si el branch quedo de un intento previo, reusarlo.
    r = _git(repo, "worktree", "add", "-b", branch, str(destino))
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
