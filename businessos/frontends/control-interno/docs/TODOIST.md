# Todoist sync

Bidirectional sync between the **Board** (the `tasks` table) and **Todoist**, **gated by a
label** — not by project, not by person. Only tasks carrying the gate label cross between the
two systems. It's a single ~270-line Python file with no external deps (`urllib` only),
idempotent (every run reconciles full state), meant to run every few minutes via launchd
(macOS) or cron (Linux).

Script: `integrations/todoist/sync.py` · launchd plist: `integrations/todoist/com.businessos.todoist-sync.plist`.

## The gate

- `TODOIST_SYNC_LABEL` (default `business-os`) and `TODOIST_PROJECT_NAME` (default `Business OS`).
- A task syncs **only** if it has the gate label on either side. Without it, the task stays in
  its own system and the script ignores it.

> **HARD RULE:** on the Board side the gate is the **M2M join** `task_labels (task_id, label_id)`
> against the `labels` table (label name = `TODOIST_SYNC_LABEL`), **not** a loose `tags` array.
> Putting the name in `tags` does **not** enable sync — you must insert the `task_labels` row
> linking the task to the real label. (This bit us once; documented so it doesn't bite you.)

## Field mapping

| Board (`tasks`) | Todoist | Notes |
|---|---|---|
| `title` | `content` | |
| priority 1–4 | priority 1–4 | same meaning (4 = most urgent), clamped |
| `due_at` (ISO) | `due.datetime` / `due.date` | date-only → assumes noon `T12:00:00`. `due_at` also drives the calendar due-layer |
| labels (set) | labels (set) | always includes the gate label |

## The link (belt & suspenders)

1. Column `tasks.todoist_id`.
2. A text marker `mc:<uuid>` in the Todoist task description, so if the column is lost the
   script re-derives the link by regex `mc:([0-9a-f-]{36})`.

## Reconciliation flow (`main()`)

1. Resolve the Todoist `PROJECT_ID` (creates `Business OS` if missing) and the Board
   `BOS_LABEL_ID` (creates the label if missing, color `#8C27F1`).
2. Fetch `mc_tasks` = all Board tasks with the gate label (via `task_labels`).
3. Fetch `td_tasks` = all active Todoist tasks, filtered **client-side** by label (the API's
   `?filter=@label` is unreliable — page through everything with `cursor` and filter in Python).
4. **Board → Todoist:** for each active board task (`todo/in_progress/review/backlog`) with no
   `todoist_id`, create it (or re-link via the `mc:` marker); if already linked and still
   active, update title/priority/labels/due. If the board task went `done`/`archived` and its
   Todoist pair is still open, close it there.
5. **Todoist → Board:** for each Todoist task with the label and no board link, create it
   (`status: todo`, assigned to `OWNER_PROFILE_ID`, all labels + gate) and write the
   `mc:<newid>` marker back into the Todoist description. If already linked and active, update
   title/priority/due from Todoist.
6. **Completions Todoist → Board:** for each active board task with a `todoist_id` that no
   longer appears in the active list, GET that Todoist task to distinguish: (a) 404 or
   `checked`/`is_deleted` → mark `done` on the Board; (b) still exists but lost the gate label
   → clear `todoist_id` (stops syncing, leaves state untouched).
7. Prints a JSON log: `mc_to_td_created/updated/closed`, `td_to_mc_created/updated`,
   `completed_td_to_mc`, `unlinked`.

Business rule: **completing on either side closes the other.** No master system — symmetric
reconciliation gated by the label.

## Env vars

Required (the script exits early if missing):

- `TODOIST_API_TOKEN` — Todoist → Settings → Integrations → Developer → API token.
- `NEXT_PUBLIC_SUPABASE_URL` — the app's Supabase project (the script hits PostgREST directly).
- `SUPABASE_SERVICE_ROLE_KEY` — server-side key, never in the client.

Optional:

- `OWNER_PROFILE_ID` — UUID that new tasks-from-Todoist get assigned to (recommended).
- `TODOIST_SYNC_LABEL` (default `business-os`), `TODOIST_PROJECT_NAME` (default `Business OS`).

## Install (launchd, macOS)

`com.businessos.todoist-sync.plist` runs `python3 integrations/todoist/sync.py` every 300s
(`StartInterval`), `RunAtLoad=true`, logs to `/tmp/business-os-todoist-sync.log`.

```bash
# 1. edit paths + env vars inside the plist
cp integrations/todoist/com.businessos.todoist-sync.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.businessos.todoist-sync.plist
```

Linux (cron): `*/5 * * * * cd <repo> && python3 integrations/todoist/sync.py`

Manual test: export the env vars and run `python3 integrations/todoist/sync.py` — it should
print the JSON log (`{"mc_to_td_created": 1, ...}`).
