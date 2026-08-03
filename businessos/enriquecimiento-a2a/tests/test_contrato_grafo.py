"""Paridad del contrato de determinismo con el grafo (PR #198).

Los strings canonicos de gate_grafo.CONCEPTOS deben existir VERBATIM en los
tests del grafo (businessos/grafo/tests/test_multiambito.py, seccion datos-
personales): un typo aqui caeria en el fail-safe 'dudoso' del evaluador y
bloquearia la cascada en silencio (objecion BAJA del ataque adversarial).
Corre solo en dev (en la imagen Docker no viaja el arbol del grafo).
"""
from pathlib import Path

import gate_grafo

TESTS_GRAFO = Path(__file__).resolve().parents[2] / "grafo" / "tests" / "test_multiambito.py"


def test_conceptos_canonicos_verbatim_en_los_tests_del_grafo():
    contrato = TESTS_GRAFO.read_text(encoding="utf-8")
    for concepto in gate_grafo.CONCEPTOS:
        assert concepto in contrato, (
            f"el concepto canonico {concepto!r} no aparece verbatim en "
            f"{TESTS_GRAFO.name}: el determinismo del gate esta roto"
        )
