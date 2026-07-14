# The Artificial Brain (`/segundo-cerebro`)

A "second brain" surface where your system looks at itself, organized into
**rooms** — each room answers one question the owner has. It's the exocortex made
visible: what it KNOWS, what it OPERATES, how it SHAPES you, and how it
SELF-REGULATES. Owner-only (`/segundo-cerebro` is gated to the `owner` role).

Two rooms ship wired and working. Two more are documented as a pattern because
they need **your own nightly "organ"** (a cron your agent runs) to write their
data — shipping them as empty UI would be dishonest.

| Room | Verb | Ships? | Data source |
|---|---|---|---|
| **Neuronas** | KNOWS | ✅ wired | your curated markdown at `MEMORY_ROOT` |
| **Acciones** | OPERATES | ✅ wired | cron runs your daemon posts (`conversations`) |
| **Plasticidad** | SHAPES | 📄 documented | tables your nightly organ writes (below) |
| **Metabolismo** | SELF-REGULATES | 📄 documented | tables your nightly organ writes (below) |

---

## Neuronas (KNOWS) — the knowledge atlas

A 2D constellation of your **curated** markdown. It reads, server-side and
**read-only**, the folder in your `MEMORY_ROOT` env var — specifically
`.claude/memory/{user,project,feedback,reference}/*.md` and
`.claude/knowledge/{concepts,connections}/*.md` — and parses links
(`[x](path)`, `` `foo.md` ``, `[[wiki]]`) into a graph. Nothing is inherited:
**it's empty until you point `MEMORY_ROOT` at your own folder.**

The graph ends in **action**: select nodes (or type a question) → **Synthesize**
→ an artifact. Synthesis POSTs to your daemon's `POST /synthesize` (a one-shot
SSE turn, no session) with the sliced node contents; if the daemon is
unreachable it falls back to a local `claude` CLI. Modes: `brief` (decision
brief), `simple` (a self-contained explainer HTML), `journey` (a chronological
story). Add your own modes in `src/features/cerebro/server/synthesis.ts`.

**Setup:** set `MEMORY_ROOT=/path/to/your/knowledge` (a directory containing
`.claude/memory` and/or `.claude/knowledge`). No default path exists; if unset,
the room shows an honest empty state.

API: `GET /api/cerebro/graph`, `GET /api/cerebro/node?id=`, `POST /api/cerebro/synthesize`.

---

## Acciones (OPERATES) — what the brain did & what it costs

A mirror of your agent's cron activity: the **organs** (cron jobs) grouped by
"neurological" function, distilled activity (not raw logs), and cost per organ.
It joins two sources:

1. Your daemon's scheduler (`GET /schedule` → jobs with schedule/next/last run).
2. The `conversations` table (rows where `source='cron'`, with `usage` cost) —
   these are written when your daemon posts cron results to
   `POST /api/openclaw/event` with `source: 'cron'` (see `AGENT-SERVER.md`).

Classification (category + anatomy + label + surface) comes from
`src/shared/constants/cron-taxonomy.ts` — **replace the `example-*` entries with
your own job ids**; unknown ids fall back to heuristics so the room still groups
your jobs with zero config. It's AI-first: the only action is an **"Ask your
agent"** button that deep-links the chat with a pre-filled draft — no operate
buttons.

API: `GET /api/brain/acciones?range=today|7d`.

---

## Plasticidad + Metabolismo (the pattern — build your own organ)

These two rooms are the SELF-REGULATE half of the loop. They render from tables
that a **nightly cron ("organ") of yours** writes — there's no universal way to
generate that data, so instead of shipping empty tabs we give you the schema and
the write contract. Add the migration, write the organ, drop in a room component,
and add the room to the switcher in `CerebroPage.tsx`.

### Plasticidad (SHAPES) — patterns your agent sees in you

Your nightly organ reads your recent activity and writes a "reading" of the
patterns it sees. Minimal schema:

```sql
create table plasticidad_lecturas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  fecha date not null,
  lectura text not null,            -- the pattern reading, in prose
  evidencia jsonb,                  -- supporting data points
  created_at timestamptz default now(),
  unique (user_id, fecha)
);
```

The reference implementation also crosses habit-tracking tables
(`sistema_habitos/checks/reflexion`) to compute streaks and a "decided vs
executed" view — that's optional and specific to a habit system; start with
`plasticidad_lecturas` and grow only if you have a habit tracker.

### Metabolismo (SELF-REGULATES) — the ledger of cost + pruning

Your nightly organ audits what each organ costs vs. what it returns, and proposes
prunes/consolidations that **you sign** (the room never kills anything — the
organ proposes, you approve via chat, the agent executes). Schema:

```sql
create table metabolismo_lecturas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  fecha date not null,
  lectura text not null,            -- the metabolic reading, in prose
  tasa jsonb, libro jsonb, muriedo jsonb,
  created_at timestamptz default now(),
  unique (user_id, fecha)
);

create table metabolismo_propuestas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  clave text not null,              -- stable key per proposal
  tipo text, clase text, neurona text,
  titulo text not null,
  propuesta text not null,
  evidencia jsonb,
  ahorro_estimado text, riesgo text,
  estado text not null default 'propuesta',  -- propuesta|firmada|rechazada|ejecutada
  decision_nota text, decided_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, clave)
);
```

The "live metabolic rate" (cost over the last 30d) is computed generically from
`conversations.usage`. Wire your own revenue metric if you want a "% of revenue"
ROI denominator (it's `null` by default).

> The philosophy: a system that governs itself KNOWS (Neuronas), OPERATES
> (Acciones), and SELF-REGULATES (Plasticidad + Metabolismo). The first two are
> yours out of the box; the last two are a one-cron away, and the contract above
> is all you need.
