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

**Deploy por git (desde 2026-07-28, decisión de la dueña):** el proyecto está conectado a
GitHub con **Root Directory = `businessos/frontends/meeting-copilot`** (fijado por API ANTES
de conectar — ver incidente abajo). Publicar = **mergear a master** (el merge lo ejecuta la
cuenta dueña → sin bloqueo Hobby). El deploy CLI del paso 5 sigue funcionando como fallback.
Previews: cada push de rama genera uno; sin env vars de preview quedan **fail-closed**
(todo redirige a `/login?error=config`) — esperado, no configurarles auth; los push de
colaboradores pasan por el workflow `reauthor-tip-vercel.yml` (aprendizaje 2026-07-17).

Dos gotchas pagados al montarlo (2026-07-28):

- **`sourceFilesOutsideRootDirectory` debe estar OFF** ("Include source files outside of
  the Root Directory" en el dashboard; `PATCH /v9/projects/{id}` con
  `{"sourceFilesOutsideRootDirectory": false}`). Con ON, el builder resuelve `.next` en
  `/vercel/path0/` = la RAÍZ del repo — que aquí es OTRA app Next (Mission Control) — y el
  deploy muere post-build con `ENOENT …/.next/pages-manifest.json` aunque el build haya
  compilado la app correcta. Esta app es self-contained: no necesita nada fuera de su dir.
- **`vercel redeploy` de un deployment fallido NO prueba un ajuste de settings**: reusa el
  snapshot del original (falló igual tras el fix). Deployment fresco: push nuevo o
  `POST /v13/deployments` con `gitSource {type: github, repoId, ref: master}`.

> ⚠️ **Incidente 2026-07-28 — conectar este proyecto a GitHub CLOBBEA producción.**
> El proyecto amaneció conectado al repo (conexión hecha desde el dashboard, ventana
> ~13:11–13:55 UTC) con su Root Directory en `.` → cada merge a master construyó la app
> de la RAÍZ del repo (Mission Control de infra) y la publicó ENCIMA del alias de
> producción del copiloto: `meeting-copilot-pi.vercel.app` sirvió Mission Control y la
> dueña "entraba a la página equivocada" con su sesión válida (misma cookie Supabase,
> mismo dominio → ni login pidió). Señales para cazarlo: `vercel alias ls` con entradas
> `meeting-copilot-git-<rama>-…` y `vercel ls` con deployments Production que nadie
> lanzó por CLI; el `<title>` de `/login` delata qué app está sirviendo. Fix:
> `vercel git disconnect` + `vercel deploy --prod` desde el dir de la app. Si algún día
> se QUIERE auto-deploy por git, fijar ANTES Root Directory =
> `businessos/frontends/meeting-copilot` (y recordar el bloqueo Hobby a deploys de
> colaboradores, aprendizaje 2026-07-17). **Hecho ese mismo día por decisión de la
> dueña**: Root Directory fijado por API y repo reconectado — el estado vigente es el
> del bloque "Deploy por git" de arriba.

## 2. Env vars

| Var | Ámbito | Notas |
|-----|--------|-------|
| `OPENROUTER_API_KEY` | runtime | server-only; sin ella las rutas `/api/asesor/*` responden 503 y la UI degrada VISIBLE al banco del playbook / reglas |
| `NEXT_PUBLIC_AGENT_ENGINE` | build | `llm` en prod; `rules` = motor determinista puro |
| `ASESOR_LLM_MODEL` | runtime | opcional; default `google/gemini-2.5-flash-lite` |
| `NEXT_PUBLIC_COPILOT_DATA` | build | NO fijar (`mock` es el único válido; `real` reservado a Supabase post-MVP y truena al cargar) |
| `NEXT_PUBLIC_TRANSCRIPTION_PROVIDER` | build | NO fijar (mock); providers reales requieren backend accesible desde el navegador |
| `NEXT_PUBLIC_SUPABASE_URL` | build+runtime | proyecto A2ABot (`hsejpktzcqwkwkwholkw`); público |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | build+runtime | público |
| `NEXT_PUBLIC_SITE_URL` | build+runtime | `https://meeting-copilot-pi.vercel.app` (redirect del magic link) |
| `PANEL_ALLOWED_EMAILS` | runtime | coma-separado; **vacío = nadie entra** (fail-closed). Cambiarla exige redeploy (las env de runtime se congelan por deployment) |
| `AUTH_DISABLED` | runtime | **JAMÁS en Vercel** — escape solo para dev local mock-first |

## 3. Auth (activa desde 2026-07-28) — patrón Mission Control

Magic link (passwordless) + **allowlist fail-closed**: `src/middleware.ts` exige usuario
autenticado Y en `PANEL_ALLOWED_EMAILS` para toda ruta salvo `/login` y `/auth/*` —
**incluidas las `/api/*`** (las rutas del asesor gastan OpenRouter; con la app pública
cualquiera podía quemar tokens). El envío del OTP se gatea en el servidor
(`/auth/otp`, respuesta siempre genérica: sin oráculo de enumeración ni email-bombing).
Sin variables de Supabase el middleware NO truena: redirige todo a `/login?error=config`
(fail-closed honesto). Mismo proyecto Supabase que Mission Control (A2ABot) → mismo
prerequisito de `uri_allow_list`: la URL del deploy + `/auth/callback` deben estar en
Authentication → URL Configuration. El trigger `handle_new_user` crea la fila en
`profiles` al primer login (comportamiento del proyecto compartido; la allowlist
gobierna el acceso real).

Historia: el MVP salió sin auth (2026-07-26) porque era 100% mock sin datos de negocio;
la decisión quedó condicionada y se ejerció el 2026-07-28 (motor LLM ya activo en prod +
Pre-Discovery con datos de leads reales en camino).

> ⚠️ **Gotcha del proyecto Supabase COMPARTIDO (visto en vivo 2026-07-28)**: Mission
> Control y Meeting Copilot mandan un magic link **idéntico** ("Your sign-in link",
> mismo remitente) — Gmail los agrupa en un hilo y es fácil abrir el de la OTRA app,
> que te deja en su sesión (la dueña acabó en el Pantheon de Mission Control creyendo
> que el login del copiloto falló; en los logs de auth el login del copiloto había
> sido EXITOSO). La plantilla NO se puede editar en free tier sin SMTP propio
> (`400: Email template modification is not available for free tier`). Mitigación:
> abrir siempre el correo MÁS RECIENTE, y si caes en la app equivocada, navegar
> directo a la URL correcta (la sesión ya quedó creada). Fix real: SMTP propio
> (Resend) → habilita plantilla con `{{ .RedirectTo }}` visible Y quita el
> rate-limit de 2 correos/hora — un solo prerequisito para ambas mejoras.

> ⚠️ **Gotcha de las URLs por-deployment de Vercel (visto en vivo 2026-07-29)**: pedir
> el magic link navegando en `meeting-copilot-<hash>-….vercel.app` (el enlace que da el
> dashboard/PR de Vercel) fija la cookie PKCE `code-verifier` en ESE host, pero el
> correo aterriza en `NEXT_PUBLIC_SITE_URL` (el dominio canónico) → cookies no cruzan
> hosts → `exchangeCodeForSession` falla y el login muere con "el enlace expiró" aunque
> en los logs de auth el `/verify` salió 303 (token válido). **Fix estructural**: el
> middleware redirige 308 todo host no-canónico al canónico cuando
> `VERCEL_ENV=production` (`src/shared/lib/auth/canonico.ts`; previews y dev intactos).
> Señal en logs de Vercel: columna HOST distinta entre el `POST /auth/otp` y el
> `GET /auth/callback`. Recordar además el rate-limit (2 correos/hora): los intentos
> fallidos queman el cupo y el tercero se traga en silencio (ahora al menos se loguea
> en `[auth/otp]`).

## 4. Verificación post-deploy (smoke de TODAS las vistas — doctrina 2026-07-23)

Hecho en el deploy inicial; repetir tras cada `deploy --prod`:

0. **Candado primero**: `/`, `/reuniones` y `POST /api/asesor/pregunta` SIN sesión →
   307 a `/login` (no `error=config`, que indicaría env vars ausentes); `/login` → 200
   con el formulario; `POST /auth/otp` con un correo cualquiera → respuesta genérica.
1. Las 9 rutas estáticas → 200 **con sesión** (mintarla por admin API sin buzón —
   doctrina 2026-07-25, `generate_link` + `/auth/v1/verify` + cookie `sb-<ref>-auth-token`;
   revocar con `logout?scope=local` al terminar): `/`, `/reuniones`, `/grabacion`,
   `/manager`, `/playbooks`, `/herramientas`, `/herramientas/transcripcion`,
   `/configuracion`, `/reuniones/nueva`.
2. Dinámicas con fixture `r-translogika-disc`: `/reuniones/<id>` → **307 a
   `/transcripcion` (esperado, tab por defecto)** → 200; `guiada`/`insights`/`resumen`/
   `transcripcion` → 200.
3. `POST /api/asesor/pregunta` con body válido (y sesión) → 200 con `pregunta` +
   `justificacion` + `modelo` (prueba la clave end-to-end). `POST /api/asesor/insights`
   con `{}` → error de contrato ("Cuerpo inválido"), no 500.
