-- CRM-1 — auditoría del supervisor sup-crm (plan D-40: A1 = sup valida CADA
-- saliente antes de salir). Una fila por validación: qué gates corrieron, el
-- veredicto y el motivo. Prefijo crm_, RLS cerrado, mismo patrón que CRM-0.

create table if not exists crm_supervision (
  id              bigint generated always as identity primary key,
  tenant_id       text not null references crm_tenants(tenant_id),
  conversacion_id bigint references crm_conversaciones(id),
  aprobado        boolean not null,
  gates           jsonb not null default '{}'::jsonb,  -- {"g_sensible":"ok","g_juez":"fallo:..."}
  motivo          text not null default '',
  created_at      timestamptz not null default now()
);

create index if not exists crm_supervision_conv_idx on crm_supervision (conversacion_id, created_at);
create index if not exists crm_supervision_tenant_idx on crm_supervision (tenant_id, aprobado, created_at);

alter table crm_supervision enable row level security;
-- (sin policies: solo service_role; anon/authenticated sin acceso)
