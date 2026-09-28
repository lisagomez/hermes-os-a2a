"""reglas.json se GENERA del recorte del paquete fijado (prp-grafo-lee-paquete.md, Fases 1 y 2).

Aqui no se siembra: la fuente unica vive en el monorepo privado de la fabrica y llega solo el
recorte de los dominios que Hermes registra, con su pin. Estas pruebas se ponen rojas si alguien
edita reglas.json o el recorte a mano, si el pin y el recorte no casan, o si la herramienta que
mide las diferencias de una subida deja de ver un cambio de estado.
"""
import copy
import json
import re
import sys
from pathlib import Path

SEED_DIR = Path(__file__).resolve().parent.parent / "seed"
sys.path.insert(0, str(SEED_DIR))
import desde_paquete  # noqa: E402
import diferencias  # noqa: E402

RECORTE, PIN = desde_paquete.lee_fijado()
SEED = json.loads((SEED_DIR / "reglas.json").read_text(encoding="utf-8"))


def test_reglas_json_es_exactamente_el_generado_del_pin():
    generado = desde_paquete.texto(desde_paquete.desde_paquete(RECORTE, PIN))
    assert (SEED_DIR / "reglas.json").read_text(encoding="utf-8") == generado


def test_el_recorte_editado_a_mano_no_casa_con_el_pin(tmp_path):
    (tmp_path / "PIN.json").write_text(json.dumps(PIN), encoding="utf-8")
    tocado = (desde_paquete.PAQUETE / "recorte.json").read_text(encoding="utf-8").replace("Deber", "Deber ", 1)
    (tmp_path / "recorte.json").write_text(tocado, encoding="utf-8")
    try:
        desde_paquete.lee_fijado(tmp_path)
    except ValueError as e:
        assert "huella" in str(e)
    else:
        raise AssertionError("un recorte editado paso por el del pin")


def test_source_version_es_la_identidad_del_conocimiento_servido():
    """Contrato comun con prp-cola-huecos-regulatorios.md: <nombre>@<version> sha256:<huella del recorte>."""
    sv = SEED["_meta"]["source_version"]
    assert sv == f"{PIN['nombre']}@{PIN['version']} {PIN['sha256_recorte']}"
    assert re.fullmatch(r"@[\w-]+/[\w-]+@\d+\.\d+\.\d+ sha256:[0-9a-f]{64}", sv)


def test_lo_que_el_paquete_trae_para_otros_no_pasa_al_seed():
    assert set(SEED) == {"_meta", "jurisdicciones", "dimensiones", "categorias", "reglas"}
    assert not any(k in d for d in SEED["dimensiones"] for k in ("vocabulario", "frases"))
    assert not any("reemplaza" in r for r in SEED["reglas"])


def test_solo_los_dominios_que_hermes_registra():
    assert sorted(d["clave"] for d in RECORTE["dominios"]) == PIN["dominios"]


def test_las_diferencias_declaradas_son_las_de_este_pin():
    medido = json.loads((desde_paquete.PAQUETE / "DIFERENCIAS.json").read_text(encoding="utf-8"))
    assert medido["hacia"] == {"version": PIN["version"], "sha256_recorte": PIN["sha256_recorte"]}


def test_diferencias_no_ve_nada_entre_un_seed_y_si_mismo():
    r = diferencias.compara(SEED, SEED)
    assert r["contenido"] == [] and r["solo_orden"] == 0 and r["identicos"] == r["casos"] > 700


def test_diferencias_ve_un_cambio_de_estado():
    """Control: si una regla cambia su veredicto, la medicion lo marca como cambio de estado."""
    otro = copy.deepcopy(SEED)
    regla = next(r for r in otro["reglas"] if r["clave"] == "MX-LFPDPPP2025-20-CONFIDENCIALIDAD")
    regla["impactos"][0]["veredicto_base"] = "permitido"
    r = diferencias.compara(SEED, otro)
    assert r["cambian_estado"], "un veredicto distinto tiene que salir como cambio de estado"
