# Finanzas — personal finance, captured by talking to your agent

`/finanzas` is a **read-only mirror** of your personal finances. You never fill
forms: you tell your agent *"I spent 350 on groceries with my debit card"* and the
agent writes it through the API. The page shows net worth, burn, runway, an
income-vs-expense curve, category breakdowns, movements and monthly closes.

This is the purest example of the AI-first design rule of this project: **the UI is
a mirror, the agent is the operator.**

## Data model (4 tables)

Migration: `supabase/migrations/20260712010000_finances.sql`. No seed — you create
your own accounts.

| Table | What it holds |
|---|---|
| `finance_accounts` | Your accounts: name (unique), `owner` (free text), `kind` (`banco`, `credito`, `wallet`, `efectivo`, `revenue`, `por_cobrar`), `currency` (MXN/USD/EUR) |
| `finance_movements` | Append-only ledger. `type`: `gasto`, `ingreso`, `transferencia`, `prestamo`, `pago_deuda`, `ajuste`. Corrections reference the original row (`is_correction` + `corrects_movement_id`) — never edit or delete |
| `finance_snapshots` | Monthly closes: dictated balances per account + FX of the day + computed liquid/net worth and deltas. One per date (upsert) |
| `finance_recurring` | Fixed charges (rent, payroll, subscriptions). Monthly or annual with charge day/month. These are the FIXED base of your burn — they live here, not as movements |

**Base currency is MXN**: all aggregates (`*_mxn` fields) normalize to MXN using
live FX (open.er-api.com, cached 1h, falls back to last snapshot's FX). If your
base currency is different, the schema still works — treat `_mxn` as "base
currency units" and adjust the display strings, or open an issue.

`FINANCE_TZ` env var (default `America/Mexico_City`) controls what "today" means
for movement/close dates.

## API contract — `/api/finanzas`

Auth for both methods: Supabase session with `owner`/`admin` role, **or**
`Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN` (that's how a headless agent writes).

### GET `?range=30d|3m|6m|12m` (default `30d`)

Returns `{ accounts, movements, snapshots, recurring, summary }`. The summary is
where the math lives:

- `burn_range_mxn` / `income_range_mxn` / `cashflow_range_mxn` — totals for the range.
- `series` — daily **cumulative** income vs expense points (the single chart).
- `monthly_burn_mxn` = prorated recurring charges + average of one-off expenses in the range.
- `runway_months` = latest snapshot's liquid ÷ monthly burn (`runway_low_confidence: true` when there's too little data to trust it).

### POST — three actions

Accounts are referenced **by name** (case-insensitive); the API resolves ids and
returns the list of valid names when it doesn't recognize one, so the agent can
self-correct in one round trip. Categories are validated against the canonical
lists in `src/features/finances/types/finances.ts` — edit those lists to your life.

```jsonc
// 1. A movement (expense shown; ingreso/transferencia/prestamo/pago_deuda/ajuste same shape)
{ "action": "add_movement", "movement": {
    "type": "gasto", "account": "Mi banco", "currency": "MXN",
    "amount": 350, "category": "despensa", "note": "super de la semana"
} }

// 2. A monthly close: dictate balances, API computes liquid/net worth + deltas vs previous
{ "action": "add_snapshot", "snapshot": {
    "balances": [
      { "account": "Mi banco", "balance": 42000 },
      { "account": "Efectivo", "balance": 1500 }
    ],
    "notes": "cierre de julio"
} }

// 3. A recurring fixed charge
{ "action": "add_recurring", "recurring": {
    "name": "Renta", "category": "vivienda", "periodicity": "mensual",
    "charge_day": 1, "currency": "MXN", "amount": 9000, "account": "Mi banco"
} }
```

Transfers, loans and debt payments need `counter_account` (destination). Cross-
currency transfers take `counter_currency` + `counter_amount`. Accounts of kind
`por_cobrar` model money people owe you: a `prestamo` moves money into them, a
`pago_deuda` moves it back, and snapshots count them in net worth but NOT in
liquid (you can't spend an IOU).

## Teaching your agent to run this

Give your agent this operating loop (works verbatim as a system-prompt fragment):

1. When the user mentions money spent/received, POST `add_movement` immediately.
   Guess the category from the canonical list; put anything ambiguous in `note`.
2. Once a month, ask for a close: "dictate me all your balances" → `add_snapshot`.
3. On "add my subscriptions", collect name/amount/charge day → `add_recurring` each.
4. To answer "how am I doing?", GET the payload and read `summary` — never
   recompute what the API already computed.
5. Corrections: never mutate. POST a new movement with `is_correction: true` and
   `corrects_movement_id` (correction rows are excluded from aggregates).

First-run setup: create your accounts by inserting into `finance_accounts`
(SQL editor or ask your agent to do it via the Supabase MCP/service role), then
capture normally. The UI shows friendly empty states until data exists.

## RLS

All four tables: SELECT restricted to `owner`/`admin` profiles; writes only via
service role (the API route). Members never see finances.
