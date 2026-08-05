# Adenda de conciliación

**`PLAN-frontend-bufete-copilot.md` (2026-08-05) × `Plan de trabajo · Avatares legales` (2026-08-04)**

Estado: propuesta. El Plan de trabajo del equipo es la fuente de verdad para las 8 fases del
prototipo; esta adenda solo (a) retira lo que quedó contradicho, (b) marca cuatro correcciones
de costo casi nulo que evitan un rewrite, y (c) recoloca el resto como Fase 9+.

Revisión 2026-08-05: pasada por ataque adversarial contra el código real del repo; C1 y C2
fueron corregidas y la fila 12 de la Fase 9+ hereda un bloqueador que se había perdido.
Detalle de qué cambió y por qué en §7.

---

## 1. Qué queda retirado de mi plan

| Sección mía | Veredicto | Motivo |
|---|---|---|
| §1 Vertical dentro de meeting-copilot | **RETIRADA** | Decisión ya tomada: app real y separada en el monorepo, copiando el patrón de configuración de meeting-copilot como app hermana (:3005). Mi gate del refactor `verticales/comercial/` ya no aplica. |
| §4 Mapa de navegación por función | **RETIRADA** | La navegación es por avatar (4 alas), no por función. Sidebar de avatares + pestañas de 4 vistas cada uno. |
| §7 Fases L0–L7 | **RECOLOCADA** | Las 8 fases del equipo son el prototipo. Mis L0–L7 arrancan después, renumeradas §4 de esta adenda. |
| §8 Dirección de diseño (verde toga) | **SUSTITUIDA** | El equipo ya fijó fondo claro / tinta grafito / azul profundo / ámbar. Ver §3 abajo, con una objeción. |

Lo que **sobrevive intacto**: §2 tenencia y muralla ética, §3 bloqueadores B1/B5, §5.2 catálogo
expertise→dimensión del grafo, §6 gates deterministas, §9 tests, §10 decisiones. Nada de eso está
en el Plan de trabajo, y nada de eso lo contradice.

---

## 2. Cuatro correcciones al prototipo (baratas ahora, caras después)

Ninguna agrega alcance ni toca la lista de "fuera de alcance". Las cuatro son decisiones de forma
dentro de trabajo que ya se va a hacer.

### C1 — El seam del grafo debe ser genérico, no una función por área

El Plan de trabajo ejemplifica el seam como `fetchFiscalCriteria()`. Si ese es el patrón, cada
expertise nueva (laboral, mercantil, administrativo…) exige una función nueva, un tipo nuevo y una
vista nueva — y el bufete que maneja seis áreas necesita seis implementaciones del mismo llamado.

El backend real ya existe y **su contrato es genérico**: el grafo evalúa
`proyecto → jurisdicción → dimensión → regla → impacto`. Y el contrato de consumo **también
existe ya, probado en la app hermana**: `meeting-copilot/src/features/pre-discovery/grafo.ts`
(tipos `EstadoGrafo`/`FuenteGrafo`/`EvaluacionGrafo`, validador y mock, con el fail-safe real
implementado: `estado: 'dudoso'`, razón `"sin regla aplicable"`, fuente `null`). La firma que
corresponde es:

```ts
fetchCriterios({ expertise, jurisdiccion, contexto })
  → EvaluacionGrafo   // el contrato de la app hermana, sin estados nuevos:
                      // estado ∈ los 5 valores que el evaluador real emite,
                      // fuentes citadas, vigencia, disclaimer siempre
```

Dos precisiones que la v1 de esta adenda tenía mal (ver §7): **no** se inventa un veredicto
`sin_cobertura` — el evaluador real no lo emite y un estado paralelo obligaría a reescribir o
a traducir en fase 9 —, y `expertise` **no es** la dimensión: el mapeo expertise→dimensión es
el catálogo §5.2 del plan (11 de 18 expertises aún sin dimensión sembrada; el mapeo es
anulable, no identidad). Cambiar esto en fase 3 cuesta una firma; cambiarlo en fase 9 cuesta
las cuatro vistas de cada avatar. **Es la corrección de mayor retorno de las cuatro.**

### C2 — La falta de cobertura tiene que existir como caso desde el mock (en el catálogo, no en el veredicto)

El grafo cubre hoy **cinco** dimensiones: fiscal MX/CO, contable MX, contractual MX,
datos-personales MX y regulatorio MX (permisos y cumplimiento operativo — la v1 de esta adenda
la omitía, ver §7). **Litigio y buena parte de contratos no tienen reglas sembradas.** Si los
datos de utilería del Avatar de Litigio muestran criterios con fuente citada, el prototipo
promete algo que el backend no puede cumplir, y la demo se convierte en una deuda.

La falta de cobertura se resuelve como dato **estático del catálogo** expertise→dimensión
(§5.2): ¿esta expertise tiene dimensión sembrada, sí o no? Se calcula ANTES de llamar al seam
y **nunca** viaja en el tipo de retorno de `fetchCriterios` — el fail-safe real del evaluador
es `dudoso` con "sin regla aplicable", y disfrazar un `dudoso` evaluado de "no cubierto" (o al
revés) borra la distinción que se le vende al despacho: "lo evaluamos y es dudoso" no es "no
lo intentamos". El mock debe incluir al menos una expertise en modo sin-cobertura, renderizada
con su tratamiento visual propio. Es la regla de oro de la FASE 2 llevada a la UI: disclaimer
siempre, cero afirmación sin fuente.

### C3 — `tenant_id` y `asociado_id` en los tipos mock desde la fase 3

El Plan de trabajo excluye backend y login, correctamente. Pero los **tipos** de los datos de
utilería no cuestan infraestructura. Si `Caso`, `Audiencia` y `Contrato` nacen sin `tenant_id`
ni `asociado_id`, la multi-tenencia después no es "conectar el seam": es re-tipar todo y revisar
cada vista.

Costo hoy: dos campos por tipo, poblados con valores de utilería. Los filtros por abogado que la
fase 4 ya contempla salen gratis de ahí.

### C4 — Ámbar no puede ser riesgo-medio Y plazo crítico

El Plan de trabajo asigna colores semánticos de riesgo (alto/medio/bajo) y marca el ámbar como
"pendiente de validar". Mi plan proponía ámbar exclusivo para vencimientos.

Un despacho de litigio mira dos escalas independientes: **qué tan grave** y **qué tan pronto**. Si
comparten color, un plazo que vence mañana en un asunto de riesgo bajo se lee igual que un riesgo
medio sin fecha. Recomendación: la escala de riesgo se queda con el color; **el plazo se codifica
por otra dimensión** — peso, posición o la cinta de plazos como elemento propio. Decidirlo en la
fase 1, cuando se fijan los tokens, no después de pintar cuatro avatares.

---

## 3. Diseño: lo que adopto del equipo

Fondo claro, tinta grafito, azul profundo como acento, serif para títulos + sans para interfaz.
Retiro mi verde toga: la paleta del equipo ya es específica y sobria, y hace exactamente el
trabajo que el brief pide (socios que quieren verse serios, no la marca oscura y violeta de A2A
Factory). Mi única aportación viva es C4 y la insistencia en la face tabular para folios, plazos
y montos — cifras desalineadas en un tablero de vencimientos son un defecto funcional, no
estético.

---

## 4. Fase 9+ — dónde entra la configuración que pediste

Nada de esto va en las 8 fases. Empieza cuando el PR del prototipo esté fusionado y exista backend.

| Fase | Contenido | Depende de |
|---|---|---|
| **9 — Desbloqueo** | Decisión B1 (`tenant_id` uuid vs slug de texto) y B5 (política ZDR para dato bajo privilegio). Sin esto no hay migración posible. | dueña |
| **10 — Configuración** | Bufete (expertises, jurisdicciones, días inhábiles, retención, presupuesto IA) · Asociados (expertises ⊆ bufete, disponibilidad, capacidad, visibilidad) · Ruteo determinista expertise × jurisdicción → asociado, con escalada a humano si no hay candidato | fase 9 |
| **11 — Tenencia y muralla ética** | RLS de tenant + RLS de segundo nivel por `asunto_acceso`. Dentro del mismo despacho, el asociado de la parte A no ve el expediente de la parte B. No es feature, es requisito profesional. | fase 10 |
| **12 — Herramientas** | Las 13 tarjetas con estado declarado: grafo real, agenda M1–M5, calendario (mirror, hoy inactivo), buzón, OCR `documentos-a2a` :5300, voz, reuniones con consentimiento. ⚠️ `documentos-a2a` hereda la decisión §10.5 del plan: sin el `docker stats` del servidor (compose ya sobre-suscrito), arranca con 256M/0.5 vCPU o no arranca | fase 11 + `docker stats` (§10.5) |
| **13 — Cobro y gobernanza IA** | Polar, guardia de presupuesto por tenant, bitácora de qué modelo tocó qué clase de dato | fase 12 |

Los cuatro avatares del prototipo son la **superficie de trabajo**; la configuración es la
**superficie de administración**. Conviven: lo natural es que Configuración cuelgue del Avatar
Director, que ya es el tablero de socios y gerencia y ya contempla encendido/apagado de
departamentos con bitácora.

---

## 5. Dos cosas que el Plan de trabajo dice y conviene sostener

**"El CI no vigila esta zona."** Declarado con honestidad, y es cierto — les pasa a las apps
hermanas. Pero el precedente del repo dice que eso se arregla: los specs de la raíz quedaron
cableados al CI de GitHub el 2026-07-30, y el gate de drift "dejó de ser aspiracional". Mismo
camino aquí en cuanto haya algo que proteger.

**"Nadie aprueba su propio trabajo."** El entregable termina en PR abierto porque la máquina no
puede fusionar. Eso no es una limitación técnica incómoda: es el mismo invariante que el buzón
agéntico —quien ejecuta el modelo no tiene la credencial— y es exactamente lo que un colegio de
abogados verificaría. Vale la pena decirlo así en la documentación de la app, no como disculpa.

---

## 6. Lo que sigue sin resolverse

1. **B1** — `tenant_id` uuid vs slug de texto. Bloquea toda la fase 10.
2. **B5** — ¿hay proveedor con ZDR aprobado para documento bajo secreto profesional? Si no, el
   OCR corre local y el motor se apaga para esa clase de dato. Es viable, pero hay que saberlo
   antes de prometerlo en una demo a socios.
3. **Ámbar** (C4) — decisión de tokens, fase 1.
4. El Plan de trabajo menciona una investigación de buyer persona que no tengo. Si contiene
   objeciones concretas de los socios sobre configuración o control, ajusto la fase 10.

---

## 7. Revisión adversarial (2026-08-05)

Antes de presentarse, esta adenda pasó por un ataque adversarial verificado contra el código
real del repo (doctrina de la fábrica: todo plan se ataca antes de presentarse). Veredicto:
aprobar con cambios. Lo que cambió respecto de la v1:

1. **C1 corregida (objeción alta).** La v1 proponía un veredicto `sin_cobertura` en el retorno
   de `fetchCriterios`. El evaluador real (`grafo/evaluador.py`) emite exactamente 5 estados y
   la ausencia de regla ya tiene fail-safe: `dudoso` + razón "sin regla aplicable". Peor: la
   app hermana (`meeting-copilot/…/pre-discovery/grafo.ts`) ya implementa ese contrato — y el
   Plan de trabajo manda copiar el patrón de la app hermana. Un estado paralelo habría obligado
   en fase 9 al mismo rework que C1 decía evitar, o a una capa de traducción capaz de disfrazar
   un `dudoso` real. C1 ahora reusa el contrato existente sin estados nuevos.
2. **C1, segunda corrección (media-alta).** "`expertise` es la dimensión" era falso: el seed
   tiene 5 dimensiones y el catálogo §5.2 lista 18 expertises (11 sin dimensión). El mapeo
   expertise→dimensión es el catálogo, anulable — no una identidad.
3. **C2 corregida (media).** La v1 contaba 4 dimensiones sembradas; son 5 (faltaba
   `regulatorio` MX). Seguir la lista vieja habría marcado como "sin cobertura" expertises que
   el backend sí cubre — el error inverso al que C2 previene. Además, la falta de cobertura se
   movió del veredicto al catálogo estático (ver C2).
4. **Fila 12 de la Fase 9+ (media).** No heredaba la decisión §10.5 del plan (headroom del
   compose para `documentos-a2a`); patrón conocido "documentado ≠ aplicado". Ahora la hereda
   explícita.

C3 y C4 sobrevivieron el ataque sin objeción real (C3 con la cautela de que los valores de
tenencia en el mock deben quedar inertes: cualquier filtrado real por tenant en fases 3–8
sería alcance no autorizado).
