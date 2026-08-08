-- supabase-fase14-agendamiento.sql — Módulo de agendamiento de Meeting Copilot (SPEC §19).
--
-- ⚠️ NO APLICADA todavía: el MVP del copilot es mock-first (la agenda vive en el
-- navegador). Este archivo es el CONTRATO de datos diseñado desde el día 1 para
-- que el mock sea fiel a lo que existirá. Aplicar UNA vez, por management API
-- (POST /v1/projects/{ref}/database/query, UA curl/8.0 — el MCP está read-only),
-- cuando se conecte la fase Supabase del copilot.
--
-- Idempotente. RLS habilitada SIN políticas: solo service_role accede (patrón
-- de la casa); el frontend JAMÁS toca estas tablas desde el browser — todo pasa
-- por route handlers server-side del copilot o por host-jobs.
--
-- MULTI-TENANT: toda tabla lleva tenant_id (default 'a2a'). El aislamiento real
-- se aplica server-side al conectar; el default preserva la operación actual.
--
-- ESCRITOR ÚNICO (invariante de la casa — un escritor por tabla/transición):
--   agenda_asesores / agenda_disponibilidad / agenda_excepciones /
--   agenda_servicios / agenda_enlaces_reserva
--       → meeting-copilot server-side (asesor autenticado, service_role).
--   agenda_citas INSERT (estado 'solicitada') y transición 'reprogramar'
--       → route público /api/reservar (payload zod + token firmado + rate-limit).
--   agenda_citas transiciones del asesor (aprobar/rechazar/reasignar/iniciar/
--   completar/cancelar/no_show)
--       → meeting-copilot server-side.
--   agenda_citas transición aprobada→confirmada + agenda_notificaciones
--   pendiente→enviada|error
--       → HOST-JOB notificador (cron estilo alerta-tareas-reunion.sh que envía
--         por enviar-salientes.py [gate aprobaciones_salientes] y crm-canales).
--         Reintentos: máx 3 por notificación (columna intentos), ventana ≥15 min;
--         cada fallo agrega evento 'fallo_notificacion' al historial de la cita.
--   agenda_notificaciones INSERT 'pendiente'
--       → meeting-copilot al aprobar/reasignar/rechazar.
--   leads.etapa NUNCA la escribe el copilot: el seam CRM es un host-job futuro
--   que lee transiciones de agenda_citas y mueve leads SOLO a etapas del CHECK
--   vigente (p. ej. aprobada→'descubrimiento'); "cita perdida" no tiene etapa
--   hoy — decisión de negocio pendiente, NO inventar valores.
--
-- RATE-LIMIT del endpoint público (diseño, se implementa al conectar):
--   5 solicitudes/día por email y por IP (ventana deslizante 24 h sobre
--   agenda_citas.created_at + cliente_email); al rebasar → 429 genérico.
--
-- OBSERVABILIDAD: el historial (jsonb) de agenda_citas registra TODO evento
-- {de, a, evento, actor, at, detalle} — aprobaciones, reasignaciones,
-- reprogramaciones, fallos de notificación, llamadas iniciadas y lecturas de
-- brief por IA ('lectura_brief_ia'). Métricas derivables: tasa no-show por
-- asesor/servicio, tiempo medio solicitada→aprobada, quick vs discovery.
-- Si el jsonb se queda corto, promover a tabla agenda_eventos (mismo shape).

create extension if not exists btree_gist;

-- ── Asesores (humanos e IA como entidades del MISMO tipo) ───────────────────
create table if not exists public.agenda_asesores (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'a2a',
  slug text not null unique,                -- /reservar/[slug]
  tipo text not null check (tipo in ('humano','ia')),  -- cobertura IA de horarios: día 1
  nombre text not null,
  especialidad text not null default '',
  idiomas text[] not null default '{}',
  rating numeric(2,1),                      -- null = sin datos (no se inventa)
  bio text not null default '',
  zona_horaria text not null default 'America/Mexico_City',  -- IANA; las reglas de disponibilidad viven en ESTA zona
  duracion_default_min smallint not null default 30 check (duracion_default_min in (30,45,60)),
  buffer_min smallint not null default 10,
  activo boolean not null default true,
  datos jsonb not null default '{}',        -- extension point (recomendacion_ia, etc.)
  created_at timestamptz not null default now()
);
create index if not exists agenda_asesores_tenant_idx on public.agenda_asesores (tenant_id);
comment on table public.agenda_asesores is
  'Catálogo de asesores (humanos + IA) de Meeting Copilot. Escritor único: copilot server-side. Espejo del mock src/features/agenda/mock.ts.';

-- ── Disponibilidad recurrente (franjas por día de semana) ────────────────────
create table if not exists public.agenda_disponibilidad (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'a2a',
  asesor_id uuid not null references public.agenda_asesores(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),  -- 0=domingo
  hora_inicio time not null,                -- en la zona_horaria del ASESOR
  hora_fin time not null,
  unique (asesor_id, dia_semana, hora_inicio),
  check (hora_fin > hora_inicio)
);
comment on table public.agenda_disponibilidad is
  'Franjas recurrentes del asesor, en SU zona horaria. El motor de slots materializa a UTC por instante (DST correcto). Escritor único: copilot server-side.';

-- ── Excepciones (bloqueos puntuales y vacaciones) ────────────────────────────
create table if not exists public.agenda_excepciones (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'a2a',
  asesor_id uuid not null references public.agenda_asesores(id) on delete cascade,
  tipo text not null check (tipo in ('bloqueo','vacaciones')),
  desde timestamptz not null,
  hasta timestamptz not null,
  motivo text not null default '',
  check (hasta > desde)
);
comment on table public.agenda_excepciones is
  'Excepciones que anulan slots dentro de su rango. Escritor único: copilot server-side.';

-- ── Servicios (marketplace M5) ───────────────────────────────────────────────
create table if not exists public.agenda_servicios (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'a2a',
  slug text not null unique,
  nombre text not null,
  descripcion text not null default '',
  precio_centavos integer not null default 0,
  moneda text not null default 'MXN' check (moneda in ('MXN','USD')),
  duracion_min smallint not null check (duracion_min in (30,45,60)),
  session_depth text not null check (session_depth in ('quick','discovery')),  -- decisor: cliente hoy; inferencia IA = seam futuro
  requiere_pago boolean not null default false,  -- seam Polar: cobro previo a la aprobación
  activo boolean not null default true,
  orden smallint not null default 0,
  datos jsonb not null default '{}'
);
comment on table public.agenda_servicios is
  'Catálogo de servicios del marketplace: quick (sin fricción) vs discovery (intake que alimenta el brief). Escritor único: copilot server-side.';

-- ── Citas (núcleo; máquina de estados en src/features/agenda/types.ts) ──────
create table if not exists public.agenda_citas (
  id uuid primary key default gen_random_uuid(),
  cita_id text not null unique,             -- id legible (patrón lead_id)
  tenant_id text not null default 'a2a',
  asesor_id uuid not null references public.agenda_asesores(id),
  servicio_id uuid references public.agenda_servicios(id),
  lead_id text,                             -- liga SUAVE a leads.lead_id (sin FK: el seam CRM la resuelve)
  cliente_nombre text not null,
  cliente_email text not null default '',
  cliente_telefono text not null default '',  -- E.164 sin '+' (convención wa_id)
  participantes jsonb not null default '[]',  -- multi-persona lado cliente (UI MVP: uno)
  inicio timestamptz not null,
  fin timestamptz not null,
  estado text not null default 'solicitada' check (estado in
    ('solicitada','aprobada','rechazada','confirmada','en_curso','completada','cancelada','no_show')),
  session_depth text not null default 'quick' check (session_depth in ('quick','discovery')),
  pago_estado text not null default 'no_requerido' check (pago_estado in ('no_requerido','pendiente','pagado')),
    -- dimensión PARALELA al estado: 'pendiente' bloquea aprobar (regla en el dominio)
  brief jsonb,                              -- [{pregunta, respuesta}] del intake discovery
  resumen_ia_brief text,                    -- resumen IA para la prep del asesor (consumidor: bandeja/PrepAsesor)
  origen text not null default 'reserva_publica' check (origen in ('reserva_publica','manual')),
  reasignada_de uuid references public.agenda_asesores(id),  -- la reasignación es EVENTO, no estado
  historial jsonb not null default '[]',    -- [{de,a,evento,actor,at,detalle}] — auditoría completa
  datos jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fin > inicio),
  -- Anti doble-reserva REAL (lo que el mock no puede garantizar entre navegadores):
  constraint agenda_citas_sin_traslape exclude using gist (
    asesor_id with =,
    tstzrange(inicio, fin) with &&
  ) where (estado in ('solicitada','aprobada','confirmada','en_curso'))
);
create index if not exists agenda_citas_asesor_inicio_idx on public.agenda_citas (asesor_id, inicio);
create index if not exists agenda_citas_estado_idx on public.agenda_citas (estado);
create index if not exists agenda_citas_tenant_idx on public.agenda_citas (tenant_id);
comment on table public.agenda_citas is
  'Citas del agendamiento. Escritores por transición (ver cabecera): /api/reservar crea y reprograma; el asesor decide; el host-job notificador confirma. El historial jsonb es el registro de eventos auditable.';

-- ── Notificaciones (cola idempotente que procesa el host-job) ────────────────
create table if not exists public.agenda_notificaciones (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'a2a',
  cita_id uuid not null references public.agenda_citas(id) on delete cascade,
  canal text not null check (canal in ('email','whatsapp')),
  plantilla text not null check (plantilla in ('confirmacion_cita','reasignacion','rechazo','cancelacion')),
  destinatario text not null,
  cuerpo text not null default '',          -- mínimo: cliente, asesor, fecha/hora CON TZ, tipo de sesión, enlace reprogramar
  estado text not null default 'pendiente' check (estado in ('pendiente','enviada','error')),
  intentos smallint not null default 0,     -- el host-job se rinde a los 3 y deja evento en historial
  error text,
  creada_at timestamptz not null default now(),
  enviada_at timestamptz,
  unique (cita_id, canal, plantilla)        -- IDEMPOTENCIA: re-procesar jamás duplica envíos
);
create index if not exists agenda_notificaciones_pendientes_idx
  on public.agenda_notificaciones (estado) where estado = 'pendiente';
comment on table public.agenda_notificaciones is
  'Cola de confirmaciones. INSERT pendiente: copilot. pendiente→enviada|error: SOLO el host-job notificador (enviar-salientes.py + crm-canales). El frontend jamás llama a un canal.';

-- ── Enlaces de reserva (token de acceso a /reservar) ─────────────────────────
create table if not exists public.agenda_enlaces_reserva (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'a2a',
  token text not null unique,               -- en producción: firmado (HMAC) + expiración; validado en /api/reservar
  asesor_id uuid references public.agenda_asesores(id),
  servicio_id uuid references public.agenda_servicios(id),
  lead_id text,
  cliente jsonb,                            -- precarga {nombre, email, telefono}
  usos_max smallint not null default 1,
  usos smallint not null default 0,
  expira_at timestamptz,
  creado_at timestamptz not null default now()
);
comment on table public.agenda_enlaces_reserva is
  'Enlaces personalizados de reserva (un solo uso por default). Escritor único: copilot server-side; /api/reservar solo consume (usos+1).';

-- ── RLS: habilitada sin políticas (solo service_role) ────────────────────────
alter table public.agenda_asesores enable row level security;
alter table public.agenda_disponibilidad enable row level security;
alter table public.agenda_excepciones enable row level security;
alter table public.agenda_servicios enable row level security;
alter table public.agenda_citas enable row level security;
alter table public.agenda_notificaciones enable row level security;
alter table public.agenda_enlaces_reserva enable row level security;
