"""Smoke A2A de RUNTIME (Fases 5/6/7) — contra los contenedores reales en hermes-net.

Se corre DENTRO de la red (contenedor efimero python:3.12-slim con a2a-sdk):

    docker run --rm --network businessos_hermes-net \
      -v $PWD/smoke-trio/runtime.py:/smoke/runtime.py:ro python:3.12-slim \
      bash -c "pip install -q a2a-sdk==1.1.0 httpx && python /smoke/runtime.py"

Diferencia con client.py (smoke de dev): las EXPECTATIVAS son honestas para
runtime. El Supervisor corre los gates REALES de reglas/software.toml (npm build,
etc.); sobre el trio-repo placeholder esos gates no pueden correr y el veredicto
correcto es RECHAZADO con hallazgo (anti-sello-de-goma). Lo que este smoke
garantiza es el PROTOCOLO end-to-end en runtime: descubrimiento por card,
message/send JSON-RPC, cadena Ejecutor→Supervisor→veredicto, y grafo-a2a
entregando evaluacion con disclaimer + fuente (regla de oro). El camino
"aprobado" del trio ya quedo validado en dev (client.py, gates ligeros).
"""
from __future__ import annotations

import asyncio
import os
import sys

import httpx

from a2a.client import A2ACardResolver, ClientConfig, ClientFactory
from a2a.helpers import get_data_parts, new_data_message
from a2a.types import SendMessageRequest, TaskState

GRAFO_A2A = os.environ.get("SMOKE_GRAFO_A2A", "http://grafo-a2a:4000")
EJECUTOR = os.environ.get("SMOKE_EJECUTOR", "http://ejecutor-a2a:4100")
SUPERVISOR = os.environ.get("SMOKE_SUPERVISOR", "http://supervisor-a2a:4200")
COORDINADOR = os.environ.get("SMOKE_COORDINADOR", "http://coordinador-a2a:4300")
SERVICIOS = {
    "grafo-a2a (Fase 5)": GRAFO_A2A,
    "ejecutor-a2a (Fase 6)": EJECUTOR,
    "supervisor-a2a (Fase 6)": SUPERVISOR,
    "coordinador-a2a (Fase 7)": COORDINADOR,
}

fallos: list[str] = []


def ok(msg: str) -> None:
    print(f"  PASS {msg}")


def bad(msg: str) -> None:
    print(f"  FAIL {msg}")
    fallos.append(msg)


async def _cliente_para(http: httpx.AsyncClient, base: str):
    card = await A2ACardResolver(http, base).get_agent_card()
    return ClientFactory(ClientConfig(httpx_client=http, streaming=False)).create(card), card


async def _enviar(cliente, payload: dict):
    final = None
    async for r in cliente.send_message(SendMessageRequest(message=new_data_message(payload))):
        if r.HasField("task"):
            final = r.task
    return final


async def tier1() -> None:
    print("\n== TIER 1: liveness + Agent Card + opacidad (4 servicios, hermes-net) ==")
    async with httpx.AsyncClient(timeout=15) as h:
        for nombre, base in SERVICIOS.items():
            try:
                r = await h.get(f"{base}/health")
                (ok if r.status_code == 200 else bad)(f"{nombre}: /health -> {r.status_code}")
                r = await h.get(f"{base}/.well-known/agent-card.json")
                card = r.json()
                skills = ", ".join(s.get("id", "?") for s in card.get("skills", []))
                (ok if r.status_code == 200 and card.get("name") else bad)(
                    f"{nombre}: card '{card.get('name')}' skills=[{skills}]"
                )
                op = [(await h.get(f"{base}{p}")).status_code for p in ("/docs", "/openapi.json")]
                (ok if all(c == 404 for c in op) else bad)(f"{nombre}: opacidad -> {op}")
            except Exception as e:
                bad(f"{nombre}: inalcanzable ({type(e).__name__}: {e})")


async def tier2_grafo() -> None:
    """Fase 5: message/send real contra grafo-a2a → evaluacion con regla de oro."""
    print("\n== TIER 2: grafo-a2a message/send (evaluacion con disclaimer + fuentes) ==")
    async with httpx.AsyncClient(base_url=GRAFO_A2A, timeout=60) as http:
        try:
            cliente, card = await _cliente_para(http, GRAFO_A2A)
            ok(f"descubrimiento por card: skill '{card.skills[0].id}'")
            # Contrato real del grafo (EvaluacionRequest): contexto + conceptos
            consulta = {
                "contexto": {"jurisdiccion": "MX", "dimension": "fiscal", "regimen": "PM_TITULO_II"},
                "conceptos": [{"descripcion": "servicios de consultoria", "importe": 10000}],
            }
            t = await _enviar(cliente, consulta)
            if t is None or t.status.state != TaskState.TASK_STATE_COMPLETED:
                estado = None if t is None else t.status.state
                bad(f"grafo-a2a: tarea no completada (estado={estado})")
                return
            [ev] = get_data_parts(t.artifacts[0].parts)
            estados = [c.get("estado") for c in ev.get("conceptos", [])]
            fuentes = ev.get("fuentes", [])
            citas = [f.get("cita") for f in fuentes]
            regla_de_oro = bool(ev.get("disclaimer")) and all(estados)
            (ok if regla_de_oro and estados == ["deducible"] and fuentes else bad)(
                f"evaluacion: estados={estados} fuentes={citas} disclaimer={bool(ev.get('disclaimer'))}"
            )
        except Exception as e:
            bad(f"grafo-a2a: {type(e).__name__}: {e}")


async def tier3_trio() -> None:
    """Fase 6: cadena runtime Ejecutor→Supervisor. Expectativa HONESTA: el
    Supervisor corre los gates npm reales; en el trio-repo placeholder no pueden
    correr → veredicto RECHAZADO con hallazgos (el protocolo queda probado)."""
    print("\n== TIER 3: trio runtime — Ejecutor→Supervisor con gates reales ==")
    async with httpx.AsyncClient(base_url=EJECUTOR, timeout=120) as http:
        try:
            cliente, card = await _cliente_para(http, EJECUTOR)
            ok(f"descubrimiento por card: skill '{card.skills[0].id}'")
            tarea = {
                "task_id": "smoke-runtime-1",
                "objetivo": "smoke de runtime: modulo minimo",
                "contexto": {"mock_cambios": {"src/smoke.ts": "export const s: unknown = 1\n"}},
                "criterios_aceptacion": ["protocolo A2A end-to-end en runtime"],
                "limites": {"intentos_max": 1},
            }
            t = await _enviar(cliente, tarea)
            if t is None or t.status.state != TaskState.TASK_STATE_COMPLETED:
                estado, razon = (None, "") if t is None else (t.status.state, "")
                if t is not None and t.status.HasField("message") and t.status.message.parts:
                    razon = t.status.message.parts[0].text[:300]
                bad(f"trio: tarea no completada (estado={estado}) razon: {razon}")
                return
            [e] = get_data_parts(t.artifacts[0].parts)
            v = e["veredicto"]["veredicto"]
            hallazgos = [h["regla"] for h in e["veredicto"].get("hallazgos", [])]
            # rechazado + hallazgos = gates reales actuando sobre repo placeholder (correcto)
            (ok if v == "rechazado" and hallazgos else bad)(
                f"cadena completa: veredicto={v} (esperado en runtime) hallazgos={hallazgos[:4]}"
            )
        except Exception as e:
            bad(f"trio: {type(e).__name__}: {e}")


async def main() -> None:
    await tier1()
    await tier2_grafo()
    await tier3_trio()
    print("\n" + "=" * 50)
    if fallos:
        print(f"SMOKE RUNTIME FALLO: {len(fallos)} chequeo(s):")
        for f in fallos:
            print(f"  - {f}")
        sys.exit(1)
    print("SMOKE RUNTIME OK: card + message/send probados contra los contenedores reales.")


if __name__ == "__main__":
    asyncio.run(main())
