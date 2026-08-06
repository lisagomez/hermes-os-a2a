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

--  La siembra INTROSPECCIONA. Un `insert (tenant_id) values (...)` pelado solo
--  funciona en tablas sin columnas obligatorias — aquí 26 de 27 las tienen, y
--  cuatro además exigen una FK viva. Recortar el conjunto de tablas para que la
--  siembra pase convertiría el bucle por-tabla de T1 en teatro: verificaría el
--  aislamiento de cuatro tablas y daría verde por las otras veintitrés.
--
--  Lo que no se pueda sembrar se REGISTRA y se imprime (ningún omitido
--  silencioso), y T1 solo recorre lo efectivamente sembrado.

--  ⚠ ESTA SUITE EXIGE UNA BASE LIMPIA, y no por comodidad: `buzon_bitacora` y
--  `enriquecimiento_intento` son APPEND-ONLY por disparador (DELETE prohibido
--  por diseño, y hacen bien). Sus filas de prueba no se pueden retirar, así que
--  no hay forma honesta de dejar la base como estaba. Correrla dos veces sobre
--  la misma base haría que todo choque contra los UNIQUE naturales y que T1
--  —que solo recorre lo sembrado— diera verde sin verificar una sola tabla.
--  Por eso se aborta de entrada en vez de degradar en silencio.
do $$
begin
  if exists (select 1 from organizaciones where lower(slug) in ('acme','globex')) then
    raise exception
      'La suite ya corrió sobre esta base. Necesita una base LIMPIA: hay tablas '
      'append-only (buzon_bitacora, enriquecimiento_intento) cuyos datos de '
      'prueba no se pueden borrar. Recrea el Postgres efímero '
      '(businessos/tenancy/replay.sh lo hace solo).';
  end if;
end $$;

create table if not exists app.siembra_omitida (
  esquema text, tabla text, motivo text
);
truncate app.siembra_omitida;
-- T1 recorre esta tabla ya con el rol de la aplicación puesto.
grant select on app.siembra_omitida to app_tenant;

-- Un literal SQL válido para una columna obligatoria.
--   · Si un CHECK de una sola columna la limita a un conjunto, usa el primer
--     valor permitido (si no, 't' violaría el check y el fallo parecería de RLS).
--   · Si es FK, toma una fila viva de la tabla padre — del MISMO tenant cuando
--     la padre tiene tenant_id, para no fabricar una fuga en la propia siembra.
--   · `p_disc` discrimina los valores entre tenants: dos filas idénticas
--     chocarían contra los UNIQUE naturales (leads.lead_id, buzones.direccion…).
--   · `p_variante` prueba valores alternativos del CHECK: un CHECK que cruza
--     dos columnas (resultado='hit' exige veredicto<>'') no se satisface
--     mirando una columna a la vez, así que la siembra reintenta con el
--     siguiente valor permitido en cada pasada.
create or replace function app.valor_col(
  p_esq text, p_tab text, p_col text, p_tipo text, p_disc text, p_tenant uuid,
  p_variante int default 1)
returns text language plpgsql as $$
declare
  def text; permitido text; literales text[];
  rsch text; rtab text; rcol text; v text; tiene_tenant boolean;
begin
  -- ¿FK?
  select ccu.table_schema, ccu.table_name, ccu.column_name
    into rsch, rtab, rcol
    from information_schema.table_constraints tc
    join information_schema.key_column_usage k
      on k.constraint_name = tc.constraint_name and k.table_schema = tc.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
   where tc.constraint_type = 'FOREIGN KEY'
     and tc.table_schema = p_esq and tc.table_name = p_tab and k.column_name = p_col
   limit 1;

  if rtab is not null then
    select exists (select 1 from information_schema.columns
                    where table_schema = rsch and table_name = rtab
                      and column_name = 'tenant_id')
      into tiene_tenant;
    if tiene_tenant then
      execute format('select %I::text from %I.%I where tenant_id::text = %L limit 1',
                     rcol, rsch, rtab, p_tenant::text) into v;
    end if;
    if v is null then
      execute format('select %I::text from %I.%I limit 1', rcol, rsch, rtab) into v;
    end if;
    if v is null then
      return null;   -- padre vacía: la tabla se reintenta en otra pasada
    end if;
    return quote_literal(v) || '::' || p_tipo;
  end if;

  -- ¿CHECK de una sola columna con lista de valores?
  select pg_get_constraintdef(c.oid) into def
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    join pg_attribute att on att.attrelid = t.oid and att.attname = p_col
   where n.nspname = p_esq and t.relname = p_tab
     and c.contype = 'c' and c.conkey = array[att.attnum]
   limit 1;
  if def is not null then
    select array_agg(m[1]) into literales
      from regexp_matches(def, '''([^'']*)''', 'g') as m;
    if literales is not null and cardinality(literales) > 0 then
      permitido := literales[least(p_variante, cardinality(literales))];
      return quote_literal(permitido);
    end if;
  end if;

  return case
    when p_tipo in ('text','character varying','character')  then quote_literal(p_col || '-' || p_disc)
    when p_tipo in ('integer','bigint','smallint')           then '1'
    when p_tipo in ('numeric','double precision','real')     then '1'
    when p_tipo = 'boolean'                                  then 'false'
    when p_tipo = 'uuid'                                     then 'gen_random_uuid()'
    when p_tipo like 'timestamp%'                            then 'now()'
    when p_tipo = 'date'                                     then 'current_date'
    when p_tipo like 'time%'                                 then quote_literal('09:00')||'::time'
    when p_tipo = 'jsonb'                                    then quote_literal('{}')||'::jsonb'
    when p_tipo = 'json'                                     then quote_literal('{}')||'::json'
    when p_tipo = 'ARRAY'                                    then quote_literal('{}')
    else 'null'
  end;
end $$;

do $$
declare
  a uuid; b uuid; r record; c record;
  cols text; vals_a text; vals_b text; v text;
  pasada int := 0; sembradas int; pendientes int;
begin
  insert into organizaciones (tipo, canal, slug, nombre, estado)
  values ('tenant','b2b','acme','Acme','activo'),
         ('tenant','b2b','globex','Globex','activo')
  on conflict do nothing;

  select id into a from organizaciones where slug = 'acme';
  select id into b from organizaciones where slug = 'globex';

  -- PADRES EXTERNOS: una tabla de tenant puede depender por FK de una tabla que
  -- NO está en app.tablas_tenant — p. ej. las cinco hijas del buzón cuelgan de
  -- `buzones`, que lleva su propio tenant_id text y vive en el registro ajeno.
  -- Sin una fila padre, esas cinco quedan sin sembrar y T1 dejaría de cubrirlas.
  for r in
    select distinct ccu.table_schema as esquema, ccu.table_name as tabla
      from information_schema.table_constraints tc
      join information_schema.constraint_column_usage ccu
        on ccu.constraint_name = tc.constraint_name
      join app.tablas_tenant t
        on t.esquema = tc.table_schema and t.tabla = tc.table_name
     where tc.constraint_type = 'FOREIGN KEY'
       and ccu.table_name not in (select tabla from app.tablas_tenant)
       and ccu.table_name <> 'organizaciones'
  loop
    cols := ''; vals_a := ''; v := 'ok';
    for c in
      select column_name, data_type
        from information_schema.columns
       where table_schema = r.esquema and table_name = r.tabla
         and is_nullable = 'NO' and column_default is null
         and is_identity = 'NO' and is_generated = 'NEVER'
       order by ordinal_position
    loop
      v := app.valor_col(r.esquema, r.tabla, c.column_name, c.data_type, 'p', a);
      if v is null then v := 'sin-valor'; exit; end if;
      cols   := cols   || case when cols = '' then '' else ', ' end || quote_ident(c.column_name);
      vals_a := vals_a || case when vals_a = '' then '' else ', ' end || v;
      v := 'ok';
    end loop;

    if v = 'ok' then
      begin
        if cols = '' then
          execute format('insert into %I.%I default values', r.esquema, r.tabla);
        else
          execute format('insert into %I.%I (%s) values (%s)',
                         r.esquema, r.tabla, cols, vals_a);
        end if;
      exception when others then
        raise notice 'SIEMBRA: no se pudo crear padre %.%: %', r.esquema, r.tabla, sqlerrm;
      end;
    end if;
  end loop;

  -- Varias pasadas: una tabla con FK obligatoria necesita que su padre ya esté
  -- sembrada. Se repite hasta que una pasada completa no logre ninguna nueva.
  create temp table pendiente_siembra on commit drop as
    select esquema, tabla from app.tablas_tenant;

  loop
    pasada := pasada + 1;
    sembradas := 0;

    for r in select esquema, tabla from pendiente_siembra loop
      cols := 'tenant_id'; vals_a := quote_literal(a); vals_b := quote_literal(b);
      v := 'ok';

      for c in
        select column_name, data_type
          from information_schema.columns
         where table_schema = r.esquema and table_name = r.tabla
           and is_nullable = 'NO' and column_default is null
           and is_identity = 'NO' and is_generated = 'NEVER'
           and column_name <> 'tenant_id'
         order by ordinal_position
      loop
        declare va text; vb text;
        begin
          va := app.valor_col(r.esquema, r.tabla, c.column_name, c.data_type, 'a', a, pasada);
          vb := app.valor_col(r.esquema, r.tabla, c.column_name, c.data_type, 'b', b, pasada);
          if va is null or vb is null then v := 'fk-vacia'; exit; end if;
          cols   := cols   || ', ' || quote_ident(c.column_name);
          vals_a := vals_a || ', ' || va;
          vals_b := vals_b || ', ' || vb;
        end;
      end loop;

      if v <> 'ok' then continue; end if;

      begin
        execute format('insert into %I.%I (%s) values (%s), (%s)',
                       r.esquema, r.tabla, cols, vals_a, vals_b);
        delete from pendiente_siembra p
         where p.esquema = r.esquema and p.tabla = r.tabla;
        sembradas := sembradas + 1;
      exception when others then
        -- se reintenta en la siguiente pasada; si ya no hay progreso, se anota
        null;
      end;
    end loop;

    select count(*) into pendientes from pendiente_siembra;
    exit when pendientes = 0 or sembradas = 0 or pasada >= 5;
  end loop;

  -- Lo que no entró, con su motivo REAL: se reconstruye el mismo insert que
  -- falló y se captura su error. Registrar el error de un insert pelado
  -- (solo tenant_id) mentiría: diría "falta lead_id" cuando el problema era
  -- que la tabla padre estaba vacía.
  for r in select esquema, tabla from pendiente_siembra loop
    cols := 'tenant_id'; vals_a := quote_literal(a); v := 'ok';
    for c in
      select column_name, data_type
        from information_schema.columns
       where table_schema = r.esquema and table_name = r.tabla
         and is_nullable = 'NO' and column_default is null
         and is_identity = 'NO' and is_generated = 'NEVER'
         and column_name <> 'tenant_id'
       order by ordinal_position
    loop
      v := app.valor_col(r.esquema, r.tabla, c.column_name, c.data_type, 'a', a);
      if v is null then
        insert into app.siembra_omitida values (r.esquema, r.tabla,
          format('sin fila padre para la FK %I', c.column_name));
        v := 'anotada'; exit;
      end if;
      cols   := cols   || ', ' || quote_ident(c.column_name);
      vals_a := vals_a || ', ' || v;
      v := 'ok';
    end loop;

    if v = 'ok' then
      begin
        execute format('insert into %I.%I (%s) values (%s)',
                       r.esquema, r.tabla, cols, vals_a);
        delete from pendiente_siembra p
         where p.esquema = r.esquema and p.tabla = r.tabla;
      exception when others then
        insert into app.siembra_omitida values (r.esquema, r.tabla, sqlerrm);
      end;
    end if;
  end loop;
end $$;

-- Coverage a la vista: si esta lista crece, T1 cubre menos de lo que parece.
do $$
declare n int; total int; lista text;
begin
  select count(*) into n from app.siembra_omitida;
  select count(*) into total from app.tablas_tenant;
  if n > 0 then
    select string_agg(tabla || ' (' || split_part(motivo, E'\n', 1) || ')', '; ')
      into lista from app.siembra_omitida;
    raise notice 'SIEMBRA: % de % tablas sembradas. OMITIDAS: %', total - n, total, lista;
  else
    raise notice 'SIEMBRA: las % tablas de tenant fueron sembradas.', total;
  end if;

  -- La cobertura es una ASERCIÓN, no un aviso. T1 solo recorre lo sembrado:
  -- si una tabla deja de sembrarse, T1 seguiría en verde cubriendo menos, y
  -- nadie leería el NOTICE. Si esto se pone rojo, o se enseña al sembrador a
  -- construir la fila (app.valor_col), o la tabla no era de tenant.
  perform app.assert(n = 0,
    format('La siembra no cubrió %s de %s tablas de tenant: T1 estaría dando '
           'verde sin verificarlas. Detalle: %s', n, total, coalesce(lista, '')));
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

  for r in select t.esquema, t.tabla from app.tablas_tenant t
            where not exists (select 1 from app.siembra_omitida o
                               where o.esquema = t.esquema and o.tabla = t.tabla) loop
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

--  El rechazo tiene que ser POR LA POLÍTICA. `exception when others` daba verde
--  ante cualquier error — y en `leads` un insert pelado falla por lead_id NOT
--  NULL, no por RLS: la prueba pasaba sin ejercitar una sola línea de política.
--  42501 = insufficient_privilege, que es lo que levanta un with check violado.
do $$
declare a uuid; b uuid; estado text := 'sin-error';
begin
  select id into a from organizaciones where slug = 'acme';
  select id into b from organizaciones where slug = 'globex';

  set local role app_tenant;
  perform set_config('app.tenant_id', a::text, true);
  begin
    execute format('insert into leads (tenant_id, lead_id) values (%L, %L)', b, 'cruzado-t2');
  exception when others then
    estado := sqlstate;
  end;
  reset role;

  perform app.assert(estado <> 'sin-error',
    'Se permitió INSERT con tenant_id ajeno: falta with check');
  perform app.assert(estado = '42501',
    format('El INSERT cruzado falló con SQLSTATE %s, no por la política (42501). '
           'La prueba estaría dando verde por el motivo equivocado.', estado));
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
                      where g.esquema = t.table_schema and g.tabla = t.table_name)
     and not exists (select 1 from app.tablas_tenant_ajeno j
                      where j.esquema = t.table_schema and j.tabla = t.table_name);

  perform app.assert(huerfanas is null,
    format('Tablas sin clasificar como tenant, global ni de tenencia ajena: %s. '
           'Agrégalas a app.tablas_tenant, justifícalas en app.tablas_globales '
           'o declara su mecanismo en app.tablas_tenant_ajeno', huerfanas));
end $$;

-- ============================================================================
-- T5b · META — el registro de tenencia ajena no contiene tablas fantasma
--
--  Un registro que nombra tablas inexistentes envejece hacia la mentira: da
--  cobertura declarada sin cobertura real. Vale para las tres listas.
-- ============================================================================

do $$
declare fantasmas text;
begin
  select string_agg(x.tabla, ', ') into fantasmas
    from (select esquema, tabla from app.tablas_tenant
          union all select esquema, tabla from app.tablas_tenant_ajeno) x
   where not exists (select 1 from information_schema.tables t
                      where t.table_schema = x.esquema and t.table_name = x.tabla
                        and t.table_type = 'BASE TABLE');

  perform app.assert(fantasmas is null,
    format('El registro declara tablas que no existen: %s', fantasmas));
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

  -- trg_exigir_propietario es `deferrable initially deferred`: sin forzarlo, no
  -- se pronuncia hasta el COMMIT, que ocurre DESPUÉS de esta aserción. La
  -- prueba daría rojo con el invariante funcionando perfectamente.
  -- `set constraints all immediate` lo obliga a decidir aquí dentro.
  begin
    delete from membresias where organizacion_id = o and usuario_id = u;
    set constraints all immediate;
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
-- T11 · META — la tenencia ajena declarada sigue siendo cierta
--
--  Las tablas de app.tablas_tenant_ajeno NO llevan tenant_id uuid: su
--  aislamiento vive en otro mecanismo. Declararlo no basta — si alguien
--  convierte crm_contactos.tenant_id a uuid, o le quita el NOT NULL, el
--  registro seguiría diciendo 'text' y nadie se enteraría.
--
--  Solo se verifica lo que el registro afirma: las filas sin `columna`
--  (la cabina control-interno, que aísla por auth.uid()) no tienen columna
--  que comprobar, y para ellas se exige RLS activa, que es su mecanismo real.
-- ============================================================================

do $$
declare r record; tipo_real text; nulable text;
begin
  for r in select esquema, tabla, mecanismo, columna, tipo
             from app.tablas_tenant_ajeno where columna is not null loop
    select data_type, is_nullable into tipo_real, nulable
      from information_schema.columns
     where table_schema = r.esquema and table_name = r.tabla
       and column_name = r.columna;

    perform app.assert(tipo_real is not null,
      format('%s.%s: el registro declara la columna %I y no existe',
             r.esquema, r.tabla, r.columna));

    perform app.assert(tipo_real = r.tipo,
      format('%s.%s: el registro dice %I %s pero la columna es %s. '
             'O se actualiza el registro, o la tabla cambió de modelo de tenencia.',
             r.esquema, r.tabla, r.columna, r.tipo, tipo_real));
  end loop;

  -- token_usage es la única con la columna NULLABLE a propósito (null = gasto
  -- de la casa). Que el resto del CRM la tenga NOT NULL es su aislamiento.
  for r in select esquema, tabla, columna
             from app.tablas_tenant_ajeno
            where mecanismo = 'crm_slug' and tabla <> 'token_usage' loop
    select is_nullable into nulable
      from information_schema.columns
     where table_schema = r.esquema and table_name = r.tabla
       and column_name = r.columna;
    perform app.assert(nulable = 'NO',
      format('%s.%s: %I quedó NULLABLE — una fila sin tenant es una fila de nadie',
             r.esquema, r.tabla, r.columna));
  end loop;
end $$;

do $$
declare sin_rls text;
begin
  select string_agg(j.tabla, ', ') into sin_rls
    from app.tablas_tenant_ajeno j
    join pg_class c on c.relname = j.tabla
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = j.esquema
   where j.mecanismo = 'auth_uid' and not c.relrowsecurity;

  perform app.assert(sin_rls is null,
    format('Tablas de la cabina interna declaradas con aislamiento por auth.uid() '
           'pero SIN RLS habilitada: %s', sin_rls));
end $$;

-- ============================================================================
-- T12 · El puente de costo CRM↔organizaciones no cruza tenants
--
--  v_margen_tenant une token_usage.tenant_id (slug text del CRM) con
--  organizaciones.slug. Si el join perdiera el lower(), 'Acme' y 'acme' serían
--  el mismo tenant para unos y distintos para otros: gasto de un cliente
--  facturado a otro.
-- ============================================================================

do $$
declare a uuid; propio numeric; ajeno numeric;
begin
  select id into a from organizaciones where slug = 'acme';

  -- Modelos distintos: el ledger tiene un único parcial sobre
  -- (fecha, vertical, modelo) para las filas del agregado diario (task_id null).
  insert into token_usage (fecha, vertical, modelo, tokens_in, tokens_out, costo_usd, tenant_id)
  values (current_date, 'crm', 'modelo-t12-acme',   1, 1, 7.00, 'ACME'),
         (current_date, 'crm', 'modelo-t12-globex', 1, 1, 3.00, 'globex');

  select coalesce(sum(costo_medido),0) into propio
    from v_margen_tenant where tenant_id = a;
  perform app.assert(propio >= 7.00,
    format('El puente de costo no atribuyó el gasto de ACME/acme (%s): '
           'falta lower() en el join', propio));

  select coalesce(sum(costo_medido),0) into ajeno
    from v_margen_tenant v join organizaciones o on o.id = v.tenant_id
   where o.slug = 'acme' and v.costo_medido = 3.00;
  perform app.assert(ajeno = 0, 'FUGA: gasto de globex atribuido a acme');
end $$;

-- ============================================================================

select 'TODAS LAS PRUEBAS DE AISLAMIENTO PASARON' as resultado;
