"""Paridad COPY del Dockerfile <-> modulos del servicio.

Tres post-mortems del repo (2026-07-10, 2026-07-23, 2026-07-27) son variantes
de "los tests de dev no ven la imagen": un modulo nuevo sin su COPY = crash-loop
en runtime. Este test caza el olvido en dev; el build real de la imagen es
parte del gate de terminado (se corre aparte, no aqui).
"""
import re
from pathlib import Path

SERVICIO = Path(__file__).resolve().parents[1]


def _copiados() -> set[str]:
    dockerfile = (SERVICIO / "Dockerfile").read_text(encoding="utf-8")
    archivos: set[str] = set()
    for linea in dockerfile.splitlines():
        m = re.match(r"^COPY\s+(.+)$", linea.strip())
        if m:
            partes = m.group(1).split()
            archivos.update(p for p in partes[:-1])  # el ultimo es el destino
    return archivos


def test_todo_modulo_del_servicio_esta_en_el_copy():
    modulos = {p.name for p in SERVICIO.glob("*.py")} - {"conftest.py"}
    faltan = modulos - _copiados()
    assert not faltan, f"modulos sin COPY en el Dockerfile (crash-loop en runtime): {faltan}"


def test_todo_copy_existe_en_el_servicio():
    fantasmas = {a for a in _copiados() if not (SERVICIO / a).exists()}
    assert not fantasmas, f"el Dockerfile copia archivos inexistentes: {fantasmas}"


def test_destinos_de_copy_terminan_en_slash():
    # builder legacy vs BuildKit (gotcha 2026-07-27): destino SIEMPRE ./
    dockerfile = (SERVICIO / "Dockerfile").read_text(encoding="utf-8")
    for linea in dockerfile.splitlines():
        m = re.match(r"^COPY\s+(.+)$", linea.strip())
        if m:
            destino = m.group(1).split()[-1]
            assert destino.endswith("/"), f"destino COPY sin '/' final: {linea.strip()}"
