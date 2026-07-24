# Metodología: 5S + ESOA en detalle

Dos metodologías, dos capas, un orden. **5S** ordena y estandariza la **capa de
información/artefactos**; **ESOA** rediseña la **capa de flujo del proceso**. Se
usan combinadas: 5S prepara el terreno para que la automatización de ESOA sea
posible y barata.

Regla mental de todo el departamento: la mejora más barata es *no hacer* el
trabajo (eliminar), luego *hacer menos* (simplificar), luego *hacer mejor*
(optimizar) y solo al final *que lo haga un agente* (automatizar). Y no se
automatiza sobre caos: primero 5S.

---

## Parte A — 5S (capa de información y artefactos)

5S es una disciplina lean de orden y estandarización. Aquí se aplica a lo que
un agente necesita para operar: datos, documentos, ubicaciones, nombres,
formatos. Un proceso puede verse ordenado y aun así tener su información hecha
un caos — y el caos es lo que hace cara y frágil la automatización.

Evalúa las cinco S sobre el proceso. Cada una produce un hallazgo (o "n/a" con
razón). El gate `cinco_s_aplicado` verifica que estén las cinco.

1. **Seiri — Clasificar (separar lo necesario de lo innecesario).**
   ¿Qué datos, documentos, campos o reportes del proceso realmente se usan?
   Quita lo que nadie consume. Señal: campos que se llenan "por si acaso",
   reportes que nadie abre, copias duplicadas. Alimenta el "Eliminar" de ESOA.

2. **Seiton — Ordenar (un lugar para cada cosa).**
   ¿La información vive en un lugar predecible y con nombre estándar, o hay que
   "buscarla" cada vez (correos, carpetas personales, hojas sueltas)? Los
   agentes necesitan ubicaciones y nombres estables. Señal: "está en el correo
   de alguien", nombres inconsistentes, datos regados entre sistemas.

3. **Seiso — Limpiar (calidad del dato en el origen).**
   ¿Los datos llegan limpios y consistentes, o hay que corregirlos a mano cada
   vez? Un agente que recibe basura produce basura. Señal: retrabajo por datos
   malos, formatos mezclados, duplicados, campos vacíos que deberían venir.

4. **Seiketsu — Estandarizar (formatos y reglas consistentes).** ← el puente.
   Entradas y salidas con formato estándar, reglas explícitas para los casos
   frecuentes. **Esto es lo que hace barata y confiable la automatización A2A**:
   un agente sobre entradas estandarizadas es simple; sobre entradas caóticas es
   caro y falla. Si un paso no está estandarizado, estandarízalo antes de
   automatizarlo.

5. **Shitsuke — Disciplina (sostener el estándar).**
   ¿Qué sostiene que el orden no se degrade? En este sistema la disciplina no es
   voluntad humana: son los **gates deterministas del Supervisor**, el **control
   humano** y el **monitoreo**. Al diseñar el to-be, nombra qué sostiene cada
   estándar (una validación, un gate, una alerta).

---

## Parte B — ESOA (capa de flujo del proceso)

Se recorre **en orden**; cada lente asume resuelta la anterior. El error más
caro es saltar directo a "Automatizar": se automatiza trabajo que no debería
existir y se vuelve permanente el desperdicio. El gate `esoa_completo` exige que
cada paso as-is tenga un veredicto y su justificación.

### 1. Eliminar — ¿este paso debería existir?
Pregunta de control: *¿qué pasa si dejamos de hacerlo?* Muchos pasos existen por
inercia, para un contexto que cambió o un riesgo hoy asumible, o alimentan un
reporte que ya nadie lee. Eliminar es la mejora más barata. Cuidado: si un paso
mitiga un riesgo real, nómbralo y decide explícitamente si es asumible; no
elimines un control por no entenderlo.

Señales de candidato a eliminar: nadie sabe por qué se hace; produce algo que
nadie consume o que se rehace después; es un control redundante; existe para
compensar un error de un paso anterior que conviene arreglar en el origen.

### 2. Simplificar — si tiene que existir, ¿puede ser más simple sin perder su
propósito?
Pregunta de control: *¿cuál es la versión mínima que aún cumple el objetivo?*
Reduce antes de optimizar. Palancas: menos entradas, menos handoffs (cada
cambio de manos es espera y riesgo), menos excepciones (estandariza el 98 %,
trata el 2 % aparte), menos aprobaciones que solo agregan demora, formato
estándar. Un paso simple es mucho más barato de automatizar.

### 3. Optimizar — ¿cómo se hace mejor dentro de lo que debe ser?
Pregunta de control: *dado que existe y ya es lo más simple posible, ¿cómo lo
hacemos más rápido/barato/con menos error?* Solo aquí se mejora la ejecución, y
solo sobre pasos que pasaron las dos lentes anteriores. Palancas: reordenar para
reducir esperas o paralelizar, plantillas/checklists/valores por defecto, reglas
claras para casos frecuentes, métricas (si no se mide, no se sabe si mejoró).

### 4. Automatizar — ¿qué puede hacer aquí la IA / los agentes?
Pregunta de control: *de lo que queda, ¿qué ejecuta un agente y dónde queda el
humano supervisando?* Es el último paso. Para cada paso a automatizar define:

- **Tipo de trabajo:** clasificar/extraer/redactar/decidir-con-reglas suele ser
  buen candidato; juicio ambiguo de alto riesgo necesita humano en el bucle.
- **Qué agente** lo hace (nómbralo por función).
- **Con qué se coordina (A2A):** si su salida alimenta a otro agente, define el
  handoff.
- **Integraciones/datos:** APIs, bases, documentos, sistemas. Aquí vive buena
  parte del costo real y de los CLIs a imprimir.
- **Punto de control humano:** todo diseño A2A lo necesita; nómbralo. El humano
  deja de ejecutar, no de supervisar. El gate
  `control_humano_por_automatizacion` lo exige.
- **Manejo de error:** qué pasa cuando el agente no está seguro (escala,
  reintenta, se detiene).

**Niveles de complejidad** (impactan el alcance/costeo):
- **Baja:** un paso, entradas estructuradas, 0–1 integración simple, reglas
  claras.
- **Media:** varios pasos o 2–3 integraciones, algo de lógica condicional,
  coordinación entre ~2 agentes, revisión humana en puntos definidos.
- **Alta:** múltiples agentes coordinados, muchas integraciones o sistemas
  legados, datos poco estructurados, alto riesgo/regulación, mucho manejo de
  excepciones.

---

## Parte C — Cómo se entrelazan en el diagnóstico

Orden operativo por paso del proceso:

```
mapear el paso as-is
  → 5S de su información (¿datos clasificados, ordenados, limpios,
     estandarizados? ¿qué sostiene el estándar?)
  → ESOA del paso (Eliminar? Simplificar? Optimizar? y solo entonces Automatizar)
  → si se automatiza: diseño A2A + control humano + complejidad
```

- **Seiri (Clasificar) refuerza Eliminar:** lo que 5S marca como innecesario en
  la información, ESOA suele poder eliminarlo del flujo.
- **Seiton + Seiso + Seiketsu son precondición de Automatizar:** un paso no está
  listo para un agente hasta que su información está ordenada, limpia y
  estandarizada. Si falta, el to-be incluye "estandarizar antes de automatizar"
  como sub-tarea (a menudo un ítem propio en la build-spec).
- **Shitsuke se vuelve harness:** cada estándar del to-be nombra su sostén
  (gate del Supervisor, validación, alerta, control humano).

## Parte D — Reglas de operación (cómo razonas los pasos)

Refinan cómo aplicas ESOA; van de la mano de las lentes.

- **Cuestiona la secuencialidad.** La mayoría de los procesos son secuenciales
  por hábito, no por necesidad. Antes de aceptar que el paso B espera a A,
  pregúntate: *¿B realmente necesita que A esté completo?* Muchos pasos se pueden
  paralelizar; esa es una optimización que a veces vale más que automatizar.

- **El actor correcto en cada paso.** Al llegar a "Automatizar", reparte el
  trabajo por quién lo hace mejor, no por quién lo hace hoy:
  - *La IA/los agentes hacen bien:* consolidar información, detectar
    inconsistencias, monitorear, ejecutar tareas repetitivas con criterio
    definido.
  - *El humano hace bien:* criterio contextual, excepciones imprevistas,
    relaciones, decisiones con implicaciones éticas.
  El punto de control humano se diseña justo donde el juicio humano aporta.

- **Rediseña con el stack disponible.** No propongas herramientas que el cliente
  no tiene sin justificarlo. Si usa **Microsoft 365**, propón con Copilot y Power
  Automate; si usa **Google Workspace**, con Gemini y Apps Script; si propones
  algo fuera de su stack, **hazlo con justificación explícita**. (Esto se
  formaliza en la `build-spec` y lo verifica el gate `herramientas_en_stack`;
  ver `disparadores-sdd-skills-cli.md`.)

- **El orden es sagrado.** No hay rediseño sin diagnóstico; no hay diagnóstico
  sin datos (línea base). No mezcles fases ni saltes etapas, y no avances a la
  siguiente sin confirmación explícita del usuario.

- **No valides sin evidencia.** Si algo es ineficiente, dilo — con datos. Si algo
  funciona bien, también dilo, con datos. No validas un proceso deficiente por
  cortesía.

## Errores frecuentes

- **Saltar a automatizar** (el más caro): recorre 5S y las cuatro lentes en
  orden.
- **Automatizar sobre caos:** sin Seiketsu, la automatización es cara y frágil.
- **Eliminar controles sin entenderlos:** nombra el riesgo antes de decidir.
- **Prometer "cero humanos":** poco creíble; diseña el punto de control.
- **Cotizar sin mapear:** sin as-is, el número es adivinanza.
