"""Tests de la integración del enjambre (Fase 7, Fase 4): git real, hermético.

Los diffs se generan como los produce el Ejecutor (git diff --cached de un worktree
que sale de main), así que el `git apply` topológico se ejercita de verdad: diffs
disjuntos integran; diffs que chocan = conflicto → IntegracionError.
"""
from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from integracion import IntegracionError, integrar


def _git(cwd, *args, **kw):
    return subprocess.run(["git", "-C", str(cwd), *args], capture_output=True, text=True, check=True, **kw)


@pytest.fixture()
def repo(tmp_path: Path) -> Path:
    r = tmp_path / "repo"
    r.mkdir()
    subprocess.run(["git", "init", "-b", "main", str(r)], check=True, capture_output=True)
    _git(r, "config", "user.email", "t@t")
    _git(r, "config", "user.name", "t")
    (r / "README.md").write_text("base\n")
    _git(r, "add", "-A")
    _git(r, "commit", "-m", "init")
    return r


def diff_de(repo: Path, tid: str, cambios: dict[str, str]) -> str:
    """Diff basado en main, igual que lo produce el Ejecutor (worktree + add + diff --cached)."""
    wt = repo.parent / "src" / tid
    _git(repo, "worktree", "add", "-b", f"src/{tid}", str(wt))
    for ruta, contenido in cambios.items():
        p = wt / ruta
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(contenido)
    _git(wt, "add", "-A")
    salida = subprocess.run(["git", "-C", str(wt), "diff", "--cached"], capture_output=True, text=True)
    _git(repo, "worktree", "remove", "--force", str(wt))
    return salida.stdout


def sub_resultado(diff: str) -> dict:
    return {"resultado": {"diff": diff}, "veredicto": {"veredicto": "aprobado"}}


def test_diffs_disjuntos_integran(repo, tmp_path):
    ws = tmp_path / "espacio"
    subres = {
        "auth": sub_resultado(diff_de(repo, "auth", {"app/auth.ts": "export const auth = 1\n"})),
        "emails": sub_resultado(diff_de(repo, "emails", {"app/emails.ts": "export const mail = 1\n"})),
    }
    integrado = integrar(repo, ws, "cuentas-0007", ["auth", "emails"], subres)

    assert integrado["task_id"] == "cuentas-0007"
    assert integrado["worktree"] == "worktree/cuentas-0007"
    assert set(integrado["archivos"]) == {"app/auth.ts", "app/emails.ts"}
    assert integrado["artefactos"]["sub_tareas_integradas"] == ["auth", "emails"]
    # Los dos cambios viven en la rama integrada.
    wt = ws / "worktree" / "cuentas-0007"
    assert (wt / "app" / "auth.ts").read_text() == "export const auth = 1\n"
    assert (wt / "app" / "emails.ts").read_text() == "export const mail = 1\n"


def test_diffs_que_chocan_son_conflicto(repo, tmp_path):
    """Dos sub-tareas que tocan el MISMO archivo nuevo = conflicto de integración."""
    subres = {
        "a": sub_resultado(diff_de(repo, "a", {"app/x.ts": "export const x = 'a'\n"})),
        "b": sub_resultado(diff_de(repo, "b", {"app/x.ts": "export const x = 'b'\n"})),
    }
    with pytest.raises(IntegracionError) as exc:
        integrar(repo, tmp_path / "espacio", "p", ["a", "b"], subres)
    assert exc.value.hallazgos[0]["regla"] == "integracion"
    assert "'b'" in exc.value.hallazgos[0]["evidencia"]  # la 2a es la que no aplica


def test_sub_tarea_sin_cambios_se_omite(repo, tmp_path):
    subres = {
        "a": sub_resultado(diff_de(repo, "a", {"app/a.ts": "1\n"})),
        "vacia": sub_resultado(""),  # sub-tarea que no tocó nada
    }
    integrado = integrar(repo, tmp_path / "espacio", "p", ["a", "vacia"], subres)
    assert integrado["archivos"] == ["app/a.ts"]
    assert integrado["artefactos"]["sub_tareas_integradas"] == ["a", "vacia"]


def test_repo_inexistente_es_conflicto(tmp_path):
    with pytest.raises(IntegracionError, match="repo objetivo no existe"):
        integrar(tmp_path / "no-existe", tmp_path / "espacio", "p", [], {})
