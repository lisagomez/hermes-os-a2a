# Estado de Fase 0 (al 2026-06-27)

KPI de Fase 0: las **3 verticales vivas** respondiendo por Telegram, cada una con su
persona + respaldo nocturno. Progreso: **2 de 3 verticales vivas.**

## Hecho
- ✅ **Vertical personal (iris)** viva como servicio persistente `hermes-personal`
  (contenedor, `--restart unless-stopped`, red `hermes-net`), corriendo en **WSL2 local**
  (no en el Droplet todavía). Bot propio **Kiris** `@hermes_khmcih2cwjdulkbq_bot`.
  Modelo `nvidia/nemotron-3-super-120b-a12b` vía OpenRouter. Persona BusinessOS
  instalada. Round-trip verificado: le escribes → responde.
- ✅ **Vertical negocio** viva como servicio `hermes-negocio` (2026-06-28). Bot
  **@a2aTeamBot** (id 8718725089). Mismo modelo nemotron vía OpenRouter, persona negocio
  instalada. Round-trip verificado (consultó `token_usage` del mes y pidió aprobación
  manual del query — gate "copiloto no autopiloto" funcionando). Levantada con **setup NO
  interactivo** (ver [[hermes-vertical-setup]]). Corre en WSL2 local, falta Droplet.
- ✅ **Supabase** (proyecto A2ABot): tablas `token_usage` y `facturas` aplicadas y
  verificadas. Ver [[supabase-acceso]].

- 🟡 **Vertical clientes** levantada (`hermes-clientes`, bot **@a2aClientbot** id
  8949942204, nemotron vía OpenRouter, persona + regla de higiene de salida instaladas).
  Mismo setup no interactivo. **Falta el round-trip de la usuaria** para darla por viva.

## Pendiente de Fase 0
- 🟡 Confirmar round-trip de **clientes** (escribirle a @a2aClientbot).
- ⬜ Llevar las verticales al **Droplet** con `docker compose` (esto fue prueba en WSL2).
- ⬜ **Respaldo nocturno** a GitHub (un repo privado por vertical, crons escalonados).
- ⬜ Voz (TTS salida / transcripción entrada).

## Cómo levantar las que faltan
Mismo patrón que personal → ver [[hermes-vertical-setup]]. Cada una con su propio bot.

## Incidente token (2026-06-28)
- Personal dejó de responder con `telegram.error.InvalidToken: Unauthorized`. Causa: el
  token de Kiris en el **volumen** (`~/businessos/personal/.hermes/.env`) era viejo (rotado);
  el válido estaba en el `.env` del repo. **Fix**: sincronizar el `TELEGRAM_BOT_TOKEN` del
  volumen con el válido y reiniciar. Gotcha en [[hermes-vertical-setup]].

## Deuda / seguridad
- 🔒 Tokens expuestos en texto plano durante las sesiones del 2026-06-27/28 (Kiris,
  @liziris, Supabase access token `sbp_` y service_role). **Rotarlos** cuando se pueda.
- ✅ (2026-06-28) Manejo del `sbp_` endurecido: vive solo en `~/.config/claude/secrets.env`
  (perms 600), `.bashrc` solo hace `source`, `.mcp.json` usa `${VAR}`. Regla nueva: nunca
  imprimir el literal. Ver [[supabase-acceso]]. Falta rotar el token una última vez (ya
  viajó al transcript) y reiniciar Claude Code para que el MCP tome el valor corregido.
- El Hermes "del host" (`~/.hermes`) tiene un `config.yaml` **corrupto** (bloque
  `telegram:` mal inyectado en `platform_toolsets:`, ~línea 660). No se arregló porque
  se decidió usar bot/vertical nuevos. Es ajeno a BusinessOS.
