"""Tests de contrato_sc.validar_sc_spec (PRP-013, Fase 1).

Specs validas pasan y se normalizan; specs invalidas rechazan con mensaje que
dice exactamente que. Cero modelo, cero red: puro contrato.
"""
from __future__ import annotations

import copy

import pytest

from contrato_sc import SpecInvalida, validar_sc_spec


def spec_escrow() -> dict:
    """La spec de ejemplo del PRP-013, completa y valida."""
    return {
        "sc_spec": {
            "version": 1,
            "nombre": "escrow-compraventa-maquinaria",
            "plantilla": "escrow-v1",
            "descripcion": "Deposito en garantia con arbitro.",
            "canal_destino": "canal-clientes-demo",
            "organizaciones": ["Org1MSP", "Org2MSP"],
            "roles": [
                {"id": "comprador", "msp": "Org1MSP"},
                {"id": "vendedor", "msp": "Org2MSP"},
                {"id": "arbitro", "msp": "Org1MSP", "atributo": "rol=arbitro"},
            ],
            "activos": [
                {
                    "id": "deposito",
                    "campos": [
                        {"nombre": "monto", "tipo": "uint", "requerido": True},
                        {"nombre": "moneda", "tipo": "string", "enum": ["USDC", "MXN"]},
                        {"nombre": "fecha_limite", "tipo": "timestamp", "requerido": True},
                    ],
                }
            ],
            "estados": [
                "creado", "fondeado", "entregado", "liberado",
                "disputado", "resuelto", "cancelado",
            ],
            "transiciones": [
                {"de": "creado", "a": "fondeado", "quien": ["comprador"], "funcion": "fondear"},
                {"de": "fondeado", "a": "entregado", "quien": ["vendedor"], "funcion": "marcar_entrega"},
                {"de": "entregado", "a": "liberado", "quien": ["comprador"], "funcion": "liberar_pago"},
                {"de": "fondeado", "a": "disputado", "quien": ["comprador", "vendedor"], "funcion": "abrir_disputa"},
                {"de": "disputado", "a": "resuelto", "quien": ["arbitro"], "funcion": "resolver",
                 "regla": "dentro_de_plazo(fecha_limite + 30d)"},
                {"de": "creado", "a": "cancelado", "quien": ["comprador"], "funcion": "cancelar"},
            ],
            "eventos": [
                {"nombre": "DepositoFondeado", "en": "fondear"},
                {"nombre": "DisputaAbierta", "en": "abrir_disputa"},
                {"nombre": "PagoLiberado", "en": "liberar_pago"},
            ],
            "datos_privados": [
                {
                    "nombre": "terminos-comerciales",
                    "organizaciones": ["Org1MSP", "Org2MSP"],
                    "campos": ["monto", "moneda"],
                }
            ],
            "politica_endorsement": "AND('Org1MSP.peer','Org2MSP.peer')",
            "criterios_aceptacion": [
                "comprador puede fondear un deposito creado",
                "vendedor NO puede liberar_pago",
                "resolver falla fuera del plazo de 30 dias",
                "PagoLiberado se emite al liberar",
            ],
        }
    }


def _mutada(camino: list, valor) -> dict:
    """Copia de la spec valida con UNA mutacion en `camino` (para casos rojos)."""
    d = copy.deepcopy(spec_escrow())
    nodo = d["sc_spec"]
    for paso in camino[:-1]:
        nodo = nodo[paso]
    nodo[camino[-1]] = valor
    return d


def test_spec_valida_pasa_y_normaliza():
    out = validar_sc_spec(spec_escrow())
    assert out["nombre"] == "escrow-compraventa-maquinaria"
    assert out["plantilla"] == "escrow-v1"
    assert out["estados"][0] == "creado"  # el primero es el inicial
    assert len(out["transiciones"]) == 6
    assert out["transiciones"][4]["regla"] == "dentro_de_plazo(fecha_limite + 30d)"


def test_acepta_sin_envoltorio():
    assert validar_sc_spec(spec_escrow()["sc_spec"])["version"] == 1


def test_version_float_protobuf_se_normaliza():
    # Gotcha A2A: 1 llega como 1.0 via protobuf Struct.
    assert validar_sc_spec(_mutada(["version"], 1.0))["version"] == 1


@pytest.mark.parametrize(
    "camino,valor,fragmento",
    [
        (["version"], 2, "version"),
        (["nombre"], "Escrow_Con_Mayusculas", "nombre invalido"),
        (["plantilla"], "nft-v9", "fuera del catalogo"),
        (["canal_destino"], "", "canal_destino"),
        (["organizaciones"], [], "organizaciones"),
        (["roles", 0, "msp"], "Org9MSP", "no esta en `organizaciones`"),
        (["roles", 2, "atributo"], "rol arbitro", "clave=valor"),
        (["activos"], [], "activos"),
        (["activos", 0, "campos", 1, "enum"], [], "enum"),
        (["transiciones", 0, "de"], "inexistente", "no declarado"),
        (["transiciones", 0, "quien"], [], "quien"),
        (["transiciones", 0, "quien"], ["notario"], "roles desconocidos"),
        (["eventos", 0, "en"], "funcion_fantasma", "funcion inexistente"),
        (["datos_privados", 0, "organizaciones"], ["Org9MSP"], "fuera de la spec"),
        (["datos_privados", 0, "campos"], ["iban"], "no declarados"),
        (["politica_endorsement"], "", "politica_endorsement"),
        (["criterios_aceptacion"], [], "criterios_aceptacion"),
    ],
)
def test_mutaciones_invalidas_rechazan(camino, valor, fragmento):
    with pytest.raises(SpecInvalida) as exc:
        validar_sc_spec(_mutada(camino, valor))
    assert fragmento in str(exc.value)


def test_funcion_duplicada_rechaza():
    d = spec_escrow()
    trans = d["sc_spec"]["transiciones"]
    trans.append({"de": "creado", "a": "fondeado", "quien": ["comprador"], "funcion": "fondear"})
    with pytest.raises(SpecInvalida) as exc:
        validar_sc_spec(d)
    assert "funcion duplicada" in str(exc.value)


def test_estado_inalcanzable_rechaza():
    d = _mutada(["estados"], [
        "creado", "fondeado", "entregado", "liberado",
        "disputado", "resuelto", "cancelado", "limbo",
    ])
    with pytest.raises(SpecInvalida) as exc:
        validar_sc_spec(d)
    assert "inalcanzables" in str(exc.value) and "limbo" in str(exc.value)


def test_no_dict_rechaza():
    with pytest.raises(SpecInvalida):
        validar_sc_spec("no soy una spec")
