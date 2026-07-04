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

> ⚠️ Falta el mapa **`slack_user_id → rol`** (los IDs de Slack de las 4 personas), el
> equivalente con rol del `TELEGRAM_ALLOWED_USERS` de hoy. Se llena al cablear Slack.

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
1. Crear un **Slack workspace** (o usar uno) y una **Slack App** en `api.slack.com/apps`.
2. Activar **Socket Mode** → generar **App-Level Token** `xapp-…` con scope
   `connections:write`.
3. **Bot Token Scopes** (lista verificada): `chat:write`, `app_mentions:read`,
   `channels:history`, `channels:read`, `groups:history`, `groups:read`,
   `im:history`, `im:read`, `im:write`, `mpim:history`, `mpim:read`,
   `users:read`, `files:read`, `files:write`.
4. **Event Subscriptions** (sí, también con Socket Mode): `message.im`,
   `message.mpim`, `message.channels`, `message.groups`, `app_mention`.
5. **Instalar la app** en el workspace → **Bot Token** `xoxb-…`.
   ⚠️ Si después cambias scopes o eventos, hay que REINSTALAR la app.
6. En App Home, habilitar **Messages Tab** (sin esto los DMs quedan bloqueados).
7. Crear `#dep-negocio`, invitar al bot (`/invite @<bot>`) — no se auto-une — y
   añadir a las 4 personas. Anotar el **Channel ID** (`C…`: canal → View channel
   details → Channel ID) y los **Member IDs** (`U…`) de las 4 personas.
8. En la máquina runtime, añadir al `.env` del volumen de negocio
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

### Después del piloto
Validado el acceso+aprobación con los 4, expandir por departamento (`#dep-clientes`,
`#dep-desarrollo`) y luego los `#cli-*` / `#dev-*`. Mismo patrón, otra membresía y otro
`channel_prompt`.

---

## Encaje con Fase 6

Esto es la **capa humana de los departamentos**: un canal = la cara de un departamento o
cliente; Hermes opera dentro; el `#cli-*` privado es el aislamiento white-label hecho
visible. Refuerza la venta: un cliente puede recibir **su canal/workspace**. Ver
[[white-label]] y `SPEC-trio.md`.
