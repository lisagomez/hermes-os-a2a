"""oferta.py — la oferta publica APROBADA del white-label (Fase 9).

Estatica y versionada a proposito: cambiarla = PR humano (auditable), nunca
generacion en runtime. Los claims son EXACTAMENTE los de
departamentos/adquisicion/claims-aprobados.txt (honestidad comercial de
white-label.md §5: no se vende "el agente lo hace solo"); el rango de precios
es el de politica-precios.json. Si aquello cambia, esto cambia en el MISMO PR
(el gate `politica_intocable` garantiza que el motor no toca ninguno de los dos).
"""
from __future__ import annotations

DISCLAIMER = (
    "Registro informativo: un humano del equipo da seguimiento a cada lead. "
    "Ningun precio ni termino queda pactado por este canal; toda propuesta, "
    "negociacion y firma pasa por aprobacion humana."
)

OFERTA = {
    "producto": "Departamento de software con IA bajo supervision (white-label)",
    "que_incluye": [
        "Un trio de agentes (orquestador, ejecutor, supervisor) operando con SU marca",
        "Ejecucion en workspace aislado por cliente: repo, datos y secretos separados",
        "Cada entrega re-verificada por un supervisor independiente con gates deterministas",
        "Aprobacion humana obligatoria en todo lo irreversible (deploys, dinero, cara al cliente)",
    ],
    "claims": [
        "Departamento de software con IA bajo supervision humana",
        "Gates deterministas re-ejecutados antes de cada entrega",
        "Aislamiento por cliente: repo, datos y workspace separados",
        "Con su marca: mismo motor verificado, identidad del cliente",
    ],
    "lo_que_no_es": (
        "No es 'el agente lo hace solo': es un departamento con supervision "
        "automatica y humana. Vender reglas flojas seria vender falsa seguridad."
    ),
    "precios_referencia_usd": {"desde": 500, "hasta": 5000, "nota": "mensual, segun alcance"},
    "siguientes_pasos": [
        "Tu interes queda registrado con un lead_id",
        "Un humano del equipo te contacta para descubrimiento y propuesta",
        "Toda propuesta/contrato pasa por validacion y aprobacion humana antes de enviarse",
    ],
}
