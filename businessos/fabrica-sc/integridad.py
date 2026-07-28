"""integridad.py — re-verificación del paquete fabricado contra su manifest.

La usan los DOS host-jobs de la Fase 5 (PRP-013):
- verificar-red-efimera.py: antes de gastar red en un paquete alterado.
- desplegar-chaincode.py: control G5 — el hash del paquete APROBADO se
  re-verifica justo antes de `install`; lo que se despliega es bit a bit lo
  que se aprobó (gobernanza/modelo-amenazas-v1.md).

Espeja EXACTAMENTE la fórmula del manifest de engine/fabrica.py (paso 5 de
`fabricar`): sha256 por archivo + hash del árbol como concat de
relpath+sha256 en el ORDEN del dict `archivos` (que nació ordenado). Si la
fórmula de la fábrica cambia, este módulo y sus tests deben cambiar en el
mismo PR — el test de espejo (test_integridad.py) lo fija.

Puro y stdlib: sin red, sin Supabase.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path


def verificar_paquete(paquete_dir: Path | str) -> dict:
    """Verifica manifest.json contra el disco. Nunca lanza por contenido.

    Devuelve {"ok": bool, "paquete_sha256": str | None, "hallazgos": [str]}.
    ok=True exige: manifest legible, cada archivo presente con su sha256,
    cero contrabando (archivos en disco fuera del manifest, salvo el propio
    manifest.json) y paquete_sha256 recalculado idéntico al declarado.
    """
    paquete_dir = Path(paquete_dir)
    hallazgos: list[str] = []
    ruta_manifest = paquete_dir / "manifest.json"
    if not ruta_manifest.is_file():
        return {"ok": False, "paquete_sha256": None,
                "hallazgos": [f"manifest.json ausente en {paquete_dir}"]}
    try:
        manifest = json.loads(ruta_manifest.read_text())
    except (json.JSONDecodeError, OSError) as e:
        return {"ok": False, "paquete_sha256": None,
                "hallazgos": [f"manifest.json ilegible: {e}"]}
    archivos = manifest.get("archivos")
    if not isinstance(archivos, dict) or not archivos:
        return {"ok": False, "paquete_sha256": None,
                "hallazgos": ["manifest sin dict `archivos`"]}

    for rel, esperado in archivos.items():
        f = paquete_dir / rel
        if not f.is_file():
            hallazgos.append(f"archivo del manifest ausente: {rel}")
            continue
        real = hashlib.sha256(f.read_bytes()).hexdigest()
        if real != esperado:
            hallazgos.append(f"sha256 distinto en {rel}")

    en_disco = {
        str(p.relative_to(paquete_dir))
        for p in paquete_dir.rglob("*")
        if p.is_file()
    }
    contrabando = sorted(en_disco - set(archivos) - {"manifest.json"})
    hallazgos.extend(f"archivo fuera del manifest: {rel}" for rel in contrabando)

    arbol = hashlib.sha256()
    for rel, h in archivos.items():
        arbol.update(rel.encode())
        arbol.update(h.encode())
    recalculado = arbol.hexdigest()
    declarado = manifest.get("paquete_sha256")
    if recalculado != declarado:
        hallazgos.append(
            f"paquete_sha256 declarado ({str(declarado)[:16]}…) no coincide "
            f"con el recalculado ({recalculado[:16]}…)"
        )

    return {
        "ok": not hallazgos,
        "paquete_sha256": recalculado,
        "hallazgos": hallazgos,
    }
