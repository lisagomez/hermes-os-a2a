"""Tests del host-job expediente-promocion.py (partes puras: mensaje y botón)."""
from __future__ import annotations

from conftest import load_script

mod = load_script("expediente-promocion.py")

EXP = {
    "salto": "A1->A2",
    "criterios": {
        "veredictos_de_juez": {"valor": 250, "requiere": ">=200", "cumple": True},
        "tasa_rechazo_juez": {"valor": 0.008, "requiere": "<3%", "cumple": True},
        "fallos_de_gates": {"valor": 0, "requiere": "=0", "cumple": True},
    },
}


def test_mensaje_trae_numeros_y_boton():
    m = mod.armar_mensaje("Acme Tours", "acme", EXP, 42)
    assert "EXPEDIENTE DE PROMOCIÓN #42" in m and "Acme Tours" in m
    assert "250" in m and "0.80%" in m
    assert "aprueba el expediente 42" in m  # el botón conversacional
    assert "nivel='A2' where tenant_id='acme'" in m  # y el botón SQL exacto
    assert "estado='aprobado'" in m and "Caduca en 7 días" in m


def test_mensaje_no_promueve_solo_presenta():
    m = mod.armar_mensaje("Acme", "acme", EXP, 1)
    # El job jamás ejecuta la promoción: el mensaje se la entrega a la dueña.
    assert "El botón es tuyo" in m


def test_dry_run_no_invoca_docker(capsys):
    ok = mod.enviar("hola", dry_run=True)
    assert ok is True
    assert "dry-run" in capsys.readouterr().out
