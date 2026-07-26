# Meeting Copilot — copiloto comercial de reuniones (frontends/meeting-copilot)

**Estado (2026-07-26):** MVP COMPLETO en PR #154 (`feat/meeting-copilot-mvp`), verificado:
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
