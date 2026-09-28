"""Las reglas del grafo estan FIJADAS al paquete de conocimiento de seed/paquete/PIN.json.

Congeladas desde el corte 97d9f9e (2026-09-27); desde 2026-09-28 se GENERAN del recorte del
paquete (prp-grafo-lee-paquete.md). Sembrar aqui una regla nueva crearia una segunda fuente que
se desvia de la unica. En CI lo vigila el job `grafo-congelado`; esta prueba hace que tambien se
ponga rojo al correr el pytest del grafo en local (README, "Tests"). test_paquete.py comprueba
que reglas.json sea el generado del pin.

Si esta prueba falla, NO se actualiza CONGELADO.sha256 a mano para ponerla verde: la regla nueva
se siembra en la fuente unica y aqui se sube el pin (seed/actualiza_paquete.py), con firma del
laboratorio.
"""
import hashlib
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]
HUELLAS = RAIZ / "businessos" / "grafo" / "seed" / "CONGELADO.sha256"


def _huellas() -> list[tuple[str, str]]:
    pares = []
    for linea in HUELLAS.read_text(encoding="utf-8").splitlines():
        if not linea.strip() or linea.startswith("#"):
            continue
        esperado, ruta = linea.split(maxsplit=1)
        pares.append((esperado, ruta.strip()))
    return pares


def test_congela_reglas_y_seed_generado():
    rutas = {ruta for _, ruta in _huellas()}
    assert rutas == {
        "businessos/grafo/seed/reglas.json",
        "businessos/grafo/seed/02-seed.sql",
    }, f"CONGELADO.sha256 debe cubrir reglas.json y 02-seed.sql, cubre {sorted(rutas)}"


def test_reglas_sin_cambios_desde_el_corte():
    for esperado, ruta in _huellas():
        real = hashlib.sha256((RAIZ / ruta).read_bytes()).hexdigest()
        assert real == esperado, (
            f"{ruta} cambio: las reglas del grafo estan FIJADAS al paquete de seed/paquete/PIN.json. "
            "Las reglas nuevas se siembran en la fuente unica (PRP-005) y aqui se sube el pin "
            "con seed/actualiza_paquete.py, con firma del laboratorio."
        )
