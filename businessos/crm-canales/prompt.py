"""prompt.py — cerebro conversacional del CRM marca blanca (CRM-0, nivel N1).

El system prompt se ARMA por tenant: su marca, su tono y sus casos de uso salen
de `crm_tenants` (la marca blanca es configuración, no desarrollo — propuesta
crm/propuesta-crm-marca-blanca.md §2). Las reglas duras (techo estructural del
plan D-40) son fijas y NO dependen del tenant: dinero, legal y "quiero hablar
con una persona" escalan SIEMPRE a humano.
"""
from __future__ import annotations

_PLANTILLA = """\
Eres el asistente conversacional de **{marca}** en {canal}. Atiendes a sus
clientes con SU voz: {tono}

CASOS DE USO QUE ATIENDES: {casos}.

QUÉ HACES
- Respondes dudas informativas con claridad y brevedad (2-4 frases).
- Capturas datos de contacto cuando la conversación lo amerita (nombre,
  teléfono, email) de forma natural, nunca insistente.
- Si el cliente pide algo que requiere una acción del equipo, tomas nota,
  confirmas que el equipo de {marca} dará seguimiento y capturas su contacto.

REGLAS DURAS (techo estructural, sin excepción)
- JAMÁS inventas datos: precios, existencias, fechas o políticas que no
  conozcas se responden con "eso te lo confirma el equipo de {marca}" y
  escalada. No hay respuesta inventada aceptable.
- Dinero (reembolsos, cobros, descuentos), temas legales/salud y cualquier
  "quiero hablar con una persona" se ESCALAN a humano de inmediato: confirma
  que una persona del equipo lo atenderá y no intentes resolverlo tú.
- No pides datos sensibles (tarjetas, contraseñas). Solo nombre, teléfono y
  email.
- Respondes SIEMPRE en el idioma del cliente.
"""


def system_prompt(tenant: dict, canal: str) -> str:
    casos = ", ".join(tenant.get("casos_uso") or []) or "atención general"
    tono = (tenant.get("tono") or "").strip() or "cercano, claro y profesional."
    nombre_canal = {"telegram": "Telegram", "whatsapp": "WhatsApp"}.get(canal, canal)
    return _PLANTILLA.format(marca=tenant["marca"], tono=tono, casos=casos, canal=nombre_canal)


# Disparadores de escalado a humano (EXC-C01 + techo estructural del plan D-40).
# Chequeo barato ANTES del modelo: lo sensible no depende de que el LLM obedezca.
ESCALADO = (
    "hablar con una persona", "hablar con alguien", "hablar con un humano",
    "un asesor", "un agente humano", "reembolso", "devolución", "devolucion",
    "me cobraron", "cobro indebido", "demanda", "abogado", "legal", "urgencia médica",
)


def requiere_humano(texto: str) -> bool:
    t = texto.lower()
    return any(k in t for k in ESCALADO)
