# Equipo de 4 + Slack — topología de canales, roles/aprobación y piloto

> Decisión en curso (2026-06-28): el negocio pasa de **1 operador** a un **equipo de 4
> humanos** trabajando junto con los agentes. Slack como superficie de coordinación por
> **departamento / cliente / desarrollo**. Es la **capa humana** de la Fase 6
> (ver `SPEC-trio.md`, `white-label.md`).
>
> Hermes soporta Slack nativo (`platform_toolsets: hermes-slack`). Su config es consciente
> de canales: `require_mention`, `allowed_channels`, `free_response_channels` y
> `channel_prompts` (system prompt por canal). Telegram sigue para lo personal del dueño.

---

## Principio rector

El chat es el 20% fácil; el 80% es el **modelo de acceso y aprobación** al pasar de 1 a 4
personas. Hoy el sistema asume un operador (allowlist = 1 `user_id`, home channel = su DM,
un solo aprobador). Con equipo hay que definir **quién ve/habla en qué canal** y **quién
aprueba qué**. Diseñar eso ANTES de cablear gente.

Dos verdades que no cambian:
- **Slack NO es el sistema de registro.** Coordinación humana en Slack; **verdad durable en
  Supabase** (`token_usage`, `facturas`). El historial de Slack es limitado/efímero.
- **Higiene de secretos sistémica.** Lo que el agente escribe ahora lo ven 4 personas (y el
  cliente si lo invitas a su canal). La regla "no volcar credenciales/comandos" (negocio,
  clientes) debe valer para todas las verticales.

---

## (a) Topología de canales

Un **workspace** para el negocio. Tres ejes de canales (los que pediste):

| Eje | Canales | Visibilidad | Hermes que opera |
|-----|---------|-------------|------------------|
| **Departamento** | `#dep-negocio`, `#dep-clientes`, `#dep-desarrollo` (+ futuros `#dep-finanzas`, `#dep-soporte`) | Público al equipo | la vertical/departamento de ese canal |
| **Cliente** | `#cli-<cliente>` (uno por cliente) | **Privado** (miembros asignados + dueño; opcional el cliente) | clientes / el depto que atiende a ese cliente |
| **Desarrollo** | `#dev-<proyecto>` (uno por app/feature) | Público al equipo o privado por sensibilidad | desarrollo (trío Ejecutor/Supervisor del proyecto) |
| **Transversal** | `#alertas` (presupuesto/tokens), `#general` | Público | negocio publica alertas aquí |

Reglas de la topología:
- **`require_mention: true`** en canales con tráfico: el agente solo responde cuando lo
  **@mencionan** (no contesta cada mensaje del equipo). Canales 1-a-1 con el agente pueden
  usar `free_response_channels`.
- **`channel_prompts`**: cada canal lleva su propio contexto (p. ej. `#cli-acme` →
  "ámbito cliente Acme, no menciones otros clientes"). Es el ámbito RAG hecho visible.
- **Aislamiento por cliente = membresía de canal.** Los `#cli-*` son privados; el agente en
  un `#cli-X` solo consulta el **ámbito de X**, nunca cruza a otro cliente. Es el principio
  RLS/ámbito aplicado a Slack.
- **Personal NO entra a Slack**: la vida del dueño sigue en Telegram DM (Kiris).

---

## (b) Roles y matriz de aprobación

Mapea el "copiloto, no autopiloto" a un equipo: el Supervisor (automático) cierra el lazo
técnico; **un humano con el rol correcto** aprueba lo irreversible.

### El equipo de 4 (roles reales)
| Persona | Ancla en | Autoridad | Canales que habita |
|---------|----------|-----------|--------------------|
| **CEO** | Dirección / todo | Autoridad final. Aprueba **config de departamentos**, **deploy a producción** y, junto al CFO, montos grandes/política. Ve todo. | todos |
| **CFO** | `negocio` / finanzas | Único que aprueba **mover dinero / pagos**; vigila el **presupuesto de tokens** (`token_usage`). | `#dep-negocio`, `#alertas`, parte financiera de `#cli-*` |
| **Project Manager** | `clientes` | Aprueba lo **de cara al cliente** (propuestas, correos, contratos); coordina entregas y proyectos. | `#dep-clientes`, `#cli-*`, `#dep-desarrollo`, `#dev-*` |
| **Developer** | `desarrollo` (trío Fase 6) | Aprueba **merge a `main`** (con Supervisor en verde) y el lado técnico del deploy; opera el Ejecutor/Supervisor. | `#dep-desarrollo`, `#dev-*` |

*Rol externo opcional:* **Cliente invitado** — leer/comentar **solo** en su `#cli-*`; nunca
aprueba; nunca ve otros clientes.

### Personas reales (IDs cableados el 2026-07-12)

| Persona | Slack (member ID) | Telegram (user ID) | Rol |
|---|---|---|---|
| **Elisa Gómez** | `U0BG072S4CR` (owner) | `7022378429` | **CEO** (dueña) |
| Luis Trujillo | `U0BG24A4X1S` | `5239096821` | ⚠️ **sin asignar** |
| Víctor Huerta | `U0BGSN36CAC` | (en el grupo) | ⚠️ **sin asignar** |
| Johann/Oswaldo Valderrama | `U0BFS4ZA8KV` | (en el grupo) | ⚠️ **sin asignar** |
| Ricardo Silva | `U0BFYCEP3BL` | *(no está en el grupo de TG)* | ⚠️ **sin asignar** |

Los 5 están en `SLACK_ALLOWED_USERS` (`.env` del volumen de negocio) y los del grupo de
Telegram entran por `group_allowed_chats` (ver §(d)). Los IDs de Slack/Telegram **no son
secretos**; los tokens sí (viven solo en el `.env` del volumen).

> ⚠️ **Sigue faltando el mapa `persona → rol`.** Hoy el allowlist es **plano**: los 5
> pueden hablarle al agente por igual, sin distinción de autoridad. Eso importa porque
> según la matriz de abajo el **CFO** es el único que aprueba **mover dinero** y el
> **Developer** el único que aprueba **merge a `main`**. Mientras el mapa no exista, esas
> compuertas las sostiene **solo el juicio humano en el canal**, no la configuración.
> Lo llena la dueña (decisión de negocio, no técnica).

### Matriz (acción → quién aprueba)
| Acción | Aprueba |
|--------|---------|
| Mover dinero / pagos | **CFO** (montos grandes o política: + CEO) |
| Presupuesto / gasto de tokens | CFO vigila; CEO informado |
| Deploy a producción | CEO o PM (negocio) **+** Developer (técnico) |
| Merge a `main` | **Developer** (con Supervisor en verde) |
| Envío a cliente (propuesta, correo, contrato) | **PM** (o CEO) |
| Cambiar reglas/config de un departamento | **CEO** |
| Acciones internas (borradores, queries de lectura, clasificación) | cualquiera del equipo, o auto con gate del Supervisor |

**Mapeo persona ↔ departamento:** CFO ancla `negocio`, PM ancla `clientes`, Developer ancla
`desarrollo` (el trío de Fase 6); el CEO supervisa los tres y es el aprobador final de lo
irreversible. Encaja directo con las verticales que ya corren.

---

## (c) Piloto — runbook (acotar antes de escalar)

> **Verificado contra la doc oficial el 2026-07-03**
> (hermes-agent.nousresearch.com/docs/user-guide/messaging/slack). Correcciones
> al borrador original: `SLACK_ALLOWED_USERS` es OBLIGATORIO (sin él el gateway
> rechaza todo por diseño); `allowed_channels`/`channel_prompts` usan **IDs de
> canal** (`C…`), nunca `#nombre`; los scopes reales son más que los del
> borrador; y hay que suscribir eventos aunque sea Socket Mode.
> **Artefactos listos en el repo:** `businessos/negocio/slack-config-fragment.yaml`
> (config a mergear) y `businessos/slack-piloto.sh` (host-job runtime que
> verifica tokens sin imprimirlos, mergea con backup y reinicia).

**Vertical del piloto: `negocio` en `#dep-negocio`.** Es el menor riesgo (interno,
mayormente consultas de lectura del presupuesto), ya corre y ya tiene la regla de higiene.

**Modo: Socket Mode** (sin webhook entrante) — encaja con la postura de la infra
(sin puertos públicos; Docker se salta UFW). Requiere un **App-Level Token** además del Bot
Token.

### Lo que hace la usuaria (no lo puedo hacer yo)

> **ATAJO (2026-07-08): manifiesto listo.** Los pasos 2-6 se colapsan creando la
> app "From an app manifest" con `businessos/negocio/slack-app-manifest.yaml`
> (Socket Mode + scopes + eventos + Messages Tab quedan preconfigurados; el
> propio archivo trae las instrucciones). Solo quedan: generar el App-Level
> Token (`xapp-…`, scope `connections:write`), instalar (→ `xoxb-…`), y los
> pasos 7-8 de abajo.

1. Crear un **Slack workspace** (o usar uno) y una **Slack App** en `api.slack.com/apps`
   — con el manifiesto de arriba (recomendado) o a mano con los pasos 2-6.
2. Activar **Socket Mode** → generar **App-Level Token** `xapp-…` con scope
   `connections:write`. *(Con manifiesto: solo generar el token; Socket Mode ya está ON.)*
3. **Bot Token Scopes** (lista verificada): `chat:write`, `app_mentions:read`,
   `channels:history`, `channels:read`, `groups:history`, `groups:read`,
   `im:history`, `im:read`, `im:write`, `mpim:history`, `mpim:read`,
   `users:read`, `files:read`, `files:write`. *(Ya en el manifiesto.)*
4. **Event Subscriptions** (sí, también con Socket Mode): `message.im`,
   `message.mpim`, `message.channels`, `message.groups`, `app_mention`. *(Ya en el manifiesto.)*
5. **Instalar la app** en el workspace → **Bot Token** `xoxb-…`.
   ⚠️ Si después cambias scopes o eventos, hay que REINSTALAR la app.
6. En App Home, habilitar **Messages Tab** (sin esto los DMs quedan bloqueados).
   *(Ya en el manifiesto.)*
7. Crear `#dep-negocio`, invitar al bot (`/invite @Hermes Negocio`) — no se auto-une — y
   añadir a las 4 personas. Anotar el **Channel ID** (`C…`: canal → View channel
   details → Channel ID) y los **Member IDs** (`U…`) de las 4 personas.
8. En el server Hetzner, añadir al `.env` del volumen de negocio
   (`~/businessos/negocio/.hermes/.env`, perms 600 — NUNCA pegar tokens en un chat):
   `SLACK_BOT_TOKEN=xoxb-…`, `SLACK_APP_TOKEN=xapp-…`,
   `SLACK_ALLOWED_USERS=U…,U…,U…,U…` (los 4 Member IDs).

### Lo que hace el host-job (cuando estén los tokens)
9. Poner el Channel ID real de `#dep-negocio` en
   `businessos/negocio/slack-config-fragment.yaml` (reemplaza el placeholder).
10. Correr `businessos/slack-piloto.sh` en la máquina runtime: verifica los 3
    valores del `.env` sin imprimirlos, mergea `platforms.slack` en el
    `config.yaml` del volumen (con backup) y reinicia `hermes-negocio`.
    (Telegram puede seguir en paralelo.)
11. **Verificar**: @mención al bot en `#dep-negocio` → responde EN HILO,
    respetando higiene; un usuario fuera de `SLACK_ALLOWED_USERS` es ignorado.

> Nota sobre roles: `SLACK_ALLOWED_USERS` es la allowlist plana (quién puede
> hablar). El mapa `slack_user_id → rol` de la matriz de aprobación vive como
> conocimiento del agente (AGENTS.md/MEMORY.md de negocio) hasta que exista un
> mecanismo de roles nativo; los botones de aprobación son la etapa "Slack App
> propia" del roadmap de canales.

### ✅ PILOTO EJECUTADO Y VIVO (2026-07-08)

`@hermes_negocio` autenticado en el workspace **A2AMassivo** (Socket Mode conectado,
gateway con 2 plataformas — Telegram intacto), mensaje de presentación entregado en
`#dep-negocio` vía `hermes send -t slack:<C…>`. Gotchas de la corrida real:
- el volumen `.hermes` es 0700 uid-10000 → `slack-piloto.sh` ahora se re-ejecuta solo
  con `sudo env HOME=…` (sudo pelón cambia HOME y rompe las rutas);
- el Channel ID puede venir del `.env` (`SLACK_CHANNEL_ID=C…`): la dueña solo toca UN
  archivo y el fragmento versionado queda intacto;
- la app se creó con el manifiesto (`negocio/slack-app-manifest.yaml`) — scopes,
  eventos, Socket Mode y Messages Tab en un paso.
Pendiente natural: añadir los Member IDs de las otras 3 personas a
`SLACK_ALLOWED_USERS` y re-correr el script.

### Después del piloto
Validado el acceso+aprobación con los 4, expandir por departamento (`#dep-clientes`,
`#dep-desarrollo`) y luego los `#cli-*` / `#dev-*`. Mismo patrón, otra membresía y otro
`channel_prompt`.

**`#dep-legal` (2026-07-09)** — primer canal fuera del plan original: consultas de
cumplimiento regulatorio, respondidas por `hermes-negocio` consultando el grafo
(dimensión `regulatorio` de la Fase 8). Mismo patrón additivo: Channel ID agregado a
`allowed_channels` + `channel_prompt` propio en `negocio/slack-config-fragment.yaml`
(ahora fuente de verdad de AMBOS canales, ya no placeholder de uno solo — un re-run de
`slack-piloto.sh` reproduce el estado real en vez de borrar el canal nuevo). Bloqueo
recurrente: el bot no se auto-une a canales nuevos (sin scope `channels:join`) — hay que
`/invite @Hermes Negocio` a mano en cada canal nuevo antes de que responda ahí.

---

## Encaje con Fase 6

Esto es la **capa humana de los departamentos**: un canal = la cara de un departamento o
cliente; Hermes opera dentro; el `#cli-*` privado es el aislamiento white-label hecho
visible. Refuerza la venta: un cliente puede recibir **su canal/workspace**. Ver
[[white-label]] y `SPEC-trio.md`.

---

## (d) Canal rápido: grupo de Telegram del equipo (2026-07-12)

**Decisión de la dueña:** el equipo también entra a Telegram. Corrige el diseño
original ("Telegram = canal personal; el equipo vive en Slack"). Convive con Slack:

| | Telegram (`A2ATeamGroup`) | Slack (`#dep-*`) |
|---|---|---|
| Para qué | Reportes, agendas, datos informativos, instrucciones al vuelo | Centro de trabajo: seguimiento, hilos, compuertas de aprobación |
| Quién | Elisa + Luis + Víctor + Oswaldo + `@a2aTeamBot` | El equipo + `@hermes_negocio` |
| Rutinas que caen ahí | **digest diario 08:00** y **cierre semanal (lun 08:00)** | trabajo por hilos |
| Acceso | **membresía del grupo** (`group_allowed_chats: -5449291632`) | `SLACK_ALLOWED_USERS` (IDs uno por uno) |

Config y gotchas: `businessos/negocio/telegram-config-fragment.yaml`. Los dos que
cuestan una noche si se olvidan:

1. ⚠️ **El modo privacidad de Telegram debe estar APAGADO** (BotFather → Group
   Privacy → Turn off, y **re-añadir el bot al grupo**: el ajuste solo se aplica al
   entrar). Con privacidad ON, Telegram entrega los `/comandos` pero **NO las
   @menciones** → el bot queda mudo sin un solo error en ningún log.
2. Con privacidad OFF, Telegram entrega **todo** el chat del grupo → el freno de
   costo lo pone Hermes: `require_mention: true` (su default es `false`: sin eso el
   agente contesta CADA mensaje del equipo y quema tokens en toda la charla).

## (e) Rutinas automáticas — quién manda qué y cuándo (2026-07-12)

Hasta hoy los `AGENTS.md` **prometían** rutinas que **no existían** (`hermes cron
list` = *"No scheduled jobs"* en las 3 verticales): el bot creía tenerlas y nunca
mandaba nada. Creadas y activas:

| Cron | Vertical | Hora (CST) | Entrega |
|---|---|---|---|
| `digest-negocio` | negocio | 08:00 diario | grupo de Telegram del equipo |
| `cierre-semanal` | negocio | lunes 08:00 | grupo de Telegram del equipo |
| `repaso-clientes` | clientes | 08:00 diario | DM de la dueña |
| `dreaming-personal` | personal | 02:00 diario | sin mensaje (consolida memoria) |

> ⚠️ **Los contenedores corren en UTC; el server en CST (-6h).** `hermes cron` agenda
> en la hora del CONTENEDOR: para las 08:00 CST hay que escribir `0 14 * * *`. Un
> `0 8 * * *` entregaría el digest a las 2 de la mañana.

Host-jobs (cron de SO, en el servidor, sin LLM): `nightly-jobs.sh` 03:10 (ingesta de
tokens → snapshot de presupuesto → SOUL → dashboard → **auditoría de CLIs**),
`backup-verticales.sh` 04:17, `weekly-jobs.sh` lunes 03:30 (vigencias del grafo),
`alerta-presupuesto.sh` 08:00 (solo dispara si cruzas el 80%).
