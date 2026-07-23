-- supabase-vista-departamentos.sql — v_departamentos (2026-07-23)
--
-- POR QUÉ: el combo de departamento de /desarrollo (Mission Control) necesita
-- los departamentos con tareas en la tabla. PostgREST no expone DISTINCT, así
-- que vive en una vista (mismo patrón que v_facturas_resumen). El combo une
-- esto con DEPARTAMENTOS_REGISTRADOS (espejo de supervisor-a2a/reglas/*.toml)
-- para listar también los dados de alta que aún no despachan tareas.

create or replace view public.v_departamentos
  with (security_invoker = true) as
select distinct departamento
from public.tareas
where departamento is not null
order by departamento;

revoke all on public.v_departamentos from anon, authenticated;
