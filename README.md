# Hermes OS · A2A

> Una mente con tres bocas. Un agente (Hermes) que opera tu vida **personal**,
> tu **negocio** y tus **clientes** desde tres contenedores aislados, hablando
> por Telegram y voz, con un grafo de conocimiento como cerebro
> regulatorio/fiscal/contable multi-país y un dashboard "Mission Control" encima.

Hermes OS · A2A es un sistema de agentes operativos autoalojados. No es una app que
abres: es una infraestructura que vive en un servidor, te responde por Telegram,
y crece por fases — de un cimiento mínimo a un sistema que razona sobre
regulación, cobra, contrata y (a futuro) transacciona valor entre agentes.

---

## Arquitectura en una frase

Una mente (**Hermes**) con tres bocas (**verticales**: personal, negocio,
clientes), cada una en su propio contenedor Docker, sobre un servidor
Hetzner Cloud, hablando por Telegram y voz, con un grafo de conocimiento como
cerebro regulatorio multi-país y un dashboard encima.

```
                    ┌─────────────────────────────┐
                    │   Mission Control (A2ABot)  │   ← dashboard: túnel SSH + Vercel (auth)
                    └──────────────┬──────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │              hermes-net (Docker bridge)              │
        │  ┌───────────┐   ┌───────────┐   ┌───────────┐       │
        │  │  PERSONAL │   │  NEGOCIO  │   │ CLIENTES  │       │
        │  │  Hermes   │   │  Hermes   │   │  Hermes   │       │
        │  │  + bot TG │   │  + bot TG │   │  + bot TG │       │
        │  └───────────┘   └───────────┘   └───────────┘       │
        │         cada una: SOUL.md · AGENTS.md · MEMORY.md    │
        │                                                      │
        │  grafo (cerebro regulatorio) · grafo-a2a (A2A)       │
        │  trío de desarrollo: ejecutor · supervisor ·         │
        │    coordinador (enjambre) — con cola durable         │
        │  ventas-a2a (dep. adquisición) · chat-web2 (venta)   │
        │  CRM marca blanca: crm-canales (TG/WA) · sup-crm     │
        │  frontend-ci (cabina interna) · edge (Caddy :443)    │
        └──────────────────────────────────────────────────────┘
                                   │
                         Supabase (datos + RLS)
```

Cada vertical es un servicio independiente con su propia persona (`SOUL.md`),
sus reglas (`AGENTS.md`) y su memoria estable (`MEMORY.md`). Se aíslan, no se
funden: ese es el primer principio del proyecto.

---

## Stack confirmado

| Capa | Tecnología |
|------|------------|
| Servidor | Hetzner Cloud (cx33: 4 vCPU / 8 GB; corre todo incl. grafo) |
| Orquestación | Docker + docker-compose (un contenedor por vertical) |
| Agente | Hermes Agent (Nous Research) — memory, skills, soul, crons, loop |
| Canales | Telegram (3 bots) + voz (TTS salida, transcripción entrada) |
| Modelos | OpenRouter (routing por tarea) o Nous Portal (OAuth) |
| Conocimiento personal | Obsidian (bóveda montada como volumen) |
| Cerebro regulatorio | Grafo multi-país (Fase 2+) |
| Datos / dashboard | Supabase + A2ABot (Mission Control) |
| Pago tradicional | Polar (Merchant of Record) — Fase 3 ✅ |
| Pago agéntico (futuro) | Circle / USDC (Agent Wallets) |
| Conexión de herramientas | MCP · CLIs agente-nativos (Printing Press) |
| Conexión entre agentes | Protocolo A2A ✅ (grafo-a2a, trío, enjambre, ventas-a2a) |
| CRM conversacional | crm-canales (Telegram + WhatsApp Cloud API) + sup-crm (plan D-40) |
| Frontends web | cliente-web2 (Vercel, marca propia) · control-interno (cabina equipo) |

> Tag de Hermes pineado: **`v2026.6.19`** (verificado en Docker Hub a 2026-06-26).
> No usar `:latest` / `:main` — apuntan a builds inestables.

---

## Estado actual (2026-08-02)

Las **fases 0–10 están vivas en producción** (Hetzner cx33, `167.233.233.56`) y la
línea CRM arrancó. En corto:

- **Fases 0–1** ✅ — 3 verticales 24/7 por Telegram (+ Slack interno y grupo del
  equipo), respaldo nocturno, gasto de tokens controlado ($30/mes, alerta 80%) y
  **costeo por tarea** del trío/enjambre (vistas `v_costeo_tarea`/`v_costeo_departamento`
  + recálculo nocturno de tarifas; 2026-07-29).
- **Fases 2–3** ✅ — **grafo** regulatorio multi-país (fiscal MX/CO, contable y
  contractual MX; todo citado), cobros Polar y contratos validados.
- **Fases 4–5** ✅ — dashboard **Mission Control** (6 vistas: Pantheon, AI Spend,
  Grafo, Desarrollo, CRM con el **embudo de cliente operable** y **Contratos SC**
  — paquete de revisión con banderas G1) + primer servicio **A2A** (`grafo-a2a`).
- **Fases 6–7** ✅ — **trío de desarrollo** (Hermes→Ejecutor→Supervisor) y
  **enjambre** (Coordinador con fan-out acotado y presupuesto); dogfood real
  aprobado con GLM-5.2 como motor.
- **Fases 8–10** ✅ — grafo regulatorio (permisos), departamento de
  **adquisición** (`ventas-a2a` + edge público) y **cola durable** del trío
  (encola en ~1s, worker serial, avisos a Slack). Resiliente a fallos
  transitorios del proveedor (429/5xx/conexión) — tanto el Ejecutor como el
  Planner del enjambre reintentan con backoff en vez de escalar, con el criterio
  en un módulo compartido.
- **Fase 11** 🚧 — frontend **cliente-web2** (Vercel) con cotizador, leads y
  chat de venta en vivo (`chat-web2`).
- **Fase 12** 🟡 — **fábrica de Smart Contracts** (Hyperledger Fabric): spec
  conversacional → plantilla **auditada** parametrizada (jamás código libre) →
  gates fabric del Supervisor → gate de **red efímera** → aprobación humana en
  `/contratos` → despliegue lifecycle con **doble firma** (Operadora+Testigo) y
  re-verificación de hash (G5). Fases 1–5 en dev y runtime; plantilla escrow-v1
  **auditada y firmada** (2026-07-28); gate de red efímera con **sandbox
  Hetzner EFÍMERO** (se crea, corre y destruye por corrida, ~$0.04 — smoke
  verde). Falta la ceremonia de llaves tier 1 y el e2e (Fase 6). El PM/oráculo
  es la Fase 13.
- **Departamento de Procesos** ✅ (primera corrida real aprobada) · **ERP-0 +
  módulo `act`** aplicado a producción (pipeline feature→activo→contable) ·
  **Meeting Copilot** (marca blanca) MVP construido, desplegado y con login
  (magic link + allowlist del equipo, 2026-07-28), con **agendamiento** completo
  (catálogo de asesores, bandeja de aprobación, reserva pública) y sección
  **Google Workspace** en `/herramientas` (2026-08-02).
- **Departamento de Buzón — HERALDO-6** ✅ desplegado e **inerte** (2026-08-02):
  correo institucional donde el agente lee saneado y **redacta borradores, nunca
  envía** — la supervisión humana es una fila en `aprobaciones_salientes` que el
  motor no puede fabricar porque no tiene credenciales. Migraciones en producción
  con los cuatro candados rechazando de verdad; 0 buzones dados de alta hasta que
  la dueña firme la gobernanza.
- **Línea Enriquecimiento** 🟡 — cascada de enriquecimiento de leads ordenada por
  costo y **sin LLM**, con el grafo (dimensión `datos-personales`, LFPDPPP 2025)
  como gate de entrada. A1/A2 fusionados; el servicio `enriquecimiento-a2a` está
  en revisión (PR #210).
- **Ecosistema de frontends** ✅ — waffle (App Launcher) + sidebar jerárquico
  config-driven en las 3 apps internas; auditoría adversarial post-merge con
  sus 12 objeciones resueltas (hotfix #195 + smoke móvil `npm run smoke` #196,
  2026-07-30). Detalle en `businessos/ROADMAP.md` §Ecosistema de frontends.
- **Línea CRM (marca blanca)** ✅ CRM-0/1/2/3 — canales **Telegram + WhatsApp**
  multi-tenant (`crm-canales`), supervisor de salientes (`sup-crm`: gates +
  juez LLM), **muestreo A2 con evidencia** y **expediente de promoción** con
  botón humano (plan de autonomía D-40). Conectar un tenant real = alta de
  credenciales de canal (BotFather / Meta Business).

El mapa completo de fases y principios está en
**[`businessos/ROADMAP.md`](businessos/ROADMAP.md)**; el detalle de infra en
[`businessos/FASE0.md`](businessos/FASE0.md) y
[`businessos/FASE0-hetzner.md`](businessos/FASE0-hetzner.md); el estado por
iniciativa en `.claude/memory/` (índice en `MEMORY.md`).

---

## Empezar (Fase 0)

Todo vive en `businessos/`. El arranque está automatizado en dos scripts; el
resto son wizards interactivos de Hermes.

**1. Crea los 3 bots de Telegram** con [@BotFather](https://t.me/BotFather)
(`/newbot` tres veces) y averigua tu `chat_id` con
[@userinfobot](https://t.me/userinfobot) para el allowlist.

**2. Provisiona el servidor** (como root, una vez):

```bash
ssh root@LA_IP_DEL_SERVIDOR
bash prep-servidor.sh    # usuario hermes, firewall, fail2ban, swap, Docker
```

> El lockdown de SSH (cerrar root + password) se hace a mano DESPUÉS de
> confirmar que entras como `hermes` con tu llave — para no auto-bloquearte.
> Ver paso 2 de `FASE0.md`.

**3. Copia los archivos y configura el `.env`** (como `hermes`, desde
`~/businessos`):

```bash
cp .env.example .env
nano .env                # OpenRouter, 3 tokens de Telegram, Supabase, dashboard
```

> El `.env` y los volúmenes `.hermes/` con credenciales **nunca** se suben a git
> (ya están en `.gitignore`). El `service_role` de Supabase bypassa RLS: es
> llave de servidor, solo vive en este `.env`.

**4. Levanta las verticales:**

```bash
bash init-verticales.sh  # wizard por vertical + copia SOUL/AGENTS/MEMORY
docker compose up -d
docker compose ps        # 3 hermes + dashboard en "running"
```

**5. Verifica** (checklist completo en `FASE0.md` §10): los 3 bots responden con
su personalidad, el dashboard abre por túnel SSH
(`ssh -L 9119:localhost:9119 hermes@IP`), y los contenedores vuelven solos tras
`sudo reboot`.

---

## Estructura del repo

```
businessos/
├── ROADMAP.md            # Mapa de todas las fases y principios (fuente de verdad)
├── FASE0.md              # Guía paso a paso de la infraestructura
├── docker-compose.yml    # TODOS los servicios en hermes-net (verticales + A2A + CRM + edge)
├── personal/ negocio/ clientes/   # SOUL.md · AGENTS.md · MEMORY.md por vertical
├── grafo/  grafo-a2a/    # Cerebro regulatorio (FastAPI + Postgres) y su puente A2A
├── ejecutor-a2a/ supervisor-a2a/ coordinador-a2a/   # Trío de desarrollo + enjambre
├── ventas-a2a/           # Departamento de adquisición (card A2A pública)
├── chat-web2/            # Chat de venta de la landing web2
├── crm-canales/ sup-crm/ # CRM marca blanca: canales TG/WA + supervisor (plan D-40)
├── crm/                  # Blueprint del CRM (propuestas + plan de autonomía)
├── frontends/            # cliente-web2 (Vercel) · control-interno · design-system
├── edge/                 # Caddy público :443 (chat, /crm/*, card A2A)
├── supabase-*.sql        # Migraciones aplicadas por fase (init → crm3)
├── *.py  *.sh            # Host-jobs (ingesta, snapshots, alertas, expedientes)
└── departamentos/        # Diseño de equipo, Slack y estrategia
```

El resto del repositorio (carpeta `.claude/`, `src/`, configs de Next.js) es el
**toolkit SaaS Factory** con el que se construye y opera Hermes OS · A2A: skills de
Claude Code, design systems y plantillas. Es herramienta interna, no el producto.

---

## Principios que cruzan todo el proyecto

1. **Aislar, no fundir.** Cada componente nuevo es un servicio en `hermes-net`.
2. **Acotar antes de escalar.** Un país-dimensión antes de diez.
3. **Citar fuentes, no inventar.** En lo regulatorio/fiscal: cada afirmación
   trae fuente y vigencia. El sistema señala, el profesional decide.
4. **Eficiencia por routing, no por recorte.** Lo barato a modelos baratos, lo
   importante a modelos capaces.
5. **Arreglar lo compartido, no el caso aislado.** Por defecto, el arreglo va en
   el componente común (Hermes, grafo, skill).
6. **Verificar antes de confiar.** Nada que mueva dinero, datos o reglas se usa
   sin verificación y aprobación humana en lo irreversible.

---

**Hermes OS · A2A** — Aislar, no fundir. Acotar antes de escalar. Citar, no inventar.
