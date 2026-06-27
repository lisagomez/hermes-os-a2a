# Acceso a Supabase (MCP + management API)

Proyecto Supabase: **A2ABot**, project-ref **hsejpktzcqwkwkwholkw**
(`https://hsejpktzcqwkwkwholkw.supabase.co`).

## Dos credenciales DISTINTAS (no confundir)
- **`service_role` key** (JWT `eyJ…`): llave de BD/servidor, bypassa RLS. Está en
  `businessos/.env` (`SUPABASE_SERVICE_ROLE_KEY`). La usan los contenedores Hermes.
  Sirve para REST/PostgREST, NO para el MCP.
- **Personal access token** (`sbp_…`): de la management API. Lo necesita el **MCP de
  Supabase**. Se saca en https://supabase.com/dashboard/account/tokens. NO vive en
  ningún `.env` del repo.

## Config del MCP (`.mcp.json`)
- `--project-ref=hsejpktzcqwkwkwholkw` (ya corregido; era placeholder).
- `SUPABASE_ACCESS_TOKEN` se lee de la **variable de entorno** `${SUPABASE_ACCESS_TOKEN}`
  (no hardcodear el `sbp_` en el archivo: está commiteado en git). Exportarla en el shell
  que lanza Claude Code (p.ej. `~/.bashrc`) y reiniciar para que el MCP la tome.

## Aplicar SQL sin el MCP (management API)
`POST https://api.supabase.com/v1/projects/<ref>/database/query`
con `Authorization: Bearer <sbp_…>` y body `{"query":"..."}`.
- **GOTCHA**: Cloudflare BLOQUEA el User-Agent por defecto de Python urllib → `403 error
  code: 1010`. Setear un UA tipo `curl/8.0` (o usar `curl`) y pasa.

## Esquema aplicado (2026-06-27)
`token_usage` y `facturas` creadas y verificadas (RLS ON, sin políticas = solo
`service_role`). Definición fuente: `businessos/supabase-init.sql`. Hay además una tabla
`profiles` (de un add-login previo, ajena a BusinessOS).
