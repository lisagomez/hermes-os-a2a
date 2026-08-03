"""El redactor y su leyenda de divulgacion (SPEC §3 gate divulgacion_presente)."""
from __future__ import annotations

import politicas
import redactor as redactor_mod


def test_leyenda_vacia_en_el_entorno_cae_al_default(monkeypatch):
    """Regresion: el compose fija BUZON_LEYENDA='' y .get(k, default) NO aplica
    el default cuando la clave existe vacia. El saliente salia sin divulgacion."""
    monkeypatch.setenv("BUZON_LEYENDA", "")
    assert redactor_mod.leyenda() == redactor_mod.LEYENDA_DEFAULT


def test_leyenda_configurada_se_respeta(monkeypatch):
    monkeypatch.setenv("BUZON_LEYENDA", "Escrito por un robot.")
    assert redactor_mod.leyenda() == "Escrito por un robot."


def test_sin_la_variable_tambien_hay_leyenda(monkeypatch):
    monkeypatch.delenv("BUZON_LEYENDA", raising=False)
    assert redactor_mod.leyenda() == redactor_mod.LEYENDA_DEFAULT


def test_el_borrador_pasa_el_gate_de_divulgacion_con_env_vacio(monkeypatch):
    """La prueba que importa: con el entorno del compose real, el gate esta verde."""
    monkeypatch.setenv("BUZON_LEYENDA", "")
    entrante = {"hilo_id": "h1", "remitente": "cliente@externo.com", "asunto": "Hola"}
    buzon = {"direccion": "atencion@digifixapp.com"}
    borrador = redactor_mod.RedactorPlantilla().redactar(entrante, buzon, "acuse_recibo")
    ctx = {"leyenda_divulgacion": redactor_mod.leyenda()}
    assert politicas.divulgacion_presente(borrador, ctx).paso
