# Hace importable el paquete del servicio desde tests/ y suma el contrato del trio.
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "trio-contrato"))
