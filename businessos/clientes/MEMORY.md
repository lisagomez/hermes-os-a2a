# MEMORY.md — Vertical Clientes

Memoria persistente del contenedor `hermes-clientes`. Vive en
`clientes/.hermes/MEMORY.md`. Reglas operativas en AGENTS.md, persona en SOUL.md.
Aquí van los HECHOS estables: plantilla de propuestas, datos de clientes y
preferencias de comunicación. Mantenlo corto y editado; no acumules historia.

---

## Plantilla de propuestas (la usa AGENTS.md)

Estructura base para redactar borradores. Precios y plazos SOLO si están
confirmados; si no, deja el campo entre `[corchetes]` para que tu persona lo
llene antes de aprobar el envío.

```
Asunto: Propuesta — [nombre del cliente] — [servicio]

Estimado/a [nombre]:

Gracias por su interés en [servicio]. A continuación el detalle:

- Alcance: [qué incluye]
- Entregables: [lista]
- Plazo: [tiempo estimado]   ← solo si confirmado
- Inversión: [monto + moneda] ← solo si confirmado
- Vigencia de la propuesta: [días]

Quedo atento/a a sus comentarios.
[firma / persona]
```

> Toda propuesta es un BORRADOR hasta que tu persona la aprueba. Nunca la envíes
> tú directo al cliente.

---

## Tono y trato por cliente (rellenar)

| Cliente | Trato | Notas de relación |
|---------|-------|-------------------|
| (ej. Acme) | usted | formal, responde rápido por correo |
| (ej. Beta) | tú    | ya hay confianza, prefiere WhatsApp |

> Por defecto: usted, hasta que la relación sea claramente de confianza
> (ver SOUL.md).

---

## Datos en Supabase (referencia)

- **`facturas`** — fuente de verdad de facturas procesadas:
  `cliente, folio, fecha, conceptos, subtotal, impuestos, total` (+ deducibilidad,
  pendiente hasta tener `grafo`). No inventes campos: si falta, márcalo y pregunta.
  ⚠️ El write a esta tabla aún NO está conectado (mismo muro de secretos que `token_usage`):
  extrae y presenta; el registro queda pendiente hasta tener el job de host.
- **`token_usage`** — NO la escribes tú; la llena el job de ingesta del host leyendo tus
  logs (no tienes el `service_role`, por diseño de seguridad). El desglose de negocio sale
  de ahí.

---

## Recurrentes / pendientes (rellenar)

| Qué | Cuándo | Notas |
|-----|--------|-------|
| (ej. seguimiento a cotizaciones abiertas) | cada 3 días | va en el repaso 8:00 |
| (ej. recordar renovación de contrato)     | mensual     | avisar con tiempo |

---

## Crons activos (referencia)

- **Repaso matutino 8:00** — clientes que esperan respuesta, propuestas
  pendientes, facturas sin procesar. Máx. 200 palabras, a Telegram.
- **Respaldo nocturno 04:17 — lo hace el HOST, no yo.** `backup-verticales.sh`
  (cron del usuario `hermes`) tarballea los volúmenes de las 3 verticales y los
  espeja al repo privado `hermes-os-a2a-backups`. Yo no tengo acceso a mi volumen
  (0700/uid-10000) ni hago push de nada. Ver FASE0 §9.

---

## Pendiente / Fase futura

- **Servicio `grafo` (deducibilidad fiscal):** aún NO existe en Fase 0. Hasta que
  `http://grafo:3000` responda, las facturas se extraen y guardan pero la
  deducibilidad queda **pendiente** en cada fila (ver "Fase futura" de AGENTS.md).

---

## Decisiones registradas

- 2026-06-26 — Semilla inicial del MEMORY de clientes con la plantilla de
  propuestas. *(Ajusta la plantilla y las tablas de clientes a tu negocio real.)*
