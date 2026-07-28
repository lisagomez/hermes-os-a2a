"""fabric_engine.py — engine del departamento contratos_inteligentes (PRP-013).

Fabricar un smart contract NO pasa por el LLM: el FabricChaincodeEngine de la
fabrica (businessos/fabrica-sc/) parametriza una plantilla AUDITADA de forma
100% determinista a partir de la sc_spec confirmada que viaja en la tarea
(`contexto["sc_spec"]`). Aqui solo se adapta esa fabrica a la interfaz Engine
del Ejecutor (run(tarea, worktree) → {artefactos, notas}).

Convencion del departamento: el paquete generado vive en `paquete-sc/` en la
raiz del worktree — el perfil de gates "fabric" del Supervisor
(reglas/contratos_inteligentes.toml + chequeos_fabric.py) ancla ahi.

La fabrica se carga desde FABRICA_SC_DIR (imagen: /app/fabrica-sc; dev: el
directorio hermano ../fabrica-sc). Si no esta, el engine truena al CONSTRUIRSE:
un departamento activo sin motor ejecutable es config invalida, no un fallo
silencioso en runtime.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any

from contratos_sc import RegistroContratosSC
from engine import EngineError

PAQUETE_DIR = "paquete-sc"


def _cargar_fabrica():
    raiz = Path(
        os.environ.get("FABRICA_SC_DIR")
        or Path(__file__).resolve().parent.parent / "fabrica-sc"
    )
    if not (raiz / "engine" / "fabrica.py").is_file():
        raise EngineError(
            f"fabrica-sc no esta disponible en {raiz} (env FABRICA_SC_DIR); "
            "sin fabrica no hay departamento contratos_inteligentes"
        )
    for p in (str(raiz), str(raiz / "engine")):
        if p not in sys.path:
            sys.path.insert(0, p)
    import banderas  # noqa: PLC0415 — modulos propios de la fabrica (sin homonimos)
    import contrato_sc  # noqa: PLC0415
    import fabrica  # noqa: PLC0415

    return fabrica, contrato_sc, banderas


class FabricPaqueteEngine:
    """Engine determinista: sc_spec → paquete-sc/ dentro del worktree."""

    def __init__(self, registro: RegistroContratosSC | None = None) -> None:
        fabrica, contrato_sc, banderas = _cargar_fabrica()
        self._fabrica = fabrica
        self._contrato_sc = contrato_sc
        self._banderas = banderas
        self._engine = fabrica.FabricChaincodeEngine()
        self._registro = registro if registro is not None else RegistroContratosSC()

    async def run(self, tarea: dict, worktree: Path) -> dict[str, Any]:
        spec = (tarea.get("contexto") or {}).get("sc_spec")
        if not isinstance(spec, dict):
            raise EngineError(
                "tarea de contratos_inteligentes sin contexto.sc_spec: la spec "
                "confirmada es el insumo de la fabrica (PRP-013) — sin spec no "
                "se gasta ni un token ni un ciclo"
            )
        destino = worktree / PAQUETE_DIR
        try:
            manifest = self._engine.fabricar(spec, destino)
        except self._fabrica.EngineError as e:
            raise EngineError(f"la spec no encaja en la plantilla: {e}") from e

        # Registro en contratos_sc (Fase 5): fila `fabricando` con banderas G1
        # y lineage. Best-effort logueado — la fabricacion nunca depende de
        # Supabase para operar (mismo contrato que estado.py).
        normalizada = self._contrato_sc.validar_sc_spec(spec)
        banderas = self._banderas.banderas_g1(normalizada)
        await self._registro.registrar_fabricacion(tarea, manifest, banderas, normalizada)

        return {
            "artefactos": {
                "engine": "fabric-determinista",
                "plantilla": manifest["plantilla"],
                "paquete_sha256": manifest["paquete_sha256"],
                "diff_lineas": len(manifest["diff"]),
                "paquete_dir": PAQUETE_DIR,
                "banderas_g1": len(banderas),
            },
            "notas": (
                f"FabricChaincodeEngine: {manifest['nombre']} sobre "
                f"{manifest['plantilla']} ({len(manifest['diff'])} lineas "
                f"parametrizadas; sha256 {manifest['paquete_sha256'][:16]}…)"
            ),
        }
