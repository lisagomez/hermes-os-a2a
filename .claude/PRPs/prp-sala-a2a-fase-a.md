# PRP — `sala-a2a` Fase A · Esqueleto verificable

> Departamento: **software**. Ejecuta el trío por la cola (Fase 10).
> Spec origen: `SPEC-sala-a2a.md` §8 Fase A (revisión r2).
> Estado: BORRADOR. No encolar hasta cerrar §9.
>
> **Revisión r2 (2026-08-07).** Corregido tras `docs/revision-sala-a2a.md`. Los
> cambios están en §0. El defecto principal de la r1 no era de diseño: su bloque
> de reglas **habría impedido arrancar al Supervisor**, y seis de sus doce
> compuertas eran imposibles de correr dentro del contenedor del juez.

---

## 0. Qué cambió en la revisión r2

| # | Qué decía r1 | Qué se corrigió | Evidencia |
|---|---|---|---|
| 1 | Bloque `[[gate]]` con `nombre`, `runner = "chequeos_sala:…"`, sin `departamento`, inactivos con `runner = ""` | **Formato real, validado cargándolo con el motor** | El cargador exige `regla` (`gates.py:91`), un runner de `("estatico","comando","modelo")` (`gates.py:24,96`) y `departamento` raíz (`gates.py:70`). El bloque r1 fue **rechazado** al probarlo: `sin campo departamento (obligatorio)` |
| 2 | Seis compuertas aseveraban sobre una base de datos viva | **Repartidas entre Supervisor y CI** según quién puede correrlas | El contenedor del Supervisor no trae Postgres ni `psql` ni socket de Docker (`supervisor-a2a/Dockerfile`, `docker-compose.yml:617-645`); `replay.sh:25` necesita Docker |
| 3 | Archivo nuevo `reglas/sala.toml` | **Entradas añadidas a `software.toml`** | `_gates_de` devuelve **una sola** lista por departamento (`executor.py:55-58`): un archivo aparte no "suma" a los gates base, los **sustituye** |
| 4 | "los gates base de `software.toml` se suman" | **Era falso**; por eso las entradas van en ese mismo archivo | idem |
| 5 | §9.1 hueco: nombre del helper de tenant | **Cerrado**: `app.tenant_actual()` existe | `supabase-organizaciones.sql:183` |
| 6 | §9.3 "el puerto 5000 está libre" | **Falso** → puerto **5300** | `docker-compose.yml:408` (`enriquecimiento-a2a`) |
| 7 | `migracion_idempotente` "duplica lo que replay.sh ya hace" | **Matiz**: el doble paso solo cubre `$MIGRACION` | `replay.sh:137-140`; el bucle de `orden.txt` (`:87-108`) aplica cada archivo **una vez** |

---

## 1. Por qué esta tarea existe

La Fase A no construye el producto: construye **la evidencia de que el producto
puede existir sin romper la tenencia**. Todo lo demás de la sala (departamentos
participando, compuertas de aprobación, marca blanca) se apoya en que el
aislamiento por tenant sea real y demostrado por sabotaje, no declarado.

Por eso el entregable de valor no es una UI de chat. Es una migración que
sobrevive a `replay.sh` dos veces y una suite que se pone roja cuando debe.

---

## 2. Alcance

**Dentro:**

- Migración `businessos/supabase-sala-a2a.sql` — las 6 tablas de la spec §4,
  índices, **el `create trigger`** de hilo de un solo nivel (no solo la
  función), RLS `enable` + `force` + políticas por `app_tenant` con `using` y
  `with check`, y **`aprobacion_solo_humana` declarada `as restrictive`**
  (spec §4.3 — sin esa palabra el invariante no existe).
- Extensión de `businessos/test-aislamiento-tenants.sql` con S1–S6 y S2b
  (spec §9) — **siete pruebas**.
- Extensión de `businessos/tenancy/control-reversion.sh` con los siete
  sabotajes.

> **Formato obligatorio de los marcadores.** Los gates de §5 los cuentan, así que
> el formato es parte del contrato, no una preferencia de estilo:
> - cada prueba abre con un comentario `-- S<n>[letra] · <descripción>` al
>   principio de línea (`-- S1 · …`, `-- S2b · …`), en la línea del patrón
>   `T<n> ·` que la suite ya usa;
> - cada sabotaje es una función cuyo nombre empieza por `sabotaje_sala`.
>
> Un gate que cuenta y un ejecutor que no sabe qué contar es trabajo correcto
> tirado a la basura — la lección del 2026-07-12, por el otro lado.
- **Alta de la migración en `businessos/tenancy/orden.txt`.** Si no está en el
  manifiesto, el CI no la ve y todo lo anterior es decorativo.
- Servicio `businessos/sala-a2a/` con superficie mínima: `/health`,
  `GET /canales`, `GET /canales/{id}/mensajes`, `POST /mensajes`,
  `POST /lecturas`. Sin card A2A todavía, sin `message/send`, sin agentes.
  Puerto **5300**.
- Frontend mínimo en `businessos/frontends/sala/`: un canal, lista de mensajes,
  hilo, no-leídos, Realtime. **Build de producción**, no `next dev`.
- Alta en `app-registry` con `sync-vendored.mjs --check` cableado al gate.
- Las entradas `[[gate]]` de §5 añadidas a
  `businessos/supervisor-a2a/reglas/software.toml`.

**Fuera, explícitamente:**

- Agentes, departamentos, menciones, tareas, aprobaciones en runtime. La tabla
  `sala_aprobaciones` se crea y se prueba vacía; nadie escribe en ella todavía.
- Puentes de Slack, Telegram o correo.
- Búsqueda, reacciones en UI, adjuntos, DMs.
- **Aplicar la migración a producción.** Eso es acción humana de Elisa por
  management API, como toda DDL de este proyecto.
- **Un módulo `chequeos_sala.py`.** Los gates de §5 son de comando a propósito
  (ver §5.1): no hace falta código Python nuevo en el Supervisor, y por tanto
  tampoco un `COPY` nuevo en su Dockerfile.

---

## 3. Fronteras del Ejecutor

Literales, para que el Supervisor las pueda verificar:

- No toca `supabase-organizaciones.sql` ni ninguna de las 17 tablas ya migradas.
- No aplica DDL contra producción. Solo contra el efímero de `replay.sh`.
- No usa `service_role` en ninguna ruta nueva.
- No modifica `trio-contrato/` — la sala no agrega departamento. *(Por eso los
  gates van en `software.toml` y no en un archivo propio: un departamento nuevo
  exigiría tocar el contrato.)*
- No renombra ni convierte ningún `tenant_id` existente.

---

## 4. DAG de sub-tareas

Para el Coordinador. Recordar que el worker es serial: el DAG compra orden y
dependencias, no paralelismo.

| # | Sub-tarea | Depende de |
|---|---|---|
| 1 | Migración + trigger + RLS restrictiva, idempotente, + alta en `orden.txt` | — |
| 2 | S1–S6 y S2b en la suite de aislamiento | 1 |
| 3 | Los siete sabotajes en `control-reversion.sh` | 2 |
| 4 | Servicio `sala-a2a` (puerto 5300) con sus tests | 1 |
| 5 | Frontend mínimo + Realtime + build de producción | 4 |
| 6 | Entradas `[[gate]]` en `software.toml` | 2, 3, 5 |

La 6 va al final a propósito: los gates se escriben cuando ya existe lo que
verifican, no antes.

---

## 5. Criterios de aceptación como gates

Se añaden a `businessos/supervisor-a2a/reglas/software.toml` — **no** a un
archivo nuevo (ver §0.3). Formato real, patrón de `procesos.toml`.

**Este bloque está validado**: se cargó con `gates.cargar_configs` del motor
real y se ejecutó sobre un árbol de prueba, incluyendo un control de reversión
en el que tres sabotajes pusieron rojos exactamente los tres gates
correspondientes.

```toml
# ═══════════════════════════════════════════════════════════════════════════
#  sala-a2a · Fase A
#
#  TODOS son `runner = "comando"` a proposito. El Supervisor recibe una RUTA DE
#  ARCHIVOS, no una base de datos: su contenedor no tiene Postgres, ni psql, ni
#  socket de Docker. Un gate que asevere sobre una BD viva sale `no_ejecutable`
#  = RECHAZO, aunque el codigo este perfecto.
#
#  El aislamiento por cliente contra Postgres REAL lo verifica el CI
#  (.github/workflows/tenencia.yml). Reparto: el Supervisor juzga lo que puede
#  leer; el CI juzga lo que necesita una base de datos.
# ═══════════════════════════════════════════════════════════════════════════

[[gate]]
regla = "sala_rls_force_en_seis_tablas"
runner = "comando"
comando = '''bash -c "awk '/force row level security/{n++} END{exit !(n>=6)}' businessos/supabase-sala-a2a.sql"'''

[[gate]]
regla = "sala_aprobacion_restrictiva"
runner = "comando"
comando = '''bash -c "grep -qiE 'as[[:space:]]+restrictive' businessos/supabase-sala-a2a.sql"'''

[[gate]]
regla = "sala_trigger_hilo_declarado"
runner = "comando"
comando = '''bash -c "grep -qiE 'create[[:space:]]+trigger' businessos/supabase-sala-a2a.sql"'''

# OJO con los dos gates NEGADOS (`! grep`): `grep` sobre una ruta inexistente
# sale con codigo 2, y la negacion lo convierte en 0 — el gate diria "limpio"
# SIN HABER MIRADO NADA. Es el gotcha 3 de §7 ("asercion sobre 0 filas no es
# asercion") por la puerta de atras. Por eso ambos exigen ANTES que su objetivo
# exista; si no existe, el gate cae en rojo, que es lo correcto.

[[gate]]
regla = "sala_sin_service_role"
runner = "comando"
comando = '''bash -c "test -d businessos/sala-a2a && test -d businessos/frontends/sala && test -f businessos/supabase-sala-a2a.sql && ! grep -rqiE 'service_role|SUPABASE_SERVICE_ROLE_KEY' businessos/sala-a2a businessos/frontends/sala businessos/supabase-sala-a2a.sql"'''

[[gate]]
regla = "sala_migracion_en_manifiesto"
runner = "comando"
comando = '''bash -c "grep -q 'businessos/supabase-sala-a2a.sql' businessos/tenancy/orden.txt"'''

[[gate]]
regla = "sala_suite_s1_s6"
runner = "comando"
comando = '''bash -c "awk '/^-- S[0-9]+[a-z]? /{n++} END{exit !(n>=7)}' businessos/test-aislamiento-tenants.sql"'''

[[gate]]
regla = "sala_siete_sabotajes"
runner = "comando"
comando = '''bash -c "awk '/sabotaje_sala/{n++} END{exit !(n>=7)}' businessos/tenancy/control-reversion.sh"'''

[[gate]]
regla = "sala_realtime_declarado"
runner = "comando"
comando = '''bash -c "grep -q 'alter publication supabase_realtime' businessos/supabase-sala-a2a.sql"'''

[[gate]]
regla = "sala_app_registry_sincronizado"
runner = "comando"
comando = "node businessos/frontends/app-registry/scripts/sync-vendored.mjs --check"
timeout_s = 120

[[gate]]
regla = "sala_frontend_sin_next_dev"
runner = "comando"
comando = '''bash -c "test -f businessos/frontends/sala/Dockerfile && test -f businessos/frontends/sala/package.json && ! grep -rq 'next dev' businessos/frontends/sala/Dockerfile businessos/frontends/sala/package.json"'''

# --- gate de modelo: DECLARADO pero inactivo hasta tener runner real ---
[[gate]]
regla = "sala_revision_ux"
runner = "modelo"
activo = false
```

A estos se suman los gates que **ya viven en `software.toml`** y corren siempre
por ser del mismo departamento: `build`, `typecheck`, `lint`, `tests`,
`sin_any`, `sin_secretos`, `archivos_max_500`, `rls_en_migraciones`, más
`code_review` y `security_review` inactivos.

*El gate inactivo lleva `runner = "modelo"`, no `runner = ""`: un runner
desconocido invalida la configuración **aunque el gate esté inactivo**, porque
esa validación ocurre antes (`gates.py:96` precede a `gates.py:104`).*

### 5.1 Por qué comandos y no chequeos en Python

La r1 proponía `runner = "chequeos_sala:<gate>"`, que no es un runner válido, y
apuntaba a un módulo `chequeos_sala.py` inexistente. Aunque se corrigiera el
formato, un gate `estatico` **activo** exige que su `chequeo` ya esté registrado
en `gates.CHEQUEOS` al cargar (`gates.py:110-115`) — es decir, exigiría el
módulo antes de poder validar nada.

Con `runner = "comando"` no hace falta código nuevo en el Supervisor: se apoya
en el `bash` que su imagen ya trae, se puede validar hoy, y **se elimina de
paso el riesgo del `COPY` olvidado en el Dockerfile**, que este proyecto ya ha
pagado dos veces.

### 5.2 El reparto de la verificación

Tres jueces, cada uno con lo que puede probar. Escribirlo evita que alguien
espere de uno lo que solo otro puede hacer.

| Juez | Qué verifica | Por qué le toca |
|---|---|---|
| **Supervisor** | Lo asertable leyendo el árbol de archivos: que la política sea restrictiva, que el disparador exista, que no haya `service_role`, que la migración esté en el manifiesto, que las pruebas y los sabotajes estén escritos | Recibe una ruta de archivos y tiene node, git y bash |
| **CI** (`.github/workflows/tenencia.yml`) | El aislamiento **contra Postgres real**: replica el esquema, aplica la migración dos veces y corre la suite y los sabotajes | Corre en cada PR a `master`, sin filtro de rutas, sobre un runner con Docker |
| **Humano** (Elisa) | Enumerar producción, aplicar la DDL, y comprobar Realtime con `app_tenant` | Nadie más tiene la credencial ni puede ver un Supabase real |

> ⚠️ **Pendiente de confirmar por quien tenga administración del repositorio:**
> si "Tenencia" es un *check obligatorio* de la rama `master`. Si solo avisa y no
> bloquea, la segunda fila de esta tabla es una red que informa, no una que
> detiene — y eso hay que saberlo antes de apoyarse en ella. La consulta a la
> protección de la rama devuelve 404 sin permiso de administración.

### 5.3 El control positivo, ahora contra el principal correcto

`sala_aprobacion_restrictiva` (Supervisor) comprueba que la palabra está en el
SQL. **S2** (CI) comprueba que *funciona*: un `app_tenant` legítimo intenta
firmar una aprobación a nombre de otra persona y **debe ser rechazado**.

La r1 llamaba "el gate que importa" a una prueba que atacaba con un rol de
servicio. Ese rol tiene `bypassrls` y no es el principal que la política acota:
esa prueba salía verde con el agujero abierto. Verificado sobre Postgres 16
real — con el diseño de la r1, la firma falsificada **entraba**.

---

## 6. Presupuesto y ruteo

- Motor: GLM-5.2 vía seam z.ai (`EJECUTOR_ENGINE=claude`, `modelo_pref="glm-5.2"`).
- `presupuesto_usd = 6` para el DAG completo, tope duro. Sub-tarea 1 y 2 son las
  caras (SQL con verificación real); 5 puede sorprender.
- Capa de exclusión primero: aquí no hay dato de cliente, no hay modelo prohibido.
  Se deja escrito para que el coordinador no tenga que inferirlo.
- Registro en `token_usage` con `task_id` no nulo, vertical `trio`.
- Este tope es del **trabajo de construcción** y no tiene relación con el
  presupuesto por cliente de `guardia-presupuesto` (spec §3.2), que gobierna el
  consumo en runtime de la Fase C. Son dos contabilidades distintas, dicho aquí
  para que nadie las confunda.

---

## 7. Gotchas prevenidos

Cada uno cobró antes en este proyecto:

1. **Idempotencia del bloque de FK** — la migración de tenencia moría en la 2ª
   corrida por una constraint sin guarda. Toda constraint lleva su guarda.
2. **El doble paso de `replay.sh` NO cubre la migración nueva.** Se aplica solo
   al archivo de `$MIGRACION` (`replay.sh:137-140`); el bucle de `orden.txt`
   (`:87-108`) aplica cada archivo **una vez**. Para probar la idempotencia de
   `supabase-sala-a2a.sql` hay que extender ese bloque o parametrizar
   `$MIGRACION`. La r1 daba esto por resuelto y no lo estaba.
3. **Aserción sobre 0 filas no es aserción** — T11 recorría cero filas y pasaba.
   La suite siembra antes de aseverar y la cobertura es aserción, no aviso.
4. **`next dev` en runtime** — deuda ya cargada por `control-interno`. No se
   duplica.
5. **Drift entre repo y producción** — el runbook de tenencia cazó 62 tablas
   donde el repo decía 71. La verificación humana de §8 empieza por enumerar.
6. **Puertos ocupados** — el 5000 estaba tomado y dos documentos lo daban por
   libre. Antes de fijar uno, mirar el compose.

---

## 8. Verificación humana (Elisa, después del veredicto)

El Supervisor no puede aprobar lo que no puede ver desde el efímero. Quedan como
acción humana, en este orden:

1. Enumerar producción y confirmar que no hay drift nuevo antes de aplicar.
2. Aplicar `supabase-sala-a2a.sql` por management API con permiso explícito.
3. Verificar por consultas, no por la suite: la suite siembra tenants de prueba
   imborrables y no se corre contra producción.
4. Confirmar que Realtime entrega con `app_tenant` y no solo con `authenticated`.
   Si no lo hace, se abre PRP de plan B (Broadcast con autorización por canal) y
   la Fase A no se da por cerrada. **Esto ya no es un descubrimiento de la fase:
   es condición previa (§9.2).**

---

## 9. Antes de encolar

**Cerrado en la r2:**
- ~~Nombre del helper de tenant~~ → es `app.tenant_actual()`, existe y devuelve
  `uuid` (`supabase-organizaciones.sql:183`).
- ~~El puerto 5000 está libre~~ → no lo estaba; se fija el **5300**.

**Sigue abierto, y ahora sí bloquea:**

1. **Decisión 5 de la spec §14 — qué tabla representa a un humano.** La r1 la
   difería; no se puede. De ella dependen la clave foránea de `decidida_por`, la
   política de §4.3 y la prueba S2, que son la sub-tarea 1 y la 2 del DAG. Si el
   Ejecutor la encuentra sin cerrar, la inventará.
2. **¿Emite el token de sesión el claim `org_id`?** Sin él, `app.tenant_actual()`
   devuelve nulo desde el navegador y las políticas niegan todo — el frontend de
   la sub-tarea 5 no vería un solo mensaje. Se comprueba en minutos contra el
   Supabase real y decide si hace falta el plan B.
3. **Nombre definitivo del servicio.** `sala-a2a` es una propuesta. Cambiarlo
   después cuesta un rename en compose, registry y Dockerfile.

La decisión 3 de la spec §14 (quién puede encolar mencionando un departamento)
sigue sin bloquear la Fase A, pero sí la C.

---

## 10. Definición de terminado

La Fase A cierra cuando, en el mismo veredicto:

- los 10 gates activos de sala en `software.toml` en verde,
- los gates base de `software.toml` en verde,
- el CI de tenencia en verde, con los siete sabotajes cazados —incluido el que
  quita `as restrictive` y debe poner roja la prueba S2—,
- y dos humanos de tenants distintos conversando en el frontend sin que ninguno
  vea al otro, demostrado en pantalla, no en un log.

Un verde que nunca se ha visto en rojo no informa: por eso el control de
reversión no es un extra, es parte de la definición.
