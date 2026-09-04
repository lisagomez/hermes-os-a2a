# Alineación de gobernanza en `hermes-os-a2a` — Spec de ejecución

> Compilado el 2026-09-04 desde el plan aprobado
> **`docs/planes/ALINEACION-GOBERNANZA-hermes-os-a2a.md`** (2026-09-03, PLAN APROBADO).
> Ese documento es la fuente; este es el contrato de ejecución. Ante discrepancia, manda
> el plan aprobado — salvo en las cifras, donde manda lo que midas tú hoy.

---

## MISION

Que Hermes opere bajo los siete controles de gobernanza **C1–C7**, cableados a **su** flujo
—CI, `CLAUDE.md`, `prp-base.md`, `package.json`— con un **verificador que puede ponerse en
rojo** y una **regresión de skills que corre en cada PR**.

No es copiar el árbol de archivos del template. Hermes no necesita más doctrina: tiene nueve
documentos propios y buenos en `businessos/gobernanza/`. Necesita que esa doctrina **dispare**.
El propio repo se escribió el criterio el 2026-08-02 — *"una doctrina sin gate es una
costumbre"* — y de sus nueve documentos solo uno lo pasa.

**El horizonte de esta misión es la PROFUNDIDAD del cableado, no la amplitud.** Cada control
que quede en pie tiene que haber sido **visto en rojo** al menos una vez. Un verificador que
nunca se ha puesto en rojo no informa; uno que nace rojo se desactiva. Ambos fallan igual.

### La ambición NO es ampliar el alcance

La dueña ya decidió el alcance y esa decisión es una **restricción real**, no una sugerencia
descartable: se cablea la raíz y `.claude/` ahora; el corpus del buzón es el primer y **único**
puente a `businessos/`; los 97 archivos de pytest y las 55 pruebas de los frontends que hoy no
corren en ningún CI quedan **declarados como riesgo aceptado firmado**, con fecha de revisión.

Declararlo no es taparlo: es la diferencia entre una laguna con dueño y una laguna en silencio.
Extender el gate a cuatro quintos del sistema de golpe lo haría nacer rojo, que es el modo de
fallo que este plan existe para evitar. **No amplíes el alcance por iniciativa propia.**

---

## LIBERTAD TECNICA

Tú decides el **cómo**: qué bloques del verificador sobreviven al recorte, cómo se estructuran
los contratos de los 35 skills, la forma del job de CI, cómo se reconcilian las plantillas con
el catálogo que Hermes ya usa, y en qué orden atacas dentro de cada fase.

`/home/gsore/code/template/` es **fuente a portar, no plantilla a copiar**. Ahí viven
`scripts/verifica-gobernanza.mjs` (1183 líneas, 37 rutas exigidas),
`scripts/regresion-skills.mjs` (151 líneas) y `.claude/gobernanza/` completo. Léelos, entiende
qué hace cada bloque, y **porta solo lo que Hermes tiene**. De las 37 rutas, 25 no existen aquí
y no son huecos de gobernanza: son otros subsistemas de aquel template (imprenta de CLIs,
routing por nivel, contabilidad de tokens, specs EARS, deploy dimensionado, ancla de imagen).

Lo que NO es libre: los siete controles, el control negativo por fase, y las RESTRICCIONES.

---

## INVESTIGA ANTES DE CONSTRUIR

Antes de escribir una línea:

1. **El plan aprobado entero** — `docs/planes/ALINEACION-GOBERNANZA-hermes-os-a2a.md`.
   Sus §1–§5 son la medición; §6 el plan por fases; §7 lo que explícitamente **no** se hace.
2. **La capa de origen** — `/home/gsore/code/template/.claude/gobernanza/` (`GOBERNANZA.md`,
   `REGISTRO-RIESGO.md`, `BITACORA-CDC.md`, `INCIDENTES.md`, `plantillas/`,
   `golden-sets/contratos.json`) y los dos scripts.
3. **La gobernanza que Hermes YA tiene** — los nueve documentos de `businessos/gobernanza/`.
   Son buenos. Se quedan donde están y ganan un puntero de vuelta.
4. **Los cables actuales** — `.claude/PRPs/prp-base.md` (ya trae los anclajes de C1, C3 y C4:
   el activo más valioso del repo), `scripts/gate-docs-vivos.sh`, `.github/workflows/ci.yml`
   y `tenencia.yml`, `package.json`, `.claude/example.mcp.json`.

**Re-mide, no copies las cifras.** El plan se midió el 2026-09-03 y lo dice él mismo: *"una
cifra vieja presentada como actual es peor que un hueco declarado."* Verificado el 2026-09-04
y sigue en pie: `.claude/gobernanza/` no existe · 35 directorios con `SKILL.md` mientras
`.claude/README.md:245` declara 19 · `gate-docs-vivos.sh:44` exime `.claude/*` ·
`package.json` sin `validate`/`verify:gobernanza`/`regresion` · los dos subagentes en alias de
familia (`model: opus`), sin pinear · `.claude/example.mcp.json` presente.

---

## FORMA: LOOP (no grafo)

Diagnosticado con las cuatro preguntas: sin fan-out real, fases estrictamente secuenciales,
y el criterio de éxito tiene la **misma forma** en todas (romper el cable → rojo → restaurar →
verde). El test de colapso lo confirma. Un solo loop con el comando de validación como
heartbeat. No montes subagentes ni orquestación: sería teatro de complejidad.

---

## LAS FASES

El plan aprobado las desarrolla en §6. Resumen operativo — **cada una cierra con su control
negativo**:

- **Fase 0** · Rama desde `master`. Entrada de apertura en `BITACORA-CDC.md` (radio + gate).
  **Dos entradas firmadas** en `REGISTRO-RIESGO.md`: (a) operar con la capa B de C2 pendiente;
  (b) el alcance por fases, con lo que queda fuera y su fecha de revisión.
- **Fase 1** · `.claude/gobernanza/` con los ocho archivos del bloque 1. **Sin duplicar
  doctrina**: `GOBERNANZA.md` declara C1–C7 y cada uno **apunta al documento de Hermes que ya
  lo desarrolla** (C3→`modelo-amenazas-v1.md`, C4→`adenda-iso42001.md`,
  C6→`procedimiento-incidente-inyeccion.md`, C7→`decision-service-role.md`).
  `REGISTRO-RIESGO.md` nace **de proyecto** y supersede en alcance —no borra— al del buzón,
  que conserva su constraint de base de datos (su mecanismo, lo único que lo hace real).
  `INCIDENTES.md` **nace vacío**: heredar incidentes ajenos confunde.
- **Fase 2** · Las **nueve reglas inline** en `CLAUDE.md`, que hoy fallan las dieciocho veces
  (nueve × `CLAUDE.md` y `GEMINI.md`). La de secretos en pantalla **ya existe** en
  `CLAUDE.md` L315 con otra redacción: **absórbela**, no la dupliques. La octava —canales de
  chat externos como entrada no autenticada hacia un agente con llaves— es la de más
  superficie real: Hermes opera Telegram, Slack y WhatsApp. Corrige el conteo de skills del
  `.claude/README.md` (19 → el número que midas).
  **`GEMINI.md` se decide en esta fase y se registra**: o recibe las mismas anclas, o se
  declara fuera del alcance del verificador. Lo que no vale es dejarlo sin decidir.
- **Fase 3** · Capa A de C2: portar `regresion-skills.mjs` (determinista, sin invocar modelo) y
  escribir `contratos.json` para los 35 skills. Seis contratos arrancarían en rojo (`new-app`,
  `prp`, `playwright-cli`). Repáralos o, si la divergencia es deliberada, ajusta el contrato y
  **justifícalo en el CDC**. Los skills propios de Hermes son baratos: su material ya está
  escrito (la familia de inteligencia comercial declara sus *reglas no negociables* y su
  *contrato de evidencia*; el de sesión su gate humano de push; el de orquestación su
  exclusión fail-closed). Añade un contrato **prohibido** para la sintaxis inventada del CLI
  de Playwright, que cace la forma falsa si vuelve.
- **Fase 4** · Portar `verifica-gobernanza.mjs` recortado. Cablearlo: `verify:gobernanza` y
  `regresion` como scripts, encadenados en `validate`, **y un job en `ci.yml`** que los corra
  en cada PR a `master`. Hermes despliega por Vercel y Docker, no por `npm run deploy`: **CI
  es su ruta de deploy**. La cifra de comprobaciones que se escriba en los README **se escribe
  DESPUÉS de correr el verificador** — el último bloque se autovigila y una cifra inventada lo
  pone en rojo.
- **Fase 5** · Que C1 muerda: `gate-docs-vivos.sh` cambia la exención de `.claude/*` por la
  regla que le toca (tocar skills, subagentes, `prp-base.md` o config de MCP **exige** entrada
  en `BITACORA-CDC.md`). **Es el cambio de mayor efecto del plan.** Pinear el arnés (los dos
  subagentes de alias a identificador exacto) + tabla de modelo pineado en la bitácora. Las
  siete entradas flotantes de MCP a versión exacta — cada una es una decisión, no una
  sustitución mecánica. Inventario de modelos del runtime: **fuente única, no otro esquema**.
  ⛔ **NO** adoptes el `routing-modelos.json` del template: Hermes ya tiene ruteo propio con
  exclusión fail-closed que impide arrancar si el mapa nombra un modelo prohibido. Sustituir
  un mecanismo vivo por uno de papel es un retroceso.
- **Fase 6** · Dos cosas distintas que no se confunden: (1) el **corpus del buzón ya existe**
  (`businessos/buzon-a2a/corpus/`, diez familias, cero escapes) **y no lo corre nadie** —
  cablearlo a CI es el gate más barato y de mayor rendimiento del plan, y el primer puente a
  `businessos/`: deliberadamente uno solo. (2) El corpus de **casos-trampa prueba al agente**,
  no al saneador; Hermes necesita el suyo, con **espacio de identificadores propio (`HT-01`…)**
  — el prefijo del template rompería 27 archivos versionados por una regla que no es suya.
  Lo que **no** se relaja: que el corpus no viva en el árbol de trabajo.
  Semillas reales: el merge del PR #210 con veredicto FAIL conocido, y el skill que caducó en
  silencio cuando un tercero retiró un modelo.
- **Fase 7** · Cerrar C7 y C5: detector del segundo tenant (hoy a mano) como paso del workflow
  de tenencia o job programado, con su rojo enrutando al registro de riesgo. El **test de
  arquitectura que la propia decisión exige y no existe**: que falle si una superficie de
  negocio construye un cliente con la llave de servicio (48 puntos de llamada en 33 archivos;
  el test los congela y obliga a declarar cada excepción). Declarar las superficies separando
  negocio, jobs de plataforma y webhooks. Migrar por referencia el registro del buzón al de
  proyecto, conservando su gate.

---

## DEFINICION DE HECHO (evidencia visible en la conversación)

El evaluador **solo lee esta conversación**: no corre comandos, no abre archivos. Todo lo que
no pegues, no existe.

1. **`npm run validate` en verde**, con su salida pegada y la cifra **N de N** del verificador.
2. **El control negativo de CADA fase, pegado EN LOS DOS ESTADOS**: el **rojo** —con el mensaje
   que nombra el cable roto— y el **verde** restaurado. *Un verde que nunca se ha visto en rojo
   no informa.* Sin el rojo pegado, la fase no cuenta como cerrada. Como mínimo:
   - retirar de `CLAUDE.md` la referencia a `.claude/gobernanza` → rojo nombrando el cable;
     restaurar → verde con la misma cifra;
   - borrar `RLS` del `SKILL.md` de supabase → `regresion` roja nombrando el contrato;
     restaurar → verde;
   - `CHANGED_FILES=".claude/skills/prp/SKILL.md" PR_BODY="" PR_LABELS="" bash scripts/gate-docs-vivos.sh`
     → falla pidiendo entrada en `BITACORA-CDC.md`; con la entrada, pasa;
   - añadir un cliente de servicio en una superficie de negocio → el test de arquitectura rojo.
3. **`regresion` verde sobre los 35 skills**, y el contrato **prohibido** cazando la sintaxis
   falsa del CLI de Playwright (demuéstralo: introdúcela y que salte).
4. **El corpus del buzón corriendo en CI**, con la salida de
   `cd businessos/buzon-a2a && ../.venv/bin/python -m pytest tests/test_corpus.py -q` — cero escapes.
5. **El job de CI existe y puede ponerse en rojo** — no basta con que aparezca en verde.
6. **PR abierto contra `master`** (nunca push directo), con el diff resumido.
7. **Entrada de cierre en `BITACORA-CDC.md`** con las cifras **reales** —verificador N de N,
   regresión verde, controles negativos corridos— y el **bloque de firma humana VACÍO**.
8. **Reporte de decisiones**: qué bloques del verificador conservaste y por qué, qué se decidió
   sobre `GEMINI.md`, qué contratos se ajustaron en vez de repararse y su justificación.
9. **Lista las formas en que esto podría estar mal o incompleto, y resuélvelas.**

---

## COMANDO DE VALIDACION

Corre tras **cada cambio grande** y **surfea su output**:

```bash
npm run typecheck && npm run lint && npm run build
```

En cuanto los scripts existan (Fases 3–4), encadena y usa la cadena completa:

```bash
npm run verify:gobernanza && npm run regresion && npm run validate
```

Este es el heartbeat contra el drift. No lo dejes para el final.

---

## RESTRICCIONES REALES

1. **Nunca `git push origin master`.** Todo por PR, sin excepciones — también los cambios
   propios del agente. Es doctrina del repo (`CLAUDE.md`, 2026-07-18) y `master` tiene
   `enforce_admins:true`.
2. **No firmes por un humano.** La entrada de cierre exige firma humana; déjala **vacía** y
   detente ahí. Es la doctrina del propio repo aplicada a sí misma: *la firma es una fila que
   el motor no puede fabricar.* Fabricarla vaciaría de sentido C5 entero.
3. **No arregles los hallazgos de §7 del plan.** Son de seguridad, no de gobernanza: entran
   como entrada en el registro de riesgo o como AISIA pendiente. Y los **tres que tocan datos
   de terceros NO son firmables** por el límite que este mismo plan introduce: se rediseñan o
   no se hacen. Taparlos con una firma sería usar la gobernanza al revés.
4. **El servidor Hetzner está incomunicado** desde ~27-28 de agosto (red cortada por el
   proveedor; verificado hoy: `ssh` da timeout). Nada que dependa del runtime. Todo lo de este
   plan corre en local + CI, que es justo por qué se puede hacer ahora.
5. **No dupliques doctrina.** Los nueve documentos de `businessos/gobernanza/` se quedan donde
   están; la capa nueva **apunta** a ellos.
6. **El gate no puede nacer rojo** ni nacer siempre-verde. Si un bloque portado no aplica a
   Hermes, se recorta y se registra — no se deja fallando "para arreglarlo luego".
7. **Espacio de identificadores propio** para el corpus (`HT-01`…). El del template rompería
   27 archivos versionados.
8. **Las cifras se escriben después de medirlas**, nunca antes.
9. Español en todo el material nuevo, como el resto del repo.

---

## RED DE SEGURIDAD

Si una fase no converge en **~15 turnos**, **detente y reporta el bloqueo** sin pasar a la
siguiente: un plan por fases cuyo orden se rompe deja de ser el plan aprobado. Si un hallazgo
contradice lo medido en el plan, **actualiza el plan** y dilo — el propio documento lo pide en
su cierre.
