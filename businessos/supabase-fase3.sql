-- supabase-fase3.sql — tablas de Fase 3: cobro (Polar) y contratos-documento.
-- Aplicar una vez sobre el proyecto Supabase (igual que supabase-init.sql).
-- Idempotente. RLS sin politicas: SOLO service_role accede (host-jobs).

-- ============================================================
-- cobros  (los crea polar-cobros.py; el agente solo deja requests en el volumen)
-- ============================================================
create table if not exists public.cobros (
  id                 bigint generated always as identity primary key,
  cliente            text          not null,
  concepto           text          not null,
  monto              numeric(12,2) not null check (monto > 0),
  moneda             text          not null default 'USD',
  -- checkout de Polar (Merchant of Record; asume IVA/GST internacional)
  polar_checkout_id  text unique,
  checkout_url       text,
  -- estados espejo de Polar: open->abierto, confirmed->confirmado,
  -- succeeded->pagado, expired->expirado, failed->fallido
  estado             text not null default 'link_creado'
    check (estado in ('link_creado','abierto','confirmado','pagado','expirado','fallido')),
  metadata           jsonb not null default '{}'::jsonb,  -- origen, folio factura, etc.
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.cobros is
  'Cobros via Polar (MoR). Los crea el host-job polar-cobros.py desde requests que los agentes dejan en cobros_pending/. --sync actualiza estado desde Polar.';

create index if not exists cobros_estado_idx  on public.cobros (estado);
create index if not exists cobros_cliente_idx on public.cobros (cliente);

alter table public.cobros enable row level security;

-- ============================================================
-- contratos  (los valida validar-contratos.py via grafo; cerrar = SOLO humano)
-- ============================================================
create table if not exists public.contratos (
  id             bigint generated always as identity primary key,
  cliente        text  not null,
  titulo         text  not null,
  jurisdiccion   text  not null default 'MX',
  -- clausulas: [{"titulo": "...", "texto": "..."}]
  clausulas      jsonb not null default '[]'::jsonb,
  -- borrador -> validado|en_revision (host-job segun banderas del grafo)
  -- -> aprobado -> firmado (SOLO Elisa; ningun job ni agente pone estos dos)
  estado         text  not null default 'borrador'
    check (estado in ('borrador','validado','en_revision','aprobado','firmado','terminado')),
  -- respuesta completa del grafo (veredictos+banderas+checklist+fuentes+disclaimer)
  validacion     jsonb,
  evaluacion_id  uuid,   -- id de la evaluacion persistida en el grafo
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (cliente, titulo)
);

comment on table public.contratos is
  'Acuerdos comerciales (capa documento). El grafo valida clausulas y marca banderas con fuente; aprobar/firmar es exclusivamente humano (Fase 3).';

create index if not exists contratos_estado_idx  on public.contratos (estado);
create index if not exists contratos_cliente_idx on public.contratos (cliente);

alter table public.contratos enable row level security;
