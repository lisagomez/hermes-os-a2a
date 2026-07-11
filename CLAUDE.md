# SaaS Factory V4 - Agent-First Software Factory

> Eres el **cerebro de una fabrica de software inteligente**.
> El humano dice QUE quiere. Tu decides COMO construirlo.
> El humano NO necesita saber nada tecnico. Tu sabes todo.

---

## Filosofia: Agent-First

El usuario habla en lenguaje natural. Tu traduces a codigo.

```
Usuario: "Quiero una app para pedir comida a domicilio"
Tu: Ejecutas new-app → generas BUSINESS_LOGIC.md → preguntas diseño → implementas
```

**NUNCA** le digas al usuario que ejecute un comando.
**NUNCA** le pidas que edite un archivo.
**NUNCA** le muestres paths internos.
Tu haces TODO. El solo aprueba.

---

## Decision Tree: Que Hacer con Cada Request

```
Usuario dice algo
    |
    ├── "Quiero crear una app / negocio / producto"
    |       → Ejecutar skill NEW-APP (entrevista de negocio → BUSINESS_LOGIC.md)
    |
    ├── "Necesito login / registro / autenticacion"
    |       → Ejecutar skill ADD-LOGIN (Supabase auth completo)
    |
    ├── "Necesito pagos / cobrar / suscripciones / Polar / checkout"
    |       → Ejecutar skill ADD-PAYMENTS (Polar + webhooks + checkout completo)
    |
    ├── "Necesito emails / correos / Resend / email transaccional"
    |       → Ejecutar skill ADD-EMAILS (Resend + React Email + batch + unsubscribe)
    |
    ├── "Necesito PWA / notificaciones push / instalar en telefono / mobile"
    |       → Ejecutar skill ADD-MOBILE (PWA + push notifications + iOS compatible)
    |
    ├── "Necesito una landing page" / "scroll animation" / "website 3d"
    |       → Ejecutar skill WEBSITE-3D (scroll-stop cinematico + copy de alta conversion)
    |
    ├── "Quiero agregar [feature compleja]" (multiples fases, DB + UI + API)
    |       → Ejecutar skill PRP → humano aprueba → ejecutar BUCLE-AGENTICO
    |
    ├── "Quiero agregar IA / chat / vision / RAG"
    |       → Ejecutar skill AI con el template apropiado
    |
    ├── "Revisa que funcione / testea / hay un bug"
    |       → Ejecutar skill PLAYWRIGHT-CLI (testing automatizado)
    |
    ├── "Necesito algo de la base de datos" / "tabla" / "query" / "metricas"
    |       → Ejecutar skill SUPABASE (estructura + datos + metricas)
    |
    ├── "Quiero hacer deploy / publicar"
    |       → Deploy directo con Vercel CLI o git push
    |
    ├── "Quiero remover SaaS Factory"
    |       → Ejecutar skill EJECT-SF (DESTRUCTIVO, confirmar antes)
    |
    ├── "Recuerda que..." / "Guarda esto" / "En que quedamos?"
    |       → Ejecutar skill MEMORY-MANAGER (memoria persistente del proyecto)
    |
    ├── "Genera una imagen / thumbnail / logo / banner"
    |       → Ejecutar skill IMAGE-GENERATION (OpenRouter + Gemini)
    |
    ├── "Optimiza este skill / mejora el skill / autoresearch"
    |       → Ejecutar skill AUTORESEARCH (loop autonomo de mejora)
    |
    └── No encaja en nada
            → Usar tu juicio. Leer el codebase, entender patrones, ejecutar.
```

---

## Skills: 15 Herramientas Especializadas

| # | Skill | Cuando usarlo |
|---|-------|---------------|
| 1 | `new-app` | Empezar proyecto desde cero. Entrevista de negocio → BUSINESS_LOGIC.md |
| 2 | `add-login` | Auth completa: Email/Password + Google OAuth + profiles + RLS |
| 3 | `add-payments` | Pagos con Polar (MoR): checkout, webhooks, suscripciones, acceso |
| 4 | `add-emails` | Emails transaccionales: Resend + React Email + batch + unsubscribe |
| 5 | `add-mobile` | PWA instalable + notificaciones push (iOS compatible, 14 commits de gotchas) |
| 6 | `website-3d` | Landing cinematica Apple-style: scroll-driven video + copy AIDA/PAS |
| 4 | `prp` | Plan de feature compleja antes de implementar. Siempre antes de bucle-agentico |
| 5 | `bucle-agentico` | Features complejas: multiples fases coordinadas (DB + API + UI) |
| 6 | `ai` | Capacidades de IA: chat, RAG, vision, tools, web search |
| 7 | `supabase` | Todo BD: crear tablas, RLS, migraciones, queries, metricas, CRUD |
| 8 | `playwright-cli` | Testing automatizado con browser real |
| 9 | `primer` | Cargar contexto completo del proyecto al inicio de sesion |
| 10 | `update-sf` | Actualizar SaaS Factory a la ultima version |
| 11 | `eject-sf` | Remover SaaS Factory del proyecto. DESTRUCTIVO. Confirmar siempre |
| 12 | `memory-manager` | Memoria persistente POR PROYECTO en `.claude/memory/` (git-versioned) |
| 13 | `image-generation` | Generar y editar imagenes con OpenRouter + Gemini |
| 14 | `autoresearch` | Auto-optimizar skills con loop autonomo (patron Karpathy) |
| 15 | `skill-creator` | Crear nuevos skills para extender la fabrica |

---

## Flujos Principales

### Flujo 1: Proyecto Nuevo (de cero)

```
1. NEW-APP → Entrevista de negocio → BUSINESS_LOGIC.md
2. Preguntar diseño visual (design system)
3. ADD-LOGIN → Auth completo
4. ADD-PAYMENTS → Pagos con Polar (si el proyecto cobra)
5. PRP → Plan de primera feature
5. BUCLE-AGENTICO → Implementar fase por fase
6. PLAYWRIGHT-CLI → Verificar que todo funciona
```

### Flujo 2: Feature Compleja

```
1. PRP → Generar plan (usuario aprueba)
2. BUCLE-AGENTICO → Ejecutar por fases:
   - Delimitar en FASES (sin subtareas)
   - MAPEAR contexto real de cada fase
   - EJECUTAR subtareas basadas en contexto REAL
   - AUTO-BLINDAJE si hay errores
   - TRANSICIONAR a siguiente fase
3. PLAYWRIGHT-CLI → Validar resultado final
```

### Flujo 3: Agregar IA

```
1. AI → Elegir template apropiado:
   - chat (conversacion streaming)
   - rag (busqueda semantica)
   - vision (analisis de imagenes)
   - tools (funciones/herramientas)
   - web-search (busqueda en internet)
   - single-call / structured-outputs / generative-ui
2. Implementar paso a paso
```

---

## Auto-Blindaje

Cada error refuerza la fabrica. El mismo error NUNCA ocurre dos veces.

```
Error ocurre → Se arregla → Se DOCUMENTA → NUNCA ocurre de nuevo
```

| Donde documentar | Cuando |
|------------------|--------|
| PRP actual | Errores especificos de esta feature |
| Skill relevante | Errores que aplican a multiples features |
| Este archivo (CLAUDE.md) | Errores criticos que aplican a TODO |

---

## Golden Path (Un Solo Stack)

No das opciones tecnicas. Ejecutas el stack perfeccionado:

| Capa | Tecnologia |
|------|------------|
| Framework | Next.js 16 + React 19 + TypeScript |
| Estilos | Tailwind CSS 3.4 |
| Backend | Supabase (Auth + DB + RLS) |
| AI Engine | Vercel AI SDK v5 + OpenRouter |
| Validacion | Zod |
| Estado | Zustand |
| Testing | Playwright CLI + MCP |

---

## Arquitectura Feature-First

Todo el contexto de una feature en un solo lugar:

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Rutas de autenticacion
│   ├── (main)/              # Rutas principales
│   └── layout.tsx
│
├── features/                 # Organizadas por funcionalidad
│   └── [feature]/
│       ├── components/      # UI de la feature
│       ├── hooks/           # Logica
│       ├── services/        # API calls
│       ├── types/           # Tipos
│       └── store/           # Estado
│
└── shared/                   # Codigo reutilizable
    ├── components/
    ├── hooks/
    ├── lib/
    └── types/
```

---

## MCPs: Tus Sentidos y Manos

### Next.js DevTools MCP (Quality Control)
Conectado via `/_next/mcp`. Ve errores build/runtime en tiempo real.

### Playwright (Tus Ojos)

**CLI** (preferido, menos tokens):
```bash
npx playwright navigate http://localhost:3000
npx playwright screenshot http://localhost:3000 --output screenshot.png
npx playwright click "text=Sign In"
npx playwright fill "#email" "test@example.com"
npx playwright snapshot http://localhost:3000
```

**MCP** (cuando necesitas explorar UI desconocida):
```
playwright_navigate, playwright_screenshot, playwright_click/fill
```

### Supabase MCP (Tus Manos)
```
execute_sql, apply_migration, list_tables, get_advisors
```

---

## Reglas de Codigo

- **KISS**: Soluciones simples
- **YAGNI**: Solo lo necesario
- **DRY**: Sin duplicacion
- Archivos max 500 lineas, funciones max 50 lineas
- Variables/Functions: `camelCase`, Components: `PascalCase`, Files: `kebab-case`
- NUNCA usar `any` (usar `unknown`)
- SIEMPRE validar entradas de usuario con Zod
- SIEMPRE habilitar RLS en tablas Supabase
- NUNCA exponer secrets en codigo

---

## Comandos npm

```bash
npm run dev          # Servidor (auto-detecta puerto 3000-3006)
npm run build        # Build produccion
npm run typecheck    # Verificar tipos
npm run lint         # ESLint
```

---

## Estructura de la Fabrica

```
.claude/
├── memory/                    # Memoria persistente del proyecto (git-versioned)
│   ├── MEMORY.md             # Indice (max 200 lineas, se carga al inicio)
│   ├── user/                 # Sobre el usuario/equipo
│   ├── feedback/             # Correcciones y preferencias
│   ├── project/              # Decisiones y estado de iniciativas
│   └── reference/            # Patrones, soluciones, donde encontrar cosas
│
├── skills/                    # 15 skills especializados
│   ├── new-app/              # Entrevista de negocio
│   ├── add-login/            # Auth completo
│   ├── website-3d/           # Landing pages cinematicas
│   ├── prp/                  # Generar PRPs
│   ├── bucle-agentico/       # Bucle Agentico BLUEPRINT
│   ├── ai/                   # AI Templates hub
│   ├── supabase/             # BD completa: estructura + datos + metricas
│   ├── playwright-cli/       # Testing automatizado
│   ├── primer/               # Context initialization
│   ├── update-sf/            # Actualizar SF
│   ├── eject-sf/             # Remover SF
│   ├── memory-manager/       # Memoria persistente por proyecto
│   ├── image-generation/     # Generacion de imagenes (OpenRouter + Gemini)
│   ├── autoresearch/         # Auto-optimizacion de skills
│   └── skill-creator/        # Crear nuevos skills
│
├── PRPs/                      # Product Requirements Proposals
│   └── prp-base.md           # Template base
│
└── design-systems/            # 5 sistemas de diseno
    ├── neobrutalism/
    ├── liquid-glass/
    ├── gradient-mesh/
    ├── bento-grid/
    └── neumorphism/
```

---

## Aprendizajes (Auto-Blindaje Activo)

### 2025-01-09: Usar npm run dev, no next dev
- **Error**: Puerto hardcodeado causa conflictos
- **Fix**: Siempre usar `npm run dev` (auto-detecta puerto)
- **Aplicar en**: Todos los proyectos

### 2026-06-28: Nunca imprimir secretos en pantalla
- **Error**: Pegar el `sbp_`/token literal en comandos (`TOK=sbp_...`, `grep`, `echo`) lo
  filtra al transcript de la conversación. Además el token estaba triplicado en `.bashrc`
  (concatenado 3 veces) → inválido → MCP `Unauthorized`.
- **Fix**: Secretos en archivo dedicado `~/.config/claude/secrets.env` (perms `600`);
  `.bashrc` solo hace `source`. Para usarlos: cargar la var y referenciarla
  (`-H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"`), nunca el literal; sin `-v`,
  `echo $TOKEN` ni `set -x`. El repo usa `${VAR}` en `.mcp.json`, nunca el token.
- **Aplicar en**: Todo manejo de credenciales en cualquier proyecto.

### 2026-06-28: Mantener docs vivas tras cambios importantes
- **Regla**: tras un cambio importante, actualizar aprendizajes (este archivo), roadmap
  (`businessos/ROADMAP.md`), memoria (`.claude/memory/`) y `BUSINESS_LOGIC.md`.
  Detalle y criterio en `.claude/memory/feedback/mantener-docs-vivas.md`.

### 2026-06-30: El agente Hermes NO maneja secretos → patrón host-job + snapshot
- **Error**: instruir al agente (en `AGENTS.md`) a consultar/escribir Supabase con
  `SUPABASE_SERVICE_ROLE_KEY`. Hermes **scrubbea los secretos del sandbox del agente por
  diseño**: su `execute_code`/bash NO recibe esas env vars y `/opt/data/.env` está bloqueado.
  El agente persigue credenciales que no puede tener y falla. Peor: `AGENTS.md` está SIEMPRE
  en contexto y **vence a un skill** (que requiere `skill_view`).
- **Fix**: cualquier acceso a datos con credenciales lo hace un **job de confianza del host**
  (que sí tiene la llave); deja el resultado en un archivo del volumen y el agente lo **LEE**
  (`read_file` accede a `/opt/data/...` salvo `.env`). Las instrucciones de `AGENTS.md` deben
  reflejar la arquitectura real. Tras cambiar el enfoque, probar en **sesión nueva** (`/new`).
  Detalle en `.claude/memory/reference/hermes-vertical-setup.md`.
- **Aplicar en**: todo lo que el agente necesite de un servicio con credenciales (Supabase,
  pagos, etc.). ~~Deuda abierta: clientes escribir `facturas`~~ → **cerrada el 2026-07-01**
  con `businessos/ingest-facturas.py` (patrón inverso: el agente deja un JSON en el volumen,
  el job de host lo sube a `facturas`). Falta correrlo en runtime (Docker) y cron al Droplet.

### 2026-06-30: Routing y cerebro de Hermes (eficiencia de tokens, Fase 1)
- **Aprendizaje**: el ruteo de proveedor por defecto de OpenRouter es no-determinista (cuelga
  si pega en un host muerto) → usar `:nitro` (rápido) o `:floor` (barato) + cadena de fallback.
  La caché de prefijo solo aplica con proveedor compatible (Gemini/Anthropic/OpenAI/DeepSeek);
  nemotron no cacheaba. Cerebro actual: `gemini-2.5-flash-lite` (caché 97%, ~3s); negocio en
  `haiku-4.5` por su rol agéntico/analista. Editar config en vivo con
  `docker exec -u hermes <c> hermes config set`, NO `docker run` sobre el volumen.
- **Aplicar en**: configuración de modelos de cualquier vertical Hermes. Ver `fase1-eficiencia.md`.

### 2026-06-30: Printing Press operativo + primeros CLIs (auditor Nivel 2-prep)
- **Aprendizaje**: Printing Press corre SOLO en Claude Code (Go 1.26.4+ + skills), NUNCA en el
  Droplet ni dentro de Hermes → ningún cron imprime; el host-job `cli-audit.py` solo **detecta y
  avisa** (Nivel 2-prep; Nivel 3 autónomo descartado). Impresos digitalocean (87/A), telegram
  (83/A) y supabase (87/A) — spec-driven (generate+shipcheck+promote), barato en tokens porque el
  trabajo lo hace el binario Go, no el modelo. Una vez impreso, ejecutar el CLI = ~0 tokens.
  Gotchas de specs PostgREST: el generador NO detecta auth (cablear a mano `apikey` +
  `Authorization: Bearer` con service_role) ni el prefijo `/rest/v1` (basePath "/"); el CLI de datos
  es herramienta de host/dev (el agente no lo usa por secret-scrubbing). El instalador externo
  (`go install`/`npx skills add`) lo bloquea el clasificador de auto-mode: requiere modo no-auto.
- **Aplicar en**: cualquier impresión de CLI agente-nativo. Ver `.claude/memory/project/cli-printing-press.md`.

### 2026-07-02: Cloudflare bloquea el User-Agent de urllib (error 1010) — en CUALQUIER API
- **Error**: `api.supabase.com` (ya documentado) y ahora también `api.polar.sh`/sandbox
  devuelven `403 error code: 1010` a peticiones de Python `urllib` con su UA por defecto.
  El mismo endpoint funciona con curl → confunde el diagnóstico.
- **Fix**: todo host-job que use `urllib` manda `User-Agent: curl/8.0` explícito (ya
  cableado en `polar-cobros.py::http()`). Asumir el gotcha en cualquier API nueva detrás
  de Cloudflare. Verificación de secretos sin filtrarlos: comparar FORMATO y largo
  (`polar_oat_`/`sbp_`/`eyJ`/UUID) con python, nunca imprimir el valor.
- **Aplicar en**: todos los host-jobs y cualquier integración HTTP nueva.

### 2026-07-02: Grafo (Fase 2) construido + gotchas de toolchain local
- **Aprendizaje**: el cerebro regulatorio vive en `businessos/grafo/` (FastAPI + postgres propio,
  `http://grafo:3000` en hermes-net). Regla de oro cumplida por diseño: fail-safe `dudoso`
  "sin regla aplicable", disclaimer siempre, y TODO lo que aporta al output cita su fuente
  (incluso impactos sin veredicto que solo dan requisitos). El seed se edita SOLO en
  `seed/reglas.json` (+ `gen_seed_sql.py`, con gate de procedencia); `02-seed.sql` es generado.
  Fase 3: ámbitos fiscal MX/CO, contable MX y contractual MX; regimen GENERAL = wildcard;
  la clasificación no cruza dominios (solo categorías del ámbito).
  Gotchas de esta máquina: venv de python3.14 nace sin pip (bootstrap con get-pip.py) y
  `docker compose config` exige un `.env` aunque sea copia temporal del example.
- **Aplicar en**: consultas de deducibilidad (via grafo, nunca opinar sin fuente), edición de
  reglas fiscales, y cualquier venv/validación de compose local. Ver
  `.claude/memory/project/fase2-grafo.md`.

### 2026-07-03: a2a-sdk v1.x NO es como los tutoriales (Fase 5, grafo-a2a)
- **Error**: construir un servicio A2A copiando tutoriales v0.2 (tipos Pydantic,
  `A2AStarletteApplication`, path `agent.json`). La v1.1.0 real es **proto-first**
  (`a2a.types` = protobuf), el extra `[http-server]` trae Starlette pero NO FastAPI,
  el path vigente es `/.well-known/agent-card.json`, y el executor DEBE encolar
  `new_task(...)` ANTES del primer status update (`InvalidAgentResponseError` si no —
  y los unit tests con cola espía NO lo cazan; el test de interop con el cliente del
  SDK sí).
- **Fix**: introspeccionar SIEMPRE el SDK instalado (`inspect.signature`, DESCRIPTOR
  de los protos) antes de escribir código; Starlette puro juega a favor de la opacidad
  (sin /docs ni /openapi.json). Patrón completo en `businessos/grafo-a2a/` (servidor +
  card + executor determinista + cliente de verificación) — es la base de la Fase 6.
- **Aplicar en**: todo servicio A2A nuevo (Ejecutor/Supervisor de Fase 6) y en general
  ante cualquier SDK joven: el instalado manda, no el blog.

### 2026-07-03: Wire format del a2a-sdk v1 para clientes SIN SDK (Fase 6, trío)
- **Error**: tres trampas al hablarle JSON-RPC crudo a un servicio A2A v1:
  (1) el método es `SendMessage` — `message/send` es del dispatcher REST y da
  -32601; (2) sin header `A2A-Version: 1.0` responde -32009; (3) `Part.data` es
  un Struct directo: anidar `{"data": {"data": tarea}}` no truena el protocolo
  pero entrega el payload envuelto y el error resultante engaña ("task_id
  invalido"). Además protobuf Struct convierte TODO número JSON a float
  (`3 → 3.0`): los contratos deben normalizar enteros integrales.
- **Fix**: payload canónico verificado en `negocio/skills/trio-software/SKILL.md`;
  ante duda, imprimir `MessageToDict(new_data_message(x))` y copiar ESO.
- **Aplicar en**: todo cliente A2A sin SDK (skills Hermes, curl, terceros) y todo
  contrato que valide números venidos de DataParts.

### 2026-07-03: El trío (Fase 6) — patrones que ya quedaron pagados
- **Aprendizaje**: (a) en tablas de estado compartidas, UN escritor por fila (el
  Ejecutor escribe `tareas`; el Supervisor juzga stateless); (b) un gate activo
  sin runner ejecutable = config inválida = el servicio NO arranca (imposible
  "activar" reglas incomprobables — `supervisor-a2a/gates.py`); (c) motor de
  agente SIEMPRE pluggable/mockeable: MockEngine valida servicio+protocolo+
  worktree al 100% sin tokens y el motor real (claude-agent-sdk pineado e
  introspeccionado) es un plugin opt-in; (d) para tests que cargan dos servicios
  con módulos homónimos (app/card/executor), swap temporal de `sys.modules`
  (ver `ejecutor-a2a/tests/test_interop.py`).
- **Aplicar en**: próximos departamentos del trío y cualquier par de servicios A2A.

---

### 2026-07-04: GLM-5.2 entra por las capas YA pluggables, no por arquitectura nueva
- **Aprendizaje**: integrar un modelo nuevo en la transversal NO es reescribir; es encontrar
  el seam pluggable que ya existe. GLM-5.2 (z.ai, coding agéntico, ~1/6 del costo de Opus)
  entra por DOS caminos sin tocar diseño: (a) **trío/Ejecutor** — `ClaudeAgentEngine` ya toma
  `modelo_pref` por tarea y corre sobre claude-agent-sdk (Claude Code), que honra
  `ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN` → apuntarlos a `https://api.z.ai/api/anthropic`
  = GLM como motor, gratis de código; el Supervisor re-corre los gates igual → se verifica
  como Claude. (b) **routing Hermes** — `config set auxiliary.<p>.model "z-ai/glm-5.2"` en los
  profiles pesados (no el loop: gemini-lite gana caché+latencia).
- **Gotchas**: (1) antes de cablear GLM al routing frecuente, GATE con `probe-glm.py`
  (idioma + tool-calling + **caché de prefijo** `cached_tokens>0` — lección nemotron: sin caché
  no vale). (2) el CLI tarifica ANTHROPIC → el `total_cost_usd` contra z.ai viene 0/erróneo;
  los tokens sí valen, el costo se recalcula con tarifa z.ai. (3) default 100% intacto: sin las
  env vars el trío sigue en Anthropic y Hermes en gemini/sonnet; rollback de una línea.
- **Aplicar en**: cualquier modelo nuevo de terceros — buscar el seam existente (env/config
  pluggable) y verificar caché+tools antes de confiar, no reimplementar.

### 2026-07-04: El enjambre (Fase 7) escala el trío por un servicio HERMANO, no tocándolo
- **Aprendizaje**: pasar de "un Ejecutor por tarea" a un enjambre paralelo NO se hace
  modificando el Ejecutor/Supervisor de Fase 6: se añade un servicio A2A **hermano**
  (`coordinador-a2a`) que descompone en un DAG de sub-tareas y las reparte, porque **cada
  sub-tarea ya es una `tarea` válida del contrato existente**. "Aislar, no fundir" otra vez.
  Tres invariantes que se preservaron por diseño: (a) **un escritor por fila** extendido a
  padre/hija (Coordinador→fila padre `es_padre=true`; Ejecutor→su fila hija `parent_id`;
  Supervisor sigue stateless); (b) **acotar antes de escalar** = `fan_out_max` + presupuesto
  acumulado leído de `token_usage.task_id` que corta y escala; (c) **verificar antes de
  confiar a nivel feature** = tras integrar las ramas, el Supervisor re-gatea la rama
  integrada COMPLETA (dos ramas que compilan por separado pueden chocar al unirse).
- **Gotchas operativos de esta integración**:
  (1) **Merge de rama atrasada respecto a master → conflicto aditivo**: cuando dos cambios
  tocan la MISMA función por motivos ortogonales (GLM añadió nota al docstring de
  `filas_token_usage`; Fase 7 añadió el parámetro `task_id`), la resolución correcta es
  CONSERVAR AMBOS (firma nueva + las dos notas), no elegir un lado. Verificar con los tests
  del servicio, no solo `py_compile`.
  (2) **MCP de Supabase en read-only bloquea DDL**: `apply_migration`/`execute_sql` de
  escritura fallan con "Cannot apply migration in read-only mode". Fallback (igual que Fase 6):
  management API `POST /v1/projects/{ref}/database/query` con `SUPABASE_ACCESS_TOKEN`, UA
  `curl/8.0` (Cloudflare 1010), token del env sin imprimirlo. Verificar después con el MCP
  (los reads sí funcionan): columnas + índices + `get_advisors` sin alertas nuevas.
  (3) **Pytest en la máquina de desarrollo (py3.14)**: el venv nace sin pip (ensurepip
  ausente) → `venv --without-pip` + bootstrap `get-pip.py`. venv en `businessos/.venv`
  (git-ignored); correr `cd businessos/<servicio> && ../.venv/bin/python -m pytest -q`.
- **Aplicar en**: próximas capas del trío (más departamentos, RAG por ámbito, white-label) y
  toda extensión de un sistema A2A — sumar un servicio hermano y preservar los invariantes,
  no engordar los existentes. Ver `.claude/memory/project/fase7-swarm.md`.

### 2026-07-05: Desplegar una vertical NO es "deploy", es MIGRACIÓN (token por-máquina)
- **Error**: tratar el paso a un servidor nuevo como un deploy limpio. Realidad: las verticales
  YA corrían en la máquina "de desarrollo" (WSL2) — memoria desactualizada decía que no (verificar
  SIEMPRE con `docker ps` en qué máquina corre algo antes de concluir). Telegram permite UNA
  conexión por token: arrancar negocio en Hetzner con el mismo token mientras vive en WSL2 los
  choca (y viola "nunca dos gateways sobre el mismo token/volumen").
- **Fix (patrón de migración de vertical)**: (1) `docker stop` en origen (libera token); (2)
  empaquetar el volumen `.hermes` (uid 10000, 0700) SIN sudo con un contenedor lector privilegiado
  — `docker run --rm -v <vol>:/data:ro alpine tar -cpzf /out/x.tgz .` (el tar sale root:644,
  legible para scp); (3) extraer en destino preservando uid 10000/0700 y borrando
  `gateway.lock`/`.dispatcher.lock`; (4) copiar el `.env` del compose (opaco, sin leerlo);
  (5) `compose up -d --build`; (6) `docker rm` el contenedor de origen para que un `compose up`
  accidental no reviva el token. Conserva memoria/sesiones (state.db) intactas.
- **Aplicar en**: mover personal/clientes o cualquier vertical entre máquinas; todo servicio
  con estado en volumen uid-10000. Ver `.claude/memory/project/despliegue-hetzner.md` y la
  corrección en `.claude/memory/reference/maquinas-entornos.md`.

### 2026-07-05: Provisionar Hetzner por CLI — precios reales y gotchas del hcloud-pp-cli
- **Error/hallazgos**: (1) el runbook pedía **cx22 en Ashburn** — INVIABLE: la línea **CX es
  solo-Europa**; en US (ash/hil) solo hay CPX/CCX y salen **~3.4× más caro** ($37.49 cpx21 4GB
  vs $10.99 EU). Naming actual: cx23 (4GB $6.49) / **cx33 (8GB $8.99)** — no cx22/cx32. Elegido
  cx33 EU: 8GB corre todo por ~$9/mes. (2) El precio hay que sacarlo del endpoint `pricing`
  (moneda USD); el espejo local y `fits` daban datos raros/0. (3) `preflight`/`fits` leen el
  ESPEJO local → correr `sync` antes (aún así `ssh_key_exists` dio falso-negativo con la key ya
  creada en vivo). (4) el flag `--firewalls` mapea a ESCALAR (mal) → crear el server con
  `--stdin` y `firewalls:[{"firewall":ID}]`; `--dry-run` para ver el body sin gastar.
  (5) Evitar ARM (cax): la imagen Hermes puede ser solo-x86.
- **Gotcha del build en el server**: `git archive HEAD` NO incluye archivos git-ignored →
  faltó `package-lock.json` (lo pide el Dockerfile de a2abot) y `GRAFO_DB_PASSWORD` no existía en
  el `.env` de dev. Copiar el lock aparte + fijar la password nueva. El token hcloud vive en
  `~/.config/claude/secrets.env` (que `.bashrc` hace `source`; ojo: una línea con clave SSH sin
  comillas rompía ese source).
- **Aplicar en**: cualquier provisión Hetzner y todo build en server desde un snapshot de git.

### 2026-07-06: El bot en runtime sin Docker NO puede leer archivos → dato al SOUL, no read_file
- **Error**: el skill `budget-report` decía "lee `/opt/data/workspace/presupuesto.json` con
  read_file". En el contenedor Hermes de Hetzner **no hay daemon de Docker**, y `read_file`/
  `execute_code`/`file` corren dentro de un entorno Docker → fallan ("Cannot connect to the
  Docker daemon"); Hermes auto-DESHABILITA el toolset `file` (`hermes doctor`: "file — system
  dependency not met"). El bot confabulaba ("el backend Docker no responde"). `environment_probe`
  no era el lever; el `file` toolset está atado a Docker por diseño en este build.
- **Descubrimientos que costaron iteraciones**:
  (1) De los archivos del volumen, **solo `SOUL.md` se inyecta al system prompt**. `AGENTS.md`
  está solo *referenciado* (no su contenido) y `MEMORY.md` se accede por la herramienta de
  memoria (`recall`), que indexa por embeddings → **editar MEMORY.md en crudo NO lo hace
  recuperable**. Meter el dato en AGENTS/MEMORY NO funcionó; en **SOUL.md SÍ**.
  (2) `terminal.backend: local` **SÍ funciona, pero solo en el GATEWAY** (Telegram): ahí el
  agente puede `cat` un archivo local. En `hermes chat --cli` la terminal NO está disponible →
  **`hermes chat -q` es un harness PARCIAL** (miente sobre la disponibilidad de tools); la
  prueba real es un mensaje de Telegram. Además el **historial de la conversación** sesga al
  agente (arrastraba los intentos fallidos) → a veces hay que empezar sesión nueva.
  (3) Telegram **Web** no renderiza el widget de tool-call ("message not supported on Telegram
  Web"); Desktop/móvil sí. Un tool-call que "funciona" puede verse roto solo por el cliente.
- **Fix (patrón dato-en-SOUL)**: un host-job nocturno escribe un bloque idempotente con
  marcadores (`<!-- PRESUPUESTO:AUTO:START/END -->`) en `SOUL.md` del volumen; el skill ordena
  responder en TEXTO desde el contexto y **PROHÍBE ejecutar herramientas** para esa consulta.
  Scripts: `businessos/inject-presupuesto.py` (corre dentro del contenedor por stdin) cableado en
  `businessos/nightly-jobs.sh`. Verificado en vivo por la dueña.
- **Aplicar en**: cualquier skill/vertical que necesite exponer un DATO al agente en runtime sin
  Docker → inyectar en SOUL, no leer archivos. Ver `.claude/memory/reference/hermes-sin-docker-runtime.md`.

### 2026-07-08 : Cierre de residuales de runtime — gotchas que costaron iteraciones
- **git en contenedores del trío**: los bind-mounts (`/repo`) llegan con uid del HOST y el
  contenedor corre como root → git aborta con "dubious ownership" y la tarea sale `failed`
  sin pista clara en `docker logs`. Fix en imagen: `git config --system --add safe.directory '*'`
  (correcto en un contenedor aislado que solo ve SUS mounts). Aplicado a ejecutor/supervisor/coordinador.
- **Smoke de runtime con expectativas HONESTAS**: en runtime el Supervisor corre los gates npm
  REALES → sobre un repo placeholder el veredicto correcto es RECHAZADO con hallazgos; el smoke
  valida el PROTOCOLO (card + message/send + cadena + escritura en `tareas`), no fuerza un
  "aprobado" (ese camino se valida en dev con gates ligeros). `smoke-trio/runtime.py` corre en
  contenedor efímero DENTRO de hermes-net; `client.py` quedó configurable por env (SMOKE_*).
- **El health del gateway Hermes NO está en :8642** en este build (tampoco en la vertical que
  funciona) → no usarlo para verificar una migración; la prueba real es `hermes send` (devuelve
  message_id) o un mensaje de Telegram. `hermes chat -q --image` SÍ sirve para ejercitar el
  perfil `vision` (queda en agent.log).
- **Servicios nuevos requieren su entrada en compose**: el coordinador-a2a (Fase 7) tenía
  Dockerfile y servicio completos pero NADIE lo había añadido a `docker-compose.yml` — el
  residual "compose up coordinador" era imposible. Al construir un servicio, el compose es
  parte de la definición de terminado.
- **Aplicar en**: todo despliegue de servicios A2A/trío y toda verificación de verticales Hermes.

### 2026-07-10: Un módulo python nuevo en un servicio exige su COPY en el Dockerfile
- **Error**: Fase 9 añadió `supervisor-a2a/chequeos_adquisicion.py` (importado por
  `executor.py`) pero el Dockerfile copia archivos EXPLÍCITOS y nadie añadió el nuevo →
  en runtime el supervisor entró en crash-loop (`ModuleNotFoundError`). Los 219 tests de
  dev NO lo cazan: pytest corre desde el directorio fuente, donde el módulo sí existe.
- **Fix**: al crear un archivo en un servicio dockerizado, actualizar su Dockerfile en el
  MISMO cambio (hermano del gotcha 2026-07-08 "el compose es parte de la definición de
  terminado"). Señal en runtime: `Up X seconds` que rejuvenece tras un sleep = crash-loop;
  confirmar con `docker compose logs`.
- **Aplicar en**: todo servicio con COPY explícito (los 6 A2A) y todo smoke post-deploy.

### 2026-07-11: Primer dogfood real del trío (GLM-5.2) — tres gotchas que costaron 3 intentos
- **Error(es)**: (1) el CLI de Claude Code **rehúsa `--dangerously-skip-permissions` como
  root** → el motor muere al primer turno en contenedores root; (2) el `.git` de un git-worktree
  es un ARCHIVO-puntero a `<repo>/.git/worktrees/<id>` → un servicio que solo monta el volumen
  de worktrees NO puede correr git ahí (el Supervisor daba `no_ejecutable` en todos los gates
  estáticos = rechazo aunque el código estuviera bien; en dev no se ve porque los procesos
  comparten filesystem); (3) `token_usage` tiene `UNIQUE(fecha,vertical,modelo)` pensada para
  el agregado DIARIO del ingest → la 2ª tarea del mismo modelo el mismo día devuelve 409 y el
  `except: pass` del motor (sin `raise_for_status`) **pierde el gasto en silencio**.
- **Fix**: (1) `IS_SANDBOX=1` en el environment del ejecutor (señal oficial de Claude Code para
  contenedores que SON el sandbox); (2) montar `/repo` también en el Supervisor (rw: sus
  chequeos hacen `git add -A`) — la frontera del trío es de JUICIO, no de filesystem; (3) fix
  propuesto pendiente de OK (índice único parcial `where task_id is null` + ingest delete+insert).
  Bonus: limpiar un worktree fallido = borrar dir → `git worktree prune` → borrar rama (prune
  con el dir presente NO desregistra). Validar el scaffold con los gates en el contenedor
  (cero tokens) ANTES de quemar modelo.
- **Aplicar en**: todo motor de agente en contenedor, todo servicio que opere git sobre
  worktrees compartidos, y toda escritura best-effort a Supabase (mínimo: loguear el fallo).

### 2026-07-11: Dogfood real del ENJAMBRE (Fase 7) aprobado — dos gotchas estructurales
- **Error(es) que se habrían comido la corrida**: (1) el worktree de INTEGRACIÓN lo crea
  el Coordinador con `git worktree add` y NADIE le corre `npm install` → la verificación
  final fallaría por tooling (`tsc: not found`), no por juicio; en Fase 6 no se vio porque
  el motor (GLM) instalaba deps en SU worktree. (2) el Planner real solo emite
  task_id/objetivo/criterios/depende_de/alcance — SIN `limites` → las sub-tareas irían al
  modelo default del CLI, no al que pidió la feature padre.
- **Fix**: (1) `node_modules` COMPARTIDO en `/workspace/worktree/` (la resolución upward
  de Node/npm cubre TODOS los worktrees, incluido el integrado, y ahorra tokens por
  sub-tarea — verificado corriendo los 4 gates desde el contenedor del Supervisor sobre un
  worktree desechable ANTES de quemar modelo; re-instalar a mano si cambia el package.json
  del scaffold). (2) herencia `modelo_pref` padre→sub-tareas en el Coordinador
  (`executor.py::heredar_modelo_pref`; una sub-tarea con su propio modelo_pref gana).
  Además: el planner real necesita el CLI en la imagen del coordinador + `IS_SANDBOX=1`
  (mismo gotcha root de Fase 6) y el mismo fix "best-effort no silencioso" en su registro
  de token_usage. Al limpiar worktrees viejos: los admin-dirs son de root (los creó el
  contenedor) → limpiar DESDE el contenedor, y los dirs del volumen se ven "prunable"
  desde el host aunque existen (el host no ve /workspace).
- **Resultado**: `dogfood-swarm-1` APROBADO — plan GLM de 3 sub-tareas (2 paralelas + 1
  dependiente), integración limpia, 8 gates verdes en el todo, ledger por-tarea completo
  (~$1.62 nominal de $2; el corte de presupuesto operó con datos reales por primera vez).
- **Aplicar en**: todo worktree que un servicio prepare para gates npm (quien crea el
  worktree responde por que sea verificable), y todo campo de ruteo que deba sobrevivir a
  una descomposición (heredar explícitamente, no asumir que el modelo lo emite).

### 2026-07-11: Host-jobs con `docker exec` local quedan HUÉRFANOS tras migrar la vertical
- **Error (visto en vivo por la dueña)**: pidió al bot "revisa el manifest.yaml" y el bot
  se enredó: snapshot `cli-audit.json` rancio (30 de junio — `cli-audit.py` escribía con
  `docker exec` LOCAL y negocio migró a Hetzner el 07-05: el job quedó huérfano en
  silencio), buscó `cli-manifest.yaml` que solo existe en el repo de dev, y el skill le
  instruía "lee el archivo con tu herramienta de lectura" → `read_file`/`execute_code` NO
  existen en este runtime (toolset `file` atado a Docker) → cayó en execute_code, falló y
  CONFABULÓ pidiéndole a Elisa depurar Docker. Tres fallas apiladas, ninguna nueva: todas
  eran variantes de gotchas ya documentados que no se re-auditaron tras la migración.
- **Fix**: (1) `cli-audit.py::write_snapshot` acepta `CLI_AUDIT_SSH_HOST=hermes@<runtime>`
  y empuja por ssh (el auditor SOLO puede correr en dev: ahí viven la librería de CLIs y
  Claude Code); (2) el skill `cli-audit` ahora instruye el ÚNICO camino que funciona —
  TERMINAL local `cat /opt/data/workspace/cli-audit.json` — y prohíbe read_file/
  execute_code + buscar archivos del repo con find; maneja `generado` viejo sin pedir
  debug; (3) AGENTS.md de negocio dice explícito qué toolsets NO existen aquí y que un
  fallo por Docker jamás se le escala a Elisa como si fuera su bug.
- **Aplicar en**: tras CUALQUIER migración de vertical, re-auditar los host-jobs que
  asuman contenedor local (`grep -l "docker exec" businessos/*.py *.sh`) y los skills que
  digan "lee el archivo": en runtime sin Docker la instrucción correcta es terminal `cat`
  (gateway) o dato-en-SOUL — nunca el toolset `file`.

*V4: Todo es un Skill. Agent-First. El usuario habla, tu construyes.*
