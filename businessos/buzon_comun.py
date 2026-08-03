"""buzon_comun.py — lo que comparten los host-jobs del buzon.

Vive aqui y no duplicado en cada script porque los dos jobs necesitan la MISMA
respuesta a la misma pregunta: ¿hay una persona al otro lado? Si la hubiera en
dos sitios, derivarian (doctrina del repo: arreglar lo compartido, no el caso
aislado). El nombre lleva guion BAJO a proposito: los scripts con guion medio no
son importables.
"""

from __future__ import annotations

import re

# No se responde —ni se crea un lead— para un remitente automatico. Responder es
# arriesgar un bucle de auto-respuesta entre sistemas (RFC 3834); crear un lead
# es ensuciar el embudo con una direccion que no es un cliente.
#
# Dos familias, porque no se comportan igual:
#  - EN CUALQUIER PARTE del local-part: las variantes de "no reply" nunca son
#    una persona. Va asi y no anclado al inicio porque `payments-noreply@google.com`
#    es exactamente el caso que hay que cazar (lo destapo el test de esta funcion).
#  - SOLO COMO PREFIJO: palabras que si pueden formar parte del nombre de una
#    persona o area real (`alertas.maria@`, `notificaciones-clientes@` de un
#    humano); anclarlas evita descartar a alguien de verdad.
#
# Limite honesto: es una heuristica sobre la DIRECCION. La señal correcta segun
# RFC 3834 son las cabeceras (Auto-Submitted, Precedence, List-Unsubscribe), que
# hoy la ingesta no persiste. Mejora pendiente, mas robusta que adivinar.
_NO_REPLY_EN_CUALQUIER_PARTE = re.compile(
    r"no-?reply|do-?not-?reply|noresponder|no-?responder", re.IGNORECASE)
_AUTOMATICO_COMO_PREFIJO = re.compile(
    r"^(mailer-daemon|postmaster|bounces?|notifications?|notificaciones?|"
    r"alerts?|alertas?|automated|automatico|daemon|robot|bot)[.\-_+@]",
    re.IGNORECASE)


def remitente_automatico(direccion: str) -> bool:
    """True si al otro lado hay una maquina, no una persona."""
    limpia = (direccion or "").strip()
    local = limpia.split("@")[0]
    if not local:
        return True  # sin remitente no hay a quien responder: fail-safe
    return bool(_NO_REPLY_EN_CUALQUIER_PARTE.search(local)
                or _AUTOMATICO_COMO_PREFIJO.match(limpia))
