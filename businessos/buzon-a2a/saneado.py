"""Saneado de correo entrante — pipeline puro de SPEC-buzon-a2a §2.1.

Modulo PURO (stdlib): lo importa ingerir-entrantes.py (host-job) y lo ejercita el
corpus de inyecciones. Todo lo que se ELIMINA queda declarado en `eliminados`
para que la pantalla de aprobacion (A5) muestre la marca visual de que se quito.

Orden del pipeline (sanear):
  1. aplana HTML → texto; elimina script/style/head, display:none, visibility:hidden,
     font-size:0 y anchos cero (texto invisible para el humano, visible para el modelo)
  2. normaliza Unicode (NFKC) y quita invisibles U+200B-200D, U+FEFF, U+E0000-E007F
  3. trunca el hilo citado (solo el mensaje nuevo entra al contexto)

El hash de evidencia (hash_cuerpo) se calcula SIEMPRE sobre el original crudo,
antes de tocar nada.
"""

from __future__ import annotations

import hashlib
import re
import unicodedata
from html.parser import HTMLParser

# U+200B..200D zero-width, U+FEFF BOM/ZWNBSP, U+E0000..E007F (bloque tag: texto
# invisible usado para contrabandear instrucciones a un modelo).
_INVISIBLES = re.compile("[​-‍﻿]|[\U000e0000-\U000e007f]")

_ESTILO_OCULTO = re.compile(
    r"display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0(?:px|pt|em|rem)?\b"
    r"|max-height\s*:\s*0|(?:max-)?width\s*:\s*0(?:px|pt|em|rem)?\b|opacity\s*:\s*0(?:\.0+)?\s*(;|$)",
    re.IGNORECASE,
)

# Ocultamiento por COLOR: texto del mismo color que su fondo (el clasico blanco
# sobre blanco). No basta con leer `color`: hay que compararlo con el fondo
# declarado en el MISMO style. Se normalizan las formas equivalentes de un color
# (#fff / #ffffff / white / rgb(255,255,255)) porque el atacante elige la que no
# esperas. Hueco encontrado por el corpus de inyecciones (2026-08-02).
_COLOR_RE = re.compile(r"(?<!-)\bcolor\s*:\s*([^;]+)", re.IGNORECASE)
_FONDO_RE = re.compile(r"background(?:-color)?\s*:\s*([^;]+)", re.IGNORECASE)

_EQUIVALENTES = {
    "#fff": "#ffffff", "white": "#ffffff", "rgb(255,255,255)": "#ffffff",
    "#000": "#000000", "black": "#000000", "rgb(0,0,0)": "#000000",
}


def _color_normal(valor: str) -> str:
    v = re.sub(r"\s+", "", valor).lower().rstrip("!important")
    return _EQUIVALENTES.get(v, v)


def _oculto_por_color(estilo: str) -> bool:
    """True si el texto lleva el mismo color que su fondo en el mismo style."""
    m_color = _COLOR_RE.search(estilo)
    m_fondo = _FONDO_RE.search(estilo)
    if not (m_color and m_fondo):
        return False
    fondo = _color_normal(m_fondo.group(1))
    # `background: #fff url(...)` — el color es el primer token.
    fondo = fondo.split("url(")[0].strip() or fondo
    return _color_normal(m_color.group(1)) == fondo

_TAGS_SIN_TEXTO = {"script", "style", "head", "title", "template"}


class _Aplanador(HTMLParser):
    """Aplana HTML a texto dejando fuera todo lo invisible, y lo declara."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.trozos: list[str] = []
        self.eliminados: list[str] = []
        self._mudo = 0  # profundidad dentro de un subarbol invisible

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        estilo = dict(attrs).get("style") or ""
        oculto_attr = "hidden" in dict(attrs)
        if self._mudo:
            self._mudo += 1
            return
        if (tag in _TAGS_SIN_TEXTO or _ESTILO_OCULTO.search(estilo)
                or _oculto_por_color(estilo) or oculto_attr):
            self._mudo = 1
            motivo = tag if tag in _TAGS_SIN_TEXTO else f"{tag} oculto ({estilo or 'hidden'})"
            self.eliminados.append(f"bloque invisible: {motivo}"[:120])
        elif tag in ("br", "p", "div", "tr", "li"):
            self.trozos.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if self._mudo:
            self._mudo -= 1

    def handle_data(self, data: str) -> None:
        if not self._mudo:
            self.trozos.append(data)


def aplanar_html(cuerpo: str) -> tuple[str, list[str]]:
    """HTML → texto plano; devuelve (texto, lista de lo eliminado)."""
    p = _Aplanador()
    p.feed(cuerpo)
    p.close()
    texto = "".join(p.trozos)
    texto = re.sub(r"[ \t]+", " ", texto)
    texto = re.sub(r"\n{3,}", "\n\n", texto)
    return texto.strip(), p.eliminados


def normalizar_unicode(texto: str) -> tuple[str, int]:
    """NFKC + strip de invisibles. Devuelve (texto, cuantos invisibles se quitaron)."""
    normal = unicodedata.normalize("NFKC", texto)
    limpio, n = _INVISIBLES.subn("", normal)
    return limpio, n


# Marcadores de inicio de hilo citado (es/en) — a partir de ahi se corta.
_MARCAS_CITA = [
    re.compile(r"^-{2,}\s*(Original Message|Mensaje original|Forwarded message|Mensaje reenviado)", re.I | re.M),
    re.compile(r"^On .{4,80} wrote:\s*$", re.M),
    re.compile(r"^El .{4,80} escribi[oó]:\s*$", re.M),
    re.compile(r"^De:\s.+\n(Enviado|Para|Fecha):\s", re.M),
    re.compile(r"^From:\s.+\n(Sent|To|Date):\s", re.M),
]


def truncar_hilo(texto: str) -> tuple[str, bool]:
    """Corta el hilo citado: solo el mensaje nuevo. Devuelve (texto, se_trunco)."""
    corte = len(texto)
    for marca in _MARCAS_CITA:
        m = marca.search(texto)
        if m and m.start() < corte:
            corte = m.start()
    sin_cita = texto[:corte]
    # Lineas enteras de cita (>) que queden sueltas antes del marcador.
    lineas = [ln for ln in sin_cita.splitlines() if not ln.lstrip().startswith(">")]
    quito_lineas = len(lineas) != len(sin_cita.splitlines())
    resultado = "\n".join(lineas).strip()
    return resultado, corte < len(texto) or quito_lineas


def dmarc_alineado(cabeceras: dict) -> bool:
    """Verifica alineacion DMARC del remitente con lo que el MTA receptor ya evaluo.

    Fuente: cabecera Authentication-Results del proveedor (Graph/Gmail/IMAP la
    exponen). Sin esa cabecera o sin dmarc=pass → False (fail-closed): un correo
    no alineado no se descarta, pero entra marcado y la UI lo muestra.
    """
    valor = ""
    for k, v in cabeceras.items():
        if str(k).lower() == "authentication-results":
            valor += f" {v}"
    return bool(re.search(r"\bdmarc\s*=\s*pass\b", valor, re.IGNORECASE))


def hash_cuerpo(crudo: bytes | str) -> str:
    """sha256 del cuerpo ORIGINAL (evidencia inmutable, antes de sanear)."""
    datos = crudo.encode("utf-8", "replace") if isinstance(crudo, str) else crudo
    return hashlib.sha256(datos).hexdigest()


def sanear(cuerpo: str, es_html: bool) -> dict:
    """Pipeline completo. Devuelve {texto, eliminados, invisibles, truncado}."""
    eliminados: list[str] = []
    texto = cuerpo
    if es_html:
        texto, eliminados = aplanar_html(texto)
    texto, invisibles = normalizar_unicode(texto)
    if invisibles:
        eliminados.append(f"{invisibles} caracter(es) invisible(s) (zero-width/tag)")
    texto, truncado = truncar_hilo(texto)
    if truncado:
        eliminados.append("hilo citado truncado: solo el mensaje nuevo")
    return {"texto": texto, "eliminados": eliminados, "invisibles": invisibles, "truncado": truncado}
