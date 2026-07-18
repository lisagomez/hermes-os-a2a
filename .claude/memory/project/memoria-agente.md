---
name: memoria-agente
description: Decisión 2026-07-11 — memoria de agente por rentabilidad; piloto Holographic ACTIVO en negocio (verificado, caché intacta); Engram diferido como tier premium con trigger explícito; Obsidian intocable (humana).
metadata:
  type: project
---

**Decisión (2026-07-11, criterio: negocio rentable):** la capa de memoria del agente
NO añade infra nueva hoy. Se evaluaron Engram (OSS Go+SQLite/FTS5, y su plugin
bundled de Hermes) vs el provider **Holographic** (bundled, local, cero infra):

- **Engram DIFERIDO como "tier premium"** con trigger explícito: el primer cliente
  white-label que pida memoria auditable/portable/exportable (u >2 verticales de
  clientes activas). Motivos: el plugin bundled tiene un bug upstream cerrado
  "not planned" (issue NousResearch/hermes-agent#27629 — URL hardcodeada
  localhost:8100, sin auth header, 401 silencioso → gateway colgado ~30 min sin
  log) → exigiría fork permanente en la ruta crítica; 3 contenedores + jobs de
  sync = mantenimiento sin línea de ingreso para una operadora única. Como
  feature facturable con demanda real, el fork se paga solo. El plan completo de
  integración (sidecar por vertical, HTTP :7437, gates de caché, puentes
  unidireccionales con Obsidian) quedó diseñado en la conversación del 2026-07-11.
- **Obsidian queda como está**: humana, un escritor (Elisa), sin sync. Nada de
  bidireccional jamás (un escritor por almacén).

**PILOTO HOLOGRAPHIC ACTIVO en `negocio` (2026-07-11), verificado:**
- Activación: `docker exec -u hermes hermes-negocio hermes config set
  memory.provider holographic` + `docker restart` (la doc dice "no requiere
  reinicio" pero el gateway carga config al boot → reiniciar para que el loop de
  Telegram vea las tools). Backup previo: `config.yaml.bak-pre-holographic`.
- Verificado: `hermes memory status` → holographic ← active; `fact_store` add
  (trust 0.5) en una sesión y **recall en sesión NUEVA** encontró el hecho;
  `memory_store.db` vive en `/opt/data/` del volumen → el respaldo nocturno lo
  cubre sin cambios. `hermes chat -q` SÍ ejercita las memory tools (a diferencia
  de file/terminal — no dependen de Docker).
- **Caché intacta (el único costo real):** Holographic es 100% bajo demanda (9
  acciones de `fact_store`, sin inyección por turno ni prefetch) → telemetría
  post-activación 95% cache-hit vs baseline 87-99%. Sin impacto medible.
- Trust scoring: hechos nacen en 0.5; feedback del uso (+0.05/-0.10) reordena el
  retrieval.

**Evaluación del piloto (~2 semanas, hacia 2026-07-25):** ¿reduce re-explicaciones
/ tokens de contexto en el uso real de la dueña por Telegram? Si no aporta,
apagarlo = `config set memory.provider ""` (o restaurar el .bak). Si aporta,
extender a personal/clientes con el mismo patrón y considerar migrar el patrón
dato-en-SOUL (presupuesto) a fact_store — solo con evidencia.

Ver [[fase1-eficiencia]] (routing/caché) y el ROADMAP (corriente transversal de
memoria).
