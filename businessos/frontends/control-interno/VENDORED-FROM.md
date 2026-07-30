# Procedencia — frontend vendored

Este directorio es una **copia adoptada (vendored)** del frontend AI-first del Business OS.

- **Origen:** https://github.com/daniel-carreon/business-os-new
- **Commit de origen:** `4428a6dba1df56afe0759f3248c8955a927cfd7c`
  (`chore: audit polish — configurable daemon TZ, generic code comments`)
- **Fecha de integración:** 2026-07-13
- **Cómo:** copia del árbol SIN la historia git externa (`.git` dropeado) — una sola
  historia, la de este repo, de aquí en adelante. Licencia original (MIT, `LICENSE`) preservada.

## Qué es

El frontend de **CONTROL INTERNO** — una de las **tres superficies** del Business OS
(ver `../README.md`): control interno (esto) · cliente web2 · cliente A2A-card web3.
Uso del EQUIPO, NO de cara al cliente.

El **panel humano** del Business OS: Next.js (App Router) + Supabase + Tailwind v4 + Tauri
(desktop opcional). Diseño "Titaniumorphism". Filosofía **AI-first**: la UI es espejo, no
cabina — todo se opera hablándole al agente; board/calendario/canvas se miran, las acciones
van por conversación.

## Cómo encaja con el backend agéntico (este repo)

El chat NO llama a un LLM directo: **proxya a un daemon** por un contrato HTTP
(`OPENCLAW_GATEWAY_TOKEN` + `CLAUDECLAW_URL`): `POST /chat/stream` (SSE) para el turno, y
webhooks `POST /api/openclaw/action` (`create_task`, `update_task`…) para que el agente OPERE
el board. El daemon de referencia usa Claude Agent SDK.

→ **Punto de integración con Hermes/A2A:** nuestro backend (Hermes-Negocio + trío A2A) puede
ser ese daemon implementando el contrato `app→daemon` (mínimo `/chat/stream`). Así el frontend
deja de necesitar el daemon de referencia y opera contra la fábrica.

## Pendientes al retomar (del README del proyecto original)

- Alpha (jul 2026): el build de Next pasa verde; **la migración bootstrap contra un Supabase
  virgen NO está probada end-to-end**, ni el empaquetado Tauri (`cargo build`).
- Sus migraciones Supabase (`supabase/migrations/`: base_schema, finances, calendar, canvas,
  todoist) usan su propio esquema — **coexisten** con nuestro esquema `erp` (contable/fiscal),
  no chocan; la reconciliación de superficies (si algún día se comparten datos) es trabajo aparte.
- No instalé dependencias ni corrí build: `npm install && npm run dev` cuando se quiera arrancar.

## src/shared/app-registry/ (2026-07-29)
Vendored desde `businessos/frontends/app-registry/src/` (registro de apps del
ecosistema + schema de navegación). NO editar aquí: editar el canónico y correr
`node businessos/frontends/app-registry/scripts/sync-vendored.mjs`.
