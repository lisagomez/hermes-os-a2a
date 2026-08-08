-- supabase-fase4.sql — tabla de Fase 4: snapshot del Pantheon (Mission Control).
-- Aplicar una vez sobre el proyecto Supabase (igual que supabase-init.sql).
-- Idempotente. RLS sin politicas: SOLO service_role accede (host-jobs / dashboard).

-- La escribe businessos/snapshot-pantheon.py (host-job; el dashboard SOLO lee).
create table if not exists public.pantheon (
  vertical    text primary key check (vertical in ('personal','negocio','clientes')),
  bot         text,                              -- @handle del bot Telegram
  modelo      text,                              -- cerebro principal (config.yaml model.default)
  fallbacks   jsonb not null default '[]'::jsonb, -- cadena de fallback (ids de modelo)
  skills      jsonb not null default '[]'::jsonb, -- [{nombre, descripcion}]
  snapshot_at timestamptz not null default now()
);

comment on table public.pantheon is
  'Snapshot por vertical (modelo/fallbacks/skills) que escribe snapshot-pantheon.py leyendo los volumenes .hermes. Mission Control lo lee; el dashboard jamas monta volumenes.';

alter table public.pantheon enable row level security;
