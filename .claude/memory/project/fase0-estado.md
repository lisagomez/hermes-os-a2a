# Estado de Fase 0 (al 2026-06-27)

KPI de Fase 0: las **3 verticales vivas** respondiendo por Telegram, cada una con su
persona + respaldo nocturno. Progreso: **3 de 3 verticales vivas y respondiendo
(round-trip confirmado el 2026-06-28).** Falta llevarlas al Droplet y el respaldo nocturno.

## Hecho
- ✅ **Vertical personal (iris)** viva como servicio persistente `hermes-personal`
  (contenedor, `--restart unless-stopped`, red `hermes-net`), corriendo en **WSL2 local**
  (no en el Droplet todavía). Bot propio **Kiris** `@hermes_khmcih2cwjdulkbq_bot`.
  Modelo `nvidia/nemotron-3-super-120b-a12b` vía OpenRouter. Persona Hermes OS · A2A
  instalada. Round-trip verificado: le escribes → responde.
- ✅ **Vertical negocio** viva como servicio `hermes-negocio` (2026-06-28). Bot
  **@a2aTeamBot** (id 8718725089). Mismo modelo nemotron vía OpenRouter, persona negocio
  instalada. Round-trip verificado (consultó `token_usage` del mes y pidió aprobación
  manual del query — gate "copiloto no autopiloto" funcionando). Levantada con **setup NO
  interactivo** (ver [[hermes-vertical-setup]]). Corre en WSL2 local, falta Droplet.
- ✅ **Supabase** (proyecto A2ABot): tablas `token_usage` y `facturas` aplicadas y
  verificadas. Ver [[supabase-acceso]].

- ✅ **Vertical clientes** viva como servicio `hermes-clientes` (2026-06-28). Bot
  **@a2aClientbot** id 8949942204, nemotron vía OpenRouter, persona + regla de higiene de
  salida instaladas. Mismo setup no interactivo. Round-trip confirmado.

## Pendiente de Fase 0
- ⏸️ **Droplet DIFERIDO (decisión 2026-06-28, por costo).** Se sigue en **WSL2 local**
  mientras es fase de construcción. Levantarlo cuando haya un disparador real de "always-on":
  (1) onboarding del equipo de 4, o (2) querer que corran solos los crons (digests + respaldo
  nocturno). Todo listo para hacerlo en ~20-30 min (FASE0.md + volúmenes ya configurados; se
  transfieren en vez de re-correr wizards). `doctl` ya instalado en `~/.local/bin`. NO se creó
  ningún Droplet (sin gasto). Plan: 2 GB primero (s-1vcpu-2gb) con swap + `mem_limit` ~512MB.
- ✅ **Respaldo nocturno** a GitHub — **HECHO** (negocio 2026-07-06, las 3 verticales 2026-07-08).
  Estuvo diferido mientras corría en WSL2 (no 24/7 → el cron no dispara fiable); entró junto con
  Hetzner. **Modelo final**: UN host-job (`backup-verticales.sh`, cron 04:17) tarballea los 3
  volúmenes `.hermes` y los espeja al repo privado **`lisagomez/hermes-os-a2a-backups`**. Se
  DESCARTÓ el modelo del runbook ("3 repos, uno por vertical, el bot hace commit+push a las
  2:00/2:10/2:20"): el volumen es `0700`/uid-10000 → el agente no puede leerlo (y darle acceso
  sería darle sus propios secretos). Repo de CÓDIGO: `lisagomez/hermes-os-a2a` (ambos renombrados
  el 2026-07-11). Ver FASE0.md §9.
- ⬜ Voz (TTS salida / transcripción entrada).

## Gotcha credencial (2026-06-28)
- En `~/.config/claude/secrets.env` se pegó por error una **SSH key pública** en el slot de
  `DIGITALOCEAN_ACCESS_TOKEN` (la SSH key tiene espacios → rompe el `source` del archivo y deja
  el token inválido). El API token de DO es distinto: empieza con `dop_v1_`, sale de DO → API →
  Tokens (NO de SSH Keys). Pendiente: corregir esa línea cuando se retome el Droplet.

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
  se decidió usar bot/vertical nuevos. Es ajeno a Hermes OS · A2A.

## ACTUALIZACIÓN 2026-07-08 — FASE 0 COMPLETA (salvo voz)

Las **3 verticales viven en Hetzner** (167.233.233.56) 24/7:
- negocio migrado 2026-07-05; **personal (Kiris) y clientes migradas 2026-07-08**
  con el patrón documentado en [[despliegue-hetzner]] (stop en WSL2 → tar vía
  alpine → extracción uid 10000/0700 sin locks → `--profile verticales up`).
  Envío saliente verificado desde ambos bots (`hermes send` → message_id).
  Contenedores locales ELIMINADOS (volúmenes locales quedan de respaldo extra).
- **Respaldo nocturno generalizado**: `backup-verticales.sh` (04:17) respalda los
  3 volúmenes + espejo off-box. Pantheon del dashboard ve las 3 (upsert 3 filas).
- Pendiente de Fase 0 solo **voz** (decisión de la dueña).
- Gotcha: el puerto 8642 del gateway NO responde en este build de Hermes (ni en
  negocio, que funciona) → no usarlo como health check; la prueba real es
  `hermes send` o un mensaje de Telegram.
