# Hace importable el paquete del servicio desde tests/ y suma el contrato del trio.
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "trio-contrato"))
# politicas.py del buzon: en la imagen lo aplana el Dockerfile (COPY buzon-a2a/
# politicas.py .), en dev vive en su servicio. Va al FINAL del path a proposito:
# buzon-a2a tiene modulos homonimos (executor/card/app) que taparian los de este
# servicio si fuera antes (gotcha de modulos homonimos, 2026-07-03).
sys.path.append(str(Path(__file__).resolve().parent.parent / "buzon-a2a"))
