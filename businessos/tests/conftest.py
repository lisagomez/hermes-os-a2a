# Helper para importar los host-jobs de businessos/ (nombres con guion, p.ej.
# "ingest-reuniones.py") desde los tests, que necesitan un identificador Python valido.
# Mismo directorio padre que trio-contrato/conftest.py (hace importable lo de al lado),
# pero via importlib porque el nombre de archivo no es un identificador valido.
import importlib.util
import sys
from pathlib import Path

BUSINESSOS = Path(__file__).resolve().parent.parent


def load_script(filename: str):
    """Carga businessos/<filename> (p.ej. 'ingest-reuniones.py') como modulo importable,
    sin ejecutar su bloque `if __name__ == '__main__':` (main() se llama a mano en el test
    si hace falta)."""
    path = BUSINESSOS / filename
    modname = filename.replace("-", "_").replace(".py", "")
    spec = importlib.util.spec_from_file_location(modname, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[modname] = module
    spec.loader.exec_module(module)
    return module
