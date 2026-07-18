-- PRP-010 — La COLA del trio (FIFO + prioridad, ejecucion serial).
--
-- `tareas` deja de ser solo un registro de trazabilidad y pasa a ser LA COLA: la fila en
-- estado 'recibida' ES la peticion pendiente. De ahi las tres columnas nuevas.
--
-- Idempotente (re-corrible). RLS ya viene de Fase 6: la tabla no tiene politicas, solo la
-- toca el service_role (el bot NO tiene credenciales, por diseno).
--
-- Aplicar: management API POST /v1/projects/{ref}/database/query (el MCP esta en read-only).

alter table public.tareas
  -- Orden de la cola: prioridad DESC, encolada_en ASC (FIFO, con adelantos SOLO de Elisa).
  add column if not exists prioridad   integer     not null default 0,
  add column if not exists encolada_en timestamptz not null default now(),
  -- El worker ejecuta la tarea MINUTOS despues, y la reconstruye DESDE LA FILA (no desde el
  -- mensaje A2A, que ya no existe). Las columnas denormalizadas (objetivo, criterios) se
  -- quedan para el snapshot y el dashboard, pero la verdad EJECUTABLE es `payload`: sin el
  -- se perderian `max_turns`, `presupuesto_usd`, `modelo_pref` y `observaciones` — y una
  -- tarea sin `max_turns` vuelve al techo de 40 turnos que mato mission-control-2026-0001.
  add column if not exists payload     jsonb;

-- Indice de la cola: exactamente el pick del worker (barato, parcial).
create index if not exists tareas_cola_idx
  on public.tareas (prioridad desc, encolada_en asc)
  where estado = 'recibida';
