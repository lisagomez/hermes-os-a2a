-- supabase-buzon.sql — Buzón institucional operado por agentes (SPEC-buzon-a2a, HERALDO-6)
--
-- Crea: buzones, correos_entrantes, correos_salientes, buzon_bitacora, buzon_control.
-- Aplicar una vez; idempotente (create if not exists / drop+create donde toca).
-- NO aplicada a producción: validar primero en Postgres efímero (ver receta en
-- erp/migrations/README.md) y aplicar solo tras el gate del checklist de la SPEC §8.
-- Aplicación a prod: management API POST /v1/projects/{ref}/database/query, UA curl/8.0
-- (el MCP de Supabase está en read-only para DDL).
--
-- ESCRITOR ÚNICO (invariante, un escritor por tabla/columna):
--   buzones            → humano/admin vía UI /buzon/politicas (server-side). El agente
--                        JAMÁS crea buzones ni modifica modo_contraparte (SPEC §5.3).
--   correos_entrantes  → SOLO ingerir-entrantes.py (host-job con credenciales, origen 'buzon').
--   correos_salientes  → buzon-a2a escribe borrador/rechazado_gates/pendiente_aprobacion;
--                        la UI de A5 escribe aprobado/rechazado_humano/reportado_inyeccion;
--                        enviar-salientes.py escribe SOLO estado='enviado' (+enviado_en/mensaje_id).
--   buzon_bitacora     → append-only, cualquier host-job/servicio del buzón; NUNCA update/delete
--                        (triggers lo bloquean; ISO 27001 5.33).
--   buzon_control      → SOLO el Guardian (A6, admin) vía UI. Una sola fila.
--   aprobaciones_salientes (YA EXISTE, supabase-egcrm-herramientas.sql) → la firma de A5 del
--                        buzón INSERTA ahí con ruta='buzon/<correo_saliente_id>' + sha256 del
--                        cuerpo exacto. El motor no puede fabricarla: no tiene credenciales.
--
-- RLS: enable + FORCE, SIN políticas (SPEC §4.3). Solo service_role (BYPASSRLS) server-side
-- accede; el browser jamás toca estas tablas. FORCE añade que ni el owner las lea sin política.
--
-- Desviaciones deliberadas de la SPEC (registradas en PROGRESS-buzon-a2a.md):
--   tenant_id text (no uuid): coherencia con agenda_* (fase14) y leads/crm, tenant 'a2a'.

-- ---------------------------------------------------------------- buzones (SPEC §4.3)
create table if not exists public.buzones (
  id                 uuid        primary key default gen_random_uuid(),
  tenant_id          text        not null default 'a2a',
  direccion          text        not null,          -- ventas@miempresa.com
  proveedor          text        not null check (proveedor in ('m365', 'google', 'imap')),
  modo_contraparte   text        not null default 'abierto_cuarentena'
    check (modo_contraparte in ('cerrado', 'abierto_cuarentena', 'abierto')),
  clases_permitidas  jsonb       not null default '[]'::jsonb,  -- qué puede redactar el agente
  contrapartes       jsonb       not null default '[]'::jsonb,  -- allowlist direcciones/dominios (modo cerrado)
  dominios_enlaces   jsonb       not null default '[]'::jsonb,  -- dominios institucionales para urls_de_dominio
  cuota_hora         integer     not null default 10 check (cuota_hora > 0),
  cuota_hilo         integer     not null default 5  check (cuota_hilo > 0),
  aprobador_rol      text        not null default 'PM'
    check (aprobador_rol in ('PM', 'CEO', 'CFO')),  -- debe existir en aprobaciones_salientes.aprobado_por
  activo             boolean     not null default false,
  riesgo_firmado_por text,                          -- obligatorio si modo='abierto' (SGSI)
  riesgo_firmado_en  timestamptz,
  creado_en          timestamptz not null default now(),
  unique (tenant_id, direccion),
  -- modo 'abierto' exige firma de aceptación de riesgo (SPEC §4.1): sin firma no hay fila.
  constraint buzones_abierto_firmado check (
    modo_contraparte <> 'abierto'
    or (riesgo_firmado_por is not null and riesgo_firmado_en is not null)
  )
);

comment on table public.buzones is
  'Buzones de correo operados por agentes (SPEC-buzon-a2a §4.3). Escritor único: humano/admin '
  'vía /buzon/politicas. El agente jamás crea buzones ni cambia modo_contraparte. '
  'Política de contrapartes POR BUZÓN, no por organización.';
comment on column public.buzones.modo_contraparte is
  'cerrado = solo allowlist; abierto_cuarentena = desconocidos con restricciones duras (default); '
  'abierto = requiere firma de riesgo del responsable del SGSI (buzones_abierto_firmado).';

create index if not exists buzones_tenant_idx on public.buzones (tenant_id);

-- ------------------------------------------------------- correos_entrantes (SPEC §2.1)
create table if not exists public.correos_entrantes (
  id               uuid        primary key default gen_random_uuid(),
  buzon_id         uuid        not null references public.buzones (id),
  proveedor_id     text        not null,            -- id del mensaje en M365/Gmail/IMAP
  hilo_id          text        not null,            -- conversación; derivado de References/proveedor
  remitente        text        not null,
  destinatarios    jsonb       not null default '{}'::jsonb,   -- {to:[],cc:[]} originales
  asunto           text        not null default '',
  cuerpo_saneado   text        not null default '', -- SOLO texto saneado; el HTML crudo no se guarda
  saneado_meta     jsonb       not null default '{}'::jsonb,   -- qué se eliminó (marca visual en UI)
  hash_original    text        not null,            -- sha256 del cuerpo original (evidencia inmutable)
  dmarc_alineado   boolean     not null default false,
  remitente_conocido boolean   not null default false, -- ∈ contrapartes del buzón al ingerir
  adjuntos         jsonb       not null default '[]'::jsonb,   -- refs a Storage; el contenido NO entra
  recibido_en      timestamptz,
  ingerido_en      timestamptz not null default now(),
  unique (buzon_id, proveedor_id)                   -- idempotencia del ingest
);

comment on table public.correos_entrantes is
  'Correo entrante saneado (SPEC-buzon-a2a §2.1). Escritor único: ingerir-entrantes.py '
  '(host-job con credenciales). El agente solo LEE. unique(buzon_id, proveedor_id) hace el '
  'ingest idempotente. hash_original = sha256 del cuerpo crudo, evidencia inmutable.';

create index if not exists correos_entrantes_hilo_idx  on public.correos_entrantes (hilo_id);
create index if not exists correos_entrantes_buzon_idx on public.correos_entrantes (buzon_id, ingerido_en desc);

-- ------------------------------------------------------- correos_salientes (SPEC §2)
create table if not exists public.correos_salientes (
  id              uuid        primary key default gen_random_uuid(),
  buzon_id        uuid        not null references public.buzones (id),
  hilo_id         text        not null,
  en_respuesta_a  uuid        references public.correos_entrantes (id),
  destinatarios   jsonb       not null default '{}'::jsonb,  -- {to:[],cc:[]}; bcc prohibido (gate sin_bcc)
  asunto          text        not null default '',
  cuerpo          text        not null default '',
  cabeceras       jsonb       not null default '{}'::jsonb,  -- p.ej. Auto-Submitted
  adjuntos        jsonb       not null default '[]'::jsonb,  -- [{catalogo_id}] SOLO
  clase           text        not null default '',           -- ∈ buzones.clases_permitidas
  automatico      boolean     not null default false,
  estado          text        not null default 'borrador' check (estado in
    ('borrador',            -- recién redactado, gates aún no corridos
     'rechazado_gates',     -- gate CRÍTICO en rojo: no llega a la bandeja de A5
     'pendiente_aprobacion',-- en la bandeja de A5
     'aprobado',            -- A5 firmó (fila en aprobaciones_salientes); esperando envío
     'enviado',             -- SOLO enviar-salientes.py
     'rechazado_humano',    -- A5 rechazó
     'reportado_inyeccion'  -- A5 usó "Rechazar y reportar": va al corpus de regresión (§8)
    )),
  gates           jsonb       not null default '[]'::jsonb,  -- [{gate,paso,severidad,evidencia}]
  sha256          text        not null,                      -- del cuerpo exacto (la firma referencia esto)
  politica        jsonb       not null default '{}'::jsonb,  -- política aplicada (modo, clase, cuotas)
  historial       jsonb       not null default '[]'::jsonb,  -- [{de,a,evento,actor,at,detalle}]
  enviado_en      timestamptz,
  mensaje_id      text,                                      -- Message-Id SMTP del envío
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz
);

comment on table public.correos_salientes is
  'Borradores y salientes del buzón (SPEC-buzon-a2a §2). Escritores por transición: buzon-a2a '
  '(borrador/rechazado_gates/pendiente_aprobacion), UI de A5 (aprobado/rechazado_humano/'
  'reportado_inyeccion; la firma INSERTA en aprobaciones_salientes con ruta=buzon/<id>), '
  'enviar-salientes.py (enviado + enviado_en + mensaje_id, único con credenciales SMTP). '
  'sha256 es del cuerpo exacto: si el cuerpo cambia tras la firma, el gate 1 lo rechaza.';

create index if not exists correos_salientes_estado_idx on public.correos_salientes (estado)
  where estado in ('pendiente_aprobacion', 'aprobado');
create index if not exists correos_salientes_hilo_idx on public.correos_salientes (hilo_id);
create index if not exists correos_salientes_buzon_hora_idx
  on public.correos_salientes (buzon_id, enviado_en desc) where estado = 'enviado';

-- --------------------------------------------------------- buzon_bitacora (ISO 27001 5.33)
create table if not exists public.buzon_bitacora (
  id          bigint      generated always as identity primary key,
  ocurrido_en timestamptz not null default now(),
  actor       text        not null,   -- 'ingerir-entrantes' | 'buzon-a2a' | 'ui:<email>' | 'enviar-salientes' | 'guardian'
  evento      text        not null,   -- 'ingerido' | 'borrador' | 'gates' | 'firmado' | 'enviado' | 'rechazado' | 'pausa' | ...
  buzon_id    uuid,
  hilo_id     text,
  correo_id   uuid,
  detalle     jsonb       not null default '{}'::jsonb,
  hash_prev   text        not null default '',   -- hash_fila de la fila anterior (cadena)
  hash_fila   text        not null default ''    -- sha256(hash_prev || actor || evento || detalle)
);

comment on table public.buzon_bitacora is
  'Bitácora append-only del buzón con hash encadenado (ISO 27001 5.33, SPEC-buzon-a2a §7.2). '
  'Triggers bloquean UPDATE y DELETE: solo INSERT. Cada transición registra actor, política '
  'y resultado de gates (8.15).';

create index if not exists buzon_bitacora_hilo_idx  on public.buzon_bitacora (hilo_id);
create index if not exists buzon_bitacora_fecha_idx on public.buzon_bitacora (ocurrido_en desc);

create or replace function public.buzon_bitacora_solo_append()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'buzon_bitacora es append-only: % prohibido', tg_op;
end;
$$;

revoke execute on function public.buzon_bitacora_solo_append() from public;

drop trigger if exists buzon_bitacora_no_update on public.buzon_bitacora;
create trigger buzon_bitacora_no_update
  before update or delete on public.buzon_bitacora
  for each row execute function public.buzon_bitacora_solo_append();

-- ------------------------------------------------------------- buzon_control (Guardian A6)
create table if not exists public.buzon_control (
  id              smallint    primary key default 1 check (id = 1),  -- una sola fila
  pausa_global    boolean     not null default false,
  actualizado_por text        not null default '',
  actualizado_en  timestamptz not null default now()
);

comment on table public.buzon_control is
  'Interruptor global del Guardian (A6, SPEC-buzon-a2a §1). pausa_global=true → gate '
  'cuota_por_buzon en rojo → nada sale. Escritor único: admin vía UI. Una sola fila (id=1).';

insert into public.buzon_control (id, pausa_global)
  values (1, false)
  on conflict (id) do nothing;

-- ------------------------------------------------------------------------------- RLS
-- enable + FORCE, sin políticas: nadie salvo service_role (BYPASSRLS) toca estas tablas.
alter table public.buzones           enable row level security;
alter table public.buzones           force  row level security;
alter table public.correos_entrantes enable row level security;
alter table public.correos_entrantes force  row level security;
alter table public.correos_salientes enable row level security;
alter table public.correos_salientes force  row level security;
alter table public.buzon_bitacora    enable row level security;
alter table public.buzon_bitacora    force  row level security;
alter table public.buzon_control     enable row level security;
alter table public.buzon_control     force  row level security;

-- -------------------------------------------------------------------- vista de operación
-- Pendientes por aprobar por buzón: el badge del launcher y la bandeja de A5 leen esto
-- server-side. security_invoker + revoke: el browser no la ve.
drop view if exists public.v_buzon_pendientes;
create view public.v_buzon_pendientes with (security_invoker = true) as
  select b.id as buzon_id, b.direccion, count(s.id) as pendientes
  from public.buzones b
  left join public.correos_salientes s
    on s.buzon_id = b.id and s.estado = 'pendiente_aprobacion'
  group by b.id, b.direccion;

revoke all on public.v_buzon_pendientes from anon, authenticated;
