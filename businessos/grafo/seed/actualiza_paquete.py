#!/usr/bin/env python3
"""Sube el pin del paquete de conocimiento: la UNICA forma de que el grafo reciba reglas nuevas.

Lo prepara un agente y lo firma el laboratorio (decision 4 de la Fase 0 de
prp-grafo-lee-paquete.md). El recorte y su PIN.json se generan en la fuente unica, con los
dominios que Hermes registra:

    npm run recorta -- --dominios <los de paquete/PIN.json> --salida <dir>   (en la fuente unica)
    python3 actualiza_paquete.py <dir>                                       (aqui)

Este script:
  1. comprueba que el recorte de <dir> tiene la huella de su PIN.json;
  2. genera el seed nuevo y lo pasa por el gate de procedencia de gen_seed_sql ANTES de tocar
     nada: si no pasa, no escribe;
  3. mide que cambia con diferencias.py (seed actual contra seed nuevo) y lo deja en
     paquete/DIFERENCIAS.json, que es lo que se declara y se firma;
  4. vendoriza recorte.json y PIN.json, y reescribe reglas.json, 02-seed.sql y las huellas
     de CONGELADO.sha256.

Lo que NO hace: firmar. El PR necesita una entrada nueva en .claude/gobernanza/BITACORA-CDC.md
firmada por el laboratorio, y `grafo-congelado` la exige.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import shutil
import sys
from pathlib import Path

SEED = Path(__file__).resolve().parent
RAIZ = SEED.parents[2]
sys.path.insert(0, str(SEED))
import desde_paquete  # noqa: E402
import diferencias  # noqa: E402

_spec = importlib.util.spec_from_file_location("gen_seed_sql", SEED / "gen_seed_sql.py")
gen = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gen)

CONGELADO = SEED / "CONGELADO.sha256"
FIJADOS = ("reglas.json", "02-seed.sql")


def reescribe_huellas() -> None:
    """Las lineas de huella de CONGELADO.sha256, conservando su cabecera de comentarios."""
    cabecera = [l for l in CONGELADO.read_text(encoding="utf-8").splitlines() if l.startswith("#")]
    huellas = [
        f"{hashlib.sha256((SEED / f).read_bytes()).hexdigest()}  businessos/grafo/seed/{f}" for f in FIJADOS
    ]
    CONGELADO.write_text("\n".join(cabecera + huellas) + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("origen", type=Path, help="directorio con recorte.json y PIN.json de `npm run recorta`")
    args = ap.parse_args()
    try:
        recorte, pin = desde_paquete.lee_fijado(args.origen)
    except (ValueError, KeyError, OSError) as e:
        print(f"PAQUETE: FALLO — {e}", file=sys.stderr)
        return 1

    viejo_crudo = desde_paquete.SEED_JSON.read_bytes()
    viejo = json.loads(viejo_crudo)
    nuevo = desde_paquete.desde_paquete(recorte, pin)
    errores = gen.validar(nuevo)
    if errores:
        print(f"GATE DE PROCEDENCIA: FALLO ({len(errores)}); no se toco nada", file=sys.stderr)
        for msg in errores:
            print(f"  - {msg}", file=sys.stderr)
        return 1

    medido = diferencias.compara(viejo, nuevo)
    reporte = {
        "_que_es": (
            "Lo que cambia al subir el pin: evaluador.py sobre el seed anterior y el nuevo (diferencias.py). "
            "Se declara y se firma en BITACORA-CDC.md; se regenera en cada subida."
        ),
        "hacia": {"version": pin["version"], "sha256_recorte": pin["sha256_recorte"]},
        "desde": {"sha256_reglas": desde_paquete.huella(viejo_crudo), "reglas": len(viejo["reglas"])},
        **medido,
    }

    destino = desde_paquete.PAQUETE
    destino.mkdir(exist_ok=True)
    if args.origen.resolve() != destino.resolve():
        for f in ("recorte.json", "PIN.json"):
            shutil.copyfile(args.origen / f, destino / f)
    (destino / "DIFERENCIAS.json").write_text(json.dumps(reporte, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    desde_paquete.SEED_JSON.write_text(desde_paquete.texto(nuevo), encoding="utf-8")
    (SEED / "02-seed.sql").write_text(gen.generar_sql(nuevo), encoding="utf-8")
    reescribe_huellas()

    print(f"pin -> {pin['nombre']}@{pin['version']} ({len(pin['dominios'])} dominios, {len(nuevo['reglas'])} reglas)")
    print(
        f"diferencias: {medido['casos']} casos · {medido['identicos']} identicos · "
        f"{medido['solo_orden']} solo de orden · {len(medido['contenido'])} de contenido · "
        f"{len(medido['cambian_estado'])} cambian un estado"
    )
    for d in medido["contenido"]:
        print(f"  - {d['id']}{'  [CAMBIA ESTADO]' if d['cambia_estado'] else ''}")
    print("FALTA: entrada NUEVA en .claude/gobernanza/BITACORA-CDC.md, firmada por el laboratorio.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
