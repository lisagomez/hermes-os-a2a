"""Corpus de inyecciones — regresion obligatoria (SPEC-buzon-a2a §8).

Criterio: >=50 casos y CERO escapes. Este test es el equivalente al fuzzing y
debe correr en cada cambio de prompt, de modelo o de skill: sin el, cambiar el
motor reabre vectores cerrados y nadie se entera.

Dos capas por caso:
  - saneado_elimina → el contenido oculto NO sobrevive a saneado.sanear()
  - gate_rojo       → el gate nombrado caza el ataque si llegara al borrador
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

import politicas
import saneado

CORPUS = Path(__file__).resolve().parent.parent / "corpus" / "casos.json"
MINIMO_CASOS = 50

FAMILIAS = {
    "instruccion-directa", "html-invisible", "unicode-invisible",
    "exfiltracion-destinatario", "exfiltracion-datos", "adjuntos-y-enlaces",
    "hilo-citado", "suplantacion", "cuota-y-bucle", "codificacion",
}


def casos() -> list[dict]:
    return json.loads(CORPUS.read_text(encoding="utf-8"))


def test_corpus_existe_y_cumple_el_minimo():
    assert CORPUS.is_file(), f"corpus ausente: {CORPUS}"
    assert len(casos()) >= MINIMO_CASOS, "el checklist §8 exige >=50 casos"


def test_shape_de_cada_caso():
    ids = set()
    for c in casos():
        assert c["id"] not in ids, f"id duplicado: {c['id']}"
        ids.add(c["id"])
        assert c["familia"] in FAMILIAS, f"{c['id']}: familia {c['familia']!r} desconocida"
        assert c["descripcion"].strip(), f"{c['id']}: sin descripcion"
        assert isinstance(c["correo"]["cuerpo"], str) and c["correo"]["cuerpo"].strip()
        espera = c["espera"]
        assert espera.get("saneado_elimina") or espera.get("gate_rojo"), \
            f"{c['id']}: un caso sin expectativa no prueba nada"
        if espera.get("gate_rojo"):
            assert espera["gate_rojo"] in politicas.GATES, \
                f"{c['id']}: gate {espera['gate_rojo']!r} no existe"


def test_todas_las_familias_cubiertas():
    presentes = {c["familia"] for c in casos()}
    faltan = FAMILIAS - presentes
    assert not faltan, f"familias sin ningun caso: {sorted(faltan)}"


@pytest.mark.parametrize("caso", casos(), ids=lambda c: c["id"])
def test_saneado_no_deja_escapar_lo_oculto(caso):
    """0 escapes: cada fragmento declarado DEBE desaparecer del texto saneado."""
    fragmentos = caso["espera"].get("saneado_elimina") or []
    if not fragmentos:
        pytest.skip("caso sin capa de saneado (solo gate)")
    out = saneado.sanear(caso["correo"]["cuerpo"], caso["correo"].get("es_html", False))
    for fragmento in fragmentos:
        assert fragmento not in out["texto"], (
            f"{caso['id']} ESCAPE: {fragmento!r} sobrevivio al saneado")
    assert out["eliminados"], f"{caso['id']}: se elimino contenido pero no se declaro"
