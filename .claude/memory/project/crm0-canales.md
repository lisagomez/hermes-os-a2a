# CRM-0 — conector de canales marca blanca (Telegram + WhatsApp)

> Estado: VIVO en runtime (2026-07-21). PR #105. Decisión de arranque: goal de
> Elisa 2026-07-21 (levanta el gate "solo con cliente piloto" del maestro, línea D).

## Qué es

Primer servicio de la línea CRM conversacional del blueprint
(`businessos/crm/propuesta-crm-marca-blanca.md`): `businessos/crm-canales/`
(Starlette :4600, compose profile `a2a`, edge público `/crm/*` con rate-limit).

- **Marca blanca por configuración**: `crm_tenants` (marca, tono, casos_uso,
  canales jsonb) arma el system prompt por tenant; tokens de canal por env
  (`CRM_TELEGRAM_TOKEN__<TENANT>` / `CRM_WHATSAPP_TOKEN__<TENANT>`), jamás en BD.
- **Canales**: webhook Telegram (header secret-token) + WhatsApp Cloud API
  (GET verify + POST mensajes). Saliente sin token → `enviado=false` en bitácora
  (visible, jamás silencioso).
- **Techo estructural (plan D-40)** en código: dinero/legal/"hablar con una
  persona" escalan a humano ANTES del modelo (`prompt.requiere_humano`);
  conversación pasa a `escalada`.
- **Datos**: `supabase-crm0.sql` — crm_tenants/contactos/conversaciones/mensajes,
  RLS cerrado (solo service_role), prefijo `crm_` sin colisión (aplicada a la BD
  durable 2026-07-21 vía management API). Tenant demo: `a2a-demo`.
- **Tests**: 18 verdes (`crm-canales/tests/`), venv `businessos/.venv`.

## Verificado en producción (smoke E2E 2026-07-21, por la URL pública)

verify de Meta (challenge + 403 con token malo) · telegram con secret (200,
respuesta LLM con la marca del tenant) y sin secret (403) · whatsapp payload
Cloud API (contacto con wa_id + nombre de profile) · escalado a humano
(conversación `escalada`, motor NO llamado). Datos de humo limpiados.

## Para conectar un tenant REAL (pasos de la dueña)

1. Telegram: crear bot en BotFather → token al `.env` del server
   (`CRM_TELEGRAM_TOKEN__<TENANT>`) → `setWebhook` a
   `https://<edge>/crm/webhook/telegram/<tenant>` con `secret_token` =
   `CRM_TELEGRAM_WEBHOOK_SECRET` → restart del servicio.
2. WhatsApp: número en Meta Business + token Cloud API → env + `phone_id` en
   `crm_tenants.canales.whatsapp` → registrar webhook en Meta apuntando a
   `/crm/webhook/whatsapp/<tenant>` con `CRM_WHATSAPP_VERIFY_TOKEN`.

## CRM-1 — sup-crm VIVO (2026-07-21, PR #107)

Supervisor del blueprint operando en nivel **A1 del plan D-40**: `sup-crm`
(:4700, interno, sin edge) valida CADA saliente generado por el modelo ANTES
de enviarse. Gates deterministas (vacío/largo/dato sensible/credencial) → juez
LLM adversarial stateless → auditoría en `crm_supervision` (RLS, aplicada).
Fail-safe doble: juez caído = NO aprobado; sup inalcanzable = crm-canales
traspasa a humano y escala (nunca sale respuesta de modelo sin veredicto).
Plantillas fijas (escalado/degradación) NO pasan por sup. Smoke E2E en prod:
camino aprobado (juez real, gates ok) + rechazo por g_sensible verificados;
29 tests (7 sup + 22 canales).

## Siguientes fases (blueprint CRM-2..5)

muestreo A2 (20%→5% con evidencia en crm_supervision), panel humano, cruce de
perfil entre canales, intenciones con niveles medidos, enjambre nocturno.
