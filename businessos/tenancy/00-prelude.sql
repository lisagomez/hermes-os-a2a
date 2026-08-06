-- ============================================================================
--  00-prelude.sql — Andamiaje para replicar el esquema en Postgres EFÍMERO
--
--  NO se aplica a producción. En Supabase todo esto ya existe (lo pone la
--  plataforma); aquí lo fabricamos a mano para que los .sql del repo puedan
--  replayarse contra un `postgres:16-alpine` pelado.
--
--  Contiene SOLO lo que los archivos del repo referencian de verdad:
--    - roles anon / authenticated / service_role (los usan los revoke/grant)
--    - esquema auth con users, uid() y jwt() (referencias de control-interno)
--    - extensiones pgcrypto y btree_gist
-- ============================================================================

-- ── Roles de la plataforma ──────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  -- service_role con BYPASSRLS a propósito: replica el gotcha real de Supabase
  -- que el bloque 6 de la migración documenta. Si algún día una prueba afirma
  -- que las políticas detienen a service_role, aquí se verá que no.
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

-- ── Esquema auth (stub mínimo) ──────────────────────────────────────────────
create schema if not exists auth;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

-- Misma forma que la de Supabase: lee el claim `sub` del JWT de la petición.
-- Devuelve null cuando no hay contexto (que es el caso en el efímero).
create or replace function auth.uid() returns uuid
language plpgsql stable as $$
declare v text;
begin
  begin
    v := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '');
  exception when others then
    v := null;
  end;
  return v::uuid;
end $$;

create or replace function auth.jwt() returns jsonb
language plpgsql stable as $$
declare v jsonb;
begin
  begin
    v := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception when others then
    v := null;
  end;
  return coalesce(v, '{}'::jsonb);
end $$;

-- ── Extensiones que los archivos piden explícitamente ───────────────────────
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ── Permisos base que la plataforma ya trae ─────────────────────────────────
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth   to anon, authenticated, service_role;
