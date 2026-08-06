# Migración de tenencia — orden de aplicación

> **Estado (2026-08-06): APLICADA A PRODUCCIÓN** (autorizada por Elisa, vía
> management API). El paso 1 del runbook encontró el drift esperado: prod tenía
> **62** tablas, no 71 — faltaban `supabase-egcrm-herramientas.sql`
> (transcripciones + aprobaciones_salientes, ambas de la lista TENANT: la
> migración habría abortado) y `supabase-fase14-agendamiento.sql` (7 agenda_*),
> mergeadas pero nunca aplicadas. Se aplicaron primero, luego la migración.
> Verificado: 17/17 migradas, cero `tenant_id` nulos (las 24 filas reales de
> `buzon_bitacora` backfilleadas SIN disparar el trigger append-only),
> RLS+FORCE+política en las 17, `app_tenant` sin bypass, `hermes-interno`
> activa. `get_advisors` cazó 3 hallazgos que el efímero no ve — vista
> SECURITY DEFINER, `usuarios`/`org_bitacora` sin RLS, funciones sin
> `search_path` — corregidos en prod Y horneados en este archivo.

Dos archivos, un orden, cero atajos.

- `supabase-organizaciones.sql` — la migración (aditiva, idempotente)
- `test-aislamiento-tenants.sql` — la suite que la valida

Y cuatro de andamiaje, en `businessos/tenancy/`:

- `00-prelude.sql` — roles, esquema `auth` y extensiones que Supabase ya trae.
  Aborta si detecta una plataforma Supabase REAL (hace `create or replace` de
  `auth.uid()`; un comentario no era guarda suficiente)
- `01-preseed-produccion.sql` — siembra filas "de producción" en las dos tablas
  append-only ANTES de migrar: el backfill se prueba contra datos, no contra el
  vacío (cero filas ⇒ cero triggers ⇒ cero verdad)
- `orden.txt` — manifiesto: qué `.sql` del repo reconstruyen el esquema y en qué
  orden (el orden **no** es el de los nombres: ver los comentarios del archivo).
  `replay.sh` **falla** si un `.sql` del repo no está aquí ni declarado como
  excluido: un manifiesto atrasado deja tablas fuera del efímero y T5 no puede
  echar en falta lo que no existe
- `replay.sh` — levanta el efímero, replica, pre-siembra, migra dos veces,
  verifica el backfill sobre las filas pre-sembradas y corre la suite
- `control-reversion.sh` — rompe la migración a propósito (6 sabotajes) y exige
  que el ciclo se ponga rojo

---

## Lo que se encontró al enumerar de verdad

`public` tiene **71 tablas**, no 22. Y no hay un modelo de tenencia: hay **tres**
conviviendo, más el del ERP en su propio esquema.

| Lista | Cuántas | Qué va ahí |
|---|---|---|
| `app.tablas_tenant` | 17 | Dato de cliente **sin** tenencia previa → reciben `tenant_id uuid` + FK + RLS |
| `app.tablas_globales` | 5 | Referencia compartida o singleton, con motivo escrito |
| `app.tablas_tenant_ajeno` | 49 | Tienen tenencia, pero por **otro mecanismo** |

El tercer registro es nuevo y existe porque la realidad no cabía en dos listas:

- **`slug_text` (17 tablas)** — agendamiento, buzón, guardia de presupuesto, CRM
  y `sla_por_etapa` ya llevan `tenant_id text`, casi todas con `default 'a2a'`.
  No es drift: `supabase-guardia-presupuesto.sql` lo razona explícitamente
  ("tenant_id TEXT, no uuid como propone el doc origen") y `supabase-buzon.sql`
  lo sigue "por coherencia". El puente con esta capa es el **slug**.
- **`auth_uid` (32 tablas)** — la cabina control-interno, que comparte proyecto
  Supabase desde 2026-07-15 y aísla por usuario, no por organización.
- El **ERP** (esquema `erp`, 22 tablas) queda fuera: ya tiene su tenencia con
  `app.cliente_id` + `rol_exe_fin`. Ojo: T5 solo escanea `public`, así que el
  criterio "todas clasificadas" es, por construcción, de `public`.

Clasificar mal hacia `globales` es una fuga. Clasificar mal hacia `tenant` es un
error visible que se corrige en minutos. Ante la duda, `tenant`.

### Las tres clasificaciones que hay que revisar con nombre y apellido

1. **`profiles` → `auth_uid`, jamás `tenant`.** La escribe el trigger
   `handle_new_user` sobre `auth.users`. Añadirle `tenant_id NOT NULL` rompe el
   alta de usuarios de **todo** A2ABot (es el cuasi-incidente del 2026-07-15).
2. **`buzon_control` → global.** Tiene `check (id = 1)` y PK sobre `id`: es un
   singleton, una sola fila en toda la tabla. No puede haber una por tenant.
3. **`token_usage` → `slug_text`.** Su `tenant_id` es text y nullable a
   propósito (null = gasto de la casa). Por eso `v_margen_tenant` une por slug.

---

## Orden

Todo el ciclo está en un script; no hace falta copiar comandos:

```bash
businessos/tenancy/replay.sh          # esquema + migración ×2 + suite
businessos/tenancy/control-reversion.sh   # y que se ponga roja cuando debe
```

Lo que hace, por si hay que depurarlo a mano: levanta `postgres:16-alpine`,
aplica el prelude, replica los 38 archivos de `orden.txt`, **pre-siembra las
tablas append-only** (simula la base con datos que la migración encontrará en
producción), corre la migración **dos veces** (idempotencia), verifica que las
filas pre-sembradas quedaron con `tenant_id` poblado, y luego la suite.

**El orden importa**: la migración va dos veces *antes* de la suite, no
alternada. La suite siembra tablas append-only (`buzon_bitacora`,
`enriquecimiento_intento`, que prohíben `DELETE` por disparador) y por tanto
solo puede correr **una vez por base**. Corriéndola al final se verifica el
aislamiento sobre una base que ya aguantó la migración dos veces, que es el
estado real de producción tras un reintento. La suite aborta con un mensaje
explícito si detecta que ya corrió.

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

### 2. `NOT NULL` bloquea la tabla — con la honestidad que faltaba

`alter table ... set not null` directo exige un escaneo completo con bloqueo
`ACCESS EXCLUSIVE`. El bloque 5 usa el rodeo estándar: constraint `NOT VALID`
(instantánea) → `validate` (bloqueo suave) → `set not null` (que ya no escanea) →
soltar la constraint.

**Matiz que la primera versión vendía mal**: con todo el archivo en UNA
transacción (que es como está, y es lo correcto hoy — atomicidad, rollback
limpio verificado), el rodeo **no ahorra bloqueo alguno**: los `ACCESS
EXCLUSIVE` se retienen hasta el `COMMIT` de todas formas. El rodeo se conserva
porque permite partir el archivo en transacciones por bloque el día que una
tabla sea grande de verdad — solo entonces el `validate` paga su bloqueo suave.

### 2b. El backfill no puede ser un `UPDATE` (tablas append-only)

Dos de las 17 tablas (`buzon_bitacora`, `enriquecimiento_intento`) prohíben
`UPDATE` por trigger (control ISO 27001 5.33). Un backfill
`update ... set tenant_id` **aborta la migración entera** contra una base con
datos — y el efímero no lo veía porque migraba con todo vacío (cero filas ⇒
cero triggers). El bloque 4 puebla con `add column ... default <org>` (en PG11+
es metadato: las filas existentes leen el default sin UPDATE y sin disparar
triggers) y suelta el default acto seguido. `replay.sh` pre-siembra esas tablas
y verifica el backfill; el sabotaje 5 de `control-reversion.sh` mantiene el
caso en rojo permanente.

### 3. `with check` — con un matiz que este documento tenía mal

`using` filtra lo que se lee; `with check` decide qué se puede escribir.

La versión anterior de este documento decía que una política con `using` pero
**sin** `with check` deja pasar un `insert` con `tenant_id` ajeno. **Es falso**, y
lo demostró el control de reversión: al borrar la línea `with check`, la suite
siguió en verde — porque en una política `FOR ALL`, Postgres usa la expresión de
`using` también como check cuando `with check` se omite. El sabotaje no rompía
nada.

Lo que sí abre el agujero es un `with check` **permisivo** (`(true)`), o una
política que solo cubra `SELECT`. Eso es lo que ahora saboteamos, y **T2** lo
caza. Además T2 exige que el rechazo sea `SQLSTATE 42501` (violación de
política): antes aceptaba *cualquier* excepción como éxito, y en `leads` un
insert mínimo falla por `lead_id NOT NULL` — la prueba pasaba en verde sin
ejercitar una sola línea de política.

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

- [x] Las **71** tablas de `public` clasificadas, ninguna huérfana (T5 en verde)
- [x] Migración corre limpia en efímero (38/38 archivos del esquema replicados)
- [x] Migración corre limpia **contra una base con datos**: las append-only se
      pre-siembran antes de migrar y el backfill se verifica sobre sus filas
- [x] Segunda corrida idempotente
- [x] Las pruebas pasan — **trece** bloques (T1–T12 más T5b; T11 son dos):
      T5b (registro sin tablas fantasma), T11 (la tenencia ajena declarada
      sigue siendo cierta — reparada: su aserción NOT NULL filtraba por un
      mecanismo inexistente y recorría 0 filas) y T12 (el puente de costo no
      cruza tenants) son nuevas
- [x] La suite se pone **roja** cuando debe: 6 sabotajes, 6 cazados
      (`control-reversion.sh`), incluidos el backfill-por-UPDATE contra
      append-only y el NOT NULL retirado que T11 vigila
- [x] La siembra cubre las 17 tablas, y la cobertura es una **aserción**: si una
      tabla deja de sembrarse, la suite falla en vez de cubrir menos en silencio
- [x] Rol `app_tenant` creado, sin bypass ni superusuario
- [x] **Decisión escrita** sobre `service_role` → `businessos/gobernanza/decision-service-role.md`
- [x] Suite en CI, corriendo en cada PR (`.github/workflows/tenencia.yml`)
- [x] **Aplicada a producción con la organización interna sembrada**
      (2026-08-06, autorizada por Elisa; antes hubo que aplicar
      egcrm-herramientas y fase14-agendamiento, mergeadas pero nunca aplicadas)
- [x] **Datos actuales todos con `tenant_id` de `hermes-interno`, ninguno nulo**
      (verificado tabla por tabla; `buzon_bitacora` con 24 filas reales
      backfilleadas sin tocar su trigger append-only)
- [x] **`get_advisors` sin alertas nuevas** tras el apply (los 3 hallazgos que
      levantó — vista definer, `usuarios`/`org_bitacora` sin RLS, `search_path`
      — quedaron corregidos en prod y en el archivo)

---

## Runbook de producción (para la máquina con `SUPABASE_ACCESS_TOKEN`)

Los dos últimos criterios no se pueden cerrar desde la máquina de Victor: no
tiene el token de management ni SSH al servidor. El resto ya está verificado.

**1 · Enumerar las tablas REALES de producción.** El manifiesto reconstruye el
esquema desde el repo, y el repo puede no ser idéntico a producción (arreglos
aplicados a mano que no viven en ningún `.sql`). Antes de migrar:

```sql
select table_name from information_schema.tables
 where table_schema = 'public' and table_type = 'BASE TABLE' order by 1;
```

Si aparece alguna que no esté en las tres listas, **T5 lo detectará y la
migración de todos modos no la tocará** — pero clasifícala antes, no después.

**2 · Aplicar** por management API (`POST /v1/projects/{ref}/database/query`,
UA `curl/8.0` por el gotcha de Cloudflare 1010), en este orden:
`supabase-organizaciones.sql` → verificar → `test-aislamiento-tenants.sql`.

⚠️ **La suite siembra dos tenants de prueba (`acme`, `globex`) y no puede
retirarlos** (tablas append-only). **No la corras contra producción**: su sitio
es el efímero y el CI. En producción, la verificación es el paso 3.

**3 · Verificar en producción, sin sembrar nada:**

```sql
-- ninguna fila sin tenant tras el backfill
select tabla, migrada_en from app.tablas_tenant order by 1;
select count(*) from leads where tenant_id is null;   -- debe ser 0
-- la organización interna existe y es la dueña del dato de hoy
select id, slug, estado from organizaciones where slug = 'hermes-interno';
```

**4 · Si algo sale mal**, el bloque de reversión está comentado al final de la
migración y sigue siendo válido **mientras no exista un segundo tenant**.

---

## Después de esto

Desbloqueado: el PRP de aprovisionamiento de workspace, el cobro por tenant vía
`v_margen_tenant`, y el primer cliente externo en pool.

Pendiente, con fecha límite en el segundo cliente: que la aplicación abandone
`service_role`. Hasta entonces, la base tiene las políticas puestas pero nadie las
está usando.
