"""rfc.py — escalon rfc_offline: validacion LOCAL del RFC (App A, costo 0).

Sin red y sin gate del grafo A PROPOSITO: procesa un dato que el caller YA
provee (DataPart o lead.datos), no consulta fuentes ni prospecta nada nuevo.
Es ademas el prerequisito del resto de la cascada: clasifica PM (12 chars) vs
PF (13 chars) — y un RFC de persona fisica activa el bloqueo LFPDPPP del
enriquecimiento de contacto (concepto 'dato de persona fisica para
prospeccion' del grafo, veredicto dudoso).

Fail-safe sobre el propio algoritmo: si el digito verificador NO coincide, el
veredicto es 'dudoso' (no 'invalido') — una divergencia del algoritmo local
jamas debe bloquear un RFC real. 'invalido' queda para lo estructural
(formato o fecha imposibles), que no admite discusion.
"""
from __future__ import annotations

import re

# Formato SAT: PM = 3 letras + fecha AAMMDD + homoclave(3); PF = 4 letras + igual.
RE_PM = re.compile(r"^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$")
RE_PF = re.compile(r"^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$")

# Tabla oficial del anexo del RFC: posicion = valor del caracter (espacio=37, Ñ=38).
_VALORES = "0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ"

_DIAS_MES = {1: 31, 2: 29, 3: 31, 4: 30, 5: 31, 6: 30,
             7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31}


def normalizar(rfc: str) -> str:
    """Mayusculas y sin separadores accidentales (espacios/guiones)."""
    return re.sub(r"[\s\-]", "", (rfc or "").upper())


def _fecha_valida(aammdd: str) -> bool:
    mes, dia = int(aammdd[2:4]), int(aammdd[4:6])
    return 1 <= mes <= 12 and 1 <= dia <= _DIAS_MES[mes]


def digito_verificador(rfc: str) -> str:
    """Digito esperado (mod-11 del anexo SAT). RFC de 12 se antepone espacio."""
    base = rfc if len(rfc) == 13 else " " + rfc
    suma = sum(_VALORES.index(c) * (13 - i) for i, c in enumerate(base[:12]))
    resto = suma % 11
    if resto == 0:
        return "0"
    dv = 11 - resto
    return "A" if dv == 10 else str(dv)


def evaluar_rfc(rfc_crudo: str) -> dict:
    """{rfc, tipo: 'PM'|'PF'|None, veredicto, razon} — deterministico y local."""
    rfc = normalizar(rfc_crudo)
    if RE_PM.match(rfc):
        tipo, fecha = "PM", rfc[3:9]
    elif RE_PF.match(rfc):
        tipo, fecha = "PF", rfc[4:10]
    else:
        return {"rfc": rfc, "tipo": None, "veredicto": "invalido",
                "razon": "formato no corresponde a un RFC (ni PM de 12 ni PF de 13)"}
    if not _fecha_valida(fecha):
        return {"rfc": rfc, "tipo": tipo, "veredicto": "invalido",
                "razon": f"fecha imposible en el RFC ({fecha})"}
    esperado = digito_verificador(rfc)
    if rfc[-1] != esperado:
        return {"rfc": rfc, "tipo": tipo, "veredicto": "dudoso",
                "razon": "digito verificador no coincide (algoritmo local; no bloquea)"}
    return {"rfc": rfc, "tipo": tipo, "veredicto": "valido",
            "razon": "formato, fecha y digito verificador correctos"}
