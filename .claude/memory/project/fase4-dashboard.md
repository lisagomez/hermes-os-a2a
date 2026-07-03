# Fase 4 — Dashboard Mission Control (A2ABot)

**Estado (2026-07-02): núcleo COMPLETO en código; residuales de runtime.**
PRP: `.claude/PRPs/prp-fase4-dashboard.md`. Rama `feat/fase4-dashboard`.

## Qué es

A2ABot = el Next.js de la RAÍZ del repo (el scaffold SaaS Factory por fin tiene
propósito). Panel de SOLO lectura, 3 vistas: Pantheon / AI Spend / Grafo.
Acceso: `127.0.0.1:9200` + túnel SSH. Sin auth de usuarios (YAGNI: una usuaria).

## Arquitectura que importa

- **Capa de datos server-only** (`src/features/dashboard/services/`): interfaz
  `DataSource` con impl `real` (PostgREST service_role + grafo HTTP + health de
  gateways `:8642`) y `mock` (fixtures que replican datos reales). Conmutador:
  `DASHBOARD_DATA=mock|real` (default: real si hay service_role). El browser
  jamás ve credenciales (`import 'server-only'` + verificado 0 refs en bundle).
- **Pantheon sin montar volúmenes**: `snapshot-pantheon.py` (host-job stdlib)
  extrae model.default/fallbacks/skills de cada volumen → UPSERT tabla `pantheon`
  (supabase-fase4.sql, YA aplicada). Modo `PANTHEON_DIR` para fixtures.
- **El grafo ganó `GET /evaluaciones?limit=1-100`** (solo lectura, 503 sin DB,
  patrón lazy-import; 51 tests pytest verdes). Schema `EvaluacionListada` =
  wrapper persistido {id, created_at, contexto, salida}.
- Docker: `Dockerfile` en la raíz (standalone multi-stage) + servicio `a2abot`
  en compose (build context `..`). `docker compose config` validado aquí.

## Gotchas nuevos (además de los del PRP)

- **Lockfile huérfano en $HOME** (`/home/gomez/package-lock.json`): Next infiere
  mal el workspace root → `.next/standalone` sale ANIDADO y el warning de
  "multiple lockfiles". Fix en next.config: `outputFileTracingRoot` +
  `turbopack.root` explícitos. NO borrar el lockfile ajeno del home.
- Los ítems YAML de listas de Hermes van a COLUMNA 0: una regex de bloque que
  corte en `^\S` se come la lista entera (ya estaba en memoria; re-confirmado).
- Playwright: browsers en caché pero sin libs de sistema; los screenshots
  requieren `sudo npx playwright install-deps chromium` (residual dev).
- La tabla `pantheon` hoy tiene datos de FIXTURE (validación del camino de
  escritura); el primer run real en runtime los sobrescribe.

## Residuales

- **Runtime**: build de imagen + `compose up a2abot`, verificar path real del
  health del gateway (aquí mockeado), cron de snapshot-pantheon (junto a los otros).
- **Dev**: screenshots Playwright de las 3 vistas (tras install-deps).
