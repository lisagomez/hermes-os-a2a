# Arquitectura de referencia — Multitenencia B2B

**Alcance:** todas las superficies de Hermes OS (meeting-copilot, CRM marca blanca,
Mission Control, buzón, enriquecimiento) y el plano A2A.
**Relación:** este documento es la capa que el PRP de aprovisionamiento de workspace
implementa en una superficie. Aquí vive la doctrina; allá vive el paso a paso.

---

## 1. Lo que hace B2B distinto de B2C

La diferencia no es de tamaño, es de **quién es el titular de la cuenta**.

| | B2C | **B2B (lo tuyo)** |
|---|---|---|
| Titular | El usuario | **La organización** |
| Un usuario pertenece a | Una cuenta | **N organizaciones, con rol distinto en cada una** |
| Quién paga | Quien usa | Un tercero (finanzas del cliente, o el socio de marca blanca) |
| Quién otorga acceso | El sistema | **El propietario de la organización** |
| Baja | Borrar | **Exportar, retener por obligación fiscal, y luego archivar** |

Consecuencia práctica que ordena todo el diseño: **la identidad es global, la
autorización es por organización.** Un correo es una persona; sus permisos existen
solo dentro de un tenant. Confundir esto es el error de arquitectura del que más
cuesta salir.

---

## 2. Jerarquía de tres niveles

Tu negocio ya tiene dos canales —directo y marca blanca— así que la jerarquía es de
tres niveles, no dos:

```
  Socio (organización revendedora)        ← opcional, solo marca blanca
    │
    ├── Tenant / Workspace (cliente final)   ← unidad de aislamiento Y de cobro
    │     ├── Miembros (usuarios con rol)
    │     └── Datos: reuniones, leads, citas, transcripciones, activos
    │
    └── Tenant / Workspace (otro cliente)
```

**Regla de visibilidad del socio — la más importante y la más olvidada:** el
administrador de un socio ve la **lista** de sus workspaces, su estado, su consumo y
su facturación. **No ve los datos dentro.** Un revendedor de CRM no debe poder leer
las conversaciones de los clientes de su cliente. Esto se implementa como un permiso
distinto (`socio:leer-agregado`), nunca como "acceso al workspace hijo".

Cliente directo = mismo modelo con `socio_id = null`. No hagas dos caminos.

---

## 3. Estrategia de aislamiento

Tres modelos estándar; la elección no tiene que ser única para todos los clientes.

| Modelo | Cómo | Costo | Aislamiento |
|---|---|---|---|
| **Pool** | Una base, columna `tenant_id`, RLS | Marginal ~$0 por tenant | Lógico |
| **Bridge** | Un esquema Postgres por tenant | Bajo, se degrada sobre ~100 esquemas | Fuerte lógico |
| **Silo** | Base o despliegue dedicado | Alto | Físico |

**Recomendación: pool por defecto, silo como nivel de producto.** Esto alinea la
arquitectura con tu esquema de precios sin inventar nada:

- **Arranque / Profesional** → pool. Margen ~92-95%, costo marginal casi nulo.
- **Regulado** → silo opcional, y **se cobra como tal**. Un cliente que exige base
  dedicada está comprando aislamiento físico; ese es exactamente el diferencial que
  justifica los $3,000-8,000/mes del nivel alto.

No construyas el silo hasta que un contrato lo pague. Sí diseña para que sea posible:
si nada en el código asume "una sola base", el silo es configuración, no reescritura.

---

## 4. Modelo de datos base

```sql
-- ── Identidad global ───────────────────────────────────────────────
create table usuarios (
  id          uuid primary key default gen_random_uuid(),
  email       citext unique not null,
  nombre      text,
  creado_en   timestamptz not null default now()
);

-- ── Organizaciones (socios y tenants comparten tabla) ──────────────
create table organizaciones (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in ('socio','tenant')),
  socio_id    uuid references organizaciones(id),  -- null = directo
  slug        text unique not null,
  nombre      text not null,
  estado      text not null default 'solicitado'
              check (estado in ('solicitado','aprobado','aprovisionando',
                                'activo','suspendido','archivado')),
  plan        text not null default 'arranque'
              check (plan in ('arranque','profesional','regulado')),
  aislamiento text not null default 'pool'
              check (aislamiento in ('pool','silo')),
  marca       jsonb not null default '{}',
  cuota       jsonb not null default '{}',
  region_dato text not null default 'eu',   -- residencia declarada al cliente
  creado_en   timestamptz not null default now(),
  activado_en timestamptz,
  constraint socio_sin_padre check (tipo <> 'socio' or socio_id is null)
);

-- ── Membresía: la tabla que define TODA la autorización ────────────
create table membresias (
  organizacion_id uuid not null references organizaciones(id) on delete cascade,
  usuario_id      uuid not null references usuarios(id) on delete cascade,
  rol             text not null
                  check (rol in ('propietario','admin','operador','asesor','lector')),
  invitado_por    uuid references usuarios(id),
  invitado_en     timestamptz not null default now(),
  aceptado_en     timestamptz,
  revocado_en     timestamptz,
  primary key (organizacion_id, usuario_id)
);

-- ── Bitácora append-only, transversal ──────────────────────────────
create table org_bitacora (
  id              bigserial primary key,
  organizacion_id uuid not null references organizaciones(id),
  actor           text not null,
  accion          text not null,
  detalle         jsonb not null default '{}',
  ocurrio_en      timestamptz not null default now()
);
```

**Toda tabla de negocio existente y futura lleva `tenant_id uuid not null
references organizaciones(id)`.** Sin excepción, sin columnas nullable "por ahora".
Un `tenant_id` nullable es una fuga que espera su momento.

---

## 5. Los cinco roles

Cinco es el número correcto: menos no cubre B2B real, más nadie los entiende.

| Rol | Puede | No puede |
|---|---|---|
| **propietario** | Todo, incl. facturación, plan y baja | Ser el único (exige un segundo antes de activar) |
| **admin** | Invitar, configurar, ver todo el dato | Cambiar plan, dar de baja la organización |
| **operador** | Operar el día a día, crear y editar | Ver facturación, gestionar miembros |
| **asesor** | Solo lo asignado a él (sus citas, sus reuniones) | Ver el trabajo de otros asesores |
| **lector** | Leer, exportar | Escribir cualquier cosa |

Permisos como matriz `rol × recurso × acción` en un solo archivo, evaluada en un
solo lugar. Si la lógica de permisos aparece en dos módulos, ya divergieron.

**Regla dura:** una organización activa nunca tiene cero propietarios. La revocación
del último propietario se rechaza, no se advierte.

---

## 6. Propagación del contexto de tenant

Esto es lo que en tu arquitectura tiene un giro propio, porque el dato cruza agentes.

```
Petición HTTP
  └─ sesión (magic link) → usuario_id
       └─ selección de organización → membresía verificada → tenant_id
            └─ SET LOCAL app.tenant_id = '<uuid>'   ← la BD lo ve
                 └─ llamada A2A → header X-Tenant-Id + claim firmado
                      └─ el agente receptor RE-VALIDA, no confía
```

**Cuatro reglas innegociables:**

1. **El tenant sale de la sesión, jamás de la URL ni del body.** Un `?tenant=` en la
   URL es una vulnerabilidad de referencia directa a objeto, siempre.
2. **Un único punto de resolución.** Una función que convierte sesión en tenant, y
   todo pasa por ella. Si hay dos, una se queda atrás.
3. **Cada salto A2A revalida.** Es el mismo principio del análisis de seguridad:
   validar en cada endpoint receptor, no solo en el primero. Un `ejecutor-a2a` que
   confía en el `X-Tenant-Id` que le llega es un pivote de tenant a tenant.
4. **`AUTH_DISABLED=1` fija un tenant demo, no lo desactiva.** Un escape de
   desarrollo que además apaga el aislamiento es la fuga total esperando un `.env`
   mal copiado.

Para los agentes deterministas sin sesión (`enriquecimiento-a2a`, `grafo-a2a`), el
tenant viaja en el `DataPart` de la tarea y se persiste en el artefacto. El
`transcripcion-a2a` hoy **no tiene contrato de `tenant_id`** — es deuda ya
identificada en el paso 0 de la línea Reuniones y hay que cerrarla antes del primer
cliente con audio.

---

## 7. Defensa en profundidad del aislamiento

Tres capas. Ninguna sola es suficiente.

| Capa | Mecanismo | Qué atrapa |
|---|---|---|
| **1. Aplicación** | Punto único que inyecta el filtro | El 95% de los casos |
| **2. Base** | RLS con `tenant_id = current_setting('app.tenant_id')` | El olvido del desarrollador |
| **3. Prueba** | Test que corre cada consulta con dos tenants y exige cero cruce | La regresión futura |

```sql
create policy tenant_aislado on reuniones
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

La capa 3 es la que suele faltar y la que más rinde: un test que siembra dos tenants
con datos idénticos y falla si cualquier consulta devuelve filas del otro. Se escribe
una vez y protege para siempre.

> Esto implica un cambio de doctrina: hoy el proyecto opera con "RLS enable + FORCE,
> sin políticas = solo `service_role`". Ese modelo es correcto con un solo tenant y
> deja de serlo con dos. **La transición debe ocurrir antes del segundo cliente**, no
> después — migrar políticas sobre 22 tablas con clientes activos es mucho peor que
> hacerlo antes.

---

## 8. Medición, cuota y facturación

El tenant es la unidad de cobro, y ya tienes casi toda la instrumentación.

- **Medición:** `token_usage.task_id` y `v_costeo_tarea` ya existen; solo falta que
  `tenant_id` viaje hasta el ledger. Ese es el cambio de una columna que habilita
  todo lo demás.
- **Cuota:** en `organizaciones.cuota` como JSON (`{leads: 5000, horas_reunion: 50}`).
  Alerta al 80% por tenant, reusando el patrón de `alerta-presupuesto.sh`.
- **Excedente:** medido y facturado, nunca bloqueado en silencio. Bloquear sin aviso
  a un cliente B2B en horario laboral cuesta más que el excedente.
- **ERP:** cada workspace de marca blanca dispara el asiento doble de tu regla
  (ERP + ledger del cliente). El `origen` de la organización es el que decide.
- **Margen por tenant:** vista `v_margen_tenant` = ingreso del plan − costo medido.
  Revisión trimestral; bajo 60% entra a renegociación.

---

## 9. Ciclo de vida y la salida

El alta la diseña todo el mundo; la baja casi nadie, y la baja es la que tiene
consecuencias legales.

| Estado | Acceso | Datos | Cobro |
|---|---|---|---|
| `activo` | Sí | Vivos | Sí |
| `suspendido` | No | **Intactos** | Pausado |
| `archivado` | No | Solo exportables | No |

- **Suspensión ≠ borrado.** Impago suspende. Nunca borra. Un borrado por impago es
  irreversible y es una demanda esperando ocurrir.
- **Exportación bajo demanda**, en formato abierto, sin negociación. En B2B, un
  proveedor que dificulta la salida pierde la venta siguiente por reputación.
- **Retención tras la baja:** aquí chocan dos obligaciones. La LFPDPPP vigente
  (decreto de marzo de 2025) exige suprimir datos personales cuando dejan de ser
  necesarios; el art. 30 del CFF exige conservar contabilidad cinco años. Se resuelve
  separando: los datos operativos del cliente se suprimen o devuelven; los registros
  fiscales de **tu** relación comercial con él se conservan. Escríbelo en el contrato
  antes del primer cliente.
- **Respaldo por tenant:** el runbook de FASE 0 respalda todo junto. Para restaurar
  un solo tenant sin tocar a los demás hace falta poder extraer por `tenant_id` —
  y eso solo funciona si el dump lógico existe, no solo el tarball de volumen.

---

## 10. Vecino ruidoso

En pool, un tenant puede degradar a los demás. Con 8 GB físicos y sobre-suscripción
ya declarada en `RECOMENDACION-reuniones-headroom.md`, esto no es teórico.

- Límite de peticiones **por tenant**, no solo por IP (el rate limit de Caddy es por
  IP y no distingue tenants).
- Cola con tope de trabajos concurrentes por tenant en el trío.
- Tareas largas (transcripción) siempre asíncronas con cuota de concurrencia.
- Métricas por tenant, para poder señalar al culpable en vez de adivinar.

---

## 11. Ruta de migración desde el estado actual

1. Crear `organizaciones` y sembrar **un** tenant interno con los datos actuales.
2. Agregar `tenant_id` a las tablas de negocio, poblado con ese tenant, y **luego**
   marcarlo `not null`. En ese orden.
3. Punto único de resolución de tenant + test de dos tenants (§7 capa 3).
4. Vistas de aprovisionamiento (el PRP de meeting-copilot).
5. Primer cliente real en pool.
6. **Antes del segundo:** políticas RLS reales sobre las 22 tablas.
7. Silo disponible cuando un contrato del nivel Regulado lo pague.

---

## 12. Anti-patrones

- **`tenant_id` nullable** "temporalmente". Nunca es temporal.
- **Tenant en la URL.** Referencia directa a objeto, siempre explotable.
- **Un usuario = un tenant.** Rompe el primer día que un consultor trabaje con dos
  clientes tuyos, y rehacerlo después toca todas las tablas.
- **Aislamiento solo en la aplicación** más allá del primer cliente.
- **Configuración global con excepciones por cliente** en el código. Toda variación
  por tenant vive en datos (`marca`, `cuota`), jamás en `if (cliente === 'acme')`.
- **Borrar al dar de baja.** Archiva, exporta, retén lo fiscal.
- **Roles que se inventan por cliente.** Cinco roles fijos; si uno no encaja, la
  respuesta es un permiso nuevo, no un rol nuevo.
