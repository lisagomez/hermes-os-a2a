# Catálogo de Activos Digitales — A2A Factory · Hermes OS

> Inventario de los activos digitales **propios** de la fábrica: qué existe, qué clase de
> activo es, qué servicios del catálogo comercial habilita y cuánto cuesta (construcción,
> operación, réplica). Complementa —no duplica— dos catálogos existentes:
> - `activos-clientes/` = activos **de clientes** (GALMX-NNN, propiedad del cliente).
> - `activos-clientes/_catalogo/servicios.md` = **servicios** contratables (S-xx).
>
> Un S-xx es lo que el cliente contrata; un A2A-NNN es el **medio de producción o el
> producto** que lo hace posible. Ledger machine-readable: `activos.jsonl` (una línea
> por activo, mismo patrón que el ledger GAL).
>
> Análisis completo: 2026-07-26 (Fable 5). Catálogo VIVO: alta al nacer un activo,
> revisión de costos al cierre de cada fase del ROADMAP.
>
> **Encaje con el ERP — ACTUALIZADO 2026-07-26: el módulo `act` ya VIVE.** Este
> catálogo fue el bootstrap manual y cumplió su función: los 23 activos están
> migrados a `erp.act_activo` (ACT-0003..0025, mapeo por `ref_catalogo`) con el
> esquema `erp` aplicado al Supabase compartido. Desde hoy **la BD es la fuente
> DINÁMICA** (cosechador `cosechar-activos.py` + detector `swm-act` semanal:
> "nadie mantiene el inventario a mano") y este archivo queda como referencia
> legible + registro del esquema de costeo; las ALTAS nuevas nacen en la BD, no
> aquí. La clasificación de defensibilidad sigue como PROPUESTA hasta la
> ratificación humana (D-10) y nada es asiento contable hasta la firma del
> contador en `erp/reglas/act-contable.md` (D-07). Detalle:
> `.claude/memory/project/erp-modulo-act.md`.

---

## Definición operativa

**Activo Digital**: artefacto digital discreto, propiedad de la fábrica, con valor
replicable por al menos una de tres vías:
1. **Instanciable** — se vende/configura para un cliente (white-label, SaaS).
2. **Palanca** — baja el costo marginal de producir lo demás (fábrica, skills, CLIs).
3. **Conocimiento acumulado** — curado con procedencia, costoso de reconstruir
   (seed regulatorio, doctrina, investigación de mercado).

Lo que NO entra: entregables de clientes (viven en `activos-clientes/<slug>/`),
credenciales/secretos (no son activos, son accesos), y el código de terceros.

## Etiquetado

- **ID**: `A2A-NNN` (paralelo a `GALMX-NNN`). El catálogo es la fuente de verdad del
  etiquetado; **no** se insertan bloques de etiqueta en código de producción vivo.
- **Regla para activos nuevos tipo entregable** (documentos, mocks, specs standalone):
  sí llevan bloque inline, adaptado del patrón GAL:

```html
<!-- ═══════════════════════════════════════════════════
     ACTIVO DIGITAL PROPIO — A2A Factory · Hermes OS
     ID     : A2A-NNN
     Clase  : PRODUCTO|FABRICA|CONOCIMIENTO|DISEÑO|COMERCIAL|INFRA
     Estado : produccion|beta|blueprint
     ═══════════════════════════════════════════════════ -->
```

**Clases:**

| Clase | Qué agrupa | Vía de valor |
|---|---|---|
| `PRODUCTO` | Sistemas instanciables/vendibles como están | Instanciable |
| `FABRICA` | Medios de producción (trío, skills, CLIs) | Palanca |
| `CONOCIMIENTO` | Bases curadas con procedencia | Conocimiento |
| `DISEÑO` | Design systems y metodologías de marca | Instanciable + palanca |
| `COMERCIAL` | Material GTM/propuestas reutilizables | Palanca |
| `INFRA` | Blueprints de despliegue y operación | Palanca |

**Estados:** `produccion` (vivo y verificado en runtime) · `beta` (construido, con
gates pendientes) · `blueprint` (diseñado/validado, no desplegado).

**Ejes ERP (§1.7 del maestro, ortogonales a la clase):**

| Eje | Valores | Consecuencia |
|---|---|---|
| **D+I** (¿cómo nació?) | `investigacion` (exploración sin beneficio identificable aún → GASTO del periodo, NIF C-8, sin excepción) · `desarrollo` (beneficio económico identificable → CAPITALIZABLE si cumple la política auditada) | Tratamiento contable + evidencia para estímulos I+D (EFIDT, D-11) |
| **Defensibilidad** (¿qué lo hace difícil de copiar?) | `defendible` (el foso: fuentes citadas, reglas auditadas, arquitectura probada, datos operativos, marca) · `reemplazable` (la prueba del foso: si un competidor con Claude Code lo reproduce en semanas, su valor es VELOCIDAD y costo, no exclusividad) | Dónde se invierte en protección; qué puede salir del edificio (white-label = el cliente recibe USO, jamás fuentes de defendibles) |

> ⚠️ **Toda clasificación de defensibilidad de este catálogo es PROPUESTA.**
> El maestro es explícito (§1.7 consecuencia 4): cambiarla —y por extensión,
> asignarla— es DECISIÓN HUMANA, nunca de un agente. Pendiente de ratificación
> por Elisa; el eje D+I retroactivo lo valida el contador.

---

## Esquema de costeo

Cuatro componentes por activo, cada uno con `fuente` declarada — regla heredada del
ledger GAL: **nunca aparentar precisión que no hay**. `no_medido` es un valor honesto.

| Componente | Qué mide | Fuentes válidas |
|---|---|---|
| **Construcción** (hundido) | Tokens de sesiones dev + corridas del trío + horas de aprobación humana | `token_usage` (vertical `trio`), datapoints del ROADMAP, `/cost` de sesión; pre-ledger = `no_medido` |
| **Operación mensual** | Infra prorrateada + tokens runtime | Hetzner cx33 **$8.99/mes** (todo el sistema); Supabase free tier $0; Vercel Hobby $0; runtime medido por `token_usage` |
| **Réplica** (marginal) | Instanciar para UN cliente nuevo: config + marca + gates, no código | Estimación por sesiones equivalentes; referencias reales: activo GAL 27.4k tokens, feature trío $1.62 nominal |
| **Reposición** | Reconstruirlo desde cero HOY usando la propia fábrica | Rango basado en dogfoods medidos: feature aprobada por el trío ≈ **$1.6–$20 nominal** (~1/6 real vía z.ai) |

**Datos base medidos (2026-07-26, `token_usage`):**

| Métrica | Valor | Ventana |
|---|---|---|
| Construcción vía trío (27 tareas) | **$33.29 nominal** (1.39M in / 477k out) | 11–24 jul |
| Runtime vertical negocio | $3.21/mes | 28 jun–25 jul |
| Runtime vertical personal | $1.01/mes | 30 jun–26 jul |
| Runtime vertical clientes | $0.02/mes | 30 jun–17 jul |
| Infra total (Hetzner cx33, 15+ servicios) | $8.99/mes | fijo |
| **Sistema completo en operación** | **≈ $13.2/mes** | tokens + infra |

Datapoints de build (ROADMAP, tarifa nominal Anthropic; real ≈ 1/6 vía z.ai):
feature de enjambre aprobada **$1.62** · build-spec 5 ítems Procesos **$19.9** ·
plan de autonomía CRM **$3.03** · mock HTML entregable (GAL) **27.4k tokens**.

> Nota honesta: las Fases 0–8 se construyeron en sesiones Claude Code **antes** de que
> existiera el ledger — su costo de construcción real es `no_medido` y no se inventa.
> Para esos activos el número útil es **reposición** (qué costaría hoy con la fábrica).

---

## Índice

| ID | Activo | Clase | Estado | Habilita |
|---|---|---|---|---|
| A2A-001 | Verticales Hermes white-label | PRODUCTO | produccion | S-05, S-06 |
| A2A-002 | Grafo regulatorio (motor + API + A2A) | PRODUCTO | produccion | S-08, S-09 |
| A2A-003 | CRM conversacional marca blanca | PRODUCTO | produccion | S-05 |
| A2A-004 | Mission Control (dashboard a2abot) | PRODUCTO | produccion | — |
| A2A-005 | Meeting Copilot | PRODUCTO | beta | línea white-label futura |
| A2A-006 | cliente-web2 + chat-web2 | PRODUCTO | produccion | S-03, S-04, S-07 |
| A2A-007 | control-interno (cabina) | PRODUCTO | produccion | uso interno |
| A2A-008 | transcripcion-a2a | PRODUCTO | beta | S-09, A2A-005 |
| A2A-009 | ventas-a2a + edge | PRODUCTO | produccion | motor comercial |
| A2A-010 | ERP agéntico (ERP-0) | PRODUCTO | blueprint | línea ERP |
| A2A-011 | El trío + enjambre + cola | FABRICA | produccion | S-01…S-09 |
| A2A-012 | Fábrica de Smart Contracts | FABRICA | beta | S-08 |
| A2A-013 | Skills de la fábrica (~38) | FABRICA | produccion | todo |
| A2A-014 | Printing Press: CLIs + auditoría | FABRICA | produccion | S-09 |
| A2A-015 | Host-jobs + patrón secret-scrubbing | FABRICA | produccion | operación |
| A2A-016 | Seed regulatorio citado (29 reglas) | CONOCIMIENTO | produccion | A2A-002 |
| A2A-017 | Inteligencia de mercado | CONOCIMIENTO | produccion | GTM |
| A2A-018 | Marco de gobernanza IA | CONOCIMIENTO | produccion | ventas enterprise |
| A2A-019 | Doctrina de fábrica (auto-blindaje) | CONOCIMIENTO | produccion | todo |
| A2A-020 | Design system A2A Factory | DISEÑO | produccion | S-01…S-04 |
| A2A-021 | Metodología branding de cliente | DISEÑO | produccion | S-01, S-02 |
| A2A-022 | Blueprints comerciales | COMERCIAL | produccion | pipeline |
| A2A-023 | Blueprint de operación (compose + runbooks) | INFRA | produccion | todo |

---

## Clasificación ERP por activo (PROPUESTA — pendiente de Elisa/contador)

Criterio aplicado: los ejemplos explícitos del maestro §1.7 donde los hay; la
"prueba del foso" (¿lo reproduce un competidor con Claude Code en semanas?) donde no.

| ID | D+I | Defensibilidad | Por qué |
|---|---|---|---|
| A2A-001 | desarrollo | **defendible** | "Arquitectura y nomenclatura A2A como sistema probado" (§1.7 explícito); el código en sí es reproducible, el sistema probado no |
| A2A-002 | desarrollo | **defendible** | "El grafo fiscal con sus fuentes" (§1.7 explícito). White-label: USO (API/veredictos), jamás fuentes |
| A2A-003 | desarrollo | reemplazable | Código reproducible en semanas; sus gates/reglas y los datos por tenant sí son defendibles (van con A2A-011/019 y los DATOS) |
| A2A-004 | desarrollo | reemplazable | Frontend sobre patrones propios; valor = velocidad + vitrina |
| A2A-005 | desarrollo | reemplazable | Frontend + motor determinista replicable; valor = velocidad y time-to-market |
| A2A-006 | desarrollo | reemplazable | "Frontend sobre template" (§1.7 explícito) |
| A2A-007 | desarrollo | reemplazable | Ídem |
| A2A-008 | desarrollo | reemplazable | Glue sobre faster-whisper |
| A2A-009 | desarrollo | reemplazable | Código reproducible; los claims curados y fronteras viven en reglas (defendibles vía A2A-011) |
| A2A-010 | desarrollo | **defendible** | Know-how profundo del dominio (NIF/CFDI/folios/RLS multi-tenant): las decisiones tomadas son lo caro, no el SQL |
| A2A-011 | desarrollo | **defendible** | "Arquitectura A2A como sistema probado" (§1.7 explícito) + los DATOS de token_usage que produce ("benchmark que nadie más tiene") |
| A2A-012 | desarrollo | **defendible** | Plantillas AUDITADAS con firma de auditor — "eso no se clona" (§1.7 explícito) |
| A2A-013 | desarrollo | **defendible** | Know-how curado destilado de errores pagados; secreto industrial exige medidas demostrables (repo privado, expediente en act) |
| A2A-014 | desarrollo | reemplazable | "CLIs genéricos" (§1.7 explícito); el activo defendible asociado es el manifiesto+gotchas (doctrina) |
| A2A-015 | desarrollo | reemplazable | "Glue code" (§1.7 explícito); el PATRÓN secret-scrubbing es doctrina (A2A-019) |
| A2A-016 | desarrollo | **defendible** | Reglas con fuente primaria verificada = know-how del foso (§1.7 explícito) |
| A2A-017 | investigacion | reemplazable | Research reproducible (~$5-20); GASTO del periodo por NIF C-8 |
| A2A-018 | desarrollo | reemplazable | Un consultor bueno lo redacta en semanas; valor = velocidad + señal enterprise |
| A2A-019 | desarrollo | **defendible** | El foso por definición: irreproducible sin re-vivir los errores. Subproducto de la operación (contablemente ya gastado) |
| A2A-020 | desarrollo | **defendible** | "La marca" (§1.7 explícito): identidad visual A2A Factory |
| A2A-021 | desarrollo | reemplazable | Proceso reproducible; valor = velocidad de ingesta |
| A2A-022 | desarrollo | reemplazable | Documentos re-derivables del conocimiento del dominio |
| A2A-023 | desarrollo | reemplazable | Runbooks re-escribibles; lo que los hace buenos es la doctrina (A2A-019) |

**Resumen propuesto: 9 defendibles / 14 reemplazables.** El foso queda en: grafo +
seed (motor y conocimiento), trío + skills (fábrica probada), fábrica SC (auditoría),
ERP (know-how), doctrina, marca, y el patrón de verticales como sistema.

---

## Fichas

### PRODUCTO

**A2A-001 · Verticales Hermes white-label** — `produccion`
Patrón completo de agente conversacional por Telegram/Slack: contenedor aislado +
SOUL/AGENTS/MEMORY + volumen uid-10000 + allowlist + routing de modelos con caché.
3 instancias vivas (personal/negocio/clientes) en Hetzner. Es el molde de S-06.
- Construcción: `no_medido` (pre-ledger, Fases 0–1).
- Operación: $4.24/mes tokens (3 verticales, medido) + share infra.
- Réplica: alta de vertical = config + SOUL/AGENTS + BotFather; est. 1–2 sesiones,
  **$2–5 nominal** (fuente: estimación por sesiones equivalentes).
- Reposición: patrón documentado en runbooks; semanas→días con la fábrica.

**A2A-002 · Grafo regulatorio** — `produccion`
FastAPI + Postgres propio + evaluador puro fail-safe (`dudoso` sin fuente, disclaimer
siempre) + wrapper A2A (`grafo-a2a`). 7 días uptime, 29 reglas, consumido por bots
(REST sin secretos) y host-jobs (`evaluar-facturas.py`). El conocimiento vive aparte
(A2A-016) — este activo es el **motor**.
- Construcción: `no_medido` (Fases 2/3/8 pre-ledger).
- Operación: share infra (~$0.6/mes prorrateo simple 15 servicios); tokens $0 (es
  determinista — esa es su gracia).
- Réplica: mismo motor, otro seed → **$0 de código**; el costo real es sembrar
  el dominio (ver A2A-016).
- Reposición: motor+API+tests ≈ 3–5 features de trío → **$5–100 nominal** (rango
  amplio declarado: no hay dogfood de reconstrucción).

**A2A-003 · CRM conversacional marca blanca** — `produccion`
`crm-canales` + `sup-crm` multi-tenant (`crm_tenants`, slug = tenant_id) + supervisor
de salientes con gate humano + plan de autonomía D-40. El de ciclo de venta más corto
según GTM §4.
- Construcción: plan de autonomía **$3.03 nominal** medido (122k/38k); núcleo
  pre-ledger `no_medido`.
- Operación: share infra; tokens por tenant medibles vía `token_usage` (la tesis
  "margen conocido antes de firmar").
- Réplica: alta = credenciales del canal + branding + reglas; est. **$3–8 nominal**.
- Reposición: ≈ 5–10 features de trío → **$10–200 nominal**.

**A2A-004 · Mission Control** — `produccion`
Dashboard a2abot (Vercel + Docker): 6 vistas con datos reales (Pantheon, AI Spend,
grafo, desarrollo), auth magic link + allowlist fail-closed, PWA con SW conservador.
Vitrina operativa — lo que un prospecto ve funcionando.
- Construcción: `no_medido` (Fase 4 pre-ledger); fixes recientes vía PRs medibles.
- Operación: $0 (Vercel Hobby) + share Supabase free.
- Réplica: por cliente requeriría multi-tenant (hoy single-tenant) — **no instanciable
  aún**, valor actual = vitrina + operación propia.
- Reposición: ≈ 10+ features → **$20–200 nominal**.

**A2A-005 · Meeting Copilot** — `beta`
Copiloto comercial de reuniones (4ª superficie frontends): transcripción diarizada →
insights con evidencia → score explicable 8 dimensiones → guided meeting → vista
manager. Motor determinista (cero tokens) + motor LLM conectado con validador de
evidencia. 49 tests + smoke 12/12. Gates de la dueña: STT real, Supabase, Zoom/Meet.
- Construcción: `no_medido` en ledger (sesiones dev 24–26 jul; PR #154 + #155).
- Operación: $0 hoy (mock-first local; con `llm` activo, por uso vía OpenRouter).
- Réplica: es single-tenant local aún; white-label = roadmap post-MVP.
- Reposición: MVP completo ≈ 8 fases de PRP → **$50–300 nominal** (estimación
  gruesa declarada; sin dogfood de reconstrucción).

**A2A-006 · cliente-web2 + chat-web2** — `produccion`
Landing bilingüe + cotizador deck-builder (8 A2A Cards) + chat de venta SSE real que
captura leads origen `web2` (escritor único). Desplegada en Vercel.
- Construcción: `no_medido` (Fases 8/11 pre-ledger).
- Operación: $0 Vercel + daemon chat-web2 en share infra.
- Réplica del patrón para un cliente (S-03/S-04): referencia real GAL = **27.4k
  tokens por mock**; sitio completo est. **$5–15 nominal**.
- Reposición: ≈ **$30–150 nominal**.

**A2A-007 · control-interno** — `produccion`
Cabina interna (frontend-ci, 31 tablas propias sobre el Supabase compartido, trigger
`handle_new_user` fusionado). Uso interno; no instanciable sin trabajo de separación.
- Construcción: `no_medido`. Operación: share. Réplica: n/a (interno).
- Reposición: **$50–300 nominal** (superficie grande).

**A2A-008 · transcripcion-a2a** — `beta`
Servicio A2A de STT (:4800) con contrato de segmentos (confianza, umbral inaudible
0.5) espejado en Meeting Copilot y adapter al Flask `transcriptor` externo. Motor
real (faster-whisper) = gate de la dueña.
- Construcción: `no_medido`. Operación: $0 (no desplegado con motor real).
- Réplica: n/a hasta cerrar gate. Reposición: **$5–30 nominal**.

**A2A-009 · ventas-a2a + edge** — `produccion`
Card comercial A2A pública en internet (Caddy TLS + rate-limit 30 req/min) con
fronteras negativas literales (no cierra, no firma, no fija precios). Primer agente
comercial expuesto; recibe interés y comparte oferta aprobada.
- Construcción: `no_medido` (Fase 9). Operación: share infra.
- Réplica: card por cliente = config → **$1–3 nominal**.
- Reposición: **$10–50 nominal**.

**A2A-010 · ERP agéntico (ERP-0)** — `blueprint`
Fundación validada en Postgres efímero (4 migraciones), integración Arkham diseñada,
packs y reglas. ERP-1 bloqueado por D-03 (stack de CLIs). No desplegado.
- Construcción: `no_medido`. Operación: $0. Réplica: n/a.
- Reposición: es el blueprint mismo — su valor es evitar re-diseñar (semanas de
  decisiones ya tomadas).

### FABRICA

**A2A-011 · El trío + enjambre + cola** — `produccion`
Ejecutor + Supervisor + Coordinador (A2A) + cola con recuperación de huérfanas +
worktrees + gates npm reales + presupuesto por tarea + reintentos de transitorios +
motor pluggable (Claude/GLM vía env). El medio de producción central: **software
verificado sin humano en el loop de construcción** (humano en el de aprobación).
- Construcción: **$33.29 nominal medido** (27 tareas del ledger; núcleo Fases 6/7/10
  pre-ledger `no_medido`).
- Operación: share infra; costo por tarea medido por `token_usage.task_id`.
- Réplica: n/a (no se vende el trío; se vende lo que produce).
- Valor operativo medido: feature aprobada **$1.62 nominal / ~$0.27 real** — este
  número ES el costo marginal de producción de software de la fábrica.

**A2A-012 · Fábrica de Smart Contracts** — `beta`
`fabrica-sc` (Fabric) + departamento F12 (fases 1-4 integradas): spec confirmada →
paquete auditado con hash y lineage. Fases 5-6 + firma de auditoría pendientes.
Evolucionó la carta #20 del mazo (Constraint + Proof).
- Construcción: parcialmente en ledger trío (dentro de los $33.29).
- Operación: $0 hasta desplegar. Réplica: fee de fabricación por contrato (modelo
  GTM). Reposición: **$20–100 nominal**.

**A2A-013 · Skills de la fábrica** — `produccion`
~30 skills de `.claude/skills/` (consejo, orquestar-agentes, prp, bucle-agentico,
memory-manager, session-lifecycle, website-3d…) + 8 de adquisición en
`negocio/skills/` + trio-software. Procedimientos ejecutables, no docs: cada una
codifica un flujo que ya no se re-razona.
- Construcción: `no_medido` (acumulado de meses).
- Operación: $0 (texto). Réplica: copiar (costo 0) — su valor es el curado.
- Reposición: irreproducible sin re-vivir los errores que las produjeron (ver
  A2A-019); estimación no honesta → `no_estimado`.

**A2A-014 · Printing Press: CLIs + auditoría** — `produccion`
4 CLIs impresos (digitalocean A/87, supabase A/87, telegram A/83, hcloud dogfood
PASS tras amend 2026-07-26) + `cli-audit.py` con índice versionado + manifiesto por
fases. Un CLI impreso = ~0 tokens por ejecución (el trabajo lo hace el binario Go).
- Construcción: `no_medido` (impresiones jun-jul).
- Operación: $0. Los binarios viven FUERA del repo (`~/printing-press/library/`,
  221 MB; solo el índice viaja en git — decisión 2026-07-26).
- Réplica: imprimir CLI nuevo ≈ 30–60 min de sesión, costo bajo en modo codex.
- Reposición: re-imprimir desde specs → barato; el activo real es el manifiesto +
  gotchas de impresión documentados.

**A2A-015 · Host-jobs + patrón secret-scrubbing** — `produccion`
15+ jobs de confianza del host (ingest-token-usage, ingest-facturas,
evaluar-facturas, polar-cobros, inject-presupuesto, backups, cli-audit, nightly) +
el patrón arquitectónico: credenciales solo en host, agente lee snapshots. 10 crons
vivos en el servidor.
- Construcción: `no_medido`. Operación: $0 marginal (corren en el cx33).
- Réplica: por cliente según integración (S-09). Reposición: **$10–60 nominal**.
- ⚠️ Deuda conocida: `evaluar-facturas.py` completo pero SIN agendar (2026-07-26).

### CONOCIMIENTO

**A2A-016 · Seed regulatorio citado** — `produccion`
29 reglas / 32 impactos con fuente primaria + URL + vigencia (LISR/CFF/SAT MX, ET CO,
NIF, CCF/CCo/LFPDPPP, LAC/NOM-107/LISF) + gate de procedencia (`gen_seed_sql.py`) +
plantilla investigación→seed (PR #144). El activo NO es el JSON: es la **procedencia
verificada** — cada regla costó investigación con fuente oficial.
- Construcción: `no_medido` (investigación Fases 2/3/8).
- Operación: cron `revisar-vigencias.py` (share). Un grafo desactualizado "miente
  con certeza" — el mantenimiento ES parte del activo.
- Réplica: **sembrar un dominio nuevo = el costo real del producto grafo** —
  ≤2 categorías/~6 reglas por vertical (criterio Fase 0 del PRP grafo-entrevista).
- Reposición: por regla con fuente verificada; irreducible a tokens (juicio humano
  + fuente oficial). `no_estimado` en USD; en tiempo: días por dominio.

**A2A-017 · Inteligencia de mercado** — `produccion` (vigencia ~6 meses)
Catálogo de 60 agentes fabricables con señal de demanda citada (`catalogo-agentes.md`)
+ análisis de competencia Houston (3 docs + auditoría de seguridad) + análisis
solopreneurs. Insumo directo del mazo de cartas y del GTM.
- Construcción: fan-out 2 subagentes Sonnet (2026-07-18), costo de sesión `no_medido`.
- Operación: re-validar ~cada 6 meses (la data envejece — regla del propio catálogo).
- Reposición: **$5–20 nominal** (fan-out de research reproducible).

**A2A-018 · Marco de gobernanza IA** — `produccion`
`gobernanza/`: adenda ISO 42001, modelo de amenazas v1, ciclo de vida, adenda web
agéntica. Diferenciador en ventas enterprise (nadie del tamaño de la fábrica llega
con esto escrito) y requisito para verticales reguladas.
- Construcción: `no_medido`. Operación: $0 (revisión por release mayor).
- Réplica: adaptación por cliente enterprise → **$2–5 nominal**.
- Reposición: **$10–40 nominal** + juicio.

**A2A-019 · Doctrina de fábrica (auto-blindaje)** — `produccion`
40+ aprendizajes datados en CLAUDE.md + memoria de proyecto (`.claude/memory/`) +
PENDIENTES/gotchas. Cada entrada = un error real pagado una vez y blindado ("el mismo
error NUNCA ocurre dos veces"). Es el activo que hace baratos a todos los demás.
- Construcción: el costo fue **los errores mismos** (SSH perdido, tokens filtrados,
  volúmenes divergentes…) — `no_medido` y no repetible.
- Operación: disciplina de actualización post-cambio (regla docs-vivas).
- Réplica/Reposición: **irreproducible** — no se compra, se acumula. `no_estimado`.

### DISEÑO

**A2A-020 · Design system A2A Factory** — `produccion`
Paquete local `@a2a/design-system` (`file:`, transpilePackages) + skill
`a2a-factory-design` + sistema visual del ser-ia + iconografía del mazo. Consumido
por cliente-web2; base de S-01…S-04.
- Construcción: ZIP de la dueña + integración `no_medido`.
- Operación: $0. Réplica: aplicar a superficie nueva ≈ **$2–8 nominal**.
- Reposición: **$15–60 nominal** (sin contar el criterio de diseño de la dueña).

**A2A-021 · Metodología branding de cliente** — `produccion`
El patrón GAL generalizado: branding ingerido → BRANDING.md + tokens CSS + skill de
diseño dedicada + etiquetado GALMX-NNN + ledger de costo. Primer caso completo:
gal-mexico. Es el molde de S-01/S-02 — el branding de cada cliente es SUYO; la
metodología es nuestra.
- Construcción: `no_medido` (caso GAL, jul 2026).
- Réplica: **ingesta de marca nueva ≈ $3–8 nominal** (referencia: activo GAL
  27.4k tokens); es exactamente lo que se cobra en S-02.
- Reposición: **$5–15 nominal**.

### COMERCIAL

**A2A-022 · Blueprints comerciales** — `produccion`
Propuestas redactadas y reutilizables: CRM marca blanca (5 docs), ERP logística
(2), lector OCR, oportunidad seguros de carga (validada con gate de discovery),
GTM completo con presentación HTML, plan de escalamiento. Pipeline sin empezar
de cero.
- Construcción: `no_medido`. Operación: $0.
- Réplica: personalizar propuesta ≈ **$1–3 nominal** (`personalizar-deck.py` existe).
- Reposición: **$10–40 nominal**.

### INFRA

**A2A-023 · Blueprint de operación** — `produccion`
`docker-compose.yml` (15+ servicios en hermes-net), runbooks FASE0/FASE0-hetzner,
patrón de migración de verticales (token por-máquina, volúmenes uid-10000), backups
nocturnos a GitHub, edge Caddy, hardening SSH. Todo el sistema corre por
**$8.99/mes** — ese número es el activo.
- Construcción: `no_medido` (+ los errores que lo blindaron, ver A2A-019).
- Operación: $8.99/mes (es el costo, no lo tiene).
- Réplica: aprovisionar servidor gemelo ≈ **$2–5 nominal** + 1h humana (runbook
  probado en la migración real del 2026-07-05).
- Reposición: **$10–50 nominal** con los runbooks; sin ellos, semanas.

---

## Lecturas del análisis (2026-07-26)

1. **La fábrica opera con margen estructural**: producir una feature verificada
   cuesta **$1.62 nominal (~$0.27 real)** y todo el sistema corre por **~$13/mes**.
   El esquema de costeo confirma la tesis GTM §8: margen conocido antes de firmar.
2. **Los activos más valiosos son los no-replicables**: A2A-019 (doctrina) y
   A2A-016 (seed con procedencia) no se pueden comprar ni regenerar con tokens —
   son el foso. Los productos (A2A-001…010) son reponibles por la propia fábrica.
3. **Concentración de riesgo**: 5 activos en `beta`/`blueprint` esperan gates de la
   dueña (STT, Fabric 5-6, ERP D-03). El catálogo los marca — no prometer en
   propuestas lo que está 🚧 (regla del catálogo S-xx).
4. **Deuda visible**: `evaluar-facturas.py` sin agendar (A2A-015) y Mission Control
   single-tenant (A2A-004) son las dos brechas señaladas por el propio costeo.
5. **Brecha de separación física (ERP §1.7 consecuencia 2)**: el maestro exige
   defendibles en repos de acceso mínimo y desarrollo entregable aparte. HOY los 9
   defendibles propuestos conviven con todo lo demás en UN repo personal donde los
   4 colaboradores tienen write (gotcha GitHub 2026-07-12: en repo personal todo
   colaborador es write, sin forma de bajarlo). Decisión pendiente de la dueña:
   migrar a Organización (roles reales) y/o separar repos antes de que el primer
   white-label entregue fuentes. El secreto industrial solo protege con "medidas
   razonables DEMOSTRABLES" — hoy el expediente no existiría.
6. **Capitalización**: nada de este catálogo es asiento contable. El eje D+I
   retroactivo es propuesta para el contador (política de capitalización auditada,
   NIF C-8); los encargos futuros la declaran EN ORIGEN vía `sis_encargo` (ERP).
