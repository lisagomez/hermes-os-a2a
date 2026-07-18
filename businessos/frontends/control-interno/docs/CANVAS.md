# Canvas v3 (`/draw3`) — the agentic whiteboard

A collaborative whiteboard with its own engine **and a full agentic API** so your agent can
draw/edit programmatically with the *same semantics* the human frontend uses. This is the
largest module in the app and the one your agent will drive most for "show me a diagram / map
this out."

## Data model

- Table `draw` — key columns: `page_id` (PK), `user_id` (owner/attribution), `name`,
  `page_elements` (JSONB: `{ schemaVersion, elements[], files{}, theme, camera{x,y,scale} }`),
  `agent_version` (optimistic concurrency counter), `is_deleted`, `folder_id`,
  `thumbnail_url`, `settings` (app-level; today only `htmlUrl` for "HTML sheet" pages that
  render an external iframe instead of the native canvas).
- Table `draw_ops_log` — audit: every applied op batch inserts `{ page_id, actor, actor_id,
  expected_version, resulting_version, ops }` (best-effort; a failure here doesn't break the
  request).

## Authentication (`src/lib/draw3-auth.ts`)

`authenticateDraw3` accepts **any** of three, in order:

1. **Desktop bypass** — localhost + `BUSINESS_OS_DESKTOP_EMBED` (no cookies, fast).
2. **Agent** — `Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN`.
3. **Authenticated web** — Supabase session cookie.

## Endpoint map

| Method | Route | Use |
|---|---|---|
| `POST` | `/api/draw3` | Create a new v3 page |
| `GET` | `/api/draw3` | List pages (≤500, `updated_at desc`, `is_deleted=false`; `?source=local` for the local-first cache) |
| `GET`/`PUT` | `/api/draw3/:id/state` | Read normalized state / save a full editor snapshot |
| `POST` | `/api/draw3/:id/ops` | **Apply agentic ops (the main edit method)** |
| `POST` | `/api/draw3/:id/auto-layout` | Quick arrange (dagre/grid/stack) |
| `POST` | `/api/draw3/:id/assets` | Resolve/upload an image without inserting it yet |
| — | `/api/draw3/:id/thumbnail`, `/folders` | Page thumbnail, folders |

Agent calls require `Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN` + `Content-Type: application/json`.

## Create a page — `POST /api/draw3`

Body: `{ name?, owner?, theme?('dark'|'light'|'mono'|'system'), folderId? }`. `owner` defaults
to `OWNER_PROFILE_ID` (single-tenant installs can run with no owner). Response:

```jsonc
{ "ok": true, "page_id": "...", "url": ".../draw3/<pageId>",
  "agent_version": 0, "schema_version": 3, "folder_id": null }
```

## Read state — `GET /api/draw3/:id/state`

Returns **normalized** state (not the raw JSONB):

```jsonc
{ "ok": true, "version": "draw3", "page_id": "...", "name": "...",
  "agent_version": 7, "schema_version": 3, "element_count": 12,
  "bounding_box": { "minX": 0, "minY": 0, "maxX": 800, "maxY": 600, "width": 800, "height": 600 },
  "elements": [ /* ... */ ], "files": {}, "theme": "dark",
  "camera": { "x": 0, "y": 0, "zoom": 1, "scale": 1 },   // `zoom` is canonical for agents
  "page_settings": null, "source": "cloud" }
```

If Supabase is unreachable it falls back to a local cache; a genuinely missing/deleted page
returns an honest `404` (never stale cache of a deleted page). The `PUT` on the same endpoint is
the editor's full-snapshot save (`{ name, page_elements }`), using the same auth + service client.

## Apply ops — `POST /api/draw3/:id/ops` (the main method)

Body: `{ actor?('human'|'agent'|'system'), actorId?, expectedAgentVersion?, ops: Op[] }`.

Flow: validate **every** op first (`validateOps` — one bad op rejects the **whole batch**,
nothing applies half-way) → read current state → if `expectedAgentVersion` ≠ current
`agent_version`, return **`409`** with `{ expected_agent_version, current_agent_version }`
(optimistic concurrency: re-read and retry) → normalize → resolve local image paths in
`insertImage` to real URLs (auto-downscale) → apply via the `applyOps` reducer → write
`page_elements` + increment `agent_version` → insert `draw_ops_log` (best-effort).

Response:

```jsonc
{ "ok": true, "page_id": "...", "previous_agent_version": 7, "agent_version": 8,
  "applied": [ /* op ids */ ], "errors": [], "total_elements": 13,
  "changed_files": [], "bounding_box": { /* ... */ },
  "camera": { "x": 0, "y": 0, "zoom": 1, "scale": 1 }, "url": ".../draw3/<id>" }
```

### Op catalog (`src/features/draw3/ops/contract.ts`)

- **Create:** `add` (full `CanvasElement`), `insertText`, `insertSticky`, `insertImage`,
  `insertMermaid`, `insertCode`, `insertTable`.
- **Edit:** `update` (patch, can't change id/type), `delete` (by ids), `move` (delta),
  `moveTo` (absolute), `resize`, `rotate` (radians).
- **Z-order:** `bringForward`, `sendBackward`, `bringToFront`, `sendToBack`.
- **Relations:** `connect` / `disconnect` (connectors), `group` / `ungroup`,
  `createFrame` / `setFrame`.
- **Layout:** `align`, `distribute`, `arrange` (`dagre-tb/lr/bt/rl`, `grid`,
  `stack-vertical/horizontal`, `elk-radial/force/layered`; options `{ rankSep, nodeSep, cols,
  gap, padding }`).
- **Meta:** `addComment`, `setTheme`, `setCamera`, `fitView` (hint only), `renamePage`.

### Safe agent pattern

1. `GET /state`.
2. Check `locked` on human elements before touching them.
3. Compute coordinates from `bounding_box`.
4. Send ops **with** `expectedAgentVersion`.
5. On `409`, re-read and retry.
6. If `errors.length > 0`, report.
7. `GET /state` again to confirm.

## Known limits

- `fitView` via ops is a hint; the frontend also computes its own visual fit.
- Selection/hover/editing are UI state, never serialized as ops.
- The frontend "eraser" = compute impacted ids and send a `delete`.
- Timeline/Kanban/Doc are visual presets over `table`/`text` elements, not distinct op types.

## Source of truth

`src/app/api/draw3/route.ts`, `src/app/api/draw3/[id]/{state,ops,auto-layout,assets}/route.ts`,
`src/features/draw3/ops/{contract,apply,validate}.ts`,
`src/features/draw3/elements/{types,factories}.ts`, `src/lib/draw3-auth.ts`.
