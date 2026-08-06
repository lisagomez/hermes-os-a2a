-- ============================================================================
--  supabase-organizaciones.sql — Capa de tenencia
--  DISEÑADO, SIN APLICAR. Se corre primero en Postgres efímero (ver README).
--
--  Idempotente: puede ejecutarse varias veces sin efecto adicional.
--  Aditivo: no borra ni renombra nada existente.
--
--  Orden obligatorio: bloques 1 → 7. El bloque 5 (NOT NULL) NO puede correrse
--  antes del 4 (backfill), y el 6 (RLS) no debe activarse antes de que el
--  punto único de acceso de la aplicación fije app.tenant_id.
-- ============================================================================

begin;

-- ============================================================================
-- BLOQUE 1 · Esquema de control
-- ============================================================================

create schema if not exists app;

-- Registro de qué tablas participan en la tenencia. Esta tabla es el contrato:
-- la suite de pruebas la lee para saber qué verificar. Una tabla de negocio que
-- no esté aquí NI en app.tablas_globales hace fallar la prueba meta.
create table if not exists app.tablas_tenant (
  esquema     text not null default 'public',
  tabla       text not null,
  migrada_en  timestamptz,
  primary key (esquema, tabla)
);

-- Tablas deliberadamente SIN tenant_id. Datos de referencia compartidos por
-- todos los tenants. Declararlas explícitamente evita que "se me olvidó" y
-- "es global a propósito" se confundan.
create table if not exists app.tablas_globales (
  esquema     text not null default 'public',
  tabla       text not null,
  motivo      text not null,
  primary key (esquema, tabla)
);

-- Tablas que SÍ tienen tenencia, pero implementada por OTRO mecanismo que no es
-- el `tenant_id uuid` de este archivo. No son globales (no son referencia
-- compartida) y no pueden entrar a app.tablas_tenant (su columna ya existe con
-- otro tipo, o su unidad de aislamiento no es la organización).
--
-- Existe porque en este proyecto conviven TRES modelos de tenencia:
--   slug_text — 17 tablas YA en producción llevan `tenant_id text`, casi todas
--               con `default 'a2a'`: agendamiento (fase 14), buzón, guardia de
--               presupuesto, CRM marca blanca y sla_por_etapa. Es la convención
--               de facto del repo, no un descuido: supabase-guardia-presupuesto
--               .sql (líneas 14-19) la razona explícitamente — "tenant_id TEXT
--               (no uuid como propone el doc origen)" — y supabase-buzon.sql
--               (línea 28) la sigue "por coherencia con agenda_* y leads/crm".
--               El puente con esta capa es el SLUG (bloque 7 y prueba T12).
--   auth_uid  — la cabina control-interno aísla por usuario (auth.uid()) con sus
--               propias políticas. Su unidad no es la organización.
--   (el ERP, cuarto modelo, vive en el esquema `erp` y queda fuera de alcance:
--    usa app.cliente_id + rol_exe_fin, ver businessos/erp/migrations/004.)
--
-- `columna`/`tipo` son opcionales: se declaran cuando la tenencia vive en UNA
-- columna concreta, y entonces la prueba T11 verifica que siga existiendo con
-- ese tipo. Sin eso, un `alter column ... type uuid` futuro dejaría el registro
-- mintiendo en silencio.
create table if not exists app.tablas_tenant_ajeno (
  esquema     text not null default 'public',
  tabla       text not null,
  mecanismo   text not null
              check (mecanismo in ('slug_text','auth_uid','plataforma')),
  columna     text,
  tipo        text,
  motivo      text not null,
  primary key (esquema, tabla)
);

-- ============================================================================
-- BLOQUE 2 · Identidad y organizaciones
-- ============================================================================

create table if not exists usuarios (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  nombre     text,
  creado_en  timestamptz not null default now()
);
create unique index if not exists usuarios_email_uk on usuarios (lower(email));

create table if not exists organizaciones (
  id              uuid primary key default gen_random_uuid(),
  tipo            text not null
                  check (tipo in ('socio','tenant','personal')),
  canal           text not null default 'b2b'
                  check (canal in ('b2b','b2c')),
  socio_id        uuid references organizaciones(id),
  slug            text not null,
  nombre          text not null,
  estado          text not null default 'solicitado'
                  check (estado in ('solicitado','aprobado','aprovisionando',
                                    'activo','suspendido','archivado')),
  plan            text not null default 'arranque'
                  check (plan in ('arranque','profesional','regulado')),
  aislamiento     text not null default 'pool'
                  check (aislamiento in ('pool','silo')),
  alta_automatica boolean not null default false,
  marca           jsonb  not null default '{}'::jsonb,
  cuota           jsonb  not null default '{}'::jsonb,
  region_dato     text   not null default 'eu',
  creado_en       timestamptz not null default now(),
  activado_en     timestamptz,
  convertida_en   timestamptz,
  -- Un socio no cuelga de otro socio: la jerarquía tiene exactamente 2 niveles.
  constraint socio_sin_padre check (tipo <> 'socio' or socio_id is null),
  -- Una organización personal tiene siempre canal b2c y nunca socio.
  constraint personal_es_b2c
    check (tipo <> 'personal' or (canal = 'b2c' and socio_id is null))
);
create unique index if not exists organizaciones_slug_uk on organizaciones (lower(slug));
create index if not exists organizaciones_socio_ix on organizaciones (socio_id)
  where socio_id is not null;

create table if not exists membresias (
  organizacion_id uuid not null references organizaciones(id) on delete cascade,
  usuario_id      uuid not null references usuarios(id) on delete cascade,
  rol             text not null
                  check (rol in ('propietario','admin','operador','asesor','lector')),
  invitado_por    uuid references usuarios(id),
  invitado_en     timestamptz not null default now(),
  aceptado_en     timestamptz,
  revocado_en     timestamptz,
  primary key (organizacion_id, usuario_id)
);
create index if not exists membresias_usuario_ix on membresias (usuario_id)
  where revocado_en is null;

create table if not exists org_bitacora (
  id              bigserial primary key,
  organizacion_id uuid not null references organizaciones(id),
  actor           text not null,
  accion          text not null,
  de_estado       text,
  a_estado        text,
  detalle         jsonb not null default '{}'::jsonb,
  ocurrio_en      timestamptz not null default now()
);
create index if not exists org_bitacora_org_ix on org_bitacora (organizacion_id, ocurrio_en desc);

-- ── Invariante: una organización activa nunca se queda sin propietario ──────
create or replace function app.exigir_propietario() returns trigger
language plpgsql as $$
declare n int;
begin
  select count(*) into n
    from membresias m
    join organizaciones o on o.id = m.organizacion_id
   where m.organizacion_id = coalesce(old.organizacion_id, new.organizacion_id)
     and m.rol = 'propietario'
     and m.revocado_en is null
     and o.estado not in ('archivado');
  if n = 0 then
    raise exception 'La organización quedaría sin propietario activo';
  end if;
  return null;
end $$;

drop trigger if exists trg_exigir_propietario on membresias;
create constraint trigger trg_exigir_propietario
  after update or delete on membresias
  deferrable initially deferred
  for each row execute function app.exigir_propietario();

-- ============================================================================
-- BLOQUE 3 · Resolución del tenant actual
--
--  Un solo lugar. Si esta función aparece duplicada en otro archivo, una de
--  las dos ya divergió.
--  Precedencia: GUC de sesión (agentes, puente cli_fin) → claim del JWT (web).
-- ============================================================================

create or replace function app.tenant_actual() returns uuid
language plpgsql stable as $$
declare v text;
begin
  v := nullif(current_setting('app.tenant_id', true), '');
  if v is not null then return v::uuid; end if;

  begin
    v := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'org_id', '');
  exception when others then
    v := null;
  end;
  return v::uuid;   -- null si no hay contexto: las políticas niegan todo
end $$;

-- ============================================================================
-- BLOQUE 4 · tenant_id en las tablas de negocio — PASO 1: agregar y poblar
--
--  ⚠ Rellena app.tablas_tenant y app.tablas_globales con los nombres REALES
--    antes de correr esto. Para enumerarlos:
--
--      select table_name from information_schema.tables
--       where table_schema = 'public' and table_type = 'BASE TABLE'
--       order by 1;
-- ============================================================================

-- Las 71 tablas de `public` clasificadas (enumeradas contra el esquema real
-- reconstruido por businessos/tenancy/replay.sh, no a ojo). Reparto:
--   27 tenant · 4 globales · 8 de tenencia ajena · 32 de la cabina interna.
-- La prueba T5 falla si aparece una tabla nueva sin clasificar.

insert into app.tablas_tenant (tabla) values
  -- Buzón agéntico
  ('buzon_bitacora'), ('buzon_falsos_positivos'),
  ('buzon_relajamientos'), ('buzon_verificaciones'),
  ('correos_entrantes'), ('correos_salientes'),
  -- Dinero y contratos
  ('cobros'), ('contratos'), ('contratos_sc'), ('facturas'),
  -- Adquisición
  ('leads'), ('lead_enriquecimiento'), ('enriquecimiento_intento'),
  -- Operación
  ('tareas'), ('tareas_reunion'), ('transcripciones'),
  ('aprobaciones_salientes')
on conflict do nothing;

insert into app.tablas_globales (tabla, motivo) values
  ('reglas',
   'Grafo regulatorio: conocimiento jurisdiccional compartido. OJO: no vive en '
   'este proyecto sino en el Postgres propio del grafo; se declara aquí para '
   'dejar escrito que su ausencia de tenant_id es deliberada.'),
  ('usuarios',
   'Identidad global; la autorización vive en membresias'),
  ('contraparte_69b',
   'Listado 69-B del SAT: dato público idéntico para todos los tenants '
   '(~14.055 RFCs). Copiarlo por tenant sería duplicar el DOF.'),
  ('override_69b',
   'Excepciones de plataforma sobre el listado del SAT, decididas por la casa, '
   'no por un cliente.'),
  ('dominio_patron',
   'Patrones de dominio aprendidos por el enriquecedor: heurística compartida.'),
  ('pantheon',
   'Snapshot de configuración de modelos por vertical: estado de la plataforma.'),
  ('buzon_control',
   'SINGLETON por diseño: check (id = 1) y PK sobre id, una sola fila en toda '
   'la tabla. No puede haber una por tenant — ponerle tenant_id NOT NULL la '
   'volvería imposible de usar con dos organizaciones. Si el buzón llega a '
   'necesitar control por tenant, el cambio es suyo (quitar el check), no de '
   'esta capa.')
on conflict do nothing;

insert into app.tablas_tenant_ajeno (tabla, mecanismo, columna, tipo, motivo) values
  -- ── Agendamiento (fase 14): tenant_id text not null default 'a2a' ─────────
  ('agenda_asesores',       'slug_text', 'tenant_id', 'text', 'Agendamiento fase 14.'),
  ('agenda_citas',          'slug_text', 'tenant_id', 'text', 'Agendamiento fase 14.'),
  ('agenda_disponibilidad', 'slug_text', 'tenant_id', 'text', 'Agendamiento fase 14.'),
  ('agenda_enlaces_reserva','slug_text', 'tenant_id', 'text', 'Agendamiento fase 14.'),
  ('agenda_excepciones',    'slug_text', 'tenant_id', 'text', 'Agendamiento fase 14.'),
  ('agenda_notificaciones', 'slug_text', 'tenant_id', 'text', 'Agendamiento fase 14.'),
  ('agenda_servicios',      'slug_text', 'tenant_id', 'text', 'Agendamiento fase 14.'),
  -- ── Buzón agéntico y guardia de presupuesto ───────────────────────────────
  ('buzones',        'slug_text', 'tenant_id', 'text',
   'supabase-buzon.sql:28 elige text "por coherencia con agenda_* y leads/crm".'),
  ('presupuestos_ia','slug_text', 'tenant_id', 'text',
   'Límite de gasto por tenant de la guardia de presupuesto.'),
  -- ── CRM marca blanca: tenant_id TEXT (slug de crm_tenants) ────────────────
  ('crm_tenants',        'slug_text', 'tenant_id', 'text',
   'Registro de tenants del CRM. Su PK ES el slug.'),
  ('crm_contactos',      'slug_text', 'tenant_id', 'text', 'FK a crm_tenants.'),
  ('crm_conversaciones', 'slug_text', 'tenant_id', 'text', 'FK a crm_tenants.'),
  ('crm_mensajes',       'slug_text', 'tenant_id', 'text', 'FK a crm_tenants.'),
  ('crm_supervision',    'slug_text', 'tenant_id', 'text', 'FK a crm_tenants.'),
  ('crm_expedientes',    'slug_text', 'tenant_id', 'text', 'FK a crm_tenants.'),
  ('sla_por_etapa',      'slug_text', 'tenant_id', 'text',
   'Configuración de SLA por tenant del CRM.'),
  ('token_usage',        'slug_text', 'tenant_id', 'text',
   'Ledger de gasto. Columna NULLABLE a propósito: null = gasto de la casa '
   '(verticales, trío). El bloque 7 la puentea a organizaciones por slug.'),
  -- ── Cabina control-interno: aísla por usuario, no por organización ────────
  ('profiles', 'auth_uid', 'id', 'uuid',
   'PELIGRO: `profiles` la escribe el trigger handle_new_user sobre auth.users. '
   'Añadirle tenant_id NOT NULL rompe el alta de usuarios de TODO A2ABot '
   '(cuasi-incidente del 2026-07-15). No tocar sin migrar antes el trigger.'),
  ('activities','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('agents','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('calendar_events','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('calendar_sources','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('calendar_sync_state','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('chat_messages','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('chat_sessions','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('conversations','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('documents','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('draw','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('draw_assets','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('draw_comments','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('draw_folders','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('draw_ops_log','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('finance_accounts','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('finance_movements','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('finance_recurring','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('finance_snapshots','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('labels','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('login_attempts','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('message_attachments','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('messages','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('notifications','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('ops_events','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('push_subscriptions','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('saved_views','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('task_assignees','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('task_calendar_links','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('task_labels','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('task_relations','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).'),
  ('tasks','auth_uid',null,null,'Cabina control-interno (RLS por auth.uid()).')
on conflict do nothing;

-- ── GUARDA · colisión de columna ────────────────────────────────────────────
-- Si una tabla de app.tablas_tenant YA tiene una columna `tenant_id` de otro
-- tipo, `add column if not exists` es un no-op SILENCIOSO y el error real
-- aparece tres bloques después como un incomprensible "incompatible types:
-- text and uuid". Aquí falla de inmediato, con nombre y tipo.
do $$
declare choque text;
begin
  select string_agg(format('%s.%s (tenant_id %s)', c.table_schema, c.table_name,
                           c.data_type), '; ')
    into choque
    from information_schema.columns c
    join app.tablas_tenant t
      on t.esquema = c.table_schema and t.tabla = c.table_name
   where c.column_name = 'tenant_id' and c.data_type <> 'uuid';

  if choque is not null then
    raise exception
      'Colisión de tenencia: % ya tiene tenant_id de otro tipo. Esa tabla '
      'pertenece a app.tablas_tenant_ajeno, no a app.tablas_tenant.', choque;
  end if;
end $$;

-- Organización interna: destino del backfill. Slug fijo, idempotente.
insert into organizaciones (tipo, canal, slug, nombre, estado, plan, activado_en)
values ('tenant', 'b2b', 'hermes-interno', 'Hermes OS (interno)', 'activo', 'regulado', now())
on conflict (lower(slug)) do nothing;

-- Agregar la columna NULLABLE y poblarla. Sin default: en PG11+ es instantáneo
-- y no reescribe la tabla.
do $$
declare r record; org uuid;
begin
  select id into org from organizaciones where slug = 'hermes-interno';

  for r in select esquema, tabla from app.tablas_tenant loop
    execute format(
      'alter table %I.%I add column if not exists tenant_id uuid', r.esquema, r.tabla);
    execute format(
      'update %I.%I set tenant_id = %L where tenant_id is null', r.esquema, r.tabla, org);
    execute format(
      'create index if not exists %I on %I.%I (tenant_id)',
      r.tabla || '_tenant_ix', r.esquema, r.tabla);
  end loop;
end $$;

-- ============================================================================
-- BLOQUE 5 · tenant_id — PASO 2: NOT NULL sin bloquear la tabla
--
--  `set not null` directo exige un escaneo completo con bloqueo ACCESS EXCLUSIVE.
--  El rodeo: constraint NOT VALID (instantáneo) → validate (bloqueo suave) →
--  set not null (que reconoce la constraint y ya no escanea) → soltar constraint.
--  Con tus volúmenes actuales da igual; con datos de clientes, no.
-- ============================================================================

--  Idempotencia: ni `set not null` ni `add constraint ... foreign key` admiten
--  `if not exists`. En la segunda corrida el NOT NULL es inofensivo (ya lo
--  está) pero la FK aborta con "constraint already exists" y tumba la
--  transacción entera. Cada paso se pregunta primero si hace falta.
do $$
declare r record; c text; ya_nn boolean; ya_fk boolean;
begin
  for r in select esquema, tabla from app.tablas_tenant loop
    select attnotnull into ya_nn
      from pg_attribute
     where attrelid = format('%I.%I', r.esquema, r.tabla)::regclass
       and attname = 'tenant_id' and attnum > 0;

    if not ya_nn then
      c := r.tabla || '_tenant_nn';
      execute format(
        'alter table %I.%I add constraint %I check (tenant_id is not null) not valid',
        r.esquema, r.tabla, c);
      execute format('alter table %I.%I validate constraint %I', r.esquema, r.tabla, c);
      execute format('alter table %I.%I alter column tenant_id set not null',
        r.esquema, r.tabla);
      execute format('alter table %I.%I drop constraint %I', r.esquema, r.tabla, c);
    end if;

    select exists (
      select 1 from pg_constraint
       where conrelid = format('%I.%I', r.esquema, r.tabla)::regclass
         and conname = r.tabla || '_tenant_fk')
      into ya_fk;

    if not ya_fk then
      execute format(
        'alter table %I.%I add constraint %I foreign key (tenant_id)
           references organizaciones(id)',
        r.esquema, r.tabla, r.tabla || '_tenant_fk');
    end if;

    update app.tablas_tenant set migrada_en = coalesce(migrada_en, now())
     where esquema = r.esquema and tabla = r.tabla;
  end loop;
end $$;

-- ============================================================================
-- BLOQUE 6 · RLS
--
--  ⚠ GOTCHA DE SUPABASE — el más importante de este archivo:
--    `service_role` tiene BYPASSRLS. Estas políticas NO lo detienen.
--    Si la aplicación sigue conectando como service_role, el aislamiento vive
--    solo en el código y este bloque es decorativo.
--    La app y los agentes deben conectar como app_tenant (o hacer SET ROLE),
--    igual que el puente cli_fin ya hace para el ERP.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_tenant') then
    create role app_tenant nologin nobypassrls;
  end if;
end $$;

do $$
declare r record;
begin
  for r in select esquema, tabla from app.tablas_tenant loop
    execute format('alter table %I.%I enable row level security', r.esquema, r.tabla);
    execute format('alter table %I.%I force  row level security', r.esquema, r.tabla);
    execute format('drop policy if exists tenant_aislado on %I.%I', r.esquema, r.tabla);
    execute format($p$
      create policy tenant_aislado on %I.%I
        for all to app_tenant
        using      (tenant_id = app.tenant_actual())
        with check  (tenant_id = app.tenant_actual())
    $p$, r.esquema, r.tabla);
    execute format('grant select, insert, update, delete on %I.%I to app_tenant',
      r.esquema, r.tabla);
  end loop;
end $$;

-- `using` filtra lo que se lee; `with check` impide escribir en otro tenant.
-- Sin `with check`, un insert con tenant_id ajeno pasa sin ruido.

alter table organizaciones enable row level security;
alter table organizaciones force  row level security;
drop policy if exists org_propia on organizaciones;
create policy org_propia on organizaciones
  for select to app_tenant
  using (id = app.tenant_actual()
         or socio_id = app.tenant_actual());   -- el socio ve la ficha, no el dato

alter table membresias enable row level security;
alter table membresias force  row level security;
drop policy if exists membresia_propia on membresias;
create policy membresia_propia on membresias
  for all to app_tenant
  using (organizacion_id = app.tenant_actual())
  with check (organizacion_id = app.tenant_actual());

grant usage on schema app, public to app_tenant;
grant select on organizaciones to app_tenant;

-- El registro de clasificación es METADATO (nombres de tabla), no dato de
-- ningún cliente: app_tenant necesita leerlo para que la suite pueda recorrerlo
-- ya con el rol puesto. Sin esto, cualquier consulta al registro bajo el rol de
-- la aplicación muere con "permission denied for table tablas_tenant".
grant select on app.tablas_tenant, app.tablas_globales, app.tablas_tenant_ajeno
  to app_tenant;

-- ============================================================================
-- BLOQUE 7 · Vista de margen por tenant (habilita el §8 de la arquitectura)
-- ============================================================================

-- El puente CRM↔organizaciones vive aquí, en una sola línea de JOIN.
--
-- `token_usage.tenant_id` es TEXT y guarda el slug del tenant del CRM: decisión
-- explícita de supabase-guardia-presupuesto.sql, tomada cuando el ledger llegó
-- antes que esta capa. Unirlo por `= o.id` (uuid) es imposible, y convertir la
-- columna obligaría a cambiar CancioBot y la guardia, que consultan por slug.
-- El slug ES la llave natural que ya comparten los dos mundos.
--
-- `lower()` en ambos lados NO es decorativo: organizaciones.slug es único por
-- lower(slug), pero crm_tenants.tenant_id es un text PK sin normalizar. Sin
-- esto, 'Acme' y 'acme' serían tenants distintos para el CRM y el mismo para
-- organizaciones — una fuga de costo entre clientes.
--
-- Las filas con tenant_id null (gasto de la casa: verticales, trío) quedan
-- fuera por ser un join interno, que es lo correcto: no son de ningún cliente.
create or replace view v_margen_tenant as
select o.id            as tenant_id,
       o.nombre,
       o.plan,
       date_trunc('month', t.created_at) as mes,
       sum(t.costo_usd) as costo_medido
  from organizaciones o
  join token_usage t on lower(t.tenant_id) = lower(o.slug)
 group by 1,2,3,4;

commit;

-- ============================================================================
-- REVERSIÓN (solo válida antes de que exista un segundo tenant)
-- ============================================================================
-- do $$ declare r record; begin
--   for r in select esquema, tabla from app.tablas_tenant loop
--     execute format('alter table %I.%I disable row level security', r.esquema, r.tabla);
--     execute format('drop policy if exists tenant_aislado on %I.%I', r.esquema, r.tabla);
--     execute format('alter table %I.%I drop column if exists tenant_id', r.esquema, r.tabla);
--   end loop;
-- end $$;
-- drop table if exists org_bitacora, membresias, organizaciones, usuarios cascade;
-- drop schema if exists app cascade;
