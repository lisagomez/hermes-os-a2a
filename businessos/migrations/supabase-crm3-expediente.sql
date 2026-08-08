-- CRM-3 — bitácora de expedientes de promoción (plan D-40: "como toda
-- compuerta: identidad, caducidad, bitácora"). El sistema ARMA y PRESENTA el
-- expediente; el humano resuelve. Un escritor: el host-job
-- expediente-promocion.py (presenta/expira); el humano resuelve vía update
-- documentado (botón). Idempotente.

create table if not exists crm_expedientes (
  id            bigint generated always as identity primary key,
  tenant_id     text not null references crm_tenants(tenant_id),
  salto         text not null default 'A1->A2',
  criterios     jsonb not null,                 -- los números que sustentan la propuesta
  estado        text not null default 'pendiente'
                check (estado in ('pendiente','aprobado','rechazado','expirado')),
  presentado_en timestamptz not null default now(),
  expira_en     timestamptz not null,           -- caducidad: la evidencia envejece
  resuelto_en   timestamptz,
  resuelto_por  text
);

create index if not exists crm_expedientes_pendientes_idx
  on crm_expedientes (tenant_id, estado, expira_en);

alter table crm_expedientes enable row level security;
-- (sin policies: solo service_role)
