-- supabase-fix-vista-facturas.sql — v_facturas_resumen (2026-07-23)
--
-- POR QUÉ: la vista /grafo de Mission Control pedía el conteo por estado con un
-- agregado inline de PostgREST (`select=deducibilidad_estado,cuenta:id.count()`)
-- y Supabase lo rechaza con PGRST123 "Use of aggregate functions is not allowed"
-- (db_aggregates_enabled=false, default de la plataforma). El agregado se mueve
-- a una vista — mismo patrón que v_presupuesto_mensual (supabase-init.sql).
--
-- security_invoker: la vista corre con los permisos de quien consulta → anon
-- sigue topando con el RLS de `facturas` (sin políticas = nada). El dashboard
-- consulta con service_role, que salta RLS como siempre. El revoke de abajo es
-- cinturón extra para los roles de la API pública.

create or replace view public.v_facturas_resumen
  with (security_invoker = true) as
select deducibilidad_estado, count(*)::int as cuenta
from public.facturas
group by deducibilidad_estado;

revoke all on public.v_facturas_resumen from anon, authenticated;
