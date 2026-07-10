"""Tests de la config versionada de reglas (Fase 3 del PRP-006).

Invariante central: es IMPOSIBLE activar una regla que no se puede comprobar —
config invalida = el servicio no arranca.
"""
from pathlib import Path

import pytest

import chequeos_adquisicion  # noqa: F401 — registra los chequeos comerciales
from gates import ConfigInvalida, cargar_config, cargar_configs

DIR_REGLAS = Path(__file__).resolve().parent.parent / "reglas"
REGLAS_REALES = DIR_REGLAS / "software.toml"


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


# --- multi-departamento (Fase 9): cargar_configs sobre el directorio ---

def test_directorio_real_carga_ambos_departamentos():
    configs = cargar_configs(DIR_REGLAS)
    assert set(configs) == {"software", "adquisicion"}
    reglas_adq = {g.regla for g in configs["adquisicion"]}
    assert {
        "claims_aprobados", "precio_en_rango", "plantilla_contrato_intacta",
        "salientes_con_aprobacion", "politica_intocable", "sin_secretos",
    } <= reglas_adq
    modelo = [g for g in configs["adquisicion"] if g.runner == "modelo"]
    assert modelo and all(not g.activo for g in modelo)


def test_cargar_configs_acepta_archivo_suelto_legado():
    configs = cargar_configs(REGLAS_REALES)
    assert set(configs) == {"software"}


def test_toml_sin_departamento_no_arranca(tmp_path):
    (tmp_path / "x.toml").write_text(
        '[[gate]]\nregla = "a"\nrunner = "comando"\ncomando = "true"\n'
    )
    with pytest.raises(ConfigInvalida, match="departamento"):
        cargar_configs(tmp_path)


def test_departamento_duplicado_en_directorio_no_arranca(tmp_path):
    contenido = (
        'departamento = "software"\n'
        '[[gate]]\nregla = "a"\nrunner = "comando"\ncomando = "true"\n'
    )
    (tmp_path / "a.toml").write_text(contenido)
    (tmp_path / "b.toml").write_text(contenido)
    with pytest.raises(ConfigInvalida, match="duplicado"):
        cargar_configs(tmp_path)


def test_directorio_vacio_no_arranca(tmp_path):
    with pytest.raises(ConfigInvalida, match="sin ningun"):
        cargar_configs(tmp_path)


def test_un_toml_invalido_tumba_toda_la_carga(tmp_path):
    """Un supervisor con la MITAD de sus reglas no supervisa: todo o nada."""
    (tmp_path / "ok.toml").write_text(
        'departamento = "software"\n'
        '[[gate]]\nregla = "a"\nrunner = "comando"\ncomando = "true"\n'
    )
    (tmp_path / "roto.toml").write_text(
        'departamento = "adquisicion"\n'
        '[[gate]]\nregla = "b"\nrunner = "modelo"\nactivo = true\n'
    )
    with pytest.raises(ConfigInvalida, match="modelo"):
        cargar_configs(tmp_path)
