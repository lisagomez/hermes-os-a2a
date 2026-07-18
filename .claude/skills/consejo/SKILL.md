---
name: consejo
description: "Somete una DECISIÓN real a un Consejo de 5 asesores con lentes que chocan entre sí (Contrarian, Primeros Principios, Expansionista, Forastero, Ejecutor), peer-review anónimo y síntesis de un Chairman. Metodología LLM Council de Andrej Karpathy, reimplementada NATIVA para la fábrica (es-CO, memoria/factory-brain, ruteo de modelos). GATILLOS: 'consejo', 'pásalo por el consejo', 'convoca al consejo', 'somételo al consejo', 'council this', 'ask the council', 'sala de guerra', 'pressure-test esto', 'debate esto'. GATILLOS FUERTES (con una decisión real de por medio): '¿opción A o B?', '¿cuál elijo?', '¿qué harías?', '¿es la jugada correcta?', 'valida esto', 'no me decido', 'estoy entre X e Y'. NO activar en: preguntas sí/no, búsquedas de dato, tareas de creación ('escríbeme X'), ni cualquier 'debería' sin tradeoff real. SÍ activar cuando hay una decisión genuina, con opciones, stakes y contexto que pide presión desde varios ángulos."
argument-hint: "[la decisión o pregunta a someter al consejo]"
allowed-tools: Read, Grep, Glob, Task
---

# El Consejo — 5 asesores, peer-review, un veredicto

> Preguntas a UNA IA y te da UNA respuesta. Puede ser brillante o mediocre, y no tienes forma
> de saberlo porque solo viste una perspectiva. El Consejo lo arregla: corre tu decisión por 5
> asesores independientes con lentes que se contradicen, los hace revisarse entre sí en anónimo,
> y un Chairman sintetiza dónde coinciden, dónde chocan, qué punto ciego se les escapó a todos,
> y qué deberías hacer de verdad.
>
> **Origen:** metodología **LLM Council de Andrej Karpathy** (despachar a varios juicios, peer-review
> anónimo, un chairman sintetiza). Esta es una **reimplementación propia de la fábrica** — no una copia
> de ningún repo de terceros — que usa **subagentes de Claude con lentes distintas** en vez de modelos
> distintos (la diversidad viene del ÁNGULO del brief, que es diversidad real por §2 de `orquestar-agentes`).

---

## 0. Filtro maestro — ¿convocar al Consejo o no? (LÉELO PRIMERO)

El Consejo cuesta ~11 llamadas a subagentes. **Convócalo solo cuando equivocarse es caro.** Si es
una pregunta con una respuesta correcta, un dato, una tarea de creación, o una decisión trivial y
reversible → **respóndela directo, sin Consejo.**

| Buenas para el Consejo | Malas para el Consejo |
|---|---|
| "¿Lanzo un taller de $97 o un curso de $497?" | "¿Cuál es la capital de Francia?" (dato) |
| "¿Cuál de estas 3 posiciones de marca pega más?" | "Escríbeme un tweet" (creación) |
| "Estoy pensando pivotar de X a Y, ¿estoy loco?" | "Resume este artículo" (procesamiento) |
| "Este pricing del deck, ¿aguanta?" | "¿Uso markdown?" (sin tradeoff real) |

**Cuándo NO es Consejo sino `orquestar-agentes-fable`:** si lo que tienes es un **plan técnico ya
formulado** que quieres validar antes de construir ("destruye este plan"), esa es la vía adversarial
(1 atacante). El Consejo es para **decisiones abiertas de negocio/estrategia** con varias opciones y
sin respuesta única. No son redundantes: divergencia (Consejo) vs. red-team (adversarial).

---

## 1. Los cinco asesores (lentes que chocan a propósito)

No son cargos ni personas: son **estilos de pensamiento** que crean tensión entre sí.

1. **El Contrarian** — busca activamente qué está mal, qué falta, qué va a fallar. Asume que la idea
   tiene una falla fatal y trata de encontrarla. No es pesimista: es el amigo que te salva de un mal
   negocio haciéndote la pregunta que estás evitando.
2. **El de Primeros Principios** — ignora la pregunta de superficie y pregunta "¿qué estamos tratando
   de resolver de verdad?". Quita supuestos, reconstruye el problema desde cero. A veces su mayor
   aporte es "estás haciendo la pregunta equivocada".
3. **El Expansionista** — busca el upside que todos los demás no ven. ¿Qué podría ser más grande? ¿Qué
   oportunidad adyacente está escondida? No le importa el riesgo (ese es el trabajo del Contrarian); le
   importa qué pasa si esto funciona incluso mejor de lo esperado.
4. **El Forastero** — cero contexto sobre ti, tu campo o tu historia. Responde solo a lo que tiene
   enfrente. El más subestimado: los expertos desarrollan puntos ciegos, y el Forastero caza la
   maldición del conocimiento (lo obvio para ti que es confuso para todos los demás).
5. **El Ejecutor** — solo le importa una cosa: ¿esto se puede hacer, y cuál es el camino más rápido?
   Ignora teoría y estrategia. Mira todo con "OK, ¿pero qué hago el lunes por la mañana?". Si una idea
   suena brillante pero no tiene primer paso claro, lo dice.

**Por qué estos 5:** crean 3 tensiones naturales — Contrarian vs Expansionista (downside vs upside),
Primeros Principios vs Ejecutor (repensar todo vs solo hazlo), y el Forastero en el medio manteniendo
a todos honestos con ojos frescos. Número impar → rompe empates.

---

## 2. Ruteo de modelos (disciplina de la fábrica, §2 de orquestar-agentes)

| Rol | Modelo / esfuerzo | Por qué |
|---|---|---|
| 5 asesores (paralelo) | **Sonnet 5 `med`** | Generan una perspectiva con brief distinto = diversidad real; barato y suficiente |
| 5 revisores (paralelo) | **Sonnet 5 `med`** | Juzgan respuestas ya escritas; tarea acotada |
| Chairman (síntesis) | **Opus 4.8 / Fable `high`** | La síntesis es el NODO DE JUICIO — el error más caro; nunca lo bajes a Sonnet |

**Decisión de máxima apuesta** (pivote de la empresa, contrato grande): sube los 5 asesores a Opus 4.8
`high`. **Nunca `max`** (rinde igual o peor que `xhigh` costando 40-60% más). Si tienes el `Workflow`
tool, la forma limpia es un fan-out determinista (5 → barrera → 5 → barrera → 1) con los modelos
fijados por agente; si no, lanza subagentes en paralelo con el `Task`/`Agent` tool.

---

## 3. Cómo corre una sesión del Consejo

### Paso 1 — Enmarcar la pregunta (con enriquecimiento de contexto)

Cuando el usuario dispara ("consejo", "council this", etc.), ANTES de enmarcar haz dos cosas:

**A. Escanea el workspace por contexto** (máx 30s, con `Glob`/`Read`). La pregunta suele ser la punta
del iceberg; el contexto convierte consejos genéricos en específicos:
- `CLAUDE.md` del proyecto (contexto de negocio, restricciones, preferencias).
- `.claude/memory/MEMORY.md` + los memory files relevantes a la pregunta (ej. si es pricing, busca
  decisiones/leads/revenue pasados).
- El **cerebro global** (`factory-brain` / `~/.saas-factory/brain/`) si la decisión es cross-proyecto.
- `HANDOFF.md` / `PROGRESS.md` para no re-deliberar terreno ya decidido.
- Cualquier archivo que el usuario haya referenciado o adjuntado.

Busca los 2-3 archivos que le den a los asesores el contexto para ser específicos, no genéricos.

**B. Enmarca** la pregunta cruda + el contexto en un prompt NEUTRAL que reciben los 5 asesores. Incluye:
(1) la decisión central, (2) contexto clave del mensaje, (3) contexto clave del workspace (etapa del
negocio, audiencia, restricciones, números reales), (4) qué está en juego. **No metas tu opinión, no
la orientes** — pero asegúrate de que cada asesor tenga contexto para responder aterrizado. Si la
pregunta es demasiado vaga ("consejo: mi negocio"), haz **UNA** sola pregunta aclaratoria y sigue.
Guarda la pregunta enmarcada (viaja idéntica a los 5).

### Paso 2 — Convocar al Consejo (5 subagentes en PARALELO)

Lanza los 5 asesores simultáneamente. Cada uno recibe: (1) su identidad y estilo (de §1), (2) la
pregunta enmarcada, (3) la instrucción: *"responde independiente, NO cubras otros ángulos, NO seas
balanceado, inclínate del todo a tu lente; si ves una falla fatal, dila; si ves upside enorme, dilo.
La síntesis viene después. 150-300 palabras, sin preámbulo."*

### Paso 3 — Peer-review anónimo (5 subagentes en PARALELO) — el paso que lo hace más que "preguntar 5 veces"

Junta las 5 respuestas. **Anonimízalas** como Respuesta A–E (aleatoriza qué asesor es qué letra → sin
sesgo posicional). Lanza 5 revisores nuevos; cada uno ve las 5 respuestas anónimas y contesta 3
preguntas (<200 palabras, por letra): (1) ¿cuál es la más fuerte y por qué?; (2) ¿cuál tiene el mayor
punto ciego y cuál es?; (3) ¿qué se les escapó a TODAS que el Consejo debería considerar?

### Paso 4 — Síntesis del Chairman (1 subagente frontera, o tú como L0)

El Chairman recibe TODO: la pregunta, las 5 respuestas de-anonimizadas (ya sabes quién dijo qué) y los
5 peer-reviews. Produce el veredicto con ESTA estructura exacta:
- **Dónde coincide el Consejo** — puntos en que varios convergieron independiente = señales de alta confianza.
- **Dónde choca el Consejo** — desacuerdos genuinos; NO los suavices, presenta ambos lados y por qué
  asesores razonables difieren.
- **Puntos ciegos que cazó el Consejo** — lo que solo emergió en el peer-review.
- **La recomendación** — clara y accionable. NADA de "depende". Una respuesta real con su razón. El
  Chairman puede disentir de la mayoría si el razonamiento lo respalda.
- **Lo primero que hacer** — UN solo paso concreto. No una lista de 10.

### Paso 5 — Presentar el veredicto en el chat

Preséntalo directo en el chat en markdown (NO generes archivos ni HTML). Formato:

```
## Veredicto del Consejo: {tema corto}

### Dónde coincide el Consejo
### Dónde choca el Consejo
### Puntos ciegos que cazó el Consejo
### La recomendación
### Lo primero que hacer
```

### Paso 6 (nativo de la fábrica) — Devolver el aprendizaje

Si la decisión fue de peso y el usuario la toma:

1. **Registro estructurado (siempre que el usuario tome la decisión):** escribe el veredicto en
   `.claude/memory/decisiones/<decision_id>.md` con `decision_id = YYYY-MM-DD-slug` y estructura
   fija: pregunta sometida, dónde coincide el Consejo, dónde choca, puntos ciegos, recomendación,
   primer paso. Añade el evento al log append-only `businessos/trazas-decisiones.jsonl`:
   `{"decision_id": "...", "evento": "consejo", "ref": ".claude/memory/decisiones/<decision_id>.md", "fecha": "YYYY-MM-DD"}`.
   Ese `decision_id` es el hilo de trazabilidad decisión→PRP→tarea→gasto (ver
   `businessos/departamentos/analisis-planeacion.md`); el PRP que nazca de esta decisión lo
   referencia en su sección "Decisión del Consejo".
2. **Memoria narrativa (con OK del usuario):** ofrécele además registrar en **memoria del proyecto**
   (`memory-manager`) o en el **cerebro global** (`factory-brain`) la decisión + el veredicto + por qué,
   para que el próximo proyecto nazca más listo (coherente con el loop de compounding de V5). No lo hagas
   sin OK; solo ofrécelo cuando la decisión valga la pena recordar.

---

## Criterio de calidad

Un buen Consejo le da al usuario claridad que NO podía sacar de una sola perspectiva: coincidencias de
alta confianza, choques honestos sin suavizar, un punto ciego que ningún asesor solo vio, una
recomendación sin "depende", y un primer paso único. Si el veredicto pudo haber salido de preguntarle
a una sola IA, el Consejo falló — probablemente porque el enmarcado no cargó contexto real (Paso 1A) o
los asesores se balancearon en vez de inclinarse a su lente (Paso 2).
