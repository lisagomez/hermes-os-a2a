---
name: orquestar-agentes
description: Modelo de trabajo para REPARTIR un build complejo entre varios agentes (orquestador = el modelo del loop, hoy Opus 5 → ejecutor de riesgo Opus 5, con Fable 5 solo para lo dificil ABIERTO de diseño/razonamiento → ejecutores baratos Sonnet 5/Haiku 4.5; techo de esfuerzo xhigh para modelos frontera, nunca max), con verificacion antes de integrar y debate adversarial antes de decisiones irreversibles. Es una skill de COMPORTAMIENTO del orquestador, no de un dominio. Usar cuando el usuario diga: orquesta esto, reparte el trabajo, usa los agentes, coordina subagentes, monta el plan multiagente, esto es un build grande/delicado, quien hace que, esto a Opus o a Sonnet, debate esta decision, verifica antes de integrar, paraleliza esto, divide en subtareas. Triggers: orquestar, orquestacion, subagentes, multiagente, reparte, paraleliza, fan-out, debate adversarial, blast radius, quien lo hace, Opus o Sonnet, verifica antes de integrar, plan por fases. NO USAR para: tareas simples (hazlas inline — ver el Filtro maestro), crear o editar skills (skill-creator), memoria persistente del proyecto (memory-manager), meta-memoria cross-proyecto (factory-brain). Es DISTINTO de esas: aqui se decide COMO descomponer y delegar trabajo entre modelos.
---

# Orquestar agentes — modelo de trabajo para builds complejos

> Patron: **orquestador (L0) → ejecutor de riesgo (L1) → ejecutores mecanicos (L2)**, con verificacion
> antes de integrar y debate adversarial antes de cerrar decisiones irreversibles.
> Esta skill se **cita bajo demanda**: el agente la lee con Read y la aplica al build en curso.
>
> **Variante Fable:** cuando el modelo del loop principal es Fable (no Opus), lee ADEMÁS de esta el DELTA
> `.claude/skills/orquestar-agentes-fable/SKILL.md`. Desde 2026-07-26 ya NO duplica las §0–§8
> (esa copia se desincronizó y era el bug): esta skill sigue siendo la doctrina completa, y el delta solo
> cambia quién dirige (Fable L0), quién ataca (Opus 5 como sub-director adversarial fijo), que el debate
> pasa a ser política por defecto, y el techo de esfuerzo.

---

## 0. Filtro maestro — ¿orquestar o no? (LÉELO PRIMERO)

Antes de montar nada: **¿el coste de orquestar (escribir briefs, lanzar subagentes, paneles, debate) es
menor que el coste del error que evita (o que el contexto que ahorra)?** Si no, **NO orquestes — hazlo inline.**

- La mayoria de un build (UI, CRUD, endpoints estandar, refactors locales) **no es delicado**: va inline
  o a un ejecutor barato, sin ceremonia.
- Orquestar tiene coste real (tokens + latencia + tu tiempo redactando briefs). Aplicar la jerarquia a
  *todo* convierte un build de 2h en uno de 5h y choca con el KPI (apps/semana) y con "esbelto en
  construccion" + la regla 80/20.
- **Regla:** orquesta solo la **fraccion delicada** del build (o la **fraccion pesada en contexto**, §3);
  el resto, directo.

---

## 1. Niveles

| Nivel | Quién | Para qué |
|---|---|---|
| **L0 · Orquestador** (el modelo de ESTE loop; por defecto Opus 5, que releva a Opus 4.8 desde 2026-07-24) | Dueño del PLAN GLOBAL por fases y de la **decisión final**. No ejecuta lo delicado: lo delega, lo verifica y lo integra. Mantiene y **persiste** el mapa de contexto. |
| **L1 · Ejecutor de riesgo** (**Opus 5** `high→xhigh`, incluido lo verdaderamente difícil **en código**: es #1 en código *mergeable*, FrontierCode 53.4% vs 46.3% de Fable [I] 2026-07-25. Fable 5 `low→med` queda para lo difícil **ABIERTO**: diseño sin dirección dada, razonamiento sin camino trazado — §6) | Lógica delicada, migraciones/RLS, integraciones, algoritmos portados, **contratos entre módulos**, cualquier cosa difícil de revertir. |
| **L2 · Ejecutores mecánicos** (Sonnet 5; Haiku 4.5 solo para lo determinista sin juicio) | UI Tailwind cableando contratos ya definidos, scaffolding, traducciones, lecturas/escaneos, refactors de una sola carpeta. |

---

## 2. Ruteo: por **blast radius**, no por "% de confianza"

Un agente **no mide bien su propia confianza** (sesgo de competencia → subdelega lo delicado). Enruta por
el **radio de impacto** del cambio, que sí es observable (blast radius contenido).

**CRITERIOS-DELICADOS** (si cumple **≥1** → sube de nivel: Opus 5 `high` para riesgo estándar, `xhigh` si además es difícil; Fable 5 solo si la dificultad es ABIERTA, no de código — tabla abajo):
- difícil de revertir
- toca **contratos entre módulos** o el **esquema de datos**
- seguridad / RLS / migración
- lógica con **side cases no obvios**
- requisitos ambiguos
- **no hay verificación automática disponible** (sin tests/tipos que atrapen el error)

**Va a Sonnet 5/Haiku 4.5** solo si los cumple **todos**: bien especificado · radio contenido a una carpeta/feature ·
verificable automáticamente (build/tsc/test) · error barato de revertir.

> ⚠️ **Si no hay verificación automática, el cambio NO es de bajo riesgo por defecto.** En proyectos nuevos
> sin suite de tests, sube de nivel o define tú la verificación *antes* de delegar.
> **Ante la duda, sube de nivel:** es barato ahora, carísimo después.

**Tabla de ruteo canónica** (ejemplos; scores y precios: FrontierCode v1 + Artificial Analysis, 2026-07-01):

| Tarea típica | Ruta | Por qué |
|---|---|---|
| git push, renombrar, formatear, extraer texto | Haiku 4.5 `low` | Determinista, sin juicio; el más rápido y barato ($1/$5 MTok) |
| UI cableando contratos definidos, scaffolding, traducciones | Sonnet 5 `low→med` | Bien especificado y verificable; sweet spot score/$ |
| Lectura pesada → destilado (repo, docs, screenshots) | Sonnet 5 `med` | En input manda el precio por token: $3/M vs $10/M de Fable |
| L1 estándar: migración/RLS verificable, integración acotada | Opus 5 `high` | Flagship de cuota desde 2026-07-24, mismo precio que 4.8 ($5/$25) |
| L1 difícil EN CÓDIGO: algoritmo portado, side cases, contrato multi-módulo, refactor grande | Opus 5 `xhigh` | #1 en código *mergeable*: FrontierCode 53.4% vs 46.3% de Fable, 38.8% de Sonnet [I] |
| Lo difícil y ABIERTO: elegir la dirección de diseño, pieza insignia de escritura, razonamiento sin camino trazado | Fable 5 `low→xhigh` (subagente) | Lidera todas las tablas medidas de escritura y empata arriba en razonamiento; el "feel" no viaja por brief |
| Plan / arquitectura / síntesis final | L0 | El error de plan es el más caro del build; nunca Haiku ni `low` |
| Debate adversarial | Sonnet 5 / Haiku 4.5 con lente escrito; Opus 5 `high→xhigh` solo si el plan es caro de revertir. NUNCA Fable | La diversidad se compra barata: el lente pesa mas que el modelo (recuadro "quien ataca" en §7) |

> Antes de rutear a un modelo, aplica el **Eje 0** (§6): si el paso es SCRIPT puro (determinista, corre
> como comando), no se rutea a ningún modelo — cero costo LLM.

---

## 3. Delegar a subagentes — **arrancan EN FRÍO**

Un subagente **no ve esta conversación, ni el plan, ni las decisiones previas.** Sub-especificar la tarea
es la **causa #1 de fallo** en orquestación. Cada brief delegado debe ser **autocontenido**:

1. **Objetivo** concreto + criterio de "hecho".
2. **Contexto necesario**: rutas, contratos, decisiones ya tomadas (no asumas que las sabe).
3. **Contrato de salida**: qué devuelve y en qué forma, para integrarlo sin adivinar.
4. **Fronteras**: qué archivos/áreas puede tocar y cuáles **NO**.

> **Proporcionalidad (no sobre-procesar):** si redactar el brief perfecto cuesta más que hacer la tarea,
> hazla tú inline con esfuerzo bajo. El brief riguroso es para lo que de verdad se delega.
>
> **Persistencia del contexto:** el PLAN GLOBAL y las decisiones cerradas **se persisten en un artefacto**
> (PRP / memoria / handoff), no solo en el hilo — una compactación lo evaporaría a mitad de build. Cada fase
> se **reancla** leyendo ese artefacto. Formato concreto del artefacto de progreso (handoff reanudable + cadencia): **§8**.

> **El subagente NO hereda tu memoria ni tus reglas.** Arranca con el `CLAUDE.md`/`MEMORY.md` de SU cwd: si lo
> lanzas en un proyecto hijo, carga la memoria de ESE proyecto. Toda regla, decisión o dato que necesite va
> **explícito en el brief**; no asumas que lo ve.
>
> **Delegar también preserva TU contexto.** Una lectura pesada (muchos archivos, un repo entero, un tour de
> screenshots) que solo necesitas como conclusión: mándala a un subagente y que devuelva el **destilado, no el
> volcado**. Él quema su ventana leyendo; tú recibes 5 líneas. Vale **aunque la tarea no sea delicada** (§2): es
> la otra razón para delegar, además del riesgo.
>
> **Economía ASIMÉTRICA de la comunicación** (hub-and-spoke: los subagentes **no se hablan entre sí**; todo
> pasa por el orquestador). El ahorro de tokens va en **una sola dirección**:
> - **Brief de ida (orquestador → subagente): completo > corto.** NO lo comprimas para ahorrar tokens —
>   sub-especificar es la **causa #1 de fallo**. Los tokens del brief son la inversión más barata del build.
> - **Retorno de vuelta (subagente → orquestador, y al reportar al usuario): apretado y estructurado.** Solo el
>   entregable en el formato del contrato (§3.3), sin preámbulo ni narración. Aquí **SÍ** se minimiza. Pídelo en
>   el brief: *"devuelve solo X en forma Y, sin relleno"*.
> - **La razón económica: la salida cuesta ~5x la entrada** (toda la familia Claude). Para apretar un retorno
>   sin truncarlo, pide FORMATO estructurado (tabla/lista con campos fijos), nunca un tope de palabras: el
>   formato comprime sin perder ítems; el tope trunca evidencia.

### 3.5 El que PLANEA fija dificultad y modelo: el plan/PRP/kickoff también arranca EN FRÍO

El arranque en frío de §3 no es solo de subagentes: pasa en cada **salto de ventana**. Quien escribe un
plan/PRP/kickoff en modo plan lo hace con **todo el contexto y, normalmente, el modelo de frontera**; quien
lo ejecuta abre una ventana NUEVA y puede ser un modelo más barato SIN ese contexto, o uno que no vio el hilo
del que planeó. **La dificultad de cada unidad la conoce el que planeó y se pierde en el salto si no la
escribe.** Por eso el que planea **estampa, por unidad ejecutable, con qué ejecutarla**: es transferir el
ruteo de §2 hacia adelante para que el ejecutor no lo improvise.

Cada unidad ejecutable (tarea de plan, PRP, kickoff) lleva:

```
Dificultad: <Mecánica | Estándar | Delicada-frontera>   (por los CRITERIOS-DELICADOS de §2)
Ejecutar con: <modelo> <esfuerzo>                        (el ruteo de §2, decidido con contexto completo)
Por qué: <1 línea: qué la hace fácil o difícil y qué cuidar al ejecutarla>
Auto-check: al arrancar, declara tu modelo; si es más débil que el recomendado, AVISA al usuario antes de proceder.
```

- **Por qué** viaja el RIESGO, no solo la capacidad: "usa Opus" sin motivo es frágil; "delicado: toca el
  grafo, verifica recíprocas antes de integrar" sobrevive al frío.
- **Auto-check** es el candado: convierte la recomendación pasiva en checkpoint activo (mismo patrón que "si
  eres Fable, debate con Opus"). El plan **no puede forzar** el modelo (lo elige el usuario al abrir la
  ventana), pero sí obliga al ejecutor a declarar que va con menos de lo pedido.
- **Proporcionalidad (§0):** el sello es para unidades que corren en OTRA ventana o se delegan. Una tarea
  inline corta no lo necesita (sería ceremonia).

---

## 4. Paralelización segura + **orden topológico**

- Particiona por **archivo o por feature/carpeta**: una feature = un agente. **Ningún agente toca el archivo de otro.**
- "Archivos disjuntos" **≠** "tareas independientes". Si B consume el contrato que produce A, **no van en paralelo**
  aunque toquen archivos distintos.
- **Orden:** primero los **contratos/interfaces** que otras tareas consumen (secuencial) → luego las
  **implementaciones** que dependen de ellos (paralelo).
- La mayoría de los builds tienen un **núcleo secuencial irreductible** (schema, types, router); solo las **hojas** paralelizan.
- Un cambio que cruza varios archivos es **un solo agente** o necesita un **contrato explícito** entre ellos.
- **Aislamiento duro:** cuando varios agentes mutan archivos a la vez, da a cada uno su **git worktree**
  (`isolation: worktree` en el Agent/Workflow tool) y reconcilia por merge al final.
- **Recurso compartido NO paralelizable:** si los agentes comparten un único recurso vivo (p. ej. **una sola
  pestaña de navegador autenticada**, un puerto, una BD de dev), van **en serie** — no hay worktree para eso.

---

## 5. Verificación antes de integrar + **circuit breaker**

- **Nada se integra sin verificar.** Lo automáticamente verificable: `build` / `tsc` / `test`.
- Lo que **pasa el build y aun así puede estar mal** (contratos, RLS, side cases): el orquestador **revisa el
  *cómo* y el rationale, no solo el resultado** (o lo manda al debate adversarial, §7).
- **El paquete de quien verifica incluye el diff real.** Quien revise (orquestador, subagente verificador o
  el adversario del debate §7) recibe el diff de los cambios generado por comando como paso SCRIPT (§6, Eje 0):
  `git diff --stat` + el diff acotado a los archivos del scope. Es **efímero** (no se guarda como artefacto) y
  es la **excepción deliberada** a "destila, no vuelques" (§3): evidencia primaria que **nunca se resume con
  IA** — un diff resumido ya no es evidencia.
- **El error SILENCIOSO: lo que ninguna de las viñetas de arriba caza (2026-07-26).** Todo lo anterior verifica
  el ARTEFACTO y asume que un error FALLA. Existe una clase entera que no falla: el build pasa, los tests están
  verdes, la UI se ve bien, el diff es correcto, y aun así el resultado está mal. Los casos recurrentes: una
  suite verde sobre un cambio aplicado a medias; un test verde cuyo fixture no toca el artefacto real ("panel
  verde, territorio vacío"); una extracción que devuelve 16 ítems de una lista de 77 y se presenta como
  completa; y afirmar el significado de un dato ajeno (respuesta de una API, artefacto que no se abrió) sin
  verificarlo. **Ninguno habría fallado una verificación de "¿esto funciona?".**
- **Consecuencia práctica de ruteo: el QA genérico al final es el peor precio-calidad**, porque verifica justo
  lo que ya pasaba. Lo que paga es un verificador BARATO y ACOTADO, con **la pregunta escrita**, puesto donde el
  error sería silencioso:
  | Momento | La pregunta exacta que se le da | Modelo |
  |---|---|---|
  | Tras una EXTRACCIÓN de una lista/corpus | *"La fuente tiene N ítems. ¿Cuántos salieron y cuáles faltan? ¿El reporte declara ese número o lo esconde?"* | Haiku 4.5 |
  | Al AFIRMAR qué es o qué significa algo ajeno (dato de una API, artefacto que no abriste) | *"Verifica esta afirmación contra la fuente y devuelve la evidencia. Si no puedes, dilo."* | Haiku 4.5 |
  | Antes de OCULTAR, filtrar o resumir un dato de cara al usuario | *"¿Este dato es insumo de una decisión que el usuario sí toma?"* | Haiku 4.5 |
  | Al cerrar una superficie de UI | Lente ortogonal + estado COMPUTADO (`getComputedStyle`/screenshot, nunca solo `classList`) | Sonnet 5 (necesita juicio sobre capturas) |
- **Regla de dedo para no caer en ceremonia:** el verificador vale cuando el error sería SILENCIOSO. Si el error
  haría fallar algo, ya lo caza correr el código, y pagar un agente para eso es gasto muerto. Y lo que lo hace
  útil NO es que exista, sino que su **lente sea ORTOGONAL** a la del que construyó.
- **Si falla:** vuelve al ejecutor **con el error concreto**. **Máx. 2 reintentos** por subtarea; al 3.º el
  orquestador la asume con esfuerzo alto o **escala al usuario** describiendo el bloqueo. (Sin tope = bucle que quema tokens.)
- **Idempotencia:** cada subtarea debe poder re-ejecutarse sobre su propio resultado parcial sin duplicar
  efectos; si no, el orquestador limpia el estado antes de reintentar.

---

## 6. Escalada — **ejes ortogonales** (no una rampa)

No confundir "pensar más" con "cambiar de herramienta". Son palancas distintas:

- **Eje 0 — ¿necesita LLM siquiera?** En tareas de ≥3 pasos, etiqueta cada paso del plan como **LLM** o
  **SCRIPT** y agrupa los SCRIPT consecutivos en un solo script: un paso SCRIPT (build, diff, mv, codegen
  por plantilla) corre como comando y **no consume ninguna llamada de modelo**. Delimitación: SCRIPT =
  determinista puro, sin juicio alguno · Haiku 4.5 `low` = trivial pero aún requiere leer/juzgar algo ·
  Workflow (Eje B) = determinista a escala orquestando agentes. (El umbral de ≥3 pasos evita la ceremonia
  en tareas menores — §0.)
- **Eje A — esfuerzo de razonamiento** (mismo modelo): `low → medium → high → xhigh → max`.
  Piso por defecto **medium**; se sube **bajo demanda**, no por defecto (alto en todo es caro y lento sin razón).
  - **La escalera NO es monótona, y "modelo barato a esfuerzo alto" NO es más barato por tarea.** Datos
    (FrontierCode v1 + Artificial Analysis, 2026-07-01): `max` rinde igual o **peor** que `xhigh` (Fable 5:
    44.7% vs 46.3% · Opus 4.8: 31.3% vs 34.3%) costando 40-60% más — por eso el techo de los modelos
    frontera es `xhigh` (§7). **Ese dato es de Opus 4.8 y sigue siendo cierto; lo que cambió es la
    conclusión para CÓDIGO: con Opus 5 (53.4% en código mergeable vs 46.3% de Fable) el difícil de código
    ya no va a Fable, va a Opus 5.** Y por TAREA, Fable 5 `med` (41.1% @ ~$6) **dominaba** a Opus 4.8 `xhigh`
    (34.3% @ ~$6.5) y a Sonnet 5 `xhigh` (34.0% @ ~$7): en tareas difíciles densas en razonamiento, bajar
    el esfuerzo del modelo frontera gana a subir el esfuerzo del barato. **Excepción — trabajo pesado en
    input** (leer repos, muchos archivos): ahí manda el precio por token (Sonnet 5 $3/M vs Fable $10/M) y
    la ruta sigue siendo Sonnet 5/Haiku 4.5 + destilado (§3).
  - **Modelo (piso por defecto):** Sonnet 5 para el trabajo de campo (investigar, destilar, escribir, scripts,
    escanear UIs), subiendo su **esfuerzo** por complejidad. **Opus 5 `high→xhigh`** para riesgo estándar y
    para lo difícil en CÓDIGO;
    **Fable 5 `low→med`** para lo verdaderamente difícil (tabla de §2). Contexto: 1M es ESTÁNDAR en
    Sonnet 5, Opus (4.8 y 5) y Fable 5 (Haiku 4.5: 200K); para contexto gigante con tarea simple gana Sonnet 5
    (entrada más barata, $3/M vs $5/M). No sobre-limites a un solo modelo: **un mal resultado cuesta más
    que los tokens extra.**
- **Eje B — herramienta**: `un agente → panel → Workflow`.
  - **Panel:** varias pasadas + **síntesis** (el lift viene de la síntesis).
    ⚠️ Son N subagentes **en frío** → cada uno necesita su brief (§3). Si son el mismo modelo con el mismo brief,
    **no son "independientes"**: es el mismo modelo N veces. Diversidad real = variar el **ángulo del brief** o el **modelo**.
    **1 verificador a esfuerzo `xhigh` suele bastar**; reserva el panel de 2-3 para decisiones caras de revertir.
  - **Workflow:** cuando el trabajo es **repetitivo/determinista a escala** (p. ej. 40 archivos a migrar).
    Puede ser la opción correcta **desde el inicio** — NO el último escalón tras agotar el razonamiento.

> ### ⚠️ Harnesses prehechos NO rutean modelos solos
> Un **harness enlatado** (el `Workflow` tool, o cualquier script/skill que genere sus propios agentes)
> **NO lee esta skill** y por defecto **hereda el modelo del loop principal** en TODOS sus subagentes.
> Lanzarlo desde una sesión frontera (Fable/Opus) manda a Fable/Opus a hacer **carpintería** (buscar en web,
> leer, extraer) — el bug exacto que el ruteo por complejidad (§2) prohíbe.
>
> **Regla dura antes de lanzar CUALQUIER harness prehecho:**
> 1. **Lee su script** y verifica el ruteo de modelos por agente.
> 2. Si el fan-out es **mecánico** (search/fetch/extract/verify), el lanzamiento solo es válido con los agentes
>    **fijados a Sonnet 5 / Haiku 4.5** explícitos (`model` + `effort` por agente). Edita el script si no lo trae.
> 3. Si no puedes fijar modelos por agente, **baja el modelo de la sesión** a Sonnet antes de lanzar, o no lances.
>
> **Cuándo SÍ entra un modelo frontera (Fable/Opus) a un fan-out** — nunca por volumen; solo bajo condición:
> - **(a) nodo de juicio**: el plan, la síntesis final, el juez adversarial (§2, §7).
> - **(b) los baratos fallaron** tras el circuit breaker (§5, 2 reintentos).
> - **(c) reincidencia del mismo error** → el frontera no reintenta la tarea: **audita QUÉ pasó y mejora la
>   orquestación misma** (el system prompt, el brief, el ruteo).

> **Regla de desempate calidad/costo:** la calidad va primero; el costo se optimiza solo donde NO compra
> calidad real. Sí: mismo resultado más barato (paso SCRIPT, L2 para lo mecánico, Fable `med` en vez de
> Opus `xhigh` en lo difícil). No: sacrificar calidad en lo delicado por ahorro, ni pagar saltos de costo
> desproporcionados por mejoras marginales (caso `max`: +60% de costo por menos score).

---

## 7. Debate adversarial — gatillo y protocolo **(anti-teatro)**

**Gatillo:** solo decisiones **genuinamente irreversibles** (esquema de datos en producción, contratos
públicos, arquitectura estructural, side cases no triviales). **NO** para "¿context o props?". Si trabajas
solo y rápido, debatir lo trivial **paraliza** — reserva esto para lo que de verdad no se puede deshacer.

**Protocolo (blindado contra complacencia y confirmación):**
1. Al adversario se le da **la decisión** y la **orden de destruirla** (red team) — **NO** se le da tu
   rationale a favor (lo racionalizaría). **Qué modelo: ver el recuadro "quién ataca" abajo.**
2. Devuelve: **vectores de ataque** concretos / side cases · **alternativas** con tradeoffs · **fallo más
   probable** · **veredicto**.
3. El orquestador **responde a CADA objeción por escrito**: `refutada` / `aceptada` / `mitigada`.
   No puede ignorarla en silencio.
4. **Una sola ronda**, salvo que el debate revele algo nuevo de peso.
5. El orquestador **reconcilia, decide y deja constancia del porqué** (qué adoptó, qué descartó y por qué).

> ### Quién ataca: la diversidad se compra BARATA (2026-07-26)
>
> El valor del atacante **no viene de su potencia bruta**, viene de tres cosas estructurales que son
> gratis: no recibe tu rationale (no puede racionalizarlo), es read-only (no puede "arreglar" lo que
> audita, por eso su veredicto sirve), y lleva **una pregunta escrita** en vez de un "revisa esto".
> Entre atacantes, la ganancia por MODELO es marginal y la ganancia por LENTE es grande. Por eso el
> gasto va en escribir la pregunta, no en el modelo que la responde.
>
> | Situación | Atacante | Por qué |
> |---|---|---|
> | Plan barato de revertir (el caso común) | **Sonnet 5 + Haiku 4.5**, dos lentes distintos | Diversidad real de modelo por una fracción del costo |
> | Plan caro de revertir (esquema, contratos públicos, arquitectura) | **Opus 5** `high→xhigh` | Aquí sí paga la capacidad; nunca `max` |
> | El director es Fable | **Opus 5** | Ver la variante `orquestar-agentes-fable` |
> | **Fable como atacante** | **NUNCA** | Pagas ~2x por paridad de razonamiento, con TTFT ~128s, el doble de error en salida estructurada, y clasificadores que lo reemplazan en silencio (puede que ni sea Fable el que atacó) |
> | El mismo modelo contra sí mismo | Solo si el plan es barato de revertir | Mismos puntos ciegos; la independencia viene del lente, no del peso |
>
> **Restricción operativa que decide esto:** desde una sesión de Claude Code solo se puede rutear un
> subagente a `opus` / `sonnet` / `haiku` / `fable`, y `opus` resuelve al Opus vigente (hoy Opus 5).
> **Opus 4.8 NO es seleccionable como subagente** aunque siga existiendo por API: no lo cites como
> escape hatch.

> **Techo de esfuerzo (cost cap):** en esta fábrica, **ni Opus ni Fable escalan a `max`** — su techo es
> `xhigh`, tanto en el debate como ejecutando riesgo L1 (§1). No es solo costo: en el benchmark `max` rinde
> **igual o peor** que `xhigh`. Dato de la generación anterior, conservado con su etiqueta (Opus 4.8:
> 31.3% vs 34.3% · Fable 5: 44.7% vs 46.3%), costando 40-60% más. **Reconfirmado con Opus 5** (API oficial
> de Artificial Analysis, [I] 2026-07-25): su `high` ya saca el mejor GPQA de toda la escalera (93.7%,
> empatado con `xhigh`) a 10.1s de TTFT, mientras `max` tarda 28.7s y en GPQA **baja** a 93.2%. Pagar más
> por menos no es una opción.

---

## 8. Handoff y checkpoint — artefacto de progreso reanudable

El artefacto de §3 tiene **forma concreta** para que un agente fresco retome sin preguntar nada (habilita
matar el agente al ~50% de contexto y reanudar limpio). **El archivo es para durabilidad y reanudación, NO
un bus de chat entre agentes:** la coordinación viva es hub-and-spoke por el orquestador (§3) o el `Workflow`
tool para paralelo. Un `.md` como canal en tiempo real es mito; como memoria de handoff es oro.

**Dónde:** un `PROGRESS.md` en la raíz del trabajo (o junto al PRP). Uno por build/feature.

**Plantilla mínima:**
```markdown
# PROGRESS — <build>   (branch: <x> | últ. checkpoint: <ISO>)
## Objetivo / contexto
- <1-2 líneas + ruta al PRP/spec si existe>
## En curso
- [ ] <tarea>  (@<agente>, IN_PROGRESS <ISO>)
  - Last checkpoint: <qué quedó hecho dentro de la tarea>
  - Next action: <paso exacto siguiente: archivo + acción>
## Completado
- [x] <tarea>  (@<agente>, <ISO>, commit <hash>)
## Decisiones (append-only)
- <ISO> <decisión> : por qué : <agente>
```

**Cadencia: por hitos, NO continua ni solo-al-final** (continua satura, solo-al-final pierde reanudabilidad):

| Momento | Qué escribe el agente |
|---|---|
| Toma la tarea | `IN_PROGRESS <ISO>` + `@agente` (claim) |
| Cierra un sub-paso | actualiza `Last checkpoint` |
| Cierra una FASE | resumen ≤5 bullets en `Last checkpoint` (hecho, pendiente, bloqueos, siguiente acción); NO regenera el handoff completo — la plantilla ya es el handoff |
| Se bloquea | `BLOCKED: <razón>` + `Blocked by: <tarea>` |
| Decide algo no trivial | agrega línea a Decisiones (append-only, no edita pasadas) |
| Termina | `[x]` + commit/PR, mueve a Completado, libera el claim |
| Tarea larga (>15 min) | heartbeat: refresca `últ. checkpoint` con timestamp |

> **Reanudar (agente fresco):** leer `PROGRESS.md` → ir a **En curso** → ejecutar **Next action**. Las dos
> líneas `Last checkpoint` + `Next action` son las que hacen el handoff sin contexto previo.
>
> **Proporcionalidad:** esto es para builds que cruzan fases/sesiones o se reparten. Una tarea inline corta
> NO necesita `PROGRESS.md` — sería ceremonia (coherente con el Filtro maestro §0).

---

## 9. Cómo se invoca / referencia (en este repo)

- **Desde la raíz del repo**: se auto-descubre como skill nativa por su `description` cuando
  lanzas Claude desde ahí (igual que las demás skills de la fábrica).
- **Desde la raíz del repo o un proyecto hijo:** di al agente *"lee y aplica
  `.claude/skills/orquestar-agentes/SKILL.md`"*. La carga con **Read** y la sigue.
- **En subagentes:** como arrancan en frío (§3), si quieres que un subagente aplique este modelo, **pégale las
  §0–§5 en el brief** o dile que lea este archivo por su ruta; no asumas que lo conoce.

> **Origen:** adaptado del modelo de orquestación de OPS (repo de origen; ruta local, no versionada aquí).
> Las §0–§8 son model-agnósticas y portables; aquí se ajustó solo la sección de invocación a la fábrica.
> **Ajuste 2026-07-01:** techo de esfuerzo `xhigh` (nunca `max`) para modelos frontera, generaciones fijadas
> (Sonnet 5 / Opus 4.8 / Haiku 4.5 / Fable 5), ruteo por frontera de Pareto (L1 difícil → subagente Fable 5
> `low→med`) y tabla de ruteo canónica en §2 — datos: FrontierCode v1 + Artificial Analysis.
> Registro completo de decisiones con los datos: `.claude/skills/orquestar-agentes-fable/README.md`.
