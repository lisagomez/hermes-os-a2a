# ERP · Módulo act (activos digitales) — VIVO en producción

**Estado (2026-07-26): COMPLETO y OPERANDO.** Plan aprobado y ejecutado el mismo día
(Fable 5): el esquema `erp` (001-005) está APLICADO al Supabase compartido y el módulo
act corre el ciclo DETECTAR → CATALOGAR → REGISTRAR del ERP-MAESTRO §4B sobre la
fábrica real. Plan completo: `~/.claude/plans/jiggly-nibbling-rabbit.md`.

**ERP_CLIENTE_CASA = `2de8835a-439c-461a-990c-a2b95d29f3a4`** (D-08). Vive en:
`.env` canónico de host-jobs del servidor (`~/repo/businessos/.env` — el que sourcea
el crontab; NO `~/businessos/.env`), cabecera de `005_activos.sql`, y aquí.

## El pipeline (feature vendible → activo → contabilizado)

1. **Origen**: toda tarea del trío declara `clasificacion {eje_dei, vendible}`
   (contrato.py; regla dura `vendible ⇒ eje≠operacion`; herencia padre→hijas;
   denormalizado a columnas de `tareas` por `cola._fila_de`, fase13 aplicada).
2. **Cosecha**: `cosechar-activos.py detectar` (cron 10 min) — flanco
   `→aprobada & vendible` → alta `act_activo` + `act_version` (hash de la rama) +
   `act_costo` (tokens de `token_usage.task_id`, tarea + sub-tareas; gotcha GLM:
   recalcula costo-0 con el cache de precios y declara todo hueco en `fuente`).
3. **Concretar**: el merge del PR a master ES el gate humano → `concretar --auto`
   hace CAS `aprobada→concretada` (contrato.py:57 tiene dueño; un-escritor intacto).
4. **Humanos**: `ratificar ACT-NNNN --defensibilidad X --confirmar` (D-10) y
   `exportar-polizas.py aprobar --confirmar` (capitalización/gasto, D-07).
5. **Detector**: `detector-swm-act.py` (semanal, D-09) propone NUEVO/CAMBIADO/
   HUÉRFANO como `rol_swm` — jamás escribe.

## Puente de acceso (interino hasta el CLI act de ERP-1/D-03)

Login `cli_fin` (password solo en el .env del servidor) con `GRANT rol_exe_fin +
rol_swm`; los host-jobs corren psql `set local role` + `set local app.cliente_id` —
grants y RLS reales en cada operación. JAMÁS service_role (BYPASSRLS) ni el PAT de
management en el servidor. Pooler: `aws-1-us-east-2.pooler.supabase.com:5432`
(el host lo dicta `GET /config/database/pooler`, no se adivina). `postgres` tiene
MEMBRESÍA en los 3 roles erp (estado de cluster — re-otorgar si se recrea la BD).

## Estado de los datos (2026-07-26)

- 22 tablas erp con RLS FORCE; folios ACT-0001 (humo, baja), ACT-0002 (dummy gate D,
  baja), **ACT-0003..0025 = los 23 A2A-NNN** del catálogo bootstrap (ref_catalogo).
- $36.32 de costo acumulado (= exacto lo medido: trío $33.29 + CRM $3.03; el resto
  `no_medido` entra como 0 con fuente declarada — jamás se inventa).
- 9 defendibles con `defensibilidad_estado=propuesta`.

## Gates HUMANOS pendientes (los tres, de Elisa/contador)

1. **Ratificación de defensibilidad** (9 propuestos) — comando por activo en Slack.
2. **Firma del contador** en `erp/reglas/act-contable.md` (`AUDITADA-POR: <nombre>
   <fecha>`) — sin ella, proponer/aprobar pólizas RECHAZA con exit 1 (verificado).
   Ojo: con el umbral propuesto ($100) TODA la cosecha inicial va a gasto (su costo
   incurrido medido es mínimo) — decisión del contador si ajusta el umbral.
3. **Primera cosecha e2e real**: la próxima tarea que se encole con
   `clasificacion: {eje_dei: desarrollo, vendible: true}` recorre todo el pipeline.

## Pendientes estructurales

D-03 (stack CLI act formal), D-12 (separación física de repos defendibles),
`act_proteccion` para defendibles ratificados, ERP-1+ del maestro. El detector v2
sumará AGENTS.md y migraciones-aplicadas como fuentes.
