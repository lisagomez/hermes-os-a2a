-- ═══════════════════════════════════════════════════════════════════
-- ERP AGÉNTICO · ERP-0 · Migración 004 — SEGURIDAD estructural (roles + RLS)
-- ═══════════════════════════════════════════════════════════════════
-- El aislamiento es de la BASE DE DATOS, no de la disciplina de quien consulta.
-- Dos mecanismos ESTRUCTURALES:
--   1) ROLES de Postgres: qué VERBOS puede ejecutar cada actor.
--        · rol_exe_fin — lectura + escritura (NO borrado; los fiscales son inmutables)
--        · rol_swm     — SOLO lectura (el swarm no escribe, por diseño de rol)
--        · rol_admin   — DDL/migraciones (solo humano)
--   2) RLS por cliente_id: qué FILAS ve cada tenant. La fuga entre clientes es
--      imposible a nivel BD. El tenant se inyecta por sesión:
--         SET app.cliente_id = '<uuid>';
--      La política lo lee con current_setting('app.cliente_id', true); si no está
--      puesto → NULL → cero filas (cerrado por defecto).
--
-- PROHIBIDO conectar CLIs o agentes con el service_role de Supabase: tiene
-- BYPASSRLS y anula todo esto. Los CLIs entran como rol_exe_fin; el swarm como
-- rol_swm. FORCE ROW LEVEL SECURITY somete incluso al dueño de la tabla.
--
-- Idempotente. STAGING primero. Correr DESPUÉS de 001/002/003.
-- Si en el futuro un pack añade tablas, RE-CORRER la sección de GRANTS + el
-- bloque de RLS (ambos son idempotentes y aplican "ON ALL TABLES IN SCHEMA").
-- ═══════════════════════════════════════════════════════════════════

-- ------------------------------------------------------------
-- 1. ROLES (grupos NOLOGIN; los usuarios de login se les asignan luego con
--    GRANT rol_exe_fin TO <login_user>). create role no acepta IF NOT EXISTS
--    → guardado con un DO block.
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'rol_exe_fin') then
    create role rol_exe_fin nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'rol_swm') then
    create role rol_swm nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'rol_admin') then
    create role rol_admin nologin;
  end if;
end
$$;

-- ------------------------------------------------------------
-- 2. GRANTS de esquema y objetos
-- ------------------------------------------------------------
grant usage on schema erp to rol_exe_fin, rol_swm, rol_admin;

-- rol_admin: todo (humano, migraciones)
grant all privileges on all tables    in schema erp to rol_admin;
grant all privileges on all sequences in schema erp to rol_admin;
grant all privileges on all functions in schema erp to rol_admin;

-- rol_exe_fin: leer + insertar + actualizar (NO borrar → inmutabilidad fiscal).
grant select, insert, update on all tables    in schema erp to rol_exe_fin;
grant usage,  select         on all sequences in schema erp to rol_exe_fin;
-- La bitácora es APPEND-ONLY: se puede insertar y leer, jamás modificar.
revoke update on erp.sis_bitacora from rol_exe_fin;

-- rol_swm: SOLO lectura. Ni un verbo de escritura.
grant select on all tables in schema erp to rol_swm;

-- Funciones: solo quien escribe folios ejecuta siguiente_folio.
grant execute on function erp.siguiente_folio(uuid, text) to rol_exe_fin, rol_admin;

-- Privilegios por DEFECTO para tablas/secuencias FUTURAS creadas en este esquema
-- (para que los packs nuevos hereden sin re-grantear a mano; el REVOKE de la
-- bitácora sí hay que repetirlo si se añaden tablas append-only).
alter default privileges in schema erp
  grant select, insert, update on tables to rol_exe_fin;
alter default privileges in schema erp
  grant usage, select on sequences to rol_exe_fin;
alter default privileges in schema erp
  grant select on tables to rol_swm;
alter default privileges in schema erp
  grant all on tables to rol_admin;
alter default privileges in schema erp
  grant all on sequences to rol_admin;
alter default privileges in schema erp
  grant all on functions to rol_admin;

-- ------------------------------------------------------------
-- 3. RLS por cliente_id en TODA tabla base del esquema erp.
--    Recorremos las tablas para no olvidar ninguna (y que packs futuros entren
--    con solo re-correr este bloque). Política única por tabla:
--        USING       (cliente_id = tenant de sesión)
--        WITH CHECK  (cliente_id = tenant de sesión)   → no se puede escribir
--                                                          en el tenant de otro.
--    Los GRANTS (sección 2) diferencian lectura de escritura; la RLS diferencia
--    el TENANT. Juntas: rol_swm lee su tenant y nada más; rol_exe_fin lee/escribe
--    su tenant y nada más.
-- ------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in
    select tablename
    from pg_tables
    where schemaname = 'erp'
  loop
    execute format('alter table erp.%I enable row level security;', t.tablename);
    execute format('alter table erp.%I force  row level security;', t.tablename);
    execute format('drop policy if exists tenant_aislamiento on erp.%I;', t.tablename);
    execute format($f$
      create policy tenant_aislamiento on erp.%I
        using      (cliente_id = nullif(current_setting('app.cliente_id', true), '')::uuid)
        with check (cliente_id = nullif(current_setting('app.cliente_id', true), '')::uuid);
    $f$, t.tablename);
  end loop;
end
$$;

-- ------------------------------------------------------------
-- NOTA operativa (ERP-1/ERP-3):
--   · El CLI abre su conexión y hace, por sesión/transacción:
--         SET app.cliente_id = '<uuid-del-tenant>';
--     antes de cualquier consulta. Sin eso, RLS devuelve cero filas.
--   · El usuario de login del CLI se crea aparte y se le da el rol:
--         CREATE ROLE cli_fin LOGIN PASSWORD '…';
--         GRANT rol_exe_fin TO cli_fin;
--     (nunca el service_role de Supabase).
-- ------------------------------------------------------------
