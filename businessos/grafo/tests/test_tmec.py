"""Tests del ambito T-MEC (Capitulos 4, 5 y 7 del Tratado Mexico-EEUU-Canada).

Cubren lo que el gate de procedencia NO puede ver: que cada categoria nueva
clasifique, que el vocabulario del tratado no le robe consultas al ambito
domestico ya sembrado (Ley Aduanera, logistica), que los dos veredictos `dudoso`
sean fail-safe DECLARADO, y sobre todo el invariante del motor que este ambito
casi rompe: DOS veredictos distintos vivos en la misma categoria se reportan como
contradiccion y degradan el dictamen a `dudoso` (evaluador.evaluar_concepto), asi
que cada categoria lleva UNA regla rectora y las complementarias van sin veredicto.
"""
import json
from pathlib import Path

from evaluador import clasificar, evaluar

SEED = json.loads(
    (Path(__file__).resolve().parent.parent / "seed" / "reglas.json").read_text(encoding="utf-8")
)
REGLAS = SEED["reglas"]
CATEGORIAS = SEED["categorias"]

CATS_TMEC = {
    "TMEC_TRATO_PREFERENCIAL", "TMEC_CERTIFICACION_ORIGEN", "TMEC_REGLAS_ORIGEN",
    "TMEC_VERIFICACION_ORIGEN", "TMEC_ENVIOS_ENTREGA_RAPIDA", "TMEC_RESOLUCIONES_ANTICIPADAS",
}
REGLAS_TMEC = [r for r in REGLAS if r["clave"].startswith("MX-TMEC-")]


def ev(conceptos, **ctx):
    base = {"jurisdiccion": "MX", "dimension": "regulatorio", "regimen": "GENERAL",
            "fecha": "2026-09-03"}
    return evaluar(conceptos, REGLAS, CATEGORIAS, {**base, **ctx})


def _conflictos(resultado):
    return [b for b in resultado["banderas_rojas"] if "conflicto" in b.lower()]


# --- clasificacion --------------------------------------------------------------

def test_cada_categoria_tmec_clasifica():
    """Una regla que existe pero nunca dispara es indistinguible de una que no existe."""
    sondas = {
        "trato arancelario preferencial": "TMEC_TRATO_PREFERENCIAL",
        "t-mec": "TMEC_TRATO_PREFERENCIAL",
        "certificacion de origen": "TMEC_CERTIFICACION_ORIGEN",
        "anexo 5-a": "TMEC_CERTIFICACION_ORIGEN",
        "mercancia originaria": "TMEC_REGLAS_ORIGEN",
        "de minimis": "TMEC_REGLAS_ORIGEN",
        "verificacion de origen": "TMEC_VERIFICACION_ORIGEN",
        "envios de entrega rapida": "TMEC_ENVIOS_ENTREGA_RAPIDA",
        "resolucion anticipada": "TMEC_RESOLUCIONES_ANTICIPADAS",
    }
    for texto, esperada in sondas.items():
        assert clasificar(texto, CATEGORIAS) == esperada, f"{texto!r} no clasifico en {esperada}"


def test_el_vocabulario_del_tratado_no_le_roba_consultas_al_ambito_domestico():
    """El T-MEC entra por su propio vocabulario, no canibalizando el que ya existia."""
    intactas = {
        "certificado de origen": "ORIGEN_MERCANCIAS",
        "pedimento": "DESPACHO_ADUANERO",
        "fraccion arancelaria": "CLASIFICACION_ARANCELARIA",
        "valor en aduana": "VALOR_ADUANA",
        "carta porte": "AUTOTRANSPORTE_CARGA",
        "guia aerea": "CARGA_AEREA_EAWB",
        "agente aduanal": "REPRESENTACION_ADUANAL",
    }
    for texto, esperada in intactas.items():
        assert clasificar(texto, CATEGORIAS) == esperada, f"el T-MEC se llevo {texto!r}"


def test_certificado_de_origen_del_tmec_gana_a_la_regla_domestica_por_keyword_mas_larga():
    """'certificado de origen' (LAdua) y 'certificado de origen t-mec' coexisten."""
    assert clasificar("certificado de origen", CATEGORIAS) == "ORIGEN_MERCANCIAS"
    assert clasificar("certificado de origen t-mec", CATEGORIAS) == "TMEC_CERTIFICACION_ORIGEN"


# --- procedencia ----------------------------------------------------------------

def test_toda_regla_tmec_cita_el_texto_oficial_del_tratado():
    assert len(REGLAS_TMEC) == 15, f"se esperaban 15 reglas del T-MEC, hay {len(REGLAS_TMEC)}"
    for r in REGLAS_TMEC:
        assert r["jurisdiccion"] == "MX"
        assert r["dimension"] == "regulatorio"
        assert r["fuente_url"].startswith("https://www.gob.mx/cms/uploads/attachment/file/"), r["clave"]
        assert "T-MEC" in r["fuente_cita"], f"{r['clave']} no nombra el tratado"
        assert "DOF 29-06-2020" in r["fuente_cita"], f"{r['clave']} no fecha su promulgacion"
        # Entrada en vigor del Tratado: 01-07-2020. Ninguna regla puede ser anterior.
        assert r["vigente_desde"] == "2020-07-01", r["clave"]
        assert r["vigente_hasta"] is None
        assert all(imp["regimen"] == "GENERAL" for imp in r["impactos"])


def test_todo_parametro_numerico_declara_verificar():
    """Plazos y montos del tratado: cotejo pendiente declarado, como manda el seed."""
    for r in REGLAS_TMEC:
        for imp in r["impactos"]:
            numericos = {
                k: v for k, v in imp["parametros"].items()
                if isinstance(v, (int, float)) and not isinstance(v, bool)
            }
            if numericos:
                assert imp["parametros"].get("verificar") is True, f"{r['clave']}: {numericos}"


# --- el invariante del motor: un veredicto por categoria -------------------------

def test_ninguna_categoria_tmec_mezcla_dos_veredictos():
    """Dos veredictos distintos vivos en una categoria = contradiccion en el motor.

    Es el fallo que este ambito podia introducir sin que ningun gate lo viera: el
    seed valida cada regla por separado, y la contradiccion solo nace al juntarlas.
    """
    por_categoria: dict[str, set[str]] = {}
    for r in REGLAS:
        for imp in r["impactos"]:
            cat = imp.get("categoria")
            if cat in CATS_TMEC and imp.get("veredicto_base"):
                por_categoria.setdefault(cat, set()).add(imp["veredicto_base"])
    for cat, veredictos in por_categoria.items():
        assert len(veredictos) == 1, f"{cat} tiene veredictos en conflicto: {veredictos}"
    assert set(por_categoria) == CATS_TMEC, "hay categoria T-MEC sin ninguna regla rectora"


def test_ninguna_consulta_tmec_sale_con_bandera_de_contradiccion():
    for texto in ["trato arancelario preferencial", "certificacion de origen",
                  "mercancia originaria", "verificacion de origen",
                  "envios de entrega rapida", "resolucion anticipada"]:
        r = ev([{"descripcion": texto}])
        assert not _conflictos(r), f"{texto!r} salio con contradiccion: {_conflictos(r)}"


def test_el_articulo_720_no_contradice_a_la_ley_aduanera_y_suma_su_fuente():
    """El T-MEC entra en una categoria YA poblada: debe complementar, no pelear."""
    r = ev([{"descripcion": "agente aduanal"}])
    concepto = r["conceptos"][0]
    assert concepto["categoria"] == "REPRESENTACION_ADUANAL"
    assert concepto["estado"] == "permitido"
    assert not _conflictos(r)
    # la regla domestica sigue siendo la rectora (es la mas reciente y la que dictamina)
    assert "Ley Aduanera" in concepto["razon"]
    citas = " | ".join(f["cita"] for f in r["fuentes"])
    assert "Ley Aduanera" in citas and "T-MEC" in citas, citas


# --- fail-safe declarado ---------------------------------------------------------

def test_los_dos_dudoso_son_fail_safe_declarado():
    """`dudoso` por hueco DECLARADO (no accidental): la bandera tiene que decirlo."""
    esperados = {
        "TMEC_REGLAS_ORIGEN": "Anexo 4-B",
        "TMEC_ENVIOS_ENTREGA_RAPIDA": "fail-safe declarado",
    }
    dudosos = {
        imp["categoria"]
        for r in REGLAS_TMEC for imp in r["impactos"]
        if imp.get("veredicto_base") == "dudoso"
    }
    assert dudosos == set(esperados), dudosos
    for r in REGLAS_TMEC:
        for imp in r["impactos"]:
            if imp.get("veredicto_base") == "dudoso":
                banderas = " ".join(imp["banderas"])
                assert esperados[imp["categoria"]] in banderas, imp["categoria"]


def test_calificar_una_mercancia_concreta_no_se_afirma():
    """La pregunta que el grafo NO puede responder tiene que salir dudosa y citada."""
    r = ev([{"descripcion": "mi mercancia originaria de la fraccion 8471.30"}])
    concepto = r["conceptos"][0]
    assert concepto["estado"] == "dudoso"
    assert concepto["fuente"] is not None, "dudoso sin fuente = opinion sin respaldo"
    assert r["disclaimer"]


def test_el_de_minimis_de_courier_no_promete_exencion():
    r = ev([{"descripcion": "envios de entrega rapida"}])
    concepto = r["conceptos"][0]
    assert concepto["estado"] == "dudoso"
    banderas = " ".join(r["banderas_rojas"])
    assert "PISO" in banderas or "piso" in banderas
    checklist = " ".join(r["checklist"])
    assert "Reglas Generales de Comercio Exterior" in checklist


# --- el ambito no cruza ----------------------------------------------------------

def test_el_tmec_no_contamina_una_consulta_fiscal():
    """La clasificacion no cruza dominios: en fiscal, el vocabulario T-MEC no existe."""
    r = evaluar(
        [{"descripcion": "trato arancelario preferencial"}], REGLAS, CATEGORIAS,
        {"jurisdiccion": "MX", "dimension": "fiscal", "regimen": "PM_TITULO_II",
         "fecha": "2026-09-03"},
    )
    assert r["conceptos"][0]["categoria"] is None
    assert r["conceptos"][0]["estado"] == "dudoso"


def test_la_regla_domestica_de_origen_ya_no_dice_que_los_tratados_no_estan_sembrados():
    """La bandera de la Ley Aduanera quedaba rancia al sembrar el T-MEC: no mentir."""
    ladua = next(r for r in REGLAS if r["clave"] == "MX-LADUA-59-36A-ORIGEN")
    banderas = " ".join(ladua["impactos"][0]["banderas"])
    assert "TMEC_" in banderas, "la regla domestica no reconoce que el T-MEC ya esta sembrado"
    assert "Anexo 4-B" in banderas, "sigue faltando declarar lo que NO se sembro"
