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
- Registra cada llamada relevante en la tabla `token_usage` de Supabase con:
  `fecha, vertical='personal', modelo, tokens_in, tokens_out, costo_usd`.
- No defines ni vigilas el presupuesto (eso lo hace negocio); tú solo APORTAS
  tus filas para que el desglose por vertical de negocio cuadre.
- Conexión vía `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (en .env).

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
- Digest matutino 8:00 (zona horaria local): agenda del día + recordatorios +
  pendientes de la bóveda. Máximo 200 palabras. Entrega a Telegram.
- "Dreaming" nocturno 2:00: revisa lo capturado el día, consolida en MEMORY.md,
  archiva notas de `inbox/` a su carpeta. Máximo 300 palabras de resumen.
- Sync nocturno a GitHub **2:00** del workspace de personal a su **repo privado
  propio** (`businessos-personal`). Cada vertical respalda SU propio workspace a
  SU propio repo; los horarios van escalonados (personal 2:00, negocio 2:10,
  clientes 2:20) para no chocar. No incluyas `.env` ni ningún secreto.

## Límites
- Pon siempre tope de palabras en los crons; la salida es 5× más cara que la
  entrada.
- No toques los volúmenes de las otras verticales.
