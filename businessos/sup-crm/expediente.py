"""expediente.py — expediente de promoción A1→A2 (plan D-40).

"SUBIR = EXPEDIENTE + BOTÓN HUMANO": el sistema arma los números y ejemplos;
promover lo decide un humano. Constraint de la casa: la promoción sin
expediente completo NO puede proponerse — si falta evidencia, `promovible`
es False por construcción, no por criterio.

Criterios del salto A1→A2 (adaptados al dato disponible; el plan pide además
CSAT/resolución, que llegan con el panel humano en fases posteriores):
  1. ≥200 veredictos de juez (evidencia suficiente)
  2. tasa de rechazo del juez < 3%
  3. cero fallos de gates deterministas (sensible/credencial) en el período
"""
from __future__ import annotations

MIN_VEREDICTOS = 200
MAX_TASA_RECHAZO = 0.03
VENTANA_FILAS = 1000  # evidencia reciente; lo viejo no sustenta promociones


def armar_expediente(tenant_id: str, nivel_actual: str, filas: list[dict]) -> dict:
    """`filas` = crm_supervision recientes [{aprobado, juez_ejecutado, motivo}].

    Devuelve el expediente completo: criterios con valor/cumple, ejemplos y
    veredicto `promovible` (solo puede ser True desde A1 con TODO cumplido)."""
    juez = [f for f in filas if f.get("juez_ejecutado")]
    rechazos_juez = [f for f in juez if not f.get("aprobado")]
    fallos_gates = [f for f in filas if not f.get("juez_ejecutado") and not f.get("aprobado")]

    n = len(juez)
    tasa = (len(rechazos_juez) / n) if n else None

    criterios = {
        "veredictos_de_juez": {
            "valor": n,
            "requiere": f">={MIN_VEREDICTOS}",
            "cumple": n >= MIN_VEREDICTOS,
        },
        "tasa_rechazo_juez": {
            "valor": round(tasa, 4) if tasa is not None else None,
            "requiere": f"<{MAX_TASA_RECHAZO:.0%}",
            "cumple": tasa is not None and tasa < MAX_TASA_RECHAZO,
        },
        "fallos_de_gates": {
            "valor": len(fallos_gates),
            "requiere": "=0",
            "cumple": not fallos_gates,
        },
    }

    ejemplos = {
        "rechazos_del_juez": [f.get("motivo", "")[:160] for f in rechazos_juez[:3]],
        "fallos_de_gates": [f.get("motivo", "")[:160] for f in fallos_gates[:3]],
    }

    promovible = nivel_actual == "A1" and all(c["cumple"] for c in criterios.values())
    return {
        "tenant_id": tenant_id,
        "nivel_actual": nivel_actual,
        "salto": "A1->A2",
        "promovible": promovible,
        "criterios": criterios,
        "ejemplos": ejemplos,
    }
