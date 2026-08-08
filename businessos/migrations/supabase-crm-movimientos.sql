-- Canal AUDITADO de movimientos de etapa del CRM (2026-08-08).
-- Doctrina nueva: la etapa de un lead se mueve SOLO vía mover_lead_etapa()
-- (un escritor: la RPC), y cada movimiento queda en leads_movimientos con su
-- actor ('humano:<email>' | 'agente:<nombre>') y motivo. Consumidores:
--   · tablero kanban del copiloto (drag & drop humano)
--   · agentes A2A (crm-canales: auto-mover nuevo→calificado con señal aprobada)
-- Idempotente. Aplicar por management API (POST /database/query, UA curl/8.0).

create table if not exists public.leads_movimientos (
  id bigint generated always as identity primary key,
  lead_id text not null references public.leads(lead_id) on delete cascade,
  tenant_id uuid not null,
  de_etapa text,
  a_etapa text not null,
  -- 'humano:<email>' | 'agente:<nombre>' — el prefijo es contrato de la UI (👤/🤖).
  actor text not null,
  motivo text not null default '',
  created_at timestamptz not null default now()
);

-- RLS habilitada sin políticas a propósito (patrón del proyecto): solo
-- service_role lee/escribe; los grants default de la plataforma se revocan.
alter table public.leads_movimientos enable row level security;
revoke all on table public.leads_movimientos from anon, authenticated;

create index if not exists leads_movimientos_lead_idx
  on public.leads_movimientos (lead_id, created_at desc);
create index if not exists leads_movimientos_recientes_idx
  on public.leads_movimientos (created_at desc);

-- Movimiento atómico + auditoría. p_solo_desde: guard fail-safe para agentes
-- (solo mueve si la etapa actual es esa; si no, NO-OP que devuelve la fila
-- actual — un agente jamás retrocede a un lead que el equipo ya avanzó).
-- El CHECK leads_etapa_check de la tabla es el backstop del dominio de etapas.
create or replace function public.mover_lead_etapa(
  p_lead_id text,
  p_etapa text,
  p_actor text,
  p_motivo text default '',
  p_solo_desde text default null
) returns setof public.leads
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_de text;
  v_tenant uuid;
begin
  select etapa, tenant_id into v_de, v_tenant
    from public.leads where lead_id = p_lead_id for update;
  if not found then
    raise exception 'lead % no existe', p_lead_id;
  end if;
  if p_solo_desde is not null and v_de <> p_solo_desde then
    -- Guard del agente: la etapa ya no es la esperada → no-op declarado.
    return query select * from public.leads where lead_id = p_lead_id;
    return;
  end if;
  if v_de <> p_etapa then
    update public.leads set etapa = p_etapa, updated_at = now()
      where lead_id = p_lead_id;
    insert into public.leads_movimientos (lead_id, tenant_id, de_etapa, a_etapa, actor, motivo)
      values (p_lead_id, v_tenant, v_de, p_etapa, p_actor, p_motivo);
  end if;
  return query select * from public.leads where lead_id = p_lead_id;
end $$;

revoke all on function public.mover_lead_etapa(text, text, text, text, text)
  from public, anon, authenticated;
