"""Cascada completa con Supabase, grafo y DENUE falsos (sin red, sin LLM).

Invariantes vigilados:
- todo lookup ejecutado deja fila en el ledger (hit/miss/error)
- el gate 69-B jamas consolida y es fail-closed (sin fila / sin RFC / definitivo)
- persona fisica: contacto bloqueado por el grafo, 69-B corre igual
- un escalon bloqueado por gate NO ejecuta ni escribe ledger
- la cascada JAMAS escribe public.leads (fake lo vigila)
- ledger no escribible = AlmacenError (fallo visible, no exito a medias)
"""
import asyncio

import pytest

import gate_grafo
from almacen import Almacen, AlmacenError
from cascada import enriquecer
from fakes import DENUE_ACME, FakeDenueAPI, FakeGrafo, FakeSupabase, RFC_PF, RFC_PM
from gate_grafo import GateGrafo

PM = RFC_PM      # PM valido (dv a mano, ver test_rfc.py)
PF = RFC_PF      # PF valido


def correr(sb: FakeSupabase | None, denue_api: FakeDenueAPI, lead: dict,
           extras: dict | None = None, campos=None, forzar=False,
           estados=None, denue_token="tok") -> dict:
    async def _run():
        grafo = FakeGrafo(estados=estados)
        async with grafo.client() as http_grafo:
            evaluacion = await GateGrafo(url="http://g", http_client=http_grafo).consultar()
        if sb is None:
            almacen = Almacen(url="", key="")
            return await enriquecer(lead, extras or {}, campos or ["email", "telefono", "razon_social"],
                                    forzar, evaluacion, almacen, denue_api.cliente(denue_token))
        async with sb.client() as http_sb:
            almacen = Almacen(url="http://sb", key="k", http_client=http_sb)
            return await enriquecer(lead, extras or {}, campos or ["email", "telefono", "razon_social"],
                                    forzar, evaluacion, almacen, denue_api.cliente(denue_token))
    return asyncio.run(_run())


def lead_base(**datos) -> dict:
    return {"lead_id": "lead-1", "empresa": "ACME SA DE CV", "contacto": "",
            "telefono": "", "datos": datos}


def filas(sb: FakeSupabase, fuente: str) -> list[dict]:
    return [f for f in sb.ledger if f["fuente"] == fuente]


# ---- flujo feliz PM ----------------------------------------------------------

def test_flujo_feliz_pm_denue_y_69b_limpio():
    sb = FakeSupabase()
    sb.filas_69b[PM] = {"rfc": PM, "estatus": "no_listado"}
    r = correr(sb, FakeDenueAPI(DENUE_ACME), lead_base(), extras={"rfc": PM})

    assert r["gate_69b"]["pasa"] is True
    assert r["resultados"]["telefono"]["valor"] == "5511112222"
    assert r["resultados"]["email"]["valor"] == "ventas@acme.mx"
    assert r["resultados"]["razon_social"]["fuente"] == "denue"
    assert r["resultados"]["rfc"]["veredicto"] == "valido"
    # ledger: rfc hit + 3 hits denue + 69b hit valido; consolidado SIN el gate
    assert [f["resultado"] for f in filas(sb, "rfc_offline")] == ["hit"]
    assert sorted(f["campo"] for f in filas(sb, "denue")) == ["email", "razon_social", "telefono"]
    gate_rows = filas(sb, "sat_69b")
    assert [(f["resultado"], f["veredicto"], f["campo"]) for f in gate_rows] == [("hit", "valido", "")]
    assert ("lead-1", "") not in sb.consolidado, "el gate 69-B jamas consolida"
    assert {c for (_, c) in sb.consolidado} == {"rfc", "email", "telefono", "razon_social"}
    assert sb.escrituras_leads == [], "la cascada JAMAS escribe public.leads"
    assert r["persistido"] is True


def test_todo_intento_lleva_procedencia_en_consolidado():
    sb = FakeSupabase()
    sb.filas_69b[PM] = {"rfc": PM, "estatus": "no_listado"}
    correr(sb, FakeDenueAPI(DENUE_ACME), lead_base(), extras={"rfc": PM})
    ids_ledger = {f["id"] for f in sb.ledger}
    for fila in sb.consolidado.values():
        assert fila["intento_id"] in ids_ledger


# ---- gate 69-B fail-closed ---------------------------------------------------

def test_69b_sin_fila_bloquea_y_registra_miss():
    sb = FakeSupabase()
    r = correr(sb, FakeDenueAPI(DENUE_ACME), lead_base(), extras={"rfc": PM})
    assert r["gate_69b"]["pasa"] is False
    assert "nunca consultado" in r["gate_69b"]["razon"]
    assert [f["resultado"] for f in filas(sb, "sat_69b")] == ["miss"]


def test_69b_sin_rfc_bloquea_con_miss():
    sb = FakeSupabase()
    r = correr(sb, FakeDenueAPI(DENUE_ACME), lead_base())
    assert r["gate_69b"]["pasa"] is False
    assert "sin RFC" in r["gate_69b"]["razon"]
    assert [f["resultado"] for f in filas(sb, "rfc_offline")] == ["miss"]


def test_69b_definitivo_bloquea_con_hit_invalido():
    sb = FakeSupabase()
    sb.filas_69b[PM] = {"rfc": PM, "estatus": "definitivo"}
    r = correr(sb, FakeDenueAPI(DENUE_ACME), lead_base(), extras={"rfc": PM})
    assert r["gate_69b"]["pasa"] is False
    fila = filas(sb, "sat_69b")[0]
    assert (fila["resultado"], fila["veredicto"], fila["valor"]) == ("hit", "invalido", "definitivo")


def test_69b_presunto_con_override_activo_pasa():
    sb = FakeSupabase()
    sb.filas_69b[PM] = {"rfc": PM, "estatus": "presunto"}
    sb.overrides.append({"id": 5, "rfc": PM, "invalidado": False,
                         "autorizado_por": "elisa", "vence_en": "2099-01-01T00:00:00+00:00"})
    r = correr(sb, FakeDenueAPI(DENUE_ACME), lead_base(), extras={"rfc": PM})
    assert r["gate_69b"]["pasa"] is True
    assert r["gate_69b"]["override_id"] == 5


def test_69b_presunto_con_override_vencido_bloquea():
    sb = FakeSupabase()
    sb.filas_69b[PM] = {"rfc": PM, "estatus": "presunto"}
    sb.overrides.append({"id": 5, "rfc": PM, "invalidado": False,
                         "autorizado_por": "elisa", "vence_en": "2020-01-01T00:00:00+00:00"})
    r = correr(sb, FakeDenueAPI(DENUE_ACME), lead_base(), extras={"rfc": PM})
    assert r["gate_69b"]["pasa"] is False


# ---- persona fisica (LFPDPPP) ------------------------------------------------

def test_pf_bloquea_contacto_pero_corre_69b():
    sb = FakeSupabase()
    sb.filas_69b[PF] = {"rfc": PF, "estatus": "no_listado"}
    api = FakeDenueAPI(DENUE_ACME)
    r = correr(sb, api, lead_base(), extras={"rfc": PF})
    assert r["pf_bloqueado"] is True
    assert "contacto_persona_fisica" in r["bloqueos"]
    assert r["bloqueos"]["contacto_persona_fisica"]["checklist"]
    assert api.llamadas == 0, "DENUE no debe consultarse con PF bloqueada"
    assert filas(sb, "denue") == []
    assert r["gate_69b"]["pasa"] is True, "el gate 69-B es compliance: corre igual"


def test_pf_se_desbloquea_si_el_grafo_lo_permitiera():
    # determinismo: la politica vive en el grafo, no cableada en el servicio
    sb = FakeSupabase()
    sb.filas_69b[PF] = {"rfc": PF, "estatus": "no_listado"}
    api = FakeDenueAPI(DENUE_ACME)
    r = correr(sb, api, lead_base(), extras={"rfc": PF},
               estados={gate_grafo.CONCEPTO_PF: "permitido"})
    assert r["pf_bloqueado"] is False
    assert api.llamadas == 1


# ---- gates del grafo sobre escalones -----------------------------------------

def test_denue_dudoso_en_grafo_bloquea_sin_tocar_ledger():
    sb = FakeSupabase()
    api = FakeDenueAPI(DENUE_ACME)
    r = correr(sb, api, lead_base(), extras={"rfc": PM},
               estados={gate_grafo.CONCEPTO_FUENTE_PUBLICA: "dudoso"})
    assert "denue" in r["bloqueos"]
    assert api.llamadas == 0
    assert filas(sb, "denue") == [], "escalon bloqueado no ejecuta: no hay intento"


def test_denue_error_es_visible_y_la_cascada_sigue():
    sb = FakeSupabase()
    sb.filas_69b[PM] = {"rfc": PM, "estatus": "no_listado"}
    r = correr(sb, FakeDenueAPI(status=500), lead_base(), extras={"rfc": PM})
    errores = filas(sb, "denue")
    assert [f["resultado"] for f in errores] == ["error"]
    assert "500" in errores[0]["detalle"]["razon"]
    assert r["gate_69b"]["pasa"] is True, "la cascada siguio tras el error DENUE"


def test_denue_sin_match_registra_miss_por_campo():
    sb = FakeSupabase()
    r = correr(sb, FakeDenueAPI([]), lead_base(), extras={"rfc": PM})
    assert sorted(f["campo"] for f in filas(sb, "denue")) == ["email", "razon_social", "telefono"]
    assert {f["resultado"] for f in filas(sb, "denue")} == {"miss"}
    assert "email" not in r["resultados"]


# ---- patron_dominio ----------------------------------------------------------

def test_patron_infiere_email_dudoso_y_consolida():
    sb = FakeSupabase()
    sb.patrones["acme.mx"] = {"dominio": "acme.mx", "patron": "{nombre}.{apellido}",
                              "soporte": 4}
    r = correr(sb, FakeDenueAPI([]), lead_base(dominio="acme.mx"),
               extras={"rfc": PM, "nombre": "Maria", "apellido": "Lopez"})
    assert r["resultados"]["email"] == {"valor": "maria.lopez@acme.mx",
                                        "veredicto": "dudoso",
                                        "fuente": "patron_dominio", "origen": "nuevo"}
    hit = [f for f in filas(sb, "patron_dominio") if f["resultado"] == "hit"][0]
    assert hit["veredicto"] == "dudoso"
    assert sb.consolidado[("lead-1", "email")]["veredicto"] == "dudoso"


def test_patron_sin_dominio_o_sin_nombre_es_miss_con_razon():
    sb = FakeSupabase()
    correr(sb, FakeDenueAPI([]), lead_base(), extras={"rfc": PM})
    miss = [f for f in filas(sb, "patron_dominio") if f["campo"] == "email"]
    assert miss and "dominio" in miss[0]["detalle"]["razon"]


def test_email_real_del_lead_refuerza_el_patron_via_rpc():
    sb = FakeSupabase()
    lead = lead_base()
    lead["contacto"] = "maria.lopez@acme.mx"
    correr(sb, FakeDenueAPI([]), lead,
           extras={"rfc": PM, "nombre": "Maria", "apellido": "Lopez"})
    assert sb.refuerzos == [{"p_dominio": "acme.mx", "p_patron": "{nombre}.{apellido}"}]


def test_email_generico_no_refuerza_nada():
    sb = FakeSupabase()
    lead = lead_base()
    lead["contacto"] = "gerencia@acme.mx"
    correr(sb, FakeDenueAPI([]), lead,
           extras={"rfc": PM, "nombre": "Maria", "apellido": "Lopez"})
    assert sb.refuerzos == []


# ---- idempotencia practica ---------------------------------------------------

def test_campos_consolidados_no_se_rebuscan():
    sb = FakeSupabase()
    for campo, valor in (("email", "v@acme.mx"), ("telefono", "55"), ("razon_social", "ACME SA DE CV")):
        sb.consolidado[("lead-1", campo)] = {"lead_id": "lead-1", "campo": campo,
                                             "valor": valor, "veredicto": "valido",
                                             "fuente": "denue", "intento_id": 1}
    api = FakeDenueAPI(DENUE_ACME)
    r = correr(sb, api, lead_base(), extras={"rfc": PM})
    assert api.llamadas == 0, "todo consolidado: DENUE no debe pagarse de nuevo"
    assert r["resultados"]["email"]["origen"] == "consolidado"


def test_forzar_rebusca_aunque_este_consolidado():
    sb = FakeSupabase()
    sb.consolidado[("lead-1", "telefono")] = {"lead_id": "lead-1", "campo": "telefono",
                                              "valor": "55", "veredicto": "valido",
                                              "fuente": "denue", "intento_id": 1}
    api = FakeDenueAPI(DENUE_ACME)
    correr(sb, api, lead_base(), extras={"rfc": PM}, forzar=True)
    assert api.llamadas == 1


# ---- fallos visibles ---------------------------------------------------------

def test_ledger_no_escribible_truena_visible():
    sb = FakeSupabase()
    sb.fallar_ledger = True
    with pytest.raises(AlmacenError, match="ledger"):
        correr(sb, FakeDenueAPI(DENUE_ACME), lead_base(), extras={"rfc": PM})


def test_sin_supabase_no_finge_persistencia():
    r = correr(None, FakeDenueAPI(DENUE_ACME), lead_base(), extras={"rfc": PM})
    assert r["persistido"] is False
    assert r["gate_69b"]["pasa"] is False
    assert "sin Supabase" in r["gate_69b"]["razon"]
