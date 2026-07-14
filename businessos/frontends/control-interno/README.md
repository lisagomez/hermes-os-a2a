# business-os-new

**Un sistema operativo de negocio agéntico, white-label.** Clónalo, conéctale TUS
credenciales y TU agente, y opera tu negocio hablándole a tu copiloto — la UI
existe para mirar, no para clickear.

> **Estado: alpha (jul 2026).** El build de Next.js pasa verde y no hay credenciales ni datos personales en el código. Lo que falta por endurecer antes de producción: la migración bootstrap (`supabase db push`) contra un proyecto Supabase **virgen** no está probada end-to-end, y el empaquetado desktop (Tauri `cargo build`) tampoco. Trátalo como base de referencia, no como producto llave-en-mano.

Stack: **Next.js (App Router) + Supabase + Tailwind v4 + Tauri** (desktop opcional).
Diseño: sistema **Titaniumorphism** (elevación tipo Stripe + glass tipo Apple + profundidad tipo Linear).

---

## Filosofía: AI-first (la UI es espejo, no cabina)

Toda superficie de esta app se opera **hablándole al agente**, no llenando
formularios. La regla de diseño es: *"¿puedo operar esto solo hablándole a mi
agente?"*. Si una acción exige aprender botones, está mal diseñada — ese trabajo
es del agente; la pantalla queda de espejo para ver y entender.

En la práctica:

- **Crear/editar tareas** → botón "Pedir al agente" (abre el chat con el draft listo) o díselo directo en el chat. El agente escribe vía `/api/openclaw/action`.
- **Agendar** → se lo pides al agente; él escribe por el bridge de calendario (Google + espejo local en un movimiento).
- **El board, el calendario y el canvas** → espejos. Los ves, los recorres; las acciones van por conversación.

## Módulos

| Módulo | Ruta | Qué hace |
|--------|------|----------|
| **Chat** | `/chat` | La cabina real: chat streaming (SSE) con tu agente/daemon, tool-calls visibles, TODOs en vivo, preguntas interactivas tocables, audio |
| **Command Center / Live (voz)** | `/chat` (tab Live) | HUD de voz: orbe, waveform, wake word ("Oye <tu agente>"), STT (Groq Whisper), TTS (daemon o ElevenLabs), push-to-talk con ESPACIO. `/command-center` redirige aquí |
| **Board** | `/board` | Kanban + lista de tareas con prioridades, labels, assignees, horizonte día/semana/mes |
| **Calendar** | `/calendar` | Calendario con espejo de Google Calendar + capa de crons proyectados sobre el timeline |
| **Canvas** | `/draw3` | Whiteboard colaborativo (motor v3): shapes, conectores, comentarios, presencia, API agéntica |
| **Ops** | `/ops` | Monitor operativo: eventos del daemon, sesiones de agentes, historial |
| **Cron** | Settings/Ops | Monitor del scheduler del daemon: lista, run/pause/resume, historial de corridas |
| **Notificaciones** | global | Web push (VAPID) — el agente te avisa al teléfono aunque la app esté cerrada |
| **Search** | `Cmd+K` | Búsqueda global: tareas, documentos, actividades, mensajes (con soporte offline) |
| **Conversations** | `/conversations` | Feed en vivo de las conversaciones de tus agentes |
| **Settings** | `/settings` | Perfil, push, atajos, tema, ops |
| **Artificial Brain** | `/segundo-cerebro` | Segundo cerebro: Neuronas (grafo de tu conocimiento curado + síntesis) + Acciones (actividad y costo de tus crons). Ver [`docs/ARTIFICIAL-BRAIN.md`](docs/ARTIFICIAL-BRAIN.md) |
| **Finanzas** | `/finanzas` | Finanzas personales AI-first: capturas HABLANDO con tu agente (API), la UI es espejo de solo lectura (net worth, burn, runway, cierres). Ver [`docs/FINANCES.md`](docs/FINANCES.md) |

Todo corre también **offline-first** en la desktop (Tauri): snapshot local +
sync al reconectar.

---

## Setup

### Requisitos

- Node.js 22+
- Un proyecto [Supabase](https://supabase.com) (free tier alcanza)
- Opcional: un daemon de agente (sección [Tu agente](#integración-el-agentedaemon-el-cerebro)), `gog` CLI para calendario, Rust/Tauri para la desktop

### Instalación

```bash
git clone <tu-fork> && cd business-os-new
npm install
cp .env.example .env.local   # y llénalo (ver abajo)
npm run dev                  # http://localhost:3000
```

Build de producción: `npm run build && npm start`. Deploy: cualquier host de
Next.js (Vercel funciona out-of-the-box; setea las mismas env vars).

### Base de datos (Supabase)

1. Crea un proyecto en Supabase y copia URL + anon key + service-role key al `.env.local`.
2. Aplica las migraciones (crean TODO el esquema: perfiles, tareas, chat, canvas, calendario, push):

```bash
npx supabase link --project-ref <tu-project-ref>
npx supabase db push
```

3. Crea tu usuario: arranca la app, entra a `/signup` con el email que pusiste
   en `OWNER_EMAIL`. El trigger `handle_new_user` crea tu profile; el rol lo
   define tu env (`OWNER_EMAIL` → owner).

**El modelo de datos es UN proyecto Supabase** (la BD de la app: tareas, chat,
canvas, calendario). Si tu negocio tiene su PROPIA base (ventas, usuarios,
métricas), el patrón de la casa es conectarla como **segundo proyecto
server-only**: crea un cliente con env vars propias usadas solo en API routes
(nunca en el cliente) y construye tus módulos de analytics encima. El core no
lo necesita.

### `.env.example`, variable por variable

El archivo [.env.example](.env.example) está comentado línea por línea. Resumen:

| Variable | Requerida | Qué es |
|----------|-----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL de tu proyecto Supabase (`https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Anon/publishable key (cliente browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service-role key (solo server; potencia las API routes) |
| `OWNER_EMAIL` | ✅ | Email del dueño (login gate + rol owner) |
| `ADMIN_EMAILS` | — | CSV de emails con rol admin |
| `NEXT_PUBLIC_OWNER_NAME` | — | Tu nombre (se usa en la desktop y el perfil local) |
| `NEXT_PUBLIC_AGENT_NAME` | — | Nombre de TU agente (header del chat, push, wake word). Default: `Agent` |
| `NEXT_PUBLIC_SITE_URL` | — | URL canónica del deploy (links de reset de password) |
| `CLAUDECLAW_URL` | — | URL del daemon del agente. Default `http://localhost:3099` |
| `OPENCLAW_GATEWAY_TOKEN` | — | Token compartido app ↔ daemon (ambas direcciones) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_EMAIL` | — | Web push. Genera el par con `npx web-push generate-vapid-keys` |
| `GROQ_API_KEY` | — | STT (voz → texto) del chat y el HUD Live |
| `ELEVENLABS_API_KEY` / `COMMAND_TTS_VOICE` / `COMMAND_TTS_MODEL` | — | TTS rápido del HUD Live (si no, usa el TTS del daemon) |
| `NEXOS_API_KEY` | — | Auto-título de conversaciones (opcional) |
| `GOOGLE_CALENDAR_ACCOUNT` | — | Cuenta Google principal del calendario (via `gog`) |
| `GOOGLE_CALENDAR_ACCOUNT_SECONDARY` | — | Cuenta secundaria opcional (ej. la de tu empresa) |
| `OBJECTIVE_CALENDAR_ID` | — | Calendario opcional de "objetivo del día" |
| `GOG_KEYRING_PASSWORD` | — | Password del keyring del `gog` CLI (requerido para ESCRIBIR eventos) |
| `OWNER_PROFILE_ID` | — | UUID de tu profile (attribution de escrituras del agente en canvas/sync) |
| `MEMORY_ROOT` | — | (Artificial Brain · Neuronas) Ruta a TU carpeta de markdown curado (con `.claude/memory`/`.claude/knowledge`). Vacío por default: la sala muestra estado vacío honesto |
| `FINANCE_TZ` | — | Zona horaria del "hoy" de finanzas (default `America/Mexico_City`) |
| `TODOIST_API_TOKEN` | — | Token de Todoist para el sync del board (script en `integrations/`) |

Sin las opcionales, la feature correspondiente se degrada con gracia (la app
sigue corriendo).

---

## Integración: el AGENTE/daemon (el cerebro)

El chat no llama a ningún LLM directamente: **proxya a un daemon** que corre en
tu máquina (o servidor) y que es dueño del loop agéntico. El de referencia está
construido con el **Claude Agent SDK** (un proceso Node que expone HTTP en
`:3099`), pero cualquier daemon que hable este contrato funciona:

### Contrato app → daemon (todas con `Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN`)

| Endpoint del daemon | Lo usa | Para |
|---------------------|--------|------|
| `POST /chat/stream` | `/api/chat/stream` | El turno principal. Body: `{message, turnId, chatSessionId, sdkSessionId, effort, audioUrl, imageUrl, context}`. Responde **SSE** (eventos de texto, tool-calls, TODOs, preguntas) |
| `POST /chat` y `POST /newchat` | `/api/chat` | Turno no-streaming / nueva sesión |
| `POST /chat/ack` | `/api/chat/ack` | El cliente confirma que recibió el turno (el daemon salta el push) |
| `POST /chat/answer` | `/api/chat/answer` | Responde una pregunta interactiva (AskUserQuestion) |
| `POST /chat/interrupt` | `/api/chat/interrupt` | Interrumpe el turno en curso |
| `POST /chat/live` | `/api/chat/live` | Turno del HUD de voz |
| `GET /sessions`, `GET /sessions/:id/messages` | `/api/chat/sessions*` | Historial de sesiones del SDK |
| `GET /model`, `GET /models`, `GET /efforts` | `/api/chat/*` | Selector de modelo/esfuerzo del header |
| `POST /tts` | `/api/chat/tts` | TTS default (ej. Kokoro local) |
| Scheduler HTTP (list/run/pause/resume) | `/api/cron*` | El monitor de crons |

### Contrato daemon → app (webhooks, mismo bearer)

| Endpoint de la app | Para |
|--------------------|------|
| `POST /api/openclaw/event` | Bus de eventos: lifecycle de agentes, actividades, watchdogs → tasks/activities/push |
| `POST /api/openclaw/action` | Herramienta del agente: `create_task`, `update_task`, `query_tasks`, `log_activity`… (así el agente OPERA el board) |
| `POST /api/chat/complete` | Fin de turno: persiste el mensaje y manda push si el cliente se desconectó a media respuesta |
| `POST /api/calendar/agent` | La pluma del calendario (ver abajo) |
| `POST /api/notifications/send` | Push directo a tus dispositivos |

### Conectar TU agente

1. Genera un token: `openssl rand -hex 32` → ponlo como `OPENCLAW_GATEWAY_TOKEN`
   en el `.env.local` de la app **y** en el env de tu daemon.
2. Apunta `CLAUDECLAW_URL` al host de tu daemon (localhost, LAN o túnel — para
   acceso móvil un túnel tipo ngrok/cloudflared hacia el daemon funciona).
3. Implementa como mínimo `POST /chat/stream` (SSE). Con eso ya tienes chat.
   Todo lo demás es progresivo: agrega `/sessions` para historial, el scheduler
   para crons, `POST /api/openclaw/action` del lado del agente para que pueda
   crear tareas.
4. Dale a tu agente el token y las URLs de los webhooks (paso 2 invertido) para
   que escriba tareas/eventos/push en la app.

---

## Integración: CALENDARIO (Google via `gog` + espejo)

### El modelo del espejo

```
   ESCRIBIR:  Agente/UI ──► /api/calendar/agent ──► gog CLI ──► Google Calendar
                                   │
                                   └──► espejo calendar_events (Supabase)  ← la app LEE de aquí
   Google ──► (sync) ──► espejo        Apple Calendar/iPhone se suscribe a Google
```

- **La app lee SIEMPRE del espejo** (`calendar_events` en Supabase): instantáneo, offline-friendly.
- **Las escrituras van por UNA pluma**: `/api/calendar/agent`, que escribe en
  Google **y** actualiza el espejo en el mismo movimiento. Nunca escribas a
  Google por fuera (dejarías el espejo stale hasta el siguiente sync).
- Apple Calendar / el widget del iPhone se suscriben a Google, así que heredan
  todo sin integración extra.

### Paso a paso

1. **Instala y autentica `gog`** (CLI de Google Workspace) en la máquina donde
   corre la app (para la desktop: tu Mac):
   ```bash
   gog auth add tu-email@gmail.com    # abre OAuth en el browser
   ```
   Setea `GOOGLE_CALENDAR_ACCOUNT=tu-email@gmail.com` y `GOG_KEYRING_PASSWORD`
   (el password del keyring local de gog) en `.env.local`.
   ⚠️ Si tu app OAuth de Google está en modo "Testing", el token muere cada 7
   días — pásala a "Producción".
2. **Sincroniza el espejo**: abre `/calendar` y dale sync, o
   ```bash
   python3 integrations/calendar/agent-event.py sync
   ```
3. **Escrituras del agente**: dale a tu agente el script
   [`integrations/calendar/agent-event.py`](integrations/calendar/agent-event.py)
   como SU pluma de calendario:
   ```bash
   export OPENCLAW_GATEWAY_TOKEN=...   # el mismo token compartido
   python3 integrations/calendar/agent-event.py create \
     --calendar primary --title "Deep Work" \
     --start 2026-08-01T09:00:00-06:00 --end 2026-08-01T13:00:00-06:00
   ```
   El script intenta primero la desktop (`:3218`) y luego el dev server
   (`:3000`); configúralo con `BUSINESS_OS_URL` si tu app vive en otra parte.
   Soporta `create/update/delete/query/sync`, eventos all-day, recurrencia
   (`--rrule`) y link a tareas (`--task-id` → el evento aparece ligado en el board).

---

## Integración: TODOIST (sync bidireccional gated por label)

### El modelo

- Vives tus tareas donde quieras (Todoist en el teléfono, el board en la app):
  **un label es el interruptor de sync**. Solo las tareas con el label
  (`TODOIST_SYNC_LABEL`, default `business-os`) cruzan de un lado al otro.
- Board → Todoist: título, prioridad, labels, vencimiento. Todoist → Board:
  igual, asignadas a tu profile. **Completar en cualquier lado cierra el otro.**
- El link es doble: `tasks.todoist_id` en la BD + marcador `mc:<uuid>` en la
  descripción del task de Todoist.

### Paso a paso

1. Token de Todoist: *Settings → Integrations → Developer → API token* →
   `TODOIST_API_TOKEN`.
2. Prueba una corrida manual:
   ```bash
   export TODOIST_API_TOKEN=... NEXT_PUBLIC_SUPABASE_URL=... \
          SUPABASE_SERVICE_ROLE_KEY=... OWNER_PROFILE_ID=...
   python3 integrations/todoist/sync.py
   # → {"mc_to_td_created": 1, "td_to_mc_created": 0, ...}
   ```
3. Déjalo corriendo cada 5 min: edita e instala
   [`integrations/todoist/com.businessos.todoist-sync.plist`](integrations/todoist/com.businessos.todoist-sync.plist)
   (launchd, macOS) o el cron equivalente en Linux (instrucciones dentro del archivo).
4. Ponle el label a una tarea (en cualquiera de los dos lados) y en ≤5 min está
   en el otro. `due_at` en el board = vencimiento en Todoist y viceversa.

---

## Documentación profunda (`docs/`)

Guías por integración, con contratos y ejemplos:

- [`docs/AGENT-SERVER.md`](docs/AGENT-SERVER.md) — el contrato HTTP app ↔ agente/daemon (chat SSE, `/api/openclaw/*`, push).
- [`docs/CALENDAR-AND-CRONS.md`](docs/CALENDAR-AND-CRONS.md) — calendario (espejo Google + `gog`) y el monitor de crons / Cron Lens.
- [`docs/TODOIST.md`](docs/TODOIST.md) — sync bidireccional del board con Todoist, gated por label.
- [`docs/CANVAS.md`](docs/CANVAS.md) — el canvas `/draw3` y su API agéntica de ops (cómo un agente dibuja/edita).
- [`docs/ARTIFICIAL-BRAIN.md`](docs/ARTIFICIAL-BRAIN.md) — el segundo cerebro: las salas, `MEMORY_ROOT`, y el contrato de Plasticidad/Metabolismo.
- [`docs/FINANCES.md`](docs/FINANCES.md) — finanzas personales: schema, contrato del API (`add_movement`/`add_snapshot`/`add_recurring`) y el loop operativo para tu agente.

## Desktop (Tauri, opcional)

La desktop empaqueta su PROPIO Next.js standalone (no carga tu deploy web) y
corre offline-first:

```bash
npm run desktop:install   # build + instala business-os-new.app en ~/Applications (macOS)
npm run desktop:dev       # desarrollo
```

- La desktop no tiene sesión de browser: se auto-identifica como el owner
  (`NEXT_PUBLIC_OWNER_NAME`/`OWNER_EMAIL`) vía el bypass local
  (`BUSINESS_OS_DESKTOP_EMBED=1`, solo localhost). Los datos van por API routes
  server-side — por eso el `SUPABASE_SERVICE_ROLE_KEY` vive en el `.env.local`
  que la desktop lee al arrancar.
- Si cambias código: la `.app` instalada corre un build viejo hasta que
  reinstalas (`npm run desktop:install`). Cerrar/abrir NO la actualiza.

## PWA / móvil

La app es instalable como PWA (manifest + service worker incluidos). Con las
VAPID keys configuradas, el agente te manda push al teléfono (iOS: agrega la
app a la pantalla de inicio primero). Para usar el chat desde el teléfono
contra un daemon en tu máquina, apunta `CLAUDECLAW_URL` a un túnel.

## Comandos

```bash
npm run dev              # dev server (Turbopack)
npm run build            # build de producción
npm run typecheck        # TypeScript
npm run desktop:install  # desktop app (macOS)
```

## Licencia / origen

White-label derivado de un dashboard operativo real. Cámbiale el nombre, el
logo (`Bot` de lucide — busca `BrandMark`) y hazlo tuyo.
