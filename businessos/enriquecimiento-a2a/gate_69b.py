"""gate_69b.py — decision PURA del gate 69-B CFF (App A).

El servicio SOLO LEE contraparte_69b/override_69b: la vigilancia la escriben
host-jobs de confianza (businessos/vigilancia-69b.py) y los overrides son
actos humanos. Fail-closed en todas las direcciones:

- sin fila            -> bloqueado ("nunca consultado"): el desconocimiento no pasa
- dictamen rancio     -> bloqueado (consultado_en ausente, ilegible o mas viejo
                         que max_edad_dias): un "no_listado" de hace meses no
                         abre el gate — la frescura es parte del dictamen
- estatus desconocido -> bloqueado (espejo de severidad_69b: lo raro es lo peor)
- definitivo          -> bloqueado SIEMPRE (el override no existe para definitivo;
                         la tabla ademas lo impide por trigger)
- presunto            -> bloqueado salvo override ACTIVO (not invalidado, no vencido)
- no_listado / sentencia_favorable / desvirtuado -> pasa

La decision es pura (sin I/O) para testearse exhaustivamente; quien lee las
tablas es el almacen.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

PASAN = {"no_listado", "sentencia_favorable", "desvirtuado"}

# la vigilancia corre cada noche; 45 dias = margen amplio para caidas del job
# sin dejar que un dictamen envejezca indefinidamente (QA PR #210)
MAX_EDAD_DIAS_DEFAULT = 45


def _consultado_hace(fila_69b: dict, ahora: datetime) -> timedelta | None:
    """Edad del dictamen, o None si consultado_en falta o es ilegible."""
    crudo = fila_69b.get("consultado_en")
    if not crudo:
        return None
    try:
        cuando = datetime.fromisoformat(str(crudo).replace("Z", "+00:00"))
    except ValueError:
        return None
    if cuando.tzinfo is None:
        cuando = cuando.replace(tzinfo=timezone.utc)
    return ahora - cuando


def decidir(fila_69b: dict | None, override: dict | None, *,
            max_edad_dias: int = MAX_EDAD_DIAS_DEFAULT,
            ahora: datetime | None = None) -> dict:
    """-> {pasa, razon, estatus, override_id} — deterministico y fail-closed."""
    if fila_69b is None:
        return {"pasa": False, "estatus": None, "override_id": None,
                "razon": ("RFC sin fila en contraparte_69b: nunca consultado en la "
                          "vigilancia 69-B — fail-closed (corre vigilancia-69b.py)")}
    edad = _consultado_hace(fila_69b, ahora or datetime.now(timezone.utc))
    if edad is None:
        return {"pasa": False, "estatus": fila_69b.get("estatus"), "override_id": None,
                "razon": ("dictamen 69-B sin frescura verificable (consultado_en "
                          "ausente o ilegible): bloqueado — fail-closed "
                          "(corre vigilancia-69b.py)")}
    if edad > timedelta(days=max_edad_dias):
        return {"pasa": False, "estatus": fila_69b.get("estatus"), "override_id": None,
                "razon": (f"dictamen 69-B rancio (consultado hace {edad.days} dias > "
                          f"max {max_edad_dias}): bloqueado — fail-closed "
                          "(corre vigilancia-69b.py)")}
    estatus = fila_69b.get("estatus", "")
    if estatus in PASAN:
        return {"pasa": True, "estatus": estatus, "override_id": None,
                "razon": f"estatus 69-B '{estatus}': sin impedimento"}
    if estatus == "presunto":
        if override is not None:
            return {"pasa": True, "estatus": estatus, "override_id": override.get("id"),
                    "razon": (f"estatus 'presunto' con override activo #{override.get('id')} "
                              f"(autorizo {override.get('autorizado_por', '?')}, "
                              f"vence {override.get('vence_en', '?')})")}
        return {"pasa": False, "estatus": estatus, "override_id": None,
                "razon": "estatus 69-B 'presunto' sin override activo: bloqueado"}
    if estatus == "definitivo":
        return {"pasa": False, "estatus": estatus, "override_id": None,
                "razon": "estatus 69-B 'definitivo': bloqueado SIEMPRE (sin override posible)"}
    return {"pasa": False, "estatus": estatus, "override_id": None,
            "razon": f"estatus 69-B desconocido '{estatus}': bloqueado (fail-closed)"}
