-- ============================================================================
--  test-aislamiento-tenants.sql — Suite de aislamiento
--
--  Corre en Postgres efímero, DESPUÉS de supabase-organizaciones.sql.
--  Falla ruidosamente: cualquier aserción rota aborta con exit ≠ 0.
--
--      docker run -d --name pg-prueba -e POSTGRES_PASSWORD=x postgres:16-alpine
--      psql "$URI" -v ON_ERROR_STOP=1 -f supabase-organizaciones.sql
--      psql "$URI" -v ON_ERROR_STOP=1 -f test-aislamiento-tenants.sql
--
--  Filosofía: igual que la prueba de opacidad de grafo-a2a y el simulacro de
--  revocación de Fabric — lo que importa es que FALLE cuando debe fallar.
--  Las pruebas T5–T8 son las valiosas: no verifican el estado de hoy, sino que
--  se rompen sola cuando alguien introduzca una regresión mañana.
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

create or replace function app.assert(cond boolean, msg text)
returns void language plpgsql as $$
begin
  if not cond then raise exception 'FALLO: %', msg; end if;
end $$;

-- ============================================================================
-- SIEMBRA · dos tenants con datos IDÉNTICOS
--
--  Idénticos a propósito: si una consulta cruza, el resultado se ve plausible
--  y no llama la atención. Ese es exactamente el modo de falla que queremos
--  que la prueba atrape, no uno obvio.
-- ============================================================================

do $$
declare a uuid; b uuid; r record;
begin
  insert into organizaciones (tipo, canal, slug, nombre, estado)
  values ('tenant','b2b','acme','Acme','activo'),
         ('tenant','b2b','globex','Globex','activo')
  on conflict do nothing;

  select id into a from organizaciones where slug = 'acme';
  select id into b from organizaciones where slug = 'globex';

  for r in select esquema, tabla from app.tablas_tenant loop
    -- Inserta una fila mínima por tenant. Ajustar si hay columnas NOT NULL
    -- adicionales en las tablas reales.
    execute format('insert into %I.%I (tenant_id) values (%L), (%L)',
                   r.esquema, r.tabla, a, b);
  end loop;
end $$;

-- ============================================================================
-- T1 · Lectura aislada — cada tenant solo ve lo suyo
-- ============================================================================

do $$
declare a uuid; b uuid; r record; n_ajenas bigint; total bigint;
begin
  select id into a from organizaciones where slug = 'acme';
  select id into b from organizaciones where slug = 'globex';

  set local role app_tenant;
  perform set_config('app.tenant_id', a::text, true);

  for r in select esquema, tabla from app.tablas_tenant loop
    execute format('select count(*) from %I.%I where tenant_id <> %L',
                   r.esquema, r.tabla, a) into n_ajenas;
    perform app.assert(n_ajenas = 0,
      format('%s.%s devolvió %s filas de otro tenant', r.esquema, r.tabla, n_ajenas));

    execute format('select count(*) from %I.%I', r.esquema, r.tabla) into total;
    perform app.assert(total > 0,
      format('%s.%s devolvió 0 filas: la política niega de más (falso positivo)',
             r.esquema, r.tabla));
  end loop;
  reset role;
end $$;

-- La segunda aserción es el control positivo. Sin ella, una política que niega
-- TODO pasaría la prueba con honores.

-- ============================================================================
-- T2 · Escritura cruzada rechazada (with check)
-- ============================================================================

do $$
declare a uuid; b uuid; ok boolean := false;
begin
  select id into a from organizaciones where slug = 'acme';
  select id into b from organizaciones where slug = 'globex';

  set local role app_tenant;
  perform set_config('app.tenant_id', a::text, true);
  begin
    execute format('insert into leads (tenant_id) values (%L)', b);
  exception when others then
    ok := true;
  end;
  reset role;
  perform app.assert(ok, 'Se permitió INSERT con tenant_id ajeno: falta with check');
end $$;

-- ============================================================================
-- T3 · Una fila no puede migrar de tenant
-- ============================================================================

do $$
declare a uuid; b uuid; movidas bigint;
begin
  select id into a from organizaciones where slug = 'acme';
  select id into b from organizaciones where slug = 'globex';

  set local role app_tenant;
  perform set_config('app.tenant_id', a::text, true);
  begin
    execute format('update leads set tenant_id = %L where tenant_id = %L', b, a);
  exception when others then
    null;   -- rechazo explícito también es correcto
  end;
  reset role;

  select count(*) into movidas from leads where tenant_id = b;
  perform app.assert(movidas = 1, 'Un UPDATE movió filas entre tenants');
end $$;

-- ============================================================================
-- T4 · Sin contexto no se ve nada (fail-closed)
-- ============================================================================

do $$
declare n bigint;
begin
  set local role app_tenant;
  perform set_config('app.tenant_id', '', true);
  execute 'select count(*) from leads' into n;
  reset role;
  perform app.assert(n = 0,
    'Sin app.tenant_id se devolvieron filas: la política NO es fail-closed');
end $$;

-- Este es el caso del escape AUTH_DISABLED. Si aquí devuelve filas, un .env
-- mal copiado en producción expone todos los tenants a la vez.

-- ============================================================================
-- T5 · META — ninguna tabla de negocio sin clasificar
--
--  La prueba que más rinde. Se rompe sola el día que alguien agregue una tabla
--  y olvide el tenant_id. Nadie tiene que acordarse de actualizar nada.
-- ============================================================================

do $$
declare huerfanas text;
begin
  select string_agg(t.table_name, ', ') into huerfanas
    from information_schema.tables t
   where t.table_schema = 'public'
     and t.table_type = 'BASE TABLE'
     and t.table_name not in ('organizaciones','membresias','org_bitacora','usuarios')
     and not exists (select 1 from app.tablas_tenant   x
                      where x.esquema = t.table_schema and x.tabla = t.table_name)
     and not exists (select 1 from app.tablas_globales g
                      where g.esquema = t.table_schema and g.tabla = t.table_name);

  perform app.assert(huerfanas is null,
    format('Tablas sin clasificar como tenant ni global: %s. '
           'Agrégalas a app.tablas_tenant o justifícalas en app.tablas_globales',
           huerfanas));
end $$;

-- ============================================================================
-- T6 · META — RLS habilitada, forzada y con política en toda tabla de tenant
-- ============================================================================

do $$
declare r record;
begin
  for r in select esquema, tabla from app.tablas_tenant loop
    perform app.assert(
      (select relrowsecurity from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = r.esquema and c.relname = r.tabla),
      format('%s.%s sin RLS habilitada', r.esquema, r.tabla));

    perform app.assert(
      (select relforcerowsecurity from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = r.esquema and c.relname = r.tabla),
      format('%s.%s sin FORCE: el dueño de la tabla evade la política',
             r.esquema, r.tabla));

    perform app.assert(
      (select count(*) from pg_policies p
        where p.schemaname = r.esquema and p.tablename = r.tabla) > 0,
      format('%s.%s con RLS pero sin políticas: nadie puede leer', r.esquema, r.tabla));
  end loop;
end $$;

-- ============================================================================
-- T7 · META — el rol de la aplicación no evade RLS
-- ============================================================================

do $$
begin
  perform app.assert(
    not (select rolbypassrls from pg_roles where rolname = 'app_tenant'),
    'app_tenant tiene BYPASSRLS: las políticas no lo detienen');

  perform app.assert(
    not (select rolsuper from pg_roles where rolname = 'app_tenant'),
    'app_tenant es superusuario: evade todo');
end $$;

-- En Supabase, service_role SÍ tiene BYPASSRLS. Esta prueba no lo cubre porque
-- no debe: la regla es que la aplicación NO conecte como service_role. Verificar
-- eso es responsabilidad de una prueba del lado de la app, no de la base.

-- ============================================================================
-- T8 · META — toda tabla de tenant tiene índice y FK sobre tenant_id
-- ============================================================================

do $$
declare r record;
begin
  for r in select esquema, tabla from app.tablas_tenant loop
    perform app.assert(
      (select count(*) from pg_indexes
        where schemaname = r.esquema and tablename = r.tabla
          and indexdef like '%tenant_id%') > 0,
      format('%s.%s sin índice en tenant_id: cada consulta escanea todo',
             r.esquema, r.tabla));

    perform app.assert(
      (select count(*) from information_schema.table_constraints tc
        join information_schema.key_column_usage k
          on k.constraint_name = tc.constraint_name
       where tc.table_schema = r.esquema and tc.table_name = r.tabla
         and tc.constraint_type = 'FOREIGN KEY'
         and k.column_name = 'tenant_id') > 0,
      format('%s.%s sin FK a organizaciones: acepta tenants inexistentes',
             r.esquema, r.tabla));
  end loop;
end $$;

-- ============================================================================
-- T9 · Invariante de propietario
-- ============================================================================

do $$
declare o uuid; u uuid; ok boolean := false;
begin
  select id into o from organizaciones where slug = 'acme';
  insert into usuarios (email) values ('prop@acme.test')
    on conflict do nothing;
  select id into u from usuarios where lower(email) = 'prop@acme.test';
  insert into membresias (organizacion_id, usuario_id, rol, aceptado_en)
    values (o, u, 'propietario', now()) on conflict do nothing;

  begin
    delete from membresias where organizacion_id = o and usuario_id = u;
  exception when others then
    ok := true;
  end;
  perform app.assert(ok, 'Se pudo eliminar al único propietario de una organización');
end $$;

-- ============================================================================
-- T10 · El socio ve la ficha del hijo, no su dato
-- ============================================================================

do $$
declare s uuid; h uuid; n bigint;
begin
  insert into organizaciones (tipo, canal, slug, nombre, estado)
  values ('socio','b2b','socio-demo','Socio Demo','activo') on conflict do nothing;
  select id into s from organizaciones where slug = 'socio-demo';
  update organizaciones set socio_id = s where slug = 'globex';
  select id into h from organizaciones where slug = 'globex';

  set local role app_tenant;
  perform set_config('app.tenant_id', s::text, true);

  execute format('select count(*) from organizaciones where id = %L', h) into n;
  perform app.assert(n = 1, 'El socio no ve la ficha de su cliente');

  execute format('select count(*) from leads where tenant_id = %L', h) into n;
  perform app.assert(n = 0, 'FUGA: el socio lee los datos de su cliente');
  reset role;
end $$;

-- ============================================================================

select 'TODAS LAS PRUEBAS DE AISLAMIENTO PASARON' as resultado;
