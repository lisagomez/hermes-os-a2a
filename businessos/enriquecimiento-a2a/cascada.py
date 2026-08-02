"""cascada.py — orquestacion del waterfall enrichment (App A).

Orden por costo (todo lo implementado cuesta $0; el ledger registra costo_usd
igual, porque el dia que entre un proveedor de pago el costeo ya esta vivo):

  1. rfc_offline    — valida el RFC PROVISTO (no se gatea: dato ya en poder)
  2. denue          — fuente publica oficial (gate grafo: permitido)
  3. sat_69b        — gate de compliance leyendo contraparte_69b (fail-closed)
  4. patron_dominio — inferir correo por patron (gate grafo: permitido)

Reglas duras:
- TODO lookup ejecutado deja fila en el ledger (hit/miss/error). Un escalon
  BLOQUEADO por gate no ejecuto nada: se reporta en `bloqueos` del artifact,
  no en el ledger.
- El gate 69-B JAMAS consolida en lead_enriquecimiento (no es un campo del
  lead: es un dictamen; vive en ledger + artifact).
- Persona fisica (RFC de 13): el enriquecimiento de CONTACTO queda bloqueado
  mientras el grafo diga que "dato de persona fisica para prospeccion" no es
  'permitido' (hoy: dudoso). El gate 69-B SI corre (compliance, no prospeccion).
- Idempotencia practica: un campo ya consolidado no se re-busca salvo
  forzar=true (mitiga doble gasto ante reintentos; el consolidado es upsert).
"""
from __future__ import annotations

import os
import re

import gate_69b
import gate_grafo
import patrones
from almacen import Almacen
from denue import Denue, DenueError
from rfc import evaluar_rfc

RE_EMAIL = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")

CAMPOS_PRODUCIBLES = ("email", "telefono", "razon_social")


async def enriquecer(lead: dict, extras: dict, campos: list[str], forzar: bool,
                     evaluacion: dict, almacen: Almacen, denue: Denue) -> dict:
    lead_id = lead["lead_id"]
    datos = lead.get("datos") or {}
    intentos: list[dict] = []
    costo_total = 0.0
    resultados: dict[str, dict] = {}
    bloqueos: dict[str, dict] = {}

    async def registrar(fuente: str, campo: str, resultado: str, veredicto: str = "",
                        valor: str = "", costo: float = 0.0, detalle: dict | None = None) -> int | None:
        nonlocal costo_total
        costo_total += costo
        fila = {"lead_id": lead_id, "fuente": fuente, "campo": campo,
                "resultado": resultado, "veredicto": veredicto, "valor": valor,
                "costo_usd": costo, "detalle": detalle or {}}
        intento_id = await almacen.registrar_intento(fila)
        intentos.append({**fila, "intento_id": intento_id})
        return intento_id

    # -- lo ya conocido: consolidado previo + datos del propio lead ----------
    consolidado = {}
    if almacen.activo and not forzar:
        consolidado = await almacen.leer_consolidado(lead_id)
    for campo, fila in consolidado.items():
        resultados[campo] = {"valor": fila["valor"], "veredicto": fila["veredicto"],
                             "fuente": fila["fuente"], "origen": "consolidado"}

    contacto = (lead.get("contacto") or "").strip()
    email_lead = contacto.lower() if RE_EMAIL.fullmatch(contacto) else ""
    if email_lead and "email" not in resultados:
        resultados["email"] = {"valor": email_lead, "veredicto": "valido",
                               "fuente": "lead", "origen": "lead"}
    telefono_lead = (lead.get("telefono") or "").strip()
    if telefono_lead and "telefono" not in resultados:
        resultados["telefono"] = {"valor": telefono_lead, "veredicto": "valido",
                                  "fuente": "lead", "origen": "lead"}

    def falta(campo: str) -> bool:
        return campo in campos and campo not in resultados

    # -- 1. rfc_offline ------------------------------------------------------
    rfc_crudo = extras.get("rfc") or datos.get("rfc") or datos.get("RFC") or ""
    rfc_valido, tipo_rfc = "", None
    if rfc_crudo:
        ev_rfc = evaluar_rfc(rfc_crudo)
        tipo_rfc = ev_rfc["tipo"]
        intento_id = await registrar("rfc_offline", "rfc", "hit", ev_rfc["veredicto"],
                                     ev_rfc["rfc"], detalle={"tipo": tipo_rfc,
                                                             "razon": ev_rfc["razon"]})
        if ev_rfc["veredicto"] != "invalido":
            rfc_valido = ev_rfc["rfc"]
            await almacen.consolidar(lead_id, "rfc", ev_rfc["rfc"], ev_rfc["veredicto"],
                                     "rfc_offline", intento_id)
            resultados["rfc"] = {"valor": ev_rfc["rfc"], "veredicto": ev_rfc["veredicto"],
                                 "fuente": "rfc_offline", "origen": "nuevo"}
        else:
            resultados["rfc"] = {"valor": ev_rfc["rfc"], "veredicto": "invalido",
                                 "fuente": "rfc_offline", "origen": "nuevo"}
    else:
        await registrar("rfc_offline", "rfc", "miss",
                        detalle={"razon": "sin RFC provisto (DataPart ni lead.datos)"})

    # -- bloqueo LFPDPPP de persona fisica -----------------------------------
    pf_bloqueado = False
    if tipo_rfc == "PF":
        ev_pf = evaluacion["por_concepto"][gate_grafo.CONCEPTO_PF]
        if ev_pf["estado"] != "permitido":
            pf_bloqueado = True
            bloqueos["contacto_persona_fisica"] = gate_grafo.bloqueo_de(
                evaluacion, gate_grafo.CONCEPTO_PF)

    # -- 2. denue ------------------------------------------------------------
    nombre_busqueda = (datos.get("razon_social") or lead.get("empresa") or "").strip()
    objetivo_denue = [c for c in CAMPOS_PRODUCIBLES if falta(c)]
    if objetivo_denue and pf_bloqueado:
        pass  # ya reportado en bloqueos["contacto_persona_fisica"]
    elif objetivo_denue and not gate_grafo.permite(evaluacion, "denue"):
        bloqueos["denue"] = gate_grafo.bloqueo_de(evaluacion, "denue")
    elif objetivo_denue and nombre_busqueda:
        try:
            hallazgo = await denue.buscar(nombre_busqueda)
        except DenueError as exc:
            await registrar("denue", "", "error", detalle={"razon": str(exc)})
            hallazgo = None
        if hallazgo is not None:
            valores = {"telefono": hallazgo["telefono"], "email": hallazgo["correo"],
                       "razon_social": hallazgo["razon_social"]}
            for campo in objetivo_denue:
                valor = valores[campo] if hallazgo["encontrado"] else ""
                if valor:
                    intento_id = await registrar("denue", campo, "hit", "valido",
                                                 valor, detalle=hallazgo["detalle"])
                    await almacen.consolidar(lead_id, campo, valor, "valido",
                                             "denue", intento_id)
                    resultados[campo] = {"valor": valor, "veredicto": "valido",
                                         "fuente": "denue", "origen": "nuevo"}
                else:
                    await registrar("denue", campo, "miss", detalle=hallazgo["detalle"])
    elif objetivo_denue:
        await registrar("denue", "", "miss",
                        detalle={"razon": "sin empresa/razon_social para buscar"})

    # -- 3. gate 69-B (compliance: corre aun con PF bloqueada) ---------------
    if not rfc_valido:
        gate = {"pasa": False, "estatus": None, "override_id": None,
                "razon": "sin RFC utilizable: imposible consultar la vigilancia 69-B (fail-closed)"}
        await registrar("sat_69b", "", "miss", detalle={"razon": gate["razon"]})
    elif not almacen.activo:
        gate = {"pasa": False, "estatus": None, "override_id": None,
                "razon": "sin Supabase configurado: vigilancia 69-B inaccesible (fail-closed)"}
        await registrar("sat_69b", "", "miss", detalle={"razon": gate["razon"]})
    else:
        fila_69b = await almacen.leer_69b(rfc_valido)
        override = None
        if fila_69b is not None and fila_69b.get("estatus") == "presunto":
            override = await almacen.override_activo(rfc_valido)
        gate = gate_69b.decidir(
            fila_69b, override,
            max_edad_dias=int(os.environ.get(
                "GATE_69B_MAX_EDAD_DIAS", str(gate_69b.MAX_EDAD_DIAS_DEFAULT))))
        if fila_69b is None:
            await registrar("sat_69b", "", "miss", detalle={"razon": gate["razon"]})
        else:
            await registrar("sat_69b", "", "hit",
                            "valido" if gate["pasa"] else "invalido",
                            gate["estatus"] or "",
                            detalle={"estatus": gate["estatus"],
                                     "override_id": gate["override_id"],
                                     "razon": gate["razon"]})

    # -- 4. patron_dominio ---------------------------------------------------
    nombre = (extras.get("nombre") or datos.get("nombre") or "").strip()
    apellido = (extras.get("apellido") or datos.get("apellido") or "").strip()
    dominio = (patrones.dominio_de(datos.get("dominio") or "")
               or patrones.dominio_de(datos.get("sitio_web") or ""))
    email_conocido = resultados.get("email", {}).get("valor", "")
    if not dominio and email_conocido:
        dominio = patrones.dominio_de(email_conocido)

    if falta("email") and pf_bloqueado:
        pass  # mismo bloqueo LFPDPPP ya reportado
    elif falta("email") and not gate_grafo.permite(evaluacion, "patron_dominio"):
        bloqueos["patron_dominio"] = gate_grafo.bloqueo_de(evaluacion, "patron_dominio")
    elif falta("email"):
        if not dominio:
            await registrar("patron_dominio", "email", "miss",
                            detalle={"razon": "sin dominio conocido (datos.dominio/sitio_web)"})
        elif not (nombre and apellido):
            await registrar("patron_dominio", "email", "miss",
                            detalle={"razon": "sin nombre/apellido del contacto para instanciar"})
        else:
            fila_patron = await almacen.leer_patron(dominio) if almacen.activo else None
            if fila_patron is None:
                await registrar("patron_dominio", "email", "miss",
                                detalle={"dominio": dominio,
                                         "razon": "sin patron registrado para el dominio"})
            else:
                inferido = patrones.inferir(fila_patron["patron"], nombre, apellido, dominio)
                if inferido is None:
                    await registrar("patron_dominio", "email", "miss",
                                    detalle={"dominio": dominio,
                                             "razon": "patron no instanciable con estos datos"})
                else:
                    intento_id = await registrar(
                        "patron_dominio", "email", "hit", "dudoso", inferido,
                        detalle={"dominio": dominio, "patron": fila_patron["patron"],
                                 "soporte": fila_patron.get("soporte")})
                    await almacen.consolidar(lead_id, "email", inferido, "dudoso",
                                             "patron_dominio", intento_id)
                    resultados["email"] = {"valor": inferido, "veredicto": "dudoso",
                                           "fuente": "patron_dominio", "origen": "nuevo"}

    # -- refuerzo del activo de patrones (correo REAL observado) -------------
    email_real = resultados.get("email", {})
    if (email_real.get("veredicto") == "valido" and nombre and apellido
            and not pf_bloqueado):
        plantilla = patrones.derivar(email_real["valor"], nombre, apellido)
        dominio_real = patrones.dominio_de(email_real["valor"])
        if plantilla and dominio_real:
            await almacen.reforzar_patron(dominio_real, plantilla)

    return {
        "lead_id": lead_id,
        "resultados": resultados,
        "gate_69b": gate,
        "pf_bloqueado": pf_bloqueado,
        "bloqueos": bloqueos,
        "intentos": intentos,
        "costo_usd": round(costo_total, 6),
        "persistido": almacen.activo,
    }
