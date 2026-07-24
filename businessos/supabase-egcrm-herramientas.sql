-- supabase-egcrm-herramientas.sql — tablas de las herramientas EG.CRM (Hito 3 + frontera de envio).
-- Aplicar una vez sobre el proyecto Supabase (igual que supabase-fase9.sql), via
-- management API (el MCP esta en read-only para DDL). Idempotente. RLS sin
-- politicas: SOLO service_role accede.
--
-- Escritor unico (invariante del trio):
--   transcripciones          → SOLO transcripcion-a2a (businessos/transcripcion-a2a/)
--   aprobaciones_salientes   → el registro lo escribe SOLO un humano/host de
--                              confianza (autenticidad: el motor del Ejecutor no
--                              tiene credenciales, NO puede fabricar una fila);
--                              enviado_at/mensaje_id los escribe SOLO
--                              businessos/enviar-salientes.py tras enviar.
-- El agente Hermes JAMAS escribe aqui (secret-scrubbing por diseno).

-- ---------- transcripciones (EG.CRM Hito 3) ----------

create table if not exists public.transcripciones (
  id               uuid primary key default gen_random_uuid(),
  lead_id          text        not null,
  modalidad        text        not null check (modalidad in ('visita','llamada')),
  idioma           text        not null default 'es-MX',
  asesor           text        not null,
  tipo_reunion     text        not null default 'discovery'
    check (tipo_reunion in ('discovery','demo','negociacion','revision_tecnica','cierre')),
  motor            text        not null,
  confianza_global text        not null check (confianza_global in ('alta','media','baja')),
  contenido        text        not null,
  segmentos        jsonb       not null default '[]'::jsonb,
  creado_at        timestamptz not null default now()
);

create index if not exists transcripciones_lead_idx on public.transcripciones (lead_id);
create index if not exists transcripciones_creado_idx on public.transcripciones (creado_at desc);

comment on table public.transcripciones is
  'Transcripciones literales de entrevistas de descubrimiento (EG.CRM Hito 3), ancladas al lead. Escritor unico: transcripcion-a2a. Fidelidad, no interpretacion: lo dudoso queda [inaudible]. Motor STT pluggable (mock hoy; el real es gate de la duena).';

alter table public.transcripciones enable row level security;

-- ---------- aprobaciones_salientes (frontera de envio, gate humano) ----------
-- El gate `salientes_con_aprobacion` del Supervisor garantiza INTEGRIDAD
-- (sha256 en el worktree); esta tabla aporta la AUTENTICIDAD: el motor puede
-- fabricar un JSON en su worktree, pero NO puede escribir esta fila (sin
-- credenciales). enviar-salientes.py exige AMBAS antes de enviar.

create table if not exists public.aprobaciones_salientes (
  id            uuid primary key default gen_random_uuid(),
  ruta          text        not null,   -- p.ej. salientes/lead-123-propuesta.md
  sha256        text        not null,   -- del contenido aprobado (integridad)
  aprobado_por  text        not null check (aprobado_por in ('PM','CEO','CFO')),
  destinatario  text        not null,   -- email destino (fuente de verdad humana)
  lead_id       text,
  fecha         text        not null,   -- fecha declarada de la aprobacion
  enviado_at    timestamptz,            -- lo escribe SOLO enviar-salientes.py
  mensaje_id    text,                   -- id SMTP del envio, si lo hubo
  creado_at     timestamptz not null default now(),
  unique (ruta, sha256)
);

create index if not exists aprobaciones_salientes_lead_idx on public.aprobaciones_salientes (lead_id);

comment on table public.aprobaciones_salientes is
  'Registro AUTENTICO de aprobaciones de salientes (frontera de envio, EG.CRM Hito 6). La fila la crea un humano/host de confianza; el motor no tiene credenciales para fabricarla. enviar-salientes.py solo envia si worktree (sha256) y esta fila coinciden, y marca enviado_at (escritor unico del envio). Nada sale al cliente sin humano.';

alter table public.aprobaciones_salientes enable row level security;
