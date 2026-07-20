"""contrato_sc.py — la spec de smart contract como contrato de datos (PRP-013, Fase 12).

Un solo payload nuevo:

  SC_SPEC   Hermes-clientes → Coordinador   (lo que la fabrica construye y el gate verifica)

La spec es el CONTRATO entre la conversacion y la fabrica: todo lo que el
FabricChaincodeEngine genera y todo lo que el gate "fabric" ejecuta sale de aqui.
Spec invalida = rechazo inmediato con el porque, CERO tokens gastados en generar.

Validacion stdlib pura y determinista (sin pydantic), mismo patron que
`trio-contrato/contrato.py`: `_exigir` + mensajes que dicen exactamente que fallo.
"""
from __future__ import annotations

import re
from collections import deque
from typing import Any

# Catalogo de plantillas auditadas. Crece SOLO con plantillas que pasaron la
# auditoria humana de la Fase 2 (README-auditoria firmado). El Engine jamas
# genera fuera de este catalogo (anti-patron #1 del PRP-013).
CATALOGO_PLANTILLAS = ("escrow-v1",)

# Tipos de campo que las plantillas saben serializar de forma determinista.
TIPOS_CAMPO = ("string", "uint", "int", "bool", "timestamp")

_KEBAB_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
_FUNCION_RE = re.compile(r"^[a-z][a-z0-9_]{0,63}$")
_MSP_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9.-]{0,63}$")
_ATRIBUTO_RE = re.compile(r"^[a-z][a-z0-9_]{0,63}=[A-Za-z0-9_.-]{1,64}$")


class SpecInvalida(ValueError):
    """La sc_spec no cumple el contrato; el mensaje dice exactamente que."""


def _exigir(cond: bool, msg: str) -> None:
    if not cond:
        raise SpecInvalida(msg)


def _es_lista_de_str(v: Any) -> bool:
    return isinstance(v, list) and all(isinstance(x, str) and x.strip() for x in v)


def _entero(v: Any) -> Any:
    """Gotcha A2A: DataPart viaja como protobuf Struct y todo numero llega float."""
    if isinstance(v, float) and v.is_integer():
        return int(v)
    return v


def _validar_rol(r: Any, organizaciones: list[str]) -> dict:
    _exigir(isinstance(r, dict), "rol debe ser objeto")
    rid = r.get("id")
    _exigir(
        isinstance(rid, str) and bool(_FUNCION_RE.match(rid)),
        f"rol.id invalido: {rid!r} (minusculas, [a-z0-9_], empieza con letra)",
    )
    msp = r.get("msp")
    _exigir(
        isinstance(msp, str) and msp in organizaciones,
        f"rol {rid!r}: msp {msp!r} no esta en `organizaciones` "
        "(un rol sin organizacion que lo respalde no puede firmar nada)",
    )
    out = {"id": rid, "msp": msp}
    if r.get("atributo") is not None:
        _exigir(
            isinstance(r["atributo"], str) and bool(_ATRIBUTO_RE.match(r["atributo"])),
            f"rol {rid!r}: atributo debe ser 'clave=valor' (ABAC del certificado), "
            f"llego {r.get('atributo')!r}",
        )
        out["atributo"] = r["atributo"]
    return out


def _validar_campo(c: Any, contexto: str) -> dict:
    _exigir(isinstance(c, dict), f"{contexto}: campo debe ser objeto")
    nombre = c.get("nombre")
    _exigir(
        isinstance(nombre, str) and bool(_FUNCION_RE.match(nombre)),
        f"{contexto}: campo.nombre invalido: {nombre!r}",
    )
    tipo = c.get("tipo")
    _exigir(
        tipo in TIPOS_CAMPO,
        f"{contexto}: campo {nombre!r} tipo {tipo!r} desconocido (validos: {TIPOS_CAMPO})",
    )
    out = {"nombre": nombre, "tipo": tipo, "requerido": bool(c.get("requerido", False))}
    if c.get("enum") is not None:
        _exigir(
            tipo == "string" and _es_lista_de_str(c["enum"]) and len(c["enum"]) >= 1,
            f"{contexto}: campo {nombre!r}: enum solo aplica a tipo string y no puede "
            "ser vacio",
        )
        out["enum"] = list(c["enum"])
    return out


def _validar_activo(a: Any) -> dict:
    _exigir(isinstance(a, dict), "activo debe ser objeto")
    aid = a.get("id")
    _exigir(
        isinstance(aid, str) and bool(_FUNCION_RE.match(aid)),
        f"activo.id invalido: {aid!r}",
    )
    campos_raw = a.get("campos")
    _exigir(
        isinstance(campos_raw, list) and len(campos_raw) >= 1,
        f"activo {aid!r}: campos debe ser lista no vacia (un activo sin campos no "
        "modela nada)",
    )
    campos = [_validar_campo(c, f"activo {aid!r}") for c in campos_raw]
    nombres = [c["nombre"] for c in campos]
    _exigir(
        len(nombres) == len(set(nombres)),
        f"activo {aid!r}: nombres de campo duplicados",
    )
    return {"id": aid, "campos": campos}


def _validar_transicion(t: Any, estados: list[str], roles_ids: set[str]) -> dict:
    _exigir(isinstance(t, dict), "transicion debe ser objeto")
    de, a = t.get("de"), t.get("a")
    _exigir(de in estados, f"transicion: estado origen {de!r} no declarado en `estados`")
    _exigir(a in estados, f"transicion: estado destino {a!r} no declarado en `estados`")
    _exigir(de != a, f"transicion {de!r}→{a!r}: origen y destino iguales (no-op)")
    funcion = t.get("funcion")
    _exigir(
        isinstance(funcion, str) and bool(_FUNCION_RE.match(funcion)),
        f"transicion {de!r}→{a!r}: funcion invalida: {funcion!r}",
    )
    quien = t.get("quien")
    _exigir(
        _es_lista_de_str(quien) and len(quien) >= 1,
        f"transicion {funcion!r}: `quien` debe ser lista no vacia de roles "
        "(una transicion sin dueno es una puerta abierta)",
    )
    desconocidos = [q for q in quien if q not in roles_ids]
    _exigir(
        not desconocidos,
        f"transicion {funcion!r}: roles desconocidos en `quien`: {desconocidos}",
    )
    out = {"de": de, "a": a, "quien": list(quien), "funcion": funcion}
    if t.get("regla") is not None:
        _exigir(
            isinstance(t["regla"], str) and t["regla"].strip() != "",
            f"transicion {funcion!r}: regla debe ser string no vacio",
        )
        out["regla"] = t["regla"].strip()
    return out


def _exigir_alcanzables(estados: list[str], transiciones: list[dict]) -> None:
    """Todo estado debe ser alcanzable desde el inicial (estados[0]).

    Un estado inalcanzable en la spec es SIEMPRE un error de captura de
    requerimientos (falta una transicion o sobra un estado) — mejor rechazarlo
    aqui, en frio, que descubrirlo con el chaincode ya generado.
    """
    inicial = estados[0]
    salidas: dict[str, list[str]] = {}
    for t in transiciones:
        salidas.setdefault(t["de"], []).append(t["a"])
    vistos = {inicial}
    cola = deque([inicial])
    while cola:
        actual = cola.popleft()
        for destino in salidas.get(actual, []):
            if destino not in vistos:
                vistos.add(destino)
                cola.append(destino)
    huerfanos = [e for e in estados if e not in vistos]
    _exigir(
        not huerfanos,
        f"estados inalcanzables desde {inicial!r}: {huerfanos} "
        "(falta una transicion o sobra un estado)",
    )


def validar_sc_spec(d: Any) -> dict:
    """SC_SPEC (Hermes-clientes → Coordinador). Devuelve la spec normalizada.

    El orden de validacion va de lo barato a lo caro: forma → referencias
    cruzadas → alcanzabilidad del grafo de estados.
    """
    _exigir(isinstance(d, dict), "la sc_spec debe ser un objeto")
    spec = d.get("sc_spec", d)  # acepta con o sin envoltorio `sc_spec:`
    _exigir(isinstance(spec, dict), "sc_spec debe ser objeto")

    version = _entero(spec.get("version"))
    _exigir(version == 1, f"version debe ser 1, llego {version!r}")

    nombre = spec.get("nombre")
    _exigir(
        isinstance(nombre, str) and bool(_KEBAB_RE.match(nombre)),
        f"nombre invalido: {nombre!r} (kebab-case, 1-64 chars — se usa como nombre "
        "del paquete de chaincode)",
    )

    plantilla = spec.get("plantilla")
    _exigir(
        plantilla in CATALOGO_PLANTILLAS,
        f"plantilla {plantilla!r} fuera del catalogo {CATALOGO_PLANTILLAS} "
        "(el Engine JAMAS genera fuera del catalogo auditado — PRP-013)",
    )

    descripcion = spec.get("descripcion", "")
    _exigir(isinstance(descripcion, str), "descripcion: string")

    canal = spec.get("canal_destino")
    _exigir(
        isinstance(canal, str) and bool(_KEBAB_RE.match(canal)),
        f"canal_destino invalido: {canal!r} (kebab-case, nombre de canal Fabric)",
    )

    organizaciones = spec.get("organizaciones")
    _exigir(
        _es_lista_de_str(organizaciones) and len(organizaciones) >= 1,
        "organizaciones: lista no vacia de MSP IDs (sin ellas no hay "
        "approveformyorg posible)",
    )
    _exigir(
        len(organizaciones) == len(set(organizaciones)),
        "organizaciones: MSP IDs duplicados",
    )
    for msp in organizaciones:
        _exigir(bool(_MSP_RE.match(msp)), f"MSP ID invalido: {msp!r}")

    roles_raw = spec.get("roles")
    _exigir(
        isinstance(roles_raw, list) and len(roles_raw) >= 1,
        "roles: lista no vacia",
    )
    roles = [_validar_rol(r, list(organizaciones)) for r in roles_raw]
    roles_ids = {r["id"] for r in roles}
    _exigir(len(roles_ids) == len(roles), "roles: ids duplicados")

    activos_raw = spec.get("activos")
    _exigir(isinstance(activos_raw, list) and len(activos_raw) >= 1, "activos: lista no vacia")
    activos = [_validar_activo(a) for a in activos_raw]
    _exigir(
        len({a["id"] for a in activos}) == len(activos),
        "activos: ids duplicados",
    )
    campos_conocidos = {c["nombre"] for a in activos for c in a["campos"]}

    estados = spec.get("estados")
    _exigir(
        _es_lista_de_str(estados) and len(estados) >= 2,
        "estados: lista de al menos 2 (el primero es el estado INICIAL)",
    )
    _exigir(len(estados) == len(set(estados)), "estados: duplicados")
    for e in estados:
        _exigir(bool(_FUNCION_RE.match(e)), f"estado invalido: {e!r}")

    transiciones_raw = spec.get("transiciones")
    _exigir(
        isinstance(transiciones_raw, list) and len(transiciones_raw) >= 1,
        "transiciones: lista no vacia",
    )
    transiciones = [
        _validar_transicion(t, list(estados), roles_ids) for t in transiciones_raw
    ]
    funciones = [t["funcion"] for t in transiciones]
    _exigir(
        len(funciones) == len(set(funciones)),
        "transiciones: funcion duplicada (una funcion = una transicion; asi el "
        "chaincode generado es un mapa 1:1 con la spec)",
    )
    _exigir_alcanzables(list(estados), transiciones)

    eventos_raw = spec.get("eventos", [])
    _exigir(isinstance(eventos_raw, list), "eventos: lista")
    eventos = []
    for ev in eventos_raw:
        _exigir(isinstance(ev, dict), "evento debe ser objeto")
        en = ev.get("en")
        _exigir(
            en in funciones,
            f"evento {ev.get('nombre')!r}: `en` refiere funcion inexistente: {en!r}",
        )
        nombre_ev = ev.get("nombre")
        _exigir(
            isinstance(nombre_ev, str) and nombre_ev.strip() != "",
            "evento.nombre: string no vacio",
        )
        eventos.append({"nombre": nombre_ev.strip(), "en": en})
    _exigir(
        len({e["nombre"] for e in eventos}) == len(eventos),
        "eventos: nombres duplicados",
    )

    privados_raw = spec.get("datos_privados", [])
    _exigir(isinstance(privados_raw, list), "datos_privados: lista")
    privados = []
    for p in privados_raw:
        _exigir(isinstance(p, dict), "coleccion privada debe ser objeto")
        pn = p.get("nombre")
        _exigir(
            isinstance(pn, str) and bool(_KEBAB_RE.match(pn)),
            f"datos_privados.nombre invalido: {pn!r}",
        )
        orgs_p = p.get("organizaciones")
        _exigir(
            _es_lista_de_str(orgs_p) and set(orgs_p) <= set(organizaciones),
            f"coleccion {pn!r}: organizaciones fuera de la spec "
            "(una coleccion privada no puede incluir a quien no esta en la red)",
        )
        campos_p = p.get("campos")
        _exigir(
            _es_lista_de_str(campos_p) and set(campos_p) <= campos_conocidos,
            f"coleccion {pn!r}: campos no declarados en ningun activo: "
            f"{sorted(set(campos_p or []) - campos_conocidos)}",
        )
        privados.append(
            {"nombre": pn, "organizaciones": list(orgs_p), "campos": list(campos_p)}
        )

    politica = spec.get("politica_endorsement")
    _exigir(
        isinstance(politica, str) and politica.strip() != "",
        "politica_endorsement: obligatoria (es el candado del protocolo; sin ella "
        "el commit hereda defaults que nadie reviso)",
    )

    criterios = spec.get("criterios_aceptacion")
    _exigir(
        _es_lista_de_str(criterios) and len(criterios) >= 1,
        "criterios_aceptacion: lista no vacia (el gate fabric los ejecuta literal; "
        "sin criterios no hay gate)",
    )

    return {
        "version": 1,
        "nombre": nombre,
        "plantilla": plantilla,
        "descripcion": descripcion.strip(),
        "canal_destino": canal,
        "organizaciones": list(organizaciones),
        "roles": roles,
        "activos": activos,
        "estados": list(estados),
        "transiciones": transiciones,
        "eventos": eventos,
        "datos_privados": privados,
        "politica_endorsement": politica.strip(),
        "criterios_aceptacion": list(criterios),
    }
