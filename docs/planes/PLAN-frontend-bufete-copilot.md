# Plan de implementación frontend — `bufete-copilot`

**Vertical legal (marca blanca) sobre meeting-copilot · B2B para despachos de abogados**

Versión 1.0 · 2026-08-05 · Estado: **PROPUESTA, sin aplicar**
Anclado a: `ROADMAP.md` §Línea Meeting Copilot · §Corriente transversal Frontends ·
§Propuestas en revisión (tenencia B2B) · FASE 2–3 (grafo) · FASE 14 (agendamiento)

---

## 0. Alcance y qué NO es

**Es**: el plan de la **capa frontend** para operar un despacho de abogados B2B
multi-inquilino sobre la infraestructura que ya existe en el repo — configuración de
expertises del bufete, alta de asociados con sus áreas, pipeline de asuntos por asociado,
y el catálogo de herramientas conectadas (OCR, grafo regulatorio, voz, agenda, calendario,
buzón, reuniones).

**No es**: un producto nuevo. No abre repo nuevo, no duplica shell, no crea una segunda
integración de Google, no reimplementa el motor de insights. Sigue el principio 5 del
roadmap — *arreglar lo compartido, no el caso aislado*.

**No es tampoco**: un sistema que dé asesoría legal. Aplica la regla de oro de la FASE 2 sin
excepción: **el sistema señala con fuente citada y vigencia, el abogado decide**. Cero
afirmación sin fuente, fail-safe `dudoso` cuando no hay regla aplicable, disclaimer SIEMPRE.

---

## 1. Decisión de arquitectura: vertical, no app nueva

meeting-copilot ya es marca blanca, ya es multi-tenant desde día 1 (agendamiento M1–M5),
ya tiene shell propio, auth fail-closed, launcher de 16 herramientas y motor mock-first con
seams. Un despacho de abogados es —estructuralmente— lo mismo que el copiloto comercial:
**profesionales con expertise que atienden entrevistas, generan documentos y arrastran un
pipeline**. Lo que cambia es el vocabulario, el catálogo de expertise, los gates y las
dimensiones del grafo.

```
businessos/frontends/meeting-copilot/
├── src/                          ← sin bifurcar
├── verticales/
│   ├── comercial/                ← el actual, extraído a config (refactor de paridad)
│   └── legal/                    ← NUEVO: datos puros, cero lógica
│       ├── vertical.config.ts    ← copy, nav, roles, etapas, gates activos
│       ├── expertises.ts         ← catálogo expertise → dimensión del grafo
│       ├── herramientas.ts       ← 13 tarjetas con estado declarado
│       └── tokens.css            ← theming del skin
└── SPEC.md §20                   ← Vertical Legal
```

**Gate de la decisión**: el refactor `comercial/` debe salir **verde en los 178 unit +
smokes existentes sin tocar un solo test** antes de escribir una línea de `legal/`. Si el
vertical comercial no se puede extraer a config sin romper nada, la premisa es falsa y hay
que reconsiderar app separada. Se descubre en L1, no en L5.

Artefactos nuevos propuestos:

| Artefacto | Ruta | Estado |
|---|---|---|
| PRP | `.claude/PRPs/prp-vertical-legal-bufete.md` | por escribir |
| Spec | `frontends/meeting-copilot/SPEC.md` §20 | por escribir |
| SQL aditivo | `businessos/supabase-legal-bufete.sql` | por escribir, **sin aplicar** |
| Pruebas SQL | `businessos/supabase-legal-bufete.test.sql` | Postgres efímero, patrón #199 |
| Memoria | `.claude/memory/project/frontend-vertical-legal.md` | por escribir |
| Servicio OCR | `businessos/documentos-a2a/` (:5300) | L5 |
| Seed grafo | `businessos/grafo/seeds/legal-mx-v1.sql` | L4 |

---

## 2. Modelo de tenencia — cómo se resuelve "cada asociado atiende multitenant pipeline"

Cuatro niveles. El del medio es el que hoy **no existe** en el repo y es el que hay que
construir.

```
PLATAFORMA (A2A)
   └── DESPACHO = tenant          ← organizaciones / crm_tenants; marca, tono, presupuesto IA
         ├── EXPERTISES DEL BUFETE  (subconjunto del catálogo; define qué se puede vender)
         └── ASOCIADO = membresía  ← rol + expertises propias ⊆ expertises del bufete
               └── PIPELINE del asociado
                     └── ASUNTO (matter)  ← cliente + expertise + jurisdicción + muralla ética
                           └── cliente final (portal, solo lectura)
```

Dos aislamientos distintos, y confundirlos es el error clásico:

1. **Aislamiento por tenant** (`tenant_id` + RLS): un despacho jamás ve datos de otro. Ya
   está resuelto por doctrina en `arquitectura-multitenant-b2b.md` y probado por
   `test-aislamiento-tenants.sql` (10 pruebas, T5–T8 son meta-pruebas). **Sin aplicar.**
2. **Muralla ética / muralla china** (`asunto_id` + ACL explícita): dentro del MISMO
   despacho, el asociado que lleva a la parte A **no puede** ver el expediente de la parte B.
   Esto no existe hoy en ningún esquema del repo y es **requisito profesional, no feature**.
   Se implementa como RLS de segundo nivel: pertenecer al tenant no basta; hace falta fila
   en `asunto_acceso`.

**Roles propuestos** (a mapear contra los 5 de `arquitectura-multitenant-b2b.md`; si no
cuadran, la desviación se **declara** en el SQL como se hizo con `tenant_id text` en
`supabase-buzon.sql`):

| Rol | Configura bufete | Alta asociados | Ve todo asunto del tenant | Aprueba salientes | Firma |
|---|---|---|---|---|---|
| `socio_director` | ✅ | ✅ | ✅ (salvo muralla activa) | ✅ | ✅ |
| `socio` | — | — | solo sus áreas | ✅ | ✅ |
| `asociado` | — | — | solo sus asuntos | propone | — |
| `paralegal` | — | — | solo asuntos asignados | — | — |
| `cliente` | — | — | solo su asunto, solo lectura | — | — |

Nada irreversible (firma, envío, cobro, cierre de asunto) es automático. Es **copiloto, no
autopiloto** — ROADMAP línea 367.

---

## 3. Bloqueadores heredados — se resuelven ANTES de L2

Estos no son riesgos del plan; son deudas ya identificadas en el roadmap que este plan
consume directamente.

| # | Bloqueador | Fuente | Impacto si no se resuelve |
|---|---|---|---|
| B1 | **Choque de tipo `tenant_id`**: `uuid` con FK a `organizaciones` vs `text` (slug) ya vivo en `agenda_*`, `buzones`, `crm_*` | ROADMAP §Propuestas, punto 1 | El SQL del vertical revienta al crear FK, o llena columnas con uuid-en-texto sin error. **Decisión de la dueña antes de cualquier migración.** |
| B2 | **`supabase-fase14-agendamiento.sql` diseñado SIN aplicar** | §Meeting Copilot, M1–M5 | Agenda y citas del bufete corren en mock indefinido |
| B3 | **`prp-workspace-meeting-copilot.md` sin aplicar** (workspace como objeto de primera clase) | §Propuestas | La configuración del bufete no tiene dónde vivir; es exactamente el objeto que este plan necesita |
| B4 | Google Calendar: la única integración es el mirror de control-interno, **no activa** (sin `gog`, sin OAuth, 0 filas) | §Meeting Copilot, PRs #205-207 | La tarjeta de calendario declara su estado real; no se finge |
| B5 | Sin política de retención/ZDR declarada por tenant | Doctrina de ruteo en capas, 2026-07-28 | **Bloqueante duro para legal**: documento de cliente bajo secreto profesional no puede tocar proveedor sin ZDR |

**B5 merece énfasis**: la doctrina de ruteo en capas dice que la capa de EXCLUSIÓN manda —
*"¿qué modelo está PROHIBIDO para este dato?"* va ANTES de capacidad y de costo. En un
despacho, el dato bajo privilegio abogado-cliente es la categoría más restringida del
sistema. El coordinador ya rechaza al arrancar un mapa de ruteo con modelo prohibido; el
vertical legal solo tiene que declarar la clase de dato correcta y dejar que el mecanismo
existente opere.

---

## 4. Mapa de navegación (sidebar jerárquico config-driven)

Respeta el patrón de la corriente transversal 2026-07-29: Sección → Página → Subpágina,
breadcrumb derivado, waffle solo con apps internas, rutas públicas sin shell.

```
Despacho
  ├── Tablero                    métricas del bufete, semáforo de plazos
  ├── Asuntos                    → Detalle → {Cronología · Documentos · Partes · Plazos}
  └── Clientes                   → Detalle → {Asuntos · Conflictos · Facturación}

Mi trabajo
  ├── Mi pipeline                kanban del asociado; etapas legales
  ├── Mis citas                  bandeja de aprobación + tablero (M1–M5)
  ├── Bandeja de correo          buzón institucional, modo espejo
  └── Borradores                 salientes propuestos, esperando aprobación humana

Investigación
  ├── Marco regulatorio          grafo: consulta por expertise + jurisdicción
  ├── Documentos                 OCR + estructura + evidencia citada
  └── Precedentes                fuera de alcance v1; tarjeta declarada `no_disponible`

Reuniones
  ├── Entrevista guiada          Guided Meeting con coach (motor existente)
  ├── Modo asesor                Prompter en vivo
  └── Grabaciones                gate de consentimiento fail-closed

Configuración          ← el corazón de este encargo, §5
  ├── Bufete
  ├── Asociados
  ├── Pipeline y etapas
  ├── Herramientas
  └── Gobernanza IA              presupuesto, ruteo, retención, auditoría

Público (sin shell, mobile-first)
  └── /reservar/[slug]           reserva del cliente, token de un solo uso
```

Alta en `businessos/frontends/app-registry/` (vendored + `sync-vendored.mjs --check` cableado
al CI, como exige el §Ecosistema del README). El launcher gana categoría propia `legal`,
igual que se hizo con `google` — así toda herramienta legal futura cae en su sección sin
tocar el grid.

---

## 5. Configuración — las cinco pantallas

### 5.1 Bufete

| Campo | Tipo | Nota |
|---|---|---|
| Nombre, marca, logotipo, tono | texto / archivo | espejo de `crm_tenants` (marca/tono/casos) |
| **Áreas de expertise del bufete** | multi-select del catálogo §5.2 | define el techo: ningún asociado puede tener una expertise que el bufete no maneje |
| Jurisdicciones | multi-select país + entidad | MX y CO son las que el grafo cubre hoy |
| Zona horaria y calendario laboral | select + días hábiles | insumo de plazos y de slots (TZ del asesor vía `Intl`, DST ya testeado) |
| Días inhábiles oficiales | tabla editable | **crítico**: alimenta el cómputo de plazos |
| Política de retención de datos | radio: `solo_ZDR` / `estandar` | dispara la capa de EXCLUSIÓN del ruteo |
| Presupuesto IA mensual + umbral + acción al tope | número + select | fila en `presupuestos_ia`; **sin fila = fail-closed**, no se degrada en silencio |

### 5.2 Catálogo de expertises → dimensión del grafo

El catálogo es dato puro. La columna que importa es la tercera: **una expertise solo puede
prometer "fuente citada" si el grafo tiene reglas sembradas para ella**. Las demás operan en
modo `sin_cobertura` y lo dicen en pantalla — es la aplicación literal de *acotar antes de
escalar*.

| Expertise | Dimensión del grafo | Cobertura hoy |
|---|---|---|
| Fiscal | `fiscal` | ✅ MX (11 reglas / 13 impactos, LISR/CFF/SAT) + CO (ET 107/771-2/104) |
| Contable-financiero | `contable` | ✅ MX (NIF C-6/D-5, CFF 28/30) |
| Corporativo / contratos | `contractual` | ✅ MX (CCF 1794-1797/1843, CCo 78, LFPDPPP 21, CFF 29-A) |
| Datos personales | `datos-personales` | ✅ MX (4 categorías + 4 reglas; ojo: LFPDPPP 2010 **abrogada**, DOF 20-03-2025) |
| Laboral | `laboral` | ⬜ **primer seed nuevo, L4** — LFT, reforma 2019/2021 |
| Mercantil / societario | `mercantil` | ⬜ LGSM, LCM |
| Administrativo | `administrativo` | ⬜ |
| Amparo / constitucional | `amparo` | ⬜ |
| Civil | `civil` | ⬜ |
| Familiar | `familiar` | ⬜ |
| Penal | `penal` | ⬜ |
| Propiedad intelectual | `pi` | ⬜ |
| Inmobiliario | `inmobiliario` | ⬜ |
| Migratorio | `migratorio` | ⬜ |
| Competencia económica | `competencia` | ⬜ |
| Compliance / anticorrupción | `compliance` | ⬜ |
| Concursal | `concursal` | ⬜ |
| Seguros y fianzas | `seguros` | ⬜ |

El modelo del grafo no cambia: `proyecto → jurisdicción → dimensión → regla → impacto`. Se
agregan dimensiones al seed, **sin tocar el evaluador** — exactamente el patrón del PR #198
(dimensión `datos-personales` reusando los veredictos `permitido|dudoso|no_permitido`).

**Orden de siembra propuesto**: laboral MX → mercantil MX → administrativo MX. Un
país-dimensión validado antes del siguiente. Cada regla entra citada o no entra
(`gen_seed_sql.py --check` es el gate de procedencia).

### 5.3 Asociados

Alta/edición/baja con el patrón ya construido en M1–M5 (CRUD completo **con guard de citas
activas**: no se borra un asociado con agenda viva).

| Campo | Nota |
|---|---|
| Nombre, correo, cédula profesional | la cédula es dato de despliegue en documentos |
| Rol | §2 |
| **Expertises del asociado** | multi-select ⊆ expertises del bufete; con nivel `titular` / `apoyo` |
| Jurisdicciones habilitadas | ⊆ jurisdicciones del bufete |
| Disponibilidad | reusa la disponibilidad del asesor de M1–M5 |
| Capacidad | tope de asuntos activos; se muestra en el ruteo, no se impone en silencio |
| Tarifa / esquema | hora, iguala, cuota litis — insumo de cobro |
| Visibilidad | `todo el tenant` / `solo mis asuntos` — la muralla ética se configura aquí |

**Regla de ruteo** (expertise × jurisdicción → asociado): determinista y explicable. Si hay
empate, propone por capacidad; si no hay candidato, **escala a humano**, no adivina. Mismo
patrón que el calificador del CRM-4: *indeterminado ESCALA, jamás decide*.

### 5.4 Pipeline y etapas

Etapas por defecto del vertical legal, editables por el bufete:

```
consulta → conflicto de interés → propuesta → contratación → asunto activo
         → resolución → facturación → cierre / archivo
```

Dos reglas duras heredadas del CRM:

- La **calificación** del asunto es señal PARALELA, jamás la etapa (regla del paso 4-6 de CRM-4).
- El CHECK de etapa se define de una vez; el roadmap ya documenta el costo de no hacerlo
  ("cita perdida" no existe en `leads.etapa` y quedó como pendiente post-merge).

`conflicto de interés` es **gate, no etapa decorativa**: sin resolución explícita registrada,
el asunto no avanza a propuesta. Fail-closed.

### 5.5 Herramientas — el catálogo propuesto

Cada tarjeta declara su **estado real**, no su intención. El precedente es la tarjeta de
Google Calendar (PRs #205-207): esquema y RLS listos, integración no activa, y lo dice.

| # | Herramienta | Qué hace en el bufete | Seam / servicio | Estado propuesto v1 |
|---|---|---|---|---|
| 1 | **OCR y estructura de documentos** | expediente escaneado → texto + campos (partes, fechas, montos, cláusulas) + índice | **`documentos-a2a` :5300** (nuevo; 5100 reservado a `flujos-a2a`, 5200 a `reuniones-a2a`) | L5, mock declarado |
| 2 | **Imágenes y evidencia visual** | fotos, planos, firmas, capturas; anotación y cadena de custodia | profile `vision` ya enrutado a `claude-sonnet-4.6` (FASE 1) | L5 |
| 3 | **Grafo de marco regulatorio** | consulta por expertise + jurisdicción; veredicto + fuente + vigencia | `grafo:3000` existente + seed legal | **L4, real** |
| 4 | **Semáforo de vigencias** | alerta de norma vencida sirviendo | `GET /salud-conocimiento` + cron `revisar-vigencias` | **L4, real** |
| 5 | **Asistente de voz / dictado** | dicta notas de audiencia; TTS de resúmenes | Web Speech en-app (ya existe) + seam STT | L6 |
| 6 | **Transcripción de entrevistas** | diarizada, con evidencia citada | `transcriptor` faster-whisper / `transcripcion-a2a` :4800 / groq | L6, seam |
| 7 | **Grabación de reuniones** | con **gate de consentimiento fail-closed** y ZDR para audio de cliente | `reuniones-a2a` :5200 (App B, paso 0 completo) | L6, dependiente |
| 8 | **Agenda y citas** | disponibilidad, bandeja de aprobación, reserva pública `/reservar/[slug]` | M1–M5 + `supabase-fase14` | L4, **bloqueado por B2** |
| 9 | **Calendario** | espejo de Google Calendar | `/api/calendar/events` de control-interno — *un mirror, una pluma* | L4, **inactivo declarado (B4)** |
| 10 | **Buzón institucional** | correo operado por agentes con aprobación humana obligatoria | `buzon-a2a` :4900, modo espejo no saltable | L4 |
| 11 | **Captación por WhatsApp/Telegram** | primer contacto → lead con `origen`, `canal`, `telefono` | `crm-canales` :4600 + `sup-crm` :4700 | L7, opcional |
| 12 | **Cobro** | honorarios, anticipos, igualas | Polar (sandbox probado; producción pendiente) | L7 |
| 13 | **Guardia de presupuesto IA** | techo por tenant: bloquear / degradar / avisar | `guardia-presupuesto/` (módulo de plataforma) | **L1, obligatorio** |

La #13 no es opcional y no va al final: un despacho de marca blanca es literalmente el caso
que el roadmap identificó como hueco — *"un tenant de marca blanca dispara consumo escrito
por terceros"*. Se cablea antes de que exista el primer consumidor.

### 5.6 Gobernanza IA

Pantalla de solo-configuración + auditoría: presupuesto y umbral, mapa de ruteo por clase de
dato (con la capa de EXCLUSIÓN visible y editable solo por `socio_director`), política de
retención, y bitácora de qué modelo tocó qué clase de dato. Es la vista que un auditor pide.

---

## 6. Gates deterministas del vertical

Cinco. Todos fail-closed, todos con test que los ve **rechazar de verdad**, no solo
declararse — el estándar que el buzón ya fijó (RLS enable+FORCE verificado rechazando).

| Gate | Regla | Estado inseguro prohibido |
|---|---|---|
| **G1 Conflicto de interés** | sin resolución registrada, el asunto no pasa de `conflicto` | avanzar "porque no se encontró conflicto" ≠ "se verificó" |
| **G2 Privilegio / ZDR** | dato de cliente jamás va a proveedor sin ZDR; el coordinador rechaza el mapa de ruteo al arrancar | degradar a modelo barato sin ZDR al topar presupuesto |
| **G3 Plazos procesales** | el cómputo es **aritmética que se ejecuta, no inferencia** (patrón del gate CAC/LTV del CRM-4 paso 8); insumos faltantes → `validar_insumos()` rechaza ANTES de invocar nada | un LLM "calculando" un vencimiento |
| **G4 Fuente citada** | expertise sin cobertura en el grafo → `sin_cobertura` explícito, nunca respuesta segura de sí misma | veredicto sin cita |
| **G5 Aprobación humana** | firma, envío, cobro y cierre exigen fila que el motor **no puede fabricar** porque no tiene credenciales | política escrita en vez de candado |

G5 copia el invariante del buzón textualmente: *ningún componente que ejecuta un modelo
tiene credenciales de envío*. Eso es lo que un auditor verifica, y en un despacho el auditor
puede ser un colegio de abogados.

---

## 7. Fases de implementación

Cada fase cierra con evidencia ejecutable. No se salta hacia adelante.

### L0 — Desbloqueo (sin código de UI)
- Decisión de la dueña sobre **B1** (`tenant_id` uuid vs slug de texto).
- Decisión sobre **B5**: política de retención por tenant y clase de dato `privilegiado`.
- PRP `prp-vertical-legal-bufete.md` + SPEC §20 escritos y revisados.
- **Salida**: las tres decisiones firmadas en `.claude/memory/decisiones/` con `decision_id`
  (costura Consejo→PRP de la Etapa 1, ya cableada).

### L1 — Extracción del vertical + skin
- Refactor `comercial/` a `verticales/` con los tests existentes **intactos** (gate duro).
- `legal/vertical.config.ts` + tokens + copy. Alta en `app-registry` + `sync-vendored --check`.
- Auth: allowlist fail-closed sobre TODA ruta incl. `/api/*`; `AUTH_DISABLED=1` solo local.
- `guardia-presupuesto` cableada antes de la primera llamada a modelo.
- **Salida**: skin navegable, 100% mock, **cero tokens**, 178 unit previos verdes + smoke de rutas.

### L2 — Configuración (bufete · asociados · expertises)
- Las pantallas §5.1–5.3, mock-first, con validación de subconjunto (asociado ⊆ bufete).
- `supabase-legal-bufete.sql` **escrito, no aplicado**, con `supabase-legal-bufete.test.sql`
  en Postgres efímero (patrón de las 27 pruebas de `supabase-enriquecimiento.test.sql`).
- **Salida**: un despacho demo configurable de punta a punta sin base de datos real.

### L3 — Pipeline y muralla ética
- Kanban por asociado, etapas §5.4, ruteo determinista con escalada.
- **`asunto_acceso` + RLS de segundo nivel**, con las meta-pruebas del patrón T5–T8: la
  suite se rompe sola ante una regresión futura.
- **Salida**: prueba que demuestra que un asociado del MISMO tenant recibe 0 filas de un
  asunto amurallado.

### L4 — Investigación, agenda y buzón
- Seed `legal-mx-v1` (laboral) con `--check` de procedencia; consulta por expertise en UI
  con veredicto + fuente + disclaimer.
- Agenda M1–M5 re-skineada (asesor → abogado); aplicar fase14 si B2 se desbloquea.
- Tarjeta de calendario leyendo el mirror y **declarando su inactividad**.
- Buzón en modo espejo no saltable (7 días Y 20 borradores).
- **Salida**: consulta regulatoria real con fuente citada en la expertise laboral.

### L5 — Documentos
- `documentos-a2a` :5300 (FastAPI + Dockerfile, perfil `a2a`, límites austeros — el headroom
  ya es negativo en la aritmética declarada, ver `RECOMENDACION-reuniones-headroom.md`).
- OCR → estructura → índice del expediente; visión para evidencia.
- **Gate de contenido externo**: el texto extraído de un documento es **dato delimitado,
  nunca instrucción** (regla del calificador CRM-4 + frontera H4 del PRP de endurecimiento).
- **Salida**: expediente escaneado → campos estructurados + 0 inyecciones exitosas contra el
  corpus (el buzón ya tiene 62; se extiende con casos de documento).

### L6 — Voz y reuniones
- Dictado y TTS; STT real o **503 explícito**, nunca degradación silenciosa.
- Consentimiento fail-closed antes de cualquier captura.
- **Salida**: sin consentimiento → rechaza; sin ZDR → 503; bot → 501 con cuerpo, nunca 404.

### L7 — Cobro y cosecha
- Honorarios por Polar; contratos-documento validados por el grafo (dimensión contractual).
- Clasificación en el ORIGEN (`eje_dei`, `vendible`) para que la cosecha de activos
  funcione sin retrabajo.
- **Salida**: primer cobro real + ficha ACT del vertical.

---

## 8. Dirección de diseño del skin

El brief pide un despacho B2B, no una startup. Tres decisiones y una firma:

- **Paleta** — base papel frío (`#F2F3F0`), tinta (`#14181C`), grafito medio (`#5B6670`),
  y un solo acento **verde toga oscuro** (`#1F4D3D`) para estado y foco. Alerta ámbar
  (`#B4762A`) reservada exclusivamente a plazos. Nada de crema + terracota: es el default de
  IA y en un despacho lee a plantilla.
- **Tipografía** — display en una serif de texto legal con buena cursiva para citas
  normativas; cuerpo en una grotesca neutral de alta legibilidad a 14–15px; **face de datos
  tabulares obligatoria** para folios, plazos y montos (las cifras se alinean o no sirven).
- **Estructura** — la numeración sí codifica algo aquí: los expedientes tienen folio y las
  etapas son secuencia real. Se usa numeración porque es verdad del contenido, no adorno.
- **Firma** — la **cinta de plazos**: una franja horizontal densa, siempre visible en el
  asunto, donde cada marca es un vencimiento con su fundamento citado al hover. Es lo único
  con color saturado en toda la pantalla. Todo lo demás se mantiene callado.

Piso de calidad sin anunciarlo: responsive hasta 390×844 (la auditoría adversarial ya
encontró "Salir" inalcanzable en móvil una vez), foco de teclado visible, `prefers-reduced-motion`
respetado, y el drawer móvil con smoke de navegador real desde el día 1.

---

## 9. Tests y gates de CI

| Gate | Qué prueba | Precedente en el repo |
|---|---|---|
| `npm test` (unit) | motor, ruteo, subconjunto de expertises, cómputo de plazos | 178 unit de copilot |
| `npm run smoke` | navegador real 390×844 y 1280×800 contra build de prod | PR #196 |
| `sync-vendored.mjs --check` | drift del app-registry | ya cableado al CI |
| `*.test.sql` en Postgres efímero | RLS de tenant Y de asunto, con meta-pruebas | 27 pruebas de enriquecimiento; T5–T8 de aislamiento |
| Corpus de inyección | documento y correo como dato, no instrucción | 62 inyecciones del buzón |
| Gate de imagen | `docker build` + `Up (healthy)` + agent-card + opacidad | patrón #210 |

Y el que cierra todo: **auditoría adversarial post-merge**, con atacante independiente. El
precedente (12 objeciones, 2 altas, hotfix el mismo día) es la razón por la que este plan
declara estados inseguros explícitos en cada gate.

---

## 10. Decisiones que necesito de la dueña

1. **B1**: ¿`tenant_id` se unifica a `uuid` o `organizaciones` adopta el slug de texto?
   Todo el SQL de este plan depende de la respuesta.
2. **B5**: ¿existe proveedor con ZDR aprobado para documento bajo privilegio? Si no,
   el vertical opera con OCR local y motor apagado para esa clase de dato — es viable, pero
   hay que decirlo antes de vender.
3. ¿El vertical legal es producto propio o marca blanca revendida? Cambia si `bufete-copilot`
   es un tenant más o un despliegue por despacho.
4. ¿Se aplica `supabase-fase14-agendamiento.sql` ahora (desbloquea L4) o la agenda vive en
   mock hasta el primer despacho real?
5. Techo de infraestructura: `documentos-a2a` suma un servicio a un compose ya
   sobre-suscrito (~16.75 GB prometidos sobre 8 GB físicos). Falta el `docker stats` del
   servidor para decidir límites; sin ese dato, L5 arranca con 256M/0.5 vCPU o no arranca.

---

## 11. Anclaje al roadmap

| Entrega de este plan | Se apoya en | Estado de la base |
|---|---|---|
| Shell, launcher, sidebar, theming | §Corriente transversal Frontends (2026-07-29) | ✅ vivo |
| Auth allowlist fail-closed | Meeting Copilot PR #183 | ✅ vivo |
| Motor de entrevista, prompter, coach | Meeting Copilot 2026-07-26 | ✅ vivo |
| Agenda y citas M1–M5 | FASE 14 | 🟡 código sí, SQL sin aplicar |
| Grafo regulatorio + regla de oro | FASE 2–3 | ✅ runtime en Hetzner |
| Dimensión nueva sin tocar evaluador | PR #198 (`datos-personales`) | ✅ patrón probado |
| Buzón con aprobación humana | HERALDO-6 | ✅ desplegado |
| Reuniones + consentimiento + ZDR | App B, paso 0 | 🟡 pasos 1–3 pendientes |
| Guardia de presupuesto IA | CRM-4 paso 2 | ✅ módulo listo, deploy pendiente |
| Tenencia B2B + muralla | §Propuestas en revisión | 🔵 sin aplicar |
| Cobro Polar | FASE 3 | 🟡 sandbox ✅, producción pendiente |
| CLI del vertical | Printing Press + `cli-manifest` | patrón vivo |

---

*Este documento es una propuesta. Nada aquí está aplicado: no se corrió SQL, no se creó
ningún recurso, no se tocó ningún host-job.*
