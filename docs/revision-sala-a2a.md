# Revisión técnica — `SPEC-sala-a2a.md` y `prp-sala-a2a-fase-a.md`

> Revisión de la r1 de ambos documentos contra el código real del repositorio.
> Fecha: 2026-08-07. Origen de la revisión r2 de los dos documentos.
>
> **Convención:** cada afirmación va marcada como `[HECHO]` (verificado, con
> cita `archivo:línea` o con evidencia de ejecución) o `[INFERENCIA]`. No se
> atribuye ningún dato que no aparezca en los documentos o en el código citado.
>
> **Estado final: no queda ninguna inferencia sin cerrar.** Las dos que la
> primera pasada no pudo resolver leyendo se ejecutaron contra Postgres 16 real
> y **ambas resultaron ciertas**.

---

## 1. Resumen ejecutivo

Los dos archivos **no son versiones del mismo documento**: `SPEC-sala-a2a.md`
define una superficie nueva y `prp-sala-a2a-fase-a.md` deriva de su §8 la
primera fase para encolarla al trío. La comparación útil no es un diferencial de
versiones sino **fidelidad de derivación**.

**Conclusión.** El diseño conceptual es sólido. Pero el invariante que da sentido
a toda la aplicación —que ningún componente que ejecuta un modelo pueda fabricar
una aprobación— **no lo imponía el SQL propuesto**, y el plan de ejecución **no
podía correr**: su bloque de reglas habría impedido arrancar al Supervisor, y
seis de sus doce compuertas eran imposibles de ejecutar dentro del contenedor del
juez.

Ninguno de los defectos es de concepto. Todos son de acoplamiento con la
implementación real, y todos se detectan antes de gastar un dólar de modelo.

---

## 2. Hallazgos, por severidad

### Críticos

#### C1 · La línea roja no la imponía el SQL propuesto — **verificado ejecutando**

La r1 mandaba repetir en las seis tablas una política `for all to app_tenant
using (tenant_id = app.tenant_actual())` y **añadía** sobre `sala_aprobaciones`
una segunda política permisiva `for insert ... with check (decidida_por =
auth.uid() ...)`.

PostgreSQL combina las políticas **permisivas** de un mismo comando con **O
lógico**: basta cumplir una. La de tenant ya autorizaba la inserción, y la del
candado no decidía nada.

**Prueba ejecutada** — Postgres 16.14 en contenedor desechable, con el prelude
del repositorio (`businessos/tenancy/00-prelude.sql`, que aporta `auth.uid()`) y
el rol `app_tenant` (`nobypassrls`, no dueño de la tabla):

| Montaje | Intento | Resultado observado |
|---|---|---|
| Dos políticas permisivas (r1) | Sesión del humano A inserta `decidida_por` = humano B | **`INSERT 0 1` — la fila entró.** `es_falsificada = t` |
| `as restrictive` (r2) | Lo mismo | `ERROR: new row violates row-level security policy "aprobacion_solo_humana_fix"` |
| `as restrictive` (r2) | Sesión del humano A firma como humano A | Aceptada (0 ajenas, 1 propia) |

Se repitió la primera prueba tras conceder `usage on schema auth` al rol, para
descartar que la fila entrara por un fallo de permisos en vez de por la
combinación de políticas: con el permiso concedido y `auth.uid()` devolviendo
correctamente al humano A, **la fila falsificada volvió a entrar**.

**Corrección:** `as restrictive` en `aprobacion_solo_humana`. Una palabra.

**Severidad:** máxima en cuanto a significado —es la única razón de existir que
la spec se atribuye frente a Slack—, aunque el PRP mantiene la tabla vacía en la
Fase A, así que el daño se materializaría en la Fase C.

#### C1-bis · La prueba del invariante miraba al principal equivocado `[HECHO]`

La prueba S2 (spec §9) y la compuerta `aprobacion_no_insertable_por_servicio`
(PRP §5.1) comprobaban que **un rol de servicio** no puede insertar. Un rol de
servicio tiene `bypassrls` **a propósito** (`00-prelude.sql:40-45` lo replica
para que ninguna prueba afirme lo contrario) y **no es el principal que la
política acota**. Ambas verificaciones salían verdes con el agujero abierto.

El atacante real es un `app_tenant` legítimo que miente sobre quién firmó. Se
conservan las dos pruebas: cierran cosas distintas.

#### C2 · `decidida_por` no podía satisfacer a la vez su clave foránea y su política `[HECHO]`

`usuarios` es una tabla propia de la capa de tenencia con `id uuid default
gen_random_uuid()`, **sin vínculo con `auth.users`**
(`businessos/supabase-organizaciones.sql:79-84`). La identidad de sesión vive en
`profiles`, ligada a `auth.users` por el disparador `handle_new_user`. Y **no
existe en todo el repositorio una sola inserción a `usuarios`** fuera de la suite
de pruebas.

Por tanto `decidida_por uuid references usuarios(id)` con `with check
(decidida_por = auth.uid())` describía una tabla en la que nadie puede escribir.
La spec §3 delataba la ambigüedad al escribir "Fila en `usuarios` / `profiles`":
esa barra oblicua era el defecto.

**No es una corrección, es una decisión** — sube a la §14 de la spec como
decisión 5, con las dos salidas y sus costos.

#### C3 · Seis de doce compuertas eran imposibles de correr `[HECHO]`

`migracion_idempotente`, `rls_force_en_seis_tablas`,
`aprobacion_control_positivo`, `hilo_un_nivel`, `aislamiento_s1_s6` y
`reversion_seis_sabotajes` aseveraban sobre una base de datos viva. Pero:

- el motor entrega al verificador una **ruta de archivos**
  (`correr_gates(gates, worktree)`, `supervisor-a2a/gates.py:129`);
- el contenedor del Supervisor instala git, node, npm, Go, gosec y Playwright —
  **ningún Postgres ni cliente `psql`** (`supervisor-a2a/Dockerfile`);
- no monta el socket de Docker (`docker-compose.yml:617-645`);
- y `replay.sh` levanta su Postgres **con Docker** (`tenancy/replay.sh:25,29`).

Dentro del juez darían `no_ejecutable`, y el encabezado de
`reglas/procesos.toml:12` es explícito: *"gate que no puede correr en runtime =
`no_ejecutable` → RECHAZO"*. **El trabajo se rechazaría aunque estuviera
perfecto.**

**Corrección — y aquí la revisión mejora el diseño en vez de recortarlo:** esas
compuertas no bajan a verificación humana, **suben al CI**.
`.github/workflows/tenencia.yml` ya corre en **cada** solicitud de fusión a
`master`, deliberadamente sin filtro de rutas, y ejecuta `replay.sh` y
`control-reversion.sh` sobre un runner con Docker. Es exactamente la red que esas
seis compuertas querían ser, y ya existe.

> Pendiente para quien tenga administración del repositorio: confirmar si
> "Tenencia" es un check **obligatorio**. La consulta a la protección de `master`
> devuelve 404 sin ese permiso. Si solo avisa y no bloquea, es una red que
> informa, no una que detiene.

#### C4 · El bloque TOML no lo podía cargar el motor — **verificado ejecutando**

Cuatro defectos independientes contra `supervisor-a2a/gates.py`:

1. Usaba `nombre`; el cargador lee `regla` (`gates.py:91`).
2. Usaba `runner = "chequeos_sala:…"`; los runners declarados son solo
   `estatico`, `comando` y `modelo` (`gates.py:24`, validado en `:96`).
3. Faltaba el campo obligatorio de nivel raíz `departamento` (`gates.py:70`).
4. Los inactivos usaban `runner = ""`, y la validación del runner ocurre **antes**
   que la de `activo` (`:96` precede a `:104`): también revientan.

**Prueba ejecutada:** cargando el bloque de la r1 con `gates.cargar_configs`, el
motor responde `ConfigInvalida: sala.toml: sin campo 'departamento'
(obligatorio)`. Y el efecto no es un rechazo de la tarea: es que **el Supervisor
no arranca**, y con él se cae la capacidad de juzgar cualquier tarea de cualquier
departamento. Es el defecto de mayor daño operativo del par.

El bloque corregido se cargó limpio (21 gates, 18 activos) y sus gates se
ejecutaron sobre un árbol de prueba: **tres sabotajes deliberados pusieron rojos
exactamente los tres gates correspondientes**, cero falsos verdes.

#### C5 · Conflicto de departamento `[HECHO, con un matiz corregido]`

El Supervisor indexa las reglas por el campo `departamento` del archivo y
selecciona **una sola lista** por el departamento de la tarea (`gates.py:66-75`,
`executor.py:55-58`).

- Un `sala.toml` con `departamento = "software"` choca con `software.toml` →
  *"departamento duplicado"* → el Supervisor no arranca (`gates.py:72`).
- Con `departamento = "sala"`, una tarea de ese departamento la **rechaza el
  contrato del Ejecutor** (`contrato.py:107`; `DEPARTAMENTOS` no lo incluye), y
  el PRP §3 se prohíbe tocar `trio-contrato/`.

> **Matiz que corrige una afirmación de la primera pasada:** un archivo de reglas
> con departamento nuevo **sí carga** sin tumbar al Supervisor. El precedente ya
> está en el repositorio: `reglas/buzon.toml` declara `departamento = "buzon"` y
> ese valor no aparece en `DEPARTAMENTOS`, ni siquiera en `master`. El bloqueo es
> del lado del contrato, no del arranque. *(De paso queda anotada una deriva
> ajena a la sala: existe un archivo de reglas para un departamento que el
> contrato rechazaría.)*

Además, la afirmación del PRP §5 *"a estos se suman los gates base de
`software.toml` que ya corren siempre"* era **falsa**: no hay unión de listas.

**Corrección:** las entradas van en `software.toml`.

### Importantes

- **I1 · Puerto ocupado** `[HECHO]`. El 5000 es de `enriquecimiento-a2a`
  (`docker-compose.yml:408`). Ambos documentos lo daban por libre. → 5300.
- **I2 · `sala_miembros` no compilaba** — **verificado ejecutando**. `primary key
  (canal_id, principal_tipo, coalesce(usuario_id::text, agente_slug))` responde
  `ERROR: syntax error at or near "("`. PostgreSQL no admite expresiones en
  `primary key`. → columna generada `principal_ref`.
- **I3 · Realtime es el riesgo real de la fase, y estaba mal cubierto** `[HECHO]`.
  El entorno efímero no crea la publicación `supabase_realtime`
  (`tenancy/00-prelude.sql`), así que la compuerta no podía correr; y si el
  navegador se suscribe como `authenticated`, `app.tenant_actual()` depende del
  claim `org_id` (`supabase-organizaciones.sql:191`), cuya emisión no está
  evidenciada. → sube a condición previa del encolado.
- **I4 · La spec afirmaba identidad de patrón donde había divergencia** `[HECHO]`.
  §4.2 decía "patrón idéntico al ya aplicado" y omitía `with check`, que la capa
  vigente sí escribe (`supabase-organizaciones.sql:468-470`). Aislado no abre
  agujero, pero es la omisión que hacía invisible C1.
- **I5 · Faltaba el `create trigger`** `[HECHO]`. §4.1 definía la función y nunca
  el disparador.

### Secundarios

- **S1 · Redundancia de compuerta — afirmación corregida.** La primera pasada
  dijo que `replay.sh` ya aplica la migración dos veces y que el gate
  `migracion_idempotente` era redundante. Es cierto **solo** para el archivo de
  `$MIGRACION` (`replay.sh:137-140`); el bucle que recorre `orden.txt`
  (`:87-108`) aplica cada archivo **una sola vez**. La idempotencia de una futura
  `supabase-sala-a2a.sql` **no** queda cubierta gratis: hay que extender ese
  bloque o parametrizar `$MIGRACION`.
- **S2 · Dos presupuestos sin puente.** El tope de construcción del PRP §6 y el
  presupuesto por cliente de `guardia-presupuesto` (spec §3.2) conviven sin
  relación declarada. No es contradicción; es una laguna de trazabilidad, ahora
  dicha en voz alta en ambos documentos.
- **S3 · Cifras verificadas correctas.** Vale la pena decirlo: el corpus de
  inyecciones tiene **exactamente 62 casos**
  (`buzon-a2a/corpus/casos.json`); los servicios con sufijo `-a2a` son
  **exactamente nueve**; "quinta superficie" cuadra (cuatro aplicaciones en
  `frontends/` más `design-system`, que es paquete); `app.tenant_actual()` existe
  y devuelve `uuid`; `guardia-presupuesto` existe y bloquea cerrado
  (`guardia.py:154`); y el manifiesto de orden existe y documenta por qué es
  obligatorio actualizarlo (`tenancy/orden.txt`).

---

## 3. Oportunidad de automatización

Una, concreta y de alto retorno: **validar `supervisor-a2a/reglas/*.toml` en
integración continua**, cargándolos con `gates.cargar_configs` y fallando ante
`ConfigInvalida`. Sin modelo de por medio, sin datos externos.

Habría cazado **C4 y C5 completos** antes de encolar, y protege contra una caída
del Supervisor que hoy solo se descubre al reiniciarlo. Es el mismo razonamiento
que llevó a crear el gate de documentos vivos: una regla sin mecanismo es una
intención.

Secundaria y casi gratis: comprobar que un puerto propuesto no está tomado en
`docker-compose.yml`. Aquí el mismo error apareció en los dos documentos a la vez.

**Lo que no conviene automatizar:** el juicio sobre C1 y C2. Son decisiones de
modelo de seguridad y de identidad; una compuerta puede verificarlas una vez
tomadas, no tomarlas.

---

## 4. Preguntas abiertas para el equipo

1. ¿Qué tabla representa a un humano cuando firma una aprobación? Si es
   `usuarios`, ¿qué proceso la puebla y con qué identificador? *(Decisión 5 de
   la spec §14; bloquea el encolado.)*
2. ¿El token de sesión emite el claim `org_id`? Si no, ¿claims personalizados o
   plan B de Broadcast? *(Bloquea el encolado.)*
3. ¿El navegador habla directo con Supabase para tiempo real, o todo pasa por el
   servicio? De la respuesta depende qué rol hay que autorizar.
4. ¿Es "Tenencia" un check obligatorio de `master`?
5. ¿Nombre y puerto definitivos del servicio?
6. Decisiones de negocio de la spec §14: alcance de arranque, destino de Slack,
   quién puede encolar tareas que cuestan dinero, y si el correo entra a la sala.

---

## 5. Lo que la primera versión de estos gates NO cazaba

Se documenta porque es la misma lección otra vez, y esta vez me la comí yo.

Los dos gates escritos como `! grep …` (sin credenciales de servicio, sin `next
dev`) **pasaban en verde cuando su objetivo no existía**: `grep` sobre una ruta
inexistente sale con código 2, y la negación lo convierte en 0. Un ejecutor que
nunca hubiera creado `businessos/sala-a2a/` habría recibido "limpio" de un gate
que no miró nada. Es exactamente el gotcha 3 del PRP §7 —*"aserción sobre 0 filas
no es aserción"*— entrando por la puerta de atrás.

No se detectó al validar porque el árbol de prueba **siempre** creaba los
directorios: el caso no llegaba a correr. Se corrigió exigiendo que el objetivo
exista antes del `grep`, y el control de reversión se amplió con dos sabotajes
nuevos —borrar el directorio del servicio y borrar el del frontend— que ahora se
cazan.

De paso salieron dos cosas más: el gate omitía `businessos/frontends/sala/`, que
es justo la superficie que habla con Supabase y el sitio más probable donde
aterrizaría una credencial; y los contadores exigían seis pruebas mientras los
documentos mandaban siete (el patrón `^-- S[1-6] ` ni siquiera reconocía `S2b`),
de modo que una prueba podía omitirse en silencio.

**Regla:** un gate negado necesita una precondición de existencia, y un gate que
cuenta necesita que el documento diga qué formato contar.

---

## 6. Nota de método

Citas `archivo:línea` sobre el repositorio, contrastadas contra `master`. Las dos
afirmaciones que no se podían resolver leyendo —la combinación con O lógico de
políticas permisivas y el rechazo de expresiones en clave primaria— se ejecutaron
sobre un `postgres:16-alpine` desechable, con el prelude del propio repositorio
para disponer de `auth.uid()`, y el contenedor se eliminó al terminar. Ambas
resultaron ciertas. El bloque de reglas corregido se validó cargándolo con el
motor real del Supervisor y ejecutando sus gates con control de reversión.

Lo que hay que reconocer del par revisado: el razonamiento de producto es de
buena calidad. Decir en voz alta que un departamento no responde en línea,
negarse a simular presencia, elegir tiempo real gestionado por presión de
memoria, listar lo que no se construye, y poner el invariante de la aprobación
por encima de la comodidad — todo eso es criterio maduro. Los defectos son de
acoplamiento con la implementación real, y todos eran baratos de corregir antes
de construir nada.
