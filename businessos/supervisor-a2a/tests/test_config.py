"""Tests de la config versionada de reglas (Fase 3 del PRP-006).

Invariante central: es IMPOSIBLE activar una regla que no se puede comprobar —
config invalida = el servicio no arranca.
"""
from pathlib import Path

import pytest

from gates import ConfigInvalida, cargar_config

REGLAS_REALES = Path(__file__).resolve().parent.parent / "reglas" / "software.toml"


def escribir(tmp_path: Path, contenido: str) -> Path:
    p = tmp_path / "reglas.toml"
    p.write_text(contenido, encoding="utf-8")
    return p


def test_config_real_del_departamento_software_carga():
    gates = cargar_config(REGLAS_REALES)
    reglas = {g.regla for g in gates}
    # Los gates v1 del PRP + chequeos estaticos derivados de desarrollo-software.md §2.
    assert {"build", "typecheck", "lint", "tests"} <= reglas
    assert {"sin_any", "sin_secretos", "archivos_max_500", "rls_en_migraciones"} <= reglas
    # Los gates de modelo estan DECLARADOS pero inactivos (sin runner real).
    modelo = {g.regla: g for g in gates if g.runner == "modelo"}
    assert set(modelo) == {"code_review", "security_review"}
    assert all(not g.activo for g in modelo.values())
    # Todo gate activo tiene runner ejecutable de verdad.
    for g in gates:
        if g.activo:
            assert g.runner in ("comando", "estatico")


def test_gate_de_modelo_activo_no_arranca(tmp_path):
    """Activar /code-review sin runner real es imposible por diseño."""
    p = escribir(tmp_path, '[[gate]]\nregla = "code_review"\nrunner = "modelo"\nactivo = true\n')
    with pytest.raises(ConfigInvalida, match="modelo"):
        cargar_config(p)


def test_runner_desconocido_no_arranca_aunque_inactivo(tmp_path):
    """Un typo en runner es config rota, no una regla 'declarada'."""
    p = escribir(tmp_path, '[[gate]]\nregla = "build"\nrunner = "comandoo"\nactivo = false\n')
    with pytest.raises(ConfigInvalida, match="desconocido"):
        cargar_config(p)


def test_comando_vacio_no_arranca(tmp_path):
    p = escribir(tmp_path, '[[gate]]\nregla = "build"\nrunner = "comando"\n')
    with pytest.raises(ConfigInvalida, match="sin comando"):
        cargar_config(p)


def test_chequeo_estatico_desconocido_no_arranca(tmp_path):
    p = escribir(tmp_path, '[[gate]]\nregla = "x"\nrunner = "estatico"\nchequeo = "no_existe"\n')
    with pytest.raises(ConfigInvalida, match="no_existe"):
        cargar_config(p)


def test_config_sin_gates_no_arranca(tmp_path):
    p = escribir(tmp_path, 'departamento = "software"\n')
    with pytest.raises(ConfigInvalida, match="sin gates"):
        cargar_config(p)


def test_regla_duplicada_no_arranca(tmp_path):
    p = escribir(
        tmp_path,
        '[[gate]]\nregla = "build"\nrunner = "comando"\ncomando = "true"\n'
        '[[gate]]\nregla = "build"\nrunner = "comando"\ncomando = "true"\n',
    )
    with pytest.raises(ConfigInvalida, match="duplicada"):
        cargar_config(p)


def test_config_inexistente_no_arranca(tmp_path):
    with pytest.raises(ConfigInvalida, match="no existe"):
        cargar_config(tmp_path / "nada.toml")
