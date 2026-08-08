-- ============================================================
-- Fix token-ledger (2026-07-11) — APLICADO en prod ese dia
-- ============================================================
-- Bug del primer dogfood real del trio: la UNIQUE total (fecha,vertical,modelo)
-- de token_usage esta pensada para el agregado DIARIO del ingest nocturno, pero
-- las filas POR-TAREA del trio (task_id set, escritas por el motor del Ejecutor)
-- chocan con ella: la 2a tarea del mismo modelo el mismo dia devolvia 409 y el
-- motor (best-effort) perdia el gasto EN SILENCIO -> presupuesto subcontado.
--
-- Fix: la unicidad aplica SOLO al agregado diario (task_id null); las filas
-- por-tarea son un LEDGER append-only (varias corridas = varias filas; el corte
-- de presupuesto del enjambre suma por task_id, no le estorban).
--
-- Consecuencia operativa: PostgREST ya no puede inferir on_conflict sobre un
-- indice parcial -> ingest-token-usage.py cambio de UPSERT merge-duplicates a
-- DELETE del dia (solo filas task_id null) + INSERT, igual de idempotente.
--
-- Orden: correr DESPUES de supabase-fase7.sql (que agrega la columna task_id).
-- Idempotente: re-correrlo es no-op.

alter table public.token_usage
  drop constraint if exists token_usage_fecha_vertical_modelo_key;

create unique index if not exists token_usage_fecha_vertical_modelo_key
  on public.token_usage (fecha, vertical, modelo)
  where task_id is null;
