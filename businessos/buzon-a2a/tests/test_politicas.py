"""Los 11 gates de SPEC-buzon-a2a §3: caso positivo y negativo de CADA uno.

Control de calidad del checklist §8: "11 gates con prueba unitaria y caso
negativo". La tabla de severidades ES contrato: si cambia, cambia la SPEC.
"""
from __future__ import annotations

import politicas


def borrador_ok() -> dict:
    return {
        "hilo_id": "h1",
        "destinatarios": {"to": ["cliente@externo.com"], "cc": [], "bcc": []},
        "asunto": "Re: consulta",
        "cuerpo": (
            "Hola,\n\nRecibimos tu mensaje. Detalles en https://miempresa.com/faq\n\n"
            "--\nLEYENDA-AGENTE"
        ),
        "cabeceras": {"Auto-Submitted": "auto-replied"},
        "adjuntos": [],
        "automatico": True,
        "derivado_de_hilos": ["h1"],
    }


def ctx_ok() -> dict:
    return {
        "hilo_id": "h1",
        "participantes_hilo": ["cliente@externo.com", "ventas@miempresa.com"],
        "dominios_institucionales": ["miempresa.com"],
        "catalogo_adjuntos": ["cat-1"],
        "pii_otros_hilos": ["555-123-4567", "otrocliente@x.com"],
        "leyenda_divulgacion": "LEYENDA-AGENTE",
        "canario": "CANARIO-3f9a",
        "enviados_ultima_hora": 0,
        "enviados_en_hilo": 0,
        "cuota_hora": 10,
        "cuota_hilo": 5,
        "pausa_global": False,
    }


def solo(gate: str, borrador: dict, ctx: dict) -> politicas.Resultado:
    return politicas.GATES[gate](borrador, ctx)


# ---------- contrato global ----------

def test_severidades_son_la_tabla_de_la_spec():
    assert politicas.SEVERIDADES == {
        "destinatarios_del_hilo": "CRITICA", "sin_bcc": "CRITICA",
        "sin_reenvio": "CRITICA", "adjuntos_de_catalogo": "CRITICA",
        "urls_de_dominio": "ALTA", "sin_datos_personales_cruzados": "CRITICA",
        "divulgacion_presente": "ALTA", "cuota_por_buzon": "ALTA",
        "canario_ausente": "CRITICA", "auto_submitted_marcado": "MEDIA",
        "sin_secretos": "CRITICA",
    }


def test_evaluar_corre_los_11_y_todos_verdes_con_borrador_sano():
    resultados = politicas.evaluar(borrador_ok(), ctx_ok())
    assert len(resultados) == 11
    assert [r.gate for r in resultados] == list(politicas.SEVERIDADES)
    assert all(r.paso for r in resultados), [r for r in resultados if not r.paso]
    assert politicas.criticos_en_rojo(resultados) == []


# ---------- destinatarios_del_hilo ----------

def test_destinatario_fuera_del_hilo_rojo():
    b = borrador_ok()
    b["destinatarios"]["cc"] = ["atacante@fuera.com"]
    r = solo("destinatarios_del_hilo", b, ctx_ok())
    assert not r.paso and r.severidad == "CRITICA" and "atacante@fuera.com" in r.detalles


def test_destinatario_fuera_con_aprobacion_explicita_verde():
    b = borrador_ok()
    b["destinatarios"]["to"] = ["nuevo@fuera.com"]
    b["destinatarios_aprobados_explicitamente"] = True
    assert solo("destinatarios_del_hilo", b, ctx_ok()).paso


def test_sin_destinatario_to_rojo():
    b = borrador_ok()
    b["destinatarios"]["to"] = []
    assert not solo("destinatarios_del_hilo", b, ctx_ok()).paso


# ---------- sin_bcc ----------

def test_bcc_rojo_y_vacio_verde():
    b = borrador_ok()
    assert solo("sin_bcc", b, ctx_ok()).paso
    b["destinatarios"]["bcc"] = ["espia@fuera.com"]
    r = solo("sin_bcc", b, ctx_ok())
    assert not r.paso and r.severidad == "CRITICA"


# ---------- sin_reenvio ----------

def test_derivado_de_otro_hilo_rojo():
    b = borrador_ok()
    b["derivado_de_hilos"] = ["h1", "h2-ajeno"]
    r = solo("sin_reenvio", b, ctx_ok())
    assert not r.paso and "h2-ajeno" in r.detalles


def test_borrador_de_hilo_distinto_rojo():
    b = borrador_ok()
    b["hilo_id"] = "h9"
    assert not solo("sin_reenvio", b, ctx_ok()).paso


def test_derivado_solo_del_hilo_verde():
    assert solo("sin_reenvio", borrador_ok(), ctx_ok()).paso


# ---------- adjuntos_de_catalogo ----------

def test_adjunto_de_catalogo_verde():
    b = borrador_ok()
    b["adjuntos"] = [{"catalogo_id": "cat-1"}]
    assert solo("adjuntos_de_catalogo", b, ctx_ok()).paso


def test_adjunto_por_ruta_rojo():
    b = borrador_ok()
    b["adjuntos"] = [{"ruta": "/tmp/generado.pdf"}]
    assert not solo("adjuntos_de_catalogo", b, ctx_ok()).paso


def test_adjunto_catalogo_desconocido_rojo():
    b = borrador_ok()
    b["adjuntos"] = [{"catalogo_id": "cat-inventado"}]
    assert not solo("adjuntos_de_catalogo", b, ctx_ok()).paso


# ---------- urls_de_dominio ----------

def test_url_institucional_y_subdominio_verdes():
    b = borrador_ok()
    b["cuerpo"] += "\nhttps://docs.miempresa.com/guia"
    assert solo("urls_de_dominio", b, ctx_ok()).paso


def test_url_externa_roja():
    b = borrador_ok()
    b["cuerpo"] += "\nhttp://phishing.evil.example/login"
    r = solo("urls_de_dominio", b, ctx_ok())
    assert not r.paso and "phishing.evil.example" in r.detalles


# ---------- sin_datos_personales_cruzados ----------

def test_pii_de_otro_hilo_roja_sin_repetirla_entera():
    b = borrador_ok()
    b["cuerpo"] += "\nEl telefono es 555-123-4567."
    r = solo("sin_datos_personales_cruzados", b, ctx_ok())
    assert not r.paso and r.severidad == "CRITICA"
    assert "555-123-4567" not in r.evidencia  # la evidencia no re-filtra la PII
    assert all("555-123-4567" not in d for d in r.detalles)


def test_sin_pii_cruzada_verde():
    assert solo("sin_datos_personales_cruzados", borrador_ok(), ctx_ok()).paso


# ---------- divulgacion_presente ----------

def test_sin_leyenda_en_cuerpo_rojo():
    b = borrador_ok()
    b["cuerpo"] = b["cuerpo"].replace("LEYENDA-AGENTE", "")
    assert not solo("divulgacion_presente", b, ctx_ok()).paso


def test_contexto_sin_leyenda_configurada_rojo():
    ctx = ctx_ok()
    ctx["leyenda_divulgacion"] = ""
    assert not solo("divulgacion_presente", borrador_ok(), ctx).paso


# ---------- cuota_por_buzon ----------

def test_cuota_hora_agotada_roja():
    ctx = ctx_ok()
    ctx["enviados_ultima_hora"] = 10
    assert not solo("cuota_por_buzon", borrador_ok(), ctx).paso


def test_cuota_hilo_agotada_roja():
    ctx = ctx_ok()
    ctx["enviados_en_hilo"] = 5
    assert not solo("cuota_por_buzon", borrador_ok(), ctx).paso


def test_pausa_del_guardian_roja():
    ctx = ctx_ok()
    ctx["pausa_global"] = True
    r = solo("cuota_por_buzon", borrador_ok(), ctx)
    assert not r.paso and "Guardian" in r.evidencia


# ---------- canario_ausente ----------

def test_canario_en_cuerpo_rojo():
    b = borrador_ok()
    b["cuerpo"] += "\nCANARIO-3f9a"
    r = solo("canario_ausente", b, ctx_ok())
    assert not r.paso and r.severidad == "CRITICA"


def test_sin_canario_configurado_rojo_fail_closed():
    ctx = ctx_ok()
    ctx["canario"] = ""
    assert not solo("canario_ausente", borrador_ok(), ctx).paso


# ---------- auto_submitted_marcado ----------

def test_automatico_sin_cabecera_rojo():
    b = borrador_ok()
    b["cabeceras"] = {}
    r = solo("auto_submitted_marcado", b, ctx_ok())
    assert not r.paso and r.severidad == "MEDIA"


def test_no_automatico_sin_cabecera_verde():
    b = borrador_ok()
    b["cabeceras"] = {}
    b["automatico"] = False
    assert solo("auto_submitted_marcado", b, ctx_ok()).paso


# ---------- sin_secretos ----------

def test_secreto_sk_y_jwt_rojos():
    for secreto in ("sk-abcdefghijklmnopqrstuvwx",
                    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIx"):
        b = borrador_ok()
        b["cuerpo"] += f"\n{secreto}"
        assert not solo("sin_secretos", b, ctx_ok()).paso, secreto


def test_sin_secretos_verde():
    assert solo("sin_secretos", borrador_ok(), ctx_ok()).paso


# ---------- criticos_en_rojo ----------

def test_criticos_en_rojo_filtra_solo_criticas():
    b = borrador_ok()
    b["cabeceras"] = {}                      # auto_submitted (MEDIA) rojo
    b["destinatarios"]["bcc"] = ["x@y.z"]    # sin_bcc (CRITICA) rojo
    resultados = politicas.evaluar(b, ctx_ok())
    rojos_criticos = politicas.criticos_en_rojo(resultados)
    assert [r.gate for r in rojos_criticos] == ["sin_bcc"]
