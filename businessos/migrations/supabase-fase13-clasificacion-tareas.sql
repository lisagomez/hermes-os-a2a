-- Modulo act del ERP (2026-07-26) — clasificacion de tareas EN EL ORIGEN.
--
-- "La clasificacion contable y la evidencia de I+D nacen en el ORIGEN del encargo,
-- no se reconstruyen despues" (ERP-MAESTRO §1.7). Cada tarea del trio declara al
-- encolarse su eje D+I y si es VENDIBLE (= al aprobarse se cosecha como activo
-- digital en erp.act_activo). Las columnas son DENORMALIZADAS desde payload.clasificacion
-- por cola._fila_de (el mismo escritor que denormaliza objetivo/criterios): el
-- cosechador filtra `estado=aprobada & vendible` por indice sin leer payloads.
--
-- La regla `vendible=true => eje_dei != 'operacion'` vive en el contrato del trio
-- (linea 1 de la aplicacion) y aqui como CHECK (linea 1 de la BD) — defensa doble,
-- mismo patron que intentos/intentos_max en fase 6.
--
-- Idempotente (re-corrible). RLS ya viene de Fase 6 (solo service_role la toca).
-- Aplicar: management API POST /v1/projects/{ref}/database/query (MCP read-only).

alter table public.tareas
  add column if not exists eje_dei text not null default 'operacion',
  add column if not exists vendible boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tareas_eje_dei_check') then
    alter table public.tareas
      add constraint tareas_eje_dei_check
      check (eje_dei in ('investigacion','desarrollo','operacion'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tareas_vendible_check') then
    alter table public.tareas
      add constraint tareas_vendible_check
      check (not vendible or eje_dei <> 'operacion');
  end if;
end $$;

comment on column public.tareas.eje_dei is
  'Clasificacion D+I nacida en el origen (contrato del trio): investigacion|desarrollo|operacion. La hereda act_costo via el cosechador.';
comment on column public.tareas.vendible is
  'true = feature que al aprobarse se cosecha como activo digital (erp.act_activo). Exige eje_dei != operacion (CHECK).';

-- El filtro del cosechador: aprobadas vendibles pendientes de cosecha.
create index if not exists tareas_cosecha_idx
  on public.tareas (updated_at)
  where estado = 'aprobada' and vendible;
