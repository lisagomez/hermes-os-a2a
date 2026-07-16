-- supabase-fase11-leads-web2.sql — habilita el origen 'web2' en la tabla leads.
-- Aplicar una vez sobre el proyecto Supabase (idempotente).
--
-- Por qué: el frontend de cara al cliente `businessos/frontends/cliente-web2`
-- captura leads inbound desde la landing (formulario de contacto / cotizador).
-- Es un ESCRITOR NUEVO y distinto de los ya existentes, así que respeta el
-- invariante "un escritor por origen" del pipeline de adquisición (Fase 9):
--   origen 'a2a'    → SOLO ventas-a2a
--   origen 'manual' → SOLO humanos/host-jobs
--   origen 'slack'  → futuro
--   origen 'web2'   → SOLO la route server-side /api/leads de cliente-web2
--                     (service_role, nunca desde el browser)
--
-- Es un PREREQUISITO de despliegue de cliente-web2 (como las env vars): sin él,
-- el insert con origen='web2' falla el CHECK y el formulario devuelve error.

alter table public.leads drop constraint if exists leads_origen_check;
alter table public.leads
  add constraint leads_origen_check
  check (origen in ('a2a', 'manual', 'slack', 'web2'));

comment on constraint leads_origen_check on public.leads is
  'Origen del lead. web2 = landing de cliente-web2 (route /api/leads, service_role). Fase 11.';
