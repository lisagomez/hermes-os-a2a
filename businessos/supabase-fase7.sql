-- supabase-fase7.sql — extension de `tareas` para el enjambre (Fase 7 / PRP-007).
-- Aplicar una vez sobre el proyecto Supabase (igual que supabase-init/fase6).
-- Idempotente (add column if not exists). RLS ya viene de Fase 6/init: sin
-- politicas, SOLO service_role. NO relaja ninguna frontera de la Fase 6.
--
-- Un escritor por fila (aprendizaje F3 de Fase 6, extendido a padre/hija):
--   * el Coordinador escribe SOLO la fila PADRE (es_padre=true): plan, fan_out_max,
--     presupuesto y gasto acumulado, estado global.
--   * cada Ejecutor escribe SOLO su fila HIJA (parent_id = task_id del padre).
--   * el Supervisor sigue stateless (no escribe `tareas`).
-- El ciclo de estados de la Fase 6 (contrato.py) se conserva 1:1 para las hijas;
-- la fila padre lo reusa tal cual.

-- ============================================================
-- tareas: columnas del enjambre
-- ============================================================
alter table public.tareas
  add column if not exists parent_id       text,            -- null = tarea suelta o padre; set = sub-tarea (task_id del padre)
  add column if not exists es_padre        boolean not null default false,
  add column if not exists fan_out_max     integer          check (fan_out_max is null or fan_out_max >= 1),
  add column if not exists plan            jsonb,           -- DAG de sub-tareas (solo en la fila padre)
  add column if not exists presupuesto_usd numeric(10,4)    check (presupuesto_usd is null or presupuesto_usd >= 0),
  add column if not exists gasto_usd       numeric(10,4) not null default 0 check (gasto_usd >= 0);

-- Ligadura hija→padre por task_id (FK logica, no fisica: no acoplar orden de
-- insercion ni bloquear el borrado del padre; la integridad la garantiza el
-- Coordinador, unico escritor de la fila padre).
create index if not exists tareas_parent_idx on public.tareas (parent_id);

-- ============================================================
-- token_usage: atribucion de gasto por tarea (DECIDIDO 2026-07-04)
-- ============================================================
-- Sin esta columna, el corte de presupuesto del enjambre seria una adivinanza por
-- ventana temporal. Con ella, el Coordinador suma el gasto EXACTO de cada
-- sub-tarea (y del propio Planner) contra `presupuesto_usd`. Nullable y
-- retrocompatible: null = gasto no atribuido a una tarea del trio (Fase 1/6).
alter table public.token_usage
  add column if not exists task_id text;
create index if not exists token_usage_task_idx on public.token_usage (task_id);

comment on column public.token_usage.task_id is
  'Fase 7: liga el gasto a la tarea del trio (sub-tarea o padre) para el corte exacto de presupuesto del enjambre. Nullable: null = gasto no atribuido.';
