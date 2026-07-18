# The Agent Server (daemon ↔ app contract)

Business OS is **AI-first**: the UI is a mirror, and every action is driven by *talking to
your agent*. That agent runs in a **daemon** (a long-lived process running the Claude Agent
SDK, or any process that speaks the contract below). The reference daemon is **ClaudeClaw**
(Node, port `:3099`), but any server that implements this HTTP contract works.

```
┌──────────────┐   app → daemon (think/act)    ┌─────────────────┐
│  Business OS │ ───────────────────────────►  │   Your daemon   │
│  (Next.js)   │                               │  (Agent SDK)    │
│              │ ◄───────────────────────────  │                 │
└──────────────┘   daemon → app (operate/notify)└─────────────────┘
```

## Authentication

A single shared bearer token, **`OPENCLAW_GATEWAY_TOKEN`**, protects the contract in **both
directions**. Set the same value in the app's `.env` and in your daemon's env. Generate one:

```bash
openssl rand -hex 32
```

The daemon points at the app via `MISSION_CONTROL_URL` / `MISSION_CONTROL_TOKEN` (its name for
the app base URL + the same token). The app points at the daemon via `CLAUDECLAW_URL`
(default `http://localhost:3099`).

---

## Direction 1 — App → Daemon (the app asks the agent to think/act)

The app never runs the model itself; it forwards to your daemon.

| App route (Next.js) | Daemon endpoint | Purpose |
|---|---|---|
| `src/app/api/chat/stream/route.ts` | `POST /chat/stream` | **Main chat turn. Streams SSE.** |
| `src/app/api/chat/route.ts` | `POST /chat`, `POST /newchat` | Non-streaming turn / new session |
| `src/app/api/chat/ack/route.ts` | `POST /chat/ack` | Client confirms receipt (daemon skips push) |
| `src/app/api/chat/answer/route.ts` | `POST /chat/answer` | Answer an interactive question (AskUserQuestion) |
| `src/app/api/chat/interrupt/route.ts` | `POST /chat/interrupt` | Interrupt a running turn |
| `src/app/api/chat/live/route.ts` | `POST /chat/live` | Voice HUD turn |
| `src/app/api/chat/sessions*` | `GET /sessions`, `GET /sessions/:id/messages` | SDK history |
| `src/app/api/chat/model(s)`, `.../efforts` | `GET /model`, `/models`, `/efforts` | Model/effort selector |
| `src/app/api/chat/tts/route.ts` | `POST /tts` | Default TTS |
| `src/app/api/cron*` | scheduler HTTP (`list/run/pause/resume`) | Cron monitor |

### `POST /chat/stream` (the important one)

Request body the app forwards to your daemon:

```jsonc
{
  "message": "string",
  "source": "string?",            // e.g. "web", "live"
  "turnId": "string?",
  "effort": "string?",            // low | medium | high | ...
  "chatSessionId": "string?",     // the app-side session (Supabase)
  "sdkSessionId": "string?",      // the daemon/SDK session to resume
  "audioUrl": "string?",
  "imageUrl": "string?",
  "context": "string?"            // extra context the app injects (see below)
}
```

- The Next.js route **authenticates the user** (Supabase) and checks the owner/admin role
  **in parallel** with parsing the body.
- If the chat session is the special **"Automatizaciones"** thread, the route injects recent
  cron intelligence (briefings/councils) as `context` for conversational continuity.
- It then forwards to `fetch(`${CLAUDECLAW_URL}/chat/stream`, { headers: { Authorization:
  `Bearer ${OPENCLAW_GATEWAY_TOKEN}` } })` and **proxies `upstream.body` straight to the
  browser** (no buffering). `maxDuration = 300` on Vercel; the daemon caps turns at 600s. If
  the Vercel function dies first, the turn is recovered via `POST /api/chat/complete` + push.
- The daemon interprets inline commands like `/model <name>` and `/effort <level>` without
  touching the real agent, replying with SSE events (`model_changed`, text).

**SSE event shape** the daemon must emit (`data: {json}\n\n`, ending with `data: [DONE]\n\n`).
At minimum:

| Event | Meaning |
|---|---|
| `text_delta` | incremental text |
| `result` | final text |
| `model_changed` | model/effort switched |
| `error` | turn failed |
| tool-call / TODO / interactive-question events | rendered live in chat |

The daemon should support **resume of an in-flight turn** by `sessionKey` (buffer active
streams so a reconnecting client replays the current turn), plus a periodic SSE keepalive so
proxies don't kill idle connections.

`POST /synthesize` is a separate one-shot SSE endpoint (no session persistence) used by
features like the **Artificial Brain** synthesis room.

---

## Direction 2 — Daemon → App (the agent operates the app / reports events)

This is how your agent **creates tasks, logs runs, writes calendar events, and pushes
notifications**. All calls carry `Authorization: Bearer ${OPENCLAW_GATEWAY_TOKEN}`.

| App endpoint | File | Purpose |
|---|---|---|
| `POST /api/openclaw/event` | `src/app/api/openclaw/event/route.ts` | Lifecycle & run bus (tasks, `conversations`, cron) |
| `POST /api/openclaw/action` | `src/app/api/openclaw/action/route.ts` | Agent tool to operate the board |
| `POST /api/chat/complete` | `src/app/api/chat/complete/route.ts` | Persist final message + push if client disconnected |
| `POST /api/calendar/agent` | `src/app/api/calendar/agent/route.ts` | Calendar pen (see `CALENDAR-AND-CRONS.md`) |
| `POST /api/notifications/send` | `src/app/api/notifications/send/route.ts` | Direct VAPID push to the owner's devices |

### `POST /api/openclaw/event` — the run bus

Validated with Zod (`openClawEventSchema` in `src/types/openclaw.ts`):

```ts
{
  runId: string,
  action: 'start' | 'progress' | 'end' | 'error' | 'document',
  sessionKey?: string,
  agentId?: string,           // your agent's id/name
  timestamp?: string,
  error?: string,
  prompt?: string,
  source?: string,            // 'business-os' | 'cron' | undefined (normal lifecycle)
  message?: string,
  response?: string,
  silent?: boolean,           // cron: no chat injection, no push, only stored in `conversations`
  usage?: { costUsd, inputTokens, outputTokens, durationMs, numTurns, model? },
  eventType?: string,         // e.g. 'tool:start'
  document?: { title, content, type, path? },
}
```

Routing inside the handler:

1. **Resolve the emitting agent** (`resolveAgent`): match `agentId` against `session_key`,
   then `name` (ilike), then `sessionKey`; fall back to the first agent created.
2. **`source === 'business-os'`** → `handleConversationEvent`: upsert/update the
   `conversations` table (does **not** touch the Kanban). `start` upserts by `run_id`
   (`pending`); `end` writes `response` + `done`; `error` → `error`.
3. **`source === 'cron'`** → `handleCronEvent`: upsert into `conversations` (with `usage`
   merged into the same row) + conditional injection into a special **"Automatizaciones"**
   chat session + web push (VAPID) with a deep-link — **only** if there's real output or an
   error **and** `silent` is not set. A `SILENT_CRON_JOBS` list never pushes except on error.
4. **No matching `source`** → normal **Kanban lifecycle**: `start` creates/reactivates a
   `task` (tag `openclaw`, `in_progress`) + assignee + marks the `agent` active; `progress`
   detects real coding tools (`edit/exec/bash/run/process` via `Using tool: (\S+)` on
   `eventType==='tool:start'`) and inserts `messages`/`activities`; `end` closes the task
   (`done`), frees the agent (`idle`), computes duration; `error` → task `todo`, agent
   `blocked`; `document` creates a `documents` row linked to a message.

Push uses `web-push` with VAPID (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`VAPID_EMAIL`), lazy-init, and prunes invalid subscriptions from `push_subscriptions`.

### `POST /api/openclaw/action` — operate the board

Discriminated union by `action` (all accept optional `agentId`). Response is always
`{ ok: boolean, ... }` (400 if the result carries an `error`):

- `create_task { title, description?, status?, tags?, assignTo? }` — inserts a `task`, resolves
  the assignee, creates `task_assignees`, pushes the linked user, logs an `activity`.
- `update_task { taskId, title?, description?, status?, tags? }` — partial update + activity.
- `query_tasks { status?, limit? }` — select ordered by `updated_at desc` (limit 1–50, default 20).
- `log_activity { type, message, taskId? }` — requires a resolvable `agentId`.
- `update_agent { targetAgent, status? }` — idle | active | blocked.
- `query_agents {}` — list all agents.
- `log_conversation { prompt, response, source? }` — manual `conversations` row (`run_id:
  manual-<ts>-<rand>`).

`status` values: `backlog | todo | in_progress | done | archived`.

---

## Wiring your own daemon (checklist)

1. Set `OPENCLAW_GATEWAY_TOKEN` to the same value in the app and the daemon.
2. Point the app at your daemon with `CLAUDECLAW_URL`.
3. Point your daemon at the app (`MISSION_CONTROL_URL` + token in its config).
4. Implement `POST /chat/stream` returning the SSE events above.
5. From your agent's tools, call `POST /api/openclaw/action` to operate the board, and
   `POST /api/openclaw/event` (source `business-os` or `cron`) to report runs.
6. (Optional) implement the scheduler HTTP surface (`list/run/pause/resume`) for the cron
   monitor — see `CALENDAR-AND-CRONS.md`.

> The reference implementation of these agent tools lives in the ClaudeClaw daemon. The app
> side (`/api/openclaw/*`, `/api/chat/*`, `/api/calendar/agent`) is fully implemented here and
> is the stable, documented surface — you only need to make your daemon speak to it.
