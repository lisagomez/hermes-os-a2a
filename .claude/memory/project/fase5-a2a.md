# Fase 5 — Interoperabilidad A2A (el grafo como agente A2A)

**Estado (2026-07-03): núcleo COMPLETO en código; residual de runtime.**
PRP: `.claude/PRPs/prp-fase5-a2a.md` (con aprendizajes del SDK). Rama `feat/fase5-a2a`.
La capa económica (Circle/USDC, contratos-blockchain) NO es de esta fase-código:
mismo horizonte, OTRO PRP cuando toque.

## Qué es

`businessos/grafo-a2a/`: puente **determinista** (sin LLM, cero tokens por consulta)
que expone el grafo como agente del protocolo A2A (a2aproject/Linux Foundation).
Agent Card en `/.well-known/agent-card.json` (skill `evaluar-impacto-regulatorio`),
`message/send` JSON-RPC → `POST grafo:3000/evaluaciones` → artifact con la
EvaluacionResponse ÍNTEGRA. Compose: `127.0.0.1:4000` + hermes-net, sin secretos.

## Arquitectura que importa

- **Servicio aparte, grafo intacto** (aislar, no fundir): cero rutas nuevas en el
  grafo; su `openapi.json` (contrato del CLI de Printing Press) quedó byte-idéntico.
- **Starlette PURO, no FastAPI**: el extra `[http-server]` del SDK no trae FastAPI,
  y mejor — sin `/docs` ni `/openapi.json`, la única promesa pública es la card.
  Superficie EXACTA = {card, rpc `/`, `/health`} (test de inventario de rutas).
- **Regla de oro a través del protocolo**: la evaluación viaja íntegra; defensa en
  profundidad en el executor: sin disclaimer/fuentes NO se entrega (tarea `failed`).
  Grafo caído / entrada inválida → `failed` con razón clara, nunca inventa.
- **Las verticales siguen en REST directo** (`http://grafo:3000`): A2A es la puerta
  para pares/terceros, complementa. AGENTS.md de negocio/clientes actualizados
  (escalón 3 del orden CLI-first ahora ACTIVO).
- **Patrón para Fase 6**: servidor + card + executor + cliente de verificación —
  lo que replican Ejecutor y Supervisor.

## Gotchas del SDK (detalle en el PRP §Aprendizajes)

- `a2a-sdk` 1.1.0 es **proto-first** (a2a.types = protobuf, no Pydantic); los
  tutoriales v0.2 mienten. Introspeccionar SIEMPRE el SDK instalado.
- El executor v1 DEBE encolar `new_task(...)` ANTES del primer status update
  (`InvalidAgentResponseError` si no); los unit tests con cola espía no lo cazan,
  el interop test con el cliente del SDK sí.
- La card servida agrega compat v0.3 (`preferredTransport`): validar round-trip
  con `ignore_unknown_fields=True`.
- Tests interop sin red: `httpx.ASGITransport` en ambos lados (cliente→servicio A2A
  y executor→grafo real con seed real, patrón de los tests del grafo). El venv de
  grafo-a2a lleva fastapi SOLO como dep de test (importa la app del grafo).

## Residuales

- **Runtime (Droplet)**: build + `compose up grafo-a2a` + smoke de card/message-send
  dentro de hermes-net (aquí validado con uvicorn + curl + 17 tests).
- **Futuro (decisión de negocio)**: exposición a internet para socios (dominio +
  auth real + `securitySchemes` en la card + `GRAFO_A2A_PUBLIC_URL`). Nada a medias.

## ACTUALIZACIÓN 2026-07-08 — runtime CERRADO

`grafo-a2a` Up/healthy en Hetzner y smoke card/message-send DENTRO de hermes-net
(`businessos/smoke-trio/runtime.py`, corre en contenedor efímero python:3.12-slim
con a2a-sdk): evaluación real → `deducible` + 4 fuentes citadas + disclaimer.
Queda solo la exposición a internet (futuro, decisión de negocio).
