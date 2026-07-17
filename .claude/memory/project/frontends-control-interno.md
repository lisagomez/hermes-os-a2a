# Frontends web del Business OS — control-interno

**Qué**: `businessos/frontends/` reúne las **tres superficies web** (ver su README) — espejo
del sistema agéntico (la UI muestra, el agente opera; "aislar, no fundir"):

| Dir | Superficie | Para quién | Estado |
|-----|-----------|-----------|--------|
| `control-interno/` | Control interno | el equipo (NO cliente) | ✅ integrado (Next 16 + Supabase + Tauri, vendored de `daniel-carreon/business-os-new`) |
| `cliente-web2/` | Cliente web2 marca-blanca | cliente final | 🚧 aún sin carpeta |
| `cliente-a2a-web3/` | Cliente A2A card / web3 | cliente vía A2A | 🎨 solo demo de diseño |

Los tres consumen el mismo **contrato de daemon** (`/chat/stream` SSE +
`/api/openclaw/action`, auth `OPENCLAW_GATEWAY_TOKEN`) → **punto de integración con
Hermes/A2A**: nuestro backend puede ser ese daemon implementando `/chat/stream`.

**control-interno — estado (2026-07-15: CABLEADO en runtime)**:
- **Desplegado en Hetzner** como contenedor **`frontend-ci`** (`127.0.0.1:3001`), ahora
  **servicio del compose** (`docker-compose.yml`, project `businessos`) y en **`hermes-net`**
  (resuelve por DNS `hermes-negocio`, `grafo-a2a`, `a2abot`). Sigue en `next dev --turbopack`
  sobre el código bind-monteado desde `${HOME}/frontend-control-interno` (no build de prod).
  Antes se corría a mano con `docker run` (huérfano del compose) — corregido esta sesión.
- **Supabase real cableado**: su `.env.local` (en el server) pasó de placeholders → claves
  reales del proyecto **A2ABot** (`hsejpktzcqwkwkwholkw`), validadas (`auth/v1/settings` 200,
  REST 200). Para VER la UI en dev local el `.env.local` del repo sigue en placeholder.
- **Las 31 tablas del frontend aplicadas a A2ABot** (mismo proyecto que el negocio/trío, no uno
  dedicado, porque ahí apuntan las creds). La única colisión (`profiles`) se reconcilió sin
  romper el signup del negocio: se añadió la columna `role` (superset) y se instaló un
  `handle_new_user` **fusionado** (inserta `avatar_url` del negocio **y** `role` del frontend,
  `search_path=''`). Las 8 tablas del negocio y sus datos quedaron intactos. Ver el aprendizaje
  de CLAUDE.md 2026-07-15.
- **Pendiente para operarla del todo** (retomar aquí): (1) **daemon** que sirva `/chat/stream` +
  `/api/openclaw/action` — el frontend ya lo alcanza por hermes-net, pero `CLAUDECLAW_URL` sigue
  en `localhost:3099` (no hay servicio que sirva ese contrato aún): apuntarlo a
  `http://<servicio>:<puerto>` cuando exista; (2) crear el **usuario de Elisa** (signup con
  `OWNER_EMAIL`, el trigger fusionado le crea el profile); (3) opcional: build de prod + exponer
  por `edge` con auth (hoy solo túnel SSH).
- Trabajo consolidado en `master` vía PR #51 (2026-07-15, bypass autorizado de la protección).
- Screenshots desde el agente: falta `libnspr4.so` para el chromium de Playwright →
  `sudo env "PATH=$PATH" npx playwright install-deps chromium` (el `sudo npx` pelado falla:
  root no tiene node en su PATH).

**Contexto ERP** (mismos merges, docs vivos en el repo): el maestro llegó a **v15**
(`businessos/erp/ERP-MAESTRO.md`) con RH/reclutamiento (v13), Datos & AI/Arkham (v14, ERP-8) y
Sigma agéntico (v15); blueprints derivados en `businessos/erp/integracion-arkham.md` (D-41) y
`businessos/crm/plan-autonomia-crm.md` (D-40). PRs #49/#50 mergeados 2026-07-14.
