# Deploy de `cliente-web2` (Vercel) + backend

> **Estado: DESPLEGADO** (2026-07-17) — https://cliente-web2.vercel.app
> Proyecto Vercel `cliente-web2` (scope lisagomezs-projects), upload root `frontends/`,
> Root Directory `cliente-web2`. Migración fase11 aplicada; leads verificado end-to-end
> (POST → fila real → limpieza). Chat live sigue degradado (decisión pendiente de la dueña).

## 0. Aprendizajes del primer deploy real (2026-07-17)

1. **Upload root ≠ app**: el paquete `file:../design-system` obliga a subir `frontends/`
   completo y fijar Root Directory `cliente-web2` **vía API** (`PATCH /v9/projects/{id}`,
   el CLI no tiene flag). Correr `vercel deploy` DESDE el subdir se auto-linkea mal y busca
   `cliente-web2/cliente-web2`.
2. **Tipos de React del paquete hermano**: en Vercel `tsc` no los resuelve (en dev los
   aportaba el `node_modules` de la raíz del monorepo, que no viaja). NO mapear `react` en
   `tsconfig.paths` — Turbopack usa esos paths como alias de bundling y revienta el build
   apuntando runtime a `@types/`. Fix real: `devDependencies` `@types/react`(-dom) en el
   design-system + installCommand `npm install && npm install --prefix ../design-system`.
3. **El `.env.local` que crea `vercel link` en el upload root MATA las lambdas**: si viaja
   en el deploy, toda function muere con `failed to load env vars: EnvFileReadError` (500
   genérico sin tocar tu código; la landing estática sigue viva y engaña). Fix: borrarlo y
   `.vercelignore` con `.env*`.

Runbook para publicar la superficie web2. Deploy en **Vercel**; el backend vive en el Droplet
Hetzner. Honestidad operativa: lo que queda **live** de inmediato vs. lo que necesita un paso
de infra.

## 1. Prerequisito de datos (Supabase)

Aplicar una vez sobre el proyecto Supabase (habilita el origen `web2` en `leads`):

```sql
-- businessos/supabase-fase11-leads-web2.sql
```

Aplicar con el patrón del repo (MCP Supabase read-only bloquea DDL → management API
`POST /v1/projects/{ref}/database/query` con `SUPABASE_ACCESS_TOKEN`, UA `curl/8.0`), o desde
el SQL editor del dashboard. Verificar con el MCP (reads sí funcionan) que el CHECK acepta `web2`.

## 2. Proyecto Vercel

- **Root Directory**: `businessos/frontends/cliente-web2` (monorepo → subdir).
- **Framework**: Next.js (autodetectado). Build `next build`, output autodetectado.
- El design system (`../design-system`) se resuelve por `file:` + `transpilePackages`; queda
  dentro de la raíz de tracing (`turbopack.root = frontends/`).

### Variables de entorno (Vercel → Settings → Environment Variables)

| Var | Ámbito | Notas |
|-----|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | build+runtime | público |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | build+runtime | público (RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | runtime | **server-only**, bypassa RLS |
| `CLAUDECLAW_URL` | runtime | URL pública del daemon (ver §3); vacío = chat degradado |
| `OPENCLAW_GATEWAY_TOKEN` | runtime | server-only |
| `POLAR_ACCESS_TOKEN` / `POLAR_PRODUCT_ID` | runtime | opcional (checkout) |
| `NEXT_PUBLIC_SITE_URL` | build+runtime | dominio final |

Sin secretos en el repo; todo por env. `.env.local` es solo para dev.

### Qué queda live de inmediato

- **Landing** completa (estática/SSR).
- **Captura de leads** → Supabase `leads` (Supabase es cloud/público). ✅
- **Checkout Polar** → si `POLAR_*` está configurado (API pública). ✅

## 3. Chat en vivo (paso de infra opt-in)

El daemon Hermes (`:3099`) y grafo (`:3000`) están en `127.0.0.1` del Droplet (túnel SSH); hoy
**solo `edge:443 → ventas-a2a` es público** (`businessos/edge/Caddyfile`). Para encender el chat
en vivo desde Vercel hay que exponer una ruta pública **autenticada** al daemon por el edge Caddy.

Patrón (añadir al site block del `edge/Caddyfile`, sin exponer el resto del daemon):

```caddyfile
# Chat público de la landing web2 → daemon Hermes. Autenticado por el token
# compartido; rate-limit para proteger. Ajustar el host/puerto real del daemon.
@chat path /chat/stream
handle @chat {
    rate_limit {
        zone web2chat { key {remote_host}; events 20; window 1m }
    }
    request_body { max_size 32KB }
    reverse_proxy hermes-daemon:3099
}
```

Luego en Vercel: `CLAUDECLAW_URL=https://<dominio-edge>` y `OPENCLAW_GATEWAY_TOKEN=<token>`.
Mientras esto no esté, el chat **degrada con un aviso claro** (`/api/chat/stream` emite un SSE
que invita a usar el formulario) — no se cuelga ni finge respuestas.

> Exponer el daemon a internet es una decisión de seguridad de la dueña. Este paso queda
> documentado, no ejecutado. Alternativa más acotada: enrutar la captura de lead por
> `ventas-a2a` (ya público) en vez del daemon.

## 4. Verificación post-deploy

1. Landing carga en el dominio; toggle ES/EN; abrir una demo; añadir carta → cotizador con USD.
2. Enviar el formulario de "Agendar llamada" → verificar fila real en Supabase `leads`
   (`select * from leads where origen='web2' order by created_at desc limit 1`).
3. (Si se activó el chat) escribir en el widget → respuesta SSE del daemon.
4. Smoke local de referencia: `businessos/dashboard-screenshots/web2-*.png`.
