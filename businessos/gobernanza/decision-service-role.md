# Decisión — cuándo la aplicación deja de usar `service_role`

**Fecha:** 2026-08-05 · **Estado:** decidida, con fecha límite dura
**Origen:** criterio de aceptación de `README-migracion-tenancy.md`

---

## El hecho incómodo

En Supabase, `service_role` tiene `BYPASSRLS`. **Las políticas de
`supabase-organizaciones.sql` no lo detienen.** Ninguna. Mientras las
superficies conecten con esa llave, el bloque 6 de la migración es decorativo y
el aislamiento entre clientes vive **exclusivamente** en el código de la
aplicación.

Esto no es una hipótesis: hoy Mission Control renderiza todo el negocio con
`SUPABASE_SERVICE_ROLE_KEY` del lado del servidor, y los host-jobs escriben con
la misma llave. La migración no cambia eso, y no pretende hacerlo.

Conviene decirlo sin adornos: **aplicar esta capa no compra aislamiento real el
día uno.** Compra tres cosas distintas, todas necesarias y ninguna suficiente:

1. El **dato queda etiquetado** (`tenant_id` en las 17 tablas), que es el
   requisito previo de todo lo demás.
2. Las **políticas quedan puestas y probadas** — el día que la aplicación
   cambie de rol, funcionan; no hay que diseñarlas bajo presión.
3. El **registro de clasificación** existe y tiene un gate en CI, así que la
   deuda no crece en silencio con cada tabla nueva.

## La decisión

> **La aplicación abandona `service_role` para el dato de negocio antes de que
> exista un SEGUNDO tenant en `organizaciones`.** No antes por calendario, no
> después por conveniencia: el disparador es el alta del segundo tenant.

Por qué ese disparador y no una fecha: con un solo tenant, `service_role` no
puede filtrar dato de un cliente a otro — no hay otro cliente. El riesgo nace
exactamente en el alta del segundo, y ahí ya es tarde para diseñar. Migrar
políticas sobre 17 tablas con clientes activos es mucho peor que hacerlo con
uno (§7 de `arquitectura-multitenant-b2b.md`).

## Qué significa "abandonar" en concreto

No es un cambio de cadena de conexión. Es esto, por orden:

1. **Un punto único de acceso.** Hoy cada superficie construye su cliente de
   Supabase. Mientras eso siga así, "conectar como `app_tenant`" es una
   convención, no una garantía — y las convenciones se rompen (aprendizaje
   2026-07-13: si la garantía depende de que nadie se equivoque, es una
   costumbre).
2. **Fijar `app.tenant_id` en cada transacción**, con el patrón que el puente
   `cli_fin` del ERP ya usa: `set local role app_tenant` + `set local
   app.tenant_id`. `app.tenant_actual()` ya lee ese GUC y, en su defecto, el
   claim `org_id` del JWT.
3. **`service_role` queda para lo que de verdad lo necesita**: migraciones,
   host-jobs de plataforma y trabajos que operan *sobre* todos los tenants
   (ingesta del ledger, auditorías). Cada uno declarado, no heredado.
4. **Una prueba del lado de la aplicación** que falle si una superficie de
   negocio construye un cliente con la llave de servicio. La base no puede
   verificar esto — T7 lo dice explícitamente y por eso no lo intenta.

## Lo que NO se decide aquí

- **Unificar los tres modelos de tenencia** (`tenant_id uuid` / `slug_text` /
  `auth_uid`). Hoy 17 tablas llevan slug de texto y 17 llevarían uuid; el
  puente entre ambos mundos es el slug, y está probado (T12). Converger es
  deseable y **caro**: toca CancioBot, la guardia de presupuesto, agendamiento
  y el buzón. Es una decisión de Elisa, no un efecto colateral de esta capa.
- **La cabina control-interno.** Aísla por usuario y comparte proyecto Supabase
  por una decisión de costo del 2026-07-15. Entra al modelo de organizaciones
  solo si alguna vez sirve a un cliente externo.
- **El ERP.** Tiene su propia tenencia y su propio puente de escritura.

## Cómo se sabrá si se incumplió

`select count(*) from organizaciones where tipo = 'tenant'` mayor que 1
mientras las superficies sigan usando `service_role` para leer dato de negocio.
Ese es el estado que esta decisión declara inaceptable.
