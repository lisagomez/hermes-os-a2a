# SPEC — `sala-a2a` · Sala conversacional con departamentos agénticos

> Superficie de conversación por workspace / canal / hilo, con participación de
> primera clase de los departamentos agénticos internos. Sustituye al piloto de
> Slack para uso interno y nace con la tenencia lista para marca blanca.
>
> Estado: PROPUESTA. Nada aplicado. Requiere decisión de Elisa en §14.
>
> **Revisión r2 (2026-08-07).** Corregida tras la revisión técnica
> `docs/revision-sala-a2a.md`, que contrastó cada afirmación de esta spec contra
> el código del repositorio. Los cambios están listados en §0.

---

## 0. Qué cambió en la revisión r2

Nada del diseño. Todo lo que se corrigió es acoplamiento con la implementación
real, y cada corrección lleva su evidencia.

| # | Qué decía r1 | Qué se corrigió | Evidencia |
|---|---|---|---|
| 1 | `aprobacion_solo_humana` como política permisiva | **Ahora es `as restrictive`** | Se probó en Postgres 16 real: con dos políticas permisivas, un rol `app_tenant` **firmó una aprobación a nombre de otra persona y la fila entró**. Con `as restrictive`, rechazada. Ver §4.3 |
| 2 | La prueba S2 atacaba con un rol de servicio | **Ataca con `app_tenant`** | Un rol de servicio tiene `bypassrls`; no es el principal que la política acota. S2 salía verde sin ejercitar nada |
| 3 | `primary key (…, coalesce(…))` en `sala_miembros` | **Columna generada + clave primaria sobre ella** | Postgres rechaza expresiones en `primary key`: `syntax error at or near "("`, verificado |
| 4 | "patrón idéntico al de la capa ya aplicada", omitiendo `with check` | **`using` y `with check` explícitos**, como escribe la capa vigente | `businessos/migrations/supabase-organizaciones.sql:468-470` |
| 5 | §4.1 definía la función del disparador, nunca el disparador | **Se añade el `create trigger`** | — |
| 6 | Puerto `5000` | **Puerto `5300`** | El 5000 lo ocupa `enriquecimiento-a2a` (`businessos/docker-compose.yml:408`) |
| 7 | "Fila en `usuarios` / `profiles`" | **La barra oblicua era el defecto**: sube a §14 como decisión 5 | `usuarios` no tiene vínculo con `auth.users` y nadie la puebla en el repositorio |
| 8 | `app.tenant_actual()` marcado como "marcador a confirmar" | **Confirmado: existe y devuelve `uuid`** | `businessos/migrations/supabase-organizaciones.sql:183` |

---

## 1. Qué es y qué no es

**Es** la quinta superficie de `businessos/frontends/` más un servicio A2A
(`sala-a2a`, `127.0.0.1:5300`, perfil `a2a`) donde humanos y agentes conversan en
canales con hilos, y donde las compuertas de aprobación humana dejan de vivir en
un hilo de Telegram y pasan a ser una fila en base de datos.

**No es** un reemplazo de Telegram (la vida personal de Kiris se queda ahí,
decisión vigente), ni un chat con el agente (eso es `chat-web2` y el gateway),
ni una bandeja universal. La convergencia de Telegram/WhatsApp/correo en la sala
es la Fase E y está fuera del alcance inicial.

**Motivo de negocio, textual del ROADMAP:** *"Slack es SOLO interno — NO de cara
al cliente (no se marca-blanca bien)"*. Esta app es la salida de esa frase.

---

## 2. El invariante

> **Ningún componente que ejecuta un modelo puede fabricar una aprobación.**

Es el mismo invariante del buzón agéntico (HERALDO-6), reusado sin cambios. Un
botón `[Aprobar]` escribe una fila en `sala_aprobaciones` firmada por un
`auth.uid()` humano; el Ejecutor, el Coordinador y Hermes no tienen credencial
capaz de insertar ahí. La supervisión humana no es una política escrita: es una
fila que el motor no puede producir. Eso es lo que un auditor verifica.

Corolario: si mañana alguien "simplifica" dándole a un servicio permiso de
escritura sobre `sala_aprobaciones`, la app pierde su única razón de existir
frente a Slack. Ese permiso es la línea roja de esta spec.

**Advertencia que costó una revisión entera:** enunciar el invariante no lo
impone. La r1 de esta spec lo declaraba en prosa y el SQL que proponía **no lo
cumplía** — cualquier conexión de tenant podía firmar por otra persona. La §4.3
explica por qué y cómo se cierra. Un invariante sin restricción que lo exija es
una intención.

---

## 3. Modelo de participación

Tres clases de principal, un solo tipo de mensaje.

| Principal | Quién es | Cómo escribe |
|---|---|---|
| Humano | Identidad de sesión de Supabase (**qué tabla la representa: decisión 5 de §14**) | Directo, por el frontend |
| Agente | Servicio con Agent Card A2A (`hermes-negocio`, `ejecutor-a2a`, `supervisor-a2a`, `coordinador`, `grafo-a2a`, `buzon-a2a`) | Por `POST /mensajes` de `sala-a2a` con su credencial de servicio |
| Puente | Espejo de una superficie externa (Slack, Telegram, correo) | Host-job, siempre `solo_lectura` |

**Los departamentos no son principales.** Son atribución. Un mensaje lleva
`autor_agente = 'ejecutor-a2a'` y `departamento = 'procesos'`; la UI muestra
"Procesos · vía ejecutor-a2a". Esto respeta la Fase 6 (los departamentos son
paquetes de competencias que el par carga) y evita inventar cuatro identidades
falsas que en realidad son el mismo servicio.

Los departamentos válidos salen de `trio-contrato/contrato.py::DEPARTAMENTOS`
— no se duplican aquí. Alta de departamento nuevo = una línea en el contrato,
como en Fase 9 y en Procesos. La sala no debe requerir cambio de código.

> ⚠️ **Dato de la revisión:** `reglas/buzon.toml` declara `departamento = "buzon"`
> y ese valor **no está** en `DEPARTAMENTOS`, ni siquiera en `master`. El
> Supervisor carga ese archivo sin problema, pero una tarea con ese departamento
> la rechazaría el contrato del Ejecutor (`contrato.py:107`). Es una deriva ajena
> a la sala, anotada aquí porque afecta a cómo se dan de alta departamentos.

### 3.1 Cómo participa un departamento

El ciclo, extremo a extremo, en un canal atado a un departamento:

1. Un humano escribe en `#dep-procesos` y menciona al departamento.
2. `sala-a2a` **no llama al modelo**. Crea una tarea por A2A contra el Ejecutor,
   que responde `{encolada, posicion, cola}` en ~1 s (Fase 10), y publica en el
   hilo un mensaje de sistema con `task_id` y posición.
3. El worker serial drena la cola cuando toca. El hilo refleja el estado leyendo
   `tareas`, no adivinando.
4. El Supervisor emite VEREDICTO. Un host-job lo publica en el mismo hilo con
   los gates en verde o los hallazgos en rojo.
5. Si el resultado toca algo irreversible (merge, deploy, dinero, cara al
   cliente), el mensaje trae bloques de acción y **espera fila en
   `sala_aprobaciones`**. Nada avanza sin ella.

Consecuencia que hay que decir en voz alta, igual que se dijo con el enjambre:
**un departamento no responde en línea.** La cola es serial y el servidor tiene
8 GB. La sala muestra estado, no simula presencia. Un indicador "en cola,
posición 3" es honesto; tres puntos parpadeando durante quince minutos no.

### 3.2 Presupuesto

Todo saliente de agente que invoque modelo pasa por `guardia-presupuesto` ANTES
de la llamada, con `tenant_id` y `clase_tarea` poblados. Sin fila de presupuesto
→ bloquea (fail-closed visible), nunca degrada en silencio. La sala es
exactamente el tipo de superficie donde un tenant de marca blanca dispara
consumo escrito por terceros: el techo va desde el día 1, no después.

---

## 4. Esquema

Todas las tablas nacen con `tenant_id uuid`, RLS `enable` + `force`, y política
por `app_tenant`. **Ninguna usa `service_role`** — hay decisión escrita
(`gobernanza/decision-service-role.md`) de abandonarlo antes del segundo cliente;
estrenar la deuda en una app nueva sería añadirla con vencimiento ya puesto.

> ✅ **Confirmado en la revisión r2:** el helper de tenant es
> `app.tenant_actual()`, existe y devuelve `uuid`
> (`businessos/migrations/supabase-organizaciones.sql:183`). Lee primero el GUC
> `app.tenant_id` (agentes, puentes) y si no, el claim `org_id` del JWT (web).
> Ya no es un marcador.

```sql
-- ---------------------------------------------------------------
-- sala-a2a · esquema base. Idempotente. Orden: canales → miembros →
-- mensajes → reacciones → lecturas → aprobaciones.
-- ---------------------------------------------------------------

create table if not exists sala_canales (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references organizaciones(id) on delete cascade,
  slug          text not null,
  nombre        text not null,
  tipo          text not null check (tipo in ('publico','privado','dm','departamento')),
  departamento  text,                    -- null salvo tipo='departamento'
  archivado_en  timestamptz,
  creado_en     timestamptz not null default now(),
  unique (tenant_id, slug),
  constraint depto_solo_en_canal_depto
    check ((tipo = 'departamento') = (departamento is not null))
);

-- CORREGIDO r2 · `primary key` NO admite expresiones: la versión r1
--   primary key (canal_id, principal_tipo, coalesce(usuario_id::text, agente_slug))
-- falla con `syntax error at or near "("` en la PRIMERA corrida (verificado
-- contra Postgres 16). Se resuelve con una columna generada, que además deja
-- la clave legible en los índices y en los mensajes de error.
create table if not exists sala_miembros (
  canal_id        uuid not null references sala_canales(id) on delete cascade,
  tenant_id       uuid not null references organizaciones(id) on delete cascade,
  principal_tipo  text not null check (principal_tipo in ('humano','agente')),
  usuario_id      uuid,
  agente_slug     text,
  principal_ref   text generated always as
                  (coalesce(usuario_id::text, agente_slug)) stored,
  rol             text not null default 'miembro'
                  check (rol in ('miembro','moderador','solo_lectura')),
  agregado_en     timestamptz not null default now(),
  constraint un_solo_principal check (
    (principal_tipo = 'humano' and usuario_id is not null and agente_slug is null) or
    (principal_tipo = 'agente' and agente_slug is not null and usuario_id is null)
  ),
  primary key (canal_id, principal_tipo, principal_ref)
);

create table if not exists sala_mensajes (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references organizaciones(id) on delete cascade,
  canal_id       uuid not null references sala_canales(id) on delete cascade,
  hilo_id        uuid references sala_mensajes(id) on delete cascade,
  autor_tipo     text not null check (autor_tipo in ('humano','agente','sistema')),
  autor_usuario  uuid,
  autor_agente   text,
  departamento   text,                   -- atribución, no identidad
  task_id        text,                   -- puente a `tareas` (Fase 6/10)
  cuerpo         text not null,
  bloques        jsonb not null default '[]'::jsonb,
  origen         text not null default 'sala'
                 check (origen in ('sala','espejo_slack','espejo_telegram','espejo_correo')),
  editado_en     timestamptz,
  creado_en      timestamptz not null default now(),
  constraint autor_coherente check (
    (autor_tipo = 'humano'  and autor_usuario is not null and autor_agente is null) or
    (autor_tipo = 'agente'  and autor_agente  is not null and autor_usuario is null) or
    (autor_tipo = 'sistema' and autor_usuario is null and autor_agente is null)
  ),
  constraint depto_solo_de_agente check (
    departamento is null or autor_tipo in ('agente','sistema')
  )
);

create index if not exists ix_sala_mensajes_canal
  on sala_mensajes (canal_id, creado_en desc);
create index if not exists ix_sala_mensajes_hilo
  on sala_mensajes (hilo_id, creado_en) where hilo_id is not null;
create index if not exists ix_sala_mensajes_task
  on sala_mensajes (task_id) where task_id is not null;

create table if not exists sala_reacciones (
  mensaje_id  uuid not null references sala_mensajes(id) on delete cascade,
  tenant_id   uuid not null references organizaciones(id) on delete cascade,
  usuario_id  uuid not null,
  emoji       text not null,
  primary key (mensaje_id, usuario_id, emoji)
);

create table if not exists sala_lecturas (
  canal_id       uuid not null references sala_canales(id) on delete cascade,
  tenant_id      uuid not null references organizaciones(id) on delete cascade,
  usuario_id     uuid not null,
  ultimo_leido   timestamptz not null default now(),
  primary key (canal_id, usuario_id)
);

create table if not exists sala_aprobaciones (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references organizaciones(id) on delete cascade,
  mensaje_id      uuid not null references sala_mensajes(id) on delete cascade,
  accion          text not null,                 -- 'aprobar' | 'rechazar' | declarada en bloques
  task_id         text,
  sha256_artefacto text,                         -- integridad, patrón enviar-salientes.py
  decidida_por    uuid not null,                 -- = auth.uid(); FK: decisión 5 de §14
  decidida_en     timestamptz not null default now(),
  unique (mensaje_id, decidida_por)
);
```

> **Sobre las columnas de usuario sin clave foránea** (`autor_usuario`,
> `usuario_id`, `decidida_por`): la r1 las declaraba `references usuarios(id)`.
> La revisión encontró que `usuarios` **no tiene vínculo con `auth.users` y nadie
> la puebla en todo el repositorio**, así que exigir a la vez esa clave foránea y
> `decidida_por = auth.uid()` describía una tabla en la que no se puede escribir.
> Las referencias se resuelven cuando se cierre la **decisión 5 de §14**; hasta
> entonces se declaran como `uuid not null` y la integridad la da la política.

### 4.1 Hilos de un solo nivel

`hilo_id` apunta al mensaje raíz. Una respuesta de hilo debe apuntar a un
mensaje cuyo `hilo_id` sea nulo. Anidamiento arbitrario es una trampa de
producto: Slack lleva una década sin él por buenas razones. Se fuerza con
trigger, no con confianza:

```sql
create or replace function sala_hilo_un_nivel() returns trigger
language plpgsql as $$
begin
  if new.hilo_id is not null then
    if exists (select 1 from sala_mensajes m
               where m.id = new.hilo_id and m.hilo_id is not null) then
      raise exception 'los hilos son de un solo nivel';
    end if;
  end if;
  return new;
end $$;

-- AÑADIDO r2 · la r1 definía la función y NUNCA el disparador. Una función que
-- nadie dispara no fuerza nada.
drop trigger if exists tg_sala_hilo_un_nivel on sala_mensajes;
create trigger tg_sala_hilo_un_nivel
  before insert or update of hilo_id on sala_mensajes
  for each row execute function sala_hilo_un_nivel();
```

### 4.2 RLS

Patrón de la capa de tenencia ya aplicada: `enable` + `force` + política
`for all` con `using` **y** `with check` explícitos, exactamente como la escribe
`businessos/migrations/supabase-organizaciones.sql:468-470`.

```sql
alter table sala_canales enable row level security;
alter table sala_canales force  row level security;
create policy tenant_sala_canales on sala_canales
  for all to app_tenant
  using      (tenant_id = app.tenant_actual())
  with check (tenant_id = app.tenant_actual());
```

Repetir para las seis tablas.

> *Corrección r2:* la r1 omitía `with check` afirmando que el patrón era
> "idéntico al ya aplicado". No lo era. Aislado, omitirlo no abre un agujero
> (Postgres reutiliza `using`), pero es la omisión que hacía invisible el
> defecto de §4.3.

### 4.3 La política que impone el invariante — y por qué debe ser RESTRICTIVA

```sql
create policy aprobacion_solo_humana on sala_aprobaciones
  as restrictive                                 -- ← esta línea ES el invariante
  for insert to app_tenant
  with check (decidida_por = auth.uid());
```

**Por qué `as restrictive` y no una política más.** PostgreSQL combina las
políticas **permisivas** de un mismo comando con **O lógico**: basta cumplir una.
Con la redacción de la r1, la política de tenant (que solo exige el
`tenant_id` correcto) ya autorizaba la inserción y la del candado **nunca
decidía nada**. Las restrictivas se combinan con **Y lógico**: se cumplen todas
o no entra la fila.

Esto no es teoría. Se probó sobre Postgres 16 real, con el rol `app_tenant`
(`nobypassrls`, no dueño de la tabla) y el sustituto de `auth.uid()` del repo:

| Montaje | Intento | Resultado |
|---|---|---|
| Dos políticas **permisivas** (r1) | Sesión del humano A firma como humano B | **La fila ENTRÓ** — aprobación falsificada |
| Con `as restrictive` (r2) | Sesión del humano A firma como humano B | **Rechazada** — `new row violates row-level security policy` |
| Con `as restrictive` (r2) | Sesión del humano A firma como humano A | Aceptada |

Reproducible en minutos: prelude de `businessos/tenancy/00-prelude.sql`, el rol
y `app.tenant_actual()` de `supabase-organizaciones.sql`, y las dos políticas.

Ningún rol de servicio recibe `insert` sobre esta tabla. La política restrictiva
y la ausencia de permiso son dos cierres independientes: el primero contra un
tenant legítimo que miente sobre quién firma, el segundo contra un servicio.
**Hacen falta los dos** — la r1 solo tenía el segundo, y su prueba solo miraba
ese.

---

## 5. Realtime

`sala_mensajes`, `sala_reacciones` y `sala_lecturas` entran a la publicación
`supabase_realtime`. Realtime respeta RLS en `postgres_changes`, así que el
aislamiento por tenant sale del trabajo ya hecho y **no se agrega un servicio con
estado** al servidor.

Esta es la decisión de mayor apalancamiento de la spec: la caja ya corre nueve
servicios con sufijo `-a2a` más candidatos, la cola drena con concurrencia 1 y el
swap es de 2 G. Un servidor de WebSockets propio compraría poco y costaría RAM
que no sobra.

**Condición previa al encolado, no cosa a descubrir a mitad de la fase.** La r1
lo dejaba como "consecuencia a verificar en Fase A". La revisión lo sube de
categoría porque de ello depende la fase entera:

- Realtime entrega como rol `authenticated`, no como `app_tenant`. Con ese rol,
  `app.tenant_actual()` cae a su segundo camino: el claim `org_id` del JWT
  (`supabase-organizaciones.sql:191`). **No hay evidencia en el repositorio de
  que la autenticación emita ese claim.**
- El entorno efímero del repo **no crea** la publicación `supabase_realtime`
  (`businessos/tenancy/00-prelude.sql` no la menciona), así que esto no se puede
  comprobar en el CI: hay que hacerlo contra un Supabase real.

Si el claim no existe, o se configuran claims personalizados o se toma el plan B
(Broadcast con autorización por canal). Cualquiera de las dos cosas se decide
**antes** de encolar la Fase A, no dentro.

---

## 6. Superficie de `sala-a2a`

Opacidad, igual que `grafo-a2a` y el trío: la superficie es **exactamente**
`{card, rpc, /health}` más el REST autenticado que consume el frontend. Sin
`/docs`, sin `/openapi.json` público.

| Endpoint | Quién | Qué |
|---|---|---|
| `/.well-known/agent-card.json` | público interno | capacidad `publicar-en-canal` con fronteras negativas literales |
| `message/send` (JSON-RPC) | agentes | publicar mensaje o abrir hilo |
| `POST /mensajes` | frontend | publicar como humano (Bearer de sesión) |
| `POST /aprobaciones` | frontend | registrar decisión humana |
| `GET /health` | compose | salud |

Fronteras negativas de la card, explícitas: no aprueba, no ejecuta tareas, no
envía a canales externos, no decide si un artefacto es válido.

**Pregunta abierta de arquitectura que la r1 no resolvía:** el §5 hace que el
navegador hable **directo** con Supabase (`postgres_changes`) mientras esta
sección hace que todo lo demás pase por el servicio. Son **dos caminos de
autorización sobre las mismas tablas**, y solo uno está diseñado (`app_tenant`).
Hay que elegir: o el navegador también entra por el servicio, o el camino
directo se autoriza explícitamente. Ver decisión 5 de §14.

---

## 7. Frontera de contenido externo

Un canal donde vive un agente, con cinco humanos escribiendo y un puente de
correo entrando, es una superficie de inyección de prompt de manual.

- El cuerpo de un mensaje es **dato delimitado, jamás instrucción**. Misma regla
  que el calificador del CRM y H4 del PRP de endurecimiento A2A.
- El corpus de 62 inyecciones del buzón se reusa como suite de este servicio.
  No se escribe uno nuevo: "arreglar lo compartido, no el caso aislado".
  (Verificado: `businessos/buzon-a2a/corpus/casos.json` tiene exactamente 62.)
- Los mensajes de origen `espejo_*` nunca disparan tareas. Un puente es lectura.
- Las menciones a un departamento desde un mensaje de origen externo se ignoran
  con aviso visible en el hilo, no en silencio.

---

## 8. Fases

Cada fase cierra con una salida verificable. No se salta hacia adelante.

**A · Esqueleto, sin agentes.** Migración + trigger + RLS + suite de aislamiento
extendida + canal público, mensajes, hilos, no-leídos, Realtime. Frontend mínimo
en build de producción (no `next dev` — `control-interno` ya carga esa deuda).
*Salida:* dos humanos de tenants distintos conversan y ninguno ve al otro,
demostrado por sabotaje deliberado en `control-reversion.sh`, no por declaración.

**B · Espejo.** Puente Slack → sala en solo lectura. El digest 08:00 y
`aviso-cola.py` publican en ambos lados. Nadie migra. Mismo patrón de modo espejo
no saltable del buzón: mínimo declarado antes de considerar el corte.
*Salida:* siete días de espejo sin divergencia entre superficies.

**C · Departamentos de primera clase.** `hermes-negocio` publica nativo; mención
a departamento → tarea encolada → estado en el hilo → veredicto del Supervisor →
compuertas de aprobación con fila real. `guardia-presupuesto` cableado.
*Salida:* una tarea real del trío nace en la sala, se aprueba con un botón y la
fila de `sala_aprobaciones` es lo único que la desbloquea.

**D · Corte.** La sala es autoritativa. Exige firma de Elisa y evidencia en
pantalla, igual que el buzón. Slack queda como espejo inverso o se apaga.

**E · Marca blanca y convergencia.** Canal de cliente con marca por tenant;
puentes de WhatsApp (`crm-canales`) y correo (`buzon-a2a`) entrando a la sala.
Solo cuando un cliente lo pida. Hereda tenencia; no hay reescritura.

---

## 9. Pruebas

Se extiende `businessos/tenancy/test-aislamiento-tenants.sql` en lugar de crear una suite
paralela. Nuevas pruebas mínimas:

| # | Qué prueba | Sabotaje que debe cazarla |
|---|---|---|
| S1 | Un tenant no lee mensajes de otro | quitar `force` de `sala_mensajes` |
| S2 | **Un `app_tenant` legítimo NO puede firmar una aprobación a nombre de otra persona** | quitar `as restrictive` de `aprobacion_solo_humana` |
| S2b | Un rol de servicio no puede insertar en `sala_aprobaciones` | conceder `insert` a un rol de servicio |
| S3 | El trigger rechaza hilo de segundo nivel | desactivar el trigger |
| S4 | `departamento` no nulo con `autor_tipo='humano'` falla | quitar el check |
| S5 | Mensaje `espejo_*` no genera tarea | eliminar el guard del puente |
| S6 | Realtime no entrega filas de otro tenant | política con `using (true)` |

> **Corrección r2, y la más importante de todas:** la r1 solo tenía la prueba del
> rol de servicio (aquí S2b) y la llamaba "el gate que importa". No lo era. Un
> rol de servicio tiene `bypassrls` y **no es el principal que la política
> acota**: esa prueba salía verde con el agujero abierto de par en par. El
> atacante real es un `app_tenant` legítimo que miente sobre quién firmó — eso es
> S2, y es la que se le escapaba. Se conservan las dos: cierran cosas distintas.

Regla heredada del QA de tenencia: la suite tiene que **ponerse roja cuando
debe**. Siete sabotajes, siete cazados, o la suite no cuenta.

---

## 10. Alta de la superficie

Va por el patrón ya establecido, no a mano:

- Registro en `businessos/frontends/app-registry/` (paquete de datos puros).
- `sync-vendored.mjs --check` cableado al gate de CI de la app, o el waffle y el
  sidebar se desincronizan como ya pasó.
- Sidebar jerárquico config-driven (Sección → Página → Subpágina).
- Auditoría móvil desde el día 1: la auditoría adversarial del 2026-07-30 encontró
  dos ALTAS por móvil (Mission Control recortado, "Salir" inalcanzable). Una app de
  chat que no funcione en un teléfono no sirve para nada.

---

## 11. Qué NO se construye

Voz, video, huddles, directorio de apps, presencia elaborada, cifrado extremo a
extremo, búsqueda avanzada. Búsqueda con `tsvector` simple sobre `cuerpo` y ya.
Cada una de esas es un mes que no compra nada para el caso de uso real.

---

## 12. Riesgos heredados del ROADMAP

- **RAM.** El servidor está apretado y ya hubo OOM-kill documentado por debajo de
  4 GB. Build de producción obligatorio; medir antes y después.
- **Choque de `tenant_id`.** El esquema nace en uuid. Si necesita cruzar con las
  17 tablas de slug, el puente es `organizaciones.slug` (probado por T12), nunca
  una conversión.
- **Ruteo por exclusión.** Si algún día se resumen hilos con modelo, la capa de
  exclusión manda: un canal con dato de cliente define qué modelo está PROHIBIDO
  antes de mirar capacidad o costo.
- **COPY en el Dockerfile en el mismo cambio.** Gotcha del 2026-07-10, cobrado dos
  veces: un módulo nuevo sin su COPY es crash-loop que los tests de dev no cazan.
- **Sincronización repo → runtime.** El diagnóstico `procesos-2026-0001` ya
  identificó este proceso como frágil. Esta app no debe desplegarse a mano.
- **Puertos.** El 5000 estaba ocupado y dos documentos lo daban por libre. Antes
  de fijar un puerto, mirar `docker-compose.yml`. Ocupados hoy: 3000, 3001, 4000,
  4100-4900, 5000, 5100, 5200, 8642-8644, 9119, 9200.

---

## 13. Activos

Candidata a ficha de activo: la **compuerta de aprobación como fila** ya está
demostrada en el buzón; aquí se generaliza a cualquier acción de cualquier
departamento. Si se cataloga, va por la regla del 2026-07-28 (defendible vs
vendible), no por entusiasmo.

Nota de honestidad para esa ficha: lo defendible no es "hay una tabla de
aprobaciones", es **la política restrictiva más la ausencia de permiso, probadas
con un control que se vio fallar**. Sin eso es una tabla con un nombre bonito.

---

## 14. Decisiones abiertas de Elisa

1. **Alcance de arranque.** ¿Fase A–C (interno) y se congela, o se compromete la
   ruta a marca blanca desde ya? Afecta cuánto se invierte en el tema por tenant.
2. **Destino de Slack.** ¿Espejo permanente, o apagado en la Fase D? El piloto
   está vivo y el equipo ya tiene costumbre; apagar tiene costo humano.
3. **Menciones que cuestan dinero.** ¿Cualquiera de los cinco puede encolar una
   tarea mencionando un departamento, o solo Elisa? Hoy solo Elisa reordena la
   cola; encolar es otra cosa y hay tope de gasto de por medio.
4. **Buzón dentro o fuera.** ¿El correo institucional entra a la sala en la Fase
   E, o se queda con su UI propia en el launcher de meeting-copilot?
5. **NUEVA (r2) · Qué tabla representa a un humano cuando firma.** Es la decisión
   de la que dependen la clave foránea de `decidida_por`, la política de §4.3, la
   prueba S2 y el sentido del invariante de §2. La r1 escribía "`usuarios` /
   `profiles`" y esa barra oblicua era el defecto. Las dos salidas:

   | Opción | A favor | En contra |
   |---|---|---|
   | **Poblar `usuarios.id` con el identificador de autenticación** *(recomendación del análisis, no decisión tomada)* | Conserva la capa de tenencia como fuente única de identidad; no acopla la sala a otra superficie | Hoy **nadie** escribe en `usuarios`: hay que construir ese alta |
   | Colgar de `profiles` | Ya está ligada a `auth.users` por el disparador `handle_new_user`; funciona hoy | `profiles` es de la cabina `control-interno` y ya provocó una colisión entre superficies (2026-07-15); acopla la sala a ella |

   Relacionado: **¿el navegador habla directo con Supabase para Realtime, o todo
   pasa por el servicio?** (§6). Y **¿el token de sesión emite el claim `org_id`?**
   (§5). Las tres se responden juntas o ninguna.

---

## 15. Procedencia de esta revisión

Las correcciones de la r2 salen de `docs/revision-sala-a2a.md`, que contrastó
cada afirmación de la r1 contra el código del repositorio y ejecutó las dos que
no se podían resolver leyendo. Ocho de sus diez hallazgos llevan cita
`archivo:línea`; los dos restantes se comprobaron sobre Postgres 16 real y ambos
resultaron ciertos.
