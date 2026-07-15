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

**control-interno — estado (2026-07-14)**:
- **Corre local** en la máquina de dev: `cd businessos/frontends/control-interno && npm run dev`
  → `http://localhost:3000` (redirige a `/login`). **Node 20.20.2 sirve** con Next 16 pese al
  README que pide 22 (eso es por Tauri). `node_modules` git-ignored (~708 MB).
- `.env.local` es **PLACEHOLDER** (Supabase dummy, git-ignored): el dev server bootea y el login
  Titaniumorphism renderiza, pero **no se puede entrar** (sin auth ni datos reales).
- **Pendiente para operarla** (retomar aquí): (1) **wire de Supabase real** — proyecto +
  migraciones (`supabase/migrations/`: base_schema, finances, calendar, canvas, todoist) +
  usuario de la dueña; (2) el chat necesita el **daemon Hermes/A2A** por `/chat/stream`.
  Su esquema Supabase **coexiste** con el esquema `erp` (no chocan; reconciliar = trabajo aparte).
- Trabajo en la rama `feat/erp-frontends` (desde master 2026-07-14).
- Screenshots desde el agente: falta `libnspr4.so` para el chromium de Playwright →
  `sudo env "PATH=$PATH" npx playwright install-deps chromium` (el `sudo npx` pelado falla:
  root no tiene node en su PATH).

**Contexto ERP** (mismos merges, docs vivos en el repo): el maestro llegó a **v15**
(`businessos/erp/ERP-MAESTRO.md`) con RH/reclutamiento (v13), Datos & AI/Arkham (v14, ERP-8) y
Sigma agéntico (v15); blueprints derivados en `businessos/erp/integracion-arkham.md` (D-41) y
`businessos/crm/plan-autonomia-crm.md` (D-40). PRs #49/#50 mergeados 2026-07-14.
