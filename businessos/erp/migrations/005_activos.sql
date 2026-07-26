-- ═══════════════════════════════════════════════════════════════════
-- ERP AGÉNTICO · ERP-4B · Migración 005 — Módulo act (activos digitales)
-- ═══════════════════════════════════════════════════════════════════
-- El proyecto se inventaría a sí mismo (ERP-MAESTRO §1.6-1.7, ERP-4B):
-- ciclo DETECTAR (swm-act, solo lectura) → CATALOGAR (trío con compuertas)
-- → REGISTRAR contablemente (política auditada + aprobación humana).
--
-- act vive en el NÚCLEO (D-08): los activos del propio proyecto se catalogan
-- bajo el cliente_id de la casa, con las MISMAS tablas que después
-- inventariarán los activos digitales de los clientes de la marca blanca.
--   ERP_CLIENTE_CASA = 2de8835a-439c-461a-990c-a2b95d29f3a4
--   (acuñado 2026-07-26; también en el .env del host y en la memoria del repo)
--
-- REGLAS DE DISEÑO (mismas de ERP-0):
--   · cliente_id NOT NULL en toda tabla; RLS la aplica 004 (RE-CORRER 004
--     después de esta migración: la RLS va por bucle sobre pg_tables).
--   · Constraints en BD para toda regla determinista (línea 1 de defensa).
--   · act_version y act_costo son APPEND-ONLY (mismo trato que sis_bitacora):
--     los REVOKE viven al final de este archivo y hay que re-correrlos
--     también después de cada re-corrida de 004.
--   · Nombres estrictos: act_<entidad singular>. Folio humano ACT- (003 ya
--     lo tiene en la whitelist).
--   · DOS decisiones son SIEMPRE humanas (ERP-MAESTRO §4B paso 4): marcar o
--     degradar DEFENSIBILIDAD, y la capitalización/baja contable. Por eso
--     defensibilidad_estado nace 'propuesta' y estatus_contable 'pendiente';
--     los CHECK de coherencia impiden ratificar/capitalizar sin rastro.
--
-- Idempotente (IF NOT EXISTS): puede correrse más de una vez sin romper nada.
-- Aplicar PRIMERO en staging efímero; snapshot antes de producción.
-- ═══════════════════════════════════════════════════════════════════

create schema if not exists erp;
create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ============================================================
-- ACTIVOS · act_activo — el catálogo de activos digitales
-- Un activo = artefacto digital discreto con valor replicable (software,
-- config agéntica, datos, documento, infraestructura, licencia). El eje_dei
-- se HEREDA del origen (encargo/tarea, 2 valores: 'operacion' no fabrica
-- activos — esa regla vive en el contrato del trío y en el cosechador).
-- ============================================================
create table if not exists erp.act_activo (
  id                     uuid primary key default gen_random_uuid(),
  cliente_id             uuid not null,                  -- tenant (la casa o un cliente white-label)
  folio                  text not null,                  -- humano: ACT-0031 (folios en 003)
  nombre                 text not null,
  tipo                   text not null check (tipo in
    ('software','config_agentica','datos','documento','infraestructura','licencia_suscripcion')),
  descripcion            text,
  ubicacion              text not null,                  -- repo/ruta/URL verificable
  hash_vigente           text,                           -- hash o commit de la versión vigente
  version_vigente        text,
  responsable            text not null default 'dep-fin',-- dep-* que responde por el activo
  estado                 text not null default 'activo'
    check (estado in ('activo','baja')),
  -- Clasificación estratégica en DOS EJES ortogonales (§1.7):
  eje_dei                text not null
    check (eje_dei in ('investigacion','desarrollo')),
  defensibilidad         text not null default 'reemplazable'
    check (defensibilidad in ('defendible','reemplazable')),
  -- Ratificar la defensibilidad es DECISIÓN HUMANA (D-10): los agentes solo
  -- escriben 'propuesta'; 'ratificada' exige quién y cuándo (CHECK abajo).
  defensibilidad_estado  text not null default 'propuesta'
    check (defensibilidad_estado in ('propuesta','ratificada')),
  ratificado_por         text,                           -- Slack user id / 'elisa(host)'
  ratificado_at          timestamptz,
  -- Enlaces de origen (FK lógicas, cross-esquema — mismo criterio que
  -- tareas.parent_id: la integridad la garantiza el proceso, no la BD):
  ref_catalogo           text,                           -- A2A-NNN del catálogo bootstrap (businessos/activos/)
  origen_task_id         text,                           -- public.tareas.task_id que lo produjo
  origen_encargo_id      uuid,                           -- erp.sis_encargo.id si nació de un encargo
  -- Campos contables (la política vive en reglas/act-contable.md, D-07):
  costo_acumulado        numeric(14,2) not null default 0 check (costo_acumulado >= 0),
  estatus_contable       text not null default 'pendiente'
    check (estatus_contable in ('pendiente','capitalizado','gasto')),
  fecha_alta_contable    date,
  vida_util_meses        integer check (vida_util_meses > 0),
  metodo_amortizacion    text,                           -- p.ej. 'linea_recta' (política)
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (cliente_id, folio),
  unique (cliente_id, ref_catalogo),
  -- COHERENCIA (línea 1): ratificada ⇒ hay ratificador; contabilizado ⇒ hay fecha.
  constraint act_activo_ratificacion_check
    check (defensibilidad_estado = 'propuesta'
           or (ratificado_por is not null and ratificado_at is not null)),
  constraint act_activo_contable_check
    check (estatus_contable = 'pendiente' or fecha_alta_contable is not null),
  -- Capitalizar exige parámetros de amortización; mandar a gasto no.
  constraint act_activo_amortizacion_check
    check (estatus_contable <> 'capitalizado'
           or (vida_util_meses is not null and metodo_amortizacion is not null))
);
comment on table erp.act_activo is
  'Catálogo de activos digitales (ERP-4B). Clasificación en dos ejes (§1.7); defensibilidad ratificada solo por humano (D-10); alta contable solo con política auditada (D-07).';
create index if not exists act_activo_cliente_idx  on erp.act_activo (cliente_id, estado);
create index if not exists act_activo_task_idx     on erp.act_activo (origen_task_id);
create index if not exists act_activo_contable_idx on erp.act_activo (cliente_id, estatus_contable);

-- ============================================================
-- ACTIVOS · act_version — historial de versiones (APPEND-ONLY)
-- Cada cambio detectado (cosechador o swm-act ratificado por catalogación)
-- deja una versión con hash, fecha y origen. No se edita ni se borra: es
-- historia. El "vigente" vive en act_activo.{version,hash}_vigente.
-- ============================================================
create table if not exists erp.act_version (
  id              bigint generated always as identity primary key,
  cliente_id      uuid not null,
  activo_id       uuid not null references erp.act_activo(id),
  version         text not null,
  hash            text,                                  -- commit/sha256 según el tipo de activo
  origen          text not null,                         -- 'tarea:<task_id>' | 'cosecha-inicial' | 'fase:ERP-4' | …
  origen_task_id  text,
  created_at      timestamptz not null default now()
);
comment on table erp.act_version is
  'Historial append-only de versiones por activo: hash, fecha y origen (ERP-4B paso 1).';
create index if not exists act_version_activo_idx on erp.act_version (activo_id, created_at);

-- ============================================================
-- ACTIVOS · act_proteccion — expediente de los DEFENDIBLES
-- "La ley solo protege el secreto industrial con medidas razonables
-- DEMOSTRABLES — el expediente vive en act" (§1.7). Vencimientos alertan a
-- #ops-alertas (como los CSD).
-- ============================================================
create table if not exists erp.act_proteccion (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null,
  activo_id       uuid not null references erp.act_activo(id),
  mecanismo       text not null check (mecanismo in
    ('secreto_industrial','derecho_autor','marca','contrato_cesion')),
  estatus         text not null default 'iniciado'
    check (estatus in ('iniciado','vigente','vencido','descartado')),
  folio_registro  text,                                  -- folio oficial si existe (IMPI, INDAUTOR…)
  vencimiento     date,                                  -- dispara alerta de renovación
  medidas         text,                                  -- medidas de acceso vigentes (la prueba demostrable)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table erp.act_proteccion is
  'Expediente de protección por activo defendible: mecanismo, estatus, folio, vencimiento y medidas demostrables (ERP-4B paso 6).';
create index if not exists act_proteccion_activo_idx on erp.act_proteccion (activo_id);
create index if not exists act_proteccion_vence_idx  on erp.act_proteccion (vencimiento)
  where vencimiento is not null;

-- ============================================================
-- ACTIVOS · act_costo — acumulación de costo por activo (APPEND-ONLY)
-- "El costo no se estima de memoria: se suma de datos que el sistema ya
-- mide" (§4B paso 1). Tres componentes; fuente OBLIGATORIA (regla del
-- ledger del catálogo: nunca aparentar precisión que no hay).
-- Solo USD por ahora (multi-moneda llega con ctb/mon, ERP-5): mezclar
-- monedas en costo_acumulado sería mentir con un número.
-- ============================================================
create table if not exists erp.act_costo (
  id                 bigint generated always as identity primary key,
  cliente_id         uuid not null,
  activo_id          uuid not null references erp.act_activo(id),
  componente         text not null check (componente in
    ('tokens','horas_humanas','infraestructura')),
  monto              numeric(14,2) not null check (monto >= 0),
  moneda             text not null default 'USD' check (moneda = 'USD'),
  -- Heredado del ORIGEN (encargo/tarea) — jamás se reconstruye después (§1.7):
  eje_dei            text not null check (eje_dei in ('investigacion','desarrollo')),
  origen_task_id     text,                               -- suma de token_usage.task_id (tarea + sub-tareas)
  origen_encargo_id  uuid,
  tokens_in          bigint check (tokens_in  >= 0),     -- para componente 'tokens': los tokens son
  tokens_out         bigint check (tokens_out >= 0),     -- autoritativos; el monto puede ser recalculado
  fuente             text not null,                      -- de dónde sale el monto (declarada SIEMPRE)
  periodo            date,                               -- mes al que corresponde (infra prorrateada)
  created_at         timestamptz not null default now()
);
comment on table erp.act_costo is
  'Ledger append-only de costo por activo: tokens (token_usage.task_id), horas humanas declaradas, infra prorrateada. fuente obligatoria; eje_dei heredado del origen.';
create index if not exists act_costo_activo_idx on erp.act_costo (activo_id, created_at);
create index if not exists act_costo_task_idx   on erp.act_costo (origen_task_id);

-- ============================================================
-- TRIGGER · el costo_acumulado se MANTIENE SOLO (línea 1 de defensa)
-- Cada inserción en act_costo recalcula el acumulado del activo desde el
-- ledger (suma, no incremento: idempotente ante re-cálculo y a prueba de
-- dobles disparos). Nadie escribe costo_acumulado a mano.
-- ============================================================
create or replace function erp.act_actualiza_costo() returns trigger as $$
begin
  update erp.act_activo
     set costo_acumulado = (
           select coalesce(sum(monto), 0)
             from erp.act_costo
            where activo_id = new.activo_id),
         updated_at = now()
   where id = new.activo_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists act_costo_acumula on erp.act_costo;
create trigger act_costo_acumula
  after insert on erp.act_costo
  for each row execute function erp.act_actualiza_costo();

-- ============================================================
-- SEGURIDAD DEL MÓDULO (complementa 004 — RE-CORRER ESTA SECCIÓN
-- después de cada re-corrida de 004, igual que el revoke de sis_bitacora)
-- ============================================================
-- El historial y el ledger de costo son APPEND-ONLY para el ejecutor.
-- En DO block por si esta migración corre antes que 004 (roles aún sin crear):
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'rol_exe_fin') then
    revoke update on erp.act_version from rol_exe_fin;
    revoke update on erp.act_costo   from rol_exe_fin;
  end if;
end $$;
