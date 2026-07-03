-- supabase-fase6.sql — tabla de Fase 6: estado de tareas del trio (SPEC-trio §7.2).
-- Aplicar una vez sobre el proyecto Supabase (igual que supabase-init.sql).
-- Idempotente. RLS sin politicas: SOLO service_role accede.
--
-- La escriben los SERVICIOS del trio (ejecutor-a2a / supervisor-a2a / host-jobs),
-- JAMAS el agente Hermes (secret-scrubbing por diseno, aprendizaje 2026-06-30).
-- Ciclo de estados y transiciones validas: businessos/trio-contrato/contrato.py
-- (fuente unica del contrato; este check solo fija el dominio).

create table if not exists public.tareas (
  id            bigint generated always as identity primary key,
  task_id       text        not null unique,
  departamento  text        not null default 'software',
  objetivo      text        not null,
  contexto      jsonb       not null default '{}'::jsonb,  -- repo, business_logic, skills
  criterios     jsonb       not null default '[]'::jsonb,  -- criterios de aceptacion
  estado        text        not null default 'recibida'
    check (estado in ('recibida','en_ejecucion','en_revision',
                      'aprobada','rechazada','escalada','concretada','cancelada')),
  intentos      integer     not null default 0 check (intentos >= 0),
  intentos_max  integer     not null default 3 check (intentos_max >= 1),
  resultado     jsonb,      -- ultimo RESULTADO del Ejecutor (worktree, diff, artefactos)
  veredicto     jsonb,      -- ultimo VEREDICTO del Supervisor (gates + hallazgos)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists tareas_estado_idx on public.tareas (estado);
create index if not exists tareas_departamento_idx on public.tareas (departamento);

comment on table public.tareas is
  'Estado de tareas del trio Hermes→Ejecutor→Supervisor (Fase 6). La escriben los servicios del trio con service_role; el agente Hermes consulta por A2A o snapshot, nunca con credenciales. Contrato y transiciones: businessos/trio-contrato/contrato.py';

alter table public.tareas enable row level security;
