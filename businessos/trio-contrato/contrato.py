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

import fnmatch
import re
from collections import deque
from typing import Any

DEPARTAMENTOS = ("software", "adquisicion")

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
#
# La COLA (PRP-010) anade vueltas a `recibida` — todas son "vuelve a la fila", nunca un
# atajo para saltarsela:
#   en_ejecucion → recibida  : recuperacion de reinicio (huerfana que nadie esta corriendo)
#   en_revision  → recibida  : idem, muerta mientras el Supervisor la juzgaba (ver abajo)
#   rechazada    → recibida  : reintento re-encolado, al FINAL de la cola (FIFO justo)
#   escalada     → recibida  : relanzar tras escalada (analoga a escalada → en_ejecucion)
# `recibida → en_ejecucion` (el pick del worker) no cambia: sigue siendo la unica puerta
# de entrada a la ejecucion.
TRANSICIONES: dict[str, frozenset[str]] = {
    "recibida": frozenset({"en_ejecucion", "cancelada"}),
    "en_ejecucion": frozenset({"en_revision", "escalada", "cancelada", "recibida"}),
    # `en_revision` TAMBIEN vuelve a la cola. Es la ventana MAS LARGA del ciclo (el
    # Supervisor re-ejecuta build/typecheck/lint/tests: minutos), o sea la que mas
    # probablemente pille un reinicio. Sin esta salida, una tarea muerta ahi se queda en
    # el LIMBO para siempre: no la corre nadie, no esta en la cola y desaparece del radar
    # del equipo. Lo cazo el smoke de runtime (2026-07-12): `docker restart` con trabajo
    # en vuelo. Ningun test de dev lo veia — en dev nadie mata el proceso a media faena.
    "en_revision": frozenset({"aprobada", "rechazada", "recibida", "escalada"}),
    # reintento (directo o re-encolado) | tope
    "rechazada": frozenset({"en_ejecucion", "recibida", "escalada", "cancelada"}),
    "aprobada": frozenset({"concretada", "cancelada"}),  # concretar = gate humano antes
    "escalada": frozenset({"en_ejecucion", "recibida", "cancelada"}),  # el humano decide
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
    # Gotcha A2A: los DataPart viajan como protobuf Struct y TODO numero JSON
    # llega como float (3 → 3.0). Un entero integral se normaliza, no se rechaza.
    if isinstance(intentos_max, float) and intentos_max.is_integer():
        intentos_max = int(intentos_max)
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
    """RESULTADO (Ejecutor → Supervisor). Artefactos = afirmaciones, NO evidencia.

    `departamento` (Fase 9): el Supervisor rutea sus reglas por este campo.
    Default "software" para retrocompatibilidad con payloads de Fase 6/7.
    """
    _exigir(isinstance(d, dict), "el resultado debe ser un objeto JSON")
    task_id = d.get("task_id")
    _exigir(
        isinstance(task_id, str) and bool(_TASK_ID_RE.match(task_id)),
        "resultado.task_id invalido",
    )
    departamento = d.get("departamento", "software")
    _exigir(
        departamento in DEPARTAMENTOS,
        f"resultado.departamento desconocido: {departamento!r}",
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
        "departamento": departamento,
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


# ============================================================
# PLAN del enjambre (Coordinador → scheduler) — Fase 7 / PRP-007
# ============================================================
# Un PLAN es un DAG de sub-tareas. Cada sub-tarea es una TAREA valida del contrato
# de Fase 6 (su `task_id` ES su id en el DAG y el nombre de su worktree) mas dos
# campos de coordinacion: `depende_de` (ids que deben terminar antes) y `alcance`
# (globs de rutas que declara tocar). Invariantes: ids unicos, dependencias
# aciclicas y hacia ids existentes. El solape de alcances es AVISO, no error: el
# solape real lo caza la integracion/gate final, no una heuristica optimista
# (SPEC-trio §7.4, "verificar antes de confiar"). Decision de diseno (PRP-007,
# Fase 1): el `sub_task_id` de la prosa del PRP == el `task_id` de la sub-tarea;
# un solo id por nodo (KISS/DRY), ya validado y ya usable como worktree.

_WILDCARD = re.compile(r"[*?\[]")


def validar_subtarea(d: Any) -> dict:
    """Sub-tarea del plan: una TAREA valida + `depende_de` + `alcance`."""
    tarea = validar_tarea(d)  # reusa TODAS las invariantes de Fase 6 sin cambios
    depende_de = d.get("depende_de", []) if isinstance(d, dict) else None
    _exigir(
        _es_lista_de_str(depende_de) or depende_de == [],
        "subtarea.depende_de: lista de task_id (sub-tareas que deben terminar antes)",
    )
    alcance = d.get("alcance", [])
    _exigir(
        _es_lista_de_str(alcance) or alcance == [],
        "subtarea.alcance: lista de globs de rutas que la sub-tarea declara tocar",
    )
    return {**tarea, "depende_de": list(depende_de), "alcance": list(alcance)}


def _orden_topologico(ids: list[str], deps: dict[str, list[str]]) -> list[str]:
    """Orden de ejecucion (prerequisitos primero). ContratoInvalido si hay ciclo."""
    entrada = {i: 0 for i in ids}
    hijos: dict[str, list[str]] = {i: [] for i in ids}
    for nodo, prereqs in deps.items():
        for p in prereqs:
            hijos[p].append(nodo)
            entrada[nodo] += 1
    cola = deque(sorted(i for i in ids if entrada[i] == 0))
    orden: list[str] = []
    while cola:
        n = cola.popleft()
        orden.append(n)
        for h in sorted(hijos[n]):
            entrada[h] -= 1
            if entrada[h] == 0:
                cola.append(h)
    _exigir(len(orden) == len(ids), "plan: el DAG tiene un ciclo (dependencias circulares)")
    return orden


def _ancestros(ids: list[str], deps: dict[str, list[str]]) -> dict[str, set[str]]:
    """Cierre transitivo de prerequisitos por nodo (para detectar independencia)."""
    memo: dict[str, set[str]] = {}

    def anc(n: str) -> set[str]:
        if n not in memo:
            acc: set[str] = set()
            for p in deps[n]:
                acc.add(p)
                acc |= anc(p)
            memo[n] = acc
        return memo[n]

    return {i: anc(i) for i in ids}


def _prefijo_estatico(glob: str) -> str:
    m = _WILDCARD.search(glob)
    return glob[: m.start()] if m else glob


def _un_par_solapa(x: str, y: str) -> bool:
    """Heuristica conservadora de solape de globs de ruta (para AVISO, no bloqueo)."""
    if x == y or fnmatch.fnmatch(x, y) or fnmatch.fnmatch(y, x):
        return True
    corto, largo = sorted((_prefijo_estatico(x), _prefijo_estatico(y)), key=len)
    return bool(corto) and largo.startswith(corto)


def _avisos_de_solape(subs: list[dict]) -> list[str]:
    ids = [s["task_id"] for s in subs]
    deps = {s["task_id"]: s["depende_de"] for s in subs}
    anc = _ancestros(ids, deps)
    por_id = {s["task_id"]: s for s in subs}
    avisos: list[str] = []
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            a, b = ids[i], ids[j]
            if a in anc[b] or b in anc[a]:
                continue  # hay relacion de dependencia → el orden ya las separa
            pares = [f"{x}~{y}" for x in por_id[a]["alcance"] for y in por_id[b]["alcance"] if _un_par_solapa(x, y)]
            if pares:
                avisos.append(
                    f"alcances solapados entre {a!r} y {b!r} (sin dependencia): {pares}; "
                    "la integracion/gate final lo verifica"
                )
    return avisos


def validar_plan(d: Any) -> dict:
    """PLAN (DAG de sub-tareas). Devuelve {sub_tareas, orden, avisos} normalizado.

    Invariantes duras (ContratoInvalido): ids unicos, sin auto-dependencia,
    dependencias hacia ids existentes, DAG aciclico. Blando (avisos): alcances
    solapados entre sub-tareas independientes.
    """
    _exigir(isinstance(d, dict), "el plan debe ser un objeto JSON")
    subs_raw = d.get("sub_tareas")
    _exigir(
        isinstance(subs_raw, list) and len(subs_raw) >= 1,
        "plan.sub_tareas: lista no vacia (un enjambre sin sub-tareas no es un enjambre)",
    )
    subs = [validar_subtarea(s) for s in subs_raw]
    ids = [s["task_id"] for s in subs]
    _exigir(len(ids) == len(set(ids)), "plan: task_id de sub-tarea repetido (deben ser unicos en el DAG)")
    idset = set(ids)
    for s in subs:
        for dep in s["depende_de"]:
            _exigir(
                dep != s["task_id"],
                f"plan: la sub-tarea {s['task_id']!r} depende de si misma",
            )
            _exigir(
                dep in idset,
                f"plan: la sub-tarea {s['task_id']!r} depende de un id inexistente {dep!r}",
            )
    orden = _orden_topologico(ids, {s["task_id"]: s["depende_de"] for s in subs})
    return {"sub_tareas": subs, "orden": orden, "avisos": _avisos_de_solape(subs)}
