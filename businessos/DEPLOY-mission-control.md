# Deploy de Mission Control (a2abot) a Vercel

> **Estado: DESPLEGADO** (2026-07-25) → **https://a2abot-mission-control.vercel.app**
> Proyecto Vercel `a2abot-mission-control` (scope `lisagomezs-projects`, Root
> Directory `.`). Auth (magic link + allowlist), PWA instalable y las 6 vistas
> verificadas en producción con datos reales. El app vive en la **RAÍZ del repo**
> (`saas-factory-app`), NO en `frontends/`.
>
> **Estado vivo (lo que ya está aplicado, no hay que repetirlo):**
> - 7 variables de entorno en target `production` (ver tabla §2).
> - Supabase Auth: `site_url` = la URL del deploy y `uri_allow_list` =
>   `https://a2abot-mission-control.vercel.app/**,http://localhost:3000/**`.
> - `PANEL_ALLOWED_EMAILS` = **solo los correos de la dueña**
>   (`elisa.qualy@gmail.com,lisagomez967@gmail.com`). Para sumar compañeros:
>   editar la var en Vercel y **redeployar** (las env de runtime se congelan por
>   deployment).
>
> **Redeploy** (desde la raíz, cuenta dueña):
> `rm -f .env.local && npx vercel deploy --prod --yes`

## 0. Qué cambió (por qué era obligatorio antes de exponerlo)

El panel renderiza **todo el negocio** (revenue, facturas, contratos, cobros,
leads, gasto de IA) usando `SUPABASE_SERVICE_ROLE_KEY` en el servidor. Hoy solo
lo "protege" el ser localhost + túnel SSH. En una URL pública de Vercel sería
**abierto a cualquiera**. Por eso este cambio añade:

- **Auth magic link (passwordless)** + **allowlist de correos fail-closed**:
  `middleware.ts` exige usuario autenticado **y** en `PANEL_ALLOWED_EMAILS` para
  toda ruta salvo `/login` y `/auth/*`. Sin allowlist configurada, **nadie entra**.
- **PWA instalable** (manifest + service worker + iconos): tus compañeros pueden
  "Agregar a pantalla de inicio" en móvil/desktop.

## 1. Prerequisito Supabase (Auth)

Mismo proyecto que usa el negocio: **A2ABot** (`hsejpktzcqwkwkwholkw`). En
**Supabase Dashboard → Authentication → URL Configuration**:

- **Site URL**: `https://<tu-dominio-vercel>` (p. ej. `https://a2abot-mission-control.vercel.app`).
- **Redirect URLs**: agrega `https://<tu-dominio-vercel>/auth/callback`
  (y `http://localhost:3000/auth/callback` si pruebas en local).

En **Authentication → Providers → Email**: deja **Email OTP / Magic Link**
habilitado (viene por defecto).

> ⚠️ **Rate limit real del email integrado: `rate_limit_email_sent = 2` por hora
> para TODO el proyecto** (no por usuario), y **no se puede subir**: la
> management API responde `401 "Custom SMTP required to configure ...
> RATE_LIMIT_EMAIL_SENT"`. Con el equipo entrando por magic link esto se agota
> rápido (el 3er correo de la hora simplemente no llega). Si molesta: configurar
> SMTP propio (Resend) en Authentication → SMTP Settings y entonces sí subir el
> límite.

> Nota shared-project: al entrar por primera vez, el trigger `handle_new_user`
> crea la fila en `profiles` (comportamiento existente; la allowlist gobierna el
> acceso real, no la existencia del usuario).

## 2. Proyecto Vercel

- **Root Directory**: `.` (raíz del repo). El `.vercelignore` ya excluye
  `businessos/`, `docs/`, `tests/` etc. para que la subida sea liviana.
- **Framework**: Next.js (autodetectado). Build `next build`. El
  `output: 'standalone'` del `next.config.ts` (para Docker) es inofensivo en Vercel.
- No hace falta `installCommand` especial: el app es autocontenido (sin paquete
  `file:` hermano, a diferencia de `cliente-web2`).

### Variables de entorno (Vercel → Settings → Environment Variables)

| Var | Ámbito | Notas |
|-----|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | build+runtime | público |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | build+runtime | público |
| `NEXT_PUBLIC_SITE_URL` | build+runtime | la URL del deploy (redirect del magic link) |
| `PANEL_ALLOWED_EMAILS` | runtime | **coma-separado, sin espacios de más**. Vacío = nadie entra |
| `SUPABASE_URL` | runtime | mismo proyecto (fuente de datos server) |
| `SUPABASE_SERVICE_ROLE_KEY` | runtime | **SERVER-ONLY**, bypassa RLS. Nunca `NEXT_PUBLIC_` |
| `DASHBOARD_DATA` | runtime | `real` (default con service_role) |

> Los internos `GRAFO_URL` / `GATEWAY_*_URL` **no se ponen** en Vercel: no son
> alcanzables desde ahí. El código ya degrada esas piezas a `null`/"caído".

### Publicar (cuenta dueña: `lisagomez` / scope `lisagomezs-projects`)

```bash
# Desde la RAÍZ del repo, con la cuenta dueña autenticada:
npx vercel link            # elegir/crear el proyecto (Root Directory ".")
rm -f .env.local           # ⚠️ 'vercel link' SÍ lo crea (con VERCEL_OIDC_TOKEN)
                           #    y mataría TODAS las lambdas con EnvFileReadError
npx vercel deploy --prod --yes   # build + deploy
```

Verificar tras el deploy: `npx vercel ls`. Vercel **no está conectado a GitHub**
para este proyecto → mergear a master **no** despliega; publicar es `vercel deploy`.

> **Auth de la CLI**: el token guardado en `~/.local/share/com.vercel.cli/auth.json`
> expira (~90 días) pero la CLI lo **auto-refresca** con su `refreshToken` en el
> primer comando (`vercel whoami`). Un `401/403` pegándole a `api.vercel.com` a
> mano con ese token **no significa** que haya que volver a hacer login: corre
> primero un comando de la CLI y vuelve a leer el archivo.

## 3. Smoke post-deploy (obligatorio)

```
GET  /                → 307 /login           (sin sesión)
GET  /dashboard       → 307 /login?next=...  (sin sesión)
GET  /login           → 200
GET  /manifest.webmanifest → 200 application/manifest+json
GET  /sw.js           → 200
GET  /icons/icon-192.png   → 200
```

Luego, con un correo de la allowlist: pedir enlace en `/login` → abrir el email
→ debe aterrizar autenticado en `/dashboard`. Un correo **fuera** de la allowlist
recibe el mismo mensaje genérico (sin filtrar) pero **no** recibe enlace, y si
lograra una sesión, el middleware lo manda a `/login?denied=1`.

Recordatorio de drift (aprendizaje 2026-07-23): haz smoke de **las 6 rutas**
(`/dashboard /ai-spend /grafo /desarrollo /crm` + `/`), no solo una: `/grafo`
(evaluaciones) y el health de gateways en `/dashboard` saldrán degradados en
Vercel (servicios internos inalcanzables) — es esperado, no un bug.

### Smoke AUTENTICADO sin depender del buzón (lo que se usó el 2026-07-25)

Comprobar solo los 307 deja sin verificar la mitad que importa (que el panel
renderice datos reales con `service_role`). Para entrar sin leer el correo:

1. `POST {SUPABASE_URL}/auth/v1/admin/generate_link` con la `service_role`
   (`{"type":"magiclink","email":"<allowlisted>","redirect_to":"<SITE>/auth/callback"}`)
   — **no envía correo**, devuelve `hashed_token`.
2. `GET {SUPABASE_URL}/auth/v1/verify?token=<hashed_token>&type=magiclink&redirect_to=…`
   sin seguir redirects → el `Location` trae `#access_token=…&refresh_token=…`.
3. Armar la cookie de `@supabase/ssr`: `sb-<ref>-auth-token` =
   `base64-` + base64 del JSON de sesión (`access_token`, `refresh_token`,
   `expires_at`, `expires_in`, `token_type`, `user`). Cabe en un chunk (~3 KB);
   si pasara de 3180 chars habría que partirla en `.0`/`.1`.
4. Pegarle a las 6 rutas con esa cookie → 200 + `datos: real`.
5. **Revocar al terminar**: `POST {SUPABASE_URL}/auth/v1/logout?scope=local` con
   ese `access_token` (borra solo esa sesión, no la de la dueña).

Ojo: este camino NO ejercita el PKCE del magic link real (el `?code=` exige el
`code-verifier` que el navegador guardó al pedir el enlace). Eso se verifica
aparte comprobando que `POST /auth/otp` responde con la cookie
`sb-<ref>-auth-token-code-verifier` — si esa cookie no viaja, el login real
termina en `/login?error=auth`.

### PWA (no basta con que `/sw.js` dé 200)

Que el manifest y el `sw.js` se sirvan **no** significa que el service worker
esté registrado. Verificar con navegador de verdad:
`navigator.serviceWorker.getRegistration()` debe existir y estar `activated`, y
`caches.keys()` debe contener `mc-static-v1` **solo con estáticos** (iconos +
manifest): si aparece una navegación/HTML ahí, el SW está cacheando páginas
sensibles y hay que arreglarlo antes que nada. Script de referencia: el smoke de
Playwright del 2026-07-25 (patrón de `frontends/`: `node smoke.mjs` con import
absoluto al playwright del repo).

## 4. Deploys de colaboradores (Vercel Hobby)

Igual que `cliente-web2`: en plan Hobby, un push de una cuenta que no sea la
dueña queda "Blocked". Como este proyecto se publica con `vercel deploy` manual
(no auto-deploy por git), no aplica el workaround del workflow. Si algún día se
conecta a GitHub, replicar `reauthor-tip-vercel.yml`.

## 5. Convivencia con el deploy Docker (Hetzner)

El servicio Docker `a2abot` de Hetzner sigue igual (túnel SSH, red interna con
grafo/gateways vivos). El middleware de auth **también** aplica ahí: quien acceda
por el túnel ahora verá `/login`. Añade el correo de la dueña a
`PANEL_ALLOWED_EMAILS` en el `.env` del compose y pon las 3 vars de auth
(`NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`, `NEXT_PUBLIC_SITE_URL`) para que el login
funcione también en el server. (Sin ellas, el middleware no puede validar sesión
y todo redirige a `/login` sin poder entrar.)
