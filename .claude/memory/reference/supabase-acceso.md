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
- `--read-only` ACTIVO (2026-06-28): el MCP solo lee (tablas, métricas, advisors).
  Para escribir/migrar se usa la management API por curl, no el MCP. Quitar el flag
  solo si de verdad se necesita que el agente escriba por MCP.
- `--project-ref=hsejpktzcqwkwkwholkw` (ya corregido; era placeholder).
- `SUPABASE_ACCESS_TOKEN` se lee de la **variable de entorno** `${SUPABASE_ACCESS_TOKEN}`
  (no hardcodear el `sbp_` en el archivo: está commiteado en git). Reiniciar Claude Code
  para que el MCP la tome.
- **Dónde vive el token**: SOLO en `~/.config/claude/secrets.env` (perms `600`), **POR
  MÁQUINA** (ver [[maquinas-entornos]]): hay 2 máquinas y cada una necesita su copia.
  En la máquina de desarrollo se creó el 2026-07-02 con un `sbp_` nuevo (los scripts lo
  cargan directo con `source ~/.config/claude/secrets.env`; el `.bashrc` no lo sourcea).
  Si falta en una máquina: token nuevo en supabase.com/dashboard/account/tokens y
  recrear el archivo ahí.
- **REGLA: nunca imprimir el `sbp_`.** Para consultar por curl, cargar la var y referenciarla,
  nunca pegar el literal: `source ~/.config/claude/secrets.env` y usar
  `-H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"` (el header no sale en la salida de curl;
  no usar `-v` ni `echo $TOKEN` ni `set -x`). Esto evita filtrarlo al transcript.
- **GOTCHA (2026-06-28)**: el `export` en `~/.bashrc` tenía el token `sbp_…` **pegado 3
  veces** (concatenado sin separador) → valor inválido → MCP daba `Unauthorized` aunque
  "existía" la variable. Corregido a UN solo token. El MCP toma el cambio **solo al
  reiniciar Claude Code** (el proceso MCP en curso conserva el env con el que se lanzó).
  Token válido confirmado contra la management API (`GET /v1/projects`).
- **GOTCHA (2026-07-03)**: `secrets.env` define las vars SIN `export`, así que un
  `source` normal las deja como shell-locals y NO llegan a procesos hijos (python
  truena con `KeyError` aunque `[ -n "$VAR" ]` diga que existe). Para host-jobs:
  `set -a; source ~/.config/claude/secrets.env; set +a` antes de invocar python.

## Aplicar SQL sin el MCP (management API)
`POST https://api.supabase.com/v1/projects/<ref>/database/query`
con `Authorization: Bearer <sbp_…>` y body `{"query":"..."}`.
- **GOTCHA**: Cloudflare BLOQUEA el User-Agent por defecto de Python urllib → `403 error
  code: 1010`. Setear un UA tipo `curl/8.0` (o usar `curl`) y pasa.

## Config de Auth por management API
`GET`/`PATCH https://api.supabase.com/v1/projects/<ref>/config/auth` (mismo token `sbp_`).
El GET trae secretos (SMTP, etc.) → no volcar entero, filtrar el campo con `python3 -c`.
- **GOTCHA plan Free (2026-06-28)**: activar leaked password protection
  (`password_hibp_enabled: true`, HaveIBeenPwned) da **HTTP 402** "available on Pro Plans
  and up". NO es un bug ni un problema de permisos: es limitación del plan Free. El advisor
  de seguridad `auth_leaked_password_protection` (WARN) queda abierto hasta subir a Pro.
  En Free sí se puede reforzar la política de contraseñas (longitud/caracteres) como
  mitigación parcial.

## Esquema aplicado (2026-06-27)
`token_usage` y `facturas` creadas y verificadas (RLS ON, sin políticas = solo
`service_role`). Definición fuente: `businessos/supabase-init.sql`. Hay además una tabla
`profiles` (de un add-login previo, ajena a Hermes OS · A2A).
