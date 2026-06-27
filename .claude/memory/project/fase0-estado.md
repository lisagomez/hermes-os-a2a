# Estado de Fase 0 (al 2026-06-27)

KPI de Fase 0: las **3 verticales vivas** respondiendo por Telegram, cada una con su
persona + respaldo nocturno. Progreso: **1 de 3 verticales vivas.**

## Hecho
- ✅ **Vertical personal (iris)** viva como servicio persistente `hermes-personal`
  (contenedor, `--restart unless-stopped`, red `hermes-net`), corriendo en **WSL2 local**
  (no en el Droplet todavía). Bot propio **Kiris** `@hermes_khmcih2cwjdulkbq_bot`.
  Modelo `nvidia/nemotron-3-super-120b-a12b` vía OpenRouter. Persona BusinessOS
  instalada. Round-trip verificado: le escribes → responde.
- ✅ **Supabase** (proyecto A2ABot): tablas `token_usage` y `facturas` aplicadas y
  verificadas. Ver [[supabase-acceso]].

## Pendiente de Fase 0
- ⬜ Vertical **negocio** (token Telegram placeholder en `businessos/.env`).
- ⬜ Vertical **clientes** (token Telegram placeholder).
- ⬜ Llevar las verticales al **Droplet** con `docker compose` (esto fue prueba en WSL2).
- ⬜ **Respaldo nocturno** a GitHub (un repo privado por vertical, crons escalonados).
- ⬜ Voz (TTS salida / transcripción entrada).

## Cómo levantar las que faltan
Mismo patrón que personal → ver [[hermes-vertical-setup]]. Cada una con su propio bot.

## Deuda / seguridad
- 🔒 Tokens expuestos en texto plano durante la sesión del 2026-06-27 (Kiris, @liziris,
  Supabase access token y service_role). **Rotarlos** cuando se pueda.
- El Hermes "del host" (`~/.hermes`) tiene un `config.yaml` **corrupto** (bloque
  `telegram:` mal inyectado en `platform_toolsets:`, ~línea 660). No se arregló porque
  se decidió usar bot/vertical nuevos. Es ajeno a BusinessOS.
