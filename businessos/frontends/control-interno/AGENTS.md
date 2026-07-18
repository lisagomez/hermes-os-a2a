# AGENTS.md — operating manual for the AI working this repo

You (the AI agent reading this) are the **operator** of this app. The human looks
at the screens; you do the work. This file tells you how the repo is wired, how
to set it up for your human from zero, and how to operate every module through
its API instead of the UI.

## What this is

**business-os-new** is a white-label, AI-first business operating system:
Next.js (App Router) + Supabase + Tailwind v4 + optional Tauri desktop. Design
rule of the house: **the UI is a mirror, the agent is the operator.** If your
human asks "what does this button do?", the right answer is "tell me what you
want and I'll do it."

The app does NOT call any LLM itself. The chat proxies to a **daemon** (any HTTP
server implementing the contract in `docs/AGENT-SERVER.md`). You may BE that
daemon, or you may operate the app directly through its API routes — both work.

## Repo map

```
src/app/(main)/        routes (one folder per surface)
src/app/api/           API routes — every agent-facing contract lives here
src/features/<name>/   feature code (components/hooks/lib/types per feature)
src/lib/               supabase clients (server/service/client), auth-utils, permissions
src/shared/            cross-feature components, hooks, stores
supabase/migrations/   the FULL schema, in order (base → canvas → calendar → todoist → finances)
integrations/          scripts that run OUTSIDE the app (todoist sync, calendar pen)
docs/                  deep guides per integration — READ THESE before touching a module
scripts/               desktop build + canvas verification tooling
```

Surfaces: `/chat` (+ Live voice tab), `/board`, `/calendar`, `/draw3` (canvas),
`/segundo-cerebro` (Artificial Brain), `/finanzas`, `/ops`, `/conversations`,
`/settings`. `/command-center` redirects to `/chat?tab=live`.

## First-run setup (you can drive all of this)

1. `npm install`, then `cp .env.example .env.local` and fill it — every variable
   is commented inline; the README has a table. Minimum viable: the 3 Supabase
   vars + `OWNER_EMAIL`.
2. Database: `npx supabase link --project-ref <ref>` then `npx supabase db push`
   (applies `supabase/migrations/` in order — profiles, tasks, chat, canvas,
   calendar, todoist link, finances).
3. Start `npm run dev`, have your human sign up at `/signup` with `OWNER_EMAIL`
   (allowlist-gated; the `handle_new_user` trigger creates the profile with the
   owner role).
4. Optional wiring, each with its own guide:
   - Your daemon (chat brain): `docs/AGENT-SERVER.md` — implement `POST /chat/stream`
     (SSE) minimum; share `OPENCLAW_GATEWAY_TOKEN` both directions.
   - Google Calendar: `docs/CALENDAR-AND-CRONS.md` — `gog` CLI + the single-pen
     script `integrations/calendar/agent-event.py`.
   - Todoist: `docs/TODOIST.md` — label-gated two-way sync, `integrations/todoist/sync.py`
     on a 5-min launchd/cron.
   - Artificial Brain: `docs/ARTIFICIAL-BRAIN.md` — point `MEMORY_ROOT` at the
     human's curated markdown (`.claude/memory`, `.claude/knowledge`).
   - Finances: `docs/FINANCES.md` — you capture by POSTing; the page just mirrors.

## How YOU operate each module (API, not UI)

All server-to-server calls authenticate with `Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN`.

| You want to | Do this |
|---|---|
| Create/update/query tasks | `POST /api/openclaw/action` with `{action: "create_task" \| "update_task" \| "query_tasks" \| "log_activity", ...}` (contract in `docs/AGENT-SERVER.md`) |
| Put something on the calendar | `python3 integrations/calendar/agent-event.py create --calendar primary --title ... --start ... --end ...` — NEVER write to Google directly; this pen updates Google + the local mirror in one move |
| Record money in/out | `POST /api/finanzas` with `{action: "add_movement", movement: {...}}` (also `add_snapshot` for monthly closes, `add_recurring` for fixed charges) — `docs/FINANCES.md` |
| Draw/edit on the canvas | `POST /api/draw3/<pageId>/ops` with an ops batch (create/update/delete shapes, connectors) using optimistic concurrency via `agent_version` — `docs/CANVAS.md` |
| Push a notification to the human's devices | `POST /api/notifications/send` |
| Emit lifecycle/activity events | `POST /api/openclaw/event` |
| Answer in the chat | You ARE the daemon side: implement/serve `POST /chat/stream` (SSE) per `docs/AGENT-SERVER.md` |
| Read/synthesize the human's knowledge | Brain APIs under `/api/cerebro/*` (graph, synthesis) — they read from `MEMORY_ROOT` |

Sync tasks to the human's phone: add the Todoist label (`TODOIST_SYNC_LABEL`,
default `business-os`) — only labeled tasks cross. Completing on either side
closes the other.

## Conventions (follow these when editing code)

- TypeScript strict, no `any` unless the surrounding code already does it.
- Feature-folder architecture: UI in `src/features/<x>/components`, data hooks in
  `hooks`, pure logic in `lib`, types in `types`. Routes in `src/app/(main)` are
  thin wrappers that import from features.
- Data access: browser uses the anon client (RLS-limited); anything owner-scoped
  or privileged goes through an API route using `createServiceClient()`. The
  desktop (Tauri) build has NO browser session — owner data must ALWAYS flow
  through server-side API routes, never `supabase.from()` in the client.
- Roles: `owner` / `admin` / `member`, gated per route in `src/lib/permissions.ts`.
  New surface = add its route there AND to `NAV_LINKS` in
  `src/shared/components/SidebarNav.tsx`.
- Migrations are append-only: new SQL file with a later timestamp, idempotent
  (`IF NOT EXISTS`, guarded policies), never edit an applied one.
- Spanish is the product's first language (UI strings); code and docs comments
  may be either. Keep whichever the file already uses.
- Verify with `npm run typecheck` and `npm run build` before declaring done.
- Desktop caveat: web deploy and desktop app are SEPARATE builds. After changing
  code, the installed `.app` stays old until `npm run desktop:install`.

## Known alpha gaps (be honest about these)

- `supabase db push` against a virgin project is not yet verified end-to-end.
- Tauri desktop packaging (`cargo build`) untested on a clean machine.
- Brain rooms Plasticidad/Metabolismo are documented (schema + write contract in
  `docs/ARTIFICIAL-BRAIN.md`) but need YOU to implement the nightly crons that
  feed them.
- Finances aggregates use MXN as base currency (documented in `docs/FINANCES.md`).
