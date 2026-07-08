"""Smoke A2A EN VIVO (Fases 5/6/7) — servidores uvicorn reales, TCP real, cero tokens.

Tier 1: liveness (/health) + Agent Card (/.well-known/agent-card.json) + opacidad
        (/docs y /openapi.json => 404) para supervisor, ejecutor, coordinador.
Tier 2: cadena Ejecutor->Supervisor sobre TCP real: TAREA con `any` -> RECHAZADO
        (gate sin_any) -> reintento con correccion -> APROBADO.
Tier 3: enjambre completo via Coordinador: feature padre con mock_plan de 2 sub-tareas
        disjuntas -> fan-out -> integracion -> verificacion final del Supervisor.

Exit != 0 solo si fallan Tier 1 o Tier 2 (garantizados). Tier 3 se reporta honesto.
"""
from __future__ import annotations

import asyncio
import os
import sys

import httpx

from a2a.client import A2ACardResolver, ClientConfig, ClientFactory
from a2a.helpers import get_data_parts, new_data_message
from a2a.types import SendMessageRequest, TaskState

# Bases por servicio, configurables por env para correr el MISMO smoke en
# runtime DENTRO de hermes-net (SMOKE_*=http://<servicio>:<puerto>). Default:
# dev/uvicorn en 127.0.0.1 — igual que siempre.
SUPERVISOR = os.environ.get("SMOKE_SUPERVISOR", "http://127.0.0.1:4200")
EJECUTOR = os.environ.get("SMOKE_EJECUTOR", "http://127.0.0.1:4100")
COORDINADOR = os.environ.get("SMOKE_COORDINADOR", "http://127.0.0.1:4300")
SERVICIOS = {
    "supervisor-a2a (Fase 6)": SUPERVISOR,
    "ejecutor-a2a (Fase 6)": EJECUTOR,
    "coordinador-a2a (Fase 7)": COORDINADOR,
}

fallos: list[str] = []


def ok(msg: str) -> None:
    print(f"  \033[32mPASS\033[0m {msg}")


def bad(msg: str, fatal: bool = True) -> None:
    print(f"  \033[31mFAIL\033[0m {msg}")
    if fatal:
        fallos.append(msg)


async def tier1() -> None:
    print("\n== TIER 1: liveness + Agent Card + opacidad (TCP real) ==")
    async with httpx.AsyncClient(timeout=10) as h:
        for nombre, base in SERVICIOS.items():
            try:
                r = await h.get(f"{base}/health")
                (ok if r.status_code == 200 and r.json().get("status") == "ok" else bad)(
                    f"{nombre}: /health -> {r.status_code}"
                )
            except Exception as e:
                bad(f"{nombre}: /health inalcanzable ({type(e).__name__})")
                continue
            try:
                r = await h.get(f"{base}/.well-known/agent-card.json")
                card = r.json()
                skills = ", ".join(s.get("id", "?") for s in card.get("skills", []))
                (ok if r.status_code == 200 and card.get("name") else bad)(
                    f"{nombre}: card '{card.get('name')}' skills=[{skills}]"
                )
            except Exception as e:
                bad(f"{nombre}: agent-card ilegible ({type(e).__name__})")
            # opacidad: NO debe exponer /docs ni /openapi.json
            op = []
            for path in ("/docs", "/openapi.json"):
                try:
                    rr = await h.get(f"{base}{path}")
                    op.append(rr.status_code)
                except Exception:
                    op.append("err")
            (ok if all(c == 404 for c in op) else bad)(
                f"{nombre}: opacidad /docs,/openapi.json -> {op} (esperado 404,404)"
            )


async def _enviar(cliente, tarea: dict):
    final = None
    async for r in cliente.send_message(SendMessageRequest(message=new_data_message(tarea))):
        if r.HasField("task"):
            final = r.task
    return final


async def _cliente_para(http: httpx.AsyncClient, base: str):
    card = await A2ACardResolver(http, base).get_agent_card()
    return ClientFactory(ClientConfig(httpx_client=http, streaming=False)).create(card), card


async def tier2() -> None:
    print("\n== TIER 2: cadena Ejecutor->Supervisor sobre TCP real ==")
    async with httpx.AsyncClient(base_url=EJECUTOR, timeout=60) as http:
        try:
            cliente, card = await _cliente_para(http, EJECUTOR)
            ok(f"descubrimiento por card: skill '{card.skills[0].id}'")
        except Exception as e:
            bad(f"no se pudo descubrir al Ejecutor: {type(e).__name__}: {e}")
            return

        tarea = {
            "task_id": "smoke-live-1",
            "objetivo": "modulo x sin any",
            "contexto": {"mock_cambios": {"src/x.ts": "export const x: any = 1\n"}},
            "criterios_aceptacion": ["sin any"],
            "limites": {"intentos_max": 3},
        }
        t1 = await _enviar(cliente, tarea)
        try:
            [e1] = get_data_parts(t1.artifacts[0].parts)
            v = e1["veredicto"]["veredicto"]
            hz = e1["veredicto"]["hallazgos"]
            (ok if t1.status.state == TaskState.TASK_STATE_COMPLETED and v == "rechazado"
                and hz and hz[0]["regla"] == "sin_any" else bad)(
                f"intento 1 (any) -> {v}; hallazgo={hz[0]['regla'] if hz else None}"
            )
        except Exception as e:
            bad(f"intento 1: respuesta inesperada ({type(e).__name__}: {e})")
            return

        reintento = {
            **tarea,
            "observaciones": [f"{h['regla']}: {h['evidencia']}" for h in hz],
            "contexto": {"mock_correccion": {"src/x.ts": "export const x: unknown = 1\n"}},
        }
        t2 = await _enviar(cliente, reintento)
        try:
            [e2] = get_data_parts(t2.artifacts[0].parts)
            v = e2["veredicto"]["veredicto"]
            gates_ok = all(g["estado"] == "paso" for g in e2["veredicto"]["gates"])
            (ok if v == "aprobado" and gates_ok and "unknown" in e2["resultado"]["diff"] else bad)(
                f"intento 2 (correccion) -> {v}; gates_paso={gates_ok}; diff tiene 'unknown'"
            )
        except Exception as e:
            bad(f"intento 2: respuesta inesperada ({type(e).__name__}: {e})")


async def tier3() -> None:
    print("\n== TIER 3: enjambre completo via Coordinador (best-effort) ==")
    sub_a = {
        "task_id": "swarm-a", "objetivo": "crear modulo a",
        "contexto": {"mock_cambios": {"src/a.ts": "export const a = 1\n"}},
        "criterios_aceptacion": ["existe a"], "limites": {"intentos_max": 2},
        "depende_de": [], "alcance": ["src/a.ts"],
    }
    sub_b = {
        "task_id": "swarm-b", "objetivo": "crear modulo b",
        "contexto": {"mock_cambios": {"src/b.ts": "export const b = 2\n"}},
        "criterios_aceptacion": ["existe b"], "limites": {"intentos_max": 2},
        "depende_de": [], "alcance": ["src/b.ts"],
    }
    padre = {
        "task_id": "swarm-parent-1",
        "objetivo": "feature con dos modulos disjuntos",
        "contexto": {"mock_plan": {"sub_tareas": [sub_a, sub_b]}},
        "criterios_aceptacion": ["a y b integrados"],
        "limites": {"intentos_max": 2, "fan_out_max": 2},
    }
    async with httpx.AsyncClient(base_url=COORDINADOR, timeout=120) as http:
        try:
            cliente, card = await _cliente_para(http, COORDINADOR)
            ok(f"descubrimiento por card: skill '{card.skills[0].id}'")
        except Exception as e:
            bad(f"no se pudo descubrir al Coordinador: {type(e).__name__}: {e}", fatal=False)
            return
        try:
            t = await _enviar(cliente, padre)
            if t.status.state != TaskState.TASK_STATE_COMPLETED:
                detalle = ""
                if t.status.HasField("message") and t.status.message.parts:
                    detalle = t.status.message.parts[0].text
                bad(f"enjambre no completo: estado={t.status.state} {detalle[:200]}", fatal=False)
                return
            [art] = get_data_parts(t.artifacts[0].parts)
            vf = (art.get("veredicto_final") or {}).get("veredicto")
            enj = art.get("enjambre", {}).get("estado")
            print(f"     enjambre.estado={enj}; veredicto_final={vf}")
            (ok if vf == "aprobado" else lambda m: bad(m, fatal=False))(
                f"enjambre completo via TCP: veredicto_final={vf}"
            )
        except Exception as e:
            bad(f"enjambre: {type(e).__name__}: {e}", fatal=False)


async def main() -> None:
    await tier1()
    await tier2()
    await tier3()
    print("\n" + ("=" * 50))
    if fallos:
        print(f"\033[31mSMOKE FALLÓ\033[0m: {len(fallos)} chequeo(s) crítico(s):")
        for f in fallos:
            print(f"  - {f}")
        sys.exit(1)
    print("\033[32mSMOKE OK\033[0m: Tier 1 y Tier 2 verdes (liveness+card+opacidad + cadena A2A real).")


if __name__ == "__main__":
    asyncio.run(main())
