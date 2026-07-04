"""Tests del workspace aislado (Fase 2 del PRP-006): worktree por tarea, nunca main."""
import subprocess
from pathlib import Path

import pytest

import workspace as ws


@pytest.fixture()
def repo(tmp_path: Path) -> Path:
    r = tmp_path / "repo"
    r.mkdir()
    for cmd in (
        ["git", "init", "-b", "main"],
        ["git", "config", "user.email", "test@test"],
        ["git", "config", "user.name", "test"],
    ):
        subprocess.run(cmd, cwd=r, check=True, capture_output=True)
    (r / "README.md").write_text("hola\n")
    subprocess.run(["git", "add", "-A"], cwd=r, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "init"], cwd=r, check=True, capture_output=True)
    return r


def rama_de(directorio: Path) -> str:
    r = subprocess.run(
        ["git", "-C", str(directorio), "branch", "--show-current"],
        capture_output=True,
        text=True,
    )
    return r.stdout.strip()


def test_preparar_crea_worktree_fuera_de_main(repo, tmp_path):
    wt = ws.preparar(repo, tmp_path / "espacio", "t-001")
    assert wt == tmp_path / "espacio" / "worktree" / "t-001"
    assert (wt / "README.md").exists()
    assert rama_de(wt) == "tarea/t-001"  # nunca main
    assert rama_de(repo) == "main"  # el repo base no se mueve


def test_preparar_es_reutilizable_en_reintento(repo, tmp_path):
    wt1 = ws.preparar(repo, tmp_path / "espacio", "t-002")
    (wt1 / "cambio.txt").write_text("intento 1")
    wt2 = ws.preparar(repo, tmp_path / "espacio", "t-002")
    assert wt2 == wt1
    assert (wt2 / "cambio.txt").read_text() == "intento 1"  # el trabajo previo sigue ahi


def test_preparar_repo_inexistente_truena_claro(tmp_path):
    with pytest.raises(ws.WorkspaceError, match="repo objetivo"):
        ws.preparar(tmp_path / "no-existe", tmp_path / "espacio", "t-003")


def test_diff_y_archivos_reflejan_el_trabajo_real(repo, tmp_path):
    wt = ws.preparar(repo, tmp_path / "espacio", "t-004")
    (wt / "nuevo.ts").write_text("export const x = 1\n")
    diff = ws.diff_de(wt)
    assert "export const x = 1" in diff
    assert ws.archivos_cambiados(wt) == ["nuevo.ts"]


def test_limpiar_retira_el_worktree(repo, tmp_path):
    wt = ws.preparar(repo, tmp_path / "espacio", "t-005")
    assert wt.exists()
    ws.limpiar(repo, tmp_path / "espacio", "t-005")
    assert not wt.exists()
