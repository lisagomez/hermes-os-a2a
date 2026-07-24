"""Tests del personalizador del pitch deck white-label (EG.CRM Hito 6).

Lo que fija: ningun marcador llega vivo al cliente (doctrina sin_marcadores),
los colores del cliente entran de verdad al bloque BRAND, y una config
incompleta o un color invalido NO emiten deck.

Correr: cd businessos && .venv/bin/python -m pytest tests/ -q
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

BUSINESSOS = Path(__file__).resolve().parent.parent
SCRIPT = BUSINESSOS / "personalizar-deck.py"
PLANTILLA = (BUSINESSOS / "departamentos" / "adquisicion" / "plantillas"
             / "pitch-deck-whitelabel.html")

spec = importlib.util.spec_from_file_location("personalizar_deck", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

CONFIG_OK = {
    "cliente": "ACME S.A.", "logo": "ACME", "asesor": "Victor",
    "contacto": "ventas@consultora.mx", "fecha": "2026-07-24",
    "colores": {"primario": "#0FA3A3", "acento": "#F97316",
                "sobre_marca": "#08181A", "fondo": "#0A1012"},
}


def test_plantilla_tiene_marcadores_y_brand():
    """La plantilla del repo ES plantilla: marcadores vivos + bloque BRAND."""
    html = PLANTILLA.read_text(encoding="utf-8")
    for m in mod.MARCADORES:
        assert m in html, f"la plantilla perdio el marcador {m}"
    assert html.count("BRAND:START") == 1 and html.count("BRAND:END") == 1


def test_personaliza_sin_marcadores_vivos():
    html = mod.personalizar(PLANTILLA.read_text(encoding="utf-8"), CONFIG_OK)
    for m in mod.MARCADORES:
        assert m not in html
    assert "ACME S.A." in html and "Victor" in html


def test_colores_del_cliente_entran_al_brand():
    html = mod.personalizar(PLANTILLA.read_text(encoding="utf-8"), CONFIG_OK)
    assert "--brand-1:#0FA3A3;" in html
    assert "--brand-2:#F97316;" in html
    assert "--bg:#0A1012;" in html
    # La marca neutra de la plantilla ya no gobierna el bloque BRAND:
    assert "--brand-1:#9F7BFF" not in html


def test_sin_colores_conserva_marca_neutra():
    cfg = {k: v for k, v in CONFIG_OK.items() if k != "colores"}
    html = mod.personalizar(PLANTILLA.read_text(encoding="utf-8"), cfg)
    assert "--brand-1:#9F7BFF" in html  # neutra intacta
    assert "[CLIENTE]" not in html


def test_config_incompleta_no_emite():
    cfg = dict(CONFIG_OK)
    del cfg["contacto"]
    with pytest.raises(ValueError, match="contacto"):
        mod.personalizar(PLANTILLA.read_text(encoding="utf-8"), cfg)


def test_color_invalido_no_emite():
    cfg = dict(CONFIG_OK, colores={"primario": "red; } body { display:none"})
    with pytest.raises(ValueError, match="color invalido"):
        mod.personalizar(PLANTILLA.read_text(encoding="utf-8"), cfg)


def test_claims_de_la_plantilla_son_los_aprobados():
    """Los CLAIM del deck existen TEXTUALES en claims-aprobados.txt (gate)."""
    import re
    html = PLANTILLA.read_text(encoding="utf-8")
    aprobados = {
        l.strip() for l in
        (BUSINESSOS / "departamentos" / "adquisicion" / "claims-aprobados.txt")
        .read_text(encoding="utf-8").splitlines()
        if l.strip() and not l.lstrip().startswith("#")
    }
    claims = re.findall(r'<p class="claim"[^>]*>([^<]+)', html)
    assert claims, "el deck perdio sus claims"
    for c in claims:
        assert c.strip() in aprobados, f"claim NO aprobado en el deck: {c.strip()!r}"
