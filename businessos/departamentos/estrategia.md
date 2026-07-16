# Departamento: Estrategia (decisiones caras, no construcción)

> A diferencia de los otros departamentos, **Estrategia no construye ni ejecuta**: **asesora
> decisiones**. Su instrumento es el skill **`consejo`** (`.claude/skills/consejo/SKILL.md`) —
> un Consejo de 5 asesores con lentes que chocan, peer-review anónimo y síntesis de un Chairman
> (metodología LLM Council de Karpathy, reimplementada nativa para la fábrica).
>
> No tiene Ejecutor/Supervisor (no es un departamento del trío de Fase 6). El Consejo **produce
> un veredicto; el humano decide y aprueba** según la matriz de `equipo-y-slack.md`.

---

## 0. Dónde corre (lección de Printing Press / cli-audit)

El skill `consejo` usa **subagentes** (`Task`/`Agent`) y ruteo de modelos → **corre SOLO en
Claude Code** (el cerebro de la fábrica), **nunca dentro de Hermes** (el runtime de Slack/Telegram
no despacha subagentes ni rutea modelos así, y el secret-scrubbing no aplica: aquí no hay
credenciales en juego, solo juicio). Igual que Printing Press y el auditor de CLIs: es una
capacidad de la máquina de desarrollo, no un departamento autónomo 24/7.

Consecuencia: al Consejo lo convoca **una persona del equipo desde Claude Code** (o pidiéndolo en
un canal cuyo operador sea Claude Code), no el bot de Slack. El bot puede *sugerir* "esto amerita
Consejo", pero no lo corre.

---

## 1. Cuándo convocar (filtro maestro — el gate más importante)

El Consejo cuesta ~11 llamadas a subagentes. **Solo cuando equivocarse es caro.** Es para
**decisiones abiertas de negocio/estrategia** con varias opciones y sin respuesta única.

| Sí es Consejo | No es Consejo |
|---|---|
| "¿Lanzo web2 primero o web3?" (alcance del producto) | "¿Cuál es la capital de X?" (dato) |
| "¿Este pricing del deck aguanta?" | "Escríbeme el copy" (creación) |
| "¿Pivoto de A a B?" / "¿acepto este contrato grande?" | "¿Uso markdown?" (sin tradeoff) |
| "¿Qué posición de marca pega más?" | Decisión trivial y reversible |

**No confundir con red-team:** si ya hay un **plan técnico formulado** que quieres destruir antes
de construir, esa es la vía adversarial (1 atacante), no el Consejo (divergencia, N ángulos).

---

## 2. Los 5 asesores y el método (resumen; detalle en el skill)

Cinco **lentes que chocan a propósito**: **Contrarian** (qué falla), **Primeros Principios**
(¿la pregunta correcta?), **Expansionista** (el upside oculto), **Forastero** (ojos frescos, caza
la maldición del conocimiento), **Ejecutor** (¿qué hago el lunes?). Impar → rompe empates.

Flujo (6 pasos, en el skill): enmarcar con **contexto real del workspace** (CLAUDE.md, memoria,
leads/revenue si aplica) → 5 asesores en paralelo → peer-review anónimo (A–E) → síntesis del
Chairman (coincidencias / choques sin suavizar / punto ciego / recomendación sin "depende" / primer
paso único) → veredicto en el chat → **devolver el aprendizaje** a memoria.

### Ruteo de modelos (disciplina §2 del skill; alineada a los aprendizajes de CLAUDE.md)

| Rol | Modelo / esfuerzo |
|---|---|
| 5 asesores + 5 revisores | Sonnet 5 `med` (diversidad por ángulo, tarea acotada) |
| Chairman (síntesis = nodo de juicio) | **Opus 4.8 / Fable `high`** — nunca bajar a Sonnet |
| Decisión de máxima apuesta | subir asesores a Opus 4.8 `high`. **Nunca `max`** |

---

## 3. Alineación con la matriz de aprobación (equipo-y-slack.md)

El Consejo **asesora; no decide ni aprueba**. Quién es dueño de la decisión y quién aprueba sigue
igual (`equipo-y-slack.md §b`):

| Decisión que el Consejo puede asesorar | Dueño / aprobador (no cambia) |
|---|---|
| Alcance de producto, posición de marca, pivote | **CEO** (config/dirección) |
| Pricing, mover dinero, apuestas grandes | **CFO** (+ CEO en política) |
| Envío a cliente (propuesta, contrato) | **PM** (o CEO) |
| Firmar | **solo humano** |

> Regla dura: "las compuertas las sostiene el juicio humano en el canal, no la configuración."
> El Consejo es un **amplificador de juicio**, no un aprobador. Su veredicto entra al canal como
> insumo; la persona con autoridad decide.

Canal sugerido cuando exista: `#dep-estrategia` (o el CEO/PM lo usa desde Claude Code y pega el
veredicto en `#dep-negocio`/`#dep-clientes`). Hoy no requiere canal propio: se invoca en Claude Code.

---

## 4. Fuentes de conocimiento (para que el enmarcado sea específico, no genérico)

El Paso 1A del skill escanea el workspace. En este repo las fuentes útiles son:
- `CLAUDE.md` (negocio, restricciones, golden path, aprendizajes).
- `.claude/memory/MEMORY.md` + memory files relevantes (decisiones/fases pasadas, leads, presupuesto).
- `businessos/ROADMAP.md`, `businessos/departamentos/*.md`, `BUSINESS_LOGIC.md` si aplica.
- Los artefactos que la persona referencie (specs, propuestas, el deck).

**Nota de fit:** el skill menciona `orquestar-agentes` y un `factory-brain` global (metodología V5)
que **no existen como tales en este repo**. Aquí el sustituto es directo: el **Paso 6 usa
`memory-manager`** (existe) para registrar la decisión + veredicto en la memoria del proyecto; la
disciplina de ruteo vive en los **aprendizajes de CLAUDE.md**; la memoria de proyecto hace de
cerebro. El skill corre igual: su motor son los subagentes `Task`, que sí existen.

---

## 5. Frontera del departamento

- **Asesora, no ejecuta.** No toca código, no manda a clientes, no mueve dinero, no firma.
- **No se auto-convoca en producción.** Corre en Claude Code a pedido de una persona.
- **No sustituye la aprobación humana.** Su salida es un veredicto para decidir mejor, no una orden.
- **Registra el aprendizaje** (con OK) para que la próxima decisión nazca más lista.

Relacionado: `equipo-y-slack.md` (matriz), `SPEC-trio.md` (por qué esto NO es un departamento del
trío), `.claude/skills/consejo/SKILL.md` (el método completo).
