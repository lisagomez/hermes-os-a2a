# AGENTS.md — Vertical Personal

Reglas operativas del contenedor `hermes-personal`. Lo de persona y tono está en
SOUL.md; hechos estables (preferencias, recurrentes) en MEMORY.md. Aquí va la
mecánica.

## Rutas y montajes
- Bóveda Obsidian montada en `/opt/data/obsidian` (lectura/escritura).
- Capturas de voz y notas se guardan como `.md` en
  `/opt/data/obsidian/inbox/AAAA-MM-DD-HHMM.md` con frontmatter:
  `---\nfecha:\norigen: telegram-voz | telegram-texto\ntags: []\n---`.

## Presupuesto de tokens (registro)
- **TÚ no escribes a `token_usage` ni consultas Supabase.** El registro de tu gasto
  lo hace un job de confianza del host (`businessos/ingest-token-usage.py`) leyendo tus
  logs; no tienes el `service_role` (Hermes scrubbea los secretos por diseño). No intentes
  acceder a `.env` ni a Supabase: fallará.
- No defines ni vigilas el presupuesto (eso lo hace negocio, que lee el snapshot que el
  job deja preparado).

## Voz
- Entrada: las notas de voz de Telegram se transcriben automáticamente; trata la
  transcripción como el mensaje del usuario.
- Salida hablada (TTS): actívala SOLO cuando el usuario pida "respóndeme en voz"
  o para la entrega del digest diario. No conviertas a voz cada respuesta de
  chat (la salida TTS es lo caro).

## Routing de modelos (control de costo)
- Tareas ligeras (capturar nota, poner recordatorio, formatear, clasificar) →
  modelo barato (Haiku o el gratuito configurado).
- Solo sube a Sonnet si la tarea pide razonamiento real (planear la semana,
  redactar algo con criterio).

## Crons
> Solo el "dreaming" está agendado de verdad (`hermes cron list`, 2026-07-12). No
> afirmes haber hecho una rutina sin comprobarlo.

- `dreaming-personal` — **02:00 diario** (agendado `0 8 * * *`: el contenedor corre
  en UTC y tú entregas en CST). Revisa lo capturado el día, consolida en MEMORY.md,
  archiva notas de `inbox/` a su carpeta. No manda mensaje salvo que haya algo que
  requiera decisión de Elisa.
- ⏸️ *Digest matutino 8:00 (agenda del día + recordatorios): **NO agendado** — decisión
  pendiente de la dueña. No lo prometas ni digas que lo mandaste.*
- Respaldo nocturno: **NO es tuyo, no lo hagas**. Un job de confianza del host
  (`backup-verticales.sh`, cron 04:17) respalda los volúmenes de las 3 verticales
  al repo privado `hermes-os-a2a-backups`. Tu volumen es `0700`/uid-10000: no
  puedes leerlo y no debes intentarlo. Si te preguntan por el respaldo, explica
  esto; nunca ofrezcas hacer commit/push de tu memoria.

## Límites
- Pon siempre tope de palabras en los crons; la salida es 5× más cara que la
  entrada.
- No toques los volúmenes de las otras verticales.
