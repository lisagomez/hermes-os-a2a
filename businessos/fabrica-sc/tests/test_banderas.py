"""Tests de banderas.banderas_g1 (PRP-013, Fase 5 — control G1/G4).

La spec escrow canonica levanta 2 banderas A PROPOSITO (concentracion de poder
del comprador + `entregado` sin contra-jugada): son hallazgos reales que la
revisora debe ver. Si un cambio las "arregla" en silencio, estos tests avisan.

Pregunta de control de cada test rojo: si borro la heuristica, ¿se pone rojo?
"""
from __future__ import annotations

import copy

from banderas import GRACIA_MINIMA_DIAS, banderas_g1
from contrato_sc import validar_sc_spec
from test_contrato_sc import spec_escrow


def _normalizada(mutar=None) -> dict:
    d = copy.deepcopy(spec_escrow())
    if mutar is not None:
        mutar(d["sc_spec"])
    return validar_sc_spec(d)


def _codigos(banderas: list[dict]) -> list[str]:
    return [b["codigo"] for b in banderas]


def test_spec_canonica_levanta_exactamente_sus_dos_banderas_conocidas():
    banderas = banderas_g1(_normalizada())
    assert _codigos(banderas) == ["condicion_unilateral", "concentracion_poder"]
    unilateral, poder = banderas
    # `entregado` solo tiene salida del comprador (no hay disputa desde ahi).
    assert "entregado" in unilateral["detalle"]
    assert unilateral["severidad"] == "alta"
    # comprador: liberar_pago y cancelar, ambas hacia terminales, en solitario.
    assert "comprador" in poder["detalle"]
    assert "cancelar" in poder["donde"] and "liberar_pago" in poder["donde"]


def test_plazo_no_positivo_es_bandera_alta():
    def mutar(sc):
        for t in sc["transiciones"]:
            if t["funcion"] == "resolver":
                t["regla"] = "dentro_de_plazo(fecha_limite + 0d)"
    banderas = banderas_g1(_normalizada(mutar))
    plazos = [b for b in banderas if b["codigo"] == "plazo_sospechoso"]
    assert len(plazos) == 1 and plazos[0]["severidad"] == "alta"
    assert "resolver" in plazos[0]["donde"]


def test_plazo_dentro_de_la_gracia_es_bandera_media():
    def mutar(sc):
        for t in sc["transiciones"]:
            if t["funcion"] == "resolver":
                t["regla"] = f"dentro_de_plazo(fecha_limite + {GRACIA_MINIMA_DIAS}d)"
    banderas = banderas_g1(_normalizada(mutar))
    plazos = [b for b in banderas if b["codigo"] == "plazo_sospechoso"]
    assert len(plazos) == 1 and plazos[0]["severidad"] == "media"


def test_plazo_holgado_no_es_bandera():
    banderas = banderas_g1(_normalizada())  # 30d en la canonica
    assert not [b for b in banderas if b["codigo"] == "plazo_sospechoso"]


def test_contra_jugada_desde_entregado_apaga_la_condicion_unilateral():
    def mutar(sc):
        sc["transiciones"].append(
            {"de": "entregado", "a": "disputado",
             "quien": ["vendedor"], "funcion": "disputar_entrega"}
        )
    banderas = banderas_g1(_normalizada(mutar))
    assert "condicion_unilateral" not in _codigos(banderas)


def test_sin_cancelar_el_comprador_ya_no_concentra_poder():
    def mutar(sc):
        sc["transiciones"] = [
            t for t in sc["transiciones"] if t["funcion"] != "cancelar"
        ]
        sc["estados"] = [e for e in sc["estados"] if e != "cancelado"]
    banderas = banderas_g1(_normalizada(mutar))
    assert "concentracion_poder" not in _codigos(banderas)


def test_estado_inicial_sin_mas_actores_no_es_unilateral():
    # `creado` lo controla solo el comprador y NO debe levantar bandera:
    # antes de la primera transicion nadie ha comprometido nada.
    banderas = banderas_g1(_normalizada())
    assert not any("creado" in b.get("donde", "") for b in banderas)


def test_orden_estable_altas_primero():
    def mutar(sc):
        for t in sc["transiciones"]:
            if t["funcion"] == "resolver":
                t["regla"] = "dentro_de_plazo(fecha_limite + 2d)"
    banderas = banderas_g1(_normalizada(mutar))
    severidades = [b["severidad"] for b in banderas]
    assert severidades == sorted(severidades, key={"alta": 0, "media": 1}.get)
