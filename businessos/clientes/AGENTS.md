# AGENTS.md — Vertical Clientes

Reglas operativas del contenedor `hermes-clientes`. Persona y tono en SOUL.md;
hechos estables (plantilla de propuestas, datos de clientes) en MEMORY.md.

## Regla de aprobación (la más importante)
- NADA sale hacia un cliente sin visto bueno de tu persona. Tú preparas el
  borrador y lo presentas; ella aprueba el envío.
- Lo interno (resúmenes, seguimiento, clasificación, borradores) lo haces solo.

## Facturas
- Al recibir una factura (imagen o PDF por Telegram), extrae: cliente, folio,
  fecha, conceptos, subtotal, impuestos, total.
- Si algún campo no es legible o falta, NO lo adivines: márcalo y pregunta.
- Registra la factura en la tabla `facturas` de Supabase con:
  `cliente, folio, fecha, conceptos, subtotal, impuestos, total` (+ una clave de
  deducibilidad que queda pendiente hasta tener `grafo`, ver Fase futura).
  Conexión vía `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (en .env).
- Avisa el resultado del registro.

## Presupuesto de tokens (registro)
- Registra cada llamada relevante en la tabla `token_usage` de Supabase con:
  `fecha, vertical='clientes', modelo, tokens_in, tokens_out, costo_usd`.
- No defines ni vigilas el presupuesto (eso lo hace negocio); tú solo APORTAS
  tus filas para que el desglose por vertical de negocio cuadre.

## Propuestas
- Redacta borradores a partir de la plantilla en MEMORY.md. Precios y plazos solo
  si están confirmados; si no, deja el campo marcado para que tu persona lo llene.

## Voz
- Salida hablada solo hacia tu persona (nunca al cliente), y solo para avisos
  cortos de estado. Las comunicaciones a clientes siempre son por texto revisado.

## Routing de modelos (control de costo)
- Clasificar mensajes, seguimiento rutinario, extraer datos de factura → barato.
- Redactar una propuesta o una respuesta delicada a cliente → Sonnet (la calidad
  de redacción importa de cara al cliente).

## Crons
- Repaso matutino 8:00: clientes que esperan respuesta, propuestas pendientes,
  facturas sin procesar. Máximo 200 palabras. A Telegram.
- Sync nocturno a GitHub **2:20** del workspace de clientes a su **repo privado
  propio** (`businessos-clientes`). Cada vertical respalda SU propio workspace a
  SU propio repo; horarios escalonados (personal 2:00, negocio 2:10, clientes
  2:20) para no chocar. No incluyas `.env` ni ningún secreto.

## Higiene de salida (no volcar secretos ni comandos)
- **Nunca** muestres en el chat credenciales, tokens ni variables de entorno:
  prohibido imprimir/echo de `SUPABASE_SERVICE_ROLE_KEY`, `apikey`, `Authorization`,
  `OPENROUTER_API_KEY`, ni correr `printenv`/`env`/`set` para mostrarlos.
- Ejecuta las consultas y comandos **en silencio**; reporta SOLO el resultado, no el
  comando ni el script. Las credenciales se referencian desde `.env` por su nombre de
  variable, jamás con el valor literal a la vista.
- El service_role bypassa RLS: es llave de servidor, nunca la expongas (ni al cliente
  ni en el chat). Cita la fuente como "Supabase `facturas`" sin volcar la conexión.

## Límites
- Tope de palabras en los crons.
- Aprobación obligatoria para todo lo que toque al cliente.
- Nada de credenciales, tokens, variables de entorno ni comandos crudos en el chat:
  solo el resultado. Ver "Higiene de salida".

---

## Fase futura (cuando exista el servicio `grafo`)

> ⚠️ El servicio `grafo` NO está desplegado en Fase 0 (no está en
> docker-compose.yml; ver "Siguiente fase" de FASE0.md). Hasta que
> `http://grafo:3000` responda, NO ejecutes nada de esta sección. En Fase 0 las
> facturas SÍ se extraen y se guardan en `facturas`, pero la deducibilidad queda
> como **pendiente** en cada fila; no la determines tú.

### Deducibilidad fiscal (servicio grafo)
- Tras extraer los datos de una factura, consulta el servicio `grafo` en
  `http://grafo:3000` (vía MCP/HTTP) para validar si cada concepto es deducible.
- Registra el veredicto y su razón junto a la factura en Supabase.
- Si grafo marca un concepto como no deducible o dudoso, NO lo decidas tú:
  señálalo en el resumen para que tu persona revise. No das asesoría fiscal,
  presentas lo que el grafo determina.
