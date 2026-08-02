"""Decision pura del gate 69-B: fail-closed en todas las direcciones."""
from gate_69b import decidir


def test_sin_fila_bloquea_fail_closed():
    r = decidir(None, None)
    assert r["pasa"] is False
    assert "nunca consultado" in r["razon"]


def test_no_listado_pasa():
    assert decidir({"estatus": "no_listado"}, None)["pasa"] is True


def test_sentencia_favorable_y_desvirtuado_pasan():
    assert decidir({"estatus": "sentencia_favorable"}, None)["pasa"] is True
    assert decidir({"estatus": "desvirtuado"}, None)["pasa"] is True


def test_presunto_sin_override_bloquea():
    r = decidir({"estatus": "presunto"}, None)
    assert r["pasa"] is False and "override" in r["razon"]


def test_presunto_con_override_activo_pasa_y_cita_el_override():
    ov = {"id": 7, "autorizado_por": "elisa", "vence_en": "2027-01-01T00:00:00Z",
          "invalidado": False}
    r = decidir({"estatus": "presunto"}, ov)
    assert r["pasa"] is True
    assert r["override_id"] == 7
    assert "elisa" in r["razon"]


def test_definitivo_bloquea_aunque_haya_override():
    # el override jamas aplica a definitivo (la tabla ademas lo impide por trigger)
    ov = {"id": 9, "autorizado_por": "elisa", "vence_en": "2027-01-01T00:00:00Z"}
    r = decidir({"estatus": "definitivo"}, ov)
    assert r["pasa"] is False and "SIEMPRE" in r["razon"]


def test_estatus_desconocido_bloquea_fail_closed():
    r = decidir({"estatus": "raro"}, None)
    assert r["pasa"] is False and "fail-closed" in r["razon"]
