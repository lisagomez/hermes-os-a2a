---
name: fase7-swarm
description: Fase 7 — enjambre (swarm) de Ejecutores coordinado CONSTRUIDO y validado en dev (2026-07-04, PRP-007, PR #13); Coordinador A2A hermano del trío; residuales SQL (no aplicado aún) + runtime + dogfood real.
metadata:
  type: project
---

**CONSTRUIDO Y MERGEADO (2026-07-04, PRP-007, PR #13 → master):** el enjambre completo
en código, validado end-to-end en dev con cero tokens (**112 tests verdes** en los
servicios del enjambre: ejecutor-a2a 35 · coordinador-a2a 41 · trio-contrato 36).

La evolución del trío de la [[fase6-departamentos]]: de **un Ejecutor por tarea** a un
**enjambre de Ejecutores** que corren en paralelo las sub-tareas de una feature grande.
El **Coordinador** (servicio A2A hermano, no toca Ejecutor/Supervisor) descompone en un
DAG de sub-tareas con alcances disjuntos, las reparte con tope de fan-out y presupuesto,
integra lo aprobado y pide una verificación final del Supervisor sobre la rama integrada
— o escala. Cada sub-tarea es una `tarea` válida del contrato de Fase 6.

- `businessos/coordinador-a2a/` (servicio A2A): `enjambre.py` (fan-out acotado +
  reintento por sub-tarea), `planner.py` (Planner pluggable/mockeable — MockPlanner
  determinista cero tokens, real opt-in tras la MISMA interfaz que `Engine`),
  `presupuesto.py` (corte por gasto acumulado leído de `token_usage`), `integracion.py`
  (merge a `tarea/<parent_id>` + verificación final del Supervisor), clientes A2A a
  Ejecutor y Supervisor, card honesta (descompongo/reparto/integro/escalo; NO escribo
  código, NO apruebo, NO despliego).
- `trio-contrato/contrato.py` extendido: `validar_plan` + DAG (ids únicos, aciclicidad,
  alcances de archivo disjuntos donde se pueda) + `test_plan.py`.
- `ejecutor-a2a/claude_engine.py`: `filas_token_usage(..., task_id=None)` — atribuye el
  gasto de cada sub-tarea para el corte EXACTO de presupuesto; retrocompatible.
- **Un escritor por fila (extendido a padre/hija):** el Coordinador escribe SOLO la fila
  PADRE (`es_padre=true`: plan, fan_out_max, presupuesto, gasto, estado global); cada
  Ejecutor SOLO su fila hija (`parent_id`); el Supervisor sigue stateless; Hermes sin
  credenciales.

**Conflicto de merge resuelto (con el PR #12 GLM):** en `filas_token_usage` — GLM añadió
una nota de costo al docstring, Fase 7 el parámetro `task_id`. Resolución **aditiva**: se
conservan ambas notas + la firma con `task_id` (default None) + `task_id` en las dos filas.
Verde tras el merge. Ver [[glm-5.2-transversal]] si existe.

**BD APLICADA (2026-07-04):** `supabase-fase7.sql` aplicado en producción vía management
API (`POST /v1/projects/{ref}/database/query` con `SUPABASE_ACCESS_TOKEN`, UA `curl/8.0`)
porque el MCP de Supabase estaba en **read-only** — `apply_migration`/`execute_sql` de
escritura fallan con "Cannot apply migration in read-only mode"; mismo patrón que Fase 6.
Verificado: 7 columnas + índices `tareas_parent_idx`/`token_usage_task_idx` presentes; sin
alertas de seguridad nuevas (RLS sin políticas = solo service_role, por diseño).

**Smoke del enjambre EN VIVO validado en dev (2026-07-04):** `businessos/smoke-trio/run.sh`
levanta los 3 servicios con uvicorn real y manda una feature padre (mock_plan de 2
sub-tareas disjuntas) al Coordinador sobre TCP → fan-out → integración → verificación
final del Supervisor → `veredicto_final=aprobado`. Cero tokens, sin docker. Gotcha para
que el cliente resuelva sobre TCP real: setear `*_PUBLIC_URL` a 127.0.0.1 (la card anuncia
esa `url`); sin eso el SDK pega al nombre docker `coordinador-a2a:4300` y no resuelve.

**Residuales:**
- **Droplet/runtime:** ~~smoke end-to-end~~ (hecho en dev) → falta build + `compose up
  coordinador-a2a` en hermes-net (Docker/Droplet).
- **Decisión de la dueña (quema tokens):** Planner real opt-in + primer dogfood del
  enjambre con `EJECUTOR_ENGINE=claude`; hoy Mock-only a propósito.

**Pytest habilitado en la máquina de desarrollo (2026-07-04):** venv en `businessos/.venv`
(Python 3.14, bootstrap de pip con get-pip.py por el gotcha de ensurepip). Detalle y comando
en [[maquinas-entornos]].
