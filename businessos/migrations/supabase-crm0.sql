-- CRM-0 — fundación del CRM conversacional marca blanca (fase CRM-0 del blueprint
-- crm/propuesta-crm-marca-blanca.md). Prefijo crm_ en TODO: cero colisión con las
-- tablas del negocio ni las 31 del frontend (aprendizaje 2026-07-15: diffear nombres
-- antes de migrar sobre BD compartida). Sin funciones/triggers sobre auth.users.
-- Idempotente: create if not exists + drop policy/create.

-- 1. Tenants (la unidad de marca blanca: SU marca, SU tono, SUS casos de uso)
create table if not exists crm_tenants (
  tenant_id   text primary key,                 -- slug estable, ej. 'a2a-demo'
  marca       text not null,                    -- nombre comercial que ve el cliente final
  tono        text not null default '',         -- instrucciones de tono/persona
  casos_uso   jsonb not null default '[]'::jsonb, -- ["preventa","soporte","agenda"]
  canales     jsonb not null default '{}'::jsonb, -- {"telegram":{"habilitado":true},"whatsapp":{"habilitado":true,"phone_id":"..."}}
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. Contactos (un solo perfil aunque escriba por dos canales)
create table if not exists crm_contactos (
  id          bigint generated always as identity primary key,
  tenant_id   text not null references crm_tenants(tenant_id),
  canal       text not null check (canal in ('telegram','whatsapp')),
  canal_uid   text not null,                    -- chat_id de Telegram / wa_id de WhatsApp
  nombre      text,
  telefono    text,
  email       text,
  datos       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tenant_id, canal, canal_uid)          -- upsert idempotente por identidad de canal
);

-- 3. Conversaciones (hilo por contacto; nivel de atención del plan D-40)
create table if not exists crm_conversaciones (
  id          bigint generated always as identity primary key,
  tenant_id   text not null references crm_tenants(tenant_id),
  contacto_id bigint not null references crm_contactos(id),
  estado      text not null default 'abierta' check (estado in ('abierta','escalada','cerrada')),
  nivel       text not null default 'A0' check (nivel in ('A0','A1','A2','A3')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 4. Mensajes (traza completa; la bitácora que promete la propuesta)
create table if not exists crm_mensajes (
  id           bigint generated always as identity primary key,
  tenant_id    text not null references crm_tenants(tenant_id),
  conversacion_id bigint not null references crm_conversaciones(id),
  direccion    text not null check (direccion in ('entrante','saliente')),
  canal        text not null check (canal in ('telegram','whatsapp')),
  texto        text not null,
  emisor       text not null default 'cliente' check (emisor in ('cliente','agente','humano')),
  enviado      boolean,                         -- salientes: ¿salió por el canal? null = entrante
  datos        jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists crm_mensajes_conv_idx on crm_mensajes (conversacion_id, created_at);
create index if not exists crm_conversaciones_tenant_idx on crm_conversaciones (tenant_id, estado);

-- RLS: TODO cerrado; solo service_role (el conector) opera. Sin acceso anon/authenticated.
alter table crm_tenants enable row level security;
alter table crm_contactos enable row level security;
alter table crm_conversaciones enable row level security;
alter table crm_mensajes enable row level security;
-- (sin policies: service_role las bypassea; anon/authenticated quedan sin acceso)
