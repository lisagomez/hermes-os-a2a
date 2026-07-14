# ERP Agéntico · Migraciones ERP-0 (fundación)

Modelo de datos + seguridad estructural de la cadena mínima `ped → fac → cfd → cob (+ inv)`.
Spec completa: [`../ERP-MAESTRO.md`](../ERP-MAESTRO.md) — **v12** (Parte IV, ERP-0).
**18 tablas** en el esquema `erp` (13 núcleo + 4 retail + 1 folios).

> **v4 (estrategia D+I)** y **v5 (auditoría)** SÍ tocaron ERP-0 (migración 001):
> - `sis_encargo` gana `eje_dei` (investigacion|desarrollo|operacion, nace en el origen) y
>   `traza_id` (uuid que viaja del Slack al asiento).
> - `sis_bitacora` gana `traza_id NOT NULL` — "una escritura sin traza no debe poder existir"
>   (sin default: el CLI DEBE propagar la traza; es el eje de `aud trazar`).
> - Nueva tabla `sis_agente` (+ `sis_agente_version`): la TARJETA DE AGENTE A2A — lo que cada
>   agente DEBE poder hacer; dep-aud (ERP-4C) la compara contra la realidad.
> Módulos posteriores (NO tocan ERP-0): `act` (activos, migr. 005, ERP-4B), `aud` (auditoría,
> migr. 006, ERP-4C) y `ctb` (contable, ERP-5B — v6: perfiles regulatorios, buzón de
> documentos, pólizas con partida doble estructural, balanza, cierre irreversible, estados
> financieros, presupuesto; v7 §5B.8: cierres anuales/amarres/expediente) y `pln` (planeación
> estratégica, ERP-7 — v8: "la fábrica es el producto", pipeline, % de reuso como métrica norte,
> migración 007). Forward-compat en `003_folios.sql`: whitelist de prefijos —
> `ACT- HAL- POL- DOC- PRO- CAS- DIF- NOM- COT- PRM-` además de los de la cadena. Packs/deptos
> posteriores: CRM conversacional (v10), **nómina `dep-nom`/ERP-5C** (v11: nom/per/asi, tarifas
> fiscales como datos versionados, doble compuerta aprobar≠dispersar, CFDI de nómina, doble firma
> contador+laboral), y motor comercial (cot/prc/prm). Decisiones D-07…D-31.

## Estado

- **Escritas y VALIDADAS** en un Postgres 16 efímero (staging aislado, contenedor desechable).
- **NO aplicadas** a ninguna BD durable todavía (decisión: dejar solo las migraciones).
  Cuando se decida el destino, aplicar en orden 001→004, snapshot antes, STAGING primero.

Todo vive en un esquema **`erp` aislado** de `public` (donde las verticales Hermes usan
`service_role`). Aquí el modelo es el opuesto: RLS con políticas por `cliente_id` + roles
dedicados; los CLIs/agentes **jamás** usan `service_role` (tiene BYPASSRLS y anula el aislamiento).

## Archivos (aplicar en este orden)

| # | Archivo | Qué crea |
|---|---------|----------|
| 001 | `001_nucleo.sql` | Núcleo (13 tablas): cob_cliente/saldo/cobro(+aplicacion), fac_factura/concepto/impuesto (impuestos POR concepto, CFDI 4.0), cfd_folio/timbre (estado intermedio + transiciones), sis_encargo (cola persistente + eje_dei + traza_id), sis_bitacora (append-only, traza_id NOT NULL), sis_agente(+_version) (tarjeta de agente A2A). Triggers de cuadre y de transición. |
| 002 | `002_pack_retail.sql` | Pack retail: inv_articulo/precio, ped_pedido/partida. El pack referencia al núcleo, nunca al revés. |
| 003 | `003_folios.sql` | Folios humanos por tenant (PED/FAC/CFD/COB/REP) con `erp.siguiente_folio()` atómico (anti-carrera). |
| 004 | `004_seguridad.sql` | Roles `rol_exe_fin`/`rol_swm`/`rol_admin` + RLS `FORCE` con política por `cliente_id` en toda tabla. Re-correr si un pack añade tablas. |

## Cómo validar (staging efímero, cero costo)

```bash
cd businessos
docker run -d --name erp0-validate -e POSTGRES_PASSWORD=pw postgres:16-alpine
docker exec erp0-validate bash -c 'until pg_isready -U postgres -q; do sleep 1; done'
for f in 001_nucleo 002_pack_retail 003_folios 004_seguridad; do
  docker exec -i erp0-validate psql -U postgres -v ON_ERROR_STOP=1 < erp/migrations/$f.sql
done
# pruebas de cierre (a/b/c/d) — ver el script usado en la sesión de construcción
docker rm -f erp0-validate
```

Validación de cierre ERP-0 que pasó (todas en verde):
- **(a)** cadena completa cuadra (subtotal+IVA = total = cobrado);
- **(b)** la BD rechaza sola: descuadre de cabecera, total negativo, emitir sin conceptos,
  descuadre cabecera↔detalle, transición de timbre inválida;
- **(c)** `rol_swm` no puede escribir (permission denied);
- **(d)** aislamiento por tenant: A no lee ni escribe filas de B (RLS).

## Antes de operar (bloqueos aguas abajo)

- **D-03 (bloquea ERP-1)**: elegir el stack único de los CLIs (Python/Go/Node). Sin esto no
  se escriben los 5 CLIs de la cadena.
- Al aplicar en Supabase: el MCP está read-only → usar management API para el DDL
  (`POST /v1/projects/{ref}/database/query`, UA `curl/8.0`), o el SQL Editor. Los roles son
  globales del cluster; el esquema `erp` no se expone por PostgREST (los CLIs conectan por
  Postgres directo con `rol_exe_fin`, no por la API REST).
