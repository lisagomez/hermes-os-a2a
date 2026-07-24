# Deploy de Mission Control (a2abot) a Vercel

> **Estado: LISTO PARA DESPLEGAR** (2026-07-24). Auth (magic link + allowlist),
> PWA instalable y build verde. El push a Vercel lo hace la dueña (elección
> "solo déjalo listo"). El app vive en la **RAÍZ del repo** (`saas-factory-app`),
> NO en `frontends/`.

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
habilitado (viene por defecto). El email de Supabase basta para un equipo chico
(rate-limit ~3-4/hora; suficiente).

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
npx vercel deploy --prod   # build + deploy
# Borra el .env.local que 'vercel link' pueda crear (mataría las lambdas):
rm -f .env.local           # (ya está en .vercelignore, pero por si acaso)
```

Verificar tras el deploy: `npx vercel ls`. Vercel **no está conectado a GitHub**
para este proyecto → mergear a master **no** despliega; publicar es `vercel deploy`.

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
