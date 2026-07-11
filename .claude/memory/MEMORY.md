# Memoria del Proyecto — Indice

> Archivos organizados por carpeta (tipo). Max 200 lineas.
> Gestionado por skill memory-manager. Auto-memory de Claude Code DESACTIVADO.

## user/ — Sobre el usuario/equipo
- [Elisa](user/elisa.md) — dueña-operadora única; Telegram user_id 7022378429; prefiere el patrón correcto sobre atajos.

## project/ — Proyectos y decisiones activas
- [Despliegue en Hetzner](project/despliegue-hetzner.md) — decisión 2026-07-04: runtime de bajo presupuesto va a Hetzner Cloud (CX32 8GB ~€6.80/mes corre todo incl. grafo, más barato que DO 4GB); runbook delta en `businessos/FASE0-hetzner.md`; Cloud Firewall a nivel de red resuelve el gotcha Docker/UFW.
- [Estado de Fase 0](project/fase0-estado.md) — COMPLETA (2026-07-08): las 3 verticales viven en Hetzner 24/7 con respaldo nocturno de los 3 volúmenes; solo voz queda como futuro.
- [Fase 1 — eficiencia de tokens](project/fase1-eficiencia.md) — routing en las 3 (10 ligeros a gpt-oss:floor, 3 pesados a Sonnet, loop principal en gemini-flash-lite, caché 97%); ingesta token_usage + reporte de presupuesto OK; job de facturas (ingest-facturas.py) construido; COMPLETA 2026-07-08: modelos validados en vivo (title→gpt-oss, vision→Sonnet) + alerta 80% automática (cron 08:00, hermes send).
- [Fase 2 — grafo](project/fase2-grafo.md) — cerebro regulatorio fiscal COMPLETO en código (seed citado LISR/CFF/SAT, motor puro, FastAPI, Docker, host-job evaluar-facturas.py, 31 tests); residuales: up real en Droplet, dry-run contra Supabase, CLI impreso.
- [Fase 3 — expansión](project/fase3-expansion.md) — grafo v2 multi-ámbito (fiscal MX/CO, contable, contractual; 24 reglas), cron de vigencias, cobros Polar (payouts MX verificados) y contratos validados por grafo; residuales: cuenta Polar + aplicar SQL/jobs en Droplet.
- [Fase 4 — dashboard Mission Control](project/fase4-dashboard.md) — A2ABot = Next.js de la raíz; 3 vistas (Pantheon/AI Spend/Grafo) solo lectura, mock/real por env; grafo con GET /evaluaciones; residuales: compose up + cron snapshot en runtime, screenshots.
- [Fase 5 — A2A](project/fase5-a2a.md) — grafo-a2a: puente determinista (card + message/send → grafo íntegro, opacidad testeada, cero LLM); SDK a2a-sdk 1.1.0 proto-first con gotchas en el PRP; runtime CERRADO 2026-07-08 (grafo-a2a healthy en Hetzner + smoke message/send real). Economía agéntica (Circle/Lean 4) sigue futura.
- [Fase 6 — departamentos](project/fase6-departamentos.md) — trío Hermes→Ejecutor→Supervisor CONSTRUIDO, mergeado a master (PR #9, 2026-07-03) y SQL aplicado en producción; smoke A2A en vivo validado en dev (`businessos/smoke-trio/`); runtime CERRADO 2026-07-08 (trío healthy en Hetzner, smoke con gates reales, gotcha safe.directory); queda dogfood motor real (decisión de la dueña).
- [Fase 7 — enjambre (swarm)](project/fase7-swarm.md) — Coordinador A2A (fan-out acotado + presupuesto + integración con verificación final del Supervisor) sobre el trío, CONSTRUIDO y mergeado a master (PR #13, 2026-07-04, 112 tests verdes); `supabase-fase7.sql` APLICADO en prod (2026-07-04, vía management API); smoke del enjambre en vivo validado en dev (`businessos/smoke-trio/`, veredicto_final=aprobado); runtime CERRADO 2026-07-08 (coordinador en compose + healthy en Hetzner; Planner real PR #28 mergeado, mock por default); queda dogfood real (decisión de la dueña). Pytest en dev (`businessos/.venv`).
- [CLIs Printing Press + auditor](project/cli-printing-press.md) — CLIs agente-nativos por fase; `cli-audit.py` (host-job) detecta brechas y deja snapshot que lee el skill `cli-audit`; Printing Press solo corre en Claude Code, el cron solo detecta+avisa (Nivel 2-prep, Nivel 3 descartado).
- [Fase 8 — grafo regulatorio](project/fase8-grafo-regulatorio.md) — nueva dimensión "regulatorio" (permisos/cumplimiento, no solo fiscal); caso ancla drones-delivery MX con fuente primaria verificada (Ley Aviación Civil Art. 30/74, NOM-107); migración aditiva en runtime verificada por REST y A2A (2026-07-09).
- [Fase 9 — adquisición de clientes](project/fase9-adquisicion.md) — segundo departamento del trío (vende el white-label): Supervisor multi-departamento, gates comerciales binarios (referencia de verdad versionada e intocable en `adquisicion/`), `ventas-a2a` :4400 (card pública con fronteras negativas, tabla `leads` con fallo visible). Núcleo en dev 2026-07-10 (219 tests, cero tokens); runtime CERRADO 2026-07-10 (leads en prod, ventas-a2a healthy, smoke tiers 1-4 verde, 4400 solo localhost); edge público VIVO (Caddy+ratelimit en 443, sslip.io, verificado end-to-end 2026-07-11); motor real/email/negociación A2A = gates de la dueña.

## feedback/ — Correcciones y preferencias
- [Respetar la lógica del proyecto](feedback/respetar-logica-del-proyecto.md) — Hermes envía (no API cruda); servicio persistente con persona, no atajos; verificar antes de confiar.
- [Mantener docs vivas](feedback/mantener-docs-vivas.md) — tras cada cambio importante, actualizar aprendizajes (CLAUDE.md), roadmap, memoria y BUSINESS_LOGIC.md.

## reference/ — Donde encontrar cosas
- [Dos máquinas: runtime vs desarrollo](reference/maquinas-entornos.md) — desde 2026-07-08 TODAS las verticales viven en Hetzner (nada en WSL2); en la de desarrollo solo repo+APIs; el .env no viaja por git (sync a mano).
- [Levantar una vertical Hermes](reference/hermes-vertical-setup.md) — procedimiento + gotchas (uid 10000, config telegram en .env, gateway silencioso, no compose en WSL, hermes send). + editar config/persona en vivo (`docker exec hermes config set`, no `docker run` sobre el volumen), `:floor` para proveedor más barato, regla dura de idioma en SOUL (display.language no basta), telemetría de tokens en agent.log.
- [Acceso a Supabase](reference/supabase-acceso.md) — project-ref A2ABot; service_role vs sbp_ access token; aplicar SQL por management API (gotcha Cloudflare 1010).
- [Revocar EXECUTE en funciones Postgres](reference/revocar-execute-funciones-postgres.md) — para quitar permiso a anon/authenticated hay que `revoke ... from public`, no de los roles (lo heredan via PUBLIC).
- [Hermes sin Docker en runtime](reference/hermes-sin-docker-runtime.md) — el contenedor Hetzner no tiene daemon Docker → read_file/execute_code/file fallan; solo `SOUL.md` se inyecta al system prompt. Patrón dato-en-SOUL para exponer datos al agente. `hermes chat -q` es harness parcial; Telegram Web no dibuja tool-calls.
