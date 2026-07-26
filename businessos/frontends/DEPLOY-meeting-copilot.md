# Deploy de `meeting-copilot` (Vercel)

> **Estado: DESPLEGADO** (2026-07-26) — https://meeting-copilot-pi.vercel.app
> Proyecto Vercel `meeting-copilot` (scope lisagomezs-projects). A diferencia de
> `cliente-web2`, la app es **self-contained** (no usa `file:../design-system`), así que el
> upload root ES el directorio de la app: `businessos/frontends/meeting-copilot/`. Sin
> Root Directory por API ni installCommand especial.

## 1. Cómo se desplegó (y cómo re-hacerlo)

Todo desde `businessos/frontends/meeting-copilot/`, como cuenta dueña (`lisagomez`):

1. `npm run build` local en verde ANTES de tocar Vercel (17 rutas).
2. `.vercelignore` con `.env*` (preventivo — mina 2026-07-17: un `.env.local` que viaje en
   el deploy mata TODAS las lambdas con `EnvFileReadError`).
3. `npx vercel link --yes --project meeting-copilot` — **SÍ crea `.env.local`**
   (VERCEL_OIDC_TOKEN); borrarlo de inmediato (`rm .env.local`). También añade
   `.vercel`/`.env*` al `.gitignore` de la app (versionado, correcto).
4. Env vars de producción, piped sin imprimirlas:
   - `OPENROUTER_API_KEY` (runtime, **server-only**) ← vive en `businessos/.env` de dev
   - `NEXT_PUBLIC_AGENT_ENGINE=llm` (build: los `NEXT_PUBLIC_*` se inline-an al compilar)
5. `npx vercel deploy --prod` (47 s). Verificar con `npx vercel ls meeting-copilot`.

El proyecto **NO está conectado a GitHub** (igual que cliente-web2): mergear a master NO
despliega. Publicar cambios = repetir el paso 5 desde el directorio de la app.

## 2. Env vars

| Var | Ámbito | Notas |
|-----|--------|-------|
| `OPENROUTER_API_KEY` | runtime | server-only; sin ella las rutas `/api/asesor/*` responden 503 y la UI degrada VISIBLE al banco del playbook / reglas |
| `NEXT_PUBLIC_AGENT_ENGINE` | build | `llm` en prod; `rules` = motor determinista puro |
| `ASESOR_LLM_MODEL` | runtime | opcional; default `google/gemini-2.5-flash-lite` |
| `NEXT_PUBLIC_COPILOT_DATA` | build | NO fijar (`mock` es el único válido; `real` reservado a Supabase post-MVP y truena al cargar) |
| `NEXT_PUBLIC_TRANSCRIPTION_PROVIDER` | build | NO fijar (mock); providers reales requieren backend accesible desde el navegador |

## 3. Exposición pública — por qué NO lleva auth (hoy)

Doctrina 2026-07-24: auth es prerequisito cuando la superficie renderiza datos de negocio
o usa `service_role`. Meeting Copilot **no toca Supabase ni datos reales** (100% fixtures
mock); lo único server-side es la llamada a OpenRouter, acotada: Zod estricto en el body
(contexto ≤40×600 chars), `max_tokens` 220/900, timeout 9 s, modelo flash-lite. El riesgo
de abuso es gasto marginal de tokens, no fuga de datos. **Revisar esta decisión cuando
entre `NEXT_PUBLIC_COPILOT_DATA=real` (Supabase)**: en ese momento aplica el patrón
Mission Control (magic link + allowlist fail-closed) ANTES de mantenerlo público.

## 4. Verificación post-deploy (smoke de TODAS las vistas — doctrina 2026-07-23)

Hecho en el deploy inicial; repetir tras cada `deploy --prod`:

1. Las 9 rutas estáticas → 200: `/`, `/reuniones`, `/grabacion`, `/manager`, `/playbooks`,
   `/herramientas`, `/herramientas/transcripcion`, `/configuracion`, `/reuniones/nueva`.
2. Dinámicas con fixture `r-translogika-disc`: `/reuniones/<id>` → **307 a
   `/transcripcion` (esperado, tab por defecto)** → 200; `guiada`/`insights`/`resumen`/
   `transcripcion` → 200.
3. `POST /api/asesor/pregunta` con body válido → 200 con `pregunta` + `justificacion` +
   `modelo` (prueba la clave end-to-end). `POST /api/asesor/insights` con `{}` → error de
   contrato ("Cuerpo inválido"), no 500.
