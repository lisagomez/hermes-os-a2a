"""onboarding.py — maquina de estados del alta de un buzon (SPEC-buzon-a2a §11).

Modulo PURO (stdlib, sin red): las dos reglas que deciden si un buzon puede
empezar a enviar, escritas donde se pueden probar.

Por que vive aqui y no solo en la UI: el modo espejo y el relajamiento son
POLITICA, y la politica que solo existe en el frontend se salta con una peticion
HTTP. Esta es la autoridad; la UI mock-first tiene su espejo en TS mientras el
daemon no este cableado (deuda declarada en PROGRESS-buzon-a2a.md).

Las dos reglas, literales de la spec:

  §11.1  espejo → listo exige >=7 dias naturales Y >=20 borradores generados.
         "No se puede saltar. Ni con flag, ni por soporte, ni para demos."

  §11.9  Se PROPONE envio directo de una clase si acumula >=25 aprobaciones
         consecutivas sin una sola edicion, sin ninguna verificacion critica
         disparada en esas 25, y el buzon lleva >=30 dias activo. Se propone,
         NUNCA se aplica. Reversion automatica a 2 rechazos en la clase.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

# --- §11.1: el minimo del modo espejo. Cambiar estos numeros es cambiar la
# politica de activacion: exige actualizar la SPEC y la ficha de gobernanza.
ESPEJO_DIAS_MIN = 7
ESPEJO_BORRADORES_MIN = 20

# --- §11.9: el umbral del relajamiento progresivo.
RELAJAMIENTO_APROBACIONES_MIN = 25
RELAJAMIENTO_DIAS_ACTIVO_MIN = 30
RELAJAMIENTO_RECHAZOS_REVERSION = 2

# Estados de §11.1. Un buzon 'desconectado' es terminal: revocar credenciales y
# volver a conectar es un alta nueva, no una transicion (la bitacora se conserva).
TRANSICIONES: dict[str, tuple[str, ...]] = {
    "borrador": ("configurando",),
    "configurando": ("espejo",),          # solo con las 3 verificaciones en verde
    "espejo": ("listo", "desconectado"),  # solo con el minimo cumplido
    "listo": ("activo", "espejo", "desconectado"),
    "activo": ("pausado", "desconectado"),
    "pausado": ("activo", "desconectado"),
    "desconectado": (),
}

VERIFICACIONES_PARA_ESPEJO = ("dns", "proveedor", "politica")


@dataclass(frozen=True)
class Decision:
    ok: bool
    motivo: str = ""


def _ahora(ahora: datetime | None) -> datetime:
    return ahora or datetime.now(timezone.utc)


def puede_listo(espejo_desde: datetime | None, borradores: int,
                ahora: datetime | None = None) -> Decision:
    """§11.1 — el gate que NO se salta: >=7 dias naturales Y >=20 borradores.

    Ambas condiciones, no una. Un buzon con 100 borradores en 2 dias no ha
    tenido 7 dias de correo real; uno con 7 dias y 3 borradores no le ha
    mostrado nada al cliente que pueda leer antes de firmar.
    """
    if espejo_desde is None:
        return Decision(False, "el buzon no ha estado en modo espejo")
    dias = (_ahora(ahora) - espejo_desde).days
    faltan = []
    if dias < ESPEJO_DIAS_MIN:
        faltan.append(f"{ESPEJO_DIAS_MIN - dias} dia(s) de modo espejo")
    if borradores < ESPEJO_BORRADORES_MIN:
        faltan.append(f"{ESPEJO_BORRADORES_MIN - borradores} borrador(es)")
    if faltan:
        return Decision(False, "falta " + " y ".join(faltan))
    return Decision(True, f"{dias} dia(s) en espejo y {borradores} borradores")


def puede_transicionar(estado: str, destino: str, *, verificaciones: dict | None = None,
                       espejo_desde: datetime | None = None, borradores: int = 0,
                       activado_por: str = "", ahora: datetime | None = None) -> Decision:
    """Transicion de estado con sus guardas. Un destino no listado es invalido."""
    if estado not in TRANSICIONES:
        return Decision(False, f"estado desconocido: {estado!r}")
    if destino not in TRANSICIONES[estado]:
        return Decision(False, f"transicion invalida: {estado} → {destino}")

    if destino == "espejo" and estado == "configurando":
        # §11.0: las tres avanzan en paralelo, pero se pasa solo con las tres en verde.
        v = verificaciones or {}
        pendientes = [k for k in VERIFICACIONES_PARA_ESPEJO if v.get(k) != "verificado"]
        if pendientes:
            return Decision(False, f"verificaciones sin completar: {', '.join(pendientes)}")

    if destino == "listo":
        return puede_listo(espejo_desde, borradores, ahora)

    if destino == "activo" and estado == "listo" and not activado_por.strip():
        # §11.1: activar exige firma de A5 con la evidencia en pantalla.
        return Decision(False, "activar exige la firma del aprobador responsable")

    return Decision(True)


@dataclass(frozen=True)
class Aprobacion:
    """Una decision de A5 sobre un borrador de cierta clase, en orden temporal."""
    clase: str
    aprobado: bool
    editado: bool = False
    critico_disparado: bool = False


def propone_relajamiento(clase: str, historial: list[Aprobacion],
                         dias_activo: int) -> Decision:
    """§11.9 — regla DETERMINISTA. Devuelve si el sistema debe PROPONER (no aplicar).

    `historial` va en orden temporal (el mas reciente al final). "Consecutivas"
    se cuenta desde el final: una edicion o un rechazo rompe la racha, que es
    justo lo que hace fiable la evidencia.
    """
    if dias_activo < RELAJAMIENTO_DIAS_ACTIVO_MIN:
        return Decision(False, f"el buzon lleva {dias_activo} dia(s) activo, "
                               f"faltan {RELAJAMIENTO_DIAS_ACTIVO_MIN - dias_activo}")
    racha = 0
    for ap in reversed([a for a in historial if a.clase == clase]):
        if not ap.aprobado or ap.editado or ap.critico_disparado:
            break
        racha += 1
    if racha < RELAJAMIENTO_APROBACIONES_MIN:
        return Decision(False, f"{racha} aprobacion(es) consecutivas sin edicion, "
                               f"se requieren {RELAJAMIENTO_APROBACIONES_MIN}")
    return Decision(True, f"{racha} aprobaciones consecutivas sin edicion "
                          f"y {dias_activo} dias activo")


def debe_revertir(clase: str, historial: list[Aprobacion]) -> Decision:
    """§11.9 — reversion automatica: 2 rechazos en la misma clase tras relajar.

    `historial` es el posterior al relajamiento. No exige que sean consecutivos:
    dos rechazos en la clase ya dicen que la evidencia dejo de sostenerse.
    """
    rechazos = sum(1 for a in historial if a.clase == clase and not a.aprobado)
    if rechazos >= RELAJAMIENTO_RECHAZOS_REVERSION:
        return Decision(True, f"{rechazos} rechazos en la clase {clase!r}: "
                              "vuelve a requerir aprobacion")
    return Decision(False, f"{rechazos} rechazo(s), umbral {RELAJAMIENTO_RECHAZOS_REVERSION}")


def dias_en_espejo(espejo_desde: datetime | None, ahora: datetime | None = None) -> int:
    if espejo_desde is None:
        return 0
    return max(0, (_ahora(ahora) - espejo_desde).days)


def fecha_minima_activacion(espejo_desde: datetime) -> datetime:
    """Cuando podria cumplirse el minimo temporal (la UI muestra 'dia N de 7')."""
    return espejo_desde + timedelta(days=ESPEJO_DIAS_MIN)
