-- supabase-fase10-reuniones.sql: tabla de accion items extraidos de reuniones de negocio.
-- Aplicar una vez sobre el proyecto Supabase (igual que supabase-init/fase6/fase7/fase9).
-- Idempotente (create if not exists). RLS sin politicas: SOLO service_role accede,
-- mismo patron que `tareas` y `facturas`.
--
-- Origen: el prompt generico de ingesta de reuniones
-- (C:\OPS\_VelOS\proyectos\Transcript reuniones colaborativas\SYSTEM-PROMPT-ingesta-reunion-negocio.md,
-- FUERA de este repo a proposito) produce, al final de cada acta, un bloque
--   <<<TAREAS_JSON { "negocio":..., "reunion_id":..., "generado":..., "tareas":[...] } TAREAS_JSON>>>
-- El skill de proyecto .claude/skills/ingesta-reunion/SKILL.md dispara ese analisis y pasa
-- el bloque a businessos/ingest-reuniones.py (host-job con service_role), que hace el UPSERT
-- aqui. businessos/snapshot-tareas-reunion.py + businessos/alerta-tareas-reunion.sh (cron)
-- leen esta tabla para avisar por Telegram/Slack lo que vence.
--
-- DISTINTA de `tareas` (Fase 6/7, motor Ejecutor/Supervisor/Coordinador del trio): esa es
-- ejecucion agentica de codigo; esta es accion items humanos de una reunion. No comparten
-- escritor ni ciclo de vida: nunca fusionar.
--
-- Escritor unico: businessos/ingest-reuniones.py (host-job de confianza, tiene el
-- service_role). El agente Hermes JAMAS escribe aqui directo (secret-scrubbing por diseno,
-- aprendizaje 2026-06-30); solo LEE via snapshot, igual que presupuesto/vigencias.

create table if not exists public.tareas_reunion (
  -- "id" tal como llega en TAREAS_JSON (T1, T2... correlativo DENTRO de la reunion, no
  -- global): junto con reunion_id forma la clave natural de upsert (reingerir la misma
  -- reunion actualiza en vez de duplicar).
  id            text        not null,
  negocio       text        not null default 'a2a',
  reunion_id    text        not null,
  tarea         text        not null,
  responsable   text,
  fecha_limite  date,                          -- null = "sin fecha" (no entra a las alertas)
  canal         text,                          -- canal_sugerido del prompt (#alertas, #reuniones, #dep-legal...)
  fuente        text,                          -- "Nombre [mm:ss]"
  estado        text        not null default 'pendiente'
    check (estado in ('pendiente', 'en_curso', 'hecha', 'cancelada')),
  creado_en     timestamptz not null default now(),
  primary key (reunion_id, id)
);

create index if not exists tareas_reunion_negocio_idx       on public.tareas_reunion (negocio);
create index if not exists tareas_reunion_fecha_estado_idx  on public.tareas_reunion (fecha_limite, estado);

comment on table public.tareas_reunion is
  'Accion items extraidos de reuniones de negocio (a2a y, a futuro, otros negocios del portafolio) via el prompt generico de ingesta. UPSERT por (reunion_id, id) para reingerir sin duplicar. La escribe SOLO businessos/ingest-reuniones.py (service_role); el agente Hermes nunca escribe aqui directo, solo lee snapshot. Cron de vigilancia: businessos/snapshot-tareas-reunion.py + businessos/alerta-tareas-reunion.sh.';

alter table public.tareas_reunion enable row level security;
