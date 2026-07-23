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
- Playwright: `npx playwright install chromium` bastó en esta máquina (NO hizo falta
  `sudo install-deps`); las 3 vistas se capturaron en modo mock el 2026-07-04 →
  `businessos/dashboard-screenshots/`.
- La tabla `pantheon` hoy tiene datos de FIXTURE (validación del camino de
  escritura); el primer run real en runtime los sobrescribe.

## Post-Fase: vista /desarrollo + drift de prod (2026-07-23)

- **/desarrollo VIVA en prod** (tarea del trío `mission-control-2026-0001`, PR #39;
  verificada y re-desplegada 2026-07-23): últimas 20 filas de `tareas` vía
  `getDataSource().desarrollo()`, badges por estado, 10 tests Playwright sin browser.
- **Dos 500 preexistentes cazados por el smoke post-deploy** (PR #120):
  (a) `/ai-spend` — ZodError: el ledger del trío escribe `vertical='trio'` en
  `token_usage` y `presupuestoMesSchema` tenía enum cerrado → ahora `z.string()`
  (el dominio vive en la BD; la UI ya tenía fallback de color).
  (b) `/grafo` — PGRST123: Supabase tiene los agregados inline de PostgREST
  DESHABILITADOS por defecto → el conteo de facturas vive en la vista
  `v_facturas_resumen` (`supabase-fix-vista-facturas.sql`, security_invoker +
  revoke anon/authenticated; aplicada por management API, MCP en read-only).
- Regla operativa: tras cada deploy de a2abot, smoke de las 6 rutas
  (`/ /dashboard /ai-spend /grafo /desarrollo /crm`) — un 200 en la ruta nueva no
  garantiza las viejas (drift de datos/plataforma).

## Post-Fase 2: combo de departamentos + vista CRM operable (2026-07-23, PRs #122–#126)

- **Navbar**: combo "Departamento" global (registrados del Supervisor —
  `DEPARTAMENTOS_REGISTRADOS` espejo de `supervisor-a2a/reglas/*.toml` — ∪
  `v_departamentos`); elegir uno filtra /desarrollo. **Submenú por departamento**
  (2ª fila): adquisición → `Tareas | CRM`; estar en /crm marca adquisición.
  Tipografía base **20px** (pedido de Elisa; 16→18→20 en dos iteraciones).
- **Vista /crm**: `EmbudoCanvas` (9 etapas de `leads_etapa_check` EN ORDEN — el
  orden es conocimiento del dashboard, `ETAPAS_EMBUDO`; etapa desconocida se anexa
  sin reventar; `perdido` aparte) + `ConversacionesPanel` (estado × nivel A0-A3,
  empty state honesto sin tenant) + `LeadsTable` con **"Mover a"**.
- **Única escritura del panel**: server action `moverLeadEtapa` (Zod +
  `Prefer: return=representation` — 0 filas afectadas = error visible). El acceso
  sigue siendo 127.0.0.1:9200 + túnel SSH (sin auth, YAGNI una usuaria). Probada
  e2e en producción con browser real (smoke movió un lead de smoke y lo regresó).
- **Patrón de testing**: componentes puros sin hooks (navegación con
  window.location, selección vía wrapper useSearchParams+usePathname en Suspense)
  → renderizables por el walker JSX de los tests sin navegador (22 tests).
- **Vistas SQL de agregados** (PGRST123: PostgREST de Supabase con agregados
  deshabilitados): `v_departamentos`, `v_embudo_leads`,
  `v_crm_conversaciones_resumen` (+ `v_facturas_resumen` del fix); todas
  `security_invoker` + revoke anon/authenticated; aplicadas por management API
  (MCP en read-only). Archivos `businessos/supabase-vista*-*.sql`.
- Gotcha menor: el MCP de Playwright exige Chrome (`/opt/google/chrome`) — para
  e2e local usar script node con el playwright del repo (patrón smoke de
  frontend-web2), el chromium de `npx playwright install chromium` sí está.

## Residuales

- ~~**Runtime**: build de imagen + `compose up a2abot` + cron de snapshot-pantheon~~ →
  **RESUELTO en Hetzner (2026-07-06)**: `a2abot` Up (responde 307, ya con auth
  `DASH_USER/PASS`), y `snapshot-pantheon.py` corre en el cron nocturno
  (`~/bin/nightly-jobs.sh`, 03:10) → pantheon con datos reales de negocio (HTTP 200).
  Pendiente menor: verificar el path real del health del gateway (antes mockeado).
- ~~**Dev**: screenshots Playwright de las 3 vistas~~ → HECHO 2026-07-04
  (`businessos/dashboard-screenshots/`, modo mock).
