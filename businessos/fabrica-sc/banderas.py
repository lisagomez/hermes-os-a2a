"""banderas.py — banderas G1 sobre una sc_spec normalizada (PRP-013, Fase 5).

Forma ejecutable de la doctrina del modelo de amenazas (gobernanza/
modelo-amenazas-v1.md, control G1: "cláusulas sospechosas que fuerzan
escalada"). Hasta esta fase las banderas solo existían como doctrina; aquí
ganan código. El paquete de revisión de Mission Control las muestra ARRIBA
(anti-sello-de-goma, G4) y su conteo es el score simple de specs anómalas (G3).

Heurísticas v1 (deliberadamente simples, cada una cita su cláusula doctrinal):

- B1 `plazo_sospechoso` — "plazos ≤ gracia". Toda regla `dentro_de_plazo(campo
  + Nd)`: N ≤ 0 es alta (plazo imposible); N ≤ GRACIA_MINIMA_DIAS es media (el
  plazo no deja margen operativo real a la parte que debe actuar).
- B2 `concentracion_poder` — "roles con 2+ transiciones de poder". Un rol que
  es el ÚNICO autorizado en 2+ transiciones hacia estados terminales concentra
  los desenlaces del contrato.
- B3 `condicion_unilateral` — "condiciones unilaterales". Un estado no
  terminal (distinto del inicial) cuyas salidas controla en exclusiva un solo
  rol Y con al menos una salida SIN regla: las demás partes ya comprometieron
  acciones y no tienen contra-jugada, y el poder no está condicionado. Una
  salida con regla (p.ej. `dentro_de_plazo`) es poder condicionado — el
  `resolver` del árbitro no es una cláusula sospechosa, es su prerrogativa
  acotada. El estado inicial se excluye: antes de la primera transición nadie
  ha comprometido nada.

Una bandera NO es un rechazo: es una segunda mirada obligada (4 ojos). La spec
escrow canónica del PRP levanta 2 banderas a propósito (ver tests): el
comprador concentra los desenlaces y `entregado` no tiene contra-jugada del
vendedor — hallazgos reales que la revisora debe ver, no ruido.

Entrada: la spec NORMALIZADA que devuelve `contrato_sc.validar_sc_spec`.
Salida: lista de dicts {codigo, severidad, detalle, donde} (vacía = sin
banderas). Determinista y puro: sin red, sin reloj, sin estado.
"""
from __future__ import annotations

import re

GRACIA_MINIMA_DIAS = 3

_REGLA_PLAZO = re.compile(r"dentro_de_plazo\([a-z_][a-z0-9_]* \+ (-?\d+)d\)")


def _bandera(codigo: str, severidad: str, detalle: str, donde: str) -> dict:
    return {
        "codigo": codigo,
        "severidad": severidad,
        "detalle": detalle,
        "donde": donde,
    }


def _plazos(spec: dict) -> list[dict]:
    out = []
    for t in spec["transiciones"]:
        regla = t.get("regla")
        if not isinstance(regla, str):
            continue
        m = _REGLA_PLAZO.search(regla)
        if m is None:
            continue
        dias = int(m.group(1))
        donde = f"transicion `{t['funcion']}` ({t['de']} → {t['a']})"
        if dias <= 0:
            out.append(_bandera(
                "plazo_sospechoso", "alta",
                f"plazo de {dias}d: imposible de cumplir (plazo ≤ 0)", donde,
            ))
        elif dias <= GRACIA_MINIMA_DIAS:
            out.append(_bandera(
                "plazo_sospechoso", "media",
                f"plazo de {dias}d ≤ gracia operativa minima "
                f"({GRACIA_MINIMA_DIAS}d): presiona a la parte que debe actuar",
                donde,
            ))
    return out


def _terminales(spec: dict) -> set[str]:
    con_salida = {t["de"] for t in spec["transiciones"]}
    return {e for e in spec["estados"] if e not in con_salida}


def _concentracion_poder(spec: dict) -> list[dict]:
    terminales = _terminales(spec)
    poder: dict[str, list[str]] = {}
    for t in spec["transiciones"]:
        if len(t["quien"]) == 1 and t["a"] in terminales:
            poder.setdefault(t["quien"][0], []).append(t["funcion"])
    return [
        _bandera(
            "concentracion_poder", "media",
            f"el rol `{rol}` es el unico autorizado en {len(funciones)} "
            f"transiciones hacia estados terminales: concentra los desenlaces",
            "funciones: " + ", ".join(sorted(funciones)),
        )
        for rol, funciones in sorted(poder.items())
        if len(funciones) >= 2
    ]


def _condiciones_unilaterales(spec: dict) -> list[dict]:
    terminales = _terminales(spec)
    inicial = spec["estados"][0]
    out = []
    for estado in spec["estados"]:
        if estado == inicial or estado in terminales:
            continue
        salidas = [t for t in spec["transiciones"] if t["de"] == estado]
        quienes = {rol for t in salidas for rol in t["quien"]}
        sin_regla = [t for t in salidas if not t.get("regla")]
        if len(quienes) == 1 and sin_regla:
            (rol,) = quienes
            out.append(_bandera(
                "condicion_unilateral", "alta",
                f"desde `{estado}` toda salida la controla `{rol}`: las demas "
                f"partes ya comprometieron acciones y no tienen contra-jugada",
                f"estado `{estado}`, salidas: "
                + ", ".join(sorted(t["funcion"] for t in salidas)),
            ))
    return out


def banderas_g1(spec: dict) -> list[dict]:
    """Banderas G1 de una spec normalizada, en orden estable por severidad."""
    todas = _plazos(spec) + _concentracion_poder(spec) + _condiciones_unilaterales(spec)
    orden = {"alta": 0, "media": 1}
    return sorted(todas, key=lambda b: (orden[b["severidad"]], b["codigo"], b["donde"]))
