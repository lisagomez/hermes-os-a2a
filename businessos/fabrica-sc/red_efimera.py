"""red_efimera.py — plan de verificación en red efímera de un paquete fabricado.

Gate de la Fase 5 del PRP-013 (departamento contratos_inteligentes §2): antes
de la aprobación humana, el chaincode se despliega en una test network REAL y
se ejercita CADA transición de la spec con los roles declarados, más los casos
negativos (rol sin permiso rechazado POR EL CHAINCODE, no por un mock). Este
gate NO corre en el contenedor del Supervisor (sin socket Docker, aislamiento
del juez): lo ejecuta el host-job verificar-red-efimera.py.

Este módulo es la mitad PURA y testeable: dada la spec normalizada y el
manifest, produce el PLAN determinista de pasos (red arriba, despliegue,
identidades, invocaciones con resultado esperado, red abajo). La mitad con IO
(subprocess contra fabric-samples, Supabase) vive en el host-job; el runner es
pluggable y en tests se mockea (patrón MockEngine, aprendizaje 2026-07-03).

Cobertura por diseño:
- Cada transición se ejercita sobre una instancia FRESCA llevada al estado
  origen por el camino más corto desde el inicial (BFS determinista): n
  transiciones = n instancias, sin depender de un único happy path.
- El caso negativo corre ANTES que el positivo sobre la misma instancia (el
  rechazo no muta estado): mismo depósito, cero setup extra.
- Un negativo solo es válido si la credencial que presenta de verdad NO
  autoriza: para funciones con control por MSP, un rol de OTRO MSP; para
  funciones con control por atributo, cualquier rol sin el atributo. Si no
  existe candidato (p.ej. todos los MSP están autorizados), se omite y el plan
  lo declara — nunca un "negativo" que pasaría por razones equivocadas.

Límite honesto v1: la test network trae Org1MSP/Org2MSP. Una spec con otros
MSP no es ejecutable aquí y el plan lo dice (`no_ejecutable`) — el host-job
escala en vez de aparentar verificación (doctrina: nunca aparentar saber lo
que no se sabe).
"""
from __future__ import annotations

from collections import deque

MSPS_RED = ("Org1MSP", "Org2MSP")

# Conocimiento de plantilla (escrow-v1): la creación del activo precede al
# estado inicial y los args extra por función. Otras plantillas suman aquí.
CREACION_ESCROW_V1 = {"funcion_go": "CrearDeposito", "rol": "comprador"}
ARGS_EXTRA_ESCROW_V1 = {"resolver": ["liberar"]}
FECHA_LIMITE_DELTA_S = 24 * 60 * 60  # 1 día: dentro del plazo de resolver
MONTO_VERIFICACION = "1000"


def _funcion_go(funcion: str) -> str:
    return "".join(p.capitalize() for p in funcion.split("_"))


def _camino_mas_corto(spec: dict, hasta: str) -> list[dict]:
    """BFS determinista (orden de la spec) del estado inicial a `hasta`."""
    inicial = spec["estados"][0]
    if hasta == inicial:
        return []
    pendientes = deque([(inicial, [])])
    vistos = {inicial}
    while pendientes:
        estado, camino = pendientes.popleft()
        for t in spec["transiciones"]:
            if t["de"] != estado or t["a"] in vistos:
                continue
            nuevo = camino + [t]
            if t["a"] == hasta:
                return nuevo
            vistos.add(t["a"])
            pendientes.append((t["a"], nuevo))
    raise ValueError(f"estado {hasta!r} inalcanzable desde {inicial!r}")


def _rol_negativo(spec: dict, t: dict, roles_por_id: dict) -> str | None:
    """Un rol cuya credencial REAL no autoriza la transición, o None."""
    autorizados = set(t["quien"])
    con_atributo = any(roles_por_id[q].get("atributo") for q in autorizados)
    msps_autorizados = {roles_por_id[q]["msp"] for q in autorizados}
    for r in spec["roles"]:
        if r["id"] in autorizados:
            continue
        if con_atributo and not r.get("atributo"):
            return r["id"]
        if not con_atributo and r["msp"] not in msps_autorizados:
            return r["id"]
    return None


def plan_red_efimera(spec: dict, manifest: dict, ahora: int) -> dict:
    """Plan determinista de verificación. `ahora` = epoch s (lo pasa el job).

    Devuelve {"no_ejecutable": razon} o {"canal", "chaincode", "pasos",
    "resumen"}. Puro: sin red, sin reloj propio.
    """
    fuera = sorted(set(spec["organizaciones"]) - set(MSPS_RED))
    if fuera:
        return {
            "no_ejecutable": (
                f"la red efimera v1 (test network) solo trae {'/'.join(MSPS_RED)}; "
                f"la spec usa {', '.join(fuera)} — verificar exige una red con esas "
                f"organizaciones (escalar, no aparentar)"
            )
        }
    if spec["plantilla"] != "escrow-v1":
        return {"no_ejecutable": f"plan v1 solo conoce escrow-v1, llego {spec['plantilla']!r}"}

    roles_por_id = {r["id"]: r for r in spec["roles"]}
    moneda = manifest["parametros"]["monedas"][0]
    fecha_limite = str(ahora + FECHA_LIMITE_DELTA_S)

    pasos: list[dict] = [
        {"tipo": "red_up", "canal": spec["canal_destino"]},
        {"tipo": "desplegar", "chaincode": spec["nombre"],
         "politica_endorsement": spec["politica_endorsement"]},
    ]
    for r in spec["roles"]:
        if r.get("atributo"):
            pasos.append({
                "tipo": "identidad", "rol": r["id"], "msp": r["msp"],
                "atributo": r["atributo"],
            })

    def _invoke(instancia: str, t: dict, rol: str, espera: str) -> dict:
        extra = ARGS_EXTRA_ESCROW_V1.get(t["funcion"], [])
        return {
            "tipo": "invoke", "funcion": _funcion_go(t["funcion"]),
            "args": [instancia, *extra], "como": rol, "espera": espera,
        }

    negativos = 0
    sin_negativo: list[str] = []
    for idx, t in enumerate(spec["transiciones"], start=1):
        instancia = f"verif-{idx}-{t['funcion']}"
        pasos.append({
            "tipo": "invoke", "funcion": CREACION_ESCROW_V1["funcion_go"],
            "args": [instancia, MONTO_VERIFICACION, moneda, fecha_limite],
            "como": CREACION_ESCROW_V1["rol"], "espera": "exito",
        })
        for previa in _camino_mas_corto(spec, t["de"]):
            pasos.append(_invoke(instancia, previa, previa["quien"][0], "exito"))
        rol_neg = _rol_negativo(spec, t, roles_por_id)
        if rol_neg is not None:
            pasos.append(_invoke(instancia, t, rol_neg, "rechazo"))
            negativos += 1
        else:
            sin_negativo.append(t["funcion"])
        pasos.append(_invoke(instancia, t, t["quien"][0], "exito"))
        pasos.append({
            "tipo": "query", "funcion": "LeerDeposito", "args": [instancia],
            "como": t["quien"][0], "espera_estado": t["a"],
        })
    pasos.append({"tipo": "red_down"})

    return {
        "canal": spec["canal_destino"],
        "chaincode": spec["nombre"],
        "pasos": pasos,
        "resumen": {
            "transiciones": len(spec["transiciones"]),
            "negativos": negativos,
            "sin_negativo": sin_negativo,
            "invocaciones": sum(1 for p in pasos if p["tipo"] == "invoke"),
        },
    }
