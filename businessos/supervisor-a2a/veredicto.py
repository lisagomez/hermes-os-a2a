"""veredicto.py — del resultado de los gates al VEREDICTO del contrato (PRP-006).

Invariantes (las mismas que exige `contrato.validar_veredicto`):
- aprobado ⇔ TODOS los gates activos en `paso`.
- cualquier gate en `fallo` o `no_ejecutable` → rechazado CON hallazgos
  (regla + evidencia + archivo cuando se conoce). Anti-sello-de-goma.
"""
from __future__ import annotations

from contrato import validar_veredicto

from gates import ResultadoGate


def emitir_veredicto(task_id: str, resultados: list[ResultadoGate]) -> dict:
    """Arma y AUTO-VALIDA el veredicto (un supervisor que emite payloads
    invalidos es tan inutil como un gate asumido)."""
    todos_pasaron = all(r.estado == "paso" for r in resultados)
    veredicto = {
        "task_id": task_id,
        "veredicto": "aprobado" if todos_pasaron else "rechazado",
        "gates": [
            {"regla": r.regla, "estado": r.estado, "evidencia": r.evidencia}
            for r in resultados
        ],
        "hallazgos": [h for r in resultados for h in r.hallazgos],
    }
    return validar_veredicto(veredicto)
