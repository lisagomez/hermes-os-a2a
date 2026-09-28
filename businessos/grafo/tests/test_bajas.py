"""Tests del mecanismo de BAJAS del seed (gen_seed_sql.py, 2026-07-30).

Por que existe: el 02-seed.sql es upsert puro — retirar una regla del JSON la
dejaba VIVA en grafo-db (caso real: MX-LFPDPPP-21-CONFIDENCIALIDAD citando la
ley 2010 abrogada, sin disparar la bandera de contradiccion porque su reemplazo
comparte veredicto). El bloque _bajas emite un DELETE idempotente antes de los
upserts. Estos tests se ponen ROJOS si alguien quita el DELETE del generador.

Desde que reglas.json se GENERA del paquete de conocimiento (prp-grafo-lee-paquete.md,
2026-09-28), el seed real ya no usa _bajas: la fuente unica retira CERRANDO vigente_hasta
y conserva la regla para juzgar hechos anteriores a su cierre (juicio a la fecha del
hecho). La regla de 2010 vuelve, cerrada al 2025-03-20: un hecho de 2024 encuentra su ley
en vez de "sin regla aplicable". El mecanismo de _bajas sigue en el generador y sus
pruebas con fixtures, para quien lo necesite.
"""
import importlib.util
import json
from pathlib import Path

SEED_DIR = Path(__file__).resolve().parent.parent / "seed"

_spec = importlib.util.spec_from_file_location("gen_seed_sql", SEED_DIR / "gen_seed_sql.py")
gen = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gen)

SEED = json.loads((SEED_DIR / "reglas.json").read_text(encoding="utf-8"))


def _seed_minimo(**extra):
    base = {
        "_meta": {"source_version": "v-test", "regimen_default": "GENERAL"},
        "jurisdicciones": [{"codigo": "MX", "nombre": "Mexico"}],
        "dimensiones": [{"codigo": "fiscal", "nombre": "Fiscal"}],
        "categorias": [{"clave": "C1", "nombre": "Cat", "keywords": ["kw unica"]}],
        "reglas": [{
            "clave": "MX-TEST-1", "jurisdiccion": "MX", "dimension": "fiscal",
            "titulo": "t", "texto_resumen": "x", "fuente_cita": "Cita",
            "fuente_url": "https://example.org", "vigente_desde": "2020-01-01",
            "vigente_hasta": None,
            "impactos": [{"categoria": "C1", "regimen": "GENERAL", "veredicto_base": "dudoso",
                          "requisitos": ["r"], "banderas": [], "parametros": {}}],
        }],
    }
    base.update(extra)
    return base


# --- validacion ---------------------------------------------------------------

def test_baja_valida_pasa_el_gate():
    seed = _seed_minimo(_bajas=["MX-VIEJA-1"])
    assert gen.validar(seed) == []


def test_clave_en_reglas_y_bajas_es_error():
    seed = _seed_minimo(_bajas=["MX-TEST-1"])
    errores = gen.validar(seed)
    assert any("_bajas" in e and "MX-TEST-1" in e for e in errores)


def test_bajas_tipo_invalido_es_error():
    seed = _seed_minimo(_bajas=["", "MX-X"])
    assert any("_bajas" in e for e in gen.validar(seed))
    seed = _seed_minimo(_bajas="MX-X")
    assert any("_bajas" in e for e in gen.validar(seed))


def test_baja_duplicada_es_error():
    seed = _seed_minimo(_bajas=["MX-VIEJA-1", "MX-VIEJA-1"])
    assert any("duplicada" in e for e in gen.validar(seed))


# --- generacion ----------------------------------------------------------------

def test_sql_emite_delete_antes_de_los_upserts_de_reglas():
    seed = _seed_minimo(_bajas=["MX-VIEJA-1"])
    sql = gen.generar_sql(seed)
    assert "delete from reglas where clave = any (array['MX-VIEJA-1']::text[]);" in sql
    assert sql.index("delete from reglas") < sql.index("insert into reglas")


def test_sin_bajas_no_emite_delete():
    sql = gen.generar_sql(_seed_minimo())
    assert "delete from reglas" not in sql


# --- regresion sobre el seed REAL -----------------------------------------------

def test_seed_real_retira_la_lfpdppp_2010_cerrandola():
    """La ley abrogada se retira CERRANDO su vigencia el dia antes de la nueva, sin _bajas."""
    reglas = {r["clave"]: r for r in SEED["reglas"]}
    assert "_bajas" not in SEED
    vieja = reglas["MX-LFPDPPP-21-CONFIDENCIALIDAD"]
    nueva = reglas["MX-LFPDPPP2025-20-CONFIDENCIALIDAD"]
    assert vieja["vigente_hasta"] == "2025-03-20"
    assert nueva["vigente_desde"] == "2025-03-21" and nueva["vigente_hasta"] is None


def test_02_seed_generado_no_purga():
    """Sin _bajas, el SQL versionado no borra: re-inserta la regla de 2010 ya cerrada."""
    sql = (SEED_DIR / "02-seed.sql").read_text(encoding="utf-8")
    assert "delete from reglas" not in sql
    assert "'MX-LFPDPPP-21-CONFIDENCIALIDAD'" in sql
