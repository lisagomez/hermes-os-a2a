# Migración de tenencia — orden de aplicación

Dos archivos, un orden, cero atajos.

- `supabase-organizaciones.sql` — la migración (aditiva, idempotente)
- `test-aislamiento-tenants.sql` — la suite que la valida

---

## Antes de correr nada

**1. Enumera tus tablas reales.** Los archivos traen nombres de ejemplo. Sustitúyelos:

```sql
select table_name from information_schema.tables
 where table_schema = 'public' and table_type = 'BASE TABLE'
 order by 1;
```

Cada tabla del resultado va a **una** de dos listas, sin excepción:

| Lista | Qué va ahí | Ejemplos tuyos |
|---|---|---|
| `app.tablas_tenant` | Datos que pertenecen a un cliente | `leads`, `tareas`, `facturas`, `contratos_sc`, `token_usage`, `crm_*`, `erp.*`, agendamiento M1–M5 |
| `app.tablas_globales` | Referencia compartida, con motivo escrito | `reglas` del grafo, catálogos, `usuarios` |

Clasificar mal hacia `globales` es una fuga. Clasificar mal hacia `tenant` es un
error visible que se corrige en minutos. Ante la duda, `tenant`.

**2. `reglas` es global a propósito.** El grafo regulatorio es conocimiento
jurisdiccional, idéntico para todos los clientes, y además vive en un Postgres
distinto. Ponerle `tenant_id` sería duplicar la LISR por cliente.

**3. La siembra de la suite inserta filas con solo `tenant_id`.** Si tus tablas
tienen otras columnas `NOT NULL`, ajusta esa parte o la suite falla en la siembra —
que es un fallo legítimo, no un falso positivo.

---

## Orden

```bash
# 1 · Efímero, siempre primero
docker run -d --name pg-prueba -e POSTGRES_PASSWORD=x -p 5433:5432 postgres:16-alpine
sleep 8
URI="postgresql://postgres:x@localhost:5433/postgres"

psql "$URI" -v ON_ERROR_STOP=1 -f esquema-actual.sql          # tu esquema de hoy
psql "$URI" -v ON_ERROR_STOP=1 -f supabase-organizaciones.sql
psql "$URI" -v ON_ERROR_STOP=1 -f test-aislamiento-tenants.sql

# 2 · Idempotencia: la segunda corrida debe pasar igual
psql "$URI" -v ON_ERROR_STOP=1 -f supabase-organizaciones.sql

docker rm -f pg-prueba
```

Solo cuando las tres corridas pasan limpias se aplica a producción vía la API de
management, en el mismo patrón que el resto de tus migraciones.

---

## Los cinco gotchas

### 1. `service_role` evade RLS — el que importa

En Supabase, `service_role` tiene `BYPASSRLS`. **Las políticas de este archivo no lo
detienen.** Si tus superficies y agentes siguen conectando como `service_role`, el
bloque 6 es decorativo y el aislamiento vive únicamente en el código de la aplicación.

La migración crea el rol `app_tenant` con `NOBYPASSRLS`. Adoptarlo es un cambio del
lado de la aplicación —conectar con ese rol, o `SET ROLE` como ya hace el puente
`cli_fin` para el ERP— y **sin ese cambio la migración no compra protección real**.

Esta es la deuda que el plan de multitenencia fija como límite duro: resolverla
antes del segundo cliente.

### 2. `NOT NULL` bloquea la tabla

`alter table ... set not null` directo exige un escaneo completo con bloqueo
`ACCESS EXCLUSIVE`. El bloque 5 usa el rodeo estándar: constraint `NOT VALID`
(instantánea) → `validate` (bloqueo suave) → `set not null` (que ya no escanea) →
soltar la constraint.

Con tus volúmenes de hoy da igual. Con datos de clientes, es la diferencia entre una
migración invisible y una caída.

### 3. Sin `with check`, el aislamiento es de solo lectura

`using` filtra lo que se lee. `with check` impide escribir en otro tenant. Una
política con `using` pero sin `with check` deja pasar un `insert` con `tenant_id`
ajeno sin ningún ruido. La prueba **T2** existe por esto.

### 4. `FORCE` no es redundante

`enable row level security` no aplica al dueño de la tabla. `force` sí. Tu doctrina
actual ya lo hace bien en las 22 tablas; el bloque 6 lo mantiene y la prueba **T6**
lo verifica.

### 5. El control positivo

La prueba T1 no solo verifica que no aparezcan filas ajenas: verifica que **sí**
aparezcan las propias. Una política que niega todo pasaría la primera mitad con
honores. Mismo principio que el simulacro de revocación de Fabric: rechazo observado
**más** control positivo, siempre las dos mitades.

---

## Las pruebas que valen más

T1–T4 verifican el estado de hoy. **T5–T8 verifican el futuro**, y son las que
justifican tener suite:

- **T5** falla sola cuando alguien agrega una tabla sin clasificarla. Nadie tiene que
  acordarse de nada.
- **T6** falla si alguien crea una tabla con RLS pero sin política, o sin `FORCE`.
- **T7** falla si el rol de la aplicación gana `BYPASSRLS` o superusuario.
- **T8** falla si falta el índice —cada consulta escanearía toda la tabla— o la FK,
  que dejaría entrar `tenant_id` inexistentes.

Ponlas en CI. Su valor no está en la primera corrida sino en la corrida número
doscientos, cuando alguien que no leyó este documento agregue una tabla.

---

## Criterios de aceptación

- [ ] Las 22 tablas clasificadas, ninguna huérfana (T5 en verde)
- [ ] Migración corre limpia en efímero
- [ ] Segunda corrida idempotente
- [ ] Las diez pruebas pasan
- [ ] T1 falla si se comenta el control positivo (prueba de la prueba)
- [ ] Rol `app_tenant` creado, sin bypass ni superusuario
- [ ] **Decisión escrita** sobre cuándo la aplicación deja de usar `service_role`
- [ ] Suite en CI, corriendo en cada PR
- [ ] Aplicada a producción con la organización interna sembrada
- [ ] Datos actuales todos con `tenant_id` de `hermes-interno`, ninguno nulo

---

## Después de esto

Desbloqueado: el PRP de aprovisionamiento de workspace, el cobro por tenant vía
`v_margen_tenant`, y el primer cliente externo en pool.

Pendiente, con fecha límite en el segundo cliente: que la aplicación abandone
`service_role`. Hasta entonces, la base tiene las políticas puestas pero nadie las
está usando.
