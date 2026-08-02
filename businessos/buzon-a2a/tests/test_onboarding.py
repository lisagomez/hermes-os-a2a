"""Las dos reglas de politica de §11: modo espejo y relajamiento progresivo.

Se prueban los LIMITES, que es donde una regla de politica se rompe en la
practica: un dia menos, un borrador menos, una edicion en medio de la racha.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import onboarding as ob

AHORA = datetime(2026, 8, 2, 12, 0, tzinfo=timezone.utc)


def hace(dias: int) -> datetime:
    return AHORA - timedelta(days=dias)


# ---------- §11.1 modo espejo: el gate que no se salta ----------

def test_cumple_ambos_minimos_pasa():
    d = ob.puede_listo(hace(7), 20, AHORA)
    assert d.ok and "7 dia" in d.motivo


def test_un_dia_menos_no_pasa_aunque_sobren_borradores():
    d = ob.puede_listo(hace(6), 100, AHORA)
    assert not d.ok and "1 dia(s) de modo espejo" in d.motivo


def test_un_borrador_menos_no_pasa_aunque_sobren_dias():
    d = ob.puede_listo(hace(30), 19, AHORA)
    assert not d.ok and "1 borrador(es)" in d.motivo


def test_faltando_ambos_los_declara_ambos():
    d = ob.puede_listo(hace(2), 5, AHORA)
    assert not d.ok and "dia(s) de modo espejo" in d.motivo and "borrador(es)" in d.motivo


def test_sin_haber_estado_en_espejo_no_pasa():
    assert not ob.puede_listo(None, 999, AHORA).ok


def test_no_hay_atajo_por_transicion_directa():
    """Ni con flag, ni por soporte, ni para demos: la guarda vive en la transicion."""
    d = ob.puede_transicionar("espejo", "listo", espejo_desde=hace(1), borradores=1, ahora=AHORA)
    assert not d.ok
    # y saltarse el estado tampoco: configurando → listo no existe
    assert not ob.puede_transicionar("configurando", "listo").ok
    assert not ob.puede_transicionar("borrador", "activo").ok


# ---------- transiciones y sus guardas ----------

def test_configurando_a_espejo_exige_las_tres_verificaciones():
    verdes = {"dns": "verificado", "proveedor": "verificado", "politica": "verificado"}
    assert ob.puede_transicionar("configurando", "espejo", verificaciones=verdes).ok
    faltante = {**verdes, "proveedor": "esperando_tercero"}
    d = ob.puede_transicionar("configurando", "espejo", verificaciones=faltante)
    assert not d.ok and "proveedor" in d.motivo


def test_activar_exige_firma():
    base = dict(espejo_desde=hace(10), borradores=30, ahora=AHORA)
    assert not ob.puede_transicionar("listo", "activo", **base).ok
    assert ob.puede_transicionar("listo", "activo", activado_por="Elisa", **base).ok


def test_pausar_es_reversible_y_desconectar_es_terminal():
    assert ob.puede_transicionar("activo", "pausado").ok
    assert ob.puede_transicionar("pausado", "activo", activado_por="Elisa").ok
    assert ob.TRANSICIONES["desconectado"] == ()


# ---------- §11.9 relajamiento progresivo ----------

def racha(n: int, clase: str = "acuse", **kw) -> list[ob.Aprobacion]:
    return [ob.Aprobacion(clase=clase, aprobado=True, **kw) for _ in range(n)]


def test_propone_con_25_consecutivas_y_30_dias():
    d = ob.propone_relajamiento("acuse", racha(25), 30)
    assert d.ok and "25 aprobaciones" in d.motivo


def test_24_no_propone():
    assert not ob.propone_relajamiento("acuse", racha(24), 60).ok


def test_29_dias_activo_no_propone():
    d = ob.propone_relajamiento("acuse", racha(40), 29)
    assert not d.ok and "29 dia" in d.motivo


def test_una_edicion_rompe_la_racha():
    historial = racha(10) + [ob.Aprobacion("acuse", True, editado=True)] + racha(24)
    assert not ob.propone_relajamiento("acuse", historial, 60).ok
    # con una mas, la racha posterior ya alcanza el umbral
    assert ob.propone_relajamiento("acuse", historial + racha(1), 60).ok


def test_un_critico_disparado_rompe_la_racha():
    historial = racha(24) + [ob.Aprobacion("acuse", True, critico_disparado=True)]
    assert not ob.propone_relajamiento("acuse", historial, 60).ok


def test_la_racha_es_por_clase():
    historial = racha(25, clase="acuse") + racha(3, clase="catalogo")
    assert ob.propone_relajamiento("acuse", historial, 60).ok
    assert not ob.propone_relajamiento("catalogo", historial, 60).ok


def test_reversion_a_dos_rechazos():
    posterior = [ob.Aprobacion("acuse", False), ob.Aprobacion("acuse", True),
                 ob.Aprobacion("acuse", False)]
    assert ob.debe_revertir("acuse", posterior).ok
    assert not ob.debe_revertir("acuse", posterior[:1]).ok
    assert not ob.debe_revertir("otra", posterior).ok


# ---------- ayudas de la UI ----------

def test_dias_en_espejo_y_fecha_minima():
    assert ob.dias_en_espejo(hace(5), AHORA) == 5
    assert ob.dias_en_espejo(None, AHORA) == 0
    assert ob.fecha_minima_activacion(hace(0)) == AHORA + timedelta(days=7)
