# Migraciones del Supabase compartido (proyecto A2ABot)

Casa de las migraciones del esquema `public` del proyecto Supabase compartido
(negocio + verticales + frontends que lo comparten desde 2026-07-15).

## Reglas de la casa

- **El orden NO es el de los nombres.** El orden canónico de aplicación vive en
  `../tenancy/orden.txt` (con los porqués comentados: hay dependencias
  cronológicas que el nombre no refleja). Un `.sql` nuevo aquí que no esté en
  ese manifiesto pone en rojo el gate de tenencia (`../tenancy/replay.sh`).
- **Mergeado ≠ aplicado.** Estos archivos son la FUENTE; aplicar a producción
  es un paso aparte (management API `POST /database/query`, UA `curl/8.0`) y se
  verifica sondeando PostgREST antes/después (aprendizajes 2026-08-02/04/05).
- **Checklist de toda migración nueva**: `get_advisors` antes y después; toda
  vista nueva con `security_invoker = true` + revoke anon/authenticated; toda
  tabla nueva con RLS habilitado aunque no tenga políticas.
- `tests/` contiene pruebas de datos (no esquema); la suite de aislamiento de
  tenencia vive junto a su arnés en `../tenancy/test-aislamiento-tenants.sql`.

## Qué NO vive aquí

- `../erp/migrations/` — el ERP (esquema `erp`, tenencia propia `app.cliente_id`).
- `../grafo/seed/` — el grafo regulatorio (Postgres propio del servicio).
- `../frontends/control-interno/supabase/migrations/` — la cabina, convención
  Supabase CLI (comparte proyecto: sus tablas sí aparecen en `orden.txt`).
