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

insert into app.tablas_tenant (tabla) values
  ('leads'), ('tareas'), ('facturas'), ('contratos_sc'), ('token_usage')
  -- ... completar con las 22 reales: crm_*, erp.*, agendamiento M1–M5, reuniones
on conflict do nothing;

insert into app.tablas_globales (tabla, motivo) values
  ('reglas',   'Grafo regulatorio: conocimiento jurisdiccional compartido'),
  ('usuarios', 'Identidad global; la autorización vive en membresias')
on conflict do nothing;

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

do $$
declare r record; c text;
begin
  for r in select esquema, tabla from app.tablas_tenant loop
    c := r.tabla || '_tenant_nn';
    execute format(
      'alter table %I.%I add constraint %I check (tenant_id is not null) not valid',
      r.esquema, r.tabla, c);
    execute format('alter table %I.%I validate constraint %I', r.esquema, r.tabla, c);
    execute format('alter table %I.%I alter column tenant_id set not null',
      r.esquema, r.tabla);
    execute format('alter table %I.%I drop constraint %I', r.esquema, r.tabla, c);
    execute format(
      'alter table %I.%I add constraint %I foreign key (tenant_id)
         references organizaciones(id)',
      r.esquema, r.tabla, r.tabla || '_tenant_fk');
    update app.tablas_tenant set migrada_en = now()
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

-- ============================================================================
-- BLOQUE 7 · Vista de margen por tenant (habilita el §8 de la arquitectura)
-- ============================================================================

create or replace view v_margen_tenant as
select o.id            as tenant_id,
       o.nombre,
       o.plan,
       date_trunc('month', t.creado_en) as mes,
       sum(t.costo_usd) as costo_medido
  from organizaciones o
  join token_usage t on t.tenant_id = o.id
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
