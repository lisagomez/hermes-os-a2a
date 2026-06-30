# BusinessOS

> Una mente con tres bocas. Un agente (Hermes) que opera tu vida **personal**,
> tu **negocio** y tus **clientes** desde tres contenedores aislados, hablando
> por Telegram y voz, con un grafo de conocimiento como cerebro
> regulatorio/fiscal/contable multi-país y un dashboard "Mission Control" encima.

BusinessOS es un sistema de agentes operativos autoalojados. No es una app que
abres: es una infraestructura que vive en un servidor, te responde por Telegram,
y crece por fases — de un cimiento mínimo a un sistema que razona sobre
regulación, cobra, contrata y (a futuro) transacciona valor entre agentes.

---

## Arquitectura en una frase

Una mente (**Hermes**) con tres bocas (**verticales**: personal, negocio,
clientes), cada una en su propio contenedor Docker, sobre un Droplet de
DigitalOcean, hablando por Telegram y voz, con un grafo de conocimiento como
cerebro regulatorio multi-país y un dashboard encima.

```
                    ┌─────────────────────────────┐
                    │   Mission Control (A2ABot)  │   ← dashboard, túnel SSH
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
        └──────────────────────────────────────────────────────┘
                                   │
              Supabase (datos)  ·  Grafo (cerebro regulatorio, Fase 2+)
```

Cada vertical es un servicio independiente con su propia persona (`SOUL.md`),
sus reglas (`AGENTS.md`) y su memoria estable (`MEMORY.md`). Se aíslan, no se
funden: ese es el primer principio del proyecto.

---

## Stack confirmado

| Capa | Tecnología |
|------|------------|
| Servidor | Droplet DigitalOcean (4 GB / 2 vCPU; sube a 8 GB con el grafo) |
| Orquestación | Docker + docker-compose (un contenedor por vertical) |
| Agente | Hermes Agent (Nous Research) — memory, skills, soul, crons, loop |
| Canales | Telegram (3 bots) + voz (TTS salida, transcripción entrada) |
| Modelos | OpenRouter (routing por tarea) o Nous Portal (OAuth) |
| Conocimiento personal | Obsidian (bóveda montada como volumen) |
| Cerebro regulatorio | Grafo multi-país (Fase 2+) |
| Datos / dashboard | Supabase + A2ABot (Mission Control) |
| Pago tradicional | Polar (Merchant of Record) — Fase 3 |
| Pago agéntico (futuro) | Circle / USDC (Agent Wallets) — Fase 5 |
| Conexión de herramientas | MCP · CLIs agente-nativos (Printing Press) |
| Conexión entre agentes (futuro) | Protocolo A2A — Fase 5 |

> Tag de Hermes pineado: **`v2026.6.19`** (verificado en Docker Hub a 2026-06-26).
> No usar `:latest` / `:main` — apuntan a builds inestables.

---

## Estado actual

**FASE 0 — Infraestructura: ✅ las 3 verticales vivas y respondiendo** (personal/Kiris,
negocio/@a2aTeamBot, clientes/@a2aClientbot), round-trip verificado. Corren como servicios
Docker persistentes en **WSL2 local**; el Droplet y el sync nocturno a GitHub están
**diferidos por costo** hasta que haya un disparador real de "always-on". Detalle:
**[`businessos/FASE0.md`](businessos/FASE0.md)**.

**FASE 1 — Eficiencia de tokens: ✅ esencialmente cerrada** (2026-06-30). Routing por modelo
(cerebro `gemini-2.5-flash-lite` con caché de prefijo 97%, ~3s/turno; negocio en `haiku-4.5`
por su rol agéntico), cadena de fallback por fiabilidad, ingesta de gasto a Supabase
(`token_usage`) y reporte de presupuesto on-demand ($30/mes, alerta al 80%). Detalle en
`.claude/memory/project/fase1-eficiencia.md`.

El mapa de todas las fases (de la infra al grafo, cobro, contratos y economía
agéntica) está en **[`businessos/ROADMAP.md`](businessos/ROADMAP.md)**.

---

## Empezar (Fase 0)

Todo vive en `businessos/`. El arranque está automatizado en dos scripts; el
resto son wizards interactivos de Hermes.

**1. Crea los 3 bots de Telegram** con [@BotFather](https://t.me/BotFather)
(`/newbot` tres veces) y averigua tu `chat_id` con
[@userinfobot](https://t.me/userinfobot) para el allowlist.

**2. Provisiona el servidor** (como root, una vez):

```bash
ssh root@LA_IP_DEL_DROPLET
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
├── ROADMAP.md            # Mapa de todas las fases (0 → 5) y principios
├── FASE0.md              # Guía paso a paso de la infraestructura
├── docker-compose.yml    # 3 verticales Hermes + dashboard en hermes-net
├── prep-servidor.sh      # Fase 0 pasos 2-3: endurece el Droplet + Docker
├── init-verticales.sh    # Fase 0 pasos 6-7: wizards + copia de personas
├── supabase-init.sql     # Esquema inicial de Supabase
├── .env.example          # Plantilla de variables (sin secretos)
├── personal/             # SOUL.md · AGENTS.md · MEMORY.md
├── negocio/              # SOUL.md · AGENTS.md · MEMORY.md
└── clientes/             # SOUL.md · AGENTS.md · MEMORY.md
```

El resto del repositorio (carpeta `.claude/`, `src/`, configs de Next.js) es el
**toolkit SaaS Factory** con el que se construye y opera BusinessOS: skills de
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

**BusinessOS** — Aislar, no fundir. Acotar antes de escalar. Citar, no inventar.
