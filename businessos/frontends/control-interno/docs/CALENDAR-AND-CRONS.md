# Calendar + Crons

## The model: "one mirror, one pen"

The app **always reads** from a Supabase mirror (`calendar_events`). **Every write** goes
through a single server-side bridge that writes to **Google Calendar** (via the `gog` CLI)
**and** upserts the mirror in the same move. Apple Calendar / the iPhone widget subscribe to
Google, so they inherit everything with no extra integration.

```
WRITE:  Agent/UI ──► POST /api/calendar/agent ──► gog CLI ──► Google Calendar
                          │
                          └──► upsert mirror `calendar_events` (Supabase)  ← the app ALWAYS reads here
READ:   Google ──► (sync) ──► mirror
```

Three read layers (fastest → freshest):
1. Local cache per surface (Tauri store / IndexedDB + offline queue) — instant.
2. Supabase mirror `calendar_events` — fast fallback; the **only** source on Vercel (no `gog`).
3. Google live via `gog` server-side — the **Sync** button and **every write**.

## The bridge: `POST /api/calendar/agent`

File: `src/app/api/calendar/agent/route.ts`. Auth: `Authorization: Bearer
$OPENCLAW_GATEWAY_TOKEN` (500 if unset, 401 if mismatch).

- **`GET`** — quick read via querystring `?from&to&calendarId=...` (repeatable) → returns
  `{ events, sources, syncHealth }` from the mirror.
- **`POST`** — discriminated union by `action`:
  - `query_events { from, to, calendarIds? }`
  - `create_event { accountEmail, googleCalendarId, title, start, end, allDay?, description?,
    location?, attendees?, recurrence?(RRULE[]), reminders?, colorId?, visibility?,
    transparency?, sendUpdates?, withMeet?, taskId? }` → writes Google **and** mirror + logs
    an activity.
  - `update_event` — same, plus `eventId`, `targetCalendarId?`, `recurrenceScope?('single' |
    'future' | 'all')`, `originalStart?`.
  - `delete_event { accountEmail, googleCalendarId, eventId, recurrenceScope?, originalStart?,
    sendUpdates? }`.
  - `sync_events { from, to, calendarIds? }` → forces a live Google read, returns
    `syncHealth: { state: 'fresh', lastSyncedAt, message }`.

The "write Google + upsert mirror in one move" core lives in `src/lib/calendar/gog-bridge.ts`
(invokes `gog` server-side); read-only mirror access is in `src/lib/calendar/mirror.ts`.

## The CLI the "pen" uses

`integrations/calendar/agent-event.py` — the agent or a human invokes this. Config via env:

- `BUSINESS_OS_URL` — comma-separated bases (default `http://localhost:3218,http://localhost:3000`;
  tries the desktop Tauri app first, then the dev server).
- `OPENCLAW_GATEWAY_TOKEN`, `GOOGLE_CALENDAR_ACCOUNT`.

Subcommands:

```bash
python3 integrations/calendar/agent-event.py create \
  --calendar <googleCalendarId> --title "..." --start <ISO> --end <ISO> \
  [--account <email>] [--description ...] [--location ...] [--all-day] [--task-id <uuid>] [--rrule ...]
python3 integrations/calendar/agent-event.py update --calendar <id> --event-id <id> [--title ...] [--start ...] ...
python3 integrations/calendar/agent-event.py delete --calendar <id> --event-id <id>
python3 integrations/calendar/agent-event.py query  --from <ISO> --to <ISO> [--calendar <id> ...]
python3 integrations/calendar/agent-event.py sync   [--from <ISO>] [--to <ISO>]   # default -7 / +45 days
```

> **HARD RULE:** never use `gog calendar create` directly for events — it leaves the mirror
> stale until the next sync. Quick reads (`gog cal events`) can hit Google directly because
> they don't mutate state.

`--task-id <uuid>` links the event to a board task: it writes `mc_task_id` as a Google
extended property **and** upserts a `task_calendar_links` row. The UI renders it as a task block.

## Env vars (calendar)

| Var | Purpose |
|---|---|
| `GOOGLE_CALENDAR_ACCOUNT` | primary Google account |
| `GOOGLE_CALENDAR_ACCOUNT_SECONDARY` | optional second account |
| `OBJECTIVE_CALENDAR_ID` | optional "objective of the day" calendar |
| `GOG_KEYRING_PASSWORD` | password for `gog`'s local keyring — **required to WRITE**; reads still work from the mirror |
| `OWNER_PROFILE_ID` | attribution for agentic writes |

**Gotcha:** if the Google OAuth app is in "Testing" mode, the `gog` token expires every 7
days. Symptom: reads (`query`) keep working (mirror), but `create` fails with HTTP 500 /
`invalid_grant`. Only the owner can re-auth (`gog auth add <email>`). Fix for good: move the
OAuth app from "Testing" to "Production".

---

## Crons (the scheduler + the Cron Lens)

Your daemon owns a scheduler and exposes it over HTTP so the app can **monitor** it (not run
it). The app's `/ops?view=cron` and the calendar's **Cron Lens** read from this.

### Scheduler HTTP surface (the daemon implements)

| Method | Purpose |
|---|---|
| `GET /schedule` | list jobs: `{ id, schedule, next_run, last_run, status }` + `tz` |
| `POST /schedule/:id/run` | run now |
| `POST /schedule/:id/pause` / `.../resume` | pause / resume |

`tz` is the timezone the daemon interprets cron expressions in (`CRON_TZ` env on the daemon).
The Cron Lens projects upcoming runs using that `tz`.

### How cron runs show up in the app

When a cron runs, your daemon posts the result to `POST /api/openclaw/event` with
`source: 'cron'` (see `AGENT-SERVER.md`). That row lands in `conversations` (with `usage`),
and — unless `silent` — is injected into the "Automatizaciones" chat thread and pushed to the
owner's phone with a deep-link. This is what feeds the **Acciones** room of the Artificial
Brain and the **Cron History** panel.

### The Cron Lens

A toggle in the Calendar header. When on, the grid stops showing the normal calendar and shows
**only agent activity over a full 24h**, with a side rail of color groups (rename inline),
per-job/per-group toggles, ordering, and "paused hidden" by default.

> **HARD RULE (scheduler migrations):** rows named `v*-migrated` (empty prompt) are **migration
> flags** — never delete them. Without the flag the daemon can re-run historical destructive
> migrations on boot. The Cron Lens filters them out of the UI.

### Mirror freshness

A dedicated cron (e.g. every 3h) runs a script that fires `sync_events` (−7 / +45 days) against
the desktop (`3218`) or dev (`3000`) server. It's silent; if both servers are down the mirror
stays stale until the next attempt. The Calendar UI also auto-refreshes if its local data is
older than ~6h, and the **Sync** button forces a live Google read.
