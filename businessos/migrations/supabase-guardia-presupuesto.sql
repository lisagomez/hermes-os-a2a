-- ============================================================
-- supabase-guardia-presupuesto.sql — Guardia de presupuesto IA (plataforma)
-- ============================================================
-- Origen: integración marca blanca de CancioBot (INTEGRACION-whatsapp-marca-blanca.md
-- §3, pieza 1). El punto de corte que importa: el presupuesto se verifica ANTES de
-- cada llamada al modelo, no después. Sin tabla nueva de consumo: `ai_usage` NO se
-- crea — token_usage ya es la fuente de verdad y alimenta act_costo (inventario de
-- activos); duplicarla desalinearía el sistema más caro de reconstruir.
--
-- Aditivo sobre token_usage + una tabla de configuración por tenant.
-- Idempotente: add column if not exists / drop+add constraint / create if not exists.
-- Aplicar en prod: management API (POST /database/query, UA curl/8.0) — MCP es read-only.

-- 1. token_usage: dimensiones que la guardia necesita ---------------------------
-- tenant_id TEXT (no uuid como propone el doc origen): los tenants reales viven en
-- crm_tenants.tenant_id, que es un slug text. Sin FK a propósito: la guardia es de
-- plataforma (crm-canales hoy; buzon-a2a y otros mañana) y otros servicios pueden
-- traer su propia noción de tenant.
alter table public.token_usage add column if not exists tenant_id text;
alter table public.token_usage add column if not exists clase_tarea text
  check (clase_tarea in ('basica', 'avanzada'));

comment on column public.token_usage.tenant_id is
  'Tenant de marca blanca al que se atribuye el gasto (slug de crm_tenants para el CRM). Null = gasto de la casa (verticales, trio).';
comment on column public.token_usage.clase_tarea is
  'Clase de tarea del routing de la guardia de presupuesto: basica (modelo económico) | avanzada. Null = fila anterior a la guardia.';

-- vertical 'crm': el gasto conversacional del CRM entra al mismo ledger que vigila
-- negocio (mismo patrón que 'trio' en fase 6). Idempotente: drop + add.
alter table public.token_usage drop constraint if exists token_usage_vertical_check;
alter table public.token_usage add constraint token_usage_vertical_check
  check (vertical in ('personal', 'negocio', 'clientes', 'trio', 'crm'));

-- gasto_mes(tenant) es la consulta caliente de la guardia (una por mensaje entrante).
create index if not exists token_usage_tenant_created_idx
  on public.token_usage (tenant_id, created_at)
  where tenant_id is not null;

-- OJO (índice único parcial de supabase-fix-token-ledger.sql): las filas del agregado
-- diario (task_id null) son únicas por (fecha,vertical,modelo). Las filas por-llamada
-- del CRM DEBEN llevar task_id no-nulo (la guardia usa 'crm-<tenant>-<conversacion>')
-- o la segunda llamada del día chocaría en 409 y perdería gasto en silencio.

-- 2. presupuestos_ia: techo configurable por tenant -----------------------------
create table if not exists public.presupuestos_ia (
  tenant_id       text primary key,
  limite_mensual  numeric(10, 2) not null check (limite_mensual >= 0),
  umbral_aviso    numeric        not null default 0.8
    check (umbral_aviso > 0 and umbral_aviso <= 1),
  accion_al_tope  text           not null default 'bloquear'
    check (accion_al_tope in ('bloquear', 'degradar', 'avisar')),
  actualizado_por text           not null,
  actualizado_en  timestamptz    not null default now()
);

comment on table public.presupuestos_ia is
  'Techo de gasto IA mensual por tenant (guardia-presupuesto). SIN fila = la guardia BLOQUEA (fail-closed, mismo criterio que contraparte_69b: sin dato no hay permiso). accion_al_tope degradar = caer al modelo económico en vez de bloquear. La escribe un humano/host-job; los servicios solo LEEN.';
comment on column public.presupuestos_ia.accion_al_tope is
  'Qué hace la guardia al llegar al límite: bloquear (caso a atención humana), degradar (modelo económico), avisar (permitir + notificación).';

alter table public.presupuestos_ia enable row level security;
-- (sin políticas: solo service_role accede — patrón token_usage)
