# Descubrimiento — preguntas, respuestas de ejemplo y criterio de activación

Estas son las preguntas que Hermes-Negocio le hace al cliente en el
descubrimiento. Son **abiertas**: no hay puntaje fijo. Su función es darle al
**orquestador** la evidencia para dos juicios: **(a) ¿este proyecto requiere el
departamento de Procesos?** y **(b) ¿de qué alcance?** (chico/mediano/grande).

Se integran al checklist de descubrimiento white-label (corriente "Análisis y
planeación", §2.3). No todas las preguntas aplican a todos los clientes; pide lo
que falte y agrupa, **máximo 5 preguntas a la vez** (regla del taller), para no
abrumar. No avances de fase sin confirmación explícita del usuario.

Cada pregunta trae: **por qué importa**, una **respuesta de ejemplo** (un cliente
ficticio, "Comercializadora del Norte", que hoy clasifica facturas de gasto a
mano) y **qué señala** esa respuesta para la decisión.

---

## Bloque A — ¿Hay un proceso vivo? (la pregunta que activa o descarta)

**A1. ¿Qué te gustaría resolver, y eso es algo que tu equipo YA hace hoy de
alguna forma, o es algo nuevo que aún no existe?**
- *Por qué importa:* es la pregunta raíz. Procesos rediseña lo que **ya opera**;
  si es 100 % nuevo (greenfield), se salta Procesos y va directo a Software.
- *Ejemplo:* "Ya lo hacemos: cada semana clasificamos como 300 facturas de
  proveedores para ver cuáles son deducibles y armar la contabilidad. Es a mano,
  en Excel."
- *Señala:* **proceso vivo → candidato fuerte a activar Procesos.**

**A2. Si mañana nadie hiciera esta tarea, ¿qué se rompería en el negocio?**
- *Por qué importa:* confirma que es un proceso con dueño y consecuencia (no un
  capricho puntual).
- *Ejemplo:* "Pagaríamos impuestos de más o el SAT nos rebotaría deducciones;
  además el cierre contable se atrasaría."
- *Señala:* proceso real con impacto → activar; además, **toca lo fiscal →
  consultar el grafo** en el diseño.

**A3. ¿Es un proceso que se repite (diario/semanal/mensual) o algo de una sola
vez?**
- *Por qué importa:* automatizar algo de una sola vez rara vez paga. La
  repetición es lo que da ROI.
- *Ejemplo:* "Semanal, todas las semanas, y a fin de mes se duplica."
- *Señala:* repetición alta → activar y probable alcance ≥ mediano.

---

## Bloque B — Forma del proceso (para estimar alcance)

**B1. Cuéntame los pasos, de principio a fin, tal como pasan hoy. ¿Quién hace
cada uno?**
- *Por qué importa:* el mapa as-is es la unidad de análisis; el número de pasos y
  handoffs pesa en el alcance.
- *Ejemplo:* "Llega el PDF por correo → alguien lo baja y captura en Excel →
  otra persona busca si el gasto es deducible → se marca → contabilidad lo
  concilia."
- *Señala:* 4–6 pasos, 2–3 personas → **alcance mediano**.

**B2. ¿Qué sistemas, apps, hojas o documentos se tocan, y cómo pasa la
información de un paso al siguiente?**
- *Por qué importa:* las integraciones son buena parte del costo y definen qué
  CLIs habrá que imprimir.
- *Ejemplo:* "Gmail, un Excel compartido, y al final el sistema contable
  (Contpaqi). Todo a copiar-pegar."
- *Señala:* 2–3 integraciones → mediano; "sistema legado sin API" → sube la
  complejidad hacia grande.

**B3. ¿Qué tan estandarizadas están las entradas? ¿Los datos llegan limpios y
en un formato parejo, o hay que estarlos corrigiendo?**
- *Por qué importa:* es la pregunta 5S. Datos caóticos = automatización cara;
  puede que el to-be tenga que **estandarizar antes de automatizar**.
- *Ejemplo:* "Cada proveedor manda el PDF distinto; a veces falta el RFC; hay
  que corregir bastante."
- *Señala:* baja estandarización → trabajo 5S real + complejidad media/alta.

**B4. ¿Con qué stack tecnológico trabajan? (Microsoft 365, Google Workspace,
otro.)**
- *Por qué importa:* el rediseño se hace **con el stack que el cliente ya tiene**;
  no se proponen herramientas nuevas sin justificarlo (regla del taller). Define
  qué se propone y qué CLIs imprimir.
- *Ejemplo:* "Todo en Microsoft 365, con Contpaqi para la contabilidad."
- *Señala:* M365 → Copilot/Power Automate; Google → Gemini/Apps Script; fuera del
  stack → exige justificación. Si es **desconocido, pregúntalo antes de proponer
  herramientas.**

---

## Bloque C — Volumen, dolor y valor (para ROI y prioridad)

**C1. ¿Cuántas veces se corre al mes y cuánto tiempo-humano consume cada vez?**
- *Por qué importa:* alimenta directo el ROI y el reparto humano-agente.
- *Ejemplo:* "≈300 facturas/semana, y entre captura y revisión son como 1.5
  horas por lote de 100."
- *Señala:* volumen alto → ROI atractivo; da los números para el presupuesto.

**C2. ¿Dónde están los cuellos de botella, los errores y los retrabajos? ¿Qué
cuestan cuando pasan?**
- *Por qué importa:* localiza qué eliminar/simplificar y cuantifica el dolor.
- *Ejemplo:* "Se nos cuelan facturas no deducibles y lo cachamos hasta el
  cierre; corregir cuesta un día de trabajo y a veces un recargo."
- *Señala:* dolor cuantificable → activar; refuerza el caso de negocio.

**C3. ¿Cómo se ve el éxito para ti? ¿Qué te gustaría que cambiara?**
- *Por qué importa:* fija el resultado que vende el proyecto (no las horas).
- *Ejemplo:* "Que las facturas se clasifiquen solas y solo revisar las dudosas."
- *Señala:* expectativa de automatización con supervisión → encaja con A2A +
  control humano.

---

## Bloque D — Restricciones y decisión (gates humanos, regulatorio)

**D1. ¿Hay restricciones? (regulación, seguridad, sistemas intocables,
presupuesto tope, fecha límite.)**
- *Por qué importa:* define gates humanos, si entra el grafo y el techo de
  alcance.
- *Ejemplo:* "Es info fiscal, no puede salir a cualquier nube; y hay tope de
  presupuesto este trimestre."
- *Señala:* dato sensible + tope → alcance acotado, control humano reforzado,
  **grafo obligatorio** en lo fiscal.

**D2. ¿En qué moneda quieres ver la propuesta y quién aprueba el gasto?**
- *Por qué importa:* MXN/USD para el presupuesto y quién es el decisor (gate
  humano de aprobación).
- *Ejemplo:* "En pesos, y lo apruebo yo con el contador."
- *Señala:* configura el `--tc`/moneda del script y el punto de aprobación.

---

## Criterio del orquestador (cómo se decide, sin puntaje)

Hermes-Negocio **juzga**, con la evidencia anterior, no con una fórmula. Guía:

**Señales que ACTIVAN el departamento de Procesos:**
- Hay un proceso que **ya opera** (A1) y **se repite** (A3) con consecuencia real
  (A2).
- Tiene **varios pasos/handoffs o sistemas** (B1/B2): hay flujo que rediseñar.
- Hay **dolor cuantificable** (C2) y/o **baja estandarización** (B3): hay materia
  para 5S + ESOA antes de automatizar.

**Señales que lo OMITEN (va directo a Software u otro depto):**
- Es **greenfield**: producto/feature nueva sin as-is que rediseñar (A1 = "es
  nuevo"). No hay proceso que diagnosticar.
- Es una **tarea de una sola vez** (A3) o de volumen trivial: no paga el
  diagnóstico.
- Es una **consulta puntual** (p. ej. "¿esto es deducible?"): eso es el **grafo**
  directo, no un rediseño de proceso.
- El cliente **solo quiere construir**, ya trae el proceso rediseñado y una spec:
  se salta Procesos y entra a SDD/Software con esa spec.

**Cómo estimar el alcance (chico/mediano/grande):**
- **Chico:** 1 proceso, 1–2 pasos a automatizar, complejidad baja, 0–1
  integración, datos ya bastante estandarizados.
- **Mediano:** 3–5 pasos, 2–3 integraciones, coordinación de ~2 agentes, algo de
  trabajo 5S de estandarización, revisión humana en puntos definidos.
- **Grande:** proceso complejo o varios, 4+ integraciones o sistemas legados,
  datos poco estructurados (mucho 5S), múltiples agentes, alto riesgo/regulación.

**Casos borde:**
- *Proceso vivo pero caótico y chico:* activa Procesos aunque sea alcance chico —
  el valor está en el 5S/ESOA, no en el tamaño.
- *Greenfield que en realidad reemplaza un proceso manual:* si hay un as-is
  detrás (aunque sea "lo hacemos en Excel"), **sí** activa Procesos: ese Excel es
  el proceso a rediseñar.
- *Toca lo fiscal/regulatorio:* active o no el rediseño, el diseño A2A **consulta
  el grafo** y cita fuente; Procesos nunca asesora fiscal por su cuenta.

La decisión y su porqué se registran en el hilo de descubrimiento
(`decision_id`, corriente Análisis y planeación) para trazabilidad.
