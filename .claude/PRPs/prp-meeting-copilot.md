# PRP — Meeting Copilot (MVP · Mission Control comercial de reuniones)

> Estado: PENDIENTE de aprobación · Rama: `feat/meeting-copilot-mvp` · 2026-07-25
> Spec fuente: `businessos/frontends/meeting-copilot/SPEC.md` (Fase 2 aprobada en conversación).
> Solicitante: Victor. Decisiones tomadas: SOUL de ventas → `negocio/SOUL.md`; UI es-MX.

## Objetivo

MVP funcional y demo-ready de un meeting copilot para agentes comerciales: audio/transcripción
→ transcripción diarizada → insights con evidencia → score explicable → guided meeting →
workspace post-reunión → vista manager; operado desde un shell Mission Control con launcher de
herramientas y theming system/light/dark. Nueva superficie `businessos/frontends/meeting-copilot/`.

## Por qué

- Estandariza el discovery (hoy depende de la experiencia de cada vendedor) — dolor validado
  en la línea comercial del propio repo (skills adquisicion-*, método diio).
- Base seria para SaaS white-label (línea de negocio existente) reutilizando contratos ya
  construidos: `transcripcion-a2a` (segmentos/confianza), `tareas_reunion` (acciones vivas en
  prod), `leads` (embudo), shell de `control-interno`.
- El MVP mock-first cuesta cero tokens y cero riesgo de runtime: nada toca Hetzner ni Supabase.

## Qué

### Criterios de Éxito
Los 15 criterios de aceptación de SPEC §17 (build+typecheck+lint verdes, smoke Playwright del
flujo completo, 3 temas, launcher, SOUL de negocio actualizado).

### Comportamiento Esperado
Flujo demo: subir audio demo (o pegar transcripción) → job con progreso → transcripción por
speaker con timestamps → insights 14 categorías con evidencia clicable → score con desglose →
guided meeting (replay) con next-best-question justificada → resumen/follow-up/CRM notes/
riesgos/acciones → manager compara 3 llamadas demo. Todo navegable, 3 temas, sin estados rotos.

## Contexto

### Referencias (reuso obligatorio)
- Shell/theming/command-bar: `businessos/frontends/control-interno/src/{app/(main)/dashboard-shell.tsx, shared/contexts/theme-context.tsx, shared/components/{SidebarNav,ThemeToggle}.tsx, features/search/components/SearchDialog.tsx, app/globals.css}` — clonar patrón, no importar el paquete.
- Contrato transcripción: `businessos/transcripcion-a2a/stt.py` (Segmento, umbral inaudible 0.5, confianza_global) — espejar en TS.
- Acciones: `businessos/supabase-fase10-reuniones.sql` (shape de `tareas_reunion`).
- Mock/real: `src/features/dashboard/services/index.ts` de la raíz (`getDataSource()`).
- Provider externo: `github.com/altaventasllc-source/transcriptor` (Flask: POST /upload, GET /status, líneas `[M:SS]`) — adapter documentado, no requisito de demo.
- Método discovery: `businessos/negocio/skills/adquisicion-{entrevista-dinamica,transcripcion,diagnostico-factibilidad}/SKILL.md`.

### Arquitectura (Feature-First)
Ver SPEC §7. App Next 16 + React 19 + Tailwind v4 + zustand + lucide + zod, independiente
(package propio), sin tocar la app raíz ni las otras superficies.

### Modelo de Datos
Ver SPEC §8 (contratos TS; mapeo aditivo futuro a `transcripciones`/`tareas_reunion`/`leads`).

### Modelo de amenazas (mini — obligatorio)
- MVP local sin backend real: sin secretos, sin PII real (personajes demo ficticios — regla:
  nada de datos de clientes reales en fixtures).
- Audio subido se procesa client-side/mock; no sale de la máquina.
- Seams a servicios (`TRANSCRIPTION_PROVIDER`, `AGENT_ENGINE`, `COPILOT_DATA`): valor
  desconocido → error al arrancar (nunca degradación silenciosa).
- Envío de correos: NO existe en MVP; el draft es texto. El envío real futuro pasa por
  `aprobaciones_salientes` (gate humano, integridad sha256).
- SOUL.md de negocio: cambio de persona de un bot en producción → PR revisado + sync manual
  al volumen + restart (doctrina 2026-07-12); sin sync, el cambio NO está aplicado.

### Confianza del agente
Alta en shell/theming/launcher/datos demo (patrones probados en el repo). Media en el motor
determinista de insights es-MX (léxicos nuevos — mitigado con fixtures que lo ejercitan y
tests unitarios por dimensión). El "tiempo real" es replay honesto (etiquetado en UI).

### ¿Este PRP cambia comportamiento de agentes? (CDC)
Sí, en un punto: añade sección "Enfoque de ventas" a `businessos/negocio/SOUL.md` (persona del
bot de negocio). Mitigación: sección nueva antes del bloque AUTO `TRIO-DOGFOOD` (intocable),
sin contradecir su identidad ("presenta hechos, no decide"); revisión humana en el PR; el
deploy al volumen es paso operativo explícito post-merge.

## Blueprint (Assembly Line)

- **Fase A — Scaffold + shell + theming**: package nuevo, layout con sidebar/topbar, ThemeProvider
  tri-estado + tokens light/dark + anti-flash, command bar básica, stores de UI. Gate: dev server
  arranca, 3 temas conmutan sin flash, navegación entre rutas vacías-con-criterio.
- **Fase B — Dominio + datos demo + servicios**: tipos de SPEC §8, `getDataSource()` mock,
  fixtures de las 3 reuniones demo (transcripciones es-MX completas con segmentos/confianza).
  Gate: typecheck verde; fixtures validan contra schemas zod.
- **Fase C — Voice Transcription tool**: dropzone, cola de jobs con progreso, provider `mock`,
  viewer de segmentos, bridge a Analyzer/Guided; interfaz de providers + adapter
  `transcriptor-local` documentado. Gate: audio demo → job → transcripción → navegar a insights.
- **Fase D — Motor de análisis + score**: extractor determinista (14 categorías, evidencia),
  8 dimensiones con reglas de SPEC §10, huecos + next-best-question. Gate: tests unitarios por
  dimensión (cubierta/parcial/faltante) sobre las 3 fixtures; scores esperados ~80/45/60.
- **Fase E — Guided Meeting**: replay incremental, checklist de cobertura, sugerencia única
  activa, 4 tipos de alerta. Gate: fixture "superficial" dispara las 4 alertas en replay.
- **Fase F — Workspace + Manager + Playbooks**: resumen ejecutivo, follow-up, CRM notes,
  riesgos, acciones (shape tareas_reunion), scorecards comparativos, editor de playbooks.
  Gate: los 7 agentes producen output desde las 3 fixtures; comparativo manager coherente.
- **Fase G — Mission Control home + Launcher**: widgets con datos reales del workspace,
  launcher popover + página, pins/recientes/búsqueda, catálogo de 15 herramientas. Gate:
  recomendaciones derivan de datos (no decorativas); pin persiste.
- **Fase H — SOUL negocio + docs vivas**: sección "Enfoque de ventas" en `negocio/SOUL.md`;
  README del producto (cómo correr, providers, seams); ROADMAP + memoria del proyecto.
- **Fase I — Validación final**: build + typecheck + lint + smoke Playwright (flujo completo,
  3 temas, launcher, estados vacíos, responsive básico). Evidencia en el PR.

## 🧠 Aprendizajes (Self-Annealing, cierre 2026-07-26)

- **Monorepo + Turbopack**: sin `turbopack.root`/`outputFileTracingRoot`, Next 16 infiere la
  raíz del workspace en el repo y arrastra el `src/middleware.ts` de la app raíz. Fijar ambos.
- **El léxico determinista no aguanta conversación real libre** — sirve para fixtures y para
  decidir QUÉ dimensión falta, no para extraer hallazgos de habla natural. El patrón que
  funcionó: motor rules decide estructura (explicable), la IA redacta/extrae, y un VALIDADOR
  descarta todo hallazgo sin evidencia verificable (la IA propone, el contrato verifica).
- **En vivo, "mitad de la reunión" no existe**: el total crece con el cursor; toda alerta
  proporcional al total necesita un umbral absoluto (≥12 frases) en contexto live.
- **El mock jamás debe pisar datos reales**: si la sesión ya capturó transcripción en vivo,
  la cola la usa tal cual (bug cazado por el usuario en dogfood real, no por los tests).
- **Playwright sin sudo en WSL**: `apt-get download` + `dpkg-deb -x` + `LD_LIBRARY_PATH`.
- **eslint-config-next@16 es flat nativo** (sin FlatCompat) — mismo gotcha que la app raíz.
- **Selectores de test con componentes repetidos** (ThemeToggle en topbar y settings):
  anclar al contenedor (`page.locator('header')`), no al testid global.
- **Dogfood inmediato del usuario > smoke**: 3 de los 5 fixes post-MVP salieron de capturas
  de sesiones reales (alerta prematura, mock pisando transcripción, léxico corto).

## Gotchas conocidos (heredados del repo)

- Tailwind v4: tokens vía `@theme inline`, no config JS (patrón control-interno).
- Next 16: `npm run dev` (auto-puerto), nunca puerto hardcodeado.
- Score jamás se muestra sin desglose; insight jamás sin evidencia (regla de oro del grafo).
- Ningún `except/catch` silencioso: `TrabajoTranscripcion.error` siempre visible.
- El bloque `TRIO-DOGFOOD` de los SOUL.md es auto-gestionado: no tocar.
- Editar un .md del repo NO lo despliega al volumen (doctrina 2026-07-12).

## Stack (Golden Path)

Next.js 16 + React 19 + TypeScript strict + Tailwind v4 + zustand + zod + lucide-react +
Playwright. Sin Supabase en MVP (seam listo). Sin `any`.
