# PRP-004: Fase 4 — Dashboard Mission Control (A2ABot)

> **Estado**: APROBADO (2026-07-02, tal cual) — en ejecución con bucle-agentico
> **Fecha**: 2026-07-02
> **Proyecto**: BusinessOS

---

## Objetivo

Un panel único de control ("Mission Control") construido sobre el scaffold Next.js
existente en la raíz del repo, que muestra las tres verticales Hermes, el gasto de IA
y las evaluaciones del grafo — leyendo **API + Supabase, sin tocar ningún volumen
`.hermes`** — accesible SOLO por túnel SSH.

## Por Qué

| Problema | Solución |
|----------|----------|
| El estado del sistema está fragmentado: presupuesto se pregunta por Telegram, veredictos viven en Supabase, salud del grafo en un endpoint, y las verticales solo se "ven" por `docker ps` | Una sola pantalla con Pantheon (3 agentes), AI Spend y evaluaciones del grafo |
| El dashboard nativo de Hermes (`hermes-dashboard:9119`) solo vigila UNA vertical y monta su volumen (riesgo de corrupción documentado en `docker-compose.yml`) | A2ABot lee vía API de gateway + Supabase, sin montar volúmenes — es la alternativa que el propio compose ya anticipa |
| Las evaluaciones del grafo se persisten (`evaluaciones` en su Postgres) pero no hay forma de listarlas/inspeccionarlas | Endpoint de solo lectura en el grafo + vista en el dashboard |

**Valor de negocio**: cierra la Fase 4 del ROADMAP y su KPI ("panel único con las 3
verticales, AI Spend y evaluaciones"). Elimina la ceguera operativa: presupuesto,
facturas sin procesar, contratos en revisión y reglas vencidas se ven de un vistazo,
sin gastar tokens preguntándole al agente.

## Qué

### Criterios de Éxito
- [ ] Vista **Pantheon**: las 3 verticales con estado vivo/caído (health del gateway), modelo del cerebro, y sus skills — sin montar ningún volumen `.hermes`
- [ ] Vista **AI Spend**: gasto del mes por vertical y total contra presupuesto ($30/mes, umbral 80% = $24), con serie diaria y desglose por modelo, desde `token_usage` / `v_presupuesto_mensual`
- [ ] Vista **Grafo**: evaluaciones recientes (con veredicto y fuentes), salud del conocimiento (reglas vigentes/por vencer/vencidas), facturas por `deducibilidad_estado`, contratos por estado y cobros en tránsito
- [ ] Cero secretos en el cliente: `SUPABASE_SERVICE_ROLE_KEY` solo en server (Server Components / route handlers); ningún `NEXT_PUBLIC_*` sensible
- [ ] Servicio `a2abot` en `docker-compose.yml`, en `hermes-net`, publicado SOLO en `127.0.0.1` (túnel SSH), con límites de recursos como el resto
- [ ] `npm run build` y typecheck pasan; screenshots Playwright de las 3 vistas con datos (mock en dev, reales en runtime)

### Comportamiento Esperado

Elisa abre un túnel (`ssh -L 9200:localhost:9200 hermes@IP`) y entra a
`http://localhost:9200`. Ve el Mission Control con tres vistas:

1. **Pantheon** — tarjeta por vertical (personal/Kiris, negocio, clientes): estado del
   gateway (vivo/caído/latencia), modelo principal, fallbacks y skills instalados.
2. **AI Spend** — medidor del mes contra $30 (rojo si cruza 80%), serie diaria de costo,
   desglose por vertical y por modelo. Los datos son los mismos que reporta el skill
   `budget-report` (misma fuente: `v_presupuesto_mensual`).
3. **Grafo** — salud del conocimiento (semáforo de vigencias, mismo dato que
   `revisar-vigencias.py`), lista de evaluaciones recientes con veredicto + fuentes +
   disclaimer, facturas por estado de deducibilidad, contratos (borrador → validado /
   en_revision → aprobado → firmado) y cobros Polar con su estado.

Todo es **solo lectura**. El dashboard no ejecuta acciones, no escribe en Supabase, no
toca volúmenes y no habla con los agentes: observa. Las acciones siguen viviendo en
Telegram y en los host-jobs.

En la máquina de desarrollo (sin Docker ni `.env`), `npm run dev` levanta el dashboard
con datos mock (fixtures), igual que el grafo se validó con uvicorn + mock.

---

## Contexto

### Referencias
- `businessos/ROADMAP.md` §FASE 4 — alcance oficial: "A2ABot conectado a las tres verticales por API + Supabase; vistas Pantheon, AI Spend, evaluaciones del grafo"
- `businessos/docker-compose.yml` líneas 112-147 — el dashboard Hermes actual y el comentario que define a A2ABot como la alternativa correcta (lee API + Supabase, sin volumen); patrón de puerto `127.0.0.1` y `GATEWAY_HEALTH_URL=http://hermes-negocio:8642`
- `businessos/supabase-init.sql` — `token_usage`, `facturas`, `v_presupuesto_mensual` (RLS sin políticas: SOLO service_role lee)
- `businessos/supabase-fase3.sql` — `cobros`, `contratos`
- `businessos/grafo/app.py` — endpoints existentes: `GET /health`, `GET /salud-conocimiento`, `POST /evaluaciones`. **No existe listado de evaluaciones** (hay que agregarlo, solo lectura)
- `src/` — scaffold Next.js 16 + React 19 + Tailwind ya presente; `src/features/dashboard/` vacío (components/hooks/services/store/types); `src/lib/supabase/` cliente SSR
- `.claude/memory/reference/supabase-acceso.md` — proyecto Supabase **A2ABot** (ref `hsejpktzcqwkwkwholkw`); service_role vs sbp_
- `.claude/memory/reference/maquinas-entornos.md` — runtime (Docker + .env) vive en la máquina ORIGINAL; aquí solo repo + mocks
- `.claude/memory/project/fase1-eficiencia.md` — presupuesto $30/mes, alerta 80%; fuente única del número: `negocio/MEMORY.md`

### Decisiones de arquitectura

1. **A2ABot = el Next.js de este repo.** No un servicio nuevo aparte: el scaffold ya
   existe y el Golden Path aplica. Se empaqueta como imagen Docker (`output:
   'standalone'`) y se suma al compose como servicio `a2abot` en `hermes-net`.
2. **Solo lectura, server-side.** Toda consulta a Supabase usa
   `SUPABASE_SERVICE_ROLE_KEY` desde el servidor (RLS sin políticas hace inútil al
   anon key — correcto). El browser nunca ve credenciales; recibe HTML/JSON ya resuelto.
3. **Sin Supabase Auth** (YAGNI): un solo usuario, acceso físico por túnel SSH y binding
   `127.0.0.1`. El scaffold `(auth)` queda intacto pero fuera del flujo. Defensa en
   profundidad opcional: basic auth por env vars (mismo patrón que el dashboard Hermes).
4. **Pantheon sin volúmenes.** Estado vivo/caído: fetch server-side a
   `http://hermes-<vertical>:8642` (health del gateway, ya probado por
   `GATEWAY_HEALTH_URL`). Skills/modelo: **snapshot de host-job** (patrón establecido
   Fase 1-3): `snapshot-pantheon.py` lee config/skills de cada volumen (el host sí puede)
   y hace UPSERT a una tabla `pantheon` en Supabase. El dashboard solo lee Supabase.
5. **Evaluaciones del grafo**: se agrega `GET /evaluaciones?limit=N` al grafo (solo
   lectura, sin secretos — consistente con "los agentes lo leen por HTTP"). El dashboard
   lo consume server-side vía `http://grafo:3000` (en dev: mock).
6. **Mocks como ciudadanos de primera**: capa `services/` con interfaz única y dos
   implementaciones (real / fixtures) conmutada por env var, porque esta máquina no tiene
   Docker ni `.env` (aprendizaje Fase 2).

### Arquitectura Propuesta (Feature-First)

```
src/
├── app/(main)/
│   ├── layout.tsx               # shell Mission Control (nav 3 vistas)
│   ├── dashboard/page.tsx       # → Pantheon (o redirect)
│   ├── ai-spend/page.tsx
│   └── grafo/page.tsx
├── features/dashboard/
│   ├── components/              # pantheon/, ai-spend/, grafo/ (UI por vista)
│   ├── services/                # supabase-queries.ts, gateway-health.ts,
│   │                            # grafo-api.ts, mocks/ (fixtures)
│   ├── types/                   # zod schemas de cada payload (validar TODO input)
│   └── hooks/                   # refresco periódico (polling ligero)
└── lib/supabase/                # + cliente admin server-only (service_role)

businessos/
├── snapshot-pantheon.py         # host-job: config+skills por vertical → Supabase
├── supabase-fase4.sql           # tabla pantheon (RLS sin políticas)
├── grafo/app.py                 # + GET /evaluaciones (solo lectura)
└── docker-compose.yml           # + servicio a2abot (127.0.0.1:9200, hermes-net)
```

### Modelo de Datos (nuevo, mínimo)

```sql
-- supabase-fase4.sql — snapshot del Pantheon (lo escribe snapshot-pantheon.py)
create table if not exists public.pantheon (
  vertical    text primary key check (vertical in ('personal','negocio','clientes')),
  bot         text,                 -- @handle del bot Telegram
  modelo      text,                 -- cerebro principal (config.yaml)
  fallbacks   jsonb not null default '[]'::jsonb,
  skills      jsonb not null default '[]'::jsonb,  -- [{nombre, descripcion}]
  snapshot_at timestamptz not null default now()
);
alter table public.pantheon enable row level security;
-- (sin políticas: solo service_role, igual que el resto)
```

Sin cambios a tablas existentes. El grafo no cambia de esquema (la tabla
`evaluaciones` ya existe en su Postgres); solo gana un endpoint de lectura.

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo fases. Las subtareas se generan al entrar a cada fase
> con el bucle agéntico (mapear contexto → generar subtareas → ejecutar).

### Fase 1: Cimiento del dashboard
**Objetivo**: Shell Mission Control funcionando en dev: layout + navegación de las 3
vistas, capa de datos server-only (cliente admin Supabase + fetchers gateway/grafo) con
conmutador real/mock y schemas Zod de todos los payloads.
**Validación**: `npm run dev` levanta el shell con datos mock; typecheck pasa; ninguna
credencial llega al bundle del cliente (verificable en el build).

### Fase 2: Vista AI Spend
**Objetivo**: Gasto del mes vs presupuesto ($30, umbral 80%) con serie diaria, desglose
por vertical y por modelo, desde `v_presupuesto_mensual` + `token_usage`.
**Validación**: con mock reproduce los números del fixture; el fixture replica filas
reales de la primera ingesta; screenshot Playwright de la vista.

### Fase 3: Vista Grafo (evaluaciones + salud + operación)
**Objetivo**: `GET /evaluaciones` agregado al grafo (solo lectura, con tests pytest) y
vista completa: salud del conocimiento, evaluaciones recientes con veredicto/fuentes/
disclaimer, facturas por deducibilidad, contratos por estado, cobros en tránsito.
**Validación**: pytest del grafo verde (incluye el endpoint nuevo); la vista muestra
fuente citada en cada veredicto (regla de oro); screenshot Playwright.

### Fase 4: Vista Pantheon
**Objetivo**: Tabla `pantheon` (supabase-fase4.sql) + host-job `snapshot-pantheon.py`
(patrón snapshot Fase 1-3) + tarjetas por vertical con estado del gateway (health
8642), modelo, fallbacks y skills.
**Validación**: el job corre en seco contra fixtures locales de config; la vista
distingue vivo/caído/sin-dato; screenshot Playwright.

### Fase 5: Empaquetado runtime
**Objetivo**: Dockerfile (standalone) + servicio `a2abot` en `docker-compose.yml`
(hermes-net, `127.0.0.1:9200`, límites de recursos, env vars documentadas en
`.env.example`) y decisión documentada sobre el futuro de `hermes-dashboard` (convive o
se retira).
**Validación**: `docker compose config` valida (con `.env` temporal copia del example —
gotcha conocido); imagen construye local si el daemon está disponible; docs vivas
actualizadas (ROADMAP, BUSINESS_LOGIC, memoria).

### Fase 6: Validación Final
**Objetivo**: Sistema funcionando end-to-end (en dev con mocks; residual explícito el
`up` real en la máquina runtime/Droplet, como en Fases 2-3).
**Validación**:
- [ ] `npx tsc --noEmit` pasa
- [ ] `npm run build` exitoso (sin secretos en el bundle cliente)
- [ ] Playwright: screenshot de las 3 vistas confirma UI con datos
- [ ] Criterios de éxito del PRP cumplidos
- [ ] Residuales listados en ROADMAP (aplicar `supabase-fase4.sql`, cron de
      `snapshot-pantheon.py`, `compose up` de `a2abot` en runtime)

---

## 🧠 Aprendizajes (Self-Annealing)

> Esta sección CRECE con cada error encontrado durante la implementación.

*(vacío — se llena durante la ejecución)*

---

## Gotchas

> Críticos ANTES de implementar

- [ ] **RLS sin políticas es intencional**: el anon key NO sirve para leer nada. Todo
  fetch a Supabase va server-side con service_role. Nunca crear políticas "para que
  funcione el cliente".
- [ ] **Secretos jamás en el transcript ni en `NEXT_PUBLIC_*`** (aprendizaje 2026-06-28):
  referenciar `$SUPABASE_SERVICE_ROLE_KEY` desde env, nunca el literal.
- [ ] **Esta máquina no tiene Docker corriendo ni `.env`** (maquinas-entornos.md): todo
  se valida con mocks/fixtures; `docker compose config` exige un `.env` aunque sea
  copia temporal del example.
- [ ] **Nunca montar volúmenes `.hermes` en A2ABot**: la doc de Hermes advierte
  corrupción con doble escritor; el compose ya define a A2ABot como el dashboard que
  NO toca volúmenes. El snapshot lo hace un host-job.
- [ ] **`package.json` no tiene script `typecheck`** (pese a que CLAUDE.md lo asume):
  agregarlo (`tsc --noEmit`) en Fase 1.
- [ ] **Gráficas**: no hay librería de charts en el Golden Path; preferir SVG propio o
  una dependencia mínima con dynamic import (SSR). Decidir en Fase 2, no antes.
- [ ] **Puerto 9200 solo en `127.0.0.1`**: Docker se salta UFW; el binding localhost es
  la única barrera además del túnel.
- [ ] **Health del gateway**: `GATEWAY_HEALTH_URL` apunta a `:8642`; verificar el path
  exacto de health en runtime (aquí se mockea) y tratar timeout como "caído", no como
  error de la vista.
- [ ] **Todo veredicto del grafo se muestra CON fuente y disclaimer** (regla de oro):
  la UI no resume quitando la cita.

## Anti-Patrones

- NO crear un repo/servicio nuevo para el dashboard: el scaffold Next.js ya existe
- NO exponer puertos públicos ni agregar Caddy: túnel SSH es la política de acceso
- NO escribir desde el dashboard (ni Supabase ni grafo ni agentes): es solo lectura
- NO usar `any` (usar `unknown` + Zod en cada payload externo)
- NO duplicar la lógica de presupuesto: la fuente es `v_presupuesto_mensual`, la misma
  del skill `budget-report`
- NO hardcodear el presupuesto sin comentario de fuente (`negocio/MEMORY.md` es la
  fuente única del $30/mes)

---

*PRP pendiente aprobación. No se ha modificado código.*
