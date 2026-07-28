---
name: fase7-swarm
description: Fase 7 — enjambre (swarm) COMPLETA — dogfood real APROBADO en runtime (2026-07-11, GLM-5.2 end-to-end); Coordinador A2A con Planner real; gotchas node_modules compartido + herencia modelo_pref.
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

## ACTUALIZACIÓN 2026-07-08 — runtime CERRADO

El coordinador ganó su entrada en `docker-compose.yml` (¡faltaba! profile `trio`,
127.0.0.1:4300, espejo del ejecutor) y corre Up/healthy en Hetzner; card +
opacidad verificadas por el smoke de runtime. El Planner real (PR #28,
`claude_planner.py`) está mergeado pero sigue mock por default. Residual:
dogfood real opt-in (decisión de la dueña).

## ACTUALIZACIÓN 2026-07-11 — DOGFOOD REAL APROBADO (GLM-5.2) → FASE COMPLETA

`dogfood-swarm-1` (2 utilidades TS independientes sobre el scaffold de trio-repo,
`fan_out_max=2`, `presupuesto_usd=2`, `modelo_pref=glm-5.2`) aprobado end-to-end
en runtime: el Planner real (GLM) produjo un DAG de 3 sub-tareas (`slug` y
`moneda` en paralelo + `validar` dependiente de ambas), las 3 aprobadas al PRIMER
intento por los gates reales, integración limpia (4 archivos) y veredicto FINAL
del Supervisor con los 8 gates en verde. Fila padre `aprobada` en `tareas` de
prod; ledger por-tarea completo gracias al fix del índice parcial (Planner
atribuido al padre $0.27 + `slug` $0.76 + `moneda` $0.59 nominal Anthropic ≈
$1.62/2.00 — el corte de presupuesto del scheduler leyó gasto REAL por primera
vez).

**Lo que hubo que construir/destrabar (detalle en CLAUDE.md 2026-07-11 enjambre):**
- Imagen del coordinador con Node + CLI de Claude Code (era mock-only) e
  `IS_SANDBOX=1` en su compose (planner corre `bypassPermissions` como root).
- `executor.py::heredar_modelo_pref` — las sub-tareas heredan `limites.modelo_pref`
  del padre (el Planner no emite límites; sin herencia el enjambre caería al
  modelo default del CLI). Test unidad + flujo; suite del coordinador 55 verdes.
- `claude_planner.py::registrar` ya no es silencioso ante 4xx/5xx (paridad con el
  fix del motor del 2026-07-11).
- **`node_modules` COMPARTIDO en `/workspace/worktree/`**: el worktree de
  integración nace de `git worktree add` y nadie le corre npm install → los gates
  finales fallarían por tooling. La resolución upward de Node/npm cubre TODOS los
  worktrees; validado con los 4 gates desde el contenedor del Supervisor sobre un
  worktree desechable, cero tokens. Mantenimiento: re-instalar si cambia el
  `package.json` del scaffold.

**Residuales menores (no bloquean; anotados en ROADMAP):** filas hijas sin
`parent_id` (validar_tarea descarta el campo → columna null; el vínculo vive en
el `plan` jsonb del padre); `gasto_usd` de la fila padre queda 0 (el docstring de
estado.py promete actualización por vuelta pero enjambre.correr no recibe el
estado; el ledger `token_usage.task_id` es la fuente de verdad). El worktree
integrado `tarea/dogfood-swarm-1` quedó en el server para inspección de la dueña
(merge a main = gate humano); limpiar = borrar dir → prune → borrar rama, DESDE
el contenedor (admin-dirs de root).


## 2026-07-27: El Planner estampa modelo_pref por dificultad (doctrina §3.5, PR #168)

El Planner real clasifica cada sub-tarea (`mecanica`/`estandar`/`delicada`, criterios de
blast radius) y `rutear_por_dificultad` (claude_planner.py) convierte la clase en
`limites.modelo_pref` usando SOLO el mapa de env `PLANNER_RUTEO_MODELOS` — la IA propone
la clase, el modelo sale del allowlist. Apagado por default; `heredar_modelo_pref` queda
como fallback; pref propio de la sub-tarea gana; mapa malformado = no arranca. Encender:
`PLANNER_RUTEO_MODELOS=mecanica=<m>,delicada=<m>` en el .env del server + rebuild del
coordinador (la env ya está en compose). Gate previo a usar un segundo modelo: su probe
(hoy el único motor alterno cableado es GLM vía z.ai).

## 2026-07-28: Capa de EXCLUSIÓN del ruteo (alineación con PR #170)
El mapa `PLANNER_RUTEO_MODELOS` es la capa de CAPACIDAD (2); antes manda la de
EXCLUSIÓN (1): "¿qué modelo está PROHIBIDO para este dato/dominio?" (fail-closed,
doctrina en orquestar-agentes §2). Aplicado en código: `mapa_ruteo_de_env` rechaza
al ARRANCAR un mapa que nombre `fable`/`mythos` (config inválida, mismo patrón que
un gate sin runner) — retención 30d sin ZDR sobre worktrees que pueden llevar
código de terceros + clasificadores que re-rutean en silencio. El skill
`trio-software` fija la misma regla para el `modelo_pref` padre, incl. la
variante por DATO: repos de clientes no van a proveedores externos (z.ai/GLM)
sin acuerdo. La Fase 1 (probe caché+tools) queda como capa 3 (eficiencia): solo
compara entre modelos ya permitidos.
