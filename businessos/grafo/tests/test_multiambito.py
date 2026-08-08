"""Tests Fase 3 (F3-A): multi-jurisdiccion, multi-dimension, no-cruce de dominios
y regimen GENERAL como wildcard."""
import json
from pathlib import Path

from evaluador import evaluar

SEED = json.loads(
    (Path(__file__).resolve().parent.parent / "seed" / "reglas.json").read_text(encoding="utf-8")
)
REGLAS = SEED["reglas"]
CATEGORIAS = SEED["categorias"]


def ev(conceptos, **ctx):
    base = {"jurisdiccion": "MX", "dimension": "fiscal", "regimen": "PM_TITULO_II", "fecha": "2026-06-15"}
    return evaluar(conceptos, REGLAS, CATEGORIAS, {**base, **ctx})


# --- Fiscal CO ----------------------------------------------------------------

def test_co_honorarios_deducible_con_fuente_co():
    r = ev([{"descripcion": "Honorarios de consultoria tributaria"}], jurisdiccion="CO")
    c = r["conceptos"][0]
    assert c["estado"] == "deducible"
    assert c["fuente"]["clave"] == "CO-ET-107-EXPENSAS"
    assert "Estatuto Tributario" in c["fuente"]["cita"]
    assert any("factura electronica" in req.lower() for req in c["checklist"])

def test_co_no_ve_reglas_mx():
    r = ev([{"descripcion": "Honorarios de consultoria"}], jurisdiccion="CO")
    assert r["fuentes"], "CO debe citar fuentes propias"
    assert all(f["clave"].startswith("CO-") for f in r["fuentes"])

def test_co_regimen_cualquiera_por_wildcard_general():
    # Los impactos CO son regimen GENERAL: aplican aunque el contexto traiga otro regimen
    r = ev([{"descripcion": "Honorarios de consultoria"}], jurisdiccion="CO", regimen="ORDINARIO")
    assert r["conceptos"][0]["estado"] == "deducible"

def test_mx_fiscal_no_usa_impactos_co():
    r = ev([{"descripcion": "Honorarios de consultoria"}])
    assert all(not f["clave"].startswith("CO-") for f in r["fuentes"])


# --- Contable MX ----------------------------------------------------------------

def test_contable_equipo_computo_nif_c6():
    r = ev([{"descripcion": "MacBook Pro para desarrollo", "importe": 45000}], dimension="contable")
    c = r["conceptos"][0]
    assert c["estado"] == "dudoso"
    assert c["fuente"]["clave"] == "MX-NIF-C6-ACTIVO-FIJO"
    assert any("NIF C-6" in b or "LISR 34" in b for b in c["banderas"])
    # requisitos generales contables presentes (CFF 28/30)
    assert any("CFF 30" in req or "5 anos" in req for req in c["checklist"])

def test_contable_no_cita_reglas_fiscales():
    r = ev([{"descripcion": "MacBook Pro"}], dimension="contable")
    assert all(f["clave"] != "MX-LISR-34-VII" for f in r["fuentes"])

def test_fiscal_sigue_igual_tras_v2():
    # regresion: la expansion no cambia el dictamen fiscal MX de Fase 2
    r = ev([{"descripcion": "Honorarios de consultoria fiscal"}])
    assert r["conceptos"][0]["fuente"]["clave"] == "MX-LISR-27-V"


# --- Contractual MX -------------------------------------------------------------

def test_clausula_penal_dudoso_con_ccf_1843():
    r = ev([{"descripcion": "Clausula penal del 20% por incumplimiento"}], dimension="contractual")
    c = r["conceptos"][0]
    assert c["categoria"] == "CLAUSULA_PENAL"
    assert c["estado"] == "dudoso"
    assert c["fuente"]["clave"] == "MX-CCF-1843-PENA"
    assert any("1843" in b for b in c["banderas"])

def test_clausula_confidencialidad():
    r = ev([{"descripcion": "Confidencialidad y no divulgacion de informacion"}], dimension="contractual")
    c = r["conceptos"][0]
    assert c["categoria"] == "CLAUSULA_CONFIDENCIALIDAD"
    assert c["fuente"]["clave"] == "MX-LFPDPPP2025-20-CONFIDENCIALIDAD"

def test_contractual_checklist_incluye_elementos_del_contrato():
    r = ev([{"descripcion": "Condiciones de pago: 50% anticipo"}], dimension="contractual")
    c = r["conceptos"][0]
    assert c["categoria"] == "CLAUSULA_PAGO"
    assert any("Consentimiento" in req or "firma" in req.lower() for req in c["checklist"])

def test_contractual_nunca_afirma_deducible():
    # dimension contractual: el grafo solo marca 'dudoso' o requisitos; nunca 'deducible'
    textos = ["Condiciones de pago mensuales", "Clausula penal", "Confidencialidad",
              "Terminacion anticipada con preaviso de 30 dias"]
    r = ev([{"descripcion": t} for t in textos], dimension="contractual")
    assert all(c["estado"] == "dudoso" for c in r["conceptos"])


# --- No-cruce de dominios --------------------------------------------------------

def test_texto_contractual_no_clasifica_en_fiscal():
    r = ev([{"descripcion": "Clausula de confidencialidad del contrato"}])  # dimension fiscal
    c = r["conceptos"][0]
    assert c["categoria"] is None
    assert c["estado"] == "dudoso"
    assert c["razon"] == "sin regla aplicable"

def test_texto_de_gasto_no_clasifica_en_contractual():
    r = ev([{"descripcion": "Carga de gasolina magna"}], dimension="contractual")
    assert r["conceptos"][0]["categoria"] is None


# --- Regulatorio MX: drones/RPAS (Fase 8) ----------------------------------------

def test_drones_delivery_permitido_con_requisitos_y_fuente_lac():
    r = ev(
        [{"descripcion": "Uso de drones para delivery en Mexico"}],
        dimension="regulatorio", regimen="GENERAL",
    )
    c = r["conceptos"][0]
    assert c["categoria"] == "DRONES_DELIVERY"
    assert c["estado"] == "permitido"
    assert any(f["clave"] == "MX-LAC-30-REGISTRO-RPAS" for f in r["fuentes"])
    assert any("AFAC" in req for req in c["checklist"])

def test_drones_seguro_cita_articulo_74_no_72():
    r = ev(
        [{"descripcion": "Que regulacion debe cumplir el seguro de un dron para delivery en Mexico"}],
        dimension="regulatorio", regimen="GENERAL",
    )
    c = r["conceptos"][0]
    assert c["categoria"] == "DRONES_DELIVERY"
    fuente_seguro = next(f for f in r["fuentes"] if f["clave"] == "MX-LAC-74-SEGURO-RPAS")
    assert "Art. 74" in fuente_seguro["cita"]
    assert any("AFAC" in req and "seguro" in req.lower() for req in c["checklist"])

def test_drones_no_cruza_a_fiscal_ni_viceversa():
    r = ev([{"descripcion": "Uso de drones para delivery en Mexico"}])  # dimension fiscal (default)
    assert r["conceptos"][0]["categoria"] is None
    assert r["conceptos"][0]["estado"] == "dudoso"


# --- Regulatorio MX: agentes de seguros (Fase 8b) -- regresion del incidente ------
# 2026-07-10, #dep-legal: "quiero ser un agente de seguros para drones delivery"
# clasifico como DRONES_DELIVERY (keyword "drones") y el grafo devolvio un
# veredicto de OPERADOR de RPAS para una pregunta de INTERMEDIARIO de seguros.

def test_agente_de_seguros_para_drones_no_clasifica_como_drones_delivery():
    r = ev(
        [{"descripcion": "quiero ser un agente de seguros para drones delivery"}],
        dimension="regulatorio", regimen="GENERAL",
    )
    c = r["conceptos"][0]
    assert c["categoria"] == "AGENTES_SEGUROS"
    assert c["categoria"] != "DRONES_DELIVERY"

def test_agente_de_seguros_permitido_con_autorizacion_cnsf():
    r = ev(
        [{"descripcion": "requisitos para ser agente de seguros en Mexico"}],
        dimension="regulatorio", regimen="GENERAL",
    )
    c = r["conceptos"][0]
    assert c["categoria"] == "AGENTES_SEGUROS"
    assert c["estado"] == "permitido"
    fuente = next(f for f in r["fuentes"] if f["clave"] == "MX-LISF-93-AUTORIZACION-AGENTE")
    assert "Art. 91" in fuente["cita"] and "93" in fuente["cita"]
    assert any("CNSF" in req for req in c["checklist"])
    assert any("informar" in req.lower() for req in c["checklist"]), (
        "debe incluir el deber de informacion del Art. 94 aunque no fije veredicto propio"
    )

def test_drones_delivery_puro_sigue_clasificando_bien_tras_el_fix():
    # No-regresion: una pregunta SOLO de operar el dron (sin mencionar seguros/agente)
    # debe seguir cayendo en DRONES_DELIVERY como antes del fix.
    r = ev(
        [{"descripcion": "Uso de drones para delivery en Mexico"}],
        dimension="regulatorio", regimen="GENERAL",
    )
    assert r["conceptos"][0]["categoria"] == "DRONES_DELIVERY"

def test_agentes_seguros_no_cruza_a_fiscal():
    r = ev([{"descripcion": "quiero ser agente de seguros"}])  # dimension fiscal (default)
    assert r["conceptos"][0]["categoria"] is None
    assert r["conceptos"][0]["estado"] == "dudoso"

def test_agente_seguros_checklist_incluye_ramos_y_flag_de_garantia_sin_verificar():
    r = ev(
        [{"descripcion": "requisitos para ser agente de seguros en Mexico"}],
        dimension="regulatorio", regimen="GENERAL",
    )
    c = r["conceptos"][0]
    assert any(f["clave"] == "MX-LISF-25-93-RAMOS-AGENTE" for f in r["fuentes"])
    assert any("ramo" in req.lower() for req in c["checklist"])
    assert any("garantia" in req.lower() and "no se encontro" in req.lower() for req in c["checklist"]), (
        "el checklist debe decir explicitamente que NO se encontro requisito de "
        "garantia/fianza del agente en el texto primario, no inventarlo"
    )


# --- Datos personales MX (LFPDPPP 2025) ----------------------------------------
# Contrato de determinismo con enriquecimiento-a2a: estas descripciones son las
# CONSTANTES canonicas que envia su gate_grafo; cada una debe caer en exactamente
# una categoria del ambito. Si un assert de estos se rompe, el gate del waterfall
# enrichment deja de ser determinista.

def test_dp_fuente_publica_permitido():
    r = ev([{"descripcion": "consulta a fuente publica oficial"}], dimension="datos-personales")
    c = r["conceptos"][0]
    assert c["categoria"] == "DATOS_FUENTE_PUBLICA"
    assert c["estado"] == "permitido"
    assert c["fuente"]["clave"] == "MX-LFPDPPP2025-9-II-FUENTE-PUBLICA"
    assert any("NO eliminada" in b for b in c["banderas"])

def test_dp_contacto_corporativo_permitido():
    r = ev([{"descripcion": "inferencia de correo corporativo por patron de correo de dominio"}],
           dimension="datos-personales")
    c = r["conceptos"][0]
    assert c["categoria"] == "DATOS_CONTACTO_CORPORATIVO"
    assert c["estado"] == "permitido"
    assert any("aviso de privacidad" in req.lower() for req in c["checklist"])

def test_dp_persona_fisica_dudoso():
    r = ev([{"descripcion": "dato de persona fisica para prospeccion"}], dimension="datos-personales")
    c = r["conceptos"][0]
    assert c["categoria"] == "DATOS_CONTACTO_PERSONA_FISICA"
    assert c["estado"] == "dudoso"
    assert c["fuente"]["clave"] == "MX-LFPDPPP2025-14-17-CONTACTO-PF"

def test_dp_transferencia_dudoso():
    r = ev([{"descripcion": "transferencia internacional de datos a proveedor de enriquecimiento"}],
           dimension="datos-personales")
    c = r["conceptos"][0]
    assert c["categoria"] == "DATOS_TRANSFERENCIA_INTL"
    assert c["estado"] == "dudoso"

def test_dp_sin_regla_aplicable_fail_safe_dudoso():
    r = ev([{"descripcion": "algo totalmente ajeno al dominio"}], dimension="datos-personales")
    assert r["conceptos"][0]["estado"] == "dudoso"

def test_dp_no_cruza_a_contractual():
    # "confidencialidad" es keyword de CLAUSULA_CONFIDENCIALIDAD (contractual):
    # en el ambito datos-personales NO debe clasificar
    r = ev([{"descripcion": "Confidencialidad y no divulgacion"}], dimension="datos-personales")
    assert r["conceptos"][0]["categoria"] is None


# --- Propiedad industrial MX (LFPPI): marcas y patentes -----------------------
# Origen: un despacho real listaba "Registro de marcas y patentes" entre sus
# servicios y el grafo no tenia nada que decir. No era vocabulario: faltaban las
# reglas.

def test_marca_registro_permitido_con_fuente_lfppi():
    r = ev([{"descripcion": "Registro de marcas y patentes"}], dimension="regulatorio", regimen="GENERAL")
    c = r["conceptos"][0]
    assert c["categoria"] == "MARCAS_REGISTRO"
    assert c["estado"] == "permitido"
    assert "LFPPI" in c["fuente"]["cita"]
    # El derecho exclusivo NACE del registro: es el punto que distingue usar de registrar.
    assert any("EXCLUSIVO" in req for req in c["checklist"])


def test_marca_declara_la_caducidad_de_pleno_derecho():
    """Los dos plazos que matan un registro sin que el Instituto avise."""
    r = ev([{"descripcion": "declaracion de uso de la marca"}], dimension="regulatorio", regimen="GENERAL")
    c = r["conceptos"][0]
    assert c["categoria"] == "MARCAS_REGISTRO"
    banderas = " ".join(c["banderas"])
    assert "PLENO DERECHO" in banderas
    assert "10-08-2018" in banderas  # transicion: registros previos exceptuados del Art. 233
    assert any("tercer aniversario" in req for req in c["checklist"])


def test_patente_vigencia_corre_desde_la_solicitud():
    r = ev([{"descripcion": "solicitar una patente de invencion"}], dimension="regulatorio", regimen="GENERAL")
    c = r["conceptos"][0]
    assert c["categoria"] == "PATENTES_INVENCIONES"
    assert c["estado"] == "permitido"
    assert "Arts. 53" in c["fuente"]["cita"]
    assert any("PRESENTACION" in b for b in c["banderas"])


def test_propiedad_industrial_no_cruza_a_fiscal():
    """Una consulta fiscal no debe clasificar en categorias regulatorias."""
    r = ev([{"descripcion": "Registro de marcas y patentes"}])  # dimension fiscal por defecto
    assert r["conceptos"][0]["categoria"] != "MARCAS_REGISTRO"


def test_marca_blanca_no_es_una_marca_registrable():
    """Control negativo del vocabulario propio de la casa: 'marca blanca' es
    white-label, no propiedad industrial. Sin la exclusion, cada mencion del
    modelo de negocio de la fabrica dispararia un dictamen de marcas."""
    r = ev([{"descripcion": "servicios de marca blanca para clientes"}], dimension="regulatorio", regimen="GENERAL")
    assert r["conceptos"][0]["categoria"] is None


def test_frase_que_nombra_ambas_resuelve_determinista():
    """Un concepto solo puede caer en UNA categoria. Cuando la frase nombra
    marcas y patentes a la vez gana la keyword mas larga ('patentes'): no es un
    empate sin resolver, es la regla del clasificador. Documentado para que
    nadie lo 'arregle' anadiendo keywords que rompan el determinismo."""
    r = ev([{"descripcion": "Proteccion de patentes, marcas y derechos de autor"}],
           dimension="regulatorio", regimen="GENERAL")
    assert r["conceptos"][0]["categoria"] == "PATENTES_INVENCIONES"


# --- Vocabulario: formas derivadas y traducciones equivalentes ----------------
# La frontera de palabra del clasificador rechazaba "juicios sucesorios" cuando
# la keyword era "juicio sucesorio", e "inmobiliario" teniendo "inmueble". Las
# frases de abajo son literales del sitio de un despacho real.

def test_plural_no_rompe_la_clasificacion():
    r = ev([{"descripcion": "Gestion de juicios sucesorios intestamentarios"}],
           dimension="regulatorio", regimen="GENERAL")
    assert r["conceptos"][0]["categoria"] == "TESTAMENTOS_SUCESIONES"


def test_forma_derivada_inmobiliario_encuentra_la_regla_de_inmuebles():
    r = ev([{"descripcion": "Especialistas en derecho inmobiliario"}],
           dimension="regulatorio", regimen="GENERAL")
    assert r["conceptos"][0]["categoria"] == "COMPRAVENTA_INMUEBLES"


def test_etiqueta_amplia_de_area_NO_se_fuerza_a_una_categoria():
    """Decision explicita, no un olvido: 'derecho corporativo' abarca constitucion,
    asambleas, fusiones, poderes y holding, y el clasificador solo puede devolver
    UNA. Dictaminar sobre una de ellas seria responder con seguridad a una
    pregunta que nadie hizo; el fail-safe es la respuesta correcta."""
    for etiqueta in ("Derecho corporativo", "Environmental Consulting", "Business Law"):
        r = ev([{"descripcion": etiqueta}], dimension="regulatorio", regimen="GENERAL")
        assert r["conceptos"][0]["categoria"] is None, etiqueta
        assert r["conceptos"][0]["estado"] == "dudoso"
