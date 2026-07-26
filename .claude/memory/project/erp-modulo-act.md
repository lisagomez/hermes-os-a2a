# ERP · Módulo act (activos digitales) — implementación en curso

**Estado (2026-07-26):** plan aprobado por la dueña (Fable 5). Decisiones: (1) aplicar
esquema `erp` (001-005) al Supabase compartido — act nace VIVO; (2) clasificación
`eje_dei`+`vendible` nace EN EL ORIGEN (contrato del trío); (3) borrador de política
NIF C-8 para auditoría del contador (desbloquea D-07).

**ERP_CLIENTE_CASA = `2de8835a-439c-461a-990c-a2b95d29f3a4`** — tenant de la casa
(D-08: los activos propios se catalogan con las MISMAS tablas que inventariarán los
de clientes white-label). Registrado en: `.env` del host Hetzner
(`~/businessos/.env`), cabecera de `005_activos.sql`, y aquí.

**Arquitectura del pipeline** (detalle en `~/.claude/plans/jiggly-nibbling-rabbit.md`
y el ERP-MAESTRO §1.6-1.7/ERP-4B):
- Feature vendible aprobada por el Supervisor → `cosechar-activos.py detectar`
  (flanco →aprobada&vendible, patrón aviso-cola.py, memoria en archivo del host) →
  alta `act_activo`+`act_version`+`act_costo` (tokens desde `token_usage.task_id`) →
  merge del PR = gate humano → `concretar` (CAS aprobada→concretada; el estado
  huérfano de contrato.py:57 cobra dueño).
- Escritura en `erp` SIN service_role: management API con
  `set local role rol_exe_fin; set local app.cliente_id='<casa>'` — ejercita
  grants+RLS reales. Puente interino hasta el CLI `act` de ERP-1 (D-03).
- Aprobaciones humanas (defensibilidad, capitalización) sin app Slack de ERP-3:
  comando host con `--confirmar` (credencial = autoridad de Elisa), bitácora.
- Gotcha GLM: tokens autoritativos, costo recalculado con el cache de precios de
  ingest-token-usage.py.

**Progreso:** Fase 0 ✅ (PR #159 mergeado — catálogo A2A-NNN en master; uuid
acuñado y registrado). Fases A-G pendientes según el plan.
