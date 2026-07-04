"""Tests del motor de gates (Fase 3 del PRP-006): evidencia real sobre un worktree
de fixture; gate que no puede correr = no_ejecutable con hallazgo, jamas 'asumido'."""
import subprocess
from pathlib import Path

import pytest

from gates import Gate, correr_gates


@pytest.fixture()
def worktree(tmp_path: Path) -> Path:
    """Un repo git plano hace de worktree: los gates solo necesitan git + archivos."""
    wt = tmp_path / "worktree" / "t-100"
    wt.mkdir(parents=True)
    for cmd in (
        ["git", "init", "-b", "tarea/t-100"],
        ["git", "config", "user.email", "test@test"],
        ["git", "config", "user.name", "test"],
    ):
        subprocess.run(cmd, cwd=wt, check=True, capture_output=True)
    (wt / "base.txt").write_text("base\n")
    subprocess.run(["git", "add", "-A"], cwd=wt, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "base"], cwd=wt, check=True, capture_output=True)
    return wt


def solo(resultados):
    assert len(resultados) == 1
    return resultados[0]


# ---------- gates de comando: re-ejecutar, no confiar ----------

def test_comando_exit_0_pasa_con_evidencia(worktree):
    r = solo(correr_gates([Gate("smoke", "comando", comando="git status --short")], worktree))
    assert r.estado == "paso"
    assert "git status" in r.evidencia and "exit 0" in r.evidencia
    assert r.hallazgos == []


def test_comando_exit_no_cero_falla_con_salida_como_evidencia(worktree):
    gate = Gate("tests", "comando", comando='python3 -c "print(\'1 failed: OAuth 500\'); exit(2)"')
    r = solo(correr_gates([gate], worktree))
    assert r.estado == "fallo"
    assert "exit 2" in r.evidencia
    assert "1 failed: OAuth 500" in r.evidencia  # la salida REAL es la evidencia
    assert r.hallazgos[0]["regla"] == "tests"


def test_binario_inexistente_es_no_ejecutable_no_pasado(worktree):
    r = solo(correr_gates([Gate("build", "comando", comando="npm-que-no-existe run build")], worktree))
    assert r.estado == "no_ejecutable"
    assert "no encontrado" in r.evidencia
    assert r.hallazgos[0]["regla"] == "build"  # rechazo CON hallazgo


def test_timeout_es_no_ejecutable(worktree):
    gate = Gate("lento", "comando", comando='python3 -c "import time; time.sleep(5)"', timeout_s=1)
    r = solo(correr_gates([gate], worktree))
    assert r.estado == "no_ejecutable"
    assert "timeout" in r.evidencia


def test_worktree_ausente_todo_gate_activo_es_no_ejecutable(tmp_path):
    gates = [
        Gate("build", "comando", comando="true"),
        Gate("sin_any", "estatico", chequeo="sin_any"),
        Gate("code_review", "modelo", activo=False),  # inactivo: no aparece
    ]
    resultados = correr_gates(gates, tmp_path / "no-existe")
    assert [r.regla for r in resultados] == ["build", "sin_any"]
    assert all(r.estado == "no_ejecutable" for r in resultados)
    assert all("worktree ausente" in r.evidencia for r in resultados)
    assert all(r.hallazgos for r in resultados)


# ---------- chequeos estaticos sobre los archivos cambiados ----------

def test_sin_any_detecta_y_señala_archivo(worktree):
    (worktree / "malo.ts").write_text("const x: any = 1\n")
    (worktree / "bueno.ts").write_text("const y: unknown = 1\n")
    r = solo(correr_gates([Gate("sin_any", "estatico", chequeo="sin_any")], worktree))
    assert r.estado == "fallo"
    assert [h["archivo"] for h in r.hallazgos] == ["malo.ts"]
    assert "unknown" in r.hallazgos[0]["evidencia"]  # dice como arreglarlo


def test_sin_any_pasa_con_codigo_limpio(worktree):
    (worktree / "bueno.ts").write_text("const y: unknown = 1\n")
    r = solo(correr_gates([Gate("sin_any", "estatico", chequeo="sin_any")], worktree))
    assert r.estado == "paso"


def test_sin_secretos_detecta_sin_repetir_el_secreto(worktree):
    fake = "sbp_" + "a1b2c3d4" * 3  # construido en runtime: jamas literal en el repo
    (worktree / "config.ts").write_text(f'const token = "{fake}"\n')
    r = solo(correr_gates([Gate("sin_secretos", "estatico", chequeo="sin_secretos")], worktree))
    assert r.estado == "fallo"
    assert r.hallazgos[0]["archivo"] == "config.ts"
    assert fake not in r.hallazgos[0]["evidencia"]  # la evidencia NO filtra el secreto
    assert fake not in r.evidencia


def test_archivos_max_500_detecta_archivo_largo(worktree):
    (worktree / "gigante.py").write_text("x = 1\n" * 501)
    r = solo(correr_gates([Gate("archivos_max_500", "estatico", chequeo="archivos_max_500")], worktree))
    assert r.estado == "fallo"
    assert r.hallazgos[0]["archivo"] == "gigante.py"
    assert "501" in r.hallazgos[0]["evidencia"]


def test_rls_en_migraciones_exige_rls_en_create_table(worktree):
    (worktree / "mig_sin_rls.sql").write_text("create table public.x (id int);\n")
    (worktree / "mig_con_rls.sql").write_text(
        "create table public.y (id int);\nalter table public.y enable row level security;\n"
    )
    r = solo(correr_gates(
        [Gate("rls_en_migraciones", "estatico", chequeo="rls_en_migraciones")], worktree
    ))
    assert r.estado == "fallo"
    assert [h["archivo"] for h in r.hallazgos] == ["mig_sin_rls.sql"]


def test_estaticos_solo_miran_lo_cambiado(worktree):
    """Lo ya commiteado en la base NO es hallazgo: se juzga el trabajo de la tarea."""
    (worktree / "viejo.ts").write_text("const x: any = 1\n")
    subprocess.run(["git", "add", "-A"], cwd=worktree, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "legado"], cwd=worktree, check=True, capture_output=True)
    r = solo(correr_gates([Gate("sin_any", "estatico", chequeo="sin_any")], worktree))
    assert r.estado == "paso"  # nada cambiado en esta tarea
