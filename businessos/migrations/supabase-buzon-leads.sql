-- supabase-buzon-leads.sql — origen 'correo' en leads (SPEC-buzon-a2a §4.2)
--
-- Amplía leads_origen_check con el séptimo origen: 'correo'. Aplicar una vez tras
-- fase9 → fase11 → fase12; idempotente (drop constraint if exists + add).
-- NO aplicada a producción: va junto con supabase-buzon.sql tras el gate de la SPEC §8.
--
-- ESCRITOR ÚNICO del origen 'correo': ingerir-entrantes.py (host-job del buzón).
-- En modo abierto_cuarentena, el PRIMER mensaje de un remitente desconocido crea el
-- lead con canal='email' y la dirección en contacto. Insert ignore-duplicates sobre
-- lead_id determinista: los mensajes siguientes JAMÁS pisan la etapa que el funnel
-- ya movió (mismo contrato que crm-canales/leads.py).

alter table public.leads drop constraint if exists leads_origen_check;
alter table public.leads
  add constraint leads_origen_check
  check (origen in ('a2a', 'manual', 'slack', 'web2', 'crm', 'copilot', 'correo'));

comment on constraint leads_origen_check on public.leads is
  'Origen del lead, un escritor por origen. a2a = ventas-a2a. manual = humanos/host-jobs. '
  'web2 = /api/leads de cliente-web2. crm = crm-canales. copilot = Meeting Copilot. '
  'correo = ingerir-entrantes.py (buzón HERALDO-6, SPEC-buzon-a2a §4.2): primer mensaje '
  'de remitente desconocido en modo abierto_cuarentena; ignore-duplicates, jamás pisa etapa.';
