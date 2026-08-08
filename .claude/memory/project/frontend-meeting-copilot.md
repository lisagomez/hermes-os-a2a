# Meeting Copilot — copiloto comercial de reuniones (frontends/meeting-copilot)

**Estado (2026-07-26):** MVP COMPLETO en PR #154 (`feat/meeting-copilot-mvp`) y
**DESPLEGADO en Vercel** — https://meeting-copilot-pi.vercel.app (proyecto `meeting-copilot`,
cuenta dueña, motor LLM ACTIVO con `OPENROUTER_API_KEY` + `NEXT_PUBLIC_AGENT_ENGINE=llm` en
producción; smoke completo de las 14 rutas + API con respuesta real del modelo). Runbook:
`businessos/frontends/DEPLOY-meeting-copilot.md` — la app es self-contained (sin
design-system `file:`), upload root = el dir de la app. **AUTH ACTIVA desde 2026-07-28
(PR #183)**: magic link + allowlist fail-closed (patrón Mission Control) sobre toda ruta
incl. `/api/asesor/*`; mismo Supabase A2ABot, `PANEL_ALLOWED_EMAILS` = los 5 del equipo,
`NEXT_PUBLIC_SITE_URL` + entrada en el `uri_allow_list` de Supabase. Dev local mock-first
= `AUTH_DISABLED=1` en `.env.local` (el smoke Playwright lo fija en su webServer); gate de
acceso extraído puro en `src/shared/lib/auth/acceso.ts` (testeado sin navegador).
Verificado en prod con sesión mintada por admin API y revocada (doctrina 2026-07-25).
Gotcha de esa verificación: `vercel env pull` devuelve PLACEHOLDER (11 chars) para vars
marcadas sensitive → las keys reales salen de la management API
(`GET /v1/projects/{ref}/api-keys?reveal=true`). Verificado en dev:
42 unit tests + smoke Playwright 12/12 + typecheck/lint/build. Spec en
`businessos/frontends/meeting-copilot/SPEC.md`; aprendizajes en el PRP `prp-meeting-copilot.md`.
Incluye post-MVP por dogfood real de Victor: sección Grabación (MediaRecorder + bitácora con
descargar/compartir + campos asesor/lead), modo asesor (Prompter embebido, mismo motor que
Guided Meeting), transcripción en vivo (Web Speech es-MX), diarización heurística por tono
con corrección de un clic, y MOTOR LLM CONECTADO (OpenRouter server-side): la IA redacta la
siguiente mejor pregunta Y el Discovery Analyst analiza la transcripción real con evidencia
validada por contrato (hallazgo sin respaldo → descartado). Falta solo OPENROUTER_API_KEY
en .env.local para activar la parte IA (todo degrada visible a reglas sin ella).

**Qué es:** cuarta superficie de `businessos/frontends/` — meeting copilot para agentes de
ventas/discovery/CS: audio o transcripción → transcripción diarizada → insights con evidencia
citada → score de discovery explicable (8 dimensiones, gates estilo sup-crm) → guided meeting
(coach con next-best-question y 4 alertas) → resumen/follow-up/CRM notes/riesgos → vista
manager. Shell "Mission Control" propio: sidebar + command bar ⌘K + launcher estilo Google
apps (15 herramientas como data) + theming system/light/dark (tokens CSS, patrón
control-interno). UI es-MX, paleta ejecutiva propia (NO el design system A2A violeta).

**Decisiones clave:**
- 100% mock-first: motor de análisis DETERMINISTA (rules, cero tokens) con seam
  `NEXT_PUBLIC_AGENT_ENGINE=llm` listo; 3 fixtures es-MX co-diseñadas con el léxico
  (scores ~88/35/60) y 20 tests unitarios que fijan los estados por dimensión.
- Contratos espejo de lo existente para migración aditiva: `Segmento` = transcripcion-a2a
  (umbral inaudible 0.5, confianza_global), `Accion` = `tareas_reunion`, etapas = `leads`.
- STT por providers (`NEXT_PUBLIC_TRANSCRIPTION_PROVIDER`): mock activo; adapter real al
  Flask de `altaventasllc-source/transcriptor` (faster-whisper, sin diarización) escrito;
  transcripcion-a2a (:4800) y groq-whisper diseñados. Valor desconocido en un seam → no arranca.
- SOUL de negocio: sección "Enfoque de ventas (vendedor profesional estratégico)" añadida
  ANTES del bloque AUTO TRIO-DOGFOOD. ⚠️ Pendiente post-merge: sync al volumen de Hetzner +
  restart (doctrina 2026-07-12: editar el repo NO despliega).

**Gotchas aprendidos:** en el monorepo, Turbopack infiere la raíz del workspace en el repo y
arrastra `src/middleware.ts` de la app raíz → fijar `turbopack.root` + `outputFileTracingRoot`
en next.config. `eslint-config-next@16` es flat nativo (sin FlatCompat, gotcha ya conocido).

**Roadmap corto:** STT real (gate de la dueña en transcripcion-a2a), motor LLM por el seam,
Supabase (tabla `reuniones` + ancla `reunion_id`), Zoom/Meet/Teams, envío de follow-ups vía
`aprobaciones_salientes`, exponer el Analyzer como servicio A2A hermano.

**Investigación del cliente → grafo regulatorio (decisión de la dueña, 2026-07-26).** Antes de la
entrevista va una feature nueva de **investigación del cliente** (aún sin PRP propio). Su salida es
el **disparador** de la integración del grafo en la entrevista guiada
(`.claude/PRPs/prp-grafo-entrevista-guiada.md`, PR #156): **si la investigación arroja información
que apunte a una vertical regulada, se abre la Fase 0 de ese PRP; si no, no se abre.** Efecto de
diseño: la vertical a sembrar **emerge del pipeline real** en vez de elegirse de un catálogo — el
criterio "cliente real" de la Fase 0 queda satisfecho por construcción.
Dos fronteras que NO se pueden cruzar al construir esa feature: (1) **la investigación no consulta
el grafo** — detecta *señales* de dominio regulado (giro, permisos, sector) y el grafo entra
después, con el campo de operación ya capturado; si la investigación llamara al grafo con texto que
ella misma infirió, rompe el invariante (a) del PRP (inferencia disfrazada de dato). (2) **Señal ≠
dato**: lo que produce es una hipótesis que un humano confirma; `PerfilRegulatorio` sigue siendo un
campo capturado, no derivado.

**Pre-Discovery (rama `feat/pre-discovery`, 2026-07-26):** sección nativa entre lead y
entrevista — intake → pipeline de 8 bloques (real→mock declarado, confidence/provenance y
naturaleza hecho/hipótesis/recomendación por contrato), benchmark de analista, marcos
regulatorio (grafo: proxy `/api/grafo/evaluaciones` con validación estilo grafo-a2a + mock
fiel) y tecnológico, brief del asesor reutilizado en Prompter/Guided/CRM (briefContexto en
usePreguntaIA), Activos Digitales espejo ACT (casos y entrevistas; versiones append-only,
costo=SUMA del ledger con fuente obligatoria), admin del módulo con bitácora, CLIs
copiables, y host-job `businessos/cosechar-prediscovery.py` (export JSON versionado →
erp.act_* con SET ROLE, idempotente por traza, 11 tests). Gotcha pagado: `Card` no
reenviaba `data-testid` (props nativas ahora spreadeadas).

**Hermes-Regulatory-Scan (2026-07-27, skill aportado por Victor e integrado ADAPTADO):**
el dictamen regulatorio de Pre-Discovery ahora lleva el cruce **DECLARADO vs ESPERADO**
(`escaneo-regulatorio.ts`): sector → categorías que el grafo espera → evidencia/hipótesis/
vacío con severidad, cobertura alta/media/baja, ALTA OPACIDAD REGULATORIA y VACÍO DEL
GRAFO (sector sin categorías → no se inventan marcos). Nació del gotcha e-AWB de GAL: el
escaneo directo solo ve lo declarado; la dirección inversa caza lo que el sitio calla.
Retroalimentación al grafo SOLO en modo PROPUESTA (`propuestasSeed` → JSONL → revisión
humana → `grafo/seed/reglas.json` + gate de procedencia). Lo que NO se adoptó del skill
original: `graph_lookup/graph_write` y la ontología de triplets (no existen; el grafo es
motor de reglas — habrían sido una segunda fuente de verdad). La compilación además lee
hasta 2 enlaces internos relevantes del sitio (`extraerEnlacesRelevantes`). Doctrina:
`.claude/skills/hermes-regulatory-scan/SKILL.md`; ampliar un sector = ampliar el seed por
el canal de propuestas Y reflejarlo en el mapa `SECTORES`.

**Familia de skills marca blanca de Pre-Discovery (2026-07-27, 7 en `.claude/skills/`):**
`hermes-source-compilation` (compilar TODAS las fuentes declarando estado) →
`hermes-claims-audit` (interrogar cada claim: ¿qué implicaría que sea verdad? → enruta a
regulatorio/tech/pregunta de discovery; el multiplicador — nació del gotcha e-AWB) →
`hermes-regulatory-scan` + `hermes-tech-stack-scan` (cruce declarado-vs-esperado; tech
implementado 2026-07-27 en `escaneo-tecnologico.ts` — sistema→evidencia, claim→hipótesis,
vacío=oportunidad; una inferencia del stack jamás se auto-confirma) +
`hermes-competitive-deep-research` (competidores verificados, "no identificado" es salida
válida) → `hermes-advisor-brief` (empaquetador: trazabilidad total o se rechaza). Forma:
`hermes-design-integrity` (integridad/elocuencia de componentes panel-adm — nació de la
tabla desalineada y el selector de playbook no persistente). Contrato de evidencia
compartido embebido en cada uno; cada skill declara su estado real de implementación
(implementado/parcial/manual) — jamás finge features.

**QA de Pre-Discovery en producción (2026-08-08, PRs #270/#272/#273) — el módulo llevaba
caído desde el origen.** Revisar UN bloque a mano (FODA, lead legal real) destapó que los
**7 bloques LLM fallaban 3/3** en producción y que todo el Pre-Discovery servía el **mock**.
Nadie lo vio porque el pipeline degrada al mock POR DISEÑO y lo declara en la procedencia:
la UI se ve completa, y el smoke de las 14 rutas del runbook pasaba con el motor muerto.
Causa raíz: el prompt exigía *"la forma exacta pedida"* y **la forma no estaba en ninguna
parte** — el modelo envolvía en `{"<bloque>": …}` y renombraba `texto`→`descripcion`.
Cuatro correcciones, cada una con control de reversión:
(1) `describirEsquema()` **deriva la forma del esquema zod** y la inyecta en el prompt —
no puede desincronizarse; test guardián por bloque.
(2) `IntakeSchema` compartido: la ruta tenía un **esquema paralelo** que despojaba
`modeloNegocio`/`direccion`/`linkedin` en silencio; el analista los veía "no proporcionado"
y llegó a listarlo como **debilidad del lead** — un bug que FABRICA hallazgos es peor que
uno que rompe. Ojo: `z.ZodType<IntakeLead>` **NO** caza un opcional faltante (probado); el
guardián es el test que compara claves.
(3) Truncamiento: `sitio` necesita ~2.650 tokens y el tope era 1.600 → se reportaba como
"JSON inválido". Tope 4.000 + **un reintento** con el motivo de vuelta al modelo. Control
honesto: con el tope viejo el smoke SIGUE pasando — quien sostiene la fiabilidad es el
reintento.
(4) `conceptosRegulatorios` gastaba la mitad de sus 6 espacios en claims de marketing; ahora
mandan los servicios (el caso e-AWB se preserva con test).
**El smoke real es la lección de método**: el primero pasaba 7/7 mientras producción fallaba
—corría sin texto de sitio y **reimplementaba** el camino—. Por eso la llamada vive ahora en
`features/agents/analista-prediscovery.ts` y el smoke gated (`PREDISCOVERY_SMOKE_REAL=1`)
ejercita el camino de producción con el caso difícil.
**Abierto, sin aplicar**: el grafo no reconoce frases naturales de servicio ("derecho
inmobiliario" → `dudoso`; "compraventa de inmueble" → `permitido` con fuente). Hueco de
**keywords** del catálogo, no de reglas; vive en `grafo/seed/reglas.json` con su propio gate
y re-siembra al runtime.
