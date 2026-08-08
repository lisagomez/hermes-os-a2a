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
    ├── "¿Opcion A o B? / valida esta decision / pasalo por el consejo / sala de guerra"
    |       → Ejecutar skill CONSEJO (Depto. de Estrategia: 5 asesores + peer-review + Chairman)
    |         Solo para decisiones abiertas de negocio/estrategia caras o irreversibles.
    |
    └── No encaja en nada
            → Usar tu juicio. Leer el codebase, entender patrones, ejecutar.
```

---

## Skills: 16 Herramientas Especializadas

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
| 16 | `consejo` | **Depto. de Estrategia**: somete una DECISION real a un Consejo de 5 asesores (lentes que chocan) + peer-review anonimo + sintesis del Chairman. Solo decisiones abiertas caras/irreversibles. Ver `businessos/departamentos/estrategia.md` |

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
│   ├── skill-creator/        # Crear nuevos skills
│   └── consejo/              # Depto. de Estrategia: Consejo de 5 asesores (decisiones)
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
> ⚠️ **CORREGIDO el 2026-07-11**: la causa raíz era `TERMINAL_ENV=docker` en el `.env` del
> volumen (mina de la migración), NO un diseño de Hermes. Con `terminal.backend: local`
> bien aplicado, read_file/execute_code/terminal SÍ funcionan en runtime (y en `chat -q`).
> Ver el aprendizaje "TERMINAL_ENV=docker en el .env del volumen" (2026-07-11). El patrón
> dato-en-SOUL sigue vigente como optimización, no como única vía.
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
  silencio), buscó `cli-manifest.yaml` que solo existe en el repo de dev, y todas sus
  tools de archivos fallaban por Docker (ver el aprendizaje TERMINAL_ENV de abajo) →
  CONFABULÓ pidiéndole a Elisa depurar Docker.
- **Fix**: (1) `cli-audit.py::write_snapshot` acepta `CLI_AUDIT_SSH_HOST=hermes@<runtime>`
  y empuja por ssh (el auditor SOLO puede correr en dev: ahí viven la librería de CLIs y
  Claude Code); (2) el skill `cli-audit` da el comando exacto y maneja `generado` viejo
  sin pedir debug; (3) AGENTS.md de negocio: un fallo de tooling jamás se le escala a
  Elisa como si fuera su bug.
- **Aplicar en**: tras CUALQUIER migración de vertical, re-auditar los host-jobs que
  asuman contenedor local (`grep -l "docker exec" businessos/*.py *.sh`).

### 2026-07-11: TERMINAL_ENV=docker en el `.env` del volumen — la mina que reescribe la doctrina
- **Error**: las tools del bot (terminal, read_file, execute_code) fallaban con "Docker
  command is available but 'docker version' failed" AUNQUE `config.yaml` decía
  `terminal.backend: local`. Causa real: el `.env` del volumen traía `TERMINAL_ENV=docker`
  (herencia de WSL2, donde Docker sí existía; viajó con la migración del volumen) y en la
  práctica le gana al config. Las 3 verticales lo tenían; personal además tenía
  `backend: docker` hasta en el config. Un `docker restart` re-materializa la mina (el
  gateway rehace el bridge config→env al arrancar): por eso "funcionaba ayer".
- **CORRECCIÓN de la doctrina 2026-07-06** ("Hermes sin Docker no puede leer archivos →
  dato-en-SOUL"): la causa raíz NUNCA fue un diseño de Hermes — era esta mina. Con
  `terminal.backend: local` bien aplicado (config + .env), **read_file, execute_code y el
  terminal funcionan en runtime**, incluso en `hermes chat -q` (que tampoco era un
  "harness parcial" para esto). Verificado con evidencia: `agent.log` pasó de "Creating
  new docker environment" (fallos de Elisa 13:18) a "Creating new local environment" +
  lecturas reales post-fix. El patrón dato-en-SOUL sigue siendo VÁLIDO como optimización
  (cero tool calls) pero ya no es la única vía.
- **Fix**: `docker exec -u hermes <c> hermes config set terminal.backend local` — arregla
  LAS DOS capas (escribe config.yaml Y sincroniza el `.env`). Aplicado a las 3 verticales
  + restart. Editar config.yaml a mano NO basta: deja el `.env` rancio esperando el
  siguiente restart.
- **Aplicar en**: toda vertical nueva o migrada (revisar `grep ^TERMINAL /opt/data/.env`),
  y ante cualquier "tool falla por Docker": es config, jamás pedirle debug a la dueña.
  Al diagnosticar: `agent.log` dice qué entorno se creó ("local"/"docker") — esa línea es
  la verdad, no la doc ni la memoria.

### 2026-07-12: Editar un `AGENTS.md`/`MEMORY.md` en el repo NO lo despliega — el runtime vive en el volumen
- **Error**: `clientes/AGENTS.md` llevaba desde Fase 2 divergido: el repo tenía grafo (Fase 2),
  Polar y contratos (Fase 3); el volumen (`~/businessos/clientes/.hermes/AGENTS.md`, lo que el
  bot REALMENTE lee) seguía en 84 líneas diciendo *"Fase futura (cuando exista el servicio
  grafo)"* — con el grafo corriendo hacía días. Nadie lo notó porque **ningún test ni deploy
  toca los volúmenes**: `docker compose up` no re-copia los `.md`, solo monta el volumen.
- **Fix**: los `.md` del repo son FUENTE, no despliegue. Sincronizar explícitamente
  (`scp` + `sudo cp` al volumen + `chown 10000:10000` + `chmod 755` + `docker restart`), y
  antes de sobrescribir, **diffear volumen vs repo**: si el diff es mayor que tu cambio, hay
  ediciones de runtime o un desfase de fases — investigar, no pisar. Guardar copia previa.
- **Aplicar en**: todo cambio a SOUL/AGENTS/MEMORY de cualquier vertical. Al cerrar una fase
  que cambia doctrina del agente, la fase NO está terminada hasta que el volumen lo refleje.

### 2026-07-12: Un paso de endurecimiento "documentado" no es un paso aplicado (y cómo recuperar SSH)
- **Error(es)**: (1) el runbook de FASE0 manda `PasswordAuthentication no`, pero el
  `99-hardening.conf` real solo tenía `PermitRootLogin no` → **el server aceptó contraseñas
  desde internet 6 días** (verificable sin credenciales: `ssh -o PreferredAuthentications=none
  user@host` lista los métodos → `Permission denied (publickey,password)` = password abierto;
  el objetivo es `(publickey)` a secas). (2) La máquina de dev perdió la llave SSH, el binario
  `hcloud-pp-cli` y el `HCLOUD_TOKEN` → cero acceso al server.
- **Fix (recuperar acceso sin tocar los contenedores)**: `hcloud ssh-keys create` / "Add SSH
  Key" de la UI **NO instalan nada en un server ya corriendo** (solo sirven al crearlo) — es
  el callejón sin salida clásico. El camino real: consola web de Hetzner (Actions → Console;
  **no es SSH**, así que `PermitRootLogin no` no la bloquea) → Rescue → *Reset root password*
  (no reinicia) → login root en la consola → `passwd <usuario>` (temporal) → desde el dev
  `ssh-copy-id -i ~/.ssh/id_ed25519.pub user@host` → verificar llave → `passwd -l <usuario>` +
  `PasswordAuthentication no` + `sshd -t` ANTES de `systemctl reload ssh`.
- **Aplicar en**: todo endurecimiento (verificar el estado observable, no el runbook) y toda
  pérdida de acceso a un cloud server. La cuenta de Hetzner es el único punto de falla real:
  **2FA pendiente**.

### 2026-07-12: Una rutina "documentada" no es una rutina agendada (el bot creía tener crons)
- **Error**: los `AGENTS.md` de las 3 verticales prometían rutinas (digest 8:00, cierre
  semanal, dreaming, repaso matutino) y **`hermes cron list` decía "No scheduled jobs" en
  las tres**. El bot creía tenerlas —su AGENTS.md se lo decía— y confabulaba al respecto;
  la dueña llevaba días sin recibir nada y sin saber por qué. Hermano del gotcha de SSH
  del mismo día: **documentar ≠ aplicar**; verificar siempre el estado observable.
- **Gotchas al crearlas**: (1) **los contenedores corren en UTC y el server en CST(-6h)**:
  `hermes cron` agenda en la hora del CONTENEDOR → para las 08:00 CST se escribe
  `0 14 * * *` (un `0 8` entrega a las 2 AM); (2) `--deliver` acepta `platform:chat_id`
  (`telegram:-5449291632` = grupo) → los reportes del equipo van al grupo, no al DM.
- **Aplicar en**: toda rutina prometida en un AGENTS/SOUL — o existe en `cron list`, o se
  borra de la doctrina. Y tras editarla, sincronizar el volumen (ver aprendizaje anterior).

### 2026-07-12: Telegram — el modo privacidad NO entrega las @menciones (solo comandos)
- **Error**: con *Group Privacy* **enabled** (el default de BotFather), un bot en un grupo
  recibe los `/comandos` pero **NO los mensajes que lo @mencionan** — al contrario de lo que
  sugiere la doc. Síntoma: el bot queda mudo en el grupo **sin un solo error en ningún log**
  (en `gateway.log` aparecen los "Ignoring /start platform ping" y CERO "inbound message").
  Se persiguen fantasmas (allowlist, authz, membresía) durante una hora.
- **Fix**: BotFather → Group Privacy → **Turn off** + **re-añadir el bot al grupo** (el ajuste
  solo se aplica al ENTRAR). Verificar con la API, no con la UI: `getMe` →
  `can_read_all_group_messages: true`. Como entonces Telegram entrega TODO el chat, el freno
  de costo pasa a Hermes: `telegram.extra.require_mention: true` (**su default es `false`** →
  sin eso el agente contesta CADA mensaje del grupo) y `observe_unmentioned_group_messages:
  false`. Autorizar por grupo con `telegram.group_allowed_chats: "<chat_id>"` (el acceso pasa
  a ser la membresía del grupo; no hace falta cazar el user_id de cada persona).
- **Gotcha propio**: 🚫 **nunca llamar `getUpdates` de la API de Telegram con el gateway vivo**
  — compite con el poller de Hermes ("Telegram polling conflict") y el bot deja de responder.
  Para diagnosticar, leer `/opt/data/logs/gateway.log` DENTRO del contenedor: `docker logs`
  NO trae el detalle de las plataformas.
- **Aplicar en**: cualquier bot de Telegram en grupo (verticales, clientes white-label).

### 2026-07-12: Un job solo puede correr donde viven sus INSUMOS (auditor de CLIs)
- **Error**: `cli-audit.py` escaneaba `~/printing-press/library/` (los binarios impresos), que
  solo existe en la máquina de dev donde corre Claude Code → el auditor no podía ser una rutina
  del servidor (la única máquina 24/7) y el ROADMAP **afirmaba** que ya lo era (falso). Además
  el `library_path` del snapshot delató que las corridas previas venían de OTRA máquina de dev
  (`/home/gsore/...`, no `/home/gomez/...`).
- **Fix**: separar el insumo del artefacto. El auditor lee un **índice versionado en el repo**
  (`cli-library-index.json`: slug → grade), regenerable con `--emit-index` **en la máquina que
  imprime**; el servidor audita con eso (cron 03:10 en `nightly-jobs.sh`). El snapshot declara
  su fuente (`fuente_impresos: libreria | indice | ninguna`) para **nunca aparentar saber lo
  que no sabe** — "no sé qué hay impreso" ≠ "no hay nada impreso".
- **Aplicar en**: todo job que se quiera mover a un cron 24/7 — primero preguntar de qué se
  alimenta y si ese insumo existe allí; si es un artefacto local, versionar su índice.

### 2026-07-12: GitHub — el permiso NO es el candado (repos personales) y el admin se salta la regla
- **Hallazgos duros, verificados contra la API (no contra la doc)**:
  (1) **En un repo de cuenta personal TODO colaborador es `write`**. `PUT /collaborators/{u}`
  con `permission=pull` (o `triage`) devuelve **204 OK y lo ignora en silencio** — los roles
  son función de **organizaciones**. Consecuencia: 4 personas podían hacer push directo a
  `master` del repo que corre toda la infra, y *no había forma de bajarlos a lectura*.
  (2) La **protección de rama no existe en repos privados del plan gratuito**
  (`403: Upgrade to GitHub Pro`). Con Pro: `master` exige PR + review; el force-push falla
  **incluso para el admin** (`GH006`).
  (3) ⚠️ **`enforce_admins: false` deja pasar al admin — y el agente usa el token del admin.**
  Un `git push origin master` "de prueba" ENTRÓ (`remote: Bypassed rule violations`). La
  protección NO protege del agente: solo la disciplina lo hace.
- **Reglas que quedan**: el agente **jamás** hace `git push origin master` (todo por PR, sin
  excepciones); antes de "arreglar" permisos, VERIFICAR que el cambio se aplicó (`GET
  /collaborators/{u}/permission`), porque GitHub acepta y descarta sin error; y `git reset
  --hard` tras un `git checkout` de rama **borra ediciones sin commitear** (así perdí una;
  se recuperó del volumen del server, que ya tenía la copia sincronizada).
- **Aplicar en**: cualquier repo con equipo. Migrar a una Organización (gratis) da roles
  reales; con cuenta personal, el único candado es la protección de rama.

### 2026-07-12: 1ª corrida real del trío desde Slack — el cliente mató a su propio servidor
- **Error(es)**: (1) el bot, al pedirle una feature en `#dep-desarrollo`, **se puso a programar
  él mismo** (`claude` en su terminal, `find /opt/data` buscando un repo que NO tiene montado):
  la frontera "tú no programas" vivía en el *skill* y en el `channel_prompt`, y **`AGENTS.md`
  —que está SIEMPRE en contexto— les gana**. Desde que el terminal funciona (fix TERMINAL_ENV),
  el agente PUEDE improvisar fuera de su carril: la frontera hay que escribirla donde siempre
  lee. (2) Con la regla ya en AGENTS.md repartió bien la tarea… **con timeout de 30 s**. La
  corrida dura minutos → al desconectarse el cliente, el servidor **canceló la petición y mató
  el proceso del motor**; el bot entonces reportó "probablemente el trío no está levantado"
  (lo contrario de la verdad: él lo abortó).
- **Diagnóstico sin logs** (el Ejecutor NO loguea el error del motor: solo lo manda por A2A, y
  si el cliente ya se fue, se pierde): el POST **no aparece** en el access log = la petición
  nunca terminó; la transcripción del CLI (`/root/.claude/projects/*/*.jsonl` dentro del
  contenedor) acaba sin entrada `result` = proceso muerto a media faena; `token_usage` sin
  filas = reventó antes de registrar (el `raise` del `except` va ANTES del `registrar()`,
  contradiciendo su propio comentario).
- **Reglas**: un cliente que se desconecta **jamás** debe cancelar trabajo del servidor
  (`asyncio.shield`); todo cliente de una tarea larga declara timeout ≥ 900 s y **nunca**
  concluye "el servicio está caído" por un timeout (consulta el estado); y todo error de
  motor se loguea localmente ANTES de viajar por el protocolo. Detalle y plan:
  `businessos/PENDIENTES-TRIO.md`.
- **Aplicar en**: todo servicio A2A largo y todo agente con terminal (la capacidad crea la
  tentación: si no quieres que lo haga, prohíbelo en AGENTS.md, no en un skill).

### 2026-07-13: Un best-effort que nadie loguea es un fallo INVISIBLE (el fetch fantasma)
- **Error**: `workspace.refrescar_master` corría `git fetch` **dentro del contenedor** del
  Ejecutor — que no tiene `ssh` ni llave de GitHub. Fallaba **siempre**, y como era
  best-effort y nadie miraba su resultado, la promesa *"cada tarea sale del master más
  fresco"* era **mentira en silencio**: el trío llevaba días construyendo sobre un master de
  **11 commits atrás**. Lo cazó un smoke, no los tests.
- **Fix (patrón de siempre)**: la credencial se queda en el HOST — cron cada 5 min
  (`git -C <repo> fetch origin --prune`); el contenedor solo **lee** las refs del repo
  montado. La llave **no debe** entrar al contenedor del Ejecutor: ahí corre el modelo con
  permisos amplios y una llave de GitHub (aunque sea de solo lectura) abre los repos privados
  de la cuenta. Y el worker ahora **loguea** el resultado del fetch.
- **Regla**: todo `except: pass` / best-effort **imprime**. Si el camino degradado es
  silencioso, no es degradado: es **invisible**. Y lo invisible es lo que muerde en
  producción (van tres esta semana: `token_usage`, el limbo de `en_revision`, y esto).
- **Aplicar en**: todo host-job, todo fallback y todo "no pasa nada si falla".

### 2026-07-13: El smoke de RUNTIME encuentra lo que 209 tests verdes no ven (la cola, PRP-010)
- **Error**: la cola del trío pasó **209 tests en dev** y el bug que la habría roto en
  producción solo apareció en el smoke de runtime (`docker restart` con trabajo en vuelo):
  una tarea muerta en **`en_revision`** se quedaba en el **limbo para siempre** — el worker
  solo recuperaba huérfanas de `en_ejecucion`. Nadie la ejecutaba, no estaba en la cola, y
  **desaparecía del radar del equipo** (el peor fallo: silencioso). Y `en_revision` es la
  ventana **más larga** del ciclo (el Supervisor corriendo build+tests son minutos): la que
  más reinicios pilla. Los tests de dev no podían verlo porque **en dev nadie mata el proceso
  a media faena**.
- **Regla**: un test de dev solo prueba lo que el dev se atreve a hacer. Antes de dar por
  viva una máquina de estados con procesos largos, **matarla a propósito en cada estado en
  vuelo** y comprobar que cada uno tiene salida. Corolario: si un estado lo escribe **solo**
  un proceso, una fila en ese estado tras un arranque es —por definición— huérfana; enumera
  TODOS esos estados, no el primero que se te ocurra.
- **Dos hermanos del mismo día**: (a) *"concurrencia 1" no es un comentario, es un candado* —
  el worker era serial "por construcción" y el test que lanza dos bucles a la vez **falló**;
  ahora hay `asyncio.Lock` (si la garantía depende de que nadie se equivoque, es una
  costumbre, no una garantía). (b) *un test que reproduce la lógica que prueba no prueba
  nada* — el primer test del guard repetía el guard dentro del test: verde sin ejercitar una
  línea de producción. Pregunta de control: **si borro el código, ¿este test se pone rojo?**
- **Aplicar en**: toda cola/worker/máquina de estados con trabajo largo, y todo test de
  guard o invariante.

### 2026-07-12: Un gate que SIEMPRE corre debe estar SIEMPRE en los criterios
- **Error**: el Supervisor corre el gate `tests` (`npx playwright test`) en toda tarea, y sin
  ningún test en el repo sale `exit 1: Error: No tests found` → **rechazo automático**. El
  relanzamiento de `mission-control-2026-0001` (2º intento, ya con el trío arreglado) salió
  con build ✅ typecheck ✅ lint ✅ y los 4 gates de calidad ✅… y **rechazado por el único gate
  que nadie le pidió cumplir**: los `criterios_aceptacion` no mencionaban tests, así que el
  motor no escribió ninguno. Las tareas aprobadas antes (`moneda`, `validar`) pasaban ese gate
  solo porque *eran* tareas de utilidades con test; el `main` del repo no tiene tests.
- **Fix**: quien arma la tarea (el skill `trio-software`) añade SIEMPRE el criterio *"incluye
  al menos un test de Playwright que cubra X"*, aunque el humano no lo pida. Regla general:
  **todo gate que el juez corre incondicionalmente es un requisito del contrato** — si no
  aparece en los criterios, el ejecutor no lo sabe y el trabajo se tira a la basura. Al añadir
  un gate nuevo al Supervisor, actualizar en el MISMO cambio los criterios que el skill emite.
- **Aplicar en**: todo par juez/ejecutor (trío, enjambre, futuros departamentos).

### 2026-07-12: Slack — el home channel no se hereda del `.env` como en Telegram
- **Error**: el bot avisaba *"No home channel is set for Slack"* aunque `SLACK_CHANNEL_ID`
  estaba puesto. El gateway cablea `home_channel` desde el env para **telegram/discord/whatsapp
  pero NO para slack**: la var que mira es **`SLACK_HOME_CHANNEL`** (`cron/scheduler.py`,
  `_HOME_TARGET_ENV_VARS`). Es donde entrega resultados de crons y mensajes cross-plataforma.
- **Fix**: `SLACK_HOME_CHANNEL=<C…>` en el `.env` del volumen + restart. La alternativa por chat
  es `/hermes sethome` (en Slack **el `/sethome` pelado NO existe**: todos los comandos van por
  el slash command padre `/hermes`).
- **Aplicar en**: toda vertical que sume Slack.

### 2026-07-16: Frontend web2 + design system — gotchas de Next 16 + paquete local
- **Aprendizaje**: el design system A2A Factory (ZIP de la dueña) se integró como paquete local
  `@a2a/design-system` (`businessos/frontends/design-system/`, `file:../design-system` +
  `transpilePackages`) consumido por `cliente-web2` (Next 16 + React 19 + Tailwind v4). Tres
  trampas: (1) **`turbopack.root` mal fijado ROMPE la resolución de un paquete hermano**: poner
  `root: __dirname` (la carpeta de la app) deja `../design-system` FUERA de la raíz de tracing →
  `module-not-found` en build (el primer build "funcionaba" solo porque Next infería la raíz del
  monorepo, que sí lo contenía). Fix: `root` = ancestro que contenga la app Y el paquete
  (`path.resolve(__dirname, '..')` = `frontends/`). (2) **`eslint-config-next` v16 YA es un flat
  config array nativo** (`export = Linter.Config[]`): usarlo con `FlatCompat` truena con
  "Converting circular structure to JSON" en ESLint 9; hay que `import next` y spread directo,
  sin FlatCompat. (3) **fuentes**: `next/font/google` (no CDN) para prod/CSP; el design system
  deja `--font-display`/`--font-mono` sin las familias y la app las puentea a las vars de
  `next/font`. Verificación real: smoke Playwright (`node smoke.mjs` con import absoluto a
  `a2aboths/node_modules/playwright`) contra `npm start` en **background-task propio** — un server
  lanzado con `&` dentro del comando queda zombie al cerrar el shell y sirve estado stale
  (perseguí "hidratación rota" que no existía).
- **Invariante preservado**: un-escritor-por-origen en `leads` → el frontend usa origen propio
  `web2` (migración `supabase-fase11-leads-web2.sql`), no reusa `a2a`/`manual`.
- **Aplicar en**: cualquier frontend nuevo del monorepo, todo paquete local `file:` con Turbopack,
  y toda verificación de un server local. Detalle: `.claude/memory/project/frontend-web2.md`.

### 2026-07-14: master ahora tiene `enforce_admins:true` — el `--admin` YA NO saltea la revisión
- **CORRIGE** el aprendizaje 2026-07-12 (GitHub) que daba `enforce_admins:false` y decía que el
  admin (y por tanto el agente con su token) podía saltarse la protección. **Ya no**: master está
  con `enforce_admins:true` + `required_approving_review_count:1` (verificado 2026-07-14).
  Consecuencias al mergear un PR: (a) `gh pr merge --admin` **falla** con "At least 1 approving
  review is required" — no hay bypass por token; (b) GitHub **prohíbe que el autor apruebe su
  propio PR** → si el agente creó el PR con `lisagomez`, esa cuenta no puede aprobarlo; (c) los
  **4 colaboradores con write** (`HuertaVictor`, `Johann-Valderrama`, `ZELANDIAIO`,
  `makeflowia-lab`) sí pueden aprobar → camino sano.
- **Bypass**: respaldar la config completa a un JSON
  (`gh api .../branches/master/protection`), bajar `required_approving_review_count` a 0 vía
  `gh api -X PATCH .../branches/master/protection/required_pull_request_reviews`, mergear, y
  **RESTAURAR a 1 de inmediato** verificando el estado final. Usado así el 2026-07-14 para PRs
  #49/#50 con autorización expresa.
- **ACTUALIZADO 2026-07-18**: el bypass pasó de excepcional a **vía estándar del agente** por
  autorización permanente de la dueña — ver el aprendizaje 2026-07-18 (siguiente).
- **Aplicar en**: todo merge a master. Detalle en `.claude/memory/reference/master-branch-protection.md`.

### 2026-07-18: Autorización PERMANENTE de la dueña — el agente ejecuta los merges (bypass estándar)
- **ACTUALIZA el 2026-07-14**: Elisa autorizó de forma permanente que el agente genere los
  merges a master con el procedimiento de bypass, **sin pedir OK por-merge**. Ya no es la
  excepción: es el flujo estándar de merge de este repo.
- **Procedimiento (sin desviaciones)**: (1) bajar `required_approving_review_count` a `0`
  (`gh api -X PATCH .../branches/master/protection/required_pull_request_reviews`);
  (2) `gh pr merge <n> --merge`; (3) **restaurar a `1` DE INMEDIATO** en el mismo comando/
  bloque, y (4) verificar el estado final (`reviews:1` + `enforce_admins:true`) — la ventana
  jamás queda abierta, ni siquiera si el merge falla (restaurar también en el camino de
  error). Varios PRs listos se mergean en UNA sola ventana (menos exposición). Ojo: mergear
  el 1º puede des-actualizar al 2º (conflicto nuevo contra el master recién movido, visto
  con #55/#56) → resolver y reintentar dentro de la misma lógica.
- **Siguen vigentes**: JAMÁS `git push origin master` directo (todo pasa por PR, también los
  cambios del propio agente); los PRs de colaboradores se **REVISAN antes** de mergear
  (patrón PR #58: review + fixes empujados a la rama + merge); y las ramas mergeadas se
  borran (local y origin).
- **Aplicar en**: todo merge a master de este repo.

### 2026-07-15: Meter las migraciones de una superficie en un proyecto Supabase COMPARTIDO — cuidado con `profiles` + el trigger de auth
- **Contexto**: `frontend-ci` (cabina control-interno) se cableó al proyecto **A2ABot**
  (`hsejpktzcqwkwkwholkw`, el mismo del negocio/trío) en vez de a uno dedicado, porque ahí ya
  apuntaban sus credenciales. Sus 6 migraciones crean **31 tablas**; solo **una colisiona** con
  las 8 del negocio: `profiles`.
- **La trampa**: el `base_schema` del frontend es idempotente (`create table if not exists`,
  `drop policy … create`), PERO trae `create or replace function public.handle_new_user()` — y
  eso **NO** respeta el "if not exists": **sobrescribe** el trigger de auth existente. El del
  negocio insertaba `(id,email,full_name,avatar_url)`; el del frontend inserta `(…,role)`. Como
  el `profiles` existente **no tenía la columna `role`** (y `create table if not exists` NO la
  añade porque la tabla ya existe), aplicar el base_schema tal cual **habría roto el signup de
  TODO A2ABot** (el trigger fallaría al insertar en una columna inexistente) — un daño silencioso
  que los tests de dev jamás cazan (nadie crea un `auth.users` en dev).
- **Fix (reconciliar, no clobbear)**: (1) `alter table profiles add column if not exists role …`
  ANTES de aplicar (superset inocuo para el negocio, que no usa `role`); (2) aplicar las
  migraciones; (3) reinstalar un `handle_new_user` **FUSIONADO** que inserta lo del negocio
  (`avatar_url`) **y** lo del frontend (`role`), con `on conflict (id) do nothing` y hardening
  `search_path=''`. Verificar después: las 31 tablas presentes, las 8 del negocio + sus datos
  intactos, y la función final contiene ambas columnas.
- **Regla general**: antes de correr las migraciones de una superficie sobre una BD que ya usa
  otra, **diffear los nombres de tabla** (aquí, disjuntos salvo `profiles`) y **auditar todo
  `create or replace function`/trigger** — esos pisan sin avisar. Un proyecto compartido ahorra
  costo pero te hace dueño de las colisiones. Aplicar migraciones a producción por Management API
  (`POST /database/query`, UA `curl/8.0`) va bien; el `db push` del CLI no estaba cableado.
- **Aplicar en**: cualquier `db push`/migración de una superficie nueva a un Supabase con datos,
  y todo trigger de `auth.users` en proyectos multi-superficie. Ver
  `.claude/memory/project/frontends-control-interno.md`.

### 2026-07-17: Deploy Vercel de una app con paquete local `file:` — tres minas
- **(1) Upload root ≠ app**: con `file:../design-system` hay que subir el ancestro común
  (`frontends/`) y fijar Root Directory por **API** (`PATCH /v9/projects/{id}` — el CLI no
  tiene flag). `vercel deploy` DESDE el subdir se auto-linkea mal (busca `app/app`).
- **(2) Tipos de React del paquete hermano**: en dev los aporta el `node_modules` de la
  RAÍZ del monorepo (no viaja a Vercel) → `tsc` falla solo allá. NO mapear `react` en
  `tsconfig.paths`: Turbopack usa los paths como alias de bundling y revienta apuntando
  runtime a `@types/`. Fix real: `devDependencies` de tipos en el paquete + installCommand
  `npm install && npm install --prefix ../design-system` (tipos sí, NUNCA un segundo react
  → duplicaría la instancia y rompe hooks).
- **(3) El `.env.local` que `vercel link` crea en el upload root MATA las lambdas**: viaja
  en el deploy y toda function muere con `failed to load env vars: EnvFileReadError` — 500
  genérico SIN tocar tu código, mientras la landing estática sigue viva (engaña). El error
  real solo aparece en `vercel logs` del deployment, no en el build. Fix: borrarlo +
  `.vercelignore` con `.env*`.
- **Aplicar en**: todo deploy Vercel desde este monorepo y todo paquete `file:` compartido.
  Detalle en `businessos/frontends/DEPLOY-web2.md` §0.

### 2026-07-17: Vercel Hobby bloquea deploys de COLABORADORES en repos privados
- **Error**: un push de cualquier cuenta que no sea la dueña del proyecto Vercel deja el
  deploy en **"Blocked"**. NO es fallo de build ni de Root Directory: es restricción del
  plan Hobby (solo commits autorados por la cuenta dueña despliegan en verde).
- **Fix (workaround activo)**: `.github/workflows/reauthor-tip-vercel.yml` — si el tip de
  un push es de un colaborador, agrega un commit VACÍO autorado por la dueña
  (`lisagomez <lisagomez967@gmail.com>`) y Vercel despliega. Solo ramas ≠ `master`:
  master no lo necesita (sus merges los ejecuta la cuenta dueña) y su protección
  (PR + enforce_admins) rechazaría el push de la Action con GH006. Sin bucles: los push
  con `GITHUB_TOKEN` no re-disparan workflows, y el job además filtra por actor.
- **Fix definitivo** (si el proyecto escala): **Vercel Pro** + invitar a los colaboradores
  al Team de Vercel → borrar el workflow (deja de generar commits vacíos).
- **Aplicar en**: todo proyecto Vercel Hobby conectado a un repo privado con equipo.

### 2026-07-20: El workflow de reauthor-tip puede adelantarse a tu propio push — verificar tree antes de pisar
- **Error**: tras dejar una rama pusheada, el workflow `reauthor-tip-vercel.yml` (ver
  aprendizaje anterior) le agrega un commit vacío por-detrás sin avisar. Si en una sesión
  posterior se hace `git rebase`/edición y luego `git push --force-with-lease`, el push
  falla con "stale info" porque el remoto ya no es el que se dejó — el bot lo movió. La
  tentación es forzar (`--force`) sin mirar, lo que borraría el commit del bot.
- **Fix**: ante un rechazo "stale info" en una rama con historial de Vercel, `git fetch
  origin <rama>` y comparar el commit remoto nuevo: si su `git rev-parse <sha>^{tree}`
  es IDÉNTICO al del commit que se dejó (el bot solo reautoró, no cambió contenido), es
  seguro adoptarlo (`git reset --hard origin/<rama>`) o pisarlo con `--force-with-lease`
  a sabiendas de que es un commit vacío. Si el tree difiere, alguien más (humana o CI)
  metió cambios reales — investigar antes de sobrescribir.
- **Aplicar en**: todo rebase/edición de historia sobre una rama que ya recibió push y que
  no sea `master` (el bot solo actúa fuera de `master`, ver aprendizaje anterior).

### 2026-07-20: Una skill recién creada NO aparece en el Skill tool hasta que se lee su SKILL.md
- **Error**: instalar/crear un `.claude/skills/<nombre>/SKILL.md` nuevo en la MISMA sesión
  y luego invocarlo con el Skill tool (`Skill({skill: "<nombre>"})`) falla con
  "Unknown skill" — el registro de skills disponibles no se refresca solo con escribir
  el archivo.
- **Fix**: un `Read` del `SKILL.md` recién escrito fuerza el re-escaneo del directorio
  `.claude/skills/` y lo registra (a veces con un system-reminder explícito de "nuevas
  skills descubiertas", a veces sin él — no depender del aviso, verificar leyendo). Si
  aun así no aparece, seguir sus instrucciones directamente desde el contenido ya leído
  en vez de bloquear la tarea esperando al Skill tool.
- **Aplicar en**: cualquier sesión que instale o edite una skill y quiera invocarla en el
  mismo turno/sesión (no en una sesión futura, donde el escaneo ya ocurrió al arrancar).

### 2026-07-23: Un deploy verde en SU ruta puede convivir con 500s viejos — smoke de TODAS las vistas
- **Error(es)**: al verificar el deploy de `/desarrollo` (mission-control-2026-0001), el
  smoke de las demás rutas destapó que `/ai-spend` y `/grafo` llevaban días en 500 en
  producción SIN que nadie lo viera (código idéntico desde el 07-12 — era drift, no
  regresión): (a) un **enum Zod sobre un dominio que CRECE** (`vertical`) reventó cuando
  el ledger del trío empezó a escribir `vertical='trio'` en `token_usage` — el schema era
  más estricto que la BD, y la UI hasta tenía fallback para verticales desconocidos;
  (b) un **agregado inline de PostgREST** (`cuenta:id.count()`) que Supabase rechaza con
  `PGRST123` (agregados deshabilitados por defecto en la plataforma).
- **Fix**: (a) `vertical: z.string()` — si la UI ya tolera valores nuevos, el schema no
  debe ser el eslabón frágil; enum solo cuando el dominio es cerrado DE VERDAD;
  (b) mover el agregado a una vista (`v_facturas_resumen`, security_invoker + revoke
  anon/authenticated) — mismo patrón que `v_presupuesto_mensual`. DDL en prod: MCP en
  read-only → management API (`POST /database/query`, UA `curl/8.0`).
- **Aplicar en**: todo deploy de a2abot (smoke de las 5 rutas, no solo la nueva), todo
  schema Zod sobre tablas donde escriben actores que se multiplican (verticales,
  departamentos, modelos), y toda query PostgREST con agregados.

### 2026-07-23: "Integrado y verificado en dev" ≠ imagen desplegable (1er rebuild real del Ejecutor)
- **Error(es)**: al encolar la 1ª tarea del depto Procesos hubo que reconstruir el Ejecutor
  (imagen 4 días vieja → su `contrato.py` no conocía `procesos`: habría rechazado la tarea) y
  el rebuild destapó DOS minas de Fase 12 que llevaban días latentes: (1) el default de
  `fabric_engine` (`parent.parent / "fabrica-sc"`) funciona en dev pero en la imagen APLANADA
  (`/app/*.py`) resuelve a `/fabrica-sc` inexistente → crash-loop; (2) **`COPY` multi-fuente
  con directorios APLANA su contenido** (semántica documentada de Docker: `COPY a dir1 dir2
  dest/` copia el *contenido* de dir1/dir2, no los directorios) → `engine/fabrica.py` no
  existía en la imagen. Los 281 tests verdes de dev no ven NADA de esto (corren del directorio
  fuente — hermano del gotcha 2026-07-10).
- **Fix**: `FABRICA_SC_DIR=/app/fabrica-sc` en compose (PR #131) + una línea de COPY por
  directorio (PR #132) + `openpyxl` que el motor necesita para el xlsx de Procesos (PR #130).
  Reglas nuevas: (a) el gate de terminado de un servicio dockerizado incluye **build de la
  imagen + arranque real**, no solo pytest; (b) antes de encolar una tarea de un departamento
  nuevo, verificar qué contrato corre la imagen VIVA
  (`docker exec <c> python -c "import contrato; print(contrato.DEPARTAMENTOS)"`); (c) señal:
  primera reconstrucción tras N días = esperar minas de todo lo integrado en medio.
- **Aplicar en**: los 6 servicios A2A con COPY explícito y todo path-default resuelto con
  `Path(__file__).parent...` que deba sobrevivir al aplanado de la imagen.

### 2026-07-24: Un prompt de investigación→seed del grafo debe traer el esquema REAL adentro
- **Error/riesgo**: un borrador de investigación regulatoria (documentación de exportación
  logística) traía su propia plantilla de "salida para grafo" **inventada**: `nodo_id`,
  `actor_afectado`, `subcategoria`, `nivel_certeza`, `condicion/evidencia_minima` y un
  vocabulario de ~12 "veredictos" que mezclaba 5 ejes distintos (veredicto + estatus de
  requisito + dependencia + accesibilidad de datos + automatización/riesgo). El grafo real
  (`grafo/seed/reglas.json`) NO tiene nada de eso: su modelo es `jurisdiccion × dimension ×
  categoria(keywords+exclusiones) × regimen → impactos[]{veredicto_base, requisitos[],
  banderas[], parametros}`, `veredicto_base` ∈ 3 valores por dimensión (regulatorio:
  `permitido`/`no_permitido`/`dudoso`, fail-safe `dudoso`), y **no existe entidad `nodo` ni
  `actor`**. Un agente que no conoce el grafo habría producido el esquema equivocado con total
  confianza → output no-sembrable (el gate `gen_seed_sql.py --check` lo rechaza).
- **Fix**: todo prompt de investigación→seed trae el esquema real EMBEBIDO + el checklist del
  gate + frontera dura **Salida A** (investigación/producto, incl. nodos/automatización/riesgo)
  vs **Salida B** (solo reglas con fuente primaria, en el esquema real). Validar el ejemplo con
  `python3 gen_seed_sql.py --check --json <tmp>` ANTES de confiar. "obligatorio/condicionado" es
  estatus de un `requisito`, NO un veredicto; nodo/riesgo/automatización nunca van al seed.
  Entregado: `grafo/PLANTILLA-INVESTIGACION-SEED.md` (PR #144). Detalle en
  `.claude/memory/project/fase8-grafo-regulatorio.md` (act. 2026-07-24).
- **Aplicar en**: toda investigación que alimente el grafo (seguros, logística, más países) y,
  en general, todo prompt cuya salida deba encajar en un esquema existente — anclarlo al esquema
  real, no dejar que invente uno plausible.

### 2026-07-24: Exponer en público una superficie con `service_role` EXIGE auth+allowlist ANTES
- **Contexto**: Mission Control (a2abot) se abrió a los compañeros vía Vercel. El panel renderiza
  TODO el negocio (revenue, facturas, contratos, cobros, leads, gasto IA) con
  `SUPABASE_SERVICE_ROLE_KEY` server-side. Vivía "protegido" solo por ser `127.0.0.1` + túnel SSH.
- **Regla**: el `service_role` **nunca** protege por sí mismo — bypassa RLS por diseño. Mover una
  superficie así de localhost a una URL pública sin auth = filtrar el negocio entero. La auth no
  es una feature opcional del deploy: es el **prerequisito** del deploy. Patrón aplicado: magic
  link passwordless + **allowlist fail-closed** (`PANEL_ALLOWED_EMAILS`, vacío = nadie entra) en
  `middleware.ts`; el envío del OTP se gatea en el SERVIDOR antes de tocar Supabase (sin
  email-bombing de arbitrarios ni oráculo de enumeración: respuesta siempre genérica).
- **Gotchas**: (1) el PWA/service worker de un panel con datos sensibles debe ser conservador —
  **NUNCA** cachear navegaciones/HTML ni respuestas de Supabase (serviría página obsoleta o
  saltaría el redirect de login); cachear solo `/_next/static` e iconos. (2) Si el mismo código
  corre además en Docker (Hetzner), el middleware aplica **también** ahí al reconstruir la imagen
  → poner las vars de auth en su `.env` o el túnel queda en `/login` sin poder entrar. (3) Next
  16.2: `middleware` está deprecado a favor de `proxy` (solo warning; sigue funcionando).
- **Aplicar en**: cualquier dashboard/superficie que use service_role o datos de negocio y se
  quiera exponer fuera de localhost. Detalle: `businessos/DEPLOY-mission-control.md` +
  `.claude/memory/project/fase4-dashboard.md`.

### 2026-07-25: Un PWA "listo" puede no registrar NUNCA el service worker (y cómo se caza)
- **Error**: Mission Control se desplegó a Vercel con manifest, `sw.js` e iconos sirviendo
  200 y el `PWARegister` montado en el layout… y el SW **jamás se registraba**:
  `PWARegister` se suscribía a `window.addEventListener('load', …)` **dentro de un
  `useEffect`**, que en la mayoría de cargas corre DESPUÉS de que `load` ya disparó → el
  callback nunca se ejecuta. Síntoma en producción: `navigator.serviceWorker
  .getRegistration()` = `undefined` y `caches.keys()` vacío, **sin un solo error en
  consola ni en logs** (otra vez el fallo invisible: el `catch` del register es silencioso
  y nadie lo llama). Ningún check de HTTP lo detecta — `/sw.js` responde 200 igual.
- **Fix**: si `document.readyState === 'complete'`, registrar de inmediato; si no,
  suscribirse a `load`. Lógica extraída a `src/lib/pwa/registrar-sw.ts` (pura, sin DOM)
  para poder testearla bajo el runner de Playwright **sin navegador** — el gate `tests`
  corre sin chromium. Control obligatorio: se revirtió el fix y el test se puso **rojo**.
- **Regla de verificación**: un PWA solo está verificado con navegador real —
  `getRegistration()` activo + `caches.keys()` conteniendo **solo estáticos** (si aparece
  una navegación/HTML en la caché de un panel con datos sensibles, es un bug de seguridad,
  no de rendimiento). Servir el manifest y el sw.js es condición necesaria, nunca suficiente.
- **Aplicar en**: todo PWA de la fábrica y, en general, todo `useEffect` que se suscriba a
  un evento del ciclo de vida de la página (`load`, `DOMContentLoaded`): comprobar primero
  el estado, porque el evento ya pasó.

### 2026-07-25: Verificar un deploy con auth SIN el buzón — mintar la sesión por admin API
- **Aprendizaje**: al exponer una superficie con login, el smoke de "307 → /login" solo
  prueba el candado; la mitad que importa (¿renderiza datos reales con `service_role`?)
  queda sin verificar y ahí es donde vive el drift (aprendizaje 2026-07-23). Sin acceso al
  correo: `admin/generate_link` (no envía email) → `/auth/v1/verify` sin seguir redirects
  → tokens del fragmento → armar la cookie `sb-<ref>-auth-token` = `base64-`+b64(JSON de
  sesión) → pegarle a todas las rutas → **revocar con `logout?scope=local`** al terminar.
  Así se verificaron las 6 vistas con datos reales (incl. `/_next/mcp` detrás del login).
  Lo que ese camino NO prueba es el PKCE del enlace real: eso se comprueba viendo que
  `POST /auth/otp` devuelva la cookie `…-auth-token-code-verifier` (sin ella, el clic en
  el correo acaba en `/login?error=auth`).
- **Gotchas del día**: (1) el token de la CLI de Vercel expira pero **se auto-refresca** al
  correr cualquier comando (`vercel whoami`) — un 403 pegándole a la API a mano NO es
  "hay que volver a loguearse"; (2) `vercel link` **sí** crea el `.env.local` que mata las
  lambdas (mina de 2026-07-17 confirmada: borrarlo entre `link` y `deploy`); (3) el
  rate-limit de correos de Supabase (`rate_limit_email_sent`, **2/hora por proyecto**) no
  se puede subir sin SMTP propio: la management API responde `401 Custom SMTP required`
  (y un PATCH que mezcle campos permitidos con ese muere entero → patchear por separado);
  (4) `vercel env pull` escribe un PLACEHOLDER (~11 chars) para las vars marcadas
  *sensitive* (p. ej. `SUPABASE_SERVICE_ROLE_KEY`) SIN error — validar formato/largo antes
  de usar; las keys reales salen de la management API de Supabase
  (`GET /v1/projects/{ref}/api-keys?reveal=true`), no del pull. (Visto 2026-07-28 al
  replicar el patrón en meeting-copilot.)
- **Aplicar en**: todo deploy de una superficie con auth (Vercel u otra) y toda config de
  auth por management API. Detalle: `businessos/DEPLOY-mission-control.md` §3.

### 2026-07-25: Un fallo del PROVEEDOR no es un fallo de la TAREA — clasificar antes de escalar
- **Error**: el trío escalaba una tarea ante un **429 rate-limit** (tope 5h de z.ai) o un
  **"Connection closed mid-response"** como si el trabajo hubiera fallado. En el dogfood de la
  build-spec (2026-07-24) un 429 tumbó 5 tareas seguidas (las 4 últimas murieron al instante
  con 0 tokens contra un límite ya agotado) y el bot reportaba lo contrario de la verdad
  (*"probablemente el trío no está levantado"*) — hermano del pecado del timeout de 30 s del
  2026-07-12: el sistema se culpaba mal a sí mismo.
- **Hallazgo que evitó una solución frágil**: la memoria decía que el error real *solo* vivía
  en el transcript del CLI (`~/.claude/projects/.../*.jsonl`, campo `error`). Al introspeccionar
  el SDK instalado (`claude-agent-sdk` 0.2.110, doctrina "el instalado manda, no el blog")
  resultó que la señal es **ESTRUCTURAL**: `ResultMessage.api_error_status` (429/5xx/529 cuando
  `is_error=True` y `subtype="success"` = el críptico *"error result: success"*),
  `AssistantMessage.error` ∈ {`rate_limit`,`server_error`,…}, `RateLimitEvent.rate_limit_info.resets_at`
  (Unix ts del reset) y `CLIConnectionError`. **Cero parseo de transcript. Lección: antes de
  construir un parser frágil sobre un shape adivinado, introspecciona el SDK — puede que ya te dé
  el dato tipado.**
- **Fix (patrón "transitorio vs definitivo", fail-safe)**: `clasificar_transitorio` marca
  transitorio SOLO con señal de alta confianza; todo lo demás (max_turns, billing, auth, error de
  código) → definitivo, escala como siempre (nunca empeora: solo convierte en reintento lo que se
  escalaba por error). Un transitorio: (1) vuelve a la cola **sin consumir intento** (la cola
  devuelve el `intentos` del claim); (2) el worker **pausa** con backoff exponencial o hasta
  `resets_at` — y como es serial, la pausa **frena la cola entera**, correcto ante un límite de
  CUENTA; (3) **fusible** de 8 reintentos seguidos → escala, por si algo se clasificó mal. Capas
  `engine/claude_engine/pipeline/worker/cola`, 12 tests nuevos, verde en dev. Deploy = rebuild del
  Ejecutor (imagen). Detalle: `businessos/PENDIENTES-TRIO.md` + `.claude/memory/project/fase10-cola.md`.
- **Seguimiento (mismo día, PR #151): el Coordinador también, y el criterio se COMPARTIÓ.** El
  Planner del enjambre (`coordinador-a2a`) llama al modelo vía z.ai igual que el Ejecutor → misma
  exposición a un 429. En vez de DUPLICAR el clasificador se MOVIÓ a
  `trio-contrato/errores_proveedor.py`, el módulo que ambos servicios ya vendoran ("arreglar lo
  compartido, no el caso aislado"): una sola implementación, no dos que deriven. El reintento del
  Planner es INLINE (no hay cola de planificación): bucle acotado en `executor.py::_planificar` con
  backoff/pausa hasta `resets_at` y fusible `PLAN_TRANSITORIOS_MAX=6`. El refactor del Ejecutor a
  usar el módulo compartido NO cambió su comportamiento (75 tests siguen verdes). Deploy = rebuild
  del Coordinador; el Ejecutor no cambia comportamiento.
- **Aplicar en**: todo motor de agente contra un proveedor con rate-limit (Ejecutor y Planner del
  Coordinador, YA blindados), y todo host-job/cliente que trate un error de red/límite como si fuera
  un fallo de la lógica de negocio. Y cuando un SEGUNDO servicio necesite la misma lógica del
  proveedor, muévela al módulo compartido (`trio-contrato/errores_proveedor.py`), no la dupliques.

### 2026-07-26: Meeting Copilot (frontends/meeting-copilot) — patrón "la IA propone, el contrato verifica"
- **Aprendizaje**: para análisis LLM sobre transcripciones reales, el diseño que funcionó fue
  motor determinista para la ESTRUCTURA (qué dimensión falta, pesos, score — explicable y
  testeado) + IA para redactar/extraer + un VALIDADOR que exige que cada hallazgo cite el
  segmento que lo respalda y DESCARTA lo no verificable (hermano del grafo: sin fuente no hay
  afirmación). Gotchas pagados: (1) en monorepo, Turbopack infiere la raíz del workspace en el
  repo y arrastra `src/middleware.ts` de la app raíz → fijar `turbopack.root` +
  `outputFileTracingRoot`; (2) un provider mock JAMÁS debe pisar datos reales ya capturados
  (la cola de transcripción sustituía la transcripción en vivo por la demo — lo cazó el
  dogfood del usuario, no los tests); (3) en contexto EN VIVO no existe "mitad de la reunión"
  (el total crece con el cursor): alertas proporcionales necesitan umbral absoluto;
  (4) Playwright en WSL sin sudo: `apt-get download` + `dpkg-deb -x` + `LD_LIBRARY_PATH`.
- **Aplicar en**: todo análisis LLM con pretensión de evidencia, todo mock frente a datos
  reales, y toda app Next nueva dentro del monorepo. Ver
  `.claude/memory/project/frontend-meeting-copilot.md` y el PRP `prp-meeting-copilot.md`.

### 2026-07-26: Un server local lanzado desde una sesión de Claude muere con la sesión — systemd --user es el fix
- **Error**: el dev server de meeting-copilot (`localhost:3000`) "se volvía a caer" una y otra
  vez: incluso lanzado con `setsid nohup … &` moría al cerrarse la sesión de Claude Code que lo
  lanzó (el sandbox/cgroup de la sesión mata a sus descendientes al terminar). Señal en el log:
  termina en `[?25h` sin ningún error — apagado por señal, no crash de la app. No era OOM ni bug
  del código, y el smoke "arrancó y responde 200" no lo caza porque muere DESPUÉS, al cerrar la
  sesión. Hermano del gotcha 2026-07-16 (server con `&` zombie): la vida del proceso no puede
  depender del shell ni de la sesión.
- **Fix**: unidad systemd de usuario (WSL2 la soporta: `systemctl --user is-system-running` →
  `running`): `~/.config/systemd/user/meeting-copilot-dev.service` con `Restart=always`,
  `ExecStart=/home/gsore/.local/bin/npm run dev` (path absoluto: systemd no hereda el PATH de
  nvm/.local) y log en `~/.local/state/meeting-copilot-dev.log`; `systemctl --user daemon-reload
  && systemctl --user enable --now meeting-copilot-dev`. Verificado matando el proceso a
  propósito: systemd lo revivió en segundos y volvió a 200. Gestión:
  `systemctl --user {status,restart,stop} meeting-copilot-dev`.
- **Aplicar en**: todo server/túnel local que deba sobrevivir a la sesión que lo lanzó (dev
  servers de frontends, mission control local). Si "se cayó localhost" y el log acaba limpio en
  `[?25h`, es esto — no perseguir bugs de la app.

### 2026-07-26: Agentes en background + checkout de rama = trabajo huérfano (y un "verde" sin verificar)
- **Error(es)**: (1) mientras dos agentes en background editaban el working tree COMPARTIDO
  (deuda de diseño panel-adm, rama `docs/design-panel-adm-setup`), la rama activa cambió a
  `feat/erp-modulo-act` — los cambios sin commitear de los agentes viajaron con el checkout y
  quedaron encima de una rama ajena: commitear ahí habría mezclado diseño con ERP. (2) Uno de
  los agentes murió por límite de sesión de la API reportando "all gates green" JUSTO antes de
  su verificación final — un verde declarado por un agente muerto no es un verde.
- **Fix**: (1) `git stash push -u` → checkout de la rama correcta → `stash pop` → commit →
  push → **restaurar la rama en la que estaba el usuario**; antes de commitear tras agentes en
  background, SIEMPRE `git branch --show-current`. (2) Si un agente muere a media verificación,
  re-correr TODOS sus gates uno mismo (aquí: typecheck+lint+build+25 tests y el sanity de que
  el CSS compilado emite los tokens — todo pasó, pero había que verlo pasar).
- **Aplicar en**: toda sesión con agentes paralelos sobre el working tree (los agentes no son
  worktrees aislados salvo que se pida `isolation: worktree`) y todo reporte de gates de un
  agente que terminó anormalmente. (La otra sesión documentó el mismo incidente desde su
  lado — ver "Dos sesiones de Claude sobre el MISMO working tree" abajo: `git worktree` es
  el fix estructural; el stash-dance de arriba es el rescate cuando ya pasó.)

### 2026-07-26: El ERP se ACTIVÓ — esquema erp vivo, módulo act, y el puente correcto (cli_fin, no PAT)
- **Contexto**: por decisión de la dueña, las migraciones ERP (001-005, incl. la nueva
  005_activos del módulo act) se aplicaron al Supabase compartido. Gotchas que costaron
  iteraciones: (1) **el host del pooler lo dicta la API** (`GET /config/database/pooler` →
  `aws-1-us-east-2`; adivinar `aws-0` da "tenant/user not found" que parece problema de
  credencial); (2) **`postgres` no puede `SET ROLE` a roles nuevos sin MEMBRESÍA** — el
  management API necesita `grant rol_x to postgres` (estado de cluster, no vive en ningún
  .sql: documentarlo o la recreación de la BD lo pierde). Y un check que "pasa" por
  `permission denied to set role` NO probó lo que creías: re-verificar por el motivo
  correcto (`permission denied for table`).
- **El puente de escritura correcto**: para que un host-job escriba en `erp` NO se sube el
  PAT de management al servidor (blast radius de toda la org) NI se usa service_role
  (BYPASSRLS anula la seguridad): se crea el login `cli_fin` con `GRANT rol_exe_fin` (el
  patrón que 004_seguridad.sql ya diseñaba) y cada escritura va en una transacción
  `set local role + set local app.cliente_id` — ejercita grants y RLS reales en cada
  operación. psql del sistema (`postgresql-client`) es la única dependencia.
- **Orden de migraciones con RLS por bucle**: tras crear tablas nuevas (005) hay que
  RE-CORRER 004 (la RLS se aplica iterando pg_tables; los default privileges cubren
  grants pero NO políticas) y re-correr los revokes append-only de 005 (004 re-grantea).
  El env canónico de host-jobs es `~/repo/businessos/.env` (el que sourcea el crontab),
  NO `~/businessos/.env` — verificar con `crontab -l` antes de escribir vars.
- **Aplicar en**: todo lo que toque el esquema erp, cualquier rol/login nuevo de Postgres
  en Supabase, y toda migración que añada tablas. Ver `.claude/memory/project/erp-modulo-act.md`.

### 2026-07-26: Dos sesiones de Claude sobre el MISMO working tree se pisan — usar git worktree
- **Error**: dos sesiones en paralelo (una en `feat/erp-modulo-act`, otra en la rama de
  design) compartían `/home/gsore/code/a2aboths`. Los `git checkout` cruzados de la otra
  sesión revirtieron el working tree DOS VECES debajo de esta (ediciones sin commitear
  desaparecen del árbol al cambiar de rama; los system-reminders muestran "archivos
  modificados" que en realidad son la rama ajena). El diagnóstico está en `git reflog`:
  entradas `checkout: moving from X to Y` que tú no hiciste.
- **Fix**: al detectar trabajo paralelo, `git worktree add <dir> <mi-rama>` y seguir TODO
  el trabajo propio ahí (los worktrees comparten .git pero cada uno tiene su checkout).
  Mover también los archivos untracked propios al worktree — en el árbol compartido un
  `git add -A` ajeno se los lleva. Committear temprano y a menudo: lo commiteado es
  inmune al pisoteo; lo sin commitear es lo único en riesgo.
- **Aplicar en**: toda sesión larga cuando haya señales de otra sesión activa (commits
  que aparecen solos, archivos que "cambian" sin tocarlos, ramas que se mueven).

### 2026-07-26: Tailwind v4 — un token `--radius-s` genera `rounded-s` que COLISIONA con la utilidad lógica de lado
- **Error**: al tokenizar radios en meeting-copilot (`@theme` con `--radius-s`), la utilidad
  emitida `rounded-s` ya EXISTE en Tailwind v4 como radio del lado lógico "start"
  (`border-start-start-radius` + `border-end-start-radius`, .25rem) — y la de Tailwind gana
  en los corners izquierdos aunque definas un `@utility` homónimo. El look se rompe en
  silencio: ningún gate lo caza, solo se ve en el CSS COMPILADO.
- **Fix**: override explícito en `@layer utilities` al final del globals.css (misma
  especificidad, gana por orden) y verificar SIEMPRE la utilidad en el CSS compilado de
  producción, no en el fuente. Alternativa si nace un token nuevo: evitar sufijos que sean
  lados lógicos (`s`, `e`) o compuestos (`ss`, `se`, `es`, `ee`, `t`, `r`, `b`, `l`).
- **Aplicar en**: todo token de `@theme` en apps Tailwind v4 cuyo nombre de utilidad pueda
  chocar con utilidades nativas, y toda verificación de paridad visual (CSS compilado manda).

### 2026-07-27: COPY multi-fuente con destino `.` — compila en el server (BuildKit), revienta en dev (builder legacy)
- **Error**: `COPY a.py b.py .` en los Dockerfiles del trío (coordinador y ejecutor) construía
  bien en el server (BuildKit tolera `.`), pero el `docker build` de la máquina de dev usa el
  builder LEGACY, que exige destino-directorio con `/` final en COPY multi-fuente → el build
  falla en una máquina y pasa en otra. Lo cazó el **gate de imagen** (lección 2026-07-23:
  "build de la imagen es parte del terminado") al aplicarlo por primera vez en dev.
- **Fix**: destino SIEMPRE `./` en COPY multi-fuente (funciona en ambos builders). Barridos
  los 6 Dockerfiles A2A: solo coordinador y ejecutor tenían la mina; el resto ya usaba `./`
  o es single-source (donde `.` es válido).
- **Aplicar en**: todo Dockerfile nuevo y todo gate de imagen — correr el build en la máquina
  de DEV también, no solo donde "siempre ha funcionado": la diferencia de builder es señal,
  no ruido.

### 2026-07-28: El ruteo de modelos tiene DOS capas y la de EXCLUSIÓN manda (fail-closed)
- **Error**: elegir modelo comparando solo capacidad/precio. Dos casos reales: la unidad
  G1 del PRP frontend (seguridad crítica, mueve valor) sellada a Fable contradiciendo la
  doctrina del propio repo ("Fable NUNCA para seguridad/cyber ni datos sensibles"); y del
  lado de Johann, un corpus de conversaciones privadas ruteado a Fable — ninguna
  comparación de "quién escribe mejor" lo revela, porque el problema no es de capacidad.
- **Fix (doctrina, origen PR #170)**: primero *"¿qué modelo está PROHIBIDO para este dato
  o dominio?"* (retención sin ZDR, clasificadores que re-rutean en silencio, proveedor
  externo sin acuerdo de datos del cliente, historial de disponibilidad); solo DESPUÉS
  "¿cuál es el mejor/más barato?". Un descalificador no se compensa con capacidad ni con
  caché. Orden completo: capa 1 exclusión → capa 2 capacidad/blast radius (orquestar-
  agentes §2; en el enjambre, `PLANNER_RUTEO_MODELOS`) → capa 3 eficiencia (Fase 1:
  probe caché+tools, el más barato que pase). Aplicado en código: el coordinador rechaza
  AL ARRANCAR un mapa de ruteo que nombre `fable`/`mythos` (config inválida); el skill
  `trio-software` fija la misma regla para el `modelo_pref` padre.
- **Aplicar en**: todo ruteo — profiles Hermes, `modelo_pref` del trío/enjambre,
  subagentes de sesión, y cada modelo/proveedor nuevo ANTES de su probe de eficiencia.

### 2026-07-28: Conectar un proyecto Vercel al monorepo SIN fijar Root Directory clobbea producción
- **Error (visto en vivo)**: el proyecto Vercel `meeting-copilot` (flujo documentado: solo-CLI)
  apareció conectado a GitHub con Root Directory `.` → cada merge a master construyó la app de
  la RAÍZ del repo (Mission Control) y la publicó ENCIMA del alias de producción del copiloto.
  Síntoma engañoso: la dueña "caía en la página equivocada" SIN pedir login — misma cookie de
  Supabase (proyecto auth compartido) + mismo dominio = sesión válida en la app equivocada.
  Primero se diagnosticó mal (correos de magic link indistinguibles — gotcha real pero
  secundario): el dato que destapó la verdad fue `curl <dominio>/login | grep '<title>'`
  (el título delata QUÉ app sirve el dominio) + `vercel alias ls` con entradas
  `<proyecto>-git-<rama>-…` que nadie desplegó por CLI.
- **Fix**: `vercel git disconnect` + redeploy CLI desde el dir de la app. Regla: en este
  monorepo (varias apps, un repo), conectar un proyecto Vercel a GitHub exige fijar ANTES
  su Root Directory; y ante "estoy en la app/página equivocada", verificar primero qué app
  sirve el dominio (title/contenido), no asumir un problema de auth o de usuario.
- **Aplicar en**: los 3+ proyectos Vercel del repo (a2abot-mission-control, cliente-web2,
  meeting-copilot) y todo proyecto nuevo. Detalle: `DEPLOY-meeting-copilot.md` §1.
- **Seguimiento (mismo día)**: la dueña pidió el auto-deploy en forma → Root Directory
  fijado por API (`PATCH /v9/projects/{id}`, el CLI no tiene flag) ANTES de `vercel git
  connect`; meeting-copilot ahora SÍ despliega por merge a master (runbook §1). Dos minas
  más en el camino: (a) `sourceFilesOutsideRootDirectory` en ON hace que el builder busque
  `.next` en `/vercel/path0/` (la raíz del repo = otra app Next) → `ENOENT pages-manifest`
  post-build; apagarlo para apps self-contained; (b) `vercel redeploy` de un deployment
  fallido REUSA el snapshot de settings del original — para probar un ajuste hay que crear
  deployment fresco (push o `POST /v13/deployments` con `gitSource`).

### 2026-07-29: Costeo por tarea — un ledger con tarifa ajena y un snapshot con ventanas mezcladas MIENTEN
- **Error(es) (revisita de Fase 1)**: (1) las filas por-tarea de `token_usage` llevaban el
  costo que tarifica el CLI (precios Anthropic) aunque el motor corriera GLM vía z.ai →
  ledger inflado ~12× ($27.13 nominales vs $1.83 reales en julio); el recálculo correcto
  existía pero SOLO en memoria en `cosechar-activos.py` — Mission Control, el corte de
  presupuesto del enjambre y el total mensual veían el número falso. (2) el snapshot
  `presupuesto.json` metía el gasto del DÍA en `costo_total_usd` y sus consumidores
  (alerta 80%, SOUL) lo comparaban contra el presupuesto MENSUAL de $30 → la alerta solo
  habría disparado con $24 en UN día. Nadie lo vio porque cada pieza era coherente por
  separado.
- **Fix**: `ingest-token-usage.py` v3 recalcula y PERSISTE el costo EN LA FUENTE (modelos
  mal-tarifados → siempre tokens×tarifa OpenRouter; resto solo costo=0; sin precio → se
  declara, no se inventa) + snapshot mensual real (el día queda aparte en
  `costo_hoy_usd`) + vistas `v_costeo_tarea`/`v_costeo_departamento`
  (`supabase-costeo-tarea.sql`; `tarea_raiz` suma la feature padre+hijas). Reglas:
  una corrección de datos vive en la FUENTE, no en el consumidor que la descubrió; y
  todo campo agregado de un snapshot declara su VENTANA temporal — mezclar día/mes bajo
  nombres genéricos es mentirle a todos los consumidores a la vez. Bonus: `mes_rango()`
  — un filtro `lte.<mes>-31` revienta el parser de fechas de Postgres en meses cortos
  (bug latente de v2).
- **Aplicar en**: todo ledger alimentado por un CLI/SDK que tarifica a OTRO proveedor,
  todo snapshot con agregados temporales, y toda corrección "en memoria" de datos que
  otros consumidores leen crudos.

### 2026-07-29: Magic link "expirado" al minuto — las URLs por-deployment de Vercel rompen PKCE
- **Error (visto en vivo por la dueña)**: login del copiloto moría con "el enlace expiró
  o no es válido" a los segundos de pedirlo. El token NUNCA estuvo expirado: en los logs
  de auth el `/verify` salió 303 con acción `login`. La causa era de COOKIES: la dueña
  navegaba en la URL por-deployment (`meeting-copilot-<hash>-….vercel.app`, el enlace del
  dashboard/PR de Vercel), el `POST /auth/otp` fijó la cookie PKCE `code-verifier` en ESE
  host, y el correo aterrizó en el dominio canónico (`NEXT_PUBLIC_SITE_URL`) → cookies no
  cruzan hosts → `exchangeCodeForSession` aborta SIN llamar a `/token` (cero rastro en
  Supabase). Diagnóstico decisivo: en `vercel logs`, la columna HOST del `POST /auth/otp`
  ≠ la del `GET /auth/callback`. Daño colateral: cada intento quema el rate-limit de
  correos (2/hora sin SMTP) y el 3º se traga en silencio.
- **Fix**: middleware redirige 308 TODO host no-canónico al canónico cuando
  `VERCEL_ENV=production` (función pura `canonico.ts`, testeada; previews con
  `VERCEL_ENV=preview` y dev local intactos) + el error de `signInWithOtp` se loguea
  server-side aunque la respuesta siga genérica (regla 2026-07-13: ningún best-effort
  silencioso).
- **Aplicar en**: toda app del monorepo con auth por cookie (magic link/PKCE) desplegada
  en Vercel — el mismo patrón canónico va en Mission Control y cliente-web2 si activan
  login; y al diagnosticar auth "que expira", mirar HOSTS en los logs antes que el token.

### 2026-07-30: El tip de un PR de colaborador puede moverse DESPUÉS de tu revisión — diffear lo verificado vs lo mergeado
- **Error(es) (merge del PR #195)**: (1) entre mi fetch de revisión y el merge, Victor empujó
  un commit más a la rama (el ci.yml del punto #6) → lo mergeado ≠ lo que el QA verificó.
  Salió bien porque el delta era benigno, pero el patrón es una mina: la revisión de un PR
  de colaborador vale para un SHA, no para la rama. Antes de mergear: `git fetch` y
  `git diff <sha-verificado>..origin/<rama>` — si hay delta, revisarlo (o re-gatear) antes
  del merge. (2) En el procedimiento de bypass, `gh api -f required_approving_review_count=0`
  manda el valor como STRING y GitHub lo rechaza (422 "is not an integer") → usar **`-F`**
  (tipado). El fallo dejó la protección intacta (fail-safe), pero costó una ventana en falso.
  (3) Un TLS timeout a mitad del merge NO es un merge fallido ni exitoso: verificar
  `gh pr view --json state,mergedAt` antes de reintentar (el reintento ciego puede duplicar
  la ventana de bypass).
- **Aplicar en**: todo merge de PR de colaborador (diff del tip contra lo verificado) y todo
  uso del procedimiento de bypass (`-F` para enteros; verificar estado tras errores de red).

### 2026-08-02: Un departamento nuevo del trío obliga a reconstruir el SUPERVISOR, no solo el Ejecutor
- **Error (cazado al desplegar el buzón, PR #209)**: la imagen viva del `supervisor-a2a`
  llevaba días con **4 departamentos** y sin `chequeos_buzon` → la primera tarea del
  departamento `buzon` habría sido **rechazada** por un juez que no conoce sus gates, con
  el código correcto y desplegado. Es el hermano del gotcha 2026-07-23 (que solo miraba el
  contrato del Ejecutor): un departamento nuevo toca DOS imágenes, y la del juez es la que
  nadie recuerda.
- **Fix**: al dar de alta un departamento, reconstruir Ejecutor **y** Supervisor con el
  trío OCIOSO, y verificar DENTRO del contenedor qué carga la imagen viva
  (`docker exec <c> python -c "import executor; ..."` → N departamentos, gates activos,
  cero chequeos faltantes) ANTES de encolar la primera tarea.
- **Aplicar en**: toda alta de departamento y todo despliegue que cambie el contrato del trío.

### 2026-08-02: Un corpus adversarial encuentra lo que los tests verdes no ven
- **Hallazgo (buzón A2A, PR #208)**: con 80 tests verdes del saneador, el **corpus de
  inyecciones** (62 casos, 10 familias) destapó un hueco real: texto del **mismo color que
  el fondo** (blanco sobre blanco) sobrevivía al saneado y llegaba al modelo. Ningún test
  lo cubría porque los tests prueban lo que el autor imaginó; el corpus prueba lo que
  imagina un atacante.
- **Fix**: `_oculto_por_color` en `saneado.py` (normaliza `#fff`/`white`/`rgb()`), test con
  **control de reversión** (rojo sin el fix) y los dos casos incorporados al corpus, que es
  el artefacto que crece — cada escape encontrado se queda como caso permanente.
- **Aplicar en**: toda superficie que ingiera contenido de terceros (correo, web, adjuntos,
  transcripciones). El corpus es parte del entregable, no una prueba más.

### 2026-08-02: `vercel link` para "solo mirar" conecta el proyecto a GitHub — y rompe los deploys
- **Error (PR #204)**: un `vercel link` corrido únicamente para inspeccionar variables dejó
  `cliente-web2` **conectado a GitHub** (confirmado por API: `link.createdAt`), cuando el
  runbook lo declara deliberadamente **solo-CLI** desde 2026-07-18. Consecuencia: check
  "Vercel – cliente-web2" en rojo en **cada push**, por el choque conocido entre Root
  Directory y monorepo. Ya conocíamos el daño inverso (2026-07-28: conectar sin fijar Root
  Directory publicó una app encima de otra); esta es la misma mina por el otro lado.
- **Fix**: `vercel git disconnect` + redeploy por CLI. Y la regla: `vercel link` **no es
  una lectura** — muta el proyecto; tras usarlo, verificar el estado de la conexión (y
  borrar el `.env.local` que deja, mina de 2026-07-17).
- **Aplicar en**: todo uso de la CLI de Vercel sobre proyectos de este monorepo.

### 2026-08-02: Una doctrina sin gate es una costumbre — el mapa de ruta se congeló 13 PRs seguidos
- **Error**: "mantener docs vivas" era regla del repo desde 2026-06-28 (feedback de Elisa) y
  estaba escrita en CLAUDE.md, en la skill `session-lifecycle` y en la memoria. Aun así,
  entre el PR #197 (07-30) y el #209 (08-02) se fusionaron **13 PRs y ninguno tocó
  ROADMAP/README/CLAUDE.md**: el mapa se leía como si el proyecto se hubiera detenido en la
  Fase 13, mientras en producción ya vivía un departamento nuevo. Lo detectó Victor leyendo
  el ROADMAP, no el equipo ni el CI. Es el mismo patrón de 2026-07-12 (rutinas "documentadas"
  que no existían en `cron list`) y de 2026-07-13 (la garantía serial que era costumbre hasta
  que hubo `asyncio.Lock`): **si la regla no tiene mecanismo, es una intención**.
- **Fix**: gate bloqueante `docs-vivos` en el CI (`scripts/gate-docs-vivos.sh`) — un PR con
  código sustantivo debe tocar un documento vivo, con escapatoria explícita y con motivo
  (etiqueta `sin-impacto-doc` o línea en el cuerpo). Control de reversión hecho contra los 14
  PRs reales del periodo: bloquea los 9 que congelaron el mapa y deja pasar los 5 de
  documentación/CI. Un SPEC o un PROGRESS **no** cuentan como documento vivo: varios de esos
  13 PRs los tocaron y aun así nadie se enteró del avance.
- **Aplicar en**: toda regla de proceso que dependa de que alguien se acuerde. Antes de darla
  por vigente, pregunta qué la haría fallar en rojo — y si nada puede, no está vigente.

### 2026-08-02: Una migración mergeada NO es una migración aplicada (despliegue de App A)
- **Error**: al desplegar `enriquecimiento-a2a`, las 5 tablas del servicio **no existían en el
  Supabase de producción** (404 en las cinco) aunque `supabase-enriquecimiento.sql` llevaba
  días mergeado en master — y `nightly-jobs.sh` ya tenía cableado `vigilancia-69b.py`, que esa
  misma noche habría corrido contra tablas inexistentes. Nadie lo vio porque ningún gate del
  repo toca la BD de prod (hermano de "el repo no es el runtime" 2026-07-12 y "documentado ≠
  aplicado"). El QA del servicio tampoco podía verlo (por contrato no toca prod).
- **Fix (patrón de verificación barato)**: antes de `compose up` de un servicio con tablas
  nuevas, sondear PostgREST desde el server con su propio `.env`: `GET /rest/v1/<tabla>?select=*`
  con `Range: 0-0` → 404 = no aplicada, 200 = viva (sin imprimir secretos). Aplicar por
  management API y re-sondear 404→200. El checklist de deploy de un servicio nuevo es:
  migraciones verificadas → compose up → smoke de protocolo real → cron.
- **Datos duros de esta corrida** (para no re-descubrirlos): el SAT sirve el listado 69-B
  **solo por HTTP** (https://omawww… da timeout, verificado 2026-08-02) → la mitigación es de
  integridad (umbral + guarda de descensos), no TLS; el listado real trae **~14.055 RFCs**
  (umbral 5000 con margen 2.8×); la Agent Card en el wire serializa **camelCase**
  (`supportedInterfaces`, `protocolBinding` — no los nombres snake_case del SDK); y la red del
  compose se llama `businessos_hermes-net` (prefijo del proyecto) para contenedores efímeros.
- **Aplicar en**: todo despliegue de servicio con tablas nuevas en el Supabase compartido y
  todo host-job nuevo cableado a cron (verificar sus insumos en prod ANTES de la primera
  corrida nocturna).

### 2026-08-02: El ciclo REAL destapa lo que los tests verdes no pueden ver (buzón)
- **Error(es)**: el buzón agéntico pasó a producción con 102 tests verdes y dos dry-runs, y
  la primera corrida de verdad destapó CINCO defectos: (1) `AdaptadorGmail` con token
  estático —los de Gmail caducan en 1h—; (2) **nadie orquestaba la redacción**: la cadena
  moría en `correos_entrantes` y el mínimo de 20 borradores era inalcanzable; (3) la columna
  `captar_leads` existía y nadie la leía → 7 leads basura de direcciones noreply en prod;
  (4) `now()-interval'1hour'` mandado **a PostgREST**, que no evalúa SQL en un filtro → 400,
  invisible para los tests porque `MockTransport` responde 200 a cualquier URL; (5) la
  leyenda de divulgación salía vacía porque el compose fija `VAR=` y
  **`os.environ.get(k, default)` NO aplica el default si la clave existe vacía** (usar `or`).
- **Lo que funcionó**: el defecto (5) lo cazó **un gate**, no un test. Un fallo de
  configuración que ninguna suite tenía motivo para sospechar quedó detenido antes de llegar
  a la bandeja de aprobación, con su nombre y su motivo. Los controles deterministas pagan
  justo donde los tests no llegan.
- **Regla**: un dry-run prueba que el código no revienta; solo el ciclo real prueba que el
  sistema hace lo que dice. Antes de dar por viva una cadena de jobs, correrla ENTERA contra
  datos reales y **leer cada línea de su salida** — cuatro de los cinco se veían ahí.
- **Aplicar en**: toda cadena de host-jobs nueva, y todo `os.environ.get` cuyo default importe.

### 2026-08-02: OAuth por buzón, no delegación de dominio (Google no acota por buzón)
- **Error de diseño evitado**: la spec pedía service account con delegación de dominio
  "restringida a los buzones específicos". **Eso no existe en Google**: la delegación concede
  los scopes sobre TODOS los usuarios del dominio y no hay equivalente al
  `ApplicationAccessPolicy` de Microsoft. Montarla para leer un buzón deja en el servidor una
  credencial capaz de leer el correo de toda la organización.
- **Fix**: OAuth de escritorio por buzón — el token solo sirve para quien consintió, así que
  el alcance queda acotado **por construcción**. Y el control positivo del checklist vive en
  el código (`obtener-token-gmail.py`): antes de guardar el token verifica que lee el suyo Y
  que **falla** al leer otro; si lo segundo tuviera éxito, aborta sin guardar.
- **Ojo**: `gmail.modify` INCLUYE enviar (su consentimiento dice "leer, redactar y enviar").
  Para credencial estrictamente solo-lectura hay que pedir `gmail.readonly`.
- **Aplicar en**: toda integración con Gmail/Workspace y cualquier credencial que se declare
  "acotada" — la restricción se demuestra con un control positivo, no se asume.

### 2026-08-02: Nada criptográfico se transcribe desde una imagen
- **Error**: la clave DKIM se leyó de una captura de pantalla y una `l` minúscula se confundió
  con una `I` mayúscula. El resultado decodificaba a un RSA de 2048 bits **perfectamente
  válido** —pasó todas las validaciones estructurales que le hice— pero era OTRA clave. Solo
  lo detectó Google al verificar, tras un ciclo perdido.
- **Fix**: pedir el TEXTO. Y cuando ya hay un valor de referencia, comparar carácter por
  carácter (el diff señaló la posición 215 en un segundo).
- **Hermano del mismo día**: un token de Cloudflare se filtró al pegarlo en un `curl` que lo
  imprime, y acabó en el transcript y en el historial. Los secretos se escriben al archivo
  con `printf ... >> ~/.config/claude/secrets.env`, nunca se muestran.
- **Aplicar en**: claves, tokens, hashes y cualquier base64 — leer desde imagen es adivinar.

### 2026-08-04: Un seed mergeado NO es un seed aplicado — y el camino es upsert en vivo, no recrear el volumen
- **Error (drift cazado por el smoke post-rebuild del grafo)**: el seed de `datos-personales`
  (PR #198, 2026-08-01) llevaba 3 días mergeado y el runtime seguía sirviendo 29 reglas en 4
  dimensiones — **citando además la LFPDPPP 2010 abrogada** (peor que no tener la regla: viola
  la regla de oro del grafo). Causa de diseño, no bug: el seed solo corre al CREAR el volumen
  de `grafo-db`; un `compose up --build` del servicio jamás re-siembra. Hermano del 2026-08-02
  ("una migración mergeada no es una migración aplicada") — mismo pecado, capa de datos del grafo.
- **Fix (procedimiento verificado)**: la doctrina de `db.py` ("reseed real = recrear volumen")
  NO es la única vía y en producción es la peor (destruye el historial de `evaluaciones`, que
  vive en la misma BD). El `02-seed.sql` es **idempotente por diseño** (upserts sobre claves
  naturales en TODAS las tablas, impactos incluidos; `_bajas` con delete+cascade para reglas
  derogadas; una sola transacción): (1) gate `gen_seed_sql.py --check` en dev; (2)
  `docker exec -i grafo-db psql -U grafo -d grafo -v ON_ERROR_STOP=1 < seed/02-seed.sql`;
  (3) `docker restart grafo` — el `lru_cache` de conocimiento/catálogos solo se invalida con
  restart; (4) smoke: conteos esperados, dimensión nueva presente, regla derogada ausente,
  `evaluaciones` intactas. Verificado 2026-08-04: 29→33 reglas, 4→5 dimensiones, 17
  evaluaciones conservadas.
- **Aplicar en**: todo cambio al seed del grafo (el PR que toca `reglas.json` no está terminado
  hasta aplicar el seed al runtime) y todo dato-semilla de servicios con BD propia: preguntar
  siempre "¿esto llega al runtime solo, o alguien tiene que aplicarlo?".

### 2026-08-05: Un rebuild puede ACTIVAR código que la imagen vieja nunca corrió (el 500 del panel en Docker)
- **Error**: al desplegar App C paso 3 se reconstruyó `a2abot` en Hetzner y las 8 rutas del
  panel salieron en **500**: la imagen nueva incluía el middleware de auth (mergeado el
  2026-07-24) y el compose **nunca reenvió** `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` — el
  runbook §5 pedía esas vars desde el mismo día, pero nadie las cableó porque la imagen
  vieja (pre-auth) seguía corriendo y "todo funcionaba". Documentado ≠ aplicado, otra vez:
  la deuda quedó invisible 12 días hasta el primer rebuild (hermano del gotcha 2026-07-23
  "primera reconstrucción tras N días = minas de todo lo integrado en medio").
- **Fix**: el compose reenvía las 3 vars (PR #234); `NEXT_PUBLIC_SITE_URL` se omite a
  propósito en Docker — el fallback al `origin` de la petición manda el magic link al host
  del túnel y evita la mina PKCE de hosts cruzados (2026-07-29). El auth del panel es 100%
  server-side (nadie importa `lib/supabase/client.ts`) → basta runtime env, el Dockerfile
  sigue construyendo sin secretos.
- **Aplicar en**: todo servicio cuyo runtime Docker comparte código con un deploy gestionado
  (Vercel): al mergear una feature que exige env nuevas, cablearlas en TODOS los runtimes
  en el MISMO cambio, no solo donde se va a desplegar hoy. Y el smoke post-rebuild va
  contra el puerto INTERNO real del contenedor (`docker port`), no el que uno recuerda.

### 2026-08-05: Una migración sobre "22 tablas" que en realidad eran 71 — enumerar contra una BD, nunca contra un grep
- **Error(es) al validar la capa de tenencia**: (1) el diseño hablaba de 22 tablas y de DOS
  listas (tenant/global); `public` tenía **71** y **tres** modelos de tenencia conviviendo
  (`tenant_id uuid` nuevo, `tenant_id text` slug en 17 tablas ya en producción, `auth.uid()`
  en las 32 de la cabina control-interno) más el ERP en su propio esquema. Un `grep "create
  table"` daba nombres truncados y se comía un directorio entero por una ruta mal puesta: la
  única enumeración fiable es `information_schema` de una BD donde el esquema se REPLICÓ.
  (2) `add column if not exists tenant_id uuid` sobre una tabla que ya tiene `tenant_id text`
  es un **no-op silencioso**, y el error aparece tres bloques después como un incomprensible
  "incompatible types: text and uuid" que tumba la transacción entera. (3) La migración **no
  era idempotente**: `add constraint ... foreign key` no admite `if not exists` y la 2ª
  corrida moría. (4) La suite jamás se había ejecutado: su siembra (`insert (tenant_id)`)
  fallaba en 26 de 27 tablas, consultaba el registro ya con el rol restringido (permiso
  denegado), y su T9 comprobaba un disparador `deferrable initially deferred` que no se
  pronuncia hasta el COMMIT — daba rojo con el invariante funcionando.
- **Fix / patrones que quedan**: (a) **guarda de colisión** al inicio de la migración que
  falla nombrando tabla y tipo, en vez de reventar tres bloques más tarde; (b) andamiaje
  versionado en `businessos/tenancy/` — prelude (roles, `auth`, extensiones), **manifiesto de
  orden** (el orden real NO es el de los nombres: `fase12-leads-crm` va después de `crm0`) y
  `replay.sh` que imprime cada archivo fallido; (c) **sembrador por introspección** que
  sintetiza las columnas obligatorias, resuelve FK contra el padre del mismo tenant y prueba
  variantes cuando un CHECK cruza dos columnas — recortar el conjunto de tablas para que la
  siembra pase convierte el bucle por-tabla en teatro; (d) la **cobertura es una aserción**,
  no un NOTICE: si una tabla deja de sembrarse, la suite se pone roja en vez de verificar
  menos en silencio.
- **Tres verdades que solo aparecen ejecutando**: `buzon_control` tiene `check (id = 1)` →
  es un singleton y **no puede** ser por-tenant; `buzon_bitacora` y `enriquecimiento_intento`
  son **append-only por disparador** → sus datos de prueba no se pueden retirar, así que la
  suite exige base limpia y aborta si detecta que ya corrió; y en una política **`FOR ALL`
  sin `with check`, Postgres reutiliza la expresión de `using`** → borrar esa línea NO abre
  ningún agujero (el README del repo afirmaba lo contrario). Lo destapó el control de
  reversión: el primer sabotaje "pasó en verde" porque la migración rota no lo estaba.
- **Regla**: un verde que nunca se ha visto en rojo no informa. Todo gate nuevo trae su
  `control-reversion.sh` — romper a propósito de N maneras y exigir que las cace.
- **Aplicar en**: toda migración sobre una BD compartida con historia, toda suite de
  invariantes, y cualquier documento de diseño cuyos nombres de tabla vengan de la memoria.

### 2026-08-06: Un efímero que migra VACÍO no prueba el backfill (cero filas ⇒ cero triggers ⇒ cero verdad)
- **Error(es) (QA adversarial del PR #237, con la suite y los 4 sabotajes EN VERDE)**:
  (1) el backfill de tenencia hacía `update ... set tenant_id` sobre las 17 tablas, y dos
  son **append-only por trigger** (`buzon_bitacora`, `enriquecimiento_intento`): contra una
  base con datos la migración ABORTA entera — y el CI era estructuralmente ciego porque el
  efímero migraba con las tablas vacías (un trigger `for each row` sobre 0 filas jamás
  dispara). La propia doc del PR sabía que eran append-only; nadie lo conectó con su UPDATE.
  (2) La aserción NOT NULL de T11 filtraba `mecanismo = 'crm_slug'`, valor que el CHECK del
  registro ni admite → recorría **0 filas**: código muerto imposible de poner en rojo, con
  un comentario que afirmaba lo contrario.
- **Fix**: (a) backfill sin UPDATE — `add column ... default <org>` (en PG11+ es metadato:
  las filas existentes leen el default sin disparar triggers) y `drop default` inmediato;
  (b) el gate ahora **pre-siembra** las append-only ANTES de migrar y verifica el backfill
  sobre esas filas (`tenancy/01-preseed-produccion.sql` + aserción en `replay.sh`);
  (c) T11 corregida a `slug_text`; (d) ambos defectos quedaron como sabotajes permanentes
  (5 y 6) en `control-reversion.sh` — revertir cualquiera de los fixes pone el gate en rojo.
- **Reglas**: el efímero debe replicar el ESTADO de producción (datos donde los datos
  importan), no solo el esquema; y todo bucle de aserción que filtre filas necesita o una
  aserción de "recorrí > 0" o un sabotaje que lo desenmascare — un bucle sobre 0 filas es
  el gemelo SQL del test que reproduce la lógica que prueba (2026-07-13).
- **Aplicar en**: todo gate con BD efímera, toda migración con backfill sobre tablas con
  triggers, y toda meta-prueba registro-contra-realidad.

### 2026-08-08: Un fallback que degrada "con procedencia declarada" esconde una avería total
- **Error**: el Pre-Discovery de meeting-copilot llevaba **desde su construcción** con los
  **7 bloques LLM caídos en producción** (502 `"no cumplió el contrato"`, 3/3 intentos cada
  uno) y **nadie lo notó**: el pipeline degrada al mock por diseño y lo declara en la
  procedencia del bloque, así que la UI se ve completa y verosímil. El smoke del runbook
  (14 rutas → 200) pasaba con el motor muerto. Lo destapó revisar UN bloque a mano.
- **Causa raíz**: el prompt ordenaba *"Responde SOLO el JSON con la forma exacta pedida"* y
  **la forma no aparecía en ninguna parte** — el modelo (gemini-2.5-flash-lite) envolvía la
  salida en `{"<bloque>": …}` y renombraba `texto`→`descripcion`; el validador, correcto,
  la rechazaba. Fix: la forma se **DERIVA del esquema zod** (`describirEsquema`) y se
  inyecta en el prompt — un contrato que cambia arrastra el prompt consigo, con test
  guardián por bloque. Y para probar que el modelo la OBEDECE (los unit tests solo prueban
  que se la pedimos) hay un **smoke real gated** `PREDISCOVERY_SMOKE_REAL=1`.
- **Dos hermanos del mismo QA**: (a) un **esquema zod paralelo** en la ruta API despojaba
  en silencio `modeloNegocio`/`direccion`/`linkedin` del intake — el modelo los reportaba
  como "no proporcionado" y llegó a listarlo como *debilidad del lead*: **un bug que
  fabrica hallazgos es peor que un bug que rompe**. Un solo esquema compartido, y su
  guardián es un test que compara claves de entrada y salida, **no** el typecheck (probado:
  `z.ZodType<T>` acepta un esquema al que le falta un campo opcional). (b) `extraerUrls`
  ignoraba el `linkedin` del intake pese a tener casilla propia en el formulario.
- **Reglas**: todo camino degradado necesita un modo de VERSE (si "mock declarado" es
  indistinguible de "real" a ojos del usuario, la declaración no informa); todo prompt que
  exija una forma debe LLEVARLA derivada del contrato, jamás describirla a mano ni darla
  por sabida; y un smoke que solo pide 200 a las rutas no verifica el producto — hay que
  ejercitar el motor.
- **Trampa operativa del día**: `git checkout <archivo>` para deshacer un sabotaje del
  control de reversión **borra también los fixes sin commitear** (restaura desde HEAD).
  Commitear ANTES de sabotear, o sabotear sobre una copia.
- **Aplicar en**: todo pipeline con fallback a mock/reglas, todo par prompt↔esquema, toda
  ruta API que valide una entidad que ya tiene tipo, y todo control de reversión.

### 2026-08-06: El efímero replica el REPO, no producción — y los advisors ven lo que el efímero no
- **Hallazgos al aplicar la capa de tenencia a prod** (autorizada por Elisa): (1) el paso
  "enumerar las tablas REALES antes de migrar" del runbook NO era ceremonia: prod tenía
  **62 tablas, no 71** — `egcrm-herramientas` y `fase14-agendamiento` llevaban semanas
  mergeadas sin aplicar, y DOS de las faltantes eran de la lista TENANT (la migración
  habría abortado con `relation does not exist`). Ningún gate lo ve porque el efímero se
  construye desde `orden.txt` (el repo), no desde prod. (2) Tras el apply, `get_advisors`
  levantó 3 hallazgos que el efímero no puede ver: la vista nueva nació **SECURITY
  DEFINER** (default de Postgres; expuesta a anon via PostgREST evade RLS),
  `usuarios`/`org_bitacora` quedaron **sin RLS** (los grants default de Supabase las
  dejaban legibles por anon), y las funciones de `app` sin `search_path` fijado.
- **Fix**: aplicar los archivos faltantes ANTES de la capa (patrón 2026-08-02: sondear,
  aplicar por management API, re-sondear); corregir los 3 hallazgos en prod Y hornearlos
  en `supabase-organizaciones.sql` (security_invoker + revoke, enable RLS, search_path)
  para que efímero y prod no diverjan; gate local re-corrido en verde (13 pruebas, 6/6
  sabotajes).
- **Reglas**: el checklist de toda migración a un Supabase compartido incluye
  `get_advisors` ANTES y DESPUÉS (la línea base de hoy es la referencia de mañana); toda
  vista nueva nace con `security_invoker = true` + revoke anon/authenticated salvo
  decisión escrita; y toda tabla nueva habilita RLS aunque no tenga políticas — sin eso
  los grants default de la plataforma la exponen.
- **Aplicar en**: todo apply a producción, toda vista/tabla nueva en el proyecto
  compartido, y todo runbook con paso "enumera primero" (ejecutarlo, no asumirlo).

*V4: Todo es un Skill. Agent-First. El usuario habla, tu construyes.*
