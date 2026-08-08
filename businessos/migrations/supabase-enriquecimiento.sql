-- supabase-enriquecimiento.sql — App A (Waterfall Enrichment): tablas del servicio
-- enriquecimiento-a2a. Aplicar una vez sobre el proyecto Supabase (idempotente),
-- via management API (POST /database/query, UA curl/8.0) — el MCP esta en read-only.
--
-- Escritor unico (invariante del pipeline, Fase 9/11/12):
--   TODAS estas tablas las escribe SOLO enriquecimiento-a2a con service_role
--   (excepto contraparte_69b/override_69b, que tambien escriben humanos/host-jobs
--   de confianza: la vigilancia 69-B y sus overrides son actos humanos).
--   enriquecimiento-a2a JAMAS escribe en public.leads — ni etapa ni columnas:
--   su resultado vive aqui, consolidado en lead_enriquecimiento.
--
-- Fail-closed por diseno:
--   - gate 69-B: SIN fila en contraparte_69b = nunca consultado = bloqueado.
--     'no_listado' (consultado y limpio) es un dato positivo que hay que escribir.
--   - override_69b: sus 3 invariantes viven en la TABLA (CHECK + triggers), no en
--     el codigo del servicio. Un override NO se edita: se invalida (one-way) o se
--     crea uno nuevo (que re-valida contra el estatus VIVO).
--   - un 'hit' sin veredicto no existe (CHECK): veredictos cerrados, nunca texto libre.
--
-- Datos personales (dimension datos-personales del grafo, LFPDPPP 2025):
--   el ledger es append-only PERO admite UNA mutacion: la supresion (derecho de
--   cancelacion) que redacta valor/detalle a un tombstone sin tocar nada mas.
--   Correccion de costos = fila 'ajuste' con costo negativo marcada con
--   detalle.compensa_intento_id (jamas UPDATE). TRUNCATE bloqueado por trigger.
--
-- RLS habilitado SIN politicas en todo: solo service_role accede (patron fase9).

-- ---------------------------------------------------------------------------
-- 1. Ledger append-only: todo intento de lookup se registra SIEMPRE, hit o miss,
--    con su costo. Es la fuente de verdad del rendimiento de la cascada.
-- ---------------------------------------------------------------------------
create table if not exists public.enriquecimiento_intento (
  id          bigint generated always as identity primary key,
  -- on delete restrict A PROPOSITO: el ledger ancla al lead; leads no tiene flujo
  -- de borrado (supresion = redactar datos personales, el esqueleto queda).
  lead_id     text        not null references public.leads(lead_id) on delete restrict,
  fuente      text        not null,              -- rfc_offline | denue | sat_69b | patron_dominio | proveedor_email | ... (dominio abierto: las fuentes crecen)
  campo       text        not null default '',   -- campo objetivo (email, telefono, rfc, razon_social); '' = gate sin campo (ej. chequeo 69-B)
  resultado   text        not null check (resultado in ('hit', 'miss', 'error', 'ajuste')),
  veredicto   text        not null default ''
    check (veredicto in ('', 'valido', 'dudoso', 'invalido')),
  valor       text        not null default '',   -- lo encontrado ('' en miss/error)
  costo_usd   numeric     not null default 0,
  detalle     jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  -- un hit sin veredicto no existe: el veredicto es parte del hallazgo
  constraint enriquecimiento_intento_hit_con_veredicto
    check (resultado <> 'hit' or veredicto <> ''),
  -- costo negativo SOLO en una fila de ajuste que apunte a la fila que compensa
  constraint enriquecimiento_intento_costo_negativo_solo_ajuste
    check (costo_usd >= 0 or (resultado = 'ajuste' and detalle ? 'compensa_intento_id'))
);

create index if not exists enriquecimiento_intento_lead_idx
  on public.enriquecimiento_intento (lead_id);
create index if not exists enriquecimiento_intento_fuente_idx
  on public.enriquecimiento_intento (fuente, created_at desc);

comment on table public.enriquecimiento_intento is
  'Ledger append-only de la cascada de enriquecimiento (App A). Cada lookup se registra siempre — hit, miss o error — con costo_usd. Correccion de costo = fila resultado=ajuste (costo negativo, detalle.compensa_intento_id). Unica mutacion permitida: supresion LFPDPPP (valor/detalle a tombstone). UPDATE/DELETE/TRUNCATE bloqueados por trigger, tambien para service_role. Escribe SOLO enriquecimiento-a2a.';

-- Append-only cableado en la tabla (aplica tambien a service_role).
-- Excepcion unica y quirurgica: la supresion LFPDPPP — redactar valor/detalle al
-- tombstone canonico SIN tocar ninguna otra columna (derecho de cancelacion sobre
-- datos personales sin destruir el rendimiento/costeo de la cascada).
create or replace function public.enriquecimiento_ledger_inmutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if  new.valor      = '[suprimido-lfpdppp]'
    and new.detalle    = '{"suprimido": true}'::jsonb
    and new.id         = old.id
    and new.lead_id    = old.lead_id
    and new.fuente     = old.fuente
    and new.campo      = old.campo
    and new.resultado  = old.resultado
    and new.veredicto  = old.veredicto
    and new.costo_usd  = old.costo_usd
    and new.created_at = old.created_at then
      return new;
    end if;
  end if;
  raise exception
    'enriquecimiento_intento es append-only: % prohibido. Correccion de costo = fila resultado=ajuste; dato personal = supresion (valor=[suprimido-lfpdppp], detalle={"suprimido": true})', tg_op;
end $$;

drop trigger if exists tg_enriquecimiento_intento_append_only on public.enriquecimiento_intento;
create trigger tg_enriquecimiento_intento_append_only
  before update or delete on public.enriquecimiento_intento
  for each row execute function public.enriquecimiento_ledger_inmutable();

-- TRUNCATE no dispara triggers de fila ni pasa por RLS: se bloquea aparte.
drop trigger if exists tg_enriquecimiento_intento_no_truncate on public.enriquecimiento_intento;
create trigger tg_enriquecimiento_intento_no_truncate
  before truncate on public.enriquecimiento_intento
  for each statement execute function public.enriquecimiento_ledger_inmutable();

-- ---------------------------------------------------------------------------
-- 2. Resultado consolidado por lead y campo. El "mejor valor conocido" con su
--    procedencia: que fuente lo dio y en que intento (todo cita su fuente).
-- ---------------------------------------------------------------------------
create table if not exists public.lead_enriquecimiento (
  -- cascade A PROPOSITO: es dato DERIVADO del lead; si el lead cayera, esto cae
  -- con el (el historial/costeo vive en el ledger, que si ancla con restrict).
  lead_id        text        not null references public.leads(lead_id) on delete cascade,
  campo          text        not null,
  valor          text        not null,
  veredicto      text        not null check (veredicto in ('valido', 'dudoso', 'invalido')),
  fuente         text        not null,
  intento_id     bigint      not null references public.enriquecimiento_intento(id),
  actualizado_en timestamptz not null default now(),
  primary key (lead_id, campo)
);

comment on table public.lead_enriquecimiento is
  'Resultado consolidado del enriquecimiento por (lead, campo). Upsert por PK; intento_id apunta a la fila del ledger que lo produjo (procedencia obligatoria). Supresion LFPDPPP aqui = DELETE normal (no es ledger). Escribe SOLO enriquecimiento-a2a; JAMAS toca public.leads.';

-- ---------------------------------------------------------------------------
-- 3. Activo de patrones de email por dominio: cada hit verificado lo refuerza.
-- ---------------------------------------------------------------------------
create table if not exists public.dominio_patron (
  dominio             text        primary key
    check (dominio <> '' and dominio = lower(dominio)),
  patron              text        not null,      -- plantilla, ej. '{inicial_nombre}{apellido}'
  soporte             int         not null default 1 check (soporte >= 1),
  ultima_confirmacion timestamptz not null default now(),
  datos               jsonb       not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

comment on table public.dominio_patron is
  'Activo de patrones de email por dominio (minusculas). soporte = confirmaciones observadas; un patron con soporte alto reduce el costo de la cascada (inferir antes de pagar proveedor). Escribe SOLO enriquecimiento-a2a.';

-- ---------------------------------------------------------------------------
-- 4. Vigilancia 69-B CFF: dictamen conocido por RFC exacto (mayusculas).
--    Ausencia de fila = nunca consultado = el gate bloquea (fail-closed).
--    REFRESCO SIEMPRE por UPSERT (insert .. on conflict (rfc) do update):
--    DELETE+INSERT falla A PROPOSITO si el RFC tiene overrides (FK restrict) —
--    y ese fallo se LOGUEA, jamas se traga (regla 2026-07-13).
-- ---------------------------------------------------------------------------
create table if not exists public.contraparte_69b (
  rfc           text        primary key
    check (rfc <> '' and rfc = upper(rfc)),
  estatus       text        not null check (estatus in
    ('no_listado', 'sentencia_favorable', 'desvirtuado', 'presunto', 'definitivo')),
  razon_social  text        not null default '',
  fuente        text        not null default '', -- listado SAT/DOF consultado (citar, no inventar)
  consultado_en timestamptz not null default now(),
  datos         jsonb       not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

comment on table public.contraparte_69b is
  'Vigilancia del listado 69-B CFF por RFC exacto (mayusculas). no_listado = consultado y limpio (dato positivo). Sin fila = nunca consultado = gate bloqueado. Refresco por UPSERT (on conflict do update), nunca DELETE+INSERT. Actualizan enriquecimiento-a2a y host-jobs de confianza.';

-- Orden de severidad del dictamen (para "solo se invalida si EMPEORA").
create or replace function public.severidad_69b(p_estatus text) returns int
language sql immutable set search_path = '' as $$
  select case p_estatus
    when 'no_listado'          then 0
    when 'sentencia_favorable' then 1
    when 'desvirtuado'         then 1
    when 'presunto'            then 2
    when 'definitivo'          then 3
    else 3  -- fail-closed: estatus desconocido se trata como lo peor
  end
$$;

-- ---------------------------------------------------------------------------
-- 5. Overrides del gate 69-B. Tres invariantes EN LA TABLA:
--    (1) nunca aplica a 'definitivo'  → dominio del CHECK + trigger contra el estatus VIVO
--    (2) todo override caduca         → vence_en NOT NULL + acotado a 1 ano
--    (3) se invalida solo si el estatus EMPEORA → trigger en contraparte_69b;
--        la invalidacion es ONE-WAY: revivir/estirar un override esta bloqueado
--        por trigger — la unica via es crear uno nuevo (re-valida contra el vivo).
-- ---------------------------------------------------------------------------
create table if not exists public.override_69b (
  id                   bigint      generated always as identity primary key,
  rfc                  text        not null references public.contraparte_69b(rfc) on delete restrict,
  -- invariante 1 (dominio): 'definitivo' no es autorizable
  estatus_al_autorizar text        not null check (estatus_al_autorizar in
    ('no_listado', 'sentencia_favorable', 'desvirtuado', 'presunto')),
  autorizado_por       text        not null check (autorizado_por <> ''),
  motivo               text        not null check (motivo <> ''),
  vence_en             timestamptz not null,     -- invariante 2: el override caduca
  invalidado           boolean     not null default false,
  invalidado_motivo    text        not null default '',
  invalidado_en        timestamptz,
  created_at           timestamptz not null default now(),
  constraint override_69b_vence_futuro check (vence_en > created_at),
  -- guard contra el override "efectivamente permanente": renovar = crear uno nuevo
  constraint override_69b_vence_acotado check (vence_en <= created_at + interval '1 year')
);

create index if not exists override_69b_rfc_activo_idx
  on public.override_69b (rfc) where not invalidado;

comment on table public.override_69b is
  'Override humano del gate 69-B. Activo = not invalidado AND now() < vence_en. estatus_al_autorizar lo fija el trigger desde contraparte_69b (no se puede declarar un estatus distinto al vivo). Inmutable salvo invalidar (one-way); renovar = fila nueva. Autoriza un humano; el servicio solo lo CONSULTA.';

-- invariante 1 contra el estatus VIVO: el snapshot lo fija el trigger, no el caller.
create or replace function public.override_69b_validar_insert() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_estatus text;
begin
  select estatus into v_estatus from public.contraparte_69b where rfc = new.rfc;
  if v_estatus is null then
    raise exception
      'override_69b: RFC % sin dictamen en contraparte_69b — fail-closed, consulta 69-B primero', new.rfc;
  end if;
  if v_estatus = 'definitivo' then
    raise exception
      'override_69b: RFC % esta en estatus definitivo — el override NUNCA aplica a definitivo', new.rfc;
  end if;
  new.estatus_al_autorizar := v_estatus;
  return new;
end $$;

drop trigger if exists tg_override_69b_validar_insert on public.override_69b;
create trigger tg_override_69b_validar_insert
  before insert on public.override_69b
  for each row execute function public.override_69b_validar_insert();

-- Un override es un acto de autorizacion: NO se edita ni se borra. La unica
-- transicion permitida es invalidarlo (false -> true, con motivo/fecha).
-- Revivirlo, estirar vence_en o moverlo de RFC exige crear un override NUEVO,
-- que vuelve a pasar por el gate del estatus vivo.
create or replace function public.override_69b_inmutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE'
     and old.invalidado = false
     and new.invalidado = true
     and new.rfc                  = old.rfc
     and new.estatus_al_autorizar = old.estatus_al_autorizar
     and new.autorizado_por       = old.autorizado_por
     and new.motivo               = old.motivo
     and new.vence_en             = old.vence_en
     and new.created_at           = old.created_at then
    return new;
  end if;
  raise exception
    'override_69b es inmutable salvo invalidar (one-way): % prohibido — para renovar o corregir, crea un override nuevo', tg_op;
end $$;

drop trigger if exists tg_override_69b_inmutable on public.override_69b;
create trigger tg_override_69b_inmutable
  before update or delete on public.override_69b
  for each row execute function public.override_69b_inmutable();

-- invariante 3: si el dictamen EMPEORA, los overrides vivos de ese RFC caen.
-- Una mejora (definitivo -> sentencia_favorable) NO revive ni invalida nada.
create or replace function public.contraparte_69b_invalidar_overrides() returns trigger
language plpgsql set search_path = '' as $$
begin
  if public.severidad_69b(new.estatus) > public.severidad_69b(old.estatus) then
    update public.override_69b
       set invalidado        = true,
           invalidado_motivo = 'estatus 69-B empeoro: ' || old.estatus || ' -> ' || new.estatus,
           invalidado_en     = now()
     where rfc = new.rfc
       and not invalidado;
  end if;
  return new;
end $$;

drop trigger if exists tg_contraparte_69b_invalidar_overrides on public.contraparte_69b;
create trigger tg_contraparte_69b_invalidar_overrides
  after update of estatus on public.contraparte_69b
  for each row execute function public.contraparte_69b_invalidar_overrides();

-- ---------------------------------------------------------------------------
-- 6. RLS: habilitado sin politicas — solo service_role (patron fase9).
-- ---------------------------------------------------------------------------
alter table public.enriquecimiento_intento enable row level security;
alter table public.lead_enriquecimiento    enable row level security;
alter table public.dominio_patron          enable row level security;
alter table public.contraparte_69b         enable row level security;
alter table public.override_69b            enable row level security;

-- ---------------------------------------------------------------------------
-- 7. Vistas de rendimiento (security_invoker; sin acceso anon/authenticated).
-- ---------------------------------------------------------------------------

-- Rendimiento de la cascada por fuente y campo. Los 'ajuste' no cuentan como
-- intentos pero SI netean el costo (costo_usd es el costo NETO real).
drop view if exists public.v_cascada_rendimiento;
create view public.v_cascada_rendimiento
  with (security_invoker = true) as
select
  fuente,
  campo,
  (count(*) filter (where resultado in ('hit', 'miss', 'error')))::int as intentos,
  (count(*) filter (where resultado = 'hit'))::int                     as hits,
  (count(*) filter (where resultado = 'error'))::int                   as errores,
  sum(costo_usd)                                                       as costo_usd,
  round(sum(costo_usd)
        / nullif(count(*) filter (where resultado = 'hit'), 0), 6)     as costo_por_hit
from public.enriquecimiento_intento
group by fuente, campo;

comment on view public.v_cascada_rendimiento is
  'Rendimiento por (fuente, campo) desde el ledger. costo_usd = neto (incluye filas ajuste); costo_por_hit NULL = fuente sin hits (costo hundido visible, no dividido entre cero).';

-- Aporte marginal: que aporto cada fuente al resultado CONSOLIDADO. En una
-- cascada ordenada por costo, llegar a la fuente N implica que 1..N-1 fallaron:
-- lo consolidado por fuente ES su aporte marginal.
drop view if exists public.v_aporte_marginal;
create view public.v_aporte_marginal
  with (security_invoker = true) as
select
  fuente,
  campo,
  count(*)::int                                              as valores_aportados,
  (count(*) filter (where veredicto = 'valido'))::int        as validos,
  (count(*) filter (where veredicto = 'dudoso'))::int        as dudosos
from public.lead_enriquecimiento
group by fuente, campo;

comment on view public.v_aporte_marginal is
  'Aporte marginal por (fuente, campo) sobre el consolidado: cuantos valores vigentes puso cada fuente. Base para decidir que escalon de la cascada paga su lugar.';

revoke all on public.v_cascada_rendimiento from anon, authenticated;
revoke all on public.v_aporte_marginal     from anon, authenticated;
