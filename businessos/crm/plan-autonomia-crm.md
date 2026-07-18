# PLAN DE AUTONOMÍA PROGRESIVA — CRM AGÉNTICO
## La autonomía se gana con evidencia, por intención · Palancas: contexto, reglas, caso de uso y tono

Documento operativo derivado del blueprint CRM + anexo técnico (Maestro
v13). Define cómo el agente del CRM se vuelve cada vez más autónomo — sin
traicionar una sola regla de la casa. La tesis en una línea: LA AUTONOMÍA
NO SE OTORGA, SE GANA CON EVIDENCIA MEDIDA; SUBIR ES DECISIÓN HUMANA,
BAJAR ES REGLA AUTOMÁTICA.

═══════════════════════════════════════════════════════════════════
1. LA UNIDAD DE AUTONOMÍA: LA INTENCIÓN, NO EL AGENTE
═══════════════════════════════════════════════════════════════════

Preguntar "¿qué tan autónomo es el agente?" es la pregunta equivocada —
un agente excelente cotizando puede ser novato en devoluciones. La unidad
correcta ya existe en el anexo (C): la INTENCIÓN dentro de un caso de uso
de un tenant. Cada celda de esa matriz (intención × caso de uso × tenant)
tiene SU nivel de autonomía, SU evidencia y SU historial.

La matriz vive en R0 del grafo (versionada, auditable); el MOTOR DE TURNO
(anexo B, paso 4) la consulta en cada mensaje: el nivel de la intención
detectada decide si la respuesta sale directa, pasa por sup, o espera a
un humano. Ninguna intención puede operar por encima de su nivel — eso lo
garantiza el motor, no la buena voluntad.

═══════════════════════════════════════════════════════════════════
2. LA ESCALERA (niveles A0–A3, con techo estructural)
═══════════════════════════════════════════════════════════════════

A0 — SOMBRA: el agente redacta; TODO lo envía un humano (copiloto
     obligatorio). Aquí nacen las intenciones nuevas. Se mide todo:
     ¿cuánto editó el humano?, ¿qué editó?
A1 — SUPERVISADO: el agente envía, pero sup-crm valida CADA saliente
     antes de salir. El humano ya no teclea; el supervisor aún revisa
     todo.
A2 — MUESTREADO: el agente envía directo; sup-crm valida una MUESTRA
     (arranque 20%, baja con evidencia hasta piso de 5%) más el 100% de
     lo sensible. El estado natural de una intención madura.
A3 — AUTÓNOMO CON EXCEPCIONES: envío directo, muestreo de piso, y SOLO
     los disparadores duros escalan. Reservado a intenciones de lectura
     y trámite (estado de pedido, horario, agenda, acuse) con historial
     impecable.

EL TECHO ES ESTRUCTURAL Y NO SE ESCALA: dinero (reembolsos, excepciones
de precio), verbos irreversibles, campañas, categorías sensibles (legal,
salud, amenaza) y "quiero hablar con una persona" (EXC-C01) tienen nivel
humano PERMANENTE. No hay evidencia que los suba: el techo no es una
etapa del plan, es el plan. La autonomía crece HACIA los lados (más
intenciones cubiertas) y HACIA arriba dentro del techo — jamás a través
de él.

═══════════════════════════════════════════════════════════════════
3. PROMOCIÓN Y DEGRADACIÓN (la asimetría de la casa)
═══════════════════════════════════════════════════════════════════

SUBIR = EXPEDIENTE + BOTÓN HUMANO. Una intención es promovible cuando su
evidencia en R3 cumple TODO el criterio de su salto:

  A0→A1: ≥50 conversaciones · tasa de edición del copiloto <15% · cero
         hechos inventados · cero fugas de política
  A1→A2: ≥200 conversaciones · tasa de rechazo de sup <3% · resolución y
         CSAT estables o mejores que el humano en la misma intención
  A2→A3: ≥1,000 conversaciones · incidentes = 0 en 60 días · muestreo en
         piso sin hallazgos · solo intenciones de lectura/trámite

El sistema arma el EXPEDIENTE DE PROMOCIÓN solo (números, ejemplos,
comparativa) y lo presenta con botón — como toda compuerta: identidad,
caducidad, bitácora. La promoción sin expediente completo no puede
proponerse (constraint, no criterio).

BAJAR = REGLA AUTOMÁTICA, SIN JUNTA. Cualquiera de estos degrada la
intención UN nivel (o dos, si es grave) en el acto, con alerta:
· Un hecho inventado detectado (por muestreo, queja o auditoría)
· Fuga de política o de tono fuera del paquete de marca
· Tasa de rechazo de sup que se duplica en una semana
· Incidente de inyección que el agente no trató como dato
· CSAT de la intención cayendo bajo su línea base
La degradación no espera al review: protege primero, explica después
(misma lógica que apagar campañas). Recuperar el nivel exige recorrer la
evidencia de nuevo — no hay atajo de regreso.

═══════════════════════════════════════════════════════════════════
4. LAS CUATRO PALANCAS (qué alimenta la subida)
═══════════════════════════════════════════════════════════════════

La autonomía no crece por tiempo transcurrido: crece porque estas cuatro
fuentes mejoran, cada una con su ciclo de destilación PROPUESTA → BOTÓN →
ACTIVO VERSIONADO:

PALANCA 1 — CONTEXTO (menos "no sé", menos escalamiento):
Cada handoff y cada corrección enriquecen lo que el agente sabe ANTES de
responder: el perfil del contacto (dentro de la política de memoria del
anexo I), el subgrafo de negocio, y las instrucciones de regreso del
humano ("promesa registrada; da seguimiento el viernes") que quedan como
contexto estructurado del caso. Métrica: % de escalamientos cuya causa
fue "falta de contexto" — debe caer mes a mes; cuando no cae, el problema
es de datos, no del modelo.

PALANCA 2 — REGLAS (la decisión humana repetida se codifica):
El enjambre detecta PATRONES DE DECISIÓN HUMANA CONSISTENTE: si el humano
resolvió 20 veces igual el mismo dilema ("retraso <3 días + cliente
recurrente → cupón 10%"), eso es una regla esperando nacer. La propone
con la evidencia (los 20 casos), el humano la aprueba con botón, sup-crm
la aplica — y esa clase de caso deja de escalar. LA REGLA ES AUTONOMÍA
CODIFICADA: cada regla aprobada convierte juicio humano repetitivo en
política auditable, y reserva al humano para el dilema nuevo. Regla
nueva nace en A1 (sup valida su aplicación) y sube con su propia
evidencia.

PALANCA 3 — CASO DE USO (cobertura del catálogo):
El ciclo del anexo C a ritmo: el worker de temas detecta lo que el
público pregunta sin cobertura → intención propuesta con ejemplos reales
→ botón → nace en A0 → sube la escalera con su evidencia. Métrica: % de
mensajes entrantes con intención de catálogo (cobertura) — la autonomía
agregada del CRM es, en gran parte, cobertura × nivel promedio.

PALANCA 4 — TONO (el paquete de marca se calibra con las ediciones):
Las EDICIONES del copiloto son datos de oro: el diff entre lo que el
agente sugirió y lo que el humano envió, agregado por patrón (¿siempre le
quitan los emojis?, ¿siempre agregan el nombre?, ¿suavizan los "no"?).
Cuando un patrón de edición es consistente, se propone como ajuste al
paquete de marca (versionado, botón) — y la tasa de edición baja. Tono
maduro = copiloto que casi no se corrige = intención lista para A1.
LÍMITE INTACTO: el tono se calibra; los HECHOS siguen saliendo del CLI.
Ninguna palanca toca la anti-reimplementación.

═══════════════════════════════════════════════════════════════════
5. EL CICLO OPERATIVO (flywheel quincenal)
═══════════════════════════════════════════════════════════════════

CONTINUO: operar → medir en R3 (ediciones, rechazos, resoluciones,
incidentes) → destilar (el enjambre convierte correcciones en propuestas
de regla/tono/intención/contexto).
QUINCENAL — REVIEW DE AUTONOMÍA (30 minutos, con tablero):
· La MATRIZ completa: intención × nivel × evidencia × tendencia
· Expedientes de promoción listos → tus botones
· Propuestas destiladas (reglas, ajustes de tono, intenciones) → botones
· Degradaciones del periodo con su causa y su plan de recuperación
· Las métricas norte (sección 7)
El review es corto A PROPÓSITO: el sistema llega con los expedientes
armados; el humano decide, no investiga.

═══════════════════════════════════════════════════════════════════
6. GOBERNANZA (para que la autonomía no se vuelva deriva)
═══════════════════════════════════════════════════════════════════

· La matriz de autonomía es parte de la TARJETA extendida del agente
  (D-14): lo que exe-crm puede hacer por intención y nivel es tan
  auditable como sus CLIs. Cambiarla = botón humano, versionado.
· dep-aud suma un frente: (a) ninguna respuesta salió por encima del
  nivel de su intención (cruce bitácora vs matriz — deriva de autonomía
  es hallazgo CRÍTICO, como la deriva de permisos), (b) toda promoción
  tiene expediente completo, (c) toda degradación disparada se ejecutó,
  (d) el muestreo de A2/A3 se está haciendo al % declarado.
· Por TENANT: la matriz es del tenant (marca blanca); la evidencia de un
  tenant no promueve intenciones de otro — pero las intenciones GENÉRICAS
  de la casa (saludo, horario, acuse) acumulan evidencia cruzada y llegan
  al tenant nuevo ya maduras: el % de reuso (D-23) aplicado a la
  confianza.
· El techo estructural (sección 2) se verifica adversarialmente en cada
  auditoría: intentar que una intención de dinero opere sin humano debe
  fallar en el motor de turno.

═══════════════════════════════════════════════════════════════════
7. MÉTRICAS NORTE Y ECONOMÍA
═══════════════════════════════════════════════════════════════════

· AUTONOMÍA EFECTIVA: % de salientes sin toque humano, por intención y
  agregado (la curva que debe subir sin que suban los incidentes)
· Tasa de edición del copiloto (A0) y de rechazo de sup (A1) — los
  termómetros de madurez
· Incidentes por mil conversaciones (la curva que NO puede subir; una
  autonomía que sube con incidentes es deuda, no progreso)
· Minutos humanos por conversación resuelta (el costo que la autonomía
  compra)
· Costo en tokens por conversación: A2/A3 eliminan la doble pasada de
  sup en lo muestreado — la autonomía también es margen (D-25)

═══════════════════════════════════════════════════════════════════
8. FASES DE IMPLANTACIÓN (cierran por validación)
═══════════════════════════════════════════════════════════════════

AUT-0 — INSTRUMENTAR: capturar ediciones del copiloto (diffs), rechazos
de sup con motivo, causa de escalamiento. Casi todo existe en R3; esto lo
vuelve utilizable. VALIDA: una semana de datos completos; cada handoff
con causa codificada.

AUT-1 — LA MATRIZ EN EL MOTOR: niveles A0–A3 en R0, el motor de turno
decidiendo por nivel, techo estructural cableado. VALIDA: sembrar una
intención de dinero intentando salir sin humano → bloqueada por el motor;
una respuesta intentando salir sobre su nivel → bloqueada.

AUT-2 — DESTILACIÓN: el enjambre proponiendo reglas (desde decisiones
repetidas), ajustes de tono (desde diffs) e intenciones (desde temas),
cada propuesta con su evidencia y su botón. VALIDA: una regla real
destilada de ≥20 casos, aprobada, aplicada, y esa clase de caso deja de
escalar (medido).

AUT-3 — PRIMER CICLO DE PROMOCIONES: expedientes automáticos, primer
review quincenal, primeras promociones con botón — y UNA degradación
probada: sembrar un hecho inventado en muestreo → la intención baja sola
en el acto, con alerta y plan de recuperación. VALIDA: subir es humano
(expediente + botón), bajar es regla (automática), y dep-aud encuentra
una deriva de autonomía sembrada.

AUT-4 — ESTADO ESTABLE: review quincenal de 30 minutos, matriz viva,
intenciones genéricas maduras viajando a tenants nuevos. VALIDA: dos
ciclos consecutivos donde la autonomía efectiva sube, los incidentes no,
y los minutos humanos por conversación bajan — las tres curvas juntas o
no cuenta.

═══════════════════════════════════════════════════════════════════
9. REGLAS INQUEBRANTABLES DEL PLAN
═══════════════════════════════════════════════════════════════════

1. La autonomía es por intención, con evidencia, versionada y auditable.
2. Subir es expediente + botón humano; bajar es regla automática e
   inmediata. Sin excepciones y sin atajo de regreso.
3. El techo es estructural: dinero, irreversibles, sensibles y "quiero
   un humano" jamás son autónomos — no es una etapa, es el plan.
4. Las palancas calibran contexto, reglas, cobertura y tono; NINGUNA
   toca los hechos: los hechos salen del CLI, siempre.
5. Una autonomía que sube junto con los incidentes se revierte: las tres
   curvas (autonomía ↑, incidentes →0, minutos humanos ↓) se leen juntas.
6. La deriva de autonomía (operar sobre el nivel) es hallazgo crítico,
   igual que la deriva de permisos.

REGISTRO PROPUESTO AL MAESTRO (v14): D-40 · Autonomía progresiva por
intención con techo estructural — este documento como especificación.
