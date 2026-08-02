-- supabase-buzon-onboarding.sql — asistente de configuración del cliente
-- (SPEC-buzon-a2a §11). Aplicar DESPUÉS de supabase-buzon.sql; idempotente.
--
-- NO aplicada a producción: se valida en Postgres efímero y se aplica junto con
-- el resto del buzón, tras el gate del checklist §8.
-- Aplicación a prod: management API POST /v1/projects/{ref}/database/query, UA curl/8.0.
--
-- ESCRITOR ÚNICO:
--   buzones.estado y columnas de onboarding → la UI del asistente (server-side).
--     El agente NUNCA cambia el estado de un buzón (ya no podía crear buzones ni
--     tocar modo_contraparte, SPEC §5.3; el estado sigue la misma regla).
--   buzon_verificaciones → el verificador del backend (DNS/OAuth/lectura). La UI
--     solo LEE y hace polling: un formulario que se auto-declara verificado es
--     justo lo que §11.0 prohíbe.
--   buzon_falsos_positivos → la UI, cuando el cliente reporta (§11.10).
--   buzon_relajamientos → la UI, con firma de quien autoriza (§11.9).
--
-- La regla central de §11.1 (modo espejo ≥7 días Y ≥20 borradores) NO se puede
-- expresar como CHECK: depende de un conteo de otra tabla y del reloj. Vive en
-- código (buzon-a2a/onboarding.py::puede_listo) y su rastro queda en la bitácora.
-- Lo que SÍ se blinda aquí es que un buzón 'activo' lleve firma, y que uno que
-- estuvo en espejo tenga la fecha desde la que se le cuenta.

-- ------------------------------------------------- columnas de onboarding
alter table public.buzones add column if not exists estado text not null default 'borrador';
alter table public.buzones add column if not exists plantilla text not null default 'personalizado';
alter table public.buzones add column if not exists espejo_desde timestamptz;
alter table public.buzones add column if not exists activado_por text;
alter table public.buzones add column if not exists activado_en timestamptz;
alter table public.buzones add column if not exists aprobador_suplente text;
alter table public.buzones add column if not exists canal_aprobacion text not null default 'panel';
alter table public.buzones add column if not exists captar_leads boolean not null default true;

alter table public.buzones drop constraint if exists buzones_estado_check;
alter table public.buzones add constraint buzones_estado_check check (estado in (
  'borrador',      -- creado, eligiendo plantilla
  'configurando',  -- dns / proveedor / politica avanzan EN PARALELO
  'espejo',        -- lee y redacta, NO envía. Obligatorio, no saltable
  'listo',         -- cumplió el mínimo de espejo; espera firma de A5
  'activo',        -- envía (con A5 en el camino crítico)
  'pausado',       -- Guardian: deja de enviar, sigue leyendo. Reversible
  'desconectado'   -- credenciales revocadas; la bitácora se conserva íntegra
));

alter table public.buzones drop constraint if exists buzones_plantilla_check;
alter table public.buzones add constraint buzones_plantilla_check check (plantilla in (
  'ventas', 'reclutamiento', 'soporte', 'asesor_humano', 'legal_finanzas', 'personalizado'
));

alter table public.buzones drop constraint if exists buzones_canal_aprobacion_check;
alter table public.buzones add constraint buzones_canal_aprobacion_check
  check (canal_aprobacion in ('telegram', 'slack', 'panel'));

-- Un buzón que envía lleva firma de quién lo activó y cuándo (§11.1: la
-- activación exige firma de A5 con la evidencia en pantalla). Mismo espíritu
-- que buzones_abierto_firmado: la base rechaza el estado sin su respaldo.
alter table public.buzones drop constraint if exists buzones_activo_firmado;
alter table public.buzones add constraint buzones_activo_firmado check (
  estado not in ('activo', 'pausado')
  or (activado_por is not null and activado_en is not null)
);

-- Nadie llega a 'listo' o más allá sin haber pasado por espejo (la fecha desde
-- la que se cuentan los 7 días). Sin esto, un salto directo dejaría el mínimo
-- sin base temporal contra la que verificarse.
alter table public.buzones drop constraint if exists buzones_espejo_fechado;
alter table public.buzones add constraint buzones_espejo_fechado check (
  estado not in ('espejo', 'listo', 'activo', 'pausado') or espejo_desde is not null
);

comment on column public.buzones.estado is
  'Estado del onboarding (SPEC-buzon-a2a §11.1). MODO ESPEJO no es saltable: ni con '
  'flag, ni por soporte, ni para demos. El mínimo (>=7 días naturales Y >=20 borradores) '
  'lo verifica buzon-a2a/onboarding.py::puede_listo; aquí se blinda que activo/pausado '
  'lleven firma y que espejo/listo/activo tengan espejo_desde.';
comment on column public.buzones.captar_leads is
  'Crear un lead cuando escribe alguien nuevo (§11.3). Nunca modifica la etapa de un '
  'lead existente: el insert es ignore-duplicates (contrato de crm-canales/leads.py).';

create index if not exists buzones_estado_idx on public.buzones (estado);

-- --------------------------------------------- buzon_verificaciones (§11.2)
create table if not exists public.buzon_verificaciones (
  id              bigint      generated always as identity primary key,
  buzon_id        uuid        not null references public.buzones (id) on delete cascade,
  verificacion    text        not null check (verificacion in (
                    'dns_spf', 'dns_dkim', 'dns_dmarc', 'oauth_consent',
                    'access_policy', 'lectura_buzon', 'politica_buzon', 'aprobador')),
  estado          text        not null default 'pendiente' check (estado in (
                    'pendiente', 'en_curso', 'verificado', 'esperando_tercero', 'fallido')),
  mensaje         text        not null default '',   -- en español, orientado a acción
  detalle_tecnico text,                              -- colapsado en la UI
  accion          jsonb,                             -- {etiqueta,tipo,payload}
  ultima_revision timestamptz not null default now(),
  reintento_en    integer,                           -- segundos; el poll es automático
  unique (buzon_id, verificacion),
  -- §11.2: "fallido siempre trae accion. Un error sin siguiente paso es un
  -- callejón." La regla se blinda aquí, no solo en el render.
  constraint buzon_verificaciones_fallido_con_accion check (
    estado <> 'fallido' or accion is not null
  )
);

comment on table public.buzon_verificaciones is
  'Estado verificado por el BACKEND de cada paso del asistente (SPEC-buzon-a2a §11.2). '
  'La UI solo lee y hace polling: §11.0 exige que ningún paso termine en un "guardar" '
  'optimista. Escritor único: el verificador del backend.';

create index if not exists buzon_verificaciones_buzon_idx
  on public.buzon_verificaciones (buzon_id, estado);

-- ------------------------------------------- buzon_falsos_positivos (§11.10)
create table if not exists public.buzon_falsos_positivos (
  id           bigint      generated always as identity primary key,
  buzon_id     uuid        not null references public.buzones (id),
  correo_id    uuid,                                  -- saliente detenido
  gate         text        not null,                  -- gate que se disparó
  reportado_por text       not null default '',
  nota         text        not null default '',
  reportado_en timestamptz not null default now()
);

comment on table public.buzon_falsos_positivos is
  'Reportes de "esto es un falso positivo" (SPEC-buzon-a2a §11.10). Existen porque los '
  'falsos positivos que nadie reporta son los que terminan justificando apagar el control. '
  'Alimentan el ajuste de gates y el corpus de regresión.';

-- ---------------------------------------------- buzon_relajamientos (§11.9)
create table if not exists public.buzon_relajamientos (
  id             bigint      generated always as identity primary key,
  buzon_id       uuid        not null references public.buzones (id),
  clase          text        not null,
  decision       text        not null check (decision in ('propuesto', 'aceptado', 'rechazado', 'revertido')),
  evidencia      jsonb       not null default '{}'::jsonb,  -- {aprobaciones_consecutivas, dias_activo, criticos}
  autorizado_por text        not null default '',
  ocurrido_en    timestamptz not null default now(),
  -- Un relajamiento aceptado SIEMPRE lleva nombre: es la evidencia de supervisión
  -- humana que ISO/IEC 42001 pide (§11.9).
  constraint buzon_relajamientos_aceptado_con_firma check (
    decision <> 'aceptado' or autorizado_por <> ''
  )
);

comment on table public.buzon_relajamientos is
  'Rastro del relajamiento progresivo por evidencia (SPEC-buzon-a2a §11.9). La regla es '
  'DETERMINISTA (>=25 aprobaciones consecutivas sin edición, sin críticos, >=30 días activo) '
  'y solo PROPONE: nunca se aplica sola. Reversión automática a 2 rechazos en la clase. '
  'Convierte el control humano en algo que se gana, no en un impuesto permanente.';

create index if not exists buzon_relajamientos_buzon_idx
  on public.buzon_relajamientos (buzon_id, clase, ocurrido_en desc);

-- ------------------------------------------------------------------- RLS
alter table public.buzon_verificaciones   enable row level security;
alter table public.buzon_verificaciones   force  row level security;
alter table public.buzon_falsos_positivos enable row level security;
alter table public.buzon_falsos_positivos force  row level security;
alter table public.buzon_relajamientos    enable row level security;
alter table public.buzon_relajamientos    force  row level security;
