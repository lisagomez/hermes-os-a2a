# Alineación de `hermes-os-a2a` con la capa de gobernanza

> **Estado**: PLAN APROBADO, sin ejecutar · **Fecha**: 2026-09-03 · **Ámbito**: el repositorio
> `lisagomez/hermes-os-a2a`, medido contra `.claude/gobernanza/` de este template.
> **Tesis**: Hermes no necesita más doctrina de gobernanza — tiene nueve documentos propios y
> buenos. Necesita que esa doctrina **dispare**. Este documento mide cuánto de la capa es
> portable, cuánto ya existe con otro nombre, y en qué orden se cablea.

---

## 0. Por qué existe este documento

`hermes-os-a2a` nació de una versión antigua de este template: conserva `CLAUDE.md`,
`GEMINI.md`, `.claude/skills/`, `.claude/PRPs/` y `BUSINESS_LOGIC.md`, pero se bifurcó **antes**
de que existiera `.claude/gobernanza/` — los siete controles, sus registros append-only, sus
plantillas y el verificador que los cablea.

Mientras tanto Hermes construyó gobernanza propia y de buena calidad: nueve documentos en
`businessos/gobernanza/`, un `prp-base.md` con cuatro secciones fijas de gobernanza, un corpus
adversarial de una decena de familias, y un gate de tenencia en CI con control de reversión de
seis sabotajes deliberados.

El problema no es la doctrina. Es que **casi nada de esa doctrina dispara**. El propio repo se
escribió el criterio el 2026-08-02 —*"una doctrina sin gate es una costumbre"*— y de sus nueve
documentos de gobernanza solo uno lo pasa. Es exactamente el aprendizaje que esta capa ya se
llevó: *un control escrito solo en el documento no dispara*.

**Resultado buscado**: que Hermes opere bajo los mismos siete controles, cableados a **su**
flujo (CI, `CLAUDE.md`, `prp-base.md`, `package.json`), con un verificador que puede ponerse en
rojo y una regresión de skills que corre en cada PR. No una copia del árbol de archivos de este
template.

### Decisiones de alcance, tomadas por la dueña

1. **Por fases**: las fases 1–5 cablean la capa a la raíz y a `.claude/`. La fase 6 mete el
   corpus del buzón en CI como primer puente hacia `businessos/`. El resto —97 archivos de
   pytest y 55 pruebas de los frontends que hoy no corren en ningún CI— queda **declarado como
   riesgo aceptado firmado** en el registro, con fecha de revisión. Declararlo no es taparlo:
   es la diferencia entre una laguna con dueño y una laguna en silencio.
2. **Este documento primero**: el plan se revisa antes de tocar Hermes.

---

## 1. Copiar la capa entera no es viable

De las **37 rutas** que `scripts/verifica-gobernanza.mjs` exige, **25 no existen en Hermes**. No
son huecos de gobernanza: son **otros subsistemas de este template** que el verificador vigila
de paso —la imprenta de CLIs, el routing por nivel, la contabilidad de tokens, el empaquetador
de herramientas, las specs EARS, el deploy dimensionado, el ancla de la imagen del agente—.

Portarlo entero deja el gate rojo desde el primer día. Y un gate que nace rojo se desactiva:
sería el mismo modo de fallo que §9 de `GOBERNANZA.md` describe al revés — un verificador que
siempre pasa porque no verifica nada aprobaría igual; uno que siempre está rojo tampoco informa.

| Bloques del verificador | ¿Núcleo C1–C7? | ¿Portable hoy? |
|---|---|---|
| 1 y 2 (los ocho documentos + los siete controles declarados) · 3, 3b, 3c (cables a `CLAUDE.md`, `GEMINI.md`, READMEs) · 3f (las nueve reglas inline) · 4 (`prp-base.md`) · 5 (enlaces vivos) · 6 y 6b (append-only + firma) · 7 (`.mcp.json` sin alias) · 8 (credenciales vivas en el árbol) | **Sí — el núcleo** | Sí |
| 3h y 3i (protocolo ciego del corpus) | Sí | **No tal cual** — ver §4 |
| 3d, 3d-bis, 3e (`new-app`, pasos de `validate`, conteo de skills) · 3g, 3g-bis, 3g-ter (gate en la ruta de deploy, `next.config.ts`) | Derivado | Sí, con ajustes |
| routing · contabilidad · presupuesto de contexto · empaquetador · imprenta de CLIs · specs EARS · deploy dimensionado · ancla de imagen · portabilidad de arneses | **No** — subsistemas de este template | **Fuera de alcance** |

---

## 2. Estado real de cada control en Hermes

| Control | Qué hay hoy | Veredicto |
|---|---|---|
| **C1 · CDC** | Definido en `businessos/gobernanza/gobernanza-ciclo-de-vida.md` §3, con casilla en `prp-base.md`. El propio documento lo marca *"el hueco — hoy sin gate"* | 📄 papel. Y `gate-docs-vivos.sh` **exime `.claude/*`**, justo el material que C1 vigila |
| **C2 · Regresión de skills** | Especificada en §4 del mismo documento, **cero código**. Existe un corpus adversarial real (`businessos/buzon-a2a/corpus/`, diez familias, criterio de cero escapes) pero prueba el **saneador del buzón**, no a los agentes | ❌ no existe · ✅ artefacto vecino sin gate |
| **C3 · Modelo de amenazas** | `modelo-amenazas-v1.md` (activos, objetivos de atacante y controles catalogados) + mini-sección obligatoria en `prp-base.md` desde el 2026-07-19 | ✅ vivo, sin verificador de aplicación |
| **C4 · AISIA** | `adenda-iso42001.md` §3 + sección AISIA en `prp-base.md`. El propio documento se autocalifica pendiente | 📄 papel con plantilla |
| **C5 · Registro de riesgo** | `registro-decisiones-riesgo-buzon.md`, **con mecanismo real**: la tabla `buzones` rechaza una fila en modo abierto sin `riesgo_firmado_por` | ✅ vivo, pero **de ámbito buzón**, no de proyecto |
| **C6 · Incidentes** | `procedimiento-incidente-inyeccion.md`, disparado por el gate `canario_ausente` | 🟡 ámbito buzón; **sin bitácora de incidentes del repositorio** |
| **C7 · `service_role` / RLS** | `decision-service-role.md` (disparador: *"antes de que exista un SEGUNDO tenant"*, con query de incumplimiento) + `tenencia.yml` corriendo en todo PR sin filtro de rutas | ✅ **el mejor cubierto** — y la regla es casi literal a C7 |

**C7 todavía no ha disparado**: producción tiene **un solo tenant**; los dos nombres que
aparecen en las pruebas de aislamiento son fixtures del esquema efímero. El trabajo de C7 es
**preventivo e instrumental**, no una migración de emergencia — pero los dos gates que faltan
son justo los que avisan cuando deje de serlo.

---

## 3. Lo que ya está en rojo, medido

- **Las nueve anclas inline del bloque 3f fallan las dieciocho veces** (nueve × `CLAUDE.md` y
  `GEMINI.md`): ni el CDC nombrando la configuración, ni el rechazo de `latest`, ni la ruta al
  registro de riesgo, ni el límite de los riesgos infirmables, ni la regla de idioma. La de
  secretos en pantalla **sí existe** (`CLAUDE.md` L315, *"Nunca imprimir secretos en pantalla"*),
  pero redactada de otra forma: no casa el ancla. Es media divergencia papel-código.
- **La capa A de C2 arrancaría con seis contratos en rojo** sobre skills heredados: `new-app`
  (falta la sección de gobernanza y la mención de `service_role`), `prp` (falta *Modelo de
  amenazas* y *Evaluación de impacto* en el propio SKILL) y `playwright-cli` (sintaxis de CLI
  antigua — exactamente el aprendizaje de *"el CLI que preferíamos nunca se había ejecutado"*).
  Los otros seis skills contratados pasan tal cual, y los tres contratos universales pasan en
  los **35**.
- **`prp-base.md` ya trae los tres anclajes de C3, C4 y C1**: el bloque 4 pasaría hoy sin tocar
  nada. Es el activo más valioso que Hermes ya tiene.
- **`.claude/example.mcp.json` viola C1 en siete entradas**, todas con alias auto-actualizable.
  El servidor de Supabase, además, corre con un token de acceso desde un paquete sin pinear.
- **No hay `.claude/settings.json`** y **ningún modelo del arnés está pineado**: los dos
  subagentes declaran un alias de familia, y los skills hablan de nombres comerciales en prosa.
  En el runtime hay del orden de veinte identificadores repartidos en 23 archivos, **cuatro
  esquemas de niveles distintos** y notación inconsistente para el mismo modelo.
- **Ninguna imagen Docker está pineada por digest**: quince Dockerfiles sobre una base
  flotante, más la base de datos, el runtime de Node y el proxy. La doctrina anti-`latest` está
  escrita en cuatro sitios del repo; uno de ellos dice literalmente *"fijar digest sha256 tras
  el primer pull"*, y nunca se fijó.
- **`.claude/README.md` declara 19 skills** y hay **35** directorios con `SKILL.md`.
  **Ningún README menciona la gobernanza.**
- **No hay secretos commiteados** y ningún script vuelca variables de entorno — eso está bien,
  y conviene decirlo. Lo que falta es el escaneo automático que lo mantenga así.

---

## 4. La mina del protocolo ciego

El bloque 3i prohíbe que **cualquier** archivo versionado de texto contenga un identificador de
caso del corpus: la letra inicial seguida de uno o dos dígitos, como palabra suelta. Es una
regla de trazo grueso a propósito, y en este template funciona.

En Hermes **27 archivos versionados la romperían** — el mapa de ruta, `CLAUDE.md`, varios
componentes y pruebas de uno de los frontends, y hasta uno de los propios documentos de
gobernanza. Portar el bloque tal cual obligaría a renombrar 27 archivos por una regla que no es
suya.

**Hermes necesita su propio espacio de identificadores** (`HT-01` y siguientes) y su propia rama
de corpus. Lo que **no** se relaja es la comprobación de que el corpus no viva en el árbol de
trabajo: esa es la que lo protege, y las dos contaminaciones que la produjeron aquí valen igual
allá.

---

## 5. El tamaño real: `businessos/` es el 79 % del repositorio

1357 de 1723 archivos rastreados. Quince `requirements.txt` independientes, siete `package.json`
adicionales, un compose de 29 servicios, diecisiete Dockerfiles, 34 migraciones propias.

Y **`ci.yml` solo cubre el dashboard raíz**: 97 archivos de pytest y 55 pruebas de los frontends
no corren en ningún CI. Lo declara la primera línea del propio workflow, sin disimulo.

De ahí la decisión de alcance: se cablea la raíz ahora y se **firma** lo que queda fuera, en vez
de extender el gate a cuatro quintos del sistema de golpe y que nazca rojo.

---

## 6. El plan, por fases

Principio rector: **cada fase termina con un control negativo**. Se rompe el cable a propósito y
se confirma que el gate se pone en rojo. Un verificador que nunca se ha visto en rojo no
informa.

### Fase 0 — Línea base y CDC de apertura

- Rama de trabajo desde `master`.
- Entrada de apertura en `BITACORA-CDC.md` declarando el radio (plantilla/sistema) y el gate
  aplicado, siguiendo el precedente de la entrada de adopción de esta capa.
- **Dos entradas firmadas** en `REGISTRO-RIESGO.md`: (a) operar con la capa B de C2 pendiente
  mientras se construye; (b) el **alcance por fases**, con qué queda sin cubrir y su fecha de
  revisión. Es la decisión de alcance convertida en riesgo con dueño, que es para lo que C5
  existe.

### Fase 1 — La capa documental, sin duplicar la que ya existe

Alta de `.claude/gobernanza/` con los ocho archivos que exige el bloque 1: `GOBERNANZA.md`,
`REGISTRO-RIESGO.md`, `BITACORA-CDC.md`, `INCIDENTES.md`, las tres plantillas y
`golden-sets/contratos.json`.

Reglas de reconciliación — **no se duplica doctrina**:

- `GOBERNANZA.md` declara los siete controles y en cada uno **apunta al documento de Hermes que
  ya lo desarrolla**: C3 a `modelo-amenazas-v1.md`, C4 a la adenda ISO/IEC 42001, C6 al
  procedimiento de inyección, C7 a la decisión sobre `service_role`. Los nueve documentos se
  quedan donde están y ganan un puntero de vuelta.
- `REGISTRO-RIESGO.md` nace **de proyecto** y supersede en alcance —no borra— al del buzón: una
  entrada inicial lo declara y enlaza. El del buzón conserva su constraint de base de datos,
  que es su mecanismo y lo único que lo hace real.
- `INCIDENTES.md` nace vacío. Heredar los incidentes de otro proyecto confunde: nadie sabe si
  esa fuga le ocurrió a él.
- Las plantillas se portan reconciliando la de modelo de amenazas con el catálogo que Hermes ya
  usa, para que plantilla y documento vivo no discrepen.

### Fase 2 — Cablear las reglas donde muerden

La sección de Reglas de Código de `CLAUDE.md` gana **inline** las nueve reglas que hoy no
disparan: el CDC nombrando la configuración del agente; el pineo del modelo y el rechazo de
`latest` —incluido el tag de una imagen de agente—; la ruta al registro de riesgo; su límite en
los riesgos infirmables; los secretos en pantalla (absorbiendo la regla equivalente que ya
existe con otra redacción); el idioma; el respaldo como contrato; los canales de chat externos
como entrada no autenticada hacia un agente con llaves; y `service_role` alineado con C7.

La octava es la de más superficie real: Hermes ya opera Telegram, Slack y WhatsApp.

Además, los tres documentos de entrada referencian la capa, y `.claude/README.md` corrige el
conteo de skills.

`GEMINI.md` es hoy una copia manual divergente y el bloque 3b lo pondría en rojo por partida
doble: o recibe las mismas anclas, o se declara fuera del alcance del verificador. Se decide en
esta fase y se registra — lo que no vale es dejarlo sin decidir.

### Fase 3 — Capa A de C2: la regresión de skills que hoy no existe

Portar `regresion-skills.mjs` (determinista, sin invocar modelo) y escribir `contratos.json`
para los 35 skills. Reparar los seis contratos rotos o, donde la divergencia sea deliberada,
ajustar el contrato y **justificarlo en el CDC** — que es lo que el formato pide.

Los contratos de los skills propios de Hermes son baratos porque el material ya está escrito:
la familia de siete skills de inteligencia comercial declara sus *reglas no negociables* y un
*contrato de evidencia* (cada afirmación clasificada, procedencia visible, fallo declarado);
el skill de pipeline comercial sus invariantes; el de ciclo de sesión el gate humano de push;
el de orquestación su exclusión fail-closed de modelos; el de Supabase su "RLS siempre". Cada
uno son una o dos entradas.

Y un contrato **prohibido** para la sintaxis inventada del CLI de Playwright, que caza la forma
falsa si vuelve.

### Fase 4 — El verificador, recortado a lo que Hermes tiene

Portar `verifica-gobernanza.mjs` sin los bloques de subsistemas ajenos (última fila de la tabla
de §1). Se conservan los del núcleo, el escaneo de credenciales vivas y el de alias en la
configuración de MCP.

Cableado al flujo, que es lo que lo convierte en gate: `verify:gobernanza` y `regresion` como
scripts, encadenados en `validate`, y un job nuevo en `.github/workflows/ci.yml` que los corre
en cada PR a `master`. Hermes despliega por Vercel y por Docker, no por `npm run deploy`: **CI
es su ruta de deploy**, y ahí es donde el gate tiene que vivir. El equivalente al `predeploy` de
este template es ese job, no un script de npm.

La cifra de comprobaciones que se declare en los README **se escribe después de correr el
verificador**, no antes: el último bloque se autovigila y una cifra inventada lo pone en rojo.

### Fase 5 — Que C1 muerda de verdad

- **`gate-docs-vivos.sh`** hoy exime `.claude/*`. Cambiar esa exención por la regla que le
  corresponde: un PR que toca skills, subagentes, `prp-base.md` o la configuración de MCP
  **exige entrada en `BITACORA-CDC.md`**. Es el cable que convierte el CDC en gate y el cambio
  de mayor efecto de todo el plan.
- **Pinear el arnés**: los dos subagentes pasan de alias de familia a identificador pineado, y
  se crea la tabla de modelo pineado en producción en la bitácora.
- **La configuración de MCP**: las siete entradas flotantes quedan en versión exacta. Cada una
  es una decisión —se pinea la versión que se está usando— y no una sustitución mecánica.
- **Inventario de modelos del runtime**: unificar la notación y declararlos en un solo sitio.
  **No** se propone adoptar el `routing-modelos.json` de este template: Hermes ya tiene ruteo
  propio, con una capa de exclusión fail-closed que impide arrancar el servicio si el mapa
  nombra un modelo prohibido. Sustituir un mecanismo vivo por uno de papel sería un retroceso.
  Lo que falta es la **fuente única**, no otro esquema.

### Fase 6 — Capa B de C2 y el primer puente a `businessos/`

Dos cosas distintas que no deben confundirse:

1. **El corpus del buzón ya existe y es bueno** —diez familias de inyección, criterio de cero
   escapes, dos capas verificadas— y **no lo corre nadie**. Cablearlo a CI es el gate más barato
   y de mayor rendimiento del plan, y es el primer puente hacia `businessos/`: deliberadamente
   uno solo, el que más paga, no los 97.
2. **El corpus de casos-trampa de esta capa prueba al agente**, no al saneador. Hermes necesita
   el suyo, en su propia rama, con el prefijo propio de §4.

Semilla natural para ese corpus, sacada de los incidentes reales de Hermes: el merge del
PR #210 con veredicto FAIL conocido —inyección PostgREST con `service_role` y un gate que
fallaba abierto ante un CSV no confiable—, y el skill que caducó en silencio cuando un tercero
retiró un modelo.

### Fase 7 — Cerrar C7 y C5 hasta el final

- **Detector del segundo tenant**: la condición de incumplimiento que la decisión ya escribe en
  SQL se comprueba hoy a mano. Pasa a paso del workflow de tenencia o a job programado, y su
  rojo enruta al registro de riesgo.
- **El test de arquitectura que la propia decisión exige y que no existe**: que falle si una
  superficie de negocio construye un cliente con la llave de servicio. Hay 48 puntos de llamada
  al constructor del cliente de servicio repartidos en 33 archivos; el test los congela y
  obliga a declarar cada excepción.
- **Declarar las superficies**, separando negocio, jobs de plataforma y webhooks — estos
  últimos, la superficie mejor tratada del repo: verifican firma y fallan cerrado.
- Migrar por referencia el registro de riesgo del buzón al de proyecto, conservando su gate.

---

## 7. Lo que este plan NO hace, y por qué se nombra igual

La alineación destapa hallazgos de seguridad que **no son trabajo de gobernanza** y no se
resuelven aquí. Tampoco se dejan sin dueño: cada uno entra como entrada en el registro de riesgo
o como evaluación de impacto pendiente, que es exactamente para lo que existen esos registros.

- Una variable de entorno desactiva el middleware completo en dos aplicaciones, sin guarda de
  entorno de ejecución, con `service_role` detrás.
- Una de las aplicaciones públicas no tiene middleware: su endpoint de captación es anónimo y
  escribe con la llave de servicio sin límite de tasa. En otra, el límite de tasa está
  documentado pero no implementado — y el comentario lo dice con honestidad.
- Del orden de 34 de 85 tablas sin RLS habilitado en el SQL del repositorio.
- Sin escaneo de secretos en CI. Hoy no hay ninguno commiteado; hoy tampoco hay nada que lo
  impida mañana.
- Un archivo `.env` rastreado en git pese a estar cubierto por `.gitignore`. Hoy solo contiene
  configuración.

Los tres primeros tocan **datos de terceros**. Por el límite de C5 que este mismo plan
introduce, no son firmables: se rediseñan o no se hacen. Nombrarlos ahora es el punto — taparlos
con una firma sería usar la gobernanza al revés.

---

## 8. Verificación

Ninguna fase se cierra sin su control negativo.

```bash
# Fases 1-4 — el gate completo, en local
npm run verify:gobernanza   # exit 0; la cifra que devuelve es la que se escribe en los README
npm run regresion           # capa A sobre los 35 skills
npm run validate            # cadena completa

# Control negativo del verificador (obligatorio)
#   retirar de CLAUDE.md la referencia a .claude/gobernanza -> DEBE dar rojo nombrando el cable
#   restaurar                                                -> verde con la misma cifra

# Control negativo de la regresion (obligatorio)
#   borrar "RLS" del SKILL.md de supabase -> DEBE dar rojo nombrando el contrato
#   restaurar                             -> verde

# Fase 5 — el gate del CDC
CHANGED_FILES=".claude/skills/prp/SKILL.md" PR_BODY="" PR_LABELS="" bash scripts/gate-docs-vivos.sh
#   DEBE fallar pidiendo entrada en BITACORA-CDC.md; con la entrada, pasa

# Fase 6 — el corpus del buzon, ya en CI
cd businessos/buzon-a2a && ../.venv/bin/python -m pytest tests/test_corpus.py -q   # cero escapes

# Fase 7 — el test de arquitectura
#   anadir un cliente de servicio en una superficie de negocio -> DEBE dar rojo

# CI
#   PR de prueba: confirmar que el job de gobernanza aparece y que puede ponerse en rojo
```

Cierre: entrada final en `BITACORA-CDC.md` con las cifras reales —verificador N de N, regresión
verde, controles negativos corridos— y **firma humana**. El formato la exige y el bloque de
firmas la comprueba.

---

*Documento de planificación. Se actualiza cuando la ejecución contradiga lo medido aquí: lo que
se midió el 2026-09-03 puede haber cambiado, y una cifra vieja presentada como actual es peor
que un hueco declarado.*
