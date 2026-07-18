-- ============================================================================
-- BASE SCHEMA (bootstrap) — Business OS white-label
-- ============================================================================
-- This migration creates EVERY base table, function, trigger, RLS policy,
-- realtime publication entry and storage bucket that the application code
-- depends on. It exists because the original product was forked from a
-- personal dashboard whose base tables lived only in the owner's Supabase
-- project and were never checked into the repo. The later migrations in this
-- folder (canvas_v3, calendar_*) only ALTER / extend tables that this file
-- must create first.
--
-- Ordering contract:
--   00000000000000_base_schema.sql   <-- THIS FILE (runs first)
--   20260518_canvas_v3.sql           ALTER TABLE draw ... + draw_* extras
--   20260525_calendar_command_center ADD calendar_* + task_calendar_links
--   20260608_calendar_sources.sql    idempotent calendar_sources
--
-- A fresh operator can bring the whole product up on a virgin Supabase
-- project with `supabase db push`.
--
-- Every table is created with `if not exists`, every policy is dropped before
-- (re)creation, so the whole file is safe to re-run.
--
-- Auth / RLS model (see the RLS section for the full rationale):
--   * The app is gated at the auth layer: only allow-listed emails can sign
--     in, and every authenticated user is a trusted operator (owner/admin).
--   * API routes mostly use the SERVICE role (bypasses RLS) for agent + cron
--     writes. But several browser surfaces write directly with the user's
--     session (kanban status, labels, task assignees, notifications, chat
--     message rewind, push subscriptions). Because of that, authenticated
--     users get full CRUD on the operational tables — a read-only-authenticated
--     model would break the web app. `push_subscriptions` is scoped per-user
--     and `login_attempts` is service-only.
-- ============================================================================

-- gen_random_uuid(); present in core Postgres 13+ (Supabase), pgcrypto is a
-- harmless idempotent safety net.
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Shared helper functions
-- ----------------------------------------------------------------------------

-- Generic BEFORE UPDATE trigger: keeps updated_at fresh even when a caller
-- forgets to set it (e.g. the browser kanban only sends { status }). Always
-- stamping now() on write is what the dashboard's `order by updated_at` needs.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Standard Supabase pattern: when a row lands in auth.users, mirror it into
-- public.profiles so the app always has a profile to read/update. The signup
-- server action does `update profiles set role, email` right after sign-up, so
-- the row MUST already exist. Default role is 'member'; the signup flow
-- overrides it with a server-derived role from the email allow-list.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    'member'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- profiles — one row per auth.users, the app's notion of a person
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  email       text,
  role        text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Fire the profile-mirror trigger on new auth users.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- tasks — the Kanban board. #123 human-readable id via sequence_number.
-- Created before agents because agents.current_task_id references it.
-- ----------------------------------------------------------------------------
-- Dedicated sequence backs the human-readable task number. Inserts never send
-- sequence_number (see /api/tasks, /api/openclaw/event) so it must auto-fill.
create sequence if not exists public.tasks_sequence_number_seq;

create table if not exists public.tasks (
  id                uuid primary key default gen_random_uuid(),
  sequence_number   integer not null default nextval('public.tasks_sequence_number_seq'),
  title             text not null,
  description       text not null default '',
  status            text not null default 'backlog',
  priority          integer not null default 0,
  tags              text[],
  border_color      text,
  session_key       text,
  openclaw_run_id   text,
  started_at        timestamptz,
  due_at            timestamptz,
  estimate          integer,
  parent_task_id    uuid references public.tasks(id) on delete set null,
  position          integer not null default 0,
  used_coding_tools boolean default false,
  tenant_id         uuid,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
alter sequence public.tasks_sequence_number_seq owned by public.tasks.sequence_number;

create unique index if not exists tasks_sequence_number_key on public.tasks(sequence_number);
create index if not exists tasks_status_idx        on public.tasks(status);
create index if not exists tasks_parent_task_id_idx on public.tasks(parent_task_id);
create index if not exists tasks_openclaw_run_id_idx on public.tasks(openclaw_run_id);
create index if not exists tasks_updated_at_idx     on public.tasks(updated_at desc);

-- ----------------------------------------------------------------------------
-- agents — the AI teammates
-- ----------------------------------------------------------------------------
create table if not exists public.agents (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  role            text not null default 'agent',
  status          text not null default 'idle',
  level           text not null default 'SPC',
  avatar          text not null default '',
  current_task_id uuid references public.tasks(id) on delete set null,
  session_key     text,
  system_prompt   text,
  character       text,
  lore            text,
  user_id         uuid,
  tenant_id       uuid,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists agents_session_key_idx on public.agents(session_key);

-- ----------------------------------------------------------------------------
-- task_assignees — M2M tasks <-> (agents | profiles)
-- ----------------------------------------------------------------------------
create table if not exists public.task_assignees (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  agent_id    uuid references public.agents(id) on delete cascade,
  profile_id  uuid references public.profiles(id) on delete cascade,
  assigned_at timestamptz default now()
);
create index if not exists task_assignees_task_id_idx    on public.task_assignees(task_id);
create index if not exists task_assignees_agent_id_idx   on public.task_assignees(agent_id);
create index if not exists task_assignees_profile_id_idx on public.task_assignees(profile_id);

-- ----------------------------------------------------------------------------
-- labels + task_labels — colored labels, M2M with tasks
-- ----------------------------------------------------------------------------
create table if not exists public.labels (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  color      text not null default '#6b7280',
  tenant_id  uuid,
  created_at timestamptz default now()
);

create table if not exists public.task_labels (
  task_id    uuid not null references public.tasks(id) on delete cascade,
  label_id   uuid not null references public.labels(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (task_id, label_id)
);
create index if not exists task_labels_label_id_idx on public.task_labels(label_id);

-- ----------------------------------------------------------------------------
-- task_relations — blocks / blocked_by / related / duplicate between tasks
-- ----------------------------------------------------------------------------
create table if not exists public.task_relations (
  id             uuid primary key default gen_random_uuid(),
  source_task_id uuid not null references public.tasks(id) on delete cascade,
  target_task_id uuid not null references public.tasks(id) on delete cascade,
  relation_type  text not null default 'related',
  created_at     timestamptz default now(),
  unique (source_task_id, target_task_id, relation_type)
);
create index if not exists task_relations_source_idx on public.task_relations(source_task_id);
create index if not exists task_relations_target_idx on public.task_relations(target_task_id);

-- ----------------------------------------------------------------------------
-- saved_views — persisted board filters/sorts (present in the domain model)
-- ----------------------------------------------------------------------------
create table if not exists public.saved_views (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  filters             jsonb not null default '{}'::jsonb,
  sort_by             text,
  sort_dir            text,
  created_by_agent_id uuid references public.agents(id) on delete set null,
  tenant_id           uuid,
  created_at          timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- documents — artifacts produced by agents, optionally attached to a task
-- ----------------------------------------------------------------------------
create table if not exists public.documents (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  content             text not null default '',
  type                text not null,
  path                text,
  task_id             uuid references public.tasks(id) on delete set null,
  created_by_agent_id uuid references public.agents(id) on delete set null,
  tenant_id           uuid,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
create index if not exists documents_task_id_idx on public.documents(task_id);

-- ----------------------------------------------------------------------------
-- messages — per-task activity thread written by agents
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid not null references public.tasks(id) on delete cascade,
  from_agent_id uuid not null references public.agents(id) on delete cascade,
  content       text not null,
  tenant_id     uuid,
  created_at    timestamptz default now()
);
create index if not exists messages_task_id_idx on public.messages(task_id, created_at);

-- ----------------------------------------------------------------------------
-- message_attachments — link a message to a document
-- ----------------------------------------------------------------------------
create table if not exists public.message_attachments (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references public.messages(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade
);
create index if not exists message_attachments_message_id_idx on public.message_attachments(message_id);

-- ----------------------------------------------------------------------------
-- activities — global feed of what agents did
-- ----------------------------------------------------------------------------
create table if not exists public.activities (
  id         uuid primary key default gen_random_uuid(),
  type       text not null,
  agent_id   uuid not null references public.agents(id) on delete cascade,
  message    text not null,
  target_id  uuid references public.tasks(id) on delete set null,
  tenant_id  uuid,
  created_at timestamptz default now()
);
create index if not exists activities_created_at_idx on public.activities(created_at desc);

-- ----------------------------------------------------------------------------
-- notifications — agent @-mentions (distinct from web-push subscriptions)
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id                  uuid primary key default gen_random_uuid(),
  mentioned_agent_id  uuid not null references public.agents(id) on delete cascade,
  content             text not null,
  delivered           boolean default false,
  tenant_id           uuid,
  created_at          timestamptz default now()
);
create index if not exists notifications_delivered_idx on public.notifications(delivered);

-- ----------------------------------------------------------------------------
-- conversations — history of agent/cron runs (Cron Lens + Acciones room)
-- Upserted by /api/openclaw/event on run_id, so run_id must be unique.
-- ----------------------------------------------------------------------------
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  run_id     text not null unique,
  agent_id   uuid references public.agents(id) on delete set null,
  prompt     text not null default '',
  response   text,
  source     text not null default 'business-os',
  error      text,
  status     text not null default 'pending',
  usage      jsonb,
  started_at timestamptz not null default now(),
  ended_at   timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists conversations_source_created_idx on public.conversations(source, created_at desc);

-- ----------------------------------------------------------------------------
-- chat_sessions — agent chat threads. (NO `account` column — the fork removed
-- the multi-account selector.) profile_id scopes a thread to its owner.
-- ----------------------------------------------------------------------------
create table if not exists public.chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default 'Nueva conversacion',
  is_favorite boolean not null default false,
  profile_id  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists chat_sessions_updated_at_idx on public.chat_sessions(updated_at desc);
create index if not exists chat_sessions_profile_id_idx on public.chat_sessions(profile_id);

-- ----------------------------------------------------------------------------
-- chat_messages — individual turns within a chat session
-- ----------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role       text not null,
  content    text not null default '',
  audio_url  text,
  image_url  text,
  metadata   jsonb,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_session_idx on public.chat_messages(session_id, created_at);

-- Atomic turn de-dup: /api/chat/complete and the client both may persist the
-- same turn; the unique (turnId, role) index makes the second write a 23505 the
-- code treats as idempotent. Partial so the many rows WITHOUT a turnId (cron,
-- legacy) are never constrained.
create unique index if not exists chat_messages_turnid_role_uniq
  on public.chat_messages ((metadata ->> 'turnId'), role)
  where metadata ->> 'turnId' is not null;

-- ----------------------------------------------------------------------------
-- push_subscriptions — Web Push endpoints, one-to-many per user
-- ----------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

-- ----------------------------------------------------------------------------
-- login_attempts — IP-based rate limiting for the login form (service-only)
-- ----------------------------------------------------------------------------
create table if not exists public.login_attempts (
  id           uuid primary key default gen_random_uuid(),
  ip_address   text not null,
  email        text,
  success      boolean not null default false,
  attempted_at timestamptz not null default now()
);
create index if not exists login_attempts_ip_time_idx on public.login_attempts(ip_address, attempted_at desc);

-- ----------------------------------------------------------------------------
-- ops_events — realtime operational event log (fed by the external daemon,
-- read + subscribed by the /ops surface). event_id is the logical dedup key.
-- ----------------------------------------------------------------------------
create table if not exists public.ops_events (
  id         uuid primary key default gen_random_uuid(),
  event_id   text not null unique,
  type       text not null,
  source     text not null default 'system',
  session_id text,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ops_events_created_at_idx on public.ops_events(created_at desc);

-- ----------------------------------------------------------------------------
-- draw_folders — folders that group canvas pages (created before `draw`)
-- ----------------------------------------------------------------------------
create table if not exists public.draw_folders (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'Nueva Carpeta',
  user_id    uuid references public.profiles(id) on delete set null,
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- draw — canvas pages (BASE table). 20260518_canvas_v3.sql later ADDs
-- schema_version, theme and settings, and references draw(page_id), so those
-- columns intentionally live in that migration, not here.
-- ----------------------------------------------------------------------------
create table if not exists public.draw (
  page_id       uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete set null,
  name          text not null default 'Canvas',
  page_elements jsonb not null default '{"elements":[],"files":{},"schemaVersion":3}'::jsonb,
  agent_version integer not null default 0,
  is_deleted    boolean not null default false,
  folder_id     uuid references public.draw_folders(id) on delete set null,
  thumbnail_url text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists draw_updated_at_idx on public.draw(updated_at desc) where is_deleted = false;
create index if not exists draw_folder_id_idx  on public.draw(folder_id);

-- RPC used by /api/draw3 when an owner id is configured (falls back to a direct
-- insert when this function is absent, so it is optional — provided here for
-- parity). Returns the new page_id.
create or replace function public.create_draw_from_agent(
  p_user_id uuid,
  p_name    text,
  p_elements jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_page_id uuid;
begin
  insert into public.draw (user_id, name, page_elements, agent_version)
  values (p_user_id, coalesce(p_name, 'Canvas v3'), coalesce(p_elements, '{"elements":[],"files":{},"schemaVersion":3}'::jsonb), 0)
  returning page_id into v_page_id;
  return v_page_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- updated_at triggers (all tables the app orders by / relies on freshness)
-- ----------------------------------------------------------------------------
drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.agents;
create trigger set_updated_at before update on public.agents
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.tasks;
create trigger set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.documents;
create trigger set_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.chat_sessions;
create trigger set_updated_at before update on public.chat_sessions
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.draw;
create trigger set_updated_at before update on public.draw
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.draw_folders;
create trigger set_updated_at before update on public.draw_folders
  for each row execute function public.set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Rationale: this is a trusted-operator app. Sign-in is restricted to an email
-- allow-list, and browser surfaces write directly with the user's session
-- (kanban status, labels, task assignees, notifications, chat rewind). So the
-- operational tables grant authenticated FULL CRUD. The service role (agent +
-- cron writes) bypasses RLS entirely. Two exceptions are tightened below:
--   * push_subscriptions — scoped to the owning user (auth.uid()).
--   * login_attempts     — no policy at all => service-role only.
-- ----------------------------------------------------------------------------

alter table public.profiles            enable row level security;
alter table public.tasks               enable row level security;
alter table public.agents              enable row level security;
alter table public.task_assignees      enable row level security;
alter table public.labels              enable row level security;
alter table public.task_labels         enable row level security;
alter table public.task_relations      enable row level security;
alter table public.saved_views         enable row level security;
alter table public.documents           enable row level security;
alter table public.messages            enable row level security;
alter table public.message_attachments enable row level security;
alter table public.activities          enable row level security;
alter table public.notifications       enable row level security;
alter table public.conversations       enable row level security;
alter table public.chat_sessions       enable row level security;
alter table public.chat_messages       enable row level security;
alter table public.push_subscriptions  enable row level security;
alter table public.login_attempts      enable row level security;
alter table public.ops_events          enable row level security;
alter table public.draw                enable row level security;
alter table public.draw_folders        enable row level security;

-- Operational tables: authenticated users get full CRUD.
do $$
declare
  t text;
  op_tables text[] := array[
    'tasks', 'agents', 'task_assignees', 'labels', 'task_labels',
    'task_relations', 'saved_views', 'documents', 'messages',
    'message_attachments', 'activities', 'notifications', 'conversations',
    'chat_sessions', 'chat_messages', 'ops_events', 'draw', 'draw_folders'
  ];
begin
  foreach t in array op_tables loop
    execute format('drop policy if exists %I on public.%I', t || '_authenticated_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      t || '_authenticated_all', t
    );
  end loop;
end $$;

-- profiles: everyone authenticated can read all profiles (assignee pickers,
-- avatars), but may only insert/update/delete their OWN row. The signup flow
-- updates the user's own profile (role/email) right after sign-up.
drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_delete_self on public.profiles;
create policy profiles_delete_self on public.profiles
  for delete to authenticated using (id = auth.uid());

-- push_subscriptions: a user only sees / manages their own devices. The send
-- route reads with the service role, so it is unaffected.
drop policy if exists push_subscriptions_own on public.push_subscriptions;
create policy push_subscriptions_own on public.push_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- login_attempts: intentionally NO policy => only the service role can touch it.

-- ============================================================================
-- REALTIME — tables the browser subscribes to via postgres_changes.
-- Guarded so it is a no-op when the publication is missing or already FOR ALL
-- TABLES / already contains the table.
-- ============================================================================
do $$
declare
  t text;
  rt_tables text[] := array[
    'tasks', 'messages', 'notifications', 'conversations',
    'ops_events', 'chat_messages', 'draw'
  ];
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array rt_tables loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- ============================================================================
-- STORAGE BUCKETS — avatars, draw-thumbnails, chat-audio, generated-images
-- (all public-read).
--   * avatars, chat-audio    -> uploaded from the browser (user session)
--   * draw-thumbnails, generated-images -> uploaded server-side (service role)
-- Wrapped in exception handling: on a hosted project the migration role can
-- create these, but if bucket/policy creation is blocked by ownership the
-- schema migration must still succeed (buckets can be created in the dashboard).
-- ============================================================================
do $$
begin
  insert into storage.buckets (id, name, public)
  values
    ('avatars', 'avatars', true),
    ('draw-thumbnails', 'draw-thumbnails', true),
    ('chat-audio', 'chat-audio', true),
    ('generated-images', 'generated-images', true)
  on conflict (id) do nothing;
exception when others then
  raise notice 'storage bucket bootstrap skipped: %', sqlerrm;
end $$;

do $$
begin
  -- Public read for the public buckets.
  drop policy if exists "public read business-os buckets" on storage.objects;
  create policy "public read business-os buckets" on storage.objects
    for select using (bucket_id in ('avatars', 'draw-thumbnails', 'chat-audio', 'generated-images'));

  -- Authenticated users can upload / overwrite / remove in those buckets
  -- (avatars + chat-audio are written from the browser with the user session;
  -- service-role uploads bypass RLS but are covered here for completeness).
  drop policy if exists "authenticated write business-os buckets" on storage.objects;
  create policy "authenticated write business-os buckets" on storage.objects
    for insert to authenticated
    with check (bucket_id in ('avatars', 'draw-thumbnails', 'chat-audio', 'generated-images'));

  drop policy if exists "authenticated update business-os buckets" on storage.objects;
  create policy "authenticated update business-os buckets" on storage.objects
    for update to authenticated
    using (bucket_id in ('avatars', 'draw-thumbnails', 'chat-audio', 'generated-images'));

  drop policy if exists "authenticated delete business-os buckets" on storage.objects;
  create policy "authenticated delete business-os buckets" on storage.objects
    for delete to authenticated
    using (bucket_id in ('avatars', 'draw-thumbnails', 'chat-audio', 'generated-images'));
exception when others then
  raise notice 'storage policy bootstrap skipped: %', sqlerrm;
end $$;

-- ============================================================================
-- END base_schema
-- ============================================================================
