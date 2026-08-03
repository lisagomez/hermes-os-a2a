"""Patrones de correo: derivacion y inferencia sobre plantillas CERRADAS."""
from patrones import PLANTILLAS, derivar, dominio_de, inferir, instanciar


def test_instanciar_normaliza_acentos_y_minusculas():
    assert instanciar("{nombre}.{apellido}", "María", "López") == "maria.lopez"
    assert instanciar("{inicial_nombre}{apellido}", "José", "Núñez") == "jnunez"


def test_derivar_encuentra_la_plantilla_del_correo_real():
    assert derivar("maria.lopez@acme.mx", "María", "López") == "{nombre}.{apellido}"
    assert derivar("mlopez@acme.mx", "María", "López") == "{inicial_nombre}{apellido}"


def test_derivar_sin_coincidencia_devuelve_none():
    assert derivar("gerencia@acme.mx", "María", "López") is None
    assert derivar("no-es-correo", "María", "López") is None


def test_inferir_instancia_el_patron_conocido():
    assert inferir("{nombre}.{apellido}", "María", "López", "acme.mx") == "maria.lopez@acme.mx"


def test_inferir_rechaza_patron_fuera_del_vocabulario():
    # un patron corrupto en la BD no se instancia (vocabulario cerrado)
    assert inferir("{nombre}@evil", "María", "López", "acme.mx") is None
    assert "{nombre}@evil" not in PLANTILLAS


def test_inferir_sin_datos_devuelve_none():
    assert inferir("{nombre}.{apellido}", "", "López", "acme.mx") is None
    assert inferir("{nombre}.{apellido}", "María", "López", "") is None
    assert inferir("{nombre}.{apellido}", "María", "López", "no-dominio") is None


def test_dominio_de_correo_y_url():
    assert dominio_de("maria@ACME.mx") == "acme.mx"
    assert dominio_de("https://www.acme.mx/contacto") == "acme.mx"
    assert dominio_de("acme.mx") == "acme.mx"
    assert dominio_de("sin dominio") == ""
    assert dominio_de("") == ""
