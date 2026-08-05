# PRP — Aprovisionamiento de Workspace en meeting-copilot

**Estado:** propuesta, pendiente de decisiones de la dueña (§9)
**Depende de:** `businessos/supabase-fase14-agendamiento.sql` (diseñado, SIN aplicar)
**Spec base:** `businessos/frontends/meeting-copilot/SPEC.md`
**Memoria:** `.claude/memory/project/frontend-meeting-copilot.md`

---

## 0. Qué problema resuelve

meeting-copilot ya es **multi-tenant desde día 1** en el modelo de datos
(agendamiento M1–M5, `tenant_id` en todas las tablas nuevas), pero **no existe
ninguna forma de crear un tenant**. Hoy el acceso se controla con
`PANEL_ALLOWED_EMAILS` — una allowlist global de 5 correos del equipo. Eso funciona
para dogfood y se rompe el día que entre el primer cliente de marca blanca.

Este PRP construye la pieza faltante: **el workspace como objeto de primera clase**,
con sus vistas de aprovisionamiento, su máquina de estados y su gate humano.

El workspace es además tu **unidad de cobro**: el plan del esquema de precios
(Arranque / Profesional / Regulado) vive en esta tabla, y el ledger del ERP se
ancla a ella. Sin workspace no hay facturación por cliente.

---

## 1. Supuesto que asumo (corregir si es incorrecto)

**Aprovisionamiento operado por administrador, no autoservicio.** La dueña o un
operador crea el workspace del cliente; el cliente recibe una invitación. No hay
registro público.

Motivo: consistente con el principio 6 (aprobación humana en lo irreversible) y con
el patrón ya usado en `contratos_sc` y en la bandeja de aprobación de citas. El
autoservicio queda como **seam declarado**, no construido — §8.

---

## 2. El riesgo que hay que decidir ANTES de escribir código

Hoy la doctrina del proyecto es **"RLS enable + FORCE, sin políticas = solo
`service_role`, por diseño"**, y las superficies web renderizan con `service_role`.
Eso significa que **el aislamiento entre tenants viviría únicamente en el código de
la aplicación**, no en la base.

Con un solo tenant (ustedes) eso es correcto y simple. Con N clientes es el riesgo
número uno del producto: un `where tenant_id = ?` olvidado en una ruta filtra datos
de un cliente a otro. No hay red de seguridad debajo.

Dos caminos, y hay que elegir uno explícitamente:

| | **A. Políticas RLS reales** | **B. Punto único de acceso** |
|---|---|---|
| Cómo | Rol `authenticated` + política `tenant_id = auth.jwt()->>'workspace_id'` | Sigue `service_role`, pero TODA consulta pasa por un único módulo que inyecta el filtro |
| Costo | 1–2 semanas, cambia doctrina establecida | 3–4 días, no cambia doctrina |
| Protección | La base rechaza la fuga aunque el código falle | El código puede fallar; se mitiga con test, no con la base |
| Recomendación | **Elegir A antes del segundo cliente.** B es aceptable para el primero |

Recomiendo **B ahora, A antes del segundo cliente**, con la deuda escrita en el
registro de riesgo. Construir A hoy retrasa el primer cliente por un riesgo que con
un solo tenant no existe todavía.

> **Gotcha crítico:** el escape de desarrollo `AUTH_DISABLED=1` no debe, bajo
> ninguna circunstancia, otorgar acceso a todos los workspaces. Debe fijar un
> workspace de demo concreto. Un `AUTH_DISABLED` que además desactiva el filtro de
> tenant es una fuga total esperando a que alguien lo ponga en un `.env` de
> producción por error.

---

## 3. Modelo de datos (`businessos/supabase-workspaces.sql`, aditivo)

```sql
-- Raíz de tenencia. Todo lo demás ya tiene tenant_id; esto le da destino al FK.
create table workspaces (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,          -- alimenta /reservar/[slug] existente
  nombre        text not null,
  estado        text not null default 'solicitado'
                check (estado in ('solicitado','aprobado','aprovisionando',
                                  'activo','suspendido','archivado')),
  plan          text not null default 'arranque'
                check (plan in ('arranque','profesional','regulado')),
  marca         jsonb not null default '{}',   -- logo, colores, dominio, remitente
  cuota         jsonb not null default '{}',   -- leads, horas de reunión incluidas
  origen        text not null,                 -- 'directo' | 'marca-blanca:<socio>'
  socio_id      uuid references workspaces(id),-- null si es cliente directo
  creado_en     timestamptz not null default now(),
  activado_en   timestamptz
);

create table workspace_miembros (
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  email         text not null,
  rol           text not null check (rol in ('propietario','operador','asesor','lector')),
  invitado_en   timestamptz not null default now(),
  aceptado_en   timestamptz,
  primary key (workspace_id, email)
);

-- Bitácora append-only: quién movió qué y cuándo. Patrón de contratos_sc.
create table workspace_bitacora (
  id            bigserial primary key,
  workspace_id  uuid not null references workspaces(id),
  de_estado     text,
  a_estado      text not null,
  actor         text not null,
  nota          text,
  ocurrio_en    timestamptz not null default now()
);

alter table workspaces         enable row level security;
alter table workspaces         force  row level security;
alter table workspace_miembros enable row level security;
alter table workspace_miembros force  row level security;
alter table workspace_bitacora enable row level security;
alter table workspace_bitacora force  row level security;
```

`PANEL_ALLOWED_EMAILS` **no se elimina**: pasa a ser la allowlist de
*administración* (quién puede entrar a `/admin/*`). La membresía de workspace es
una capa distinta y nueva. Ninguna de las dos debilita a la otra.

---

## 4. Máquina de estados

```
solicitado ──[GATE HUMANO: aprobar]──> aprobado ──[job]──> aprovisionando
                    │                                            │
              [rechazar]                                    [ok] │  [falla]
                    ▼                                            ▼      ▼
                archivado                                     activo  aprobado
                                                                 │    (reintento)
                                                       [suspender]│
                                                                 ▼
                                                            suspendido ──> archivado
```

Reglas duras, en el mismo espíritu que el `desplegar-chaincode.py`:

- **Un solo escritor por transición.** El job de aprovisionamiento es el único que
  escribe `aprovisionando → activo`. La UI nunca salta ese estado.
- `aprobado` exige actor humano identificado; queda en `workspace_bitacora`.
- El aprovisionamiento es **idempotente**: reintentar sobre un workspace a medias
  no duplica asesores, miembros ni catálogos. Se usa upsert por clave natural.
- Falla de aprovisionamiento → regresa a `aprobado` con la razón en bitácora.
  Nunca deja el workspace en `aprovisionando` colgado.
- `suspendido` conserva los datos y bloquea el acceso. Es el estado de impago.
  **Nunca borres por impago** — es irreversible y es una demanda esperando ocurrir.

---

## 5. Vistas

### 5.1 `/admin/workspaces` — índice
Tabla de workspaces con estado, plan, origen, fecha de activación y consumo del mes
contra cuota. Filtro por estado y por socio. Botón "Nuevo workspace".

La columna de consumo se alimenta de `v_costeo_tarea` filtrada por tenant: es la
vista donde se ve, de un vistazo, **qué cliente está fuera de margen**. Marca en
ámbar sobre 80% de cuota y en rojo sobre 100%, mismo umbral que la alerta de
presupuesto.

### 5.2 `/admin/workspaces/nuevo` — solicitud
Formulario de una sola pantalla. Campos mínimos, porque cada campo extra es una
excusa para no crear el workspace:

- Nombre del cliente · slug (autogenerado, editable, validado como único)
- Plan · origen (directo / marca blanca + socio)
- Correo del propietario
- Marca: logo, color primario (el resto hereda del theming existente)

Al enviar: estado `solicitado`, entrada en bitácora, redirección al detalle.
**No aprovisiona nada todavía.**

### 5.3 `/admin/workspaces/[id]` — detalle y gate
La vista que carga el peso. Tres zonas, en orden vertical:

1. **Banderas arriba** (patrón de la vista `/contratos` de Mission Control): estado
   actual, qué falta para poder aprobar, y qué se va a crear al aprovisionar.
   Explícito, sin sorpresas.
2. **Acción de gate**: botón "Aprobar y aprovisionar", deshabilitado hasta que las
   banderas estén verdes, con confirmación que lista textualmente los efectos.
3. **Bitácora completa**, append-only, en orden inverso.

Debajo: pestañas de miembros (invitar / cambiar rol / revocar), marca y cuota.

### 5.4 `/admin/workspaces/[id]/aprovisionamiento` — progreso
Solo visible en estado `aprovisionando`. Lista de pasos con su resultado individual,
para que una falla sea diagnosticable sin abrir logs:

- [ ] Fila de workspace consistente
- [ ] Propietario invitado
- [ ] Asesor por defecto creado (catálogo de agendamiento)
- [ ] Disponibilidad base sembrada
- [ ] Slug de `/reservar/[slug]` respondiendo
- [ ] Marca aplicada al theming
- [ ] Registro en el ledger del ERP (regla de marca blanca §5)

### 5.5 Selector de workspace en el shell
Cambio mínimo al shell existente (sidebar + command bar + launcher): un selector
arriba del sidebar. Si el usuario pertenece a un solo workspace, no se muestra —
solo se fija el contexto. El workspace activo vive en la sesión, **jamás en un
parámetro de URL manipulable**.

### 5.6 `/bienvenida` — onboarding del cliente
Primera pantalla del propietario al aceptar la invitación. Checklist de 4 pasos,
no más: confirmar datos del negocio, crear el primer asesor, publicar el enlace de
reserva, invitar al equipo. Cada paso enlaza a la herramienta que ya existe. Sin
esto, el cliente aterriza en un launcher de 16 herramientas vacías y no vuelve.

---

## 6. Pasos de construcción

| Paso | Entregable | Gate de salida |
|---|---|---|
| **1** | Decisión §2 (A o B) escrita en el registro de riesgo | Firma de la dueña |
| **2** | `supabase-workspaces.sql` + suite en Postgres efímero | Migración idempotente; RLS FORCE verificada; aislamiento probado con dos tenants |
| **3** | Capa de acceso con tenant obligatorio + `AUTH_DISABLED` acotado a workspace demo | Test que falla si una consulta omite el filtro |
| **4** | Vistas 5.1–5.3 con datos mock | Smoke Playwright de las 3 rutas |
| **5** | Job de aprovisionamiento idempotente + vista 5.4 | Reintento sobre estado a medias no duplica nada; falla regresa a `aprobado` |
| **6** | Selector de workspace + `/bienvenida` | Un usuario de dos workspaces no ve datos cruzados |
| **7** | Aplicar SQL a producción (management API) + primer workspace real | Ciclo completo `solicitado → activo` con un cliente de verdad |

Los pasos 2–6 son construibles mock-first, consistente con la doctrina de la línea.
El paso 7 es gate de la dueña.

---

## 7. Pruebas mínimas (fail-closed primero)

Siguiendo el patrón del paso 3 de la línea Reuniones — las pruebas que importan son
las de negación:

- Usuario sin membresía → **404**, no 403. No confirmar la existencia del workspace.
- Consulta sin `tenant_id` → falla en test, no en producción.
- Workspace `suspendido` → rechaza acceso, conserva datos, no borra nada.
- Slug duplicado → rechazo limpio, sin fila huérfana.
- Aprovisionamiento interrumpido a la mitad → reintento converge, no duplica.
- `AUTH_DISABLED=1` → un solo workspace demo, nunca todos.
- Miembro revocado → sesión activa pierde acceso en la siguiente petición.

---

## 8. Seams declarados (NO se construyen aquí)

Declararlos explícitamente evita que alguien los construya "de paso":

- **Autoservicio / registro público** — decisión de negocio pendiente
- **Checkout de Polar** al aprobar — el enganche va en el paso 5, la integración no
- **Dominio propio por workspace** — hoy solo slug; el dominio custom exige DNS y
  certificados y es una fase aparte
- **Portal del socio de marca blanca** (que el socio cree sus propios workspaces) —
  requiere resolver §2 opción A primero
- **Migración de los datos actuales** a un workspace "interno" — trivial pero
  explícita, va en el paso 7

---

## 9. Decisiones que necesito de la dueña

1. **§2: opción A o B.** Es la decisión estructural del PRP; todo lo demás se ajusta
   a ella.
2. **¿Quién aprueba?** ¿Solo la dueña, o cualquiera de la allowlist de administración?
3. **Suspensión por impago: ¿automática o manual?** Automática es eficiente y
   arriesgada; manual es segura y no escala. Recomiendo manual hasta el quinto
   cliente.
4. **¿El workspace interno actual se migra o se deja aparte?** Migrarlo prueba el
   camino con datos reales, pero pone en riesgo el dogfood si algo sale mal.

---

## 10. Fuera de alcance

No toca: motor de discovery, Prompter, Guided Meeting, Pre-Discovery, transcripción,
buzón, ni el grafo. Este PRP agrega una capa de tenencia **debajo** de lo que ya
existe; si obliga a reescribir una vista de producto, algo se diseñó mal y hay que
volver a §2.
