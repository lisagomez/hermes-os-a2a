-- 01-schema.sql — grafo (cerebro regulatorio de Hermes OS · A2A, Fase 2). Idempotente.
--
-- Modelo: proyecto -> jurisdiccion -> dimension -> regla -> impacto.
-- "Proyecto" = contexto de cada request (jurisdiccion/dimension/regimen/fecha);
-- se persiste integro en evaluaciones.contexto. Tabla proyectos: Fase 3+ (KISS).
--
-- Regla de oro: cero afirmacion fiscal sin fuente citada ->
-- fuente_cita, fuente_url, source_version y vigente_desde son NOT NULL.
--
-- Se monta en /docker-entrypoint-initdb.d/ del contenedor postgres (corre solo
-- con volumen virgen; reseed = recrear el volumen, ver README del servicio).

create table if not exists jurisdicciones (
  codigo      text primary key,            -- ISO-2: 'MX'
  nombre      text not null
);

create table if not exists dimensiones (
  codigo      text primary key,            -- 'fiscal'
  nombre      text not null
);

create table if not exists categorias_gasto (
  clave       text primary key,            -- 'VIATICOS' (catalogo V1)
  nombre      text not null,
  descripcion text,
  keywords    text[] not null default '{}', -- clasificacion determinista, sin LLM
  exclusiones text[] not null default '{}'  -- si casa, descarta esta categoria aunque casen keywords (Fase 8b)
);

create table if not exists reglas (
  id             bigint generated always as identity primary key,
  clave          text not null unique,     -- 'MX-LISR-28-V'
  jurisdiccion   text not null references jurisdicciones(codigo),
  dimension      text not null references dimensiones(codigo),
  titulo         text not null,
  texto_resumen  text not null,
  fuente_cita    text not null,            -- 'LISR Art. 28, fraccion V'
  fuente_url     text not null,
  source_version text not null,            -- procedencia (patron seedValidator del repo viejo)
  vigente_desde  date not null,
  vigente_hasta  date,                     -- null = vigente hoy
  created_at     timestamptz not null default now(),
  check (vigente_hasta is null or vigente_hasta >= vigente_desde)
);

create table if not exists impactos (
  id             bigint generated always as identity primary key,
  regla_id       bigint not null references reglas(id) on delete cascade,
  categoria      text references categorias_gasto(clave), -- NULL = todas (requisitos generales)
  regimen        text not null default 'PM_TITULO_II',
  -- NULL = la regla no determina veredicto, solo aporta requisitos/banderas
  -- 'permitido'/'no_permitido': dimension 'regulatorio' (permisos/cumplimiento
  -- operativo); conviven con 'deducible'/'no_deducible' porque las categorias
  -- no cruzan de dimension (ver evaluador.py).
  veredicto_base text check (veredicto_base in ('deducible','no_deducible','permitido','no_permitido','dudoso')),
  tope_monto     numeric(14,2) check (tope_monto is null or tope_monto >= 0),
  tope_pct       numeric(5,2)  check (tope_pct   is null or (tope_pct between 0 and 100)),
  requisitos     jsonb not null default '[]'::jsonb, -- ["texto de checklist", ...]
  banderas       jsonb not null default '[]'::jsonb, -- banderas rojas incondicionales
  parametros     jsonb not null default '{}'::jsonb, -- topes especificos + {"verificar": true}
  unique nulls not distinct (regla_id, categoria, regimen)  -- pg>=15; idempotencia del seed
);

create index if not exists idx_impactos_cat_reg on impactos (categoria, regimen);
create index if not exists idx_reglas_ambito    on reglas (jurisdiccion, dimension, vigente_desde, vigente_hasta);

create table if not exists evaluaciones (
  id         uuid primary key default gen_random_uuid(),
  contexto   jsonb not null,   -- {jurisdiccion, dimension, regimen, fecha} = el "proyecto"
  entrada    jsonb not null,   -- conceptos crudos
  salida     jsonb not null,   -- respuesta completa (veredictos+fuentes+banderas+checklist)
  created_at timestamptz not null default now()
);
create index if not exists idx_evaluaciones_fecha on evaluaciones (created_at desc);
