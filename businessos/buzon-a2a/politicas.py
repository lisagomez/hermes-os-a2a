"""Motor de politicas del buzon — los 11 gates deterministas de SPEC-buzon-a2a §3.

Modulo PURO (stdlib, sin red, sin credenciales): cada gate es una funcion
`fn(borrador: dict, ctx: dict) -> Resultado` que juzga un borrador saliente
contra el contexto que le da quien lo invoca. Dos consumidores:

  - buzon-a2a (runtime): evalua el borrador ANTES de persistirlo; cualquier
    gate CRITICO en rojo → el borrador ni siquiera llega a la bandeja de A5.
  - supervisor-a2a/chequeos_buzon.py (adaptador): registra estos mismos gates
    en gates.CHEQUEOS leyendo borradores serializados del worktree.

Import unidireccional: nadie de aqui importa de los servicios. El supervisor
lo COPY-a a su imagen (patron trio-contrato/contrato.py).

Contrato del borrador (dict):
  hilo_id            str   — hilo al que responde
  destinatarios      dict  — {"to": [..], "cc": [..], "bcc": [..]}
  asunto, cuerpo     str
  cabeceras          dict  — cabeceras salientes adicionales (p. ej. Auto-Submitted)
  adjuntos           list  — [{"catalogo_id": str}] SOLO por id de catalogo
  automatico         bool  — respuesta generada sin peticion explicita del hilo
  derivado_de_hilos  list  — hilos cuyo contenido alimento el cuerpo (lo declara el redactor)
  destinatarios_aprobados_explicitamente  bool — excepcion humana al gate de hilo

Contrato del contexto (dict) — quien invoca es responsable de poblarlo:
  hilo_id                  str        — hilo vigente
  participantes_hilo       list[str]  — direcciones vistas en el hilo (from/to/cc entrantes)
  dominios_institucionales list[str]  — dominios permitidos en enlaces
  catalogo_adjuntos        list[str]  — ids de adjuntos aprobados
  pii_otros_hilos          list[str]  — señales de PII ajenas al hilo (correos, telefonos, nombres)
  leyenda_divulgacion      str        — texto obligatorio de agente automatizado
  canario                  str        — token canario del sistema (JAMAS debe salir)
  enviados_ultima_hora     int
  enviados_en_hilo         int
  cuota_hora               int        — N de la SPEC (default DEFAULT_CUOTA_HORA)
  cuota_hilo               int        — M de la SPEC (default DEFAULT_CUOTA_HILO)
  pausa_global             bool       — interruptor del Guardian (A6)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

DEFAULT_CUOTA_HORA = 10
DEFAULT_CUOTA_HILO = 5

CRITICA = "CRITICA"
ALTA = "ALTA"
MEDIA = "MEDIA"

# Severidades de SPEC-buzon-a2a §3 — la tabla es el contrato, no una sugerencia.
SEVERIDADES: dict[str, str] = {
    "destinatarios_del_hilo": CRITICA,
    "sin_bcc": CRITICA,
    "sin_reenvio": CRITICA,
    "adjuntos_de_catalogo": CRITICA,
    "urls_de_dominio": ALTA,
    "sin_datos_personales_cruzados": CRITICA,
    "divulgacion_presente": ALTA,
    "cuota_por_buzon": ALTA,
    "canario_ausente": CRITICA,
    "auto_submitted_marcado": MEDIA,
    "sin_secretos": CRITICA,
}


@dataclass(frozen=True)
class Resultado:
    gate: str
    paso: bool
    severidad: str
    evidencia: str
    detalles: list[str] = field(default_factory=list)


def _res(gate: str, paso: bool, evidencia: str, detalles: list[str] | None = None) -> Resultado:
    return Resultado(gate, paso, SEVERIDADES[gate], evidencia, detalles or [])


def _norm_dir(direccion: str) -> str:
    return direccion.strip().lower()


def _destinatarios(borrador: dict) -> dict:
    d = borrador.get("destinatarios") or {}
    return {
        "to": [_norm_dir(x) for x in d.get("to") or []],
        "cc": [_norm_dir(x) for x in d.get("cc") or []],
        "bcc": [_norm_dir(x) for x in d.get("bcc") or []],
    }


def destinatarios_del_hilo(borrador: dict, ctx: dict) -> Resultado:
    """To ∪ Cc ⊆ participantes(hilo), salvo aprobacion explicita marcada."""
    gate = "destinatarios_del_hilo"
    if borrador.get("destinatarios_aprobados_explicitamente"):
        return _res(gate, True, "excepcion: destinatarios aprobados explicitamente por humano")
    d = _destinatarios(borrador)
    participantes = {_norm_dir(p) for p in ctx.get("participantes_hilo") or []}
    fuera = sorted(set(d["to"]) | set(d["cc"]) - participantes if False else
                   (set(d["to"]) | set(d["cc"])) - participantes)
    if not d["to"]:
        return _res(gate, False, "borrador sin destinatario To")
    if fuera:
        return _res(gate, False, f"{len(fuera)} destinatario(s) fuera del hilo", fuera)
    return _res(gate, True, f"{len(d['to']) + len(d['cc'])} destinatario(s), todos del hilo")


def sin_bcc(borrador: dict, ctx: dict) -> Resultado:
    """Bcc = ∅ siempre."""
    bcc = _destinatarios(borrador)["bcc"]
    if bcc:
        return _res("sin_bcc", False, f"Bcc presente ({len(bcc)})", bcc)
    return _res("sin_bcc", True, "sin Bcc")


def sin_reenvio(borrador: dict, ctx: dict) -> Resultado:
    """Ningun saliente puede tener cuerpo derivado de otro hilo."""
    gate = "sin_reenvio"
    hilo = str(ctx.get("hilo_id") or "")
    declarados = [str(h) for h in borrador.get("derivado_de_hilos") or []]
    if not hilo:
        return _res(gate, False, "contexto sin hilo_id: no se puede acotar la derivacion")
    ajenos = sorted({h for h in declarados if h != hilo})
    if ajenos:
        return _res(gate, False, f"cuerpo derivado de {len(ajenos)} hilo(s) ajeno(s)", ajenos)
    if str(borrador.get("hilo_id") or "") != hilo:
        return _res(gate, False,
                    f"borrador del hilo {borrador.get('hilo_id')!r} evaluado contra {hilo!r}")
    return _res(gate, True, "derivado solo del hilo vigente")


def adjuntos_de_catalogo(borrador: dict, ctx: dict) -> Resultado:
    """Adjuntos solo por id de catalogo aprobado, nunca ruta generada."""
    gate = "adjuntos_de_catalogo"
    catalogo = {str(c) for c in ctx.get("catalogo_adjuntos") or []}
    malos: list[str] = []
    for adj in borrador.get("adjuntos") or []:
        if not isinstance(adj, dict) or set(adj) != {"catalogo_id"}:
            malos.append(f"adjunto sin forma de catalogo: {adj!r}"[:120])
        elif str(adj["catalogo_id"]) not in catalogo:
            malos.append(f"catalogo_id desconocido: {adj['catalogo_id']}")
    if malos:
        return _res(gate, False, f"{len(malos)} adjunto(s) fuera de catalogo", malos)
    return _res(gate, True, f"{len(borrador.get('adjuntos') or [])} adjunto(s), todos de catalogo")


_URL_RE = re.compile(r"https?://([^\s/>\)\]\"']+)", re.IGNORECASE)


def urls_de_dominio(borrador: dict, ctx: dict) -> Resultado:
    """Enlaces solo a dominios institucionales listados (match exacto o subdominio)."""
    gate = "urls_de_dominio"
    permitidos = [d.lower().lstrip(".") for d in ctx.get("dominios_institucionales") or []]
    fuera: list[str] = []
    for host in _URL_RE.findall(borrador.get("cuerpo") or ""):
        h = host.lower().split(":")[0]
        if not any(h == d or h.endswith("." + d) for d in permitidos):
            fuera.append(h)
    if fuera:
        return _res(gate, False, f"{len(fuera)} enlace(s) fuera de dominio", sorted(set(fuera)))
    return _res(gate, True, "sin enlaces fuera de dominios institucionales")


def sin_datos_personales_cruzados(borrador: dict, ctx: dict) -> Resultado:
    """El borrador no contiene PII presente en otros hilos."""
    gate = "sin_datos_personales_cruzados"
    texto = f"{borrador.get('asunto') or ''}\n{borrador.get('cuerpo') or ''}".lower()
    cruzada = sorted({p for p in (ctx.get("pii_otros_hilos") or [])
                      if p and p.lower() in texto})
    if cruzada:
        # La evidencia NO repite la PII completa: cuenta y trunca.
        muestras = [p[:3] + "…" for p in cruzada]
        return _res(gate, False, f"{len(cruzada)} dato(s) de PII de otros hilos en el borrador", muestras)
    return _res(gate, True, "sin PII cruzada de otros hilos")


def divulgacion_presente(borrador: dict, ctx: dict) -> Resultado:
    """Todo saliente incluye la leyenda de agente automatizado."""
    gate = "divulgacion_presente"
    leyenda = (ctx.get("leyenda_divulgacion") or "").strip()
    if not leyenda:
        return _res(gate, False, "contexto sin leyenda_divulgacion configurada")
    if leyenda.lower() not in (borrador.get("cuerpo") or "").lower():
        return _res(gate, False, "la leyenda de agente automatizado no aparece en el cuerpo")
    return _res(gate, True, "leyenda de divulgacion presente")


def cuota_por_buzon(borrador: dict, ctx: dict) -> Resultado:
    """≤ N envios/hora/buzon, ≤ M por hilo; y el interruptor del Guardian manda."""
    gate = "cuota_por_buzon"
    if ctx.get("pausa_global"):
        return _res(gate, False, "pausa global del Guardian activa: nada sale")
    n = int(ctx.get("cuota_hora") or DEFAULT_CUOTA_HORA)
    m = int(ctx.get("cuota_hilo") or DEFAULT_CUOTA_HILO)
    hora = int(ctx.get("enviados_ultima_hora") or 0)
    hilo = int(ctx.get("enviados_en_hilo") or 0)
    if hora >= n:
        return _res(gate, False, f"cuota por hora agotada ({hora}/{n})")
    if hilo >= m:
        return _res(gate, False, f"cuota por hilo agotada ({hilo}/{m})")
    return _res(gate, True, f"cuota ok (hora {hora}/{n}, hilo {hilo}/{m})")


def canario_ausente(borrador: dict, ctx: dict) -> Resultado:
    """El token canario de sistema NO aparece en el cuerpo (señal de exfiltracion de prompt)."""
    gate = "canario_ausente"
    canario = ctx.get("canario") or ""
    if not canario:
        return _res(gate, False, "contexto sin canario configurado: el gate no puede vigilar")
    texto = f"{borrador.get('asunto') or ''}\n{borrador.get('cuerpo') or ''}"
    if canario in texto:
        return _res(gate, False, "el token canario aparece en el saliente: intento de inyeccion")
    return _res(gate, True, "canario ausente del saliente")


def auto_submitted_marcado(borrador: dict, ctx: dict) -> Resultado:
    """Cabecera Auto-Submitted: auto-replied en los automaticos (RFC 3834)."""
    gate = "auto_submitted_marcado"
    if not borrador.get("automatico"):
        return _res(gate, True, "no es automatico: cabecera no requerida")
    cabeceras = {str(k).lower(): str(v).lower()
                 for k, v in (borrador.get("cabeceras") or {}).items()}
    if cabeceras.get("auto-submitted", "").startswith("auto-"):
        return _res(gate, True, "Auto-Submitted presente")
    return _res(gate, False, "automatico sin cabecera Auto-Submitted: auto-replied")


# Mismas familias que el chequeo base sin_secretos del supervisor: formatos de
# credencial conocidos de la fabrica + genericos.
_PATRONES_SECRETO = [
    (re.compile(r"sk-[A-Za-z0-9_\-]{20,}"), "clave sk-…"),
    (re.compile(r"sbp_[A-Za-z0-9]{20,}"), "token sbp_…"),
    (re.compile(r"polar_oat_[A-Za-z0-9]{10,}"), "token polar_oat_…"),
    (re.compile(r"eyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{10,}"), "JWT"),
    (re.compile(r"AKIA[0-9A-Z]{16}"), "AWS access key"),
    (re.compile(r"(?i)(password|passwd|api[_-]?key|secret)\s*[:=]\s*\S{8,}"), "credencial inline"),
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"), "llave privada"),
]


def sin_secretos(borrador: dict, ctx: dict) -> Resultado:
    """Ningun secreto con formato conocido viaja en un saliente."""
    gate = "sin_secretos"
    texto = f"{borrador.get('asunto') or ''}\n{borrador.get('cuerpo') or ''}"
    hallados = [nombre for patron, nombre in _PATRONES_SECRETO if patron.search(texto)]
    if hallados:
        return _res(gate, False, f"{len(hallados)} patron(es) de secreto en el saliente", hallados)
    return _res(gate, True, "sin patrones de secreto")


# Orden de la tabla de SPEC §3. El dict es el catalogo canonico: buzon-a2a lo
# recorre en runtime y chequeos_buzon.py lo adapta al motor del supervisor.
GATES: dict[str, object] = {
    "destinatarios_del_hilo": destinatarios_del_hilo,
    "sin_bcc": sin_bcc,
    "sin_reenvio": sin_reenvio,
    "adjuntos_de_catalogo": adjuntos_de_catalogo,
    "urls_de_dominio": urls_de_dominio,
    "sin_datos_personales_cruzados": sin_datos_personales_cruzados,
    "divulgacion_presente": divulgacion_presente,
    "cuota_por_buzon": cuota_por_buzon,
    "canario_ausente": canario_ausente,
    "auto_submitted_marcado": auto_submitted_marcado,
    "sin_secretos": sin_secretos,
}


def evaluar(borrador: dict, ctx: dict) -> list[Resultado]:
    """Corre los 11 gates. Siempre corre TODOS (la bandeja de A5 muestra cada uno)."""
    return [fn(borrador, ctx) for fn in GATES.values()]


def criticos_en_rojo(resultados: list[Resultado]) -> list[Resultado]:
    return [r for r in resultados if not r.paso and r.severidad == CRITICA]
