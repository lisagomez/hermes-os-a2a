"""patrones.py — escalon patron_dominio: inferencia de correo corporativo (App A).

Gateado por el grafo bajo "inferencia de correo corporativo por patron de
correo de dominio" (dato de contacto laboral de representante, LFPDPPP 2025).

Dos operaciones deterministas, ambas sobre PLANTILLAS CERRADAS (sin IA):
- derivar(correo, nombre, apellido): ¿el local-part de un correo REAL coincide
  con alguna plantilla instanciada? -> esa plantilla refuerza dominio_patron
  (RPC atomica del almacen).
- inferir(patron, nombre, apellido, dominio): instancia la plantilla para un
  contacto SIN correo. El resultado SIEMPRE sale veredicto 'dudoso' (inferido,
  no verificado): el consolidado jamas lo pisa sobre un correo 'valido'.
"""
from __future__ import annotations

import re
import unicodedata

# Plantillas cerradas: el dominio de patron es un vocabulario, no texto libre.
PLANTILLAS = [
    "{nombre}.{apellido}",
    "{inicial_nombre}{apellido}",
    "{inicial_nombre}.{apellido}",
    "{nombre}{apellido}",
    "{nombre}",
    "{apellido}",
    "{nombre}_{apellido}",
]


def _atomo(texto: str) -> str:
    """Minusculas ascii sin acentos ni separadores (atomo de local-part)."""
    plano = unicodedata.normalize("NFKD", texto or "")
    plano = "".join(c for c in plano if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", plano.lower())


def instanciar(plantilla: str, nombre: str, apellido: str) -> str:
    n, a = _atomo(nombre), _atomo(apellido)
    if not n or not a:
        return ""
    return plantilla.format(nombre=n, apellido=a, inicial_nombre=n[0])


def derivar(correo: str, nombre: str, apellido: str) -> str | None:
    """Plantilla que explica el correo real, o None (nada que reforzar)."""
    correo = (correo or "").strip().lower()
    if "@" not in correo:
        return None
    local = correo.split("@", 1)[0]
    for plantilla in PLANTILLAS:
        instancia = instanciar(plantilla, nombre, apellido)
        if instancia and instancia == local:
            return plantilla
    return None


def inferir(patron: str, nombre: str, apellido: str, dominio: str) -> str | None:
    """Correo inferido (SIEMPRE 'dudoso' aguas arriba), o None si no instanciable."""
    if patron not in PLANTILLAS:
        # un patron fuera del vocabulario no se instancia: vino corrupto de la BD
        return None
    local = instanciar(patron, nombre, apellido)
    dominio = (dominio or "").strip().lower()
    if not local or "." not in dominio or "@" in dominio:
        return None
    return f"{local}@{dominio}"


def dominio_de(correo_o_sitio: str) -> str:
    """Dominio en minusculas desde un correo o una URL; '' si no se puede."""
    texto = (correo_o_sitio or "").strip().lower()
    if not texto:
        return ""
    if "@" in texto:
        return texto.rsplit("@", 1)[1]
    texto = re.sub(r"^https?://", "", texto).split("/", 1)[0]
    texto = texto.removeprefix("www.")
    return texto if "." in texto else ""
