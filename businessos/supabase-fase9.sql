-- supabase-fase9.sql — tabla de Fase 9: leads del departamento de adquisicion.
-- Aplicar una vez sobre el proyecto Supabase (igual que supabase-fase6.sql).
-- Idempotente. RLS sin politicas: SOLO service_role accede.
--
-- Escritor por origen (un escritor por fila, invariante del trio):
--   origen 'a2a'    → SOLO ventas-a2a (businessos/ventas-a2a/leads.py)
--   origen 'manual' → SOLO humanos/host-jobs de confianza
--   origen 'slack'  → futuro: host-job del canal #dep-adquisicion
-- El agente Hermes JAMAS escribe aqui (secret-scrubbing por diseno); consulta
-- por snapshot del host, como todo lo demas.
--
-- El pipeline completo (etapas y quien avanza cada una):
-- businessos/departamentos/adquisicion-clientes.md §1

create table if not exists public.leads (
  id          bigint generated always as identity primary key,
  lead_id     text        not null unique,
  origen      text        not null default 'a2a'
    check (origen in ('a2a','manual','slack')),
  empresa     text        not null default '',
  contacto    text        not null default '',
  mensaje     text        not null default '',
  etapa       text        not null default 'nuevo'
    check (etapa in ('nuevo','calificado','contactado','descubrimiento','propuesta',
                     'negociacion','contrato','onboarding','ganado','perdido')),
  datos       jsonb       not null default '{}'::jsonb,  -- payload extra (presupuesto, notas)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists leads_etapa_idx on public.leads (etapa);
create index if not exists leads_origen_idx on public.leads (origen);
create index if not exists leads_created_idx on public.leads (created_at desc);

comment on table public.leads is
  'Pipeline de adquisicion de clientes (Fase 9). Los leads origen a2a los escribe SOLO ventas-a2a con service_role; el avance de etapa lo deciden humanos segun la matriz de equipo-y-slack.md (enviar a cliente = PM/CEO, dinero = CFO, firmar = solo humano). Pipeline completo: businessos/departamentos/adquisicion-clientes.md';

alter table public.leads enable row level security;
