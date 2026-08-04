# Hace importable el paquete del servicio (prompt, motor, store, canales, app) desde tests/.
import sys, pathlib

_base = pathlib.Path(__file__).resolve().parent
# Módulo compartido de plataforma (patrón trio-contrato): en la imagen entra por
# COPY explícito del Dockerfile; en dev/tests, por path.
sys.path.insert(0, str(_base.parent / "guardia-presupuesto"))
