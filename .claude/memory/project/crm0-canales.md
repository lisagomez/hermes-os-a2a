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
  (GET verify + POST mensajes **con firma `X-Hub-Signature-256` obligatoria**
  desde 2026-07-28: app secret por tenant `CRM_WHATSAPP_APP_SECRET__<TENANT>`
  con fallback global `CRM_WHATSAPP_APP_SECRET`; FAIL-CLOSED — sin secret el
  POST responde 503, firma mala 403). Saliente sin token → `enviado=false` en
  bitácora (visible, jamás silencioso).
- **Puente a adquisición (2026-07-28)**: el PRIMER mensaje de un contacto crea
  un lead en `public.leads` con `origen='crm'`, `canal` y `telefono` (wa_id) —
  `crm-canales/leads.py`, único escritor del origen `crm`, insert
  `ignore-duplicates` (los mensajes siguientes NO tocan la etapa que ya movió
  el funnel). Prerequisito BD: `supabase-fase12-leads-crm.sql` — **APLICADA en
  prod (Elisa, 2026-07-28)**. Imagen nueva verificada en runtime por smoke del
  edge: POST sin firma → 503 fail-closed (esperado sin app secret; el E2E
  firmado + lead se corre al conectar el primer tenant real).
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
2. WhatsApp (Cloud API directa de Meta — P-01 dictaminado 2026-07-28: sin BSP):
   a. Meta Business verificado + app con caso de uso "Connect with customers
      through WhatsApp" + número (el `phone_number_id` de 15-17 dígitos NO es
      el teléfono).
   b. Token **PERMANENTE de System User** (Business Manager → System users →
      rol Admin; permisos `business_management` + `whatsapp_business_messaging`
      + `whatsapp_business_management`; expiración **Never**). JAMÁS el token
      de 24h del dashboard: expira y el canal muere en silencio (error 190).
      Verificar credenciales por FORMATO sin imprimirlas (token `EAA…` 100+
      chars; app secret 32 hex).
   c. Al `.env` del server: `CRM_WHATSAPP_TOKEN__<TENANT>` + app secret
      (`CRM_WHATSAPP_APP_SECRET` o `…__<TENANT>`) → `phone_id` en
      `crm_tenants.canales.whatsapp` → webhook en Meta a
      `/crm/webhook/whatsapp/<tenant>` con `CRM_WHATSAPP_VERIFY_TOKEN` y
      **suscripción al campo `messages`** (sin eso Meta nunca entrega mensajes
      y no hay error en ningún lado) → restart del servicio.

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

## CRM-2 — muestreo A2 VIVO (2026-07-21, PR de la rama feat/crm2-muestreo-a2)

Nivel por TENANT (`crm_tenants.nivel`, default A1; **subir a A2 = botón humano**
de la dueña vía update). En A2: gates deterministas SIEMPRE; juez LLM sobre
muestra cuya tasa sale de la evidencia de `crm_supervision` (arranque 20%,
piso 5% con <3% rechazo en ≥20 veredictos); lo sensible saliente (dinero/
promesas/contratos/facturación, `muestreo.py::_SENSIBLE_SALIENTE`) pasa por
juez al 100%; **degradación automática** a validación completa si el rechazo
llega a 10% (bajar es regla, no junta). Auditoría con `nivel` +
`juez_ejecutado` (la evidencia se alimenta sola). Verificado en prod: 4/5
neutrales omitidos (0.20), 1 muestreado ok, y el juez rechazó un precio
inventado en el camino sensible. Tenant demo devuelto a A1 (la promoción real
exige el expediente del plan D-40). 37 tests.

## CRM-3 — expediente de promoción A1→A2 VIVO (2026-07-21)

"Subir = expediente + botón humano" operando: `sup-crm GET /expediente/{tenant}`
(criterios: ≥200 veredictos de juez, rechazo <3%, cero fallos de gates —
constraint, no criterio: sin evidencia completa `promovible=false` por
construcción) + host-job `expediente-promocion.py` en el cron nocturno
(nightly-jobs.sh): expira pendientes vencidos, registra en `crm_expedientes`
(bitácora de compuerta, caducidad 7 días, dedupe) y PRESENTA a la dueña por
Telegram con números y el botón exacto (decir "aprueba el expediente N" al
agente, o el SQL del mensaje). El job jamás promueve. sup-crm ahora expone
127.0.0.1:4700 (host-jobs). Smoke E2E en prod con evidencia sintética
(expediente #1 presentado + dedupe verificado; datos limpiados). 47 tests.

## Siguientes fases (blueprint CRM-4..5)

panel humano, cruce de perfil entre canales, intenciones con niveles medidos,
enjambre nocturno de calidad.

## Observabilidad (2026-07-23)

Mission Control ganó la vista `/crm` (submenú del departamento adquisición):
embudo de `leads` por etapa con **mover-de-etapa desde el panel** (única
escritura), y resumen de `crm_conversaciones` por estado × nivel — hoy en empty
state honesto hasta conectar el primer tenant real. Detalle en
[[fase4-dashboard]].
