-- ============================================================================
--  01-preseed-produccion.sql — Datos "de producción" ANTES de la migración
--
--  Existe por un agujero que el gate tuvo: el efímero migraba con TODAS las
--  tablas vacías, y así el `backfill` del bloque 4 jamás se ejercitaba contra
--  filas reales. Con las tablas vacías, un backfill que ABORTA contra
--  producción (UPDATE sobre tablas append-only cuyo trigger prohíbe UPDATE)
--  sale verde en CI. Cero filas ⇒ cero triggers ⇒ cero verdad.
--
--  Aquí se siembra al menos una fila en las tablas CRÍTICAS antes de migrar:
--  las dos append-only (`buzon_bitacora`, `enriquecimiento_intento`), que son
--  exactamente las que convierten un UPDATE de backfill en un aborto.
--  replay.sh verifica DESPUÉS de la migración que estas filas quedaron con
--  tenant_id poblado — esa aserción es la demostración del gate.
--
--  Solo corre en el efímero (después del prelude, que ya aborta contra una
--  plataforma real). Idempotente por on conflict / unicidad natural ausente.
-- ============================================================================

\set ON_ERROR_STOP on

-- append-only #1: solo actor/evento son obligatorios sin default
insert into public.buzon_bitacora (actor, evento)
values ('preseed-tenencia', 'ingerido');

-- append-only #2: exige un lead padre vivo (FK on delete restrict)
insert into public.leads (lead_id)
values ('preseed-tenencia')
on conflict do nothing;

insert into public.enriquecimiento_intento (lead_id, fuente, resultado)
values ('preseed-tenencia', 'preseed', 'miss');

do $$
begin
  raise notice 'PRESEED: filas de produccion simuladas en buzon_bitacora y enriquecimiento_intento (pre-migracion)';
end $$;
