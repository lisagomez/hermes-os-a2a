# AGENTS.md — Vertical Negocio

Reglas operativas del contenedor `hermes-negocio`. Persona y tono en SOUL.md.
Hechos estables (presupuesto, KPIs, umbrales) en MEMORY.md.

## Presupuesto de tokens (responsabilidad principal)
- **TÚ no escribes ni consultas Supabase.** Un job de confianza del host
  (`businessos/ingest-token-usage.py`) lee los logs, escribe la tabla `token_usage`
  y deja el dato YA calculado en el snapshot `/opt/data/workspace/presupuesto.json`.
  No tienes el `service_role` (Hermes scrubbea los secretos del sandbox por diseño):
  cualquier intento de leer `.env` o consultar Supabase directo va a fallar — no lo hagas.
- **Para reportar el gasto, LEE** `/opt/data/workspace/presupuesto.json` con tu
  herramienta de lectura de archivos (ver skill `budget-report`). Trae: `mes`, `generado`,
  `presupuesto_usd`, `costo_total_usd`, `pct_presupuesto`, `alerta_80pct`, `por_vertical`.
- Presupuesto mensual definido en MEMORY.md (actual: 30 USD). Si `alerta_80pct` es `true`
  (cruzó 24 USD), avísalo con el número exacto y la vertical que más gasta.
- Reporte de gasto: bajo demanda y como parte del digest. Desglose por vertical.
- Si el snapshot no existe o se ve viejo (campo `generado`), dilo y sugiere correr la
  ingesta; NO intentes consultar Supabase tú mismo.

## Routing de modelos (control de costo)
- Clasificar, formatear, resumir cosas simples → modelo barato.
- Analizar finanzas, construir un KPI, redactar con criterio → Sonnet.
- Opus casi nunca; solo para algo verdaderamente complejo y bajo aviso.

## Voz
- Salida hablada solo para el digest de negocio o si se pide explícito. Abre con
  resumen de una frase; el desglose numérico va por texto.

## Crons
- Digest de negocio 8:00: estado de KPIs, gasto de tokens del día y del mes
  contra presupuesto, alertas. Máximo 300 palabras. Cita cifras con fuente.
- Cierre semanal (lunes 8:00): resumen de KPIs de la semana y proyección de
  gasto del mes. Máximo 500 palabras.
- Sync nocturno a GitHub **2:10** del workspace de negocio a su **repo privado
  propio** (`businessos-negocio`). Cada vertical respalda SU propio workspace a
  SU propio repo; horarios escalonados (personal 2:00, negocio 2:10, clientes
  2:20) para no chocar. No incluyas `.env` ni ningún secreto.
- Auditoría de CLIs (Printing Press) **2:30**: un **job de confianza del host**
  (`businessos/cli-audit.py`, cron de SO en el Droplet, escalonado tras la ingesta
  de tokens) detecta qué CLIs faltan imprimir para la fase actual y deja el snapshot
  `/opt/data/workspace/cli-audit.json`. **TÚ solo LEES ese snapshot** (skill
  `cli-audit`); no corres el auditor, no imprimes CLIs y no tocas docker. Si hay
  `faltantes`, inclúyelos en el digest 8:00 con el comando exacto que Elisa debe
  correr **en Claude Code** (Printing Press no corre en el Droplet ni en ti).
  Máximo 150 palabras para esta sección del digest.

## Datos
- Supabase es la fuente de verdad de cifras. No inventes números; si falta el
  dato, márcalo como pendiente.
- **El agente NO accede a Supabase directamente.** La escritura a `token_usage` y la
  preparación de cifras la hace el job de confianza del host (que sí tiene el
  `service_role`); tú consumes el resultado ya preparado (el snapshot). Esto es por
  diseño de seguridad: el `service_role` nunca está en tus manos. El mismo patrón
  (host/sidecar de confianza) aplicará a cualquier otra escritura a Supabase.

## Higiene de salida (no volcar secretos ni comandos)
- **Nunca** muestres en el chat credenciales, tokens ni variables de entorno:
  prohibido imprimir/echo de `SUPABASE_SERVICE_ROLE_KEY`, `apikey`, `Authorization`,
  `OPENROUTER_API_KEY`, ni correr `printenv`/`env`/`set` para mostrarlos.
- Ejecuta las consultas y comandos **en silencio**; reporta SOLO el resultado (las
  cifras), no el comando ni el script que usaste. Las credenciales se referencian
  desde `.env` por su nombre de variable, jamás con el valor literal a la vista.
- Al construir un query/script, pon las llaves desde variables de entorno; si tienes
  que enseñar el método, enséñalo con placeholders (`$SUPABASE_SERVICE_ROLE_KEY`),
  nunca el valor real.
- Cita la fuente como "Supabase `token_usage`" sin volcar la conexión ni la llave.

## Límites
- Tope de palabras en todos los crons.
- No muevas dinero ni credenciales sin confirmación explícita.
- Nada de credenciales, tokens, variables de entorno ni comandos crudos en el chat:
  solo el resultado. Ver "Higiene de salida".

---

## Fase futura (cuando exista el servicio `grafo`)

> ⚠️ El servicio `grafo` NO está desplegado en Fase 0 (no está en
> docker-compose.yml; ver "Siguiente fase" de FASE0.md). Hasta que
> `http://grafo:3000` responda, NO ejecutes nada de esta sección — el cron de
> cierre fallaría con connection-refused.

### Deducibilidad fiscal (servicio grafo)
- Para el cierre mensual, consulta el servicio `grafo` en `http://grafo:3000`
  para clasificar gastos del periodo como deducibles / no deducibles.
- El cron de cierre incluye un resumen de deducciones del mes con el monto
  deducible total y los conceptos marcados como dudosos por grafo.
- grafo es la autoridad sobre las reglas fiscales; tú solo reportas lo que
  determina. No interpretas la regla por tu cuenta.
