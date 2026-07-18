-- ═══════════════════════════════════════════════════════════════════
-- ERP AGÉNTICO · ERP-0 · Migración 001 — NÚCLEO de la cadena mínima
-- ═══════════════════════════════════════════════════════════════════
-- Tablas del núcleo universal que toca la cadena  ped → fac → cfd → cob.
-- Todo vive en el esquema `erp` (aislado de `public`, que es de las verticales
-- Hermes con service_role). Aquí el modelo es el OPUESTO: RLS con políticas por
-- cliente_id y roles dedicados — la seguridad la aplica 004_seguridad.sql.
--
-- REGLAS DE DISEÑO OBLIGATORIAS (Parte IV, ERP-0):
--   · cliente_id NOT NULL en TODA tabla (multi-tenant desde el día uno).
--   · El núcleo NO asume retail: fac_concepto es un "concepto facturable"
--     genérico; la referencia a inv_articulo vive en el pack (002), no aquí.
--   · Constraints/checks en BD para toda regla determinista expresable en SQL
--     (totales cuadran, montos no negativos, estados válidos). Línea 1 de defensa.
--   · Nombres estrictos: <mod>_<entidad singular>.
--
-- Idempotente (IF NOT EXISTS): puede correrse más de una vez sin romper nada.
-- Aplicar PRIMERO en STAGING; snapshot antes de producción.
-- ═══════════════════════════════════════════════════════════════════

create schema if not exists erp;
create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ============================================================
-- COBRANZA · cob_cliente — el cliente comercial (quien nos debe)
-- OJO: cliente_id = TENANT (marca blanca); cob_cliente = el cliente final
-- del tenant. Dos conceptos distintos, no confundir.
-- ============================================================
create table if not exists erp.cob_cliente (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null,                     -- tenant (marca blanca)
  nombre          text not null,
  rfc             text,                              -- puede faltar hasta facturar
  regimen_fiscal  text,                              -- catálogo SAT c_RegimenFiscal
  uso_cfdi        text,                              -- catálogo SAT c_UsoCFDI
  limite_credito  numeric(14,2) not null default 0 check (limite_credito >= 0),
  bloqueado       boolean       not null default false,
  created_at      timestamptz   not null default now(),
  unique (cliente_id, rfc)
);
comment on table erp.cob_cliente is
  'Cliente comercial del tenant (deudor). cliente_id es el TENANT; este es su cliente final.';

-- ============================================================
-- COBRANZA · cob_saldo — saldo corriente por cliente comercial
-- Una fila por cob_cliente. Lo mantiene el CLI de cob (línea 1); aquí solo
-- garantizamos la estructura y la no-negatividad estructural.
-- ============================================================
create table if not exists erp.cob_saldo (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null,
  cob_cliente_id  uuid not null references erp.cob_cliente(id),
  saldo           numeric(14,2) not null default 0,   -- puede ser 0; a favor = negativo permitido
  actualizado_at  timestamptz   not null default now(),
  unique (cliente_id, cob_cliente_id)
);
comment on table erp.cob_saldo is 'Saldo corriente por cliente comercial (mantenido por el CLI cob).';

-- ============================================================
-- FACTURACIÓN · fac_factura — cabecera de factura
-- Los totales de CABECERA se validan con un CHECK de una sola fila (cuadre
-- determinista); la consistencia cabecera↔detalle la valida un trigger al
-- pasar a 'emitida' (ver más abajo).
-- ============================================================
create table if not exists erp.fac_factura (
  id                     uuid primary key default gen_random_uuid(),
  cliente_id             uuid not null,
  folio                  text not null,                 -- humano: FAC-0873 (folios en 003)
  cob_cliente_id         uuid not null references erp.cob_cliente(id),
  fecha                  date not null default current_date,
  -- Realidad fiscal (D-01): PUE cierra al timbrar; PPD obliga a REP por cobro.
  metodo_pago            text not null check (metodo_pago in ('PUE','PPD')),
  forma_pago             text not null,                 -- catálogo SAT c_FormaPago (01,03,99…)
  moneda                 text not null default 'MXN',
  tipo_cambio            numeric(14,6) not null default 1 check (tipo_cambio > 0),
  subtotal               numeric(14,2) not null default 0 check (subtotal              >= 0),
  impuestos_trasladados  numeric(14,2) not null default 0 check (impuestos_trasladados >= 0),
  impuestos_retenidos    numeric(14,2) not null default 0 check (impuestos_retenidos   >= 0),
  total                  numeric(14,2) not null default 0 check (total                 >= 0),
  estado                 text not null default 'borrador'
    check (estado in ('borrador','emitida','cancelada')),
  created_at             timestamptz not null default now(),
  unique (cliente_id, folio),
  -- CUADRE DE CABECERA (línea 1, una sola fila): total = subtotal + traslados - retenciones
  constraint fac_factura_cuadre_check
    check (total = subtotal + impuestos_trasladados - impuestos_retenidos)
);
comment on table erp.fac_factura is
  'Cabecera de factura. metodo_pago PUE/PPD (D-01). Cuadre de cabecera por CHECK; cuadre con detalle por trigger.';
create index if not exists fac_factura_cliente_idx on erp.fac_factura (cliente_id, fecha);
create index if not exists fac_factura_cob_cliente_idx on erp.fac_factura (cob_cliente_id);

-- ============================================================
-- FACTURACIÓN · fac_concepto — línea/concepto facturable (GENÉRICO)
-- No conoce retail: es un "concepto facturable". El pack (002) enlaza el
-- artículo hacia este concepto, nunca al revés.
-- ============================================================
create table if not exists erp.fac_concepto (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null,
  fac_factura_id   uuid not null references erp.fac_factura(id) on delete cascade,
  descripcion      text          not null,
  clave_prod_serv  text,                                 -- catálogo SAT c_ClaveProdServ
  clave_unidad     text,                                 -- catálogo SAT c_ClaveUnidad
  cantidad         numeric(14,4) not null check (cantidad > 0),
  valor_unitario   numeric(14,4) not null check (valor_unitario >= 0),
  importe          numeric(14,2) not null check (importe >= 0),
  created_at       timestamptz   not null default now(),
  -- importe = cantidad * valor_unitario (redondeado a 2), determinista por fila
  constraint fac_concepto_importe_calc_chk
    check (importe = round(cantidad * valor_unitario, 2))
);
comment on table erp.fac_concepto is 'Concepto facturable genérico (no asume retail). Detalle de fac_factura.';
create index if not exists fac_concepto_factura_idx on erp.fac_concepto (fac_factura_id);

-- ============================================================
-- FACTURACIÓN · fac_impuesto — impuesto POR CONCEPTO (CFDI 4.0)
-- El CFDI 4.0 exige el desglose por concepto; un campo único de "impuesto"
-- NO sobrevive al PAC real. tipo × naturaleza × tasa × base = importe.
-- ============================================================
create table if not exists erp.fac_impuesto (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null,
  fac_concepto_id  uuid not null references erp.fac_concepto(id) on delete cascade,
  tipo             text not null check (tipo in ('IVA','ISR','IEPS')),
  naturaleza       text not null check (naturaleza in ('traslado','retencion')),
  tasa             numeric(9,6)  not null check (tasa >= 0),   -- ej. 0.160000
  base             numeric(14,2) not null check (base >= 0),
  importe          numeric(14,2) not null check (importe >= 0),
  created_at       timestamptz   not null default now(),
  -- importe = round(base * tasa, 2), determinista por fila
  constraint fac_impuesto_importe_calc_chk
    check (importe = round(base * tasa, 2))
);
comment on table erp.fac_impuesto is 'Impuesto por concepto (CFDI 4.0): tipo/naturaleza/tasa/base/importe. Detalle de fac_concepto.';
create index if not exists fac_impuesto_concepto_idx on erp.fac_impuesto (fac_concepto_id);

-- ============================================================
-- COBRANZA · cob_cobro — cada cobro es una ENTIDAD propia
-- El REP se timbra SOBRE cobros, no sobre saldos. Qué facturas abona vive en
-- la tabla de aplicación (cob_cobro_aplicacion).
-- ============================================================
create table if not exists erp.cob_cobro (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null,
  folio           text not null,                          -- humano: COB-0455
  cob_cliente_id  uuid not null references erp.cob_cliente(id),
  fecha           date not null default current_date,
  monto           numeric(14,2) not null check (monto > 0),
  forma_pago      text not null,                          -- catálogo SAT c_FormaPago
  moneda          text not null default 'MXN',
  estado          text not null default 'registrado'
    check (estado in ('registrado','aplicado','cancelado')),
  created_at      timestamptz not null default now(),
  unique (cliente_id, folio)
);
comment on table erp.cob_cobro is 'Cobro como entidad propia (el REP se timbra sobre cobros). Qué abona: cob_cobro_aplicacion.';
create index if not exists cob_cobro_cliente_idx on erp.cob_cobro (cliente_id, fecha);
create index if not exists cob_cobro_cob_cliente_idx on erp.cob_cobro (cob_cliente_id);

-- ============================================================
-- COBRANZA · cob_cobro_aplicacion — qué facturas abona un cobro
-- ============================================================
create table if not exists erp.cob_cobro_aplicacion (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null,
  cob_cobro_id    uuid not null references erp.cob_cobro(id)   on delete cascade,
  fac_factura_id  uuid not null references erp.fac_factura(id),
  importe         numeric(14,2) not null check (importe > 0),
  created_at      timestamptz not null default now(),
  unique (cob_cobro_id, fac_factura_id)
);
comment on table erp.cob_cobro_aplicacion is 'Aplicación cobro→factura (importe abonado). Base del cálculo de REP.';
create index if not exists cob_cobro_aplic_factura_idx on erp.cob_cobro_aplicacion (fac_factura_id);

-- ============================================================
-- CFDI · cfd_folio — serie/consecutivo FISCAL del CFDI
-- Distinto del folio humano (FAC-/COB-): este es la numeración fiscal por
-- serie que exige el SAT.
-- ============================================================
create table if not exists erp.cfd_folio (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null,
  serie        text not null,
  folio_num    bigint not null check (folio_num > 0),
  created_at   timestamptz not null default now(),
  unique (cliente_id, serie, folio_num)
);
comment on table erp.cfd_folio is 'Numeración fiscal (serie + consecutivo) del CFDI, distinta del folio humano.';

-- ============================================================
-- CFDI · cfd_timbre — el acto de timbrado (estado + tipo)
-- Admite el estado INTERMEDIO (clave del incidente real: timeout del PAC).
-- Polimórfico: timbra una factura (ingreso/nota_credito) o un cobro (pago/REP).
-- Idempotencia por llave (ERP-1); aquí ya reservamos la columna y su unicidad.
-- ============================================================
create table if not exists erp.cfd_timbre (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid not null,
  tipo              text not null check (tipo in ('ingreso','pago','nota_credito')),
  -- referencia polimórfica al documento origen
  documento_tipo    text not null check (documento_tipo in ('factura','cobro')),
  documento_id      uuid not null,
  cfd_folio_id      uuid references erp.cfd_folio(id),
  estado            text not null default 'borrador'
    check (estado in ('borrador','enviado_sin_respuesta','timbrado','cancelado')),
  uuid_fiscal       uuid,                                 -- folio fiscal del SAT (al timbrar)
  sello_cfd         text,
  sello_sat         text,
  fecha_timbrado    timestamptz,
  motivo_cancelacion text,                                -- catálogo SAT (01-04) al cancelar
  llave_idempotencia text,                                -- --llave (ERP-1)
  xml               text,
  pac_respuesta     jsonb,
  es_simulado       boolean not null default true,        -- MOCK hasta ERP-2 (PAC real)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (cliente_id, uuid_fiscal),
  unique (cliente_id, llave_idempotencia)
);
comment on table erp.cfd_timbre is
  'Acto de timbrado CFDI. estado admite el INTERMEDIO (timeout PAC); tipo ingreso/pago[REP]/nota_credito. Idempotente por llave.';
create index if not exists cfd_timbre_documento_idx on erp.cfd_timbre (documento_tipo, documento_id);
create index if not exists cfd_timbre_estado_idx on erp.cfd_timbre (cliente_id, estado);

-- ============================================================
-- SISTEMA · sis_encargo — cola PERSISTENTE del orquestador
-- Los encargos en curso viven aquí, NO en la memoria del contenedor: todo
-- reinicio de hermes-negocio retoma desde esta tabla.
-- ============================================================
create table if not exists erp.sis_encargo (
  id                 uuid primary key default gen_random_uuid(),
  cliente_id         uuid not null,
  encargo            text not null,                        -- lo que pidió el humano por Slack
  estado             text not null default 'recibido'
    check (estado in ('recibido','en_proceso','espera_aprobacion','completado','fallido','cancelado')),
  -- EJE D+I (v4/1.7): la clasificación contable y la evidencia de I+D nacen en
  -- el ORIGEN del encargo, no se reconstruyen después. investigacion→gasto,
  -- desarrollo→capitalizable (si NIF C-8), operacion→venta/operación normal.
  eje_dei            text not null default 'operacion'
    check (eje_dei in ('investigacion','desarrollo','operacion')),
  -- TRAZA_ID (v5/1.8): el uuid que viaja por toda la operación (del Slack al
  -- asiento). Lo genera el encargo y se propaga a cada fila de sis_bitacora.
  traza_id           uuid not null default gen_random_uuid(),
  paso_actual        text,
  agente_asignado    text,                                 -- exe-fin, sup-fin, …
  slack_hilo_ref     text,                                 -- channel:ts del hilo
  dry_run_hash       text,                                 -- hash del dry-run pendiente de aprobar
  aprobacion_vence_at timestamptz,                         -- caducidad del botón (D-04: 30 min)
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
comment on table erp.sis_encargo is
  'Cola persistente del orquestador. El estado del encargo vive en BD, no en el contenedor (retoma tras reinicio). Origen del eje D+I y del traza_id.';
create index if not exists sis_encargo_estado_idx on erp.sis_encargo (cliente_id, estado);
create index if not exists sis_encargo_traza_idx  on erp.sis_encargo (traza_id);

-- ============================================================
-- SISTEMA · sis_bitacora — auditoría append-only
-- Quién (agente o humano), qué verbo, sobre qué entidad, cuándo, payload,
-- resultado y quién aprobó. Poblada por el propio CLI en cada escritura.
-- ============================================================
create table if not exists erp.sis_bitacora (
  id            bigint generated always as identity primary key,
  cliente_id    uuid not null,
  -- TRAZA_ID NOT NULL (v5): una escritura sin traza NO debe poder existir.
  -- Sin default a propósito: el CLI DEBE propagar la traza del encargo; forzar
  -- un default disfrazaría escrituras sin origen. Es el eje de `aud trazar`.
  traza_id      uuid not null,
  actor         text not null,                             -- id de agente o de humano (Slack user id)
  actor_tipo    text not null check (actor_tipo in ('agente','humano','sistema')),
  modulo        text not null,                             -- cob, fac, cfd, …
  verbo         text not null,                             -- crear, emitir, timbrar, cancelar…
  entidad_tipo  text,
  entidad_id    text,
  payload       jsonb,
  resultado     text not null check (resultado in ('ok','rechazo','error')),
  aprobado_por  text,                                      -- Slack user id del aprobador si aplica
  created_at    timestamptz not null default now()
);
comment on table erp.sis_bitacora is
  'Bitácora de auditoría append-only: cada verbo, cada actor, cada escritura, su aprobador y su traza_id (obligatorio).';
create index if not exists sis_bitacora_cliente_idx on erp.sis_bitacora (cliente_id, created_at);
create index if not exists sis_bitacora_entidad_idx on erp.sis_bitacora (entidad_tipo, entidad_id);
create index if not exists sis_bitacora_traza_idx   on erp.sis_bitacora (traza_id);

-- ============================================================
-- SISTEMA · sis_agente — TARJETA DE AGENTE (agent card A2A, v5)
-- Fuente de verdad de lo que cada agente DEBE poder hacer. dep-aud (ERP-4C)
-- la compara contra lo que realmente PUEDE (grants reales, binarios montados,
-- hash del AGENTS.md vivo). Sin tarjeta no hay operación; la deriva es hallazgo.
-- El historial de versiones vive en sis_agente_version.
-- ============================================================
create table if not exists erp.sis_agente (
  id                 uuid primary key default gen_random_uuid(),
  cliente_id         uuid not null,
  agente             text not null,                        -- hermes-negocio, exe-fin, sup-fin, swm-aud-erp…
  departamento       text not null,                        -- dep-fin, dep-aud, …
  proposito          text not null,
  clis_permitidos    jsonb not null default '[]'::jsonb,   -- ["fac","cfd",…]
  verbos_permitidos  jsonb not null default '{}'::jsonb,   -- {"fac":["emitir"],"cfd":["timbrar"]}
  rol_postgres       text,                                 -- rol_exe_fin | rol_swm | rol_admin
  modelo             text,                                 -- glm-5.2, claude-sonnet-5, …
  agents_md_hash     text,                                 -- hash del AGENTS.md vigente (verificación al arranque)
  aprobadores        jsonb not null default '[]'::jsonb,   -- Slack user ids asociados
  estado             text not null default 'activo'
    check (estado in ('activo','suspendido','baja')),
  version            int  not null default 1 check (version > 0),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (cliente_id, agente)
);
comment on table erp.sis_agente is
  'Tarjeta de agente (agent card A2A): lo que cada agente DEBE poder hacer. La auditoría la compara contra la realidad.';
create index if not exists sis_agente_depto_idx on erp.sis_agente (cliente_id, departamento);

create table if not exists erp.sis_agente_version (
  id                 uuid primary key default gen_random_uuid(),
  cliente_id         uuid not null,
  sis_agente_id      uuid not null references erp.sis_agente(id) on delete cascade,
  version            int  not null check (version > 0),
  snapshot           jsonb not null,                       -- copia de la tarjeta en esa versión
  agents_md_hash     text,
  motivo             text,                                 -- por qué cambió (cambio de tarjeta = aprobación humana)
  created_at         timestamptz not null default now(),
  unique (sis_agente_id, version)
);
comment on table erp.sis_agente_version is
  'Historial de versiones de la tarjeta de agente. Cambiar una tarjeta exige aprobación humana (D-14).';
create index if not exists sis_agente_version_idx on erp.sis_agente_version (sis_agente_id, version desc);

-- ============================================================
-- TRIGGER · cuadre CABECERA ↔ DETALLE al emitir la factura
-- El CHECK de fila ya garantiza total = subtotal + traslados - retenciones.
-- Este trigger garantiza que esos totales de cabecera IGUALAN la suma del
-- detalle (conceptos + impuestos) cuando la factura pasa a 'emitida'.
-- Regla determinista obligatoria (Parte IV, ERP-0, paso 004 · diseño).
-- ============================================================
create or replace function erp.fac_verificar_cuadre() returns trigger
language plpgsql as $$
declare
  v_subtotal   numeric(14,2);
  v_traslados  numeric(14,2);
  v_retenidos  numeric(14,2);
  v_conceptos  int;
begin
  -- solo exigimos cuadre al EMITIR (borrador puede estar incompleto)
  if new.estado <> 'emitida' then
    return new;
  end if;

  select coalesce(sum(c.importe),0), count(*)
    into v_subtotal, v_conceptos
    from erp.fac_concepto c
   where c.fac_factura_id = new.id;

  if v_conceptos = 0 then
    raise exception 'fac_factura % no puede emitirse sin conceptos', new.folio
      using errcode = 'check_violation';
  end if;

  select
    coalesce(sum(i.importe) filter (where i.naturaleza = 'traslado'), 0),
    coalesce(sum(i.importe) filter (where i.naturaleza = 'retencion'), 0)
    into v_traslados, v_retenidos
    from erp.fac_impuesto i
    join erp.fac_concepto c on c.id = i.fac_concepto_id
   where c.fac_factura_id = new.id;

  if new.subtotal <> v_subtotal
     or new.impuestos_trasladados <> v_traslados
     or new.impuestos_retenidos  <> v_retenidos then
    raise exception
      'descuadre cabecera↔detalle en %: subtotal % vs %, traslados % vs %, retenciones % vs %',
      new.folio, new.subtotal, v_subtotal, new.impuestos_trasladados, v_traslados,
      new.impuestos_retenidos, v_retenidos
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists fac_factura_cuadre_trg on erp.fac_factura;
create trigger fac_factura_cuadre_trg
  before insert or update on erp.fac_factura
  for each row execute function erp.fac_verificar_cuadre();

-- ============================================================
-- TRIGGER · transiciones VÁLIDAS del timbre fiscal
-- borrador → enviado_sin_respuesta → timbrado → cancelado.
-- No se puede saltar ni retroceder (fuera de la reconciliación del PAC).
-- ============================================================
create or replace function erp.cfd_timbre_transicion() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    return new;
  end if;
  if old.estado = new.estado then
    return new;
  end if;
  if not (
       (old.estado = 'borrador'              and new.estado in ('enviado_sin_respuesta','timbrado','cancelado'))
    or (old.estado = 'enviado_sin_respuesta' and new.estado in ('timbrado','cancelado'))
    or (old.estado = 'timbrado'              and new.estado = 'cancelado')
  ) then
    raise exception 'transición de timbre inválida: % → %', old.estado, new.estado
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists cfd_timbre_transicion_trg on erp.cfd_timbre;
create trigger cfd_timbre_transicion_trg
  before insert or update on erp.cfd_timbre
  for each row execute function erp.cfd_timbre_transicion();
