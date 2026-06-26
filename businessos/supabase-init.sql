-- BusinessOS — esquema Supabase (Fase 0)
-- Tablas: token_usage (presupuesto, lo escriben las 3 verticales)
--         facturas    (las procesa la vertical clientes)
--
-- SEGURIDAD: ambas tablas son de BACKEND. Los contenedores Hermes escriben/leen
-- con SUPABASE_SERVICE_ROLE_KEY, que BYPASSEA RLS. Habilitamos RLS SIN politicas
-- a proposito: asi 'anon' y 'authenticated' no ven nada (cerrado por defecto) y
-- solo el service_role del servidor puede tocar los datos.
--
-- Aplicar: Supabase Studio → SQL Editor, o `apply_migration` por MCP, o CLI.
-- Es idempotente (IF NOT EXISTS): puedes correrlo mas de una vez sin romper nada.

-- ============================================================
-- token_usage
-- ============================================================
create table if not exists public.token_usage (
  id          bigint generated always as identity primary key,
  fecha       date         not null default current_date,
  vertical    text         not null check (vertical in ('personal','negocio','clientes')),
  modelo      text         not null,
  tokens_in   integer      not null default 0 check (tokens_in  >= 0),
  tokens_out  integer      not null default 0 check (tokens_out >= 0),
  costo_usd   numeric(10,6) not null default 0 check (costo_usd >= 0),
  created_at  timestamptz  not null default now()
);

comment on table public.token_usage is
  'Una fila por llamada relevante a un modelo. Fuente de verdad del presupuesto de tokens (lo vigila la vertical negocio).';

create index if not exists token_usage_fecha_idx          on public.token_usage (fecha);
create index if not exists token_usage_vertical_fecha_idx on public.token_usage (vertical, fecha);

alter table public.token_usage enable row level security;
-- (sin politicas: solo service_role accede)

-- ============================================================
-- facturas
-- ============================================================
create table if not exists public.facturas (
  id          bigint generated always as identity primary key,
  cliente     text          not null,
  folio       text          not null,
  fecha       date          not null,
  -- line items: [{ "descripcion": "...", "cantidad": 1, "importe": 0.00 }, ...]
  conceptos   jsonb         not null default '[]'::jsonb,
  subtotal    numeric(12,2) not null default 0 check (subtotal  >= 0),
  impuestos   numeric(12,2) not null default 0 check (impuestos >= 0),
  total       numeric(12,2) not null default 0 check (total     >= 0),
  -- Deducibilidad: la determina el servicio 'grafo' (Fase futura). Hasta
  -- entonces queda 'pendiente'. NO la decide la vertical clientes por su cuenta.
  deducibilidad_estado  text not null default 'pendiente'
    check (deducibilidad_estado in ('pendiente','deducible','no_deducible','dudoso')),
  -- veredicto + razon por concepto que devuelve grafo, p. ej.
  -- { "conceptos": [{ "descripcion": "...", "estado": "deducible", "razon": "..." }] }
  deducibilidad_detalle jsonb,
  created_at  timestamptz   not null default now(),
  -- evita duplicar la misma factura al reprocesarla
  unique (cliente, folio)
);

comment on table public.facturas is
  'Facturas extraidas de imagen/PDF por la vertical clientes. En Fase 0 la deducibilidad queda pendiente hasta que exista el servicio grafo.';

create index if not exists facturas_cliente_idx   on public.facturas (cliente);
create index if not exists facturas_fecha_idx     on public.facturas (fecha);
create index if not exists facturas_deduc_idx     on public.facturas (deducibilidad_estado);

alter table public.facturas enable row level security;
-- (sin politicas: solo service_role accede)
