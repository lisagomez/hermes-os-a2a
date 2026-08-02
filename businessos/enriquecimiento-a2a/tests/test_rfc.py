"""rfc_offline: validacion local. Los digitos verificadores de los fixtures
estan calculados A MANO con la tabla del anexo SAT (no con el propio codigo:
un test que reproduce la logica que prueba no prueba nada — regla 2026-07-13)."""
from rfc import digito_verificador, evaluar_rfc, normalizar

# " ABC680524P7" -> suma 1108, 1108 % 11 = 8, dv = 11-8 = 3   (PM, a mano)
PM_VALIDO = "ABC680524P73"
# "GOML851230AB" -> suma 1158, 1158 % 11 = 3, dv = 11-3 = 8   (PF, a mano)
PF_VALIDO = "GOML851230AB8"


def test_normalizar_quita_separadores_y_sube():
    assert normalizar(" abc-680524 p73 ") == "ABC680524P73"


def test_digito_verificador_pm_calculado_a_mano():
    assert digito_verificador(PM_VALIDO) == "3"


def test_digito_verificador_pf_calculado_a_mano():
    assert digito_verificador(PF_VALIDO) == "8"


def test_pm_valido():
    r = evaluar_rfc(PM_VALIDO)
    assert r == {"rfc": PM_VALIDO, "tipo": "PM", "veredicto": "valido",
                 "razon": "formato, fecha y digito verificador correctos"}


def test_pf_valido():
    r = evaluar_rfc(PF_VALIDO)
    assert r["tipo"] == "PF" and r["veredicto"] == "valido"


def test_dv_incorrecto_es_dudoso_no_invalido():
    # fail-safe sobre el propio algoritmo: una divergencia local no bloquea
    r = evaluar_rfc("ABC680524P79")
    assert r["veredicto"] == "dudoso"
    assert "verificador" in r["razon"]


def test_formato_imposible_es_invalido():
    for malo in ("NOESUNRFC", "AB1234567890", "ABCD12345"):
        assert evaluar_rfc(malo)["veredicto"] == "invalido"


def test_fecha_imposible_es_invalido():
    r = evaluar_rfc("ABC681335P73")  # mes 13, dia 35
    assert r["veredicto"] == "invalido"
    assert "fecha" in r["razon"]


def test_vacio_es_invalido():
    assert evaluar_rfc("")["veredicto"] == "invalido"
