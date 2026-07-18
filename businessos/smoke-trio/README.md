# smoke-trio — validación A2A en vivo del trío + enjambre (Fases 6/7)

Smoke **en la máquina de desarrollo**: levanta `supervisor-a2a`, `ejecutor-a2a` y
`coordinador-a2a` con **uvicorn real** (TCP real, motores mock, **cero tokens, sin
docker**) y ejercita el protocolo A2A end-to-end con el cliente real del SDK. Es la
verificación dev del residual "smoke card/SendMessage" de las Fases 6 y 7; el
empaquetado Docker + `compose up` en el servidor sigue aparte.

## Correr

```bash
bash businessos/smoke-trio/run.sh
```

Requiere `businessos/.venv` (pytest + a2a-sdk; ver
`.claude/memory/reference/maquinas-entornos.md`). NO toca Supabase: sin credenciales,
`estado.py` es no-op por diseño.

## Qué valida

- **Tier 1 — liveness + protocolo**: `/health` 200, Agent Card en
  `/.well-known/agent-card.json`, y **opacidad** (`/docs` y `/openapi.json` → 404) de
  los tres servicios.
- **Tier 2 — cadena Ejecutor→Supervisor (Fase 6) sobre TCP**: una TAREA con `any` es
  **rechazada** por el gate `sin_any`; el reintento con corrección queda **aprobado**.
- **Tier 3 — enjambre completo (Fase 7) vía Coordinador**: feature padre con un
  `mock_plan` de 2 sub-tareas disjuntas → fan-out al Ejecutor → integración → **verificación
  final del Supervisor** → `veredicto_final=aprobado`.

Exit ≠ 0 solo si fallan Tier 1 o Tier 2 (garantizados); Tier 3 se reporta honesto.

## Cómo funciona sin docker

Los servicios leen su topología por env; el runner los apunta a `127.0.0.1`:
`SUPERVISOR_URL`/`EJECUTOR_URL` (llamadas entre servicios), `*_PUBLIC_URL` (la `url`
que anuncia cada card, para que el cliente resuelva sobre TCP), `TRIO_REPO`/`TRIO_WORKSPACE`
(repo objetivo + workspace compartido, temporales), `SUPERVISOR_REGLAS` (gates ligeros:
`sin_any` + `git status --short`, en vez de los `npm build`/`playwright` de runtime).
