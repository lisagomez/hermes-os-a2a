-- supabase-costeo-tarea.sql — costeo ENFOCADO POR TAREA (Fase 1 revisitada, 2026-07-29).
-- Aplicar una vez sobre el proyecto Supabase (igual que supabase-init.sql).
-- Idempotente (create or replace). Orden: DESPUES de fase6 (tareas) y fase7 (task_id).
--
-- Contexto: el ledger por-tarea existe desde Fase 7 (token_usage.task_id, filas
-- append-only del motor del Ejecutor), pero el costeo seguia enfocado al agregado
-- mensual por vertical (v_presupuesto_mensual). Estas vistas cierran el hueco:
-- cuanto costo CADA tarea (y cada departamento), con sus huecos DECLARADOS.
--
-- Patron de seguridad (aprendizaje 2026-07-23, v_facturas_resumen): security_invoker
-- + revoke a anon/authenticated → solo service_role (host-jobs, Mission Control
-- server-side) las lee. Agregados SIEMPRE en vista, nunca inline en PostgREST
-- (PGRST123: agregados deshabilitados en la plataforma).

-- ============================================================
-- v_costeo_tarea: una fila por tarea con gasto en el ledger
-- ============================================================
-- tarea_raiz agrupa el enjambre: para una sub-tarea es su padre (parent_id); para
-- una tarea suelta o padre, ella misma. Sumar por tarea_raiz = costo de la FEATURE
-- completa (Planner + sub-tareas + integracion).
-- filas_sin_costo declara las filas con tokens pero costo 0 (corridas muertas a
-- media faena o modelo sin precio en el recalculo): el monto esta SUBESTIMADO y la
-- vista lo dice — jamas aparenta saber lo que no sabe.
create or replace view public.v_costeo_tarea
with (security_invoker = true) as
  select u.task_id,
         coalesce(t.parent_id, u.task_id)   as tarea_raiz,
         t.departamento,
         t.estado,
         t.es_padre,
         t.parent_id,
         t.presupuesto_usd,
         count(*)::bigint                    as corridas,
         sum(u.tokens_in)::bigint            as tokens_in,
         sum(u.tokens_out)::bigint           as tokens_out,
         round(sum(u.costo_usd), 4)          as costo_usd,
         count(*) filter (where u.costo_usd = 0
                            and (u.tokens_in > 0 or u.tokens_out > 0))::bigint
                                             as filas_sin_costo,
         array_agg(distinct u.modelo)        as modelos,
         min(u.fecha)                        as desde,
         max(u.fecha)                        as hasta
  from public.token_usage u
  left join public.tareas t on t.task_id = u.task_id
  where u.task_id is not null
  group by u.task_id, t.parent_id, t.departamento, t.estado, t.es_padre,
           t.presupuesto_usd;

comment on view public.v_costeo_tarea is
  'Costeo por tarea del trio/enjambre: ledger token_usage.task_id × tareas. tarea_raiz agrupa padre+hijas (costo de la feature completa); filas_sin_costo declara huecos (monto subestimado, tokens completos). Solo service_role (security_invoker + revoke).';

-- ============================================================
-- v_costeo_departamento: roll-up mes × departamento
-- ============================================================
-- La cara "de negocio" del mismo ledger: que departamento gasta que. Las filas
-- por-tarea cuyo task_id no tenga (ya) fila en tareas se declaran como
-- '(sin tarea)' en vez de desaparecer.
create or replace view public.v_costeo_departamento
with (security_invoker = true) as
  select to_char(u.fecha, 'YYYY-MM')            as mes,
         coalesce(t.departamento, '(sin tarea)') as departamento,
         count(distinct u.task_id)::bigint       as tareas,
         sum(u.tokens_in)::bigint                as tokens_in,
         sum(u.tokens_out)::bigint               as tokens_out,
         round(sum(u.costo_usd), 4)              as costo_usd
  from public.token_usage u
  left join public.tareas t on t.task_id = u.task_id
  where u.task_id is not null
  group by 1, 2;

comment on view public.v_costeo_departamento is
  'Roll-up mensual del costeo por tarea, por departamento. Mismo ledger que v_costeo_tarea. Solo service_role.';

-- Cerrado por defecto: sin esto, las vistas nacen legibles para anon/authenticated
-- aunque las tablas base esten cerradas (la vista es un objeto nuevo con grants
-- propios). service_role conserva acceso.
revoke all on public.v_costeo_tarea         from anon, authenticated;
revoke all on public.v_costeo_departamento  from anon, authenticated;

-- ============================================================
-- Fix de la Fase 1 original: v_presupuesto_mensual era SECURITY DEFINER
-- ============================================================
-- El advisor de Supabase la marcaba en ERROR (security_definer_view): nacio en
-- supabase-init.sql sin security_invoker (el default de Postgres para vistas) y
-- con grants heredados a anon/authenticated. Mismo tratamiento que las de arriba;
-- sus consumidores reales (host-jobs / Mission Control server-side) usan
-- service_role y no se afectan.
alter view public.v_presupuesto_mensual set (security_invoker = true);
revoke all on public.v_presupuesto_mensual from anon, authenticated;

-- PostgREST no ve objetos nuevos hasta recargar el schema (PGRST205).
notify pgrst, 'reload schema';
