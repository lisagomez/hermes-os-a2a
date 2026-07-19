# Aprendizajes verificados: teoría de juegos y la oficina de agentes

> Contraste del ensayo `teoria-de-juegos-y-oficina-de-agentes.md` (conversación Johann + Fable,
> 18-jul-2026) contra fuente primaria. 4 investigaciones independientes (jul-2026), verificadas
> con `WebSearch`/`WebFetch`. Sigue el estándar de citación del equipo: dato etiquetado, fuente
> con URL, matiz cuando la fuente no cierra el punto.

## 1. Veredictos sobre las afirmaciones del ensayo

| Afirmación del ensayo | Veredicto | Nota |
|---|---|---|
| Von Neumann: fundó teoría de juegos (1944), arquitectura del computador, autómatas autorreplicantes | VERIFICADA | Las tres son suyas. Matiz: el nombre "arquitectura von Neumann" es disputado (no acreditó a Eckert/Mauchly). |
| Gamificación (gramática visual) ≠ teoría de juegos (matemática de incentivos) | VERIFICADA | Distinción estándar; confundirlas es error común señalado en la literatura. |
| Diseño de mecanismos = "¿qué reglas hacen que el juego produzca lo que quiero?" | VERIFICADA | "Reverse game theory". Hurwicz/Maskin/Myerson, Nobel 2007. |
| Adversario deliberado dentro de sistema cooperativo (tribunal / peer review / sistema inmune) | MATIZADA | Tribunal y peer review: bien respaldados. Sistema inmune: analogía floja (es detección de patrones, no competencia estratégica). Respaldo formal real: adversarial collaboration (Kahneman) y red teaming. |
| "La confianza autoreportada de un agente es cheap talk" | VERIFICADA | Crawford-Sobel 1982: bajo desalineación de incentivos, el mensaje sin costo se degrada a "babbling". |
| "El diff real es señal costosa, el resumen es cheap talk" | VERIFICADA | Coherente con Spence (señal creíble = costosa de falsificar). |
| Goodhart: "cuando la métrica se vuelve objetivo, deja de medir" | VERIFICADA con matiz | Frase de Marilyn Strathern (1997), NO de Goodhart (1975). Citar como "Goodhart, popularizada por Strathern". |
| "Reward hacking de LLMs = ley de Goodhart con GPUs" | VERIFICADA | Vínculo explícito en la literatura de alignment (Amodei 2016; Weng 2024; Anthropic 2024). |
| Deming: "un mal sistema derrota a una buena persona" / ~95% es del sistema | MATIZADA | La frase es de notas de seminario (no libro). La cifra publicada es **94%** (*Out of the Crisis*, 1982), no 95%. |
| Carse: juegos finitos vs infinitos (1986) | VERIFICADA | Popularizado por Sinek (2019). |
| Huizinga: "el juego es más viejo que la cultura" (*Homo Ludens*, 1938) | VERIFICADA | Cita y tesis reales. |
| Ender / abstracción que anestesia | VERIFICADA | Marco real: moral disengagement (Bandura), moral distance en operadores de dron. |
| "El mapa no es el territorio" (Korzybski) | VERIFICADA | Paper de 1931, base de la semántica general. |
| "Por primera vez la metáfora empresa-como-RTS deja de ser metáfora" | REFUTADA como novedad, MATIZADA en sustancia | Ver §3. Ya es lugar común 2025-26 (producto AgentCraft, ensayo Hoang, Deloitte). Lo válido es la causal técnica, no la originalidad. |

## 2. Utilidades para el producto: HUD que refleja estado real, no decora

El riesgo mejor documentado (2026) es directo para la oficina pixel: **un HUD bonito puede mostrar
verde mientras el agente falla en silencio** (Coasty.ai: solo ~15% de cómo decidió el agente es
visible en observabilidad típica). La landing como tráiler está bien; el peligro es que el operador
confunda la vista con el estado. Patrones para evitarlo:

1. **Estado por unidad, no agregado global.** Cada agente-sprite muestra SU estado (idle/trabajando/
   bloqueado/error) en el frame, como la barra de vida de una unidad RTS. Un "todo OK" global es el
   dashboard verde falso.
2. **Niebla de guerra sobre la confianza, no solo sobre el mapa.** Tareas donde el sistema NO tiene
   visibilidad real (ej. tool call externa sin traza) se pintan "sin explorar", nunca como verificadas.
3. **Feedback ligado al evento de traza real.** La animación de "trabajando" se dispara con un evento
   verdadero (tool call, token stream), no con un timer cosmético. Si el agente se cuelga, la animación
   se congela y sigue siendo diagnóstica (coherente con la calibración ya validada del proyecto:
   "estado legible en frame congelado").
4. **Minimapa = resumen con drill-down**, no adorno: cada ícono resuelve al log real de ESE agente.
5. **Costo de fallo visible y barato de leer.** Un agente que falla lo muestra al instante (color/ícono),
   no se agrega a un contador al final. Evita el teatro de métricas.

## 3. Sobre citar la metáfora RTS en material público

Si se usa la idea "empresa como videojuego / agente como unidad" en la landing o en ventas, citarla
como parte de una conversación en marcha, no como insight sin precedente:

- **AgentCraft** (Ido Salomon, 2026): producto real que orquesta agentes con interfaz RTS literal.
- **David Hoang**, ensayo en proofofconcept.pub (2025-26): analogía RTS a gestión de agentes.
- **Deloitte TMT 2026**: mercado de agentes ~US$8.5B (2026); ~40% de proyectos agénticos se cancelan
  para 2027 por complejidad de escalado; solo 28% de líderes con capacidades maduras.

## 4. Pendientes de citación antes de publicar (estándar del equipo)

- "Legibility" como término formal de game design: no se pudo cerrar contra fuente primaria (Salen &
  Zimmerman). EXPLORATORIA. Resolver antes de citar en público.
- Cifra de Gartner (">60% de proyectos de IA se estancan por monitoreo insuficiente"): cita de segunda
  mano, no confirmada en el reporte original. MATIZADA.
- Handicap principle (Zahavi): la teoría de señales costosas en biología está en disputa activa; si se
  usa la analogía del pavo real, saber que no es consenso cerrado.

---

> Aprendizajes de nivel OPS (guardas de diseño para sistemas multi-agente) viven en
> `C:\OPS\.claude\docs\teoria-de-juegos-para-software-y-agentes.md`.
