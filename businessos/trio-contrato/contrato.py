"""contrato.py — vocabulario comun del trio Hermes→Ejecutor→Supervisor (PRP-006, Fase 6).

Tres payloads A2A (dicts JSON) + el ciclo de estados de la tabla `tareas`:

  TAREA      Hermes → Ejecutor      (objetivo + contexto + criterios + limites)
  RESULTADO  Ejecutor → Supervisor  (worktree + diff + artefactos NO confiables)
  VEREDICTO  Supervisor → (Hermes)  (aprobado/rechazado + hallazgos con evidencia)

Validacion stdlib pura y determinista (sin pydantic: los servicios A2A ya cargan
protobuf del SDK; este contrato debe ser trivial de copiar a cualquier runtime).
Las AFIRMACIONES del Ejecutor (artefactos) viajan pero NO se confia en ellas:
el Supervisor re-ejecuta los gates (SPEC-trio §7.4).
"""
from __future__ import annotations

import re
from typing import Any

DEPARTAMENTOS = ("software",)

# Ciclo de estados de `tareas` (SPEC-trio §7.2 + escalada/cancelada).
ESTADOS = (
    "recibida",
    "en_ejecucion",
    "en_revision",
    "aprobada",
    "rechazada",
    "escalada",
    "concretada",
    "cancelada",
)

# Transiciones validas: quien escribe `tareas` DEBE respetarlas.
TRANSICIONES: dict[str, frozenset[str]] = {
    "recibida": frozenset({"en_ejecucion", "cancelada"}),
    "en_ejecucion": frozenset({"en_revision", "escalada", "cancelada"}),
    "en_revision": frozenset({"aprobada", "rechazada"}),
    "rechazada": frozenset({"en_ejecucion", "escalada", "cancelada"}),  # reintento | tope
    "aprobada": frozenset({"concretada", "cancelada"}),  # concretar = gate humano antes
    "escalada": frozenset({"en_ejecucion", "cancelada"}),  # el humano decide
    "concretada": frozenset(),
    "cancelada": frozenset(),
}

VEREDICTOS = ("aprobado", "rechazado")
GATE_ESTADOS = ("paso", "fallo", "no_ejecutable")

INTENTOS_MAX_DEFAULT = 3

# task_id se usa como nombre de directorio del worktree: solo caracteres seguros.
_TASK_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")


class ContratoInvalido(ValueError):
    """El payload no cumple el contrato del trio; el mensaje dice exactamente que."""


def _exigir(cond: bool, msg: str) -> None:
    if not cond:
        raise ContratoInvalido(msg)


def _es_lista_de_str(v: Any) -> bool:
    return isinstance(v, list) and all(isinstance(x, str) and x.strip() for x in v)


def transicion_valida(desde: str, hacia: str) -> bool:
    """True si `desde → hacia` respeta el ciclo de estados."""
    return hacia in TRANSICIONES.get(desde, frozenset())


def validar_tarea(d: Any) -> dict:
    """TAREA (Hermes → Ejecutor). Devuelve la tarea normalizada (defaults puestos)."""
    _exigir(isinstance(d, dict), "la tarea debe ser un objeto JSON")
    task_id = d.get("task_id")
    _exigir(
        isinstance(task_id, str) and bool(_TASK_ID_RE.match(task_id)),
        "task_id invalido: 1-64 chars [A-Za-z0-9._-], empieza alfanumerico "
        "(se usa como directorio del worktree)",
    )
    departamento = d.get("departamento", "software")
    _exigir(departamento in DEPARTAMENTOS, f"departamento desconocido: {departamento!r}")
    objetivo = d.get("objetivo")
    _exigir(isinstance(objetivo, str) and objetivo.strip() != "", "objetivo vacio")
    contexto = d.get("contexto", {})
    _exigir(isinstance(contexto, dict), "contexto debe ser objeto")
    criterios = d.get("criterios_aceptacion")
    _exigir(
        _es_lista_de_str(criterios) and len(criterios) >= 1,
        "criterios_aceptacion: lista no vacia de strings (Hermes SIEMPRE entrega "
        "criterios explicitos — SPEC-trio §2)",
    )
    limites = dict(d.get("limites", {}))
    _exigir(isinstance(limites, dict), "limites debe ser objeto")
    intentos_max = limites.get("intentos_max", INTENTOS_MAX_DEFAULT)
    _exigir(
        isinstance(intentos_max, int) and not isinstance(intentos_max, bool) and intentos_max >= 1,
        "limites.intentos_max: entero >= 1 (sin tope, el lazo Ejecutor↔Supervisor "
        "es un bucle infinito quemando tokens)",
    )
    limites["intentos_max"] = intentos_max
    if "modelo_pref" in limites:
        _exigir(
            isinstance(limites["modelo_pref"], str) and limites["modelo_pref"].strip() != "",
            "limites.modelo_pref: string no vacio",
        )
    observaciones = d.get("observaciones", [])
    _exigir(
        _es_lista_de_str(observaciones) or observaciones == [],
        "observaciones: lista de strings (hallazgos del rechazo previo, en reintentos)",
    )
    return {
        "task_id": task_id,
        "departamento": departamento,
        "objetivo": objetivo.strip(),
        "contexto": contexto,
        "criterios_aceptacion": list(criterios),
        "limites": limites,
        "observaciones": list(observaciones),
    }


def validar_resultado(d: Any) -> dict:
    """RESULTADO (Ejecutor → Supervisor). Artefactos = afirmaciones, NO evidencia."""
    _exigir(isinstance(d, dict), "el resultado debe ser un objeto JSON")
    task_id = d.get("task_id")
    _exigir(
        isinstance(task_id, str) and bool(_TASK_ID_RE.match(task_id)),
        "resultado.task_id invalido",
    )
    worktree = d.get("worktree")
    _exigir(
        isinstance(worktree, str) and worktree.strip() != "" and ".." not in worktree,
        "resultado.worktree: ruta (relativa al volumen compartido) sin '..'",
    )
    diff = d.get("diff", "")
    _exigir(isinstance(diff, str), "resultado.diff: string (patch unificado; puede ser vacio)")
    archivos = d.get("archivos", [])
    _exigir(_es_lista_de_str(archivos) or archivos == [], "resultado.archivos: lista de rutas")
    artefactos = d.get("artefactos", {})
    _exigir(isinstance(artefactos, dict), "resultado.artefactos: objeto (afirmaciones del Ejecutor)")
    notas = d.get("notas", "")
    _exigir(isinstance(notas, str), "resultado.notas: string")
    return {
        "task_id": task_id,
        "worktree": worktree.strip(),
        "diff": diff,
        "archivos": list(archivos),
        "artefactos": artefactos,
        "notas": notas,
    }


def _validar_hallazgo(h: Any) -> dict:
    _exigir(isinstance(h, dict), "hallazgo debe ser objeto")
    _exigir(
        isinstance(h.get("regla"), str) and h["regla"].strip() != "",
        "hallazgo.regla: nombre de la regla violada",
    )
    _exigir(
        isinstance(h.get("evidencia"), str) and h["evidencia"].strip() != "",
        "hallazgo.evidencia: obligatoria (anti-sello-de-goma: sin evidencia no hay hallazgo)",
    )
    out = {"regla": h["regla"], "evidencia": h["evidencia"]}
    if h.get("archivo") is not None:
        _exigir(isinstance(h["archivo"], str), "hallazgo.archivo: string")
        out["archivo"] = h["archivo"]
    return out


def _validar_gate(g: Any) -> dict:
    _exigir(isinstance(g, dict), "gate debe ser objeto")
    _exigir(isinstance(g.get("regla"), str) and g["regla"].strip() != "", "gate.regla requerida")
    _exigir(g.get("estado") in GATE_ESTADOS, f"gate.estado debe ser uno de {GATE_ESTADOS}")
    _exigir(
        isinstance(g.get("evidencia"), str) and g["evidencia"].strip() != "",
        "gate.evidencia: obligatoria (que comando corrio y que salio)",
    )
    return {"regla": g["regla"], "estado": g["estado"], "evidencia": g["evidencia"]}


def validar_veredicto(d: Any) -> dict:
    """VEREDICTO (Supervisor). Invariantes anti-sello-de-goma:

    - `rechazado` SIEMPRE trae hallazgos.
    - `aprobado` exige TODOS los gates en `paso` (un gate en fallo o no_ejecutable
      con veredicto aprobado es una contradiccion: se rechaza el payload).
    """
    _exigir(isinstance(d, dict), "el veredicto debe ser un objeto JSON")
    task_id = d.get("task_id")
    _exigir(
        isinstance(task_id, str) and bool(_TASK_ID_RE.match(task_id)),
        "veredicto.task_id invalido",
    )
    veredicto = d.get("veredicto")
    _exigir(veredicto in VEREDICTOS, f"veredicto debe ser uno de {VEREDICTOS}")
    gates = d.get("gates")
    _exigir(isinstance(gates, list) and len(gates) >= 1, "veredicto.gates: lista no vacia")
    gates_v = [_validar_gate(g) for g in gates]
    hallazgos = d.get("hallazgos", [])
    _exigir(isinstance(hallazgos, list), "veredicto.hallazgos: lista")
    hallazgos_v = [_validar_hallazgo(h) for h in hallazgos]

    if veredicto == "rechazado":
        _exigir(len(hallazgos_v) >= 1, "rechazado sin hallazgos: prohibido (¿rechazado por que?)")
    else:
        no_pasados = [g["regla"] for g in gates_v if g["estado"] != "paso"]
        _exigir(
            not no_pasados,
            f"aprobado con gates no pasados {no_pasados}: contradiccion anti-sello-de-goma",
        )
    return {
        "task_id": task_id,
        "veredicto": veredicto,
        "gates": gates_v,
        "hallazgos": hallazgos_v,
    }
