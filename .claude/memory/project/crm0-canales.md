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
