"""chequeos_buzon.py — chequeos estaticos del departamento BUZON (SPEC-buzon-a2a §3).

ADAPTADOR, no reimplementacion: el motor de politicas vive en
`buzon-a2a/politicas.py` (vendorado a la imagen del supervisor por el Dockerfile,
patron trio-contrato/contrato.py). Aqui solo se traduce Resultado → ResultadoGate
y se enruta cada borrador del worktree. UNA sola implementacion de los 11 gates:
la que corre en runtime (buzon-a2a) es la misma que juzga el supervisor.

Que juzga aqui: borradores serializados que el motor deja en el worktree bajo
`buzon/borradores/*.json`, cada uno con {borrador, contexto} (el contexto lo
arma quien produce el borrador; sin el, el gate es `no_ejecutable`, jamas
`paso` — fail-safe del motor de gates).

Import unidireccional: importa de `gates` y SE REGISTRA en `gates.CHEQUEOS` al
importarse (executor.py lo importa). gates.py no lo conoce.

⚠️ El Dockerfile del supervisor DEBE copiar este archivo Y politicas.py o el
servicio entra en crash-loop (aprendizaje 2026-07-10).
"""
from __future__ import annotations

import json
from pathlib import Path

import gates
import politicas
from gates import Gate, ResultadoGate

DIR_BORRADORES = "buzon/borradores"


def _no_ejecutable(gate: Gate, evidencia: str) -> ResultadoGate:
    return ResultadoGate(
        regla=gate.regla, estado="no_ejecutable", evidencia=evidencia,
        hallazgos=[{"regla": gate.regla, "evidencia": evidencia}],
    )


def _sin_git(gate: Gate) -> ResultadoGate:
    return _no_ejecutable(gate, "git no pudo listar los archivos cambiados del worktree")


def _borradores(worktree: Path, archivos: list[Path]) -> list[tuple[str, dict]]:
    """Borradores cambiados: [(ruta relativa, payload)]. Un JSON ilegible NO se
    ignora: se devuelve con payload vacio para que el gate lo declare."""
    salida = []
    for archivo in archivos:
        try:
            rel = str(archivo.relative_to(worktree))
        except ValueError:
            continue
        if not (rel.startswith(DIR_BORRADORES + "/") and rel.endswith(".json")):
            continue
        try:
            salida.append((rel, json.loads(archivo.read_text(encoding="utf-8"))))
        except (OSError, json.JSONDecodeError):
            salida.append((rel, {}))
    return salida


def _chequeo(nombre: str):
    """Fabrica el chequeo del gate `nombre` corriendo politicas.GATES[nombre]."""
    fn_politica = politicas.GATES[nombre]

    def chequeo(gate: Gate, worktree: Path, archivos: list[Path] | None) -> ResultadoGate:
        if archivos is None:
            return _sin_git(gate)
        pares = _borradores(worktree, archivos)
        if not pares:
            return ResultadoGate(
                regla=gate.regla, estado="paso",
                evidencia=f"{nombre}: ningun borrador de correo en el cambio",
            )
        hallazgos: list[dict] = []
        for rel, payload in pares:
            borrador = payload.get("borrador")
            contexto = payload.get("contexto")
            if not isinstance(borrador, dict) or not isinstance(contexto, dict):
                return _no_ejecutable(
                    gate, f"{rel}: falta 'borrador' o 'contexto' (no se puede juzgar)")
            resultado = fn_politica(borrador, contexto)
            if not resultado.paso:
                hallazgos.append({
                    "regla": gate.regla, "archivo": rel,
                    "evidencia": f"[{resultado.severidad}] {resultado.evidencia}",
                })
        if hallazgos:
            return ResultadoGate(
                regla=gate.regla, estado="fallo",
                evidencia=f"{nombre}: {len(hallazgos)} hallazgo(s) en {len(pares)} borrador(es)",
                hallazgos=hallazgos,
            )
        return ResultadoGate(
            regla=gate.regla, estado="paso",
            evidencia=f"{nombre}: {len(pares)} borrador(es) revisados, sin hallazgos",
        )

    chequeo.__name__ = f"_{nombre}"
    return chequeo


# Los 11 gates de la SPEC, con el prefijo buzon_ para no colisionar con los
# chequeos base del supervisor (sin_secretos ya existe con otro alcance: aquel
# mira archivos del repo, este mira el cuerpo del correo).
CHEQUEOS_BUZON = {f"buzon_{nombre}": _chequeo(nombre) for nombre in politicas.GATES}

# Registro en el catalogo del motor: importar este modulo = chequeos disponibles.
gates.CHEQUEOS.update(CHEQUEOS_BUZON)
