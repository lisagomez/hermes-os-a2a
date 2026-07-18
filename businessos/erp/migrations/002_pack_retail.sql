-- ═══════════════════════════════════════════════════════════════════
-- ERP AGÉNTICO · ERP-0 · Migración 002 — PACK RETAIL (el primer vertical)
-- ═══════════════════════════════════════════════════════════════════
-- Tablas del pack retail que toca la cadena mínima: inventario y pedido.
-- El pack DEPENDE del núcleo (001), nunca al revés. El enlace artículo→concepto
-- facturable se materializa en ped_partida; fac_concepto (núcleo) sigue genérico.
--
-- cliente_id NOT NULL en toda tabla. Idempotente. STAGING primero.
-- ═══════════════════════════════════════════════════════════════════

-- ============================================================
-- INVENTARIO · inv_articulo — artículo/SKU
-- ============================================================
create table if not exists erp.inv_articulo (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null,
  sku              text not null,
  nombre           text not null,
  clave_prod_serv  text,                                   -- catálogo SAT (para facturar)
  clave_unidad     text,
  existencia       numeric(14,4) not null default 0,       -- puede ser negativa: se detecta, no se prohíbe aquí
  activo           boolean not null default true,
  created_at       timestamptz not null default now(),
  unique (cliente_id, sku)
);
comment on table erp.inv_articulo is 'Artículo de inventario (retail). Puede facturarse vía fac_concepto genérico.';
create index if not exists inv_articulo_cliente_idx on erp.inv_articulo (cliente_id);

-- ============================================================
-- INVENTARIO · inv_precio — precio vigente por artículo
-- Historial por vigencia; el precio efectivo es el de vigencia más reciente
-- <= fecha de la operación.
-- ============================================================
create table if not exists erp.inv_precio (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null,
  inv_articulo_id  uuid not null references erp.inv_articulo(id) on delete cascade,
  precio           numeric(14,4) not null check (precio >= 0),
  moneda           text not null default 'MXN',
  vigencia_desde   date not null default current_date,
  created_at       timestamptz not null default now(),
  unique (cliente_id, inv_articulo_id, vigencia_desde)
);
comment on table erp.inv_precio is 'Precio por artículo con vigencia. El efectivo es el más reciente <= fecha.';
create index if not exists inv_precio_articulo_idx on erp.inv_precio (inv_articulo_id, vigencia_desde desc);

-- ============================================================
-- PEDIDOS · ped_pedido — cabecera de pedido (previo a la factura)
-- ============================================================
create table if not exists erp.ped_pedido (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null,
  folio           text not null,                           -- humano: PED-1042
  cob_cliente_id  uuid not null references erp.cob_cliente(id),
  fecha           date not null default current_date,
  estado          text not null default 'borrador'
    check (estado in ('borrador','confirmado','facturado','cancelado')),
  subtotal        numeric(14,2) not null default 0 check (subtotal >= 0),
  total           numeric(14,2) not null default 0 check (total    >= 0),
  -- factura resultante (se llena al facturar); el pack referencia al núcleo
  fac_factura_id  uuid references erp.fac_factura(id),
  created_at      timestamptz not null default now(),
  unique (cliente_id, folio)
);
comment on table erp.ped_pedido is 'Pedido (retail): paso previo a fac_factura. Al facturar apunta a la factura del núcleo.';
create index if not exists ped_pedido_cliente_idx on erp.ped_pedido (cliente_id, fecha);
create index if not exists ped_pedido_cob_cliente_idx on erp.ped_pedido (cob_cliente_id);

-- ============================================================
-- PEDIDOS · ped_partida — renglón de pedido (artículo × cantidad)
-- Aquí vive el enlace RETAIL artículo→línea; el núcleo no lo conoce.
-- ============================================================
create table if not exists erp.ped_partida (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null,
  ped_pedido_id    uuid not null references erp.ped_pedido(id)   on delete cascade,
  inv_articulo_id  uuid not null references erp.inv_articulo(id),
  cantidad         numeric(14,4) not null check (cantidad > 0),
  precio_unitario  numeric(14,4) not null check (precio_unitario >= 0),
  importe          numeric(14,2) not null check (importe >= 0),
  created_at       timestamptz not null default now(),
  constraint ped_partida_importe_calc_chk
    check (importe = round(cantidad * precio_unitario, 2))
);
comment on table erp.ped_partida is 'Renglón de pedido: enlace retail artículo→línea (el núcleo permanece genérico).';
create index if not exists ped_partida_pedido_idx on erp.ped_partida (ped_pedido_id);
create index if not exists ped_partida_articulo_idx on erp.ped_partida (inv_articulo_id);
