-- Integración Todoist <-> Board (integrations/todoist/sync.py)
-- El link canónico vive aquí: tasks.todoist_id guarda el id del task de Todoist.
-- (El script también deja un marcador "mc:<uuid>" en la descripción del task
--  de Todoist como respaldo del link.)

alter table if exists public.tasks
  add column if not exists todoist_id text;

create index if not exists idx_tasks_todoist_id
  on public.tasks (todoist_id)
  where todoist_id is not null;
