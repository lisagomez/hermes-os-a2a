#!/usr/bin/env python3
"""reglas.json se GENERA del recorte del paquete de conocimiento fijado en paquete/PIN.json.

La fuente unica del conocimiento vive en el monorepo privado de la fabrica (PRP-005). Aqui llega
solo el RECORTE de los dominios que Hermes registra (decision 1 de la Fase 0 del PRP
`prp-grafo-lee-paquete.md`): el paquete entero publicaria en este repo publico lo que siembren
otros proyectos. Nadie edita reglas.json a mano; para recibir reglas nuevas se sube el pin
(actualiza_paquete.py).

El paquete conserva a proposito los nombres de campo de este seed, asi que evaluador.py y
gen_seed_sql.py no cambian. Lo unico que se traduce:
  - `_meta.source_version` = `<nombre>@<version> sha256:<huella del recorte>`. Es la identidad del
    conocimiento servido (contrato comun con prp-cola-huecos-regulatorios.md): no cambiarle el
    formato sin avisar alla.
  - Lo que el paquete trae para otros consumidores no pasa: el vocabulario y las frases de cada
    dimension, `reemplaza` de cada regla, y los dominios y la procedencia (van resumidos en
    `source_version`). Sin `_bajas`: el paquete no borra, cierra `vigente_hasta`.
  - Sin `regimen_default`: todos los impactos del paquete traen su regimen explicito.

Uso:
  python3 desde_paquete.py           # escribe reglas.json
  python3 desde_paquete.py --check   # exit 1 si reglas.json no es exactamente el generado (CI)
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

SEED = Path(__file__).resolve().parent
PAQUETE = SEED / "paquete"
SEED_JSON = SEED / "reglas.json"

SOLO_PAQUETE_DIMENSION = ("vocabulario", "frases")
SOLO_PAQUETE_REGLA = ("reemplaza",)


def huella(datos: bytes) -> str:
    return "sha256:" + hashlib.sha256(datos).hexdigest()


def lee_fijado(paquete: Path = PAQUETE) -> tuple[dict, dict]:
    """(recorte, pin), comprobando que el recorte es exactamente el que el pin fija."""
    pin = json.loads((paquete / "PIN.json").read_text(encoding="utf-8"))
    crudo = (paquete / "recorte.json").read_bytes()
    if huella(crudo) != pin["sha256_recorte"]:
        raise ValueError("recorte.json no tiene la huella de PIN.json: se vendoriza tal cual, no se edita")
    recorte = json.loads(crudo)
    if recorte.get("version") != pin["version"]:
        raise ValueError(f"recorte {recorte.get('version')!r} y PIN {pin['version']!r} no son la misma version")
    dominios = sorted(d["clave"] for d in recorte["dominios"])
    if dominios != sorted(pin["dominios"]):
        raise ValueError("los dominios del recorte no son los que registra PIN.json")
    return recorte, pin


def desde_paquete(recorte: dict, pin: dict) -> dict:
    """Recorte del paquete -> seed en el formato de siempre."""
    sin = lambda d, campos: {k: v for k, v in d.items() if k not in campos}  # noqa: E731
    return {
        "_meta": {
            "descripcion": (
                f"GENERADO desde {pin['nombre']}@{pin['version']}, recorte de {len(pin['dominios'])} dominios "
                "(seed/paquete/PIN.json). No se edita a mano: las reglas se siembran en la fuente unica "
                "y aqui se sube el pin con seed/actualiza_paquete.py."
            ),
            "source_version": f"{pin['nombre']}@{pin['version']} {pin['sha256_recorte']}",
        },
        "jurisdicciones": recorte["jurisdicciones"],
        "dimensiones": [sin(d, SOLO_PAQUETE_DIMENSION) for d in recorte["dimensiones"]],
        "categorias": recorte["categorias"],
        "reglas": [sin(r, SOLO_PAQUETE_REGLA) for r in recorte["reglas"]],
    }


def texto(seed: dict) -> str:
    return json.dumps(seed, ensure_ascii=False, indent=2) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true", help="no escribe: falla si reglas.json no es el generado")
    args = ap.parse_args()
    try:
        recorte, pin = lee_fijado()
    except (ValueError, KeyError, OSError) as e:
        print(f"PAQUETE FIJADO: FALLO — {e}", file=sys.stderr)
        return 1
    generado = texto(desde_paquete(recorte, pin))
    if args.check:
        if not SEED_JSON.exists() or SEED_JSON.read_text(encoding="utf-8") != generado:
            print(
                "reglas.json NO es el generado del paquete fijado. No se edita a mano: la regla se siembra "
                "en la fuente unica y aqui se sube el pin (seed/actualiza_paquete.py).",
                file=sys.stderr,
            )
            return 1
        print(f"reglas.json = generado de {pin['nombre']}@{pin['version']} ({len(recorte['reglas'])} reglas)")
        return 0
    SEED_JSON.write_text(generado, encoding="utf-8")
    print(f"Escrito {SEED_JSON.name} desde {pin['nombre']}@{pin['version']} ({len(recorte['reglas'])} reglas)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
