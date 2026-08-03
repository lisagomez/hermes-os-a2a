"""Decision pura del gate 69-B: fail-closed en todas las direcciones,
incluida la FRESCURA del dictamen (QA PR #210: un no_listado rancio no abre)."""
from datetime import datetime, timedelta, timezone

from gate_69b import MAX_EDAD_DIAS_DEFAULT, decidir


def fila(estatus: str, hace_dias: int = 0, **extra) -> dict:
    consultado = datetime.now(timezone.utc) - timedelta(days=hace_dias)
    return {"estatus": estatus, "consultado_en": consultado.isoformat(), **extra}


def test_sin_fila_bloquea_fail_closed():
    r = decidir(None, None)
    assert r["pasa"] is False
    assert "nunca consultado" in r["razon"]


def test_no_listado_fresco_pasa():
    assert decidir(fila("no_listado"), None)["pasa"] is True


def test_sentencia_favorable_y_desvirtuado_pasan():
    assert decidir(fila("sentencia_favorable"), None)["pasa"] is True
    assert decidir(fila("desvirtuado"), None)["pasa"] is True


def test_presunto_sin_override_bloquea():
    r = decidir(fila("presunto"), None)
    assert r["pasa"] is False and "override" in r["razon"]


def test_presunto_con_override_activo_pasa_y_cita_el_override():
    ov = {"id": 7, "autorizado_por": "elisa", "vence_en": "2027-01-01T00:00:00Z",
          "invalidado": False}
    r = decidir(fila("presunto"), ov)
    assert r["pasa"] is True
    assert r["override_id"] == 7
    assert "elisa" in r["razon"]


def test_definitivo_bloquea_aunque_haya_override():
    # el override jamas aplica a definitivo (la tabla ademas lo impide por trigger)
    ov = {"id": 9, "autorizado_por": "elisa", "vence_en": "2027-01-01T00:00:00Z"}
    r = decidir(fila("definitivo"), ov)
    assert r["pasa"] is False and "SIEMPRE" in r["razon"]


def test_estatus_desconocido_bloquea_fail_closed():
    r = decidir(fila("raro"), None)
    assert r["pasa"] is False and "fail-closed" in r["razon"]


# ---- frescura del dictamen (fail-closed) -------------------------------------

def test_no_listado_rancio_bloquea():
    # el dato que ABRE el gate caduca: sin refresco, se cierra solo
    r = decidir(fila("no_listado", hace_dias=MAX_EDAD_DIAS_DEFAULT + 1), None)
    assert r["pasa"] is False
    assert "rancio" in r["razon"] and "vigilancia-69b" in r["razon"]


def test_no_listado_en_el_borde_de_edad_pasa():
    assert decidir(fila("no_listado", hace_dias=MAX_EDAD_DIAS_DEFAULT - 1),
                   None)["pasa"] is True


def test_sin_consultado_en_bloquea():
    r = decidir({"estatus": "no_listado"}, None)
    assert r["pasa"] is False and "frescura" in r["razon"]


def test_consultado_en_ilegible_bloquea():
    r = decidir({"estatus": "no_listado", "consultado_en": "ayer nomas"}, None)
    assert r["pasa"] is False and "frescura" in r["razon"]


def test_max_edad_dias_es_parametrizable():
    vieja = fila("no_listado", hace_dias=10)
    assert decidir(vieja, None, max_edad_dias=30)["pasa"] is True
    assert decidir(vieja, None, max_edad_dias=5)["pasa"] is False


def test_presunto_con_override_pero_dictamen_rancio_bloquea():
    # la frescura manda: un override vivo no revive un dictamen viejo
    ov = {"id": 7, "autorizado_por": "elisa", "vence_en": "2099-01-01T00:00:00Z",
          "invalidado": False}
    r = decidir(fila("presunto", hace_dias=MAX_EDAD_DIAS_DEFAULT + 10), ov)
    assert r["pasa"] is False and "rancio" in r["razon"]
