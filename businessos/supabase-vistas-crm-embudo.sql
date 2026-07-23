-- supabase-vistas-crm-embudo.sql — v_embudo_leads + v_crm_conversaciones_resumen (2026-07-23)
--
-- POR QUÉ: la vista /crm de Mission Control (submenú del departamento
-- adquisición) pinta el embudo de cliente con conteos por etapa de `leads` y
-- el resumen de `crm_conversaciones` por estado/nivel. PostgREST no expone
-- GROUP BY/DISTINCT inline (agregados deshabilitados, PGRST123) → los
-- agregados viven en vistas, mismo patrón que v_facturas_resumen y
-- v_departamentos. El ORDEN de las etapas del embudo es conocimiento del
-- dashboard (ETAPAS_EMBUDO en types/, espejo del check constraint de leads).

create or replace view public.v_embudo_leads
  with (security_invoker = true) as
select etapa, count(*)::int as cuenta
from public.leads
group by etapa;

revoke all on public.v_embudo_leads from anon, authenticated;

create or replace view public.v_crm_conversaciones_resumen
  with (security_invoker = true) as
select estado, nivel, count(*)::int as cuenta
from public.crm_conversaciones
group by estado, nivel;

revoke all on public.v_crm_conversaciones_resumen from anon, authenticated;
