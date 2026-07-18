---
name: orquestar-agentes-fable
description: Variante de orquestar-agentes donde el ORQUESTADOR es Fable (el modelo de mayor razonamiento/contexto de la fabrica) y Opus 4.8 actua como SUB-DIRECTOR adversarial fijo. Mantiene intacto el modelo L0-L2 (ruteo por blast radius, briefs en frio, verificacion antes de integrar, handoff PROGRESS.md) y agrega una politica de debate POR DEFECTO: Fable propone, Opus 4.8 ataca, antes de aprobar CUALQUIER plan que vaya a ejecutarse (no solo decisiones irreversibles) y ante cualquier error grave detectado en ejecucion. Techo de costo: ni Fable ni Opus escalan a max (tope xhigh) y el ataque se gradua por el riesgo del plan. Usar cuando Fable es el modelo del loop principal y va a orquestar/aprobar un plan: audita este plan, Fable dirige, debate con Opus, sub-director, variante fable, plan bajo ataque, aprueba antes de ejecutar. NO USAR para: tareas simples inline (Filtro maestro de la skill original), ni como reemplazo de orquestar-agentes cuando el orquestador es Opus.
---

# Orquestar agentes — modelo de trabajo para builds complejos

> Patron: **orquestador (L0) → ejecutor de riesgo (L1) → ejecutores mecanicos (L2)**, con verificacion
> antes de integrar y debate adversarial antes de cerrar decisiones irreversibles.
> Esta skill se **cita bajo demanda**: el agente la lee con Read y la aplica al build en curso.
>
> **Esta es la variante FABLE** de `orquestar-agentes` (la original queda intacta en
> `saas-factory/.claude/skills/orquestar-agentes/SKILL.md`). Las §0–§8 son idénticas a la original;
> la **§10** define qué cambia cuando el orquestador es **Fable** y no Opus.

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
| **L0 · Orquestador** (Opus 4.8, este loop) | Dueño del PLAN GLOBAL por fases y de la **decisión final**. No ejecuta lo delicado: lo delega, lo verifica y lo integra. Mantiene y **persiste** el mapa de contexto. |
| **L1 · Ejecutor de riesgo** (Opus 4.8 `high→xhigh`; lo verdaderamente difícil → subagente Fable 5 `low→med`, mejor score/$ por tarea — §6) | Lógica delicada, migraciones/RLS, integraciones, algoritmos portados, **contratos entre módulos**, cualquier cosa difícil de revertir. |
| **L2 · Ejecutores mecánicos** (Sonnet 5; Haiku 4.5 solo para lo determinista sin juicio) | UI Tailwind cableando contratos ya definidos, scaffolding, traducciones, lecturas/escaneos, refactors de una sola carpeta. |

---

## 2. Ruteo: por **blast radius**, no por "% de confianza"

Un agente **no mide bien su propia confianza** (sesgo de competencia → subdelega lo delicado). Enruta por
el **radio de impacto** del cambio, que sí es observable (blast radius contenido).

**CRITERIOS-DELICADOS** (si cumple **≥1** → sube de nivel: Opus 4.8 `high` para riesgo estándar, o subagente Fable 5 `low→med` si es de los verdaderamente difíciles — tabla abajo):
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
| L1 estándar: migración/RLS verificable, integración acotada | Opus 4.8 `high` | Frontera score/$ del riesgo estándar (~30% @ ~$4/tarea) |
| L1 difícil: algoritmo portado, side cases, contrato multi-módulo | Fable 5 `low→med` (subagente) | Domina por tarea: 41% @ ~$6 vs 34% @ ~$7 de Opus/Sonnet `xhigh` |
| Lo más difícil (clase Diamond: diseño delicado, bug imposible) | Fable 5 `high→xhigh` | En las tareas más duras, Fable ≥`med` dobla al mejor Opus |
| Plan / arquitectura / síntesis final | L0 | El error de plan es el más caro del build; nunca Haiku ni `low` |
| Debate adversarial | Opus 4.8 `high→xhigh` | Diversidad de modelo frente al que propone |

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
ruteo de §2 hacia adelante para que el ejecutor no lo improvise. (Cuando el orquestador es Fable, el ataque
adversarial de §10 aplica además al PLAN antes de estampar; el sello viaja igual con el kickoff.)

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
    frontera es `xhigh` (§7). Y por TAREA, Fable 5 `med` (41.1% @ ~$6) **domina** a Opus 4.8 `xhigh`
    (34.3% @ ~$6.5) y a Sonnet 5 `xhigh` (34.0% @ ~$7): en tareas difíciles densas en razonamiento, bajar
    el esfuerzo del modelo frontera gana a subir el esfuerzo del barato. **Excepción — trabajo pesado en
    input** (leer repos, muchos archivos): ahí manda el precio por token (Sonnet 5 $3/M vs Fable $10/M) y
    la ruta sigue siendo Sonnet 5/Haiku 4.5 + destilado (§3).
  - **Modelo (piso por defecto):** Sonnet 5 para el trabajo de campo (investigar, destilar, escribir, scripts,
    escanear UIs), subiendo su **esfuerzo** por complejidad. **Opus 4.8 `high`** para riesgo estándar;
    **Fable 5 `low→med`** para lo verdaderamente difícil (tabla de §2). Contexto: 1M es ESTÁNDAR en
    Sonnet 5, Opus 4.8 y Fable 5 (Haiku 4.5: 200K); para contexto gigante con tarea simple gana Sonnet 5
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
> Como en esta variante el director ES Fable, lanzarlo manda a **Fable** a hacer **carpintería** (buscar en
> web, leer, extraer) — el bug exacto que el ruteo por complejidad (§2) prohíbe.
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
   rationale a favor (lo racionalizaría). Modelo: Opus 4.8, esfuerzo `high→xhigh` según lo que esté en
   juego (nunca `max` — ver §10.5).
2. Devuelve: **vectores de ataque** concretos / side cases · **alternativas** con tradeoffs · **fallo más
   probable** · **veredicto**.
3. El orquestador **responde a CADA objeción por escrito**: `refutada` / `aceptada` / `mitigada`.
   No puede ignorarla en silencio.
4. **Una sola ronda**, salvo que el debate revele algo nuevo de peso.
5. El orquestador **reconcilia, decide y deja constancia del porqué** (qué adoptó, qué descartó y por qué).

> **Nota de esta variante:** cuando el orquestador es **Fable**, el gatillo de esta sección se **endurece**
> — ver §10: el debate deja de ser solo-para-irreversibles y pasa a ser **política por defecto** antes de
> aprobar cualquier plan ejecutable.

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

## 9. Cómo se invoca / referencia (en esta fábrica)

- **Desde `saas-factory/`** (raíz de la app): se auto-descubre como skill nativa por su `description` cuando
  lanzas Claude desde ahí (igual que las demás skills de la fábrica).
- **Desde la raíz del repo o un proyecto hijo:** di al agente *"lee y aplica
  `saas-factory/.claude/skills/orquestar-agentes-fable/SKILL.md`"*. La carga con **Read** y la sigue.
- **En subagentes:** como arrancan en frío (§3), si quieres que un subagente aplique este modelo, **pégale las
  §0–§5 en el brief** o dile que lea este archivo por su ruta; no asumas que lo conoce.

---

## 10. Variante FABLE — Director Fable + Sub-director Opus 4.8 **(lo nuevo de esta skill)**

> Aplica cuando **el modelo del loop principal es Fable** (el de mayor razonamiento y contexto disponible
> en la fábrica). Todo lo anterior (§0–§8) sigue vigente sin cambios; esta sección redefine **quién orquesta,
> quién debate y cuándo es obligatorio debatir**. No reemplaza el modelo general: lo especializa.

### 10.1 Roles

| Rol | Quién | Qué hace |
|---|---|---|
| **Director / Orquestador** | **Fable** (este loop) | Dueño del plan global y de la **decisión final** — el rol L0 de §1, con un matiz: sus capacidades son grandes y **caras**, así que su tiempo se invierte en **síntesis y juicio**, no en exploración repetitiva. Fable formula, reconcilia y decide; **no relee material pesado** que un subagente puede destilar. |
| **Sub-director / Contraparte de debate** | **Opus 4.8** (subagente) | El adversario **fijo** del protocolo §7. Antes el debate era Opus-contra-Opus (o Fable como juez externo); aquí **Fable propone y Opus 4.8 ataca directamente, uno a uno**. Opus también puede seguir actuando como **L1 ejecutor de riesgo** (§1) — son dos sombreros distintos del mismo modelo. |
| L2 ejecutores | Sonnet 5 / Haiku 4.5 | Igual que §1 — sin cambios. |

> **L1 difícil → subagente Fable 5 `low→med`** (§1-§2): que el director no ejecute NO prohíbe lanzar OTRA
> instancia de Fable como subagente ejecutor para las tareas hoja verdaderamente difíciles — son procesos
> separados, el director sigue reservando SU contexto para síntesis, y el costo por tarea lo justifica (§6).

### 10.2 Gatillo — OBLIGATORIO, no opcional (endurece el §7)

El §7 original reserva el debate para decisiones irreversibles. En esta variante el debate es
**política por defecto** en DOS momentos:

1. **SIEMPRE antes de lanzar/aprobar un plan que vaya a ejecutarse.** Cualquier plan al que Fable esté a
   punto de dar luz verde — un plan de build, un plan de olas, un conjunto de recomendaciones que otros van
   a ejecutar — pasa por el ataque de Opus 4.8 **antes** de darse por bueno. No solo lo irreversible.
2. **En cualquier momento que se detecte un error grave durante la ejecución** — algo que, si sigue sin
   corregirse, compromete el resultado (un supuesto roto, una migración mal aplicada, un contrato violado).
   Se pausa, se debate el fix, se reconcilia, se continúa.

> El Filtro maestro (§0) sigue aplicando al **resto** de la ceremonia (briefs, paneles, workflows), pero
> **NO exime del debate del gatillo #1**: si hay un plan por aprobar, hay debate. La proporcionalidad se
> aplica **graduando el ataque, no eximiéndolo**:
> - **Plan simple** (pocas piezas, reversible, no toca datos ni contratos): Opus 4.8 esfuerzo `high`,
>   brief corto, retorno corto — un ataque rápido, no un informe.
> - **Plan delicado** (multi-fase, toca esquema/contratos, lanza varios subagentes, caro de revertir):
>   Opus 4.8 esfuerzo `xhigh`, ataque profundo con verificación contra los archivos reales.

### 10.3 Protocolo (mismo espíritu anti-teatro del §7, roles fijos)

1. **Fable formula la propuesta/plan** (completo, con supuestos y afirmaciones verificables explícitas).
2. **Fable delega a un subagente Opus 4.8** dándole **SOLO la propuesta** — **nunca el razonamiento a favor**
   de Fable (lo racionalizaría) — y la **orden explícita de destruirla**: vectores de ataque concretos,
   alternativas con tradeoffs, el fallo más probable, y un veredicto. Esfuerzo `high→xhigh`, graduado por
   el riesgo del plan (§10.2); nunca `max`.
3. **Fable responde por escrito a CADA objeción**: `refutada` / `aceptada` / `mitigada`.
   Ninguna se ignora en silencio.
4. **Fable reconcilia, decide y deja constancia** de qué adoptó, qué descartó y por qué.
5. **Una sola ronda**, salvo que el debate revele algo nuevo de peso (hereda §7.4).

### 10.4 Economía de costo/calidad — la asimetría de §3 aplicada a Fable

- **Fable NO relee ni reprocesa todo el material en cada ronda.** La exploración pesada — releer código y
  specs, buscar edge cases contra los archivos reales, verificar afirmaciones fácticas de la propuesta —
  **se delega a Opus dentro del propio brief de ataque**: el brief de ida lleva las rutas exactas y las
  afirmaciones a verificar; Opus quema SU ventana leyendo y devuelve el veredicto **apretado y estructurado**.
- **Fable retiene solo tres cosas:** el brief de entrada, la propuesta que formuló, y la síntesis de vuelta.
  Todo lo demás lo consume **destilado** (§3: "delegar preserva TU contexto").
- **Brief de ida completo > corto** (causa #1 de fallo sigue siendo sub-especificar); **retorno apretado**
  (formato fijo: por objeción → ataque + evidencia + severidad; luego alternativas, fallo más probable, veredicto).
- Si el ataque de Opus exige verificación empírica extra (correr un test, consultar la BD), **Opus la pide o
  la ejecuta él** — Fable no se convierte en el ejecutor del debate.

### 10.5 Techo de esfuerzo (cost cap) — ni Fable ni Opus usan `max`

Esta variante fija un **techo de esfuerzo por costo**: el nivel `max` de la escalera (§6) queda **reservado
y fuera de uso** tanto para Fable como para Opus dentro de este modelo de debate.

- **Opus** (atacante del debate §10.3, y también como L1 ejecutor de riesgo §1): escala su esfuerzo
  `alto → xhigh` según qué tan caro de revertir es el plan o la tarea que está atacando/ejecutando.
  `xhigh` es su techo — nunca `max`.
- **Fable** (director): **alterna** su propio esfuerzo de razonamiento (`medium → high → xhigh`) según la
  complejidad de la síntesis que esté haciendo en ese momento del build — no fija un único nivel para todo.
  Igual que Opus, su techo es `xhigh`; no escala a `max`.
- **Por qué:** `max` no solo es el nivel más caro de la escalera: en el benchmark rinde igual o **peor**
  que `xhigh` (Fable 5: 44.7% vs 46.3% · Opus 4.8: 31.3% vs 34.3%) costando 40-60% más — pagar más por
  menos. Además Opus corre como atacante en **cada** aprobación de plan (§10.2, gatillo obligatorio): sin
  techo y sin graduación, el mecanismo de debate se comería el ahorro que el Filtro maestro (§0) protege.

---

> **Origen:** adaptado del modelo de orquestación de OPS. Las §0–§8 son model-agnósticas y portables;
> la §10 (variante Fable) se creó el 2026-07-01 sobre la copia de la skill de la fábrica. La skill original
> (orquestador Opus) permanece intacta en `saas-factory/.claude/skills/orquestar-agentes/SKILL.md`.
> **Ajuste 2026-07-01 (§10.5):** techo de esfuerzo `max → xhigh` para Opus y Fable — no solo por costo:
> el benchmark muestra que `max` rinde igual o peor que `xhigh`. Segunda pasada el mismo día: generaciones
> fijadas (Sonnet 5 / Opus 4.8 / Haiku 4.5 / Fable 5), ruteo por frontera de Pareto (L1 difícil →
> subagente Fable 5 `low→med`), debate graduado por riesgo del plan (§10.2) y tabla de ruteo canónica
> en §2 — datos: FrontierCode v1 + Artificial Analysis.
