-- ============================================================
-- supabase-crm4-calificacion.sql — Calificación de intención, nutrición,
-- semáforo de SLA y atribución de campaña (CRM marca blanca)
-- ============================================================
-- Origen: integración marca blanca de CancioBot (INTEGRACION-whatsapp-marca-blanca.md
-- §§4-6 y 8). Todo aditivo sobre `leads` + una tabla de configuración de SLA +
-- dos vistas calculadas (cero estado nuevo: guardar el semáforo crearía estados
-- mentirosos cuando el job que lo refresca falla).
--
-- Reglas duras que este esquema respalda (§4):
--   · La calificación es una señal PARALELA: jamás toca leads.etapa (el escritor
--     de la etapa es el funnel/humano, no el calificador).
--   · 'indeterminado' existe como valor: el clasificador escala, no adivina.
-- Idempotente. Aplicar en prod por management API (MCP read-only para DDL).

-- 1. leads: señal de calificación (escrita SOLO por crm-canales, origen 'crm') ---
alter table public.leads add column if not exists calificacion text
  check (calificacion in ('califica', 'no_califica', 'indeterminado'));
alter table public.leads add column if not exists calificado_en timestamptz;
-- ASCII a propósito (el doc origen decía "señales"): columnas con ñ son un footgun
-- en clientes PostgREST/psql citando identificadores.
alter table public.leads add column if not exists calificacion_senales jsonb;

comment on column public.leads.calificacion is
  'Señal del calificador de intención (crm-canales): califica | no_califica | indeterminado (escala a humano). PARALELA a etapa: el calificador jamás escribe etapa.';
comment on column public.leads.calificacion_senales is
  'Evidencia textual del calificador para auditoría: {"senales": [...], "confianza": 0.x}.';

-- 2. leads: atribución de campaña (referral de Meta, clic-a-WhatsApp) ------------
-- Se extrae LA CAPTURA, no el módulo facebook-ads completo. First-touch: el insert
-- de leads es ignore-duplicates, así que la atribución del primer contacto gana.
alter table public.leads add column if not exists campana_id text;
alter table public.leads add column if not exists utm jsonb;

comment on column public.leads.campana_id is
  'Campaña de la que vino el lead (referral.source_id del webhook de Meta en clic-a-WhatsApp). Sin esto no hay CAC por campaña.';
comment on column public.leads.utm is
  'Bloque referral completo de Meta (source_url, source_type, ctwa_clid, ...) tal como llegó — first-touch.';

create index if not exists leads_campana_idx
  on public.leads (campana_id) where campana_id is not null;

-- 3. SLA configurable por tenant y etapa (§6: marca blanca — un despacho legal no
-- tiene los tiempos de una tienda) ----------------------------------------------
create table if not exists public.sla_por_etapa (
  tenant_id          text    not null,
  etapa              text    not null,
  sla_retraso_horas  integer not null check (sla_retraso_horas > 0),
  sla_detenido_horas integer not null,
  primary key (tenant_id, etapa),
  check (sla_detenido_horas >= sla_retraso_horas)
);

comment on table public.sla_por_etapa is
  'SLA de recencia por tenant y etapa para el semáforo del CRM (verde/amarillo/rojo). La escribe un humano; sin fila, el semáforo declara sin_sla (no finge verde).';

alter table public.sla_por_etapa enable row level security;
-- (sin políticas: solo service_role — las vistas de abajo son el camino de lectura)

-- 4. Vista de nutrición (§5): tercer estado, ni activo ni perdido ----------------
-- Sin tabla nueva: calificacion='no_califica' + vista, para no fragmentar la
-- fuente de verdad de contactos. Reactivación proactiva BLOQUEADA por P2 (HSM).
create or replace view public.v_nutricion
  with (security_invoker = true) as
select l.id, l.lead_id, l.origen, l.empresa, l.contacto, l.etapa, l.canal,
       l.telefono, l.calificacion, l.calificado_en, l.calificacion_senales,
       l.campana_id, l.datos, l.created_at
from public.leads l
where l.calificacion = 'no_califica'
  and l.etapa not in ('perdido', 'ganado');

comment on view public.v_nutricion is
  'Lista de nutrición del CRM: no calificados aún vivos en el funnel. Solo lectura; la reactivación por WhatsApp fuera de 24h espera P2 (plantillas HSM).';

-- 5. Semáforo de SLA (§6): SE CALCULA, no se guarda ------------------------------
-- ultima_actividad no existe como columna en ninguna tabla (verificado): se deriva
-- del último crm_mensajes de las conversaciones del contacto del lead. Leads de
-- otros orígenes (a2a, web2...) no tienen conversación CRM: la vista cubre origen
-- 'crm', que es donde el SLA de respuesta significa algo hoy.
create or replace view public.v_semaforo_casos
  with (security_invoker = true) as
with actividad as (
  select c.tenant_id, c.canal, c.canal_uid,
         max(m.created_at) as ultima_actividad
  from public.crm_contactos c
  join public.crm_conversaciones v on v.contacto_id = c.id
  join public.crm_mensajes m on m.conversacion_id = v.id
  group by c.tenant_id, c.canal, c.canal_uid
)
select l.id, l.lead_id, l.etapa, l.canal,
       a.tenant_id,
       a.ultima_actividad,
       case
         when s.tenant_id is null then 'sin_sla'
         when now() - a.ultima_actividad
              > make_interval(hours => s.sla_detenido_horas) then 'rojo'
         when now() - a.ultima_actividad
              > make_interval(hours => s.sla_retraso_horas) then 'amarillo'
         else 'verde'
       end as semaforo
from public.leads l
join actividad a
  on l.origen = 'crm'
 and a.tenant_id = l.datos ->> 'tenant_id'
 and a.canal     = l.canal
 and a.canal_uid = l.datos ->> 'canal_uid'
left join public.sla_por_etapa s
  on s.tenant_id = a.tenant_id and s.etapa = l.etapa
where l.etapa not in ('perdido', 'ganado');

comment on view public.v_semaforo_casos is
  'Semáforo de recencia por caso del CRM (calculado al vuelo, jamás almacenado). sin_sla = el tenant no configuró SLA para esa etapa: se declara, no se finge verde.';

-- 6. Las vistas no son públicas: mismo patrón que v_facturas_resumen -------------
revoke all on public.v_nutricion       from anon, authenticated;
revoke all on public.v_semaforo_casos  from anon, authenticated;
