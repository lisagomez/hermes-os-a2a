-- supabase-fase12-leads-crm.sql — WhatsApp/CRM como canal de primera clase en leads.
-- Aplicar una vez sobre el proyecto Supabase (idempotente). 2026-07-28.
--
-- Por qué: el conector crm-canales (CRM-0) atiende conversaciones de Telegram y
-- WhatsApp Cloud API pero eran una isla: ninguna conversación se volvía lead.
-- Este cambio (a) amplía el invariante "un escritor por origen" del pipeline de
-- adquisición (Fase 9):
--   origen 'a2a'     → SOLO ventas-a2a
--   origen 'manual'  → SOLO humanos/host-jobs
--   origen 'slack'   → futuro
--   origen 'web2'    → superficie web2 (route /api/leads + chat-web2)
--   origen 'crm'     → SOLO crm-canales/leads.py (primer mensaje de un contacto;
--                      insert ignore-duplicates: jamás re-escribe la etapa)
--   origen 'copilot' → declarado para Meeting Copilot (hoy persiste en
--                      localStorage; su tipo Lead ya fija origen 'copilot' y
--                      sin esto rompería el CHECK el día que escriba aquí)
-- y (b) da columnas de canal: `canal` (telegram/whatsapp/'' — dominio abierto a
-- propósito, sin CHECK: los canales crecen) y `telefono` (dígitos E.164 sin '+';
-- el wa_id de WhatsApp ES el teléfono — identidad de contacto cross-canal).

alter table public.leads drop constraint if exists leads_origen_check;
alter table public.leads
  add constraint leads_origen_check
  check (origen in ('a2a', 'manual', 'slack', 'web2', 'crm', 'copilot'));

comment on constraint leads_origen_check on public.leads is
  'Origen del lead, un escritor por origen. crm = crm-canales (conversaciones Telegram/WhatsApp del CRM marca blanca). copilot = Meeting Copilot. Fase 12 CRM.';

alter table public.leads add column if not exists canal text not null default '';
alter table public.leads add column if not exists telefono text not null default '';

comment on column public.leads.canal is
  'Canal de contacto del lead (telegram | whatsapp | '''' = no aplica). Sin CHECK: dominio abierto, la UI tolera valores nuevos.';
comment on column public.leads.telefono is
  'Teléfono en dígitos E.164 sin + (para WhatsApp, el wa_id). Vacío si el canal no lo expone.';

create index if not exists leads_telefono_idx
  on public.leads (telefono) where telefono <> '';

-- v_crm_conversaciones_resumen gana el desglose por canal (Mission Control).
-- El canal de una conversación es el de su contacto (crm_contactos.canal).
-- CREATE OR REPLACE no permite añadir columnas a una vista → drop + create
-- (misma transacción de aplicación; los revokes se re-aplican SIEMPRE).
drop view if exists public.v_crm_conversaciones_resumen;
create view public.v_crm_conversaciones_resumen
  with (security_invoker = true) as
select cv.estado, cv.nivel, ct.canal, count(*)::int as cuenta
from public.crm_conversaciones cv
join public.crm_contactos ct on ct.id = cv.contacto_id
group by cv.estado, cv.nivel, ct.canal;

revoke all on public.v_crm_conversaciones_resumen from anon, authenticated;
