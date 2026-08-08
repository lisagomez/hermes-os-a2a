# RUNBOOK — Pipeline Comercial de A2A / hermes-os-a2a

> Generado por la skill `pipeline-comercial` el 2026-08-08.
> **Actualización 2026-08-08 (tarde)**: P1 desbloqueada (MCP de Supabase en sesión de dev,
> lectura verificada con números reales); P2/P3/P6 implementados; P4/P5 escritos
> (`businessos/avisar-leads.py`, `businessos/reporte-leads.py`) — cron y verificación
> con dato real pendientes del deploy.
> Estado: **0 de 7 orígenes verificados hoy** — la auditoría empírica contra la base no se
> pudo ejecutar desde la máquina de desarrollo (ver P1). Todo lo que sigue sale de auditar
> el **código de cada escritor**, no de mirar filas reales.

## COMO EMPEZAR (autosuficiente — léelo primero)

**Qué es esto:** el mapa de por dónde entran los interesados de A2A, a dónde va cada uno, y
qué falta para que el pipeline quede completo y medible.

**La verdad vive en:** tabla `public.leads` del proyecto Supabase **A2ABot**
(`hsejpktzcqwkwkwholkw`). Cualquier pregunta del tipo *"¿cuántos leads llevamos?"* se responde
**desde ahí**, nunca desde un panel, una hoja ni un chat.

**Lectura humana:** Mission Control → `/crm` (embudo por etapa + mover de etapa). Ojo: es un
**lector** del canónico, no un espejo — mover etapa es su única escritura.

**Si vas a continuar el trabajo pendiente**, abre un agente y pégale esto:

> Lee `RUNBOOK-PIPELINE-COMERCIAL.md` en la raíz del repo y ejecuta los pasos marcados 🤖 de
> la sección "Pendientes". Los pasos 🙋 son míos: dime cuándo te toque esperar por uno.

**Qué es tuyo (🙋) y qué del agente (🤖):** los pasos 🙋 requieren una cuenta, una
autorización legal, un pago o un clic en la consola de un tercero — nadie los puede hacer por ti.

---

## 1. El pipeline hoy

```
[landing cliente-web2  ]─┐
[chat vendedor web2    ]─┤
[card pública ventas   ]─┼──▶ [ public.leads ]──┬──▶ Mission Control /crm  (lector humano)
[WhatsApp / Telegram   ]─┤     (LA VERDAD)      ├──▶ aviso en vivo          ← NO EXISTE
[buzón atencion@       ]─┘                      └──▶ reporte diario/recon.  ← NO EXISTE
[agenda Meeting Copilot] ··▶ (no escribe)
[gafetes evento        ] ··▶ (no escribe)
```

### Superficies de captura

| # | Superficie | Dónde vive | Escribe en | Origen | Idempotencia | Estado |
|---|---|---|---|---|---|---|
| 1 | Formulario landing | `frontends/cliente-web2/src/app/api/leads/route.ts` | `leads` | `web2` | ✅ `web2chat-sha1(email)` + upsert (P2, comparte clave con el chat) | 🟡 |
| 2 | Chat vendedor IA | `businessos/chat-web2/leads.py:73` | `leads` | `web2` | ✅ `web2chat-sha1(email\|tel)` + upsert merge | 🟡 |
| 3 | Card pública comercial | `businessos/ventas-a2a/executor.py` | `leads` | `a2a` | ✅ `a2a-sha1(contacto|empresa)` + upsert (P3; texto libre conserva uuid) | 🟡 |
| 4 | WhatsApp / Telegram CRM | `businessos/crm-canales/leads.py:116` | `leads` | `crm` | ✅ `crm-<tenant>-<canal>-<uid>` + ignore-duplicates | 🔴 gate |
| 5 | Buzón `atencion@digifixapp.com` | `businessos/ingerir-entrantes.py:316` | `leads` | `correo` | ✅ `correo-<tenant>-<remitente>` + upsert | 🟡 |
| 6 | Agenda / citas Meeting Copilot | `frontends/meeting-copilot/src/app/api/reservar/route.ts` | `leads` | `copilot` | ✅ `copilot-sha1(email)` + upsert (P6) | 🟡 |
| 7 | Gafetes en evento presencial | `meeting-copilot` (Fase 1 de 5) | — | *(sin origen)* | — | 🔴 huérfano |
| 8 | Canal Slack interno | — | — | `slack` | — | 🔴 sin escritor |
| 9 | Carga manual | humano / host-jobs | `leads` | `manual` | según quien escriba | 🟡 |

> 🟢 dato real viajó y se vio llegar · 🟡 el código existe pero **nadie lo probó hoy**
> (tratar como roto) · 🔴 no escribe en ningún lado

**Verificaciones históricas de otras sesiones** (con credenciales, no re-confirmadas hoy — no
alcanzan para 🟢): `web2` E2E el 2026-07-17 · `crm` smoke E2E el 2026-07-21 (con datos de humo,
sin tenant real) · `correo` primera corrida real el 2026-08-02 · `a2a` smoke el 2026-07-10.
Un canal "conectado" del que nadie ve filas frescas está roto hasta demostrar lo contrario.

### Espejos

| Espejo | Destino exacto | Disparado desde | Estado |
|---|---|---|---|
| Aviso en vivo de lead nuevo | Telegram grupo equipo (`hermes send`) | `businessos/avisar-leads.py` (cron 5 min, marca de agua) | 🟡 código listo; cron pendiente |
| Reporte diario / reconciliación | Telegram grupo equipo (`hermes send`) | `businessos/reporte-leads.py` (cron 14:00 UTC = 08:00 CST) | 🟡 código listo; cron pendiente |
| Hoja de cálculo | — | — | 🔴 no existe (no se pidió) |
| Correo de acuse al propio lead | — | — | 🔴 no existe |

> **Este es el hallazgo operativo más caro del pipeline.** Ningún host-job de `businessos/`
> lee la tabla `leads`: no hay aviso, no hay digest, no hay reconciliación. Un interesado
> puede entrar por cualquiera de los 5 canales cableados y **nadie se entera** hasta que un
> humano abre Mission Control por su cuenta. En un ciclo consultivo B2B, eso es la fuga.

---

## 2. Variables de entorno

| Variable | Para qué | Local | Hosting | Apunta a |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del canónico (frontends) | ✅ | ✅ | proyecto A2ABot |
| `SUPABASE_URL` | URL del canónico (servicios py) | ✅ | ✅ | proyecto A2ABot |
| `SUPABASE_SERVICE_ROLE_KEY` | Escritura en `leads` — **server-only** | ✅ | ✅ | A2ABot · bypassa RLS |
| `CRM_TELEGRAM_TOKEN__<TENANT>` | Canal Telegram por tenant | ❌ | ✅ | BotFather |
| `CRM_WHATSAPP_TOKEN__<TENANT>` | Canal WhatsApp por tenant | ❌ | ✅ | System User de Meta (**Never** expira) |
| `CRM_WHATSAPP_APP_SECRET[__<TENANT>]` | Firma `X-Hub-Signature-256` (fail-closed) | ❌ | ✅ | app de Meta |
| `SUPABASE_ACCESS_TOKEN` (`sbp_…`) | Migraciones por management API | ✅ | ❌ **nunca** | toda la organización |

> `SUPABASE_ACCESS_TOKEN` es de **operador**: jamás sube al hosting ni entra al contenedor del
> Ejecutor. `SERVICE_ROLE_KEY` bypassa RLS por diseño — nunca viaja al cliente.

---

## 3. Pendientes

### P1 · 🙋 Dar acceso de lectura al canónico para poder auditar

> **Estado 2026-08-08**: ✅ RESUELTA en la sesión de dev — el MCP de Supabase (read-only)
> responde con números reales. Auditoría del día: 3 filas (web2:1 del 07-19, a2a:2 del 07-18
> — las dos a2a son basura de smoke "ignorar/borrar", ver §6).
- **Qué:** entregar al agente una vía de consulta a `public.leads` (MCP de Supabase en la
  sesión, o `SUPABASE_URL` + una key de lectura en la máquina de desarrollo).
- **Dónde:** configuración del MCP de este repo, o `~/.config/claude/secrets.env` (permisos 600).
- **Verificación:** el agente responde con números reales a
  `select origen, count(*), max(created_at) from leads group by 1 order by 3 desc nulls last;`
- **Si no se hace:** el pipeline entero se queda en 🟡 para siempre. Nadie sabe qué canal está
  vivo, y un canal muerto se descubre cuando el mes cierra sin leads.
- **Bloquea a:** P2 (medir el daño), P7, y todo el §4.

### P2 · 🤖 Unificar la clave natural del origen `web2`

> **Estado 2026-08-08**: ✅ implementado — el formulario deriva `web2chat-sha1(email)` con la
> MISMA función/prefijo del chat (`src/lib/leads/lead-id.ts`) y upserta `on_conflict=lead_id`.
> Además ni formulario ni chat viajan `etapa`: un reenvío ya no regresa a 'nuevo' un lead
> avanzado. Verificación real pendiente del deploy CLI de cliente-web2.
- **Qué:** el formulario y el chat escriben **el mismo origen con claves incompatibles**. El
  formulario usa `web2-<uuid4>` con `insert` puro: cada reenvío (doble clic, reintento, la
  misma persona mañana) crea **una fila nueva**. El chat usa `web2chat-sha1(email)` con upsert.
  Resultado: el mismo humano que charla y además llena el formulario queda como **dos leads**,
  y no hay forma de reconciliarlos por `lead_id`.
- **Archivos:** `frontends/cliente-web2/src/app/api/leads/route.ts:36,56` ·
  `businessos/chat-web2/leads.py:73`
- **Cómo:** derivar `lead_id` del email también en el formulario (misma función hash y mismo
  prefijo que el chat) y cambiar `.insert()` por upsert `on_conflict=lead_id` tratando el
  conflicto como éxito, no como error.
- **Verificación:** enviar dos veces el mismo email por el formulario y una vez por el chat →
  **una sola fila** en `leads`. Hoy salen tres.
- **Si no se hace:** el embudo cuenta de más, el equipo llama dos veces a la misma persona, y
  cualquier métrica de conversión queda inflada sin que nadie lo note.

### P3 · 🤖 Aplicar el mismo criterio al origen `a2a`

> **Estado 2026-08-08**: ✅ implementado — DataPart deriva `a2a-sha1(contacto|empresa)` +
> upsert; el texto libre CONSERVA uuid (dos textos distintos jamás deben colapsar en una
> fila). 16 tests verdes. Deploy = rebuild de ventas-a2a en el server.
- **Qué:** `ventas-a2a` también genera `lead-<uuid4>` y hace `insert` sin `on_conflict`.
- **Archivos:** `businessos/ventas-a2a/executor.py:100` · `businessos/ventas-a2a/leads.py:53`
- **Verificación:** dos envíos con el mismo contacto por la card pública → una fila.
- **Si no se hace:** mismo daño que P2 en el canal comercial público.

### P4 · 🤖 Aviso en vivo cuando entra un lead

> **Estado 2026-08-08**: 🟡 código listo (`businessos/avisar-leads.py`: marca de agua local,
> primera corrida no spamea histórico, la marca solo avanza tras envío exitoso). Falta el
> cron `*/5 * * * *` en el server y verlo llegar al grupo.
- **Qué:** host-job que consulta `leads` por `created_at > última corrida` y avisa por Telegram
  al grupo del equipo, con origen, contacto y etapa.
- **Dónde:** `businessos/nightly-jobs.sh` no sirve (es nocturno) — cron propio cada 5 min, con
  el patrón ya usado por los avisos del trío.
- **Verificación:** dar de alta un lead de prueba y ver el mensaje llegar al grupo; después
  borrar la fila.
- **Si no se hace:** un lead caliente espera horas o días. Es el agujero más grande del §1.
- **Nota:** los contenedores corren en UTC y el servidor en CST (−6h) — un cron a las 8:00 CST
  se escribe `0 14 * * *`.

### P5 · 🤖 Reporte diario de reconciliación

> **Estado 2026-08-08**: 🟡 código listo (`businessos/reporte-leads.py`: ayer CST + mes en
> curso + canales sin filas ≥7 días; fechas literales, jamás now()/interval en PostgREST).
> Falta el cron `0 14 * * *` (UTC) y ver llegar el primer reporte.
- **Qué:** resumen 08:00 CST: leads por origen del día + total del mes + **canales sin filas
  en 7 días** (la señal de canal roto).
- **Verificación:** el primer reporte llega con números que cuadran con una consulta manual.
- **Si no se hace:** los canales mueren en silencio, que es exactamente como murieron los
  host-jobs huérfanos tras la migración a Hetzner.

### P6 · 🤖 Escritor para el origen `copilot`

> **Estado 2026-08-08**: ✅ implementado — `/api/reservar` es el escritor único (upsert
> `copilot-sha1(email)`, brief de discovery en `datos`); el pipeline del cliente lo dispara
> fire-and-forget tras reservar (jamás rompe la reserva). La cita en sí sigue mock-first y
> la respuesta lo DICE (`cita_persistida:false`). Verificación real pendiente del deploy.
- **Qué:** `copilot` existe en el CHECK de `leads` desde `supabase-fase12-leads-crm.sql` y
  **no tiene escritor**: agendar una cita en Meeting Copilot no crea lead. La agenda es hoy
  una isla respecto del embudo.
- **Archivos:** `frontends/meeting-copilot` (reserva pública) → nuevo escritor único.
- **Verificación:** reservar una cita de prueba → fila con `origen='copilot'` visible en `/crm`.
- **Si no se hace:** las citas —el lead más caliente que existe— no aparecen en el embudo y no
  cuentan en ninguna métrica de conversión.

### P7 · 🙋 Aviso de privacidad publicado + buzón de bajas con responsable nombrado
- **Qué:** publicar el aviso de privacidad y habilitar un buzón de bajas con una persona
  responsable con nombre.
- **Por qué es 🙋 y no 🤖:** es una obligación legal, no código. El propio grafo del repo
  (`grafo/seed/reglas.json`, dimensión `datos-personales`) dictamina: contacto de **persona
  física** → `dudoso` con la bandera *"sin aviso de privacidad publicado no hay vía lícita para
  prospección"*; contacto **corporativo** → `permitido` **pero** exige aviso accesible y
  mecanismo para que el titular limite el uso (Art. 15 IV).
- **Verificación:** URL del aviso viva y accesible + dirección del buzón de bajas + nombre del
  responsable, los tres por escrito.
- **Si no se hace:** bloquea la Fase 3 de gafetes, y deja en falso legal la captura que ya
  corre. **Además:** hoy la fila de un lead `web2` **no guarda ninguna prueba de
  consentimiento** — el esquema del formulario (`route.ts:6-14`) no pide consentimiento ni
  registra qué versión del aviso se aceptó. Sin eso no hay prueba de autorización.
- **Bloquea a:** P8 y la Fase 3 de la captura en eventos.

### P8 · 🙋 Confirmar por escrito qué codifican los gafetes del evento objetivo
- **Qué:** una llamada al organizador para saber si el QR lleva vCard/MECARD/URL con datos, o
  un identificador opaco que solo el organizador puede resolver (lo habitual en ferias).
- **Verificación:** respuesta escrita del organizador, guardada en el repo.
- **Si no se hace:** se construyen el intérprete y la cámara (~2 días) para leer códigos que no
  contienen nada. La validación cuesta una llamada.

### P9 · 🙋 Alta de WhatsApp Business (Meta) para el primer tenant real
- **Qué:** Meta Business verificado, número, `phone_number_id`, y token **permanente de System
  User** (jamás el de 24h del dashboard: expira y el canal muere en silencio, error 190).
- **Dónde:** Business Manager → System users → rol Admin, permisos `business_management` +
  `whatsapp_business_messaging` + `whatsapp_business_management`, expiración **Never**.
- **Verificación:** mensaje real al número → fila con `origen='crm'` y `canal='whatsapp'`;
  hoy el webhook responde **503 fail-closed por diseño** al no haber app secret.
- **Si no se hace:** el canal 4 sigue siendo código vivo sobre cero tenants: infraestructura
  pagada que no captura nada.

### P10 · 🙋 Decidir qué pasa con el origen `slack`
- **Qué:** `slack` está en el CHECK desde `supabase-fase9.sql` marcado *"futuro"*, nunca tuvo
  escritor, y `SPEC-sala-a2a.md` propone sustituir Slack para uso interno. O se le pone dueño
  o se retira del CHECK.
- **Verificación:** decisión escrita en `DECISIONES.md`.
- **Si no se hace:** un valor legal en el esquema que nadie puede producir — invita a que
  alguien lo use "porque estaba ahí" y ensucie el embudo.

---

## 4. Cómo verificar el pipeline completo

Ejecutar **cuando P1 esté resuelto**. Cada canal pasa a 🟢 solo cuando un dato real viajó y se
vio llegar del otro lado.

```bash
# 1. Registro de prueba identificable por el formulario público
curl -sS -X POST "https://cliente-web2.vercel.app/api/leads" \
  -H 'content-type: application/json' \
  -d '{"nombre":"PRUEBA 2026-08-08","email":"prueba@ejemplo.test","empresa":"PRUEBA"}'
```

```sql
-- 2. Confirmar en el canónico (y de paso, el mapa real de canales)
select origen, count(*) as total, max(created_at) as ultimo
from public.leads group by 1 order by ultimo desc nulls last;

select * from public.leads where contacto ilike '%prueba@ejemplo.test%';
```

3. Confirmar en cada espejo — hoy no hay ninguno (§1). Cuando P4/P5 existan, el aviso y el
   reporte se confirman **viéndolos llegar**, no asumiendo que salieron.

4. **Borrar los datos de prueba** de `leads` antes de cerrar. Nunca dejar basura en producción.

**Prueba de concurrencia — obligatoria antes del evento presencial:**

```bash
for i in 1 2 3 4 5; do curl -sS -X POST "https://cliente-web2.vercel.app/api/leads" \
  -H 'content-type: application/json' \
  -d "{\"nombre\":\"PRUEBA $i\",\"email\":\"prueba$i@ejemplo.test\",\"empresa\":\"PRUEBA\"}" & done; wait
```

Esperado: **5 filas, ni 4 ni 6**. Y con P2 aplicado, reenviar el mismo email dos veces debe
seguir dando **una sola fila**.

---

## 5. Decisiones tomadas (no re-litigar sin motivo nuevo)

| Decisión | Por qué | Fecha |
|---|---|---|
| `public.leads` es el único destino canónico | Ya recibe 5 de los canales y es la fuente del panel `/crm` | vigente |
| **Un escritor por origen** | Doctrina del repo: dos escritores sobre la misma fila producen verdades que se contradicen | 2026-07-16 |
| El panel `/crm` solo escribe la etapa | Mover de etapa es su única escritura; el resto es lectura | 2026-07-23 |
| WhatsApp Cloud API directa, sin BSP | Dictamen P-01 | 2026-07-28 |
| Gafetes van a tabla propia `evento_asistentes` | No se toca el CHECK de `leads`; la promoción a lead usa el origen `copilot` ya existente | 2026-08-07 |
| Outbound proactivo por WhatsApp prohibido hasta cerrar P2 del roadmap | Plantillas HSM + ventana 24h no están resueltas | vigente |

---

## 6. Limpieza pendiente

- [ ] 🤖 Borrar las filas `PRUEBA …` de `leads` tras ejecutar el §4 (nadie más las puede ver).
- [ ] 🤖 Borrar las 2 filas `a2a` de smoke del 2026-07-18 (`mensaje` literal: "lead del smoke
      de runtime (ignorar/borrar)") — detectadas en la auditoría del 2026-08-08.
- [ ] 🙋 Confirmar que ningún lead real quedó marcado como prueba antes de borrar por patrón.
- [ ] 🤖 Al cerrar P2/P3, revisar si ya existen duplicados históricos en `leads` y decidir con
      la dueña si se fusionan o se dejan (fusionar cambia números que quizá ya se reportaron).

---

> **Regla anti-deriva:** cuando alguien pregunte *"¿cuántos leads llevamos?"*, la respuesta sale
> de `public.leads`. Si te ves consultando el panel, una hoja o un chat para responder, ese
> espejo se volvió una segunda verdad y el pipeline ya está roto.
