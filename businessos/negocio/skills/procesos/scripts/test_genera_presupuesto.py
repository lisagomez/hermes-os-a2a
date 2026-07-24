"""Tests de la aritmética del presupuesto (determinista, cero tokens).

Verifican las invariantes que vende el modelo: MXN = USD × TC, el precio sale
del costo × (1+margen), las cifras de referencia por alcance no se mueven sin
querer, y el ROI cuadra. Correr:  pytest -q scripts/test_genera_presupuesto.py
"""
import genera_presupuesto as gp


def _modelo(alcance="mediano", tc=18.5, margen=0.35):
    return gp.build_model(
        alcance, tc, margen, gp.RATES, gp.PHASES,
        gp.TOOLS[gp.TIERS[alcance]], dict(gp.ROI_DEFAULTS[alcance]))


def test_precio_es_costo_por_uno_mas_margen():
    m = _modelo(margen=0.35)
    assert round(m["precio"], 2) == round(m["costo_total"] * 1.35, 2)


def test_mxn_es_usd_por_tipo_de_cambio():
    tc = 18.5
    m = _modelo(tc=tc)
    assert round(m["precio"] * tc, 2) == round(m["precio"] * tc, 2)
    # el ROI mensual también debe convertir consistentemente
    assert m["roi"]["ahorro_mes"] * tc > 0


def test_cifras_de_referencia_por_alcance():
    # Anclas de la tabla de costeo-pricing.md (redondeadas a millar).
    esperado = {"chico": 11_000, "mediano": 29_000, "grande": 67_000}
    for alcance, precio_aprox in esperado.items():
        m = _modelo(alcance)
        assert abs(m["precio"] - precio_aprox) < 3_000, (
            f"{alcance}: precio {m['precio']:.0f} lejos de {precio_aprox}")


def test_horas_totales_incluyen_pm():
    m = _modelo("mediano")
    horas_fases = sum(h[gp.TIERS["mediano"]] for _, _, h in gp.PHASES)
    # el total añade el 15% de PM sobre las horas de fases
    assert m["horas_totales"] > horas_fases


def test_reparto_humano_agente_suma_uno():
    m = _modelo("mediano")
    r = m["roi"]
    assert abs((r["pct_agente"] + r["pct_humano"]) - 1.0) < 1e-9


def test_payback_es_precio_entre_ahorro_mensual():
    m = _modelo("mediano")
    r = m["roi"]
    assert round(r["payback"], 3) == round(m["precio"] / r["ahorro_mes"], 3)


def test_mayor_alcance_mayor_precio():
    assert _modelo("chico")["precio"] < _modelo("mediano")["precio"] \
        < _modelo("grande")["precio"]


def test_margen_cero_deja_precio_igual_al_costo():
    m = _modelo(margen=0.0)
    assert round(m["precio"], 2) == round(m["costo_total"], 2)


def test_linea_base_es_volumen_por_horas_por_costo():
    m = _modelo("mediano")
    r, lb = m["roi"], m["linea_base"]
    assert lb["mensual"] == r["N"] * r["H_h"] * r["costo_hora_op"]
    assert lb["anual"] == lb["mensual"] * 12
    # el ahorro nunca puede exceder el costo actual del proceso
    assert r["ahorro_mes"] <= lb["mensual"]
