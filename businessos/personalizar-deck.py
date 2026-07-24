#!/usr/bin/env python3
"""Personaliza el pitch deck white-label para UN cliente (EG.CRM Hito 6).

Toma la plantilla (adquisicion/plantillas/pitch-deck-whitelabel.html) y un JSON
de marca del cliente, y emite el deck personalizado:

  - Reescribe el bloque /* BRAND:START */ ... /* BRAND:END */ con los colores.
  - Sustituye los marcadores [CLIENTE] [LOGO] [ASESOR] [CONTACTO] [FECHA].
  - VERIFICA que ningun marcador quede vivo (misma doctrina que el gate
    sin_marcadores del departamento de Procesos): si queda uno, exit 1 y NO
    escribe salida — un deck con "[CLIENTE]" enfrente del prospecto es peor
    que no tener deck.

Uso:
    python3 personalizar-deck.py --config cliente.json --out deck-cliente.html

cliente.json:
    {"cliente": "ACME S.A.", "logo": "ACME", "asesor": "Victor",
     "contacto": "ventas@consultora.mx", "fecha": "2026-07-24",
     "colores": {"primario": "#0FA3A3", "acento": "#F97316",
                 "sobre_marca": "#08181A", "fondo": "#0A1012"}}
`colores` es opcional (sin el, se queda la marca neutra de la plantilla).

El motor del Ejecutor NO corre esto contra el cliente: el deck personalizado
es material de venta y su envio pasa por la frontera de aprobacion
(enviar-salientes.py / gate humano), como todo lo de cara al cliente.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

PLANTILLA_DEFAULT = (
    Path(__file__).resolve().parent
    / "departamentos" / "adquisicion" / "plantillas" / "pitch-deck-whitelabel.html"
)

MARCADORES = ("[CLIENTE]", "[LOGO]", "[ASESOR]", "[CONTACTO]", "[FECHA]")
_BRAND_RE = re.compile(r"/\* BRAND:START.*?BRAND:END \*/", re.DOTALL)
_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{3,8}$")


def log(msg: str) -> None:
    print(f"[personalizar-deck] {msg}")


def bloque_brand(colores: dict) -> str:
    """Bloque BRAND nuevo desde los colores del cliente (validados)."""
    valores = {
        "--brand-1": colores.get("primario", "#9F7BFF"),
        "--brand-2": colores.get("acento", "#FF4D8D"),
        "--brand-on": colores.get("sobre_marca", "#0B0A10"),
        "--bg": colores.get("fondo", "#0B0A10"),
    }
    for nombre, v in valores.items():
        if not _COLOR_RE.match(v):
            raise ValueError(f"color invalido para {nombre}: {v!r} (se espera #hex)")
    lineas = "\n".join(f"    {k}:{v};" for k, v in valores.items())
    return (
        "/* BRAND:START — personalizado por personalizar-deck.py */\n"
        f"  :root{{\n{lineas}\n  }}\n  /* BRAND:END */"
    )


def personalizar(plantilla: str, config: dict) -> str:
    requeridos = ("cliente", "logo", "asesor", "contacto", "fecha")
    faltan = [k for k in requeridos if not str(config.get(k, "")).strip()]
    if faltan:
        raise ValueError(f"config incompleta: faltan {faltan}")

    html = plantilla
    if config.get("colores"):
        html, n = _BRAND_RE.subn(bloque_brand(config["colores"]), html)
        if n != 1:
            raise ValueError("la plantilla no tiene UN bloque BRAND:START..BRAND:END")

    sustituciones = {
        "[CLIENTE]": str(config["cliente"]).strip(),
        "[LOGO]": str(config["logo"]).strip(),
        "[ASESOR]": str(config["asesor"]).strip(),
        "[CONTACTO]": str(config["contacto"]).strip(),
        "[FECHA]": str(config["fecha"]).strip(),
    }
    for marcador, valor in sustituciones.items():
        html = html.replace(marcador, valor)

    vivos = [m for m in MARCADORES if m in html]
    if vivos:
        raise ValueError(f"marcadores sin sustituir: {vivos} — no se emite el deck")
    return html


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--config", required=True, help="JSON de marca del cliente")
    ap.add_argument("--out", required=True, help="ruta del deck personalizado")
    ap.add_argument("--plantilla", default=str(PLANTILLA_DEFAULT))
    args = ap.parse_args()

    plantilla = Path(args.plantilla).read_text(encoding="utf-8")
    config = json.loads(Path(args.config).read_text(encoding="utf-8"))
    try:
        html = personalizar(plantilla, config)
    except ValueError as exc:
        log(f"ERROR: {exc}")
        return 1
    Path(args.out).write_text(html, encoding="utf-8")
    log(f"deck emitido: {args.out} (cliente: {config['cliente']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
