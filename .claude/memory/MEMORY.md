# Memoria del Proyecto — Indice

> Archivos organizados por carpeta (tipo). Max 200 lineas.
> Gestionado por skill memory-manager. Auto-memory de Claude Code DESACTIVADO.

## user/ — Sobre el usuario/equipo
- [Elisa](user/elisa.md) — dueña-operadora única; Telegram user_id 7022378429; prefiere el patrón correcto sobre atajos.

## project/ — Proyectos y decisiones activas
- [Estado de Fase 0](project/fase0-estado.md) — 3 de 3 verticales vivas y respondiendo (personal/Kiris + negocio/@a2aTeamBot + clientes/@a2aClientbot); Supabase listo; pendientes Droplet y respaldo nocturno.
- [Fase 1 — eficiencia de tokens](project/fase1-eficiencia.md) — routing aplicado en las 3 verticales (10 ligeros a gpt-oss:floor, 3 pesados a Sonnet, loop principal en nemotron); fix de idioma (regla dura en SOUL); pendiente ingesta a token_usage + validar modelos nuevos.
- [Fase 6 — departamentos](project/fase6-departamentos.md) — trío Hermes→Ejecutor→Supervisor (A2A), white-label; primer departamento Desarrollo de Software; solo documentado (sin código), depende de A2A (Fase 5).

## feedback/ — Correcciones y preferencias
- [Respetar la lógica del proyecto](feedback/respetar-logica-del-proyecto.md) — Hermes envía (no API cruda); servicio persistente con persona, no atajos; verificar antes de confiar.
- [Mantener docs vivas](feedback/mantener-docs-vivas.md) — tras cada cambio importante, actualizar aprendizajes (CLAUDE.md), roadmap, memoria y BUSINESS_LOGIC.md.

## reference/ — Donde encontrar cosas
- [Levantar una vertical Hermes](reference/hermes-vertical-setup.md) — procedimiento + gotchas (uid 10000, config telegram en .env, gateway silencioso, no compose en WSL, hermes send). + editar config/persona en vivo (`docker exec hermes config set`, no `docker run` sobre el volumen), `:floor` para proveedor más barato, regla dura de idioma en SOUL (display.language no basta), telemetría de tokens en agent.log.
- [Acceso a Supabase](reference/supabase-acceso.md) — project-ref A2ABot; service_role vs sbp_ access token; aplicar SQL por management API (gotcha Cloudflare 1010).
- [Revocar EXECUTE en funciones Postgres](reference/revocar-execute-funciones-postgres.md) — para quitar permiso a anon/authenticated hay que `revoke ... from public`, no de los roles (lo heredan via PUBLIC).
