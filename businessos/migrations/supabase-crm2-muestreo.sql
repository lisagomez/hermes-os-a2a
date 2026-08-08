-- CRM-2 — muestreo A2 (plan D-40): el nivel de atención vive en el TENANT
-- (por-intención llega en fases posteriores) y la auditoría registra si el
-- juez corrió, para que la tasa de muestreo se calcule CON EVIDENCIA.
-- Subir a A2 = decisión humana (update de la dueña); bajar = regla automática
-- en sup-crm. Idempotente.

alter table crm_tenants
  add column if not exists nivel text not null default 'A1'
  check (nivel in ('A1','A2'));

alter table crm_supervision
  add column if not exists nivel text not null default 'A1';

alter table crm_supervision
  add column if not exists juez_ejecutado boolean not null default true;

create index if not exists crm_supervision_evidencia_idx
  on crm_supervision (tenant_id, juez_ejecutado, created_at desc);
