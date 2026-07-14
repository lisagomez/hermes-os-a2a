# ANEXO TÉCNICO — CRM AGÉNTICO CONVERSACIONAL (profundización)
## Complemento de propuesta-crm-marca-blanca.md · Derivado del Maestro v10

Este anexo profundiza los mecanismos donde el CRM conversacional se gana o
se pierde: estados, el motor de turno, el catálogo de intenciones, la
ventana de WhatsApp, el grafo por niveles, el handoff, las campañas y la
economía unitaria. Misma disciplina de la fábrica: lo determinista en
código, el juicio en el supervisor, lo irreversible con humano — y en un
canal abierto al mundo, la inyección como amenaza de primera clase.

═══════════════════════════════════════════════════════════════════
A. MÁQUINAS DE ESTADO (conversación y caso)
═══════════════════════════════════════════════════════════════════

Transiciones como CONSTRAINTS de BD; cada transición escribe sis_bitacora
con traza; los agentes solo piden transiciones válidas vía CLI.

CONVERSACIÓN (cnv):
  nueva → activa → (en_espera_del_contacto ⇄ activa) → escalada(nivel) →
  resuelta → cerrada
  Ramas: → expirada (silencio del contacto según política) → reactivable;
  cerrada es terminal (una conversación nueva del mismo contacto ENLAZA a
  la historia, no la reabre — el hilo muere, el contexto vive).
  ATRIBUTO ESTRUCTURAL en WhatsApp: ventana ∈ {abierta(expira_en),
  cerrada} — calculada por el conector con el timestamp del ÚLTIMO mensaje
  del contacto; ningún envío de sesión libre puede existir con ventana
  cerrada (constraint, no cortesía — sección D).

CASO (cas):
  abierto → en_curso → (esperando_cliente ⇄ esperando_interno) →
  resuelto → cerrado; reabierto solo desde cerrado reciente (política) y
  cuenta en métricas como reapertura (la reapertura oculta es la métrica
  que los proveedores maquillan; aquí es de primera clase).
  Un caso puede abarcar N conversaciones y 2 canales; la promesa de SLA
  vive en el CASO, no en el hilo.

Por qué importa: el bug caro del CRM conversacional es el estado fantasma
— el "resuelto" que el contacto no consideró resuelto, el hilo doble para
el mismo problema. Estados en BD + enlace conversación↔caso lo vuelven
imposible, no improbable.

═══════════════════════════════════════════════════════════════════
B. MOTOR DE TURNO (qué pasa con CADA mensaje entrante)
═══════════════════════════════════════════════════════════════════

Pipeline determinista con presupuesto de latencia por etapa (el canal
conversacional perdona errores; no perdona silencios):

1. NORMALIZACIÓN (conector): el mensaje del canal (WA/TG) se vuelve
   cnv_mensaje canónico. IDEMPOTENCIA por message_id del canal (--llave):
   los webhooks reenvían; el contacto jamás recibe respuesta doble.
2. IDENTIDAD: resolución del contacto (ctc); identidad nueva → alta con
   consentimiento según canal; ambigua → NUNCA se une sola (P-03).
3. CLASIFICACIÓN DE INTENCIÓN contra el catálogo del caso de uso (C), con
   confianza. Bajo umbral → "no entendí" honesto con UNA pregunta
   aclaratoria (máximo dos intentos) → escala. El agente que finge
   entender es el que destruye la confianza del canal.
4. DECISIÓN DE NIVEL: reglas duras primero (disparadores no removibles:
   pide humano, tema sensible, sin opt-in, sentimiento) → si no, el nivel
   que el catálogo asigna a la intención.
5. CONTEXTO: subgrafo del contacto (E) — historial, casos abiertos, y los
   nodos de negocio que el caso de uso permita (pedidos, saldos).
6. ACCIÓN: el CLI correspondiente (ped ver, cas crear, agd crear…); el
   HECHO viene del CLI con folio — el modelo redacta, no recuerda.
7. REDACCIÓN con el paquete de marca (tono, límites, idioma).
8. COMPUERTA: salientes sensibles (compromisos, montos, temas de R2) pasan
   por sup-crm ANTES de enviarse; el resto se muestrea (E/R3).
9. ENVÍO por el conector respetando ventana, plantillas y rate limits.

PRESUPUESTO: N0 responde en segundos; N1 en menos de un minuto o avisa
("estoy revisando tu pedido…" — el silencio también se gestiona). El
failsafe global: si el trío no completa el turno en X min, alerta humana
y mensaje honesto al contacto. La torre caída jamás es invisible.

═══════════════════════════════════════════════════════════════════
C. CATÁLOGO DE INTENCIONES (el activo que se reusa)
═══════════════════════════════════════════════════════════════════

Cada CASO DE USO (ventas, soporte, cobranza, agenda) es un paquete
versionado de: intenciones (con ejemplos del español real del canal,
incluidos modismos y typos), nivel asignado, CLIs autorizados por
intención, plantillas de respuesta, disparadores propios y umbrales.

· AUTORIZACIÓN POR INTENCIÓN: la intención define QUÉ CLIs puede tocar el
  agente en ese turno — "estado de pedido" autoriza ped ver, no cob
  registrar. Es la tarjeta de agente (D-14) con granularidad de turno:
  el agente correcto, con el permiso mínimo, para la intención detectada.
· EVOLUCIÓN CON EVIDENCIA: el worker de temas del enjambre detecta lo que
  el público pregunta y el catálogo no cubre → PROPONE la intención nueva
  (con ejemplos reales anonimizados) → botón humano → versión nueva del
  paquete, catalogada en act. Igual que las plantillas del OCR: el
  catálogo mejora con el papel real, no con corazonadas.
· REUSO ENTRE TENANTS: las intenciones genéricas (saludo, horario, queja,
  humano) son activos de la casa; las del dominio, del tenant. El % de
  reuso del caso de uso es la economía del pack (D-23).

═══════════════════════════════════════════════════════════════════
D. VENTANA, PLANTILLAS Y COLAS (WhatsApp sin multas)
═══════════════════════════════════════════════════════════════════

· VENTANA DE 24h ESTRUCTURAL: el conector calcula la ventana por
  conversación; el CLI de envío tiene DOS verbos distintos — enviar-sesion
  (exige ventana abierta; constraint) y enviar-plantilla (exige plantilla
  con estatus APROBADA por Meta y opt-in vigente). No existe el verbo que
  "decide solo": la separación es estructural.
· CATÁLOGO DE PLANTILLAS (HSM): cada plantilla con su estatus del ciclo de
  Meta (borrador → enviada → aprobada | rechazada), categoría (utilidad /
  marketing — el costo difiere), variables tipadas y su evidencia de
  opt-in requerida. Una plantilla rechazada o pausada no es invocable.
· TELEGRAM: sin ventana, pero con sus reglas propias en R2 (anti-spam del
  bot, límites de frecuencia) — el conector las aplica, el supervisor las
  cita.
· COLAS DE SALIDA con rate limits POR CANAL Y POR NÚMERO: los límites de
  mensajería de WhatsApp escalan con la calidad del número; la cola
  respeta el límite vigente y las campañas (H) se calendarizan dentro de
  él. Rebasar el límite degrada el número: la cola es protección, no
  burocracia.
· CALIDAD DEL NÚMERO COMO SLA INTERNO: el rating de calidad del número de
  WhatsApp del cliente se vigila como la reputación de marketplace en
  logística — degradarse escala ANTES del bloqueo (EXC de la sección G).
  Para un negocio, perder su número de WhatsApp es perder la puerta.

═══════════════════════════════════════════════════════════════════
E. GRAFO CRM POR NIVELES (R0–R4, matriz A2A)
═══════════════════════════════════════════════════════════════════

La arquitectura de grafo por niveles de la casa, aplicada a la relación.
Regla madre intacta: EL GRAFO INDEXA, LA BD MANDA.

R0 — ESTRUCTURA (cambia poco): casos de uso, catálogo de intenciones,
canales y números, paquete de marca, matriz de niveles. ESCRIBE: humano
con botón; propuestas agénticas (C) esperan el botón.

R1 — RELACIÓN VIVA (cambia por mensaje): contactos, identidades por
canal, conversaciones, mensajes, casos — derivado determinista de las
tablas; nadie lo escribe a mano.

R2 — REGLAS CON FUENTE (cambia por política o norma): políticas de
WhatsApp/Telegram (ventana, plantillas, categorías), opt-in y LFPDPPP,
políticas del cliente (reembolsos, cobranza: horarios y frecuencia
permitidos, qué JAMÁS se dice). Sin fuente y vigencia no entra; lo legal
lo revisa dep-leg.

R3 — DESEMPEÑO MEDIDO (ventana móvil): resolución por nivel e intención,
tiempos, reaperturas, CSAT, calidad muestreada de N1, salud del número,
conversión por caso de uso. El enjambre calcula y PROPONE; exe
materializa tras sup.

R4 — ESCENARIOS (namespace aparte): probar un caso de uso o una versión
de catálogo contra conversaciones HISTÓRICAS anonimizadas (replay) sin
tocar producción; promover = botón en R0.

MATRIZ TORRE↔GRAFO: N0 lee R0+R1 (lookups: ¿intención de catálogo?,
¿ventana abierta?); N1 lee R2+R3 (política citable + qué funciona);
N2 recibe el SUBGRAFO del contacto (crm contexto --contacto CTC-…: la
persona, sus hilos, sus casos, sus pedidos — una pantalla, no mil filas);
N3 lee R4 (escenarios con impacto). Enjambre lee R1+R3, propone a R3 y
candidatos a R0 (intenciones) — jamás escribe. dep-aud audita: consistencia
R1↔BD, fuentes de R2 vivas, frescura de R3, higiene de R4, y — específico
de este pack — que ningún dato de contacto viajó a un contexto que su
consentimiento no cubre.

═══════════════════════════════════════════════════════════════════
F. HANDOFF Y COPILOTO (N2 sin fricción)
═══════════════════════════════════════════════════════════════════

· PAQUETE DE CONTEXTO: al escalar, el humano recibe el subgrafo (E) +
  resumen del intento del agente + sentimiento + la razón EXACTA del
  escalamiento. El contacto no repite nada.
· DOS MODOS: TAKEOVER (el humano conversa; el agente calla y observa) y
  COPILOTO (el agente SUGIERE respuestas con sus fuentes; el humano edita
  y envía — cada sugerencia aceptada/corregida alimenta R3). En ambos, lo
  que sale con la marca del cliente lo decidió un humano.
· REGRESO: el humano devuelve al agente con una instrucción de contexto
  ("promesa de pago registrada; da seguimiento el viernes") que queda en
  el caso, trazada.
· FUERA DE HORARIO: si el escalamiento cae fuera del horario humano del
  cliente, el agente lo DICE con honestidad, registra el compromiso de
  respuesta y el caso amanece en la cola con prioridad — el peor mensaje
  es el silencio; el segundo peor, el "un agente te atenderá" eterno.

═══════════════════════════════════════════════════════════════════
G. CATÁLOGO DE EXCEPCIONES (política escrita, no improvisación)
═══════════════════════════════════════════════════════════════════

Mismo formato del pack logístico: código, disparador MEDIBLE, nivel,
acción, SLA. Muestra:

EXC-C01 contacto pide humano → N2 inmediato, SIEMPRE (regla no removible).
EXC-C02 sentimiento negativo sostenido (n mensajes) → N1 cambia enfoque;
persiste → N2 con prioridad.
EXC-C03 intento de inyección detectado (instrucciones al agente en el
mensaje) → el contenido se trata como dato, se responde neutro, se marca
el contacto para muestreo; reincidencia → N2 y política de abuso.
EXC-C04 sin opt-in vigente para lo solicitado → el agente explica y
gestiona el consentimiento por el canal; JAMÁS "por esta vez sí".
EXC-C05 identidad ambigua entre canales → operar como contactos separados
+ propuesta de unión con confirmación (P-03); nunca unión silenciosa.
EXC-C06 salud del número WA degradándose → N2 alerta con causas (opt-outs,
reportes); a rating bajo → N3: pausa de campañas y plan (perder el número
cuesta más que cualquier campaña).
EXC-C07 silencio del trío > X min con contacto esperando → failsafe:
mensaje honesto + alerta humana + registro (la caída jamás es invisible).
EXC-C08 tema fuera de póliza (legal, salud, amenaza) → N2/N3 según
matriz; el agente contiene sin opinar y escala con el contexto.

═══════════════════════════════════════════════════════════════════
H. CAMPAÑAS (dif): LO MASIVO CON CINTURÓN Y TIRANTES
═══════════════════════════════════════════════════════════════════

PIPELINE: audiencia (SOLO opt-in vigente y segmentos definidos; el CLI
rechaza estructuralmente al contacto sin consentimiento) → plantilla
APROBADA → dry-run con muestra real visible → BOTÓN humano (identidad,
caducidad, re-validación: si la audiencia cambió, se aborta) → envío
calendarizado dentro del rate limit del número → medición (entrega,
lectura, respuesta, opt-out) → veredicto.
APAGADO POR REGLA: pico de opt-outs o de reportes sobre umbral DETIENE la
campaña sola (proteger el número > terminar el envío) y avisa. Lanzar es
humano; apagar es regla — la misma asimetría del motor comercial.
CRUCE NATURAL: con el motor comercial de la casa, las campañas nacen de
candidatas con hipótesis de ROI y mueren medidas (prm); el CRM es el
brazo, el comercial es el criterio.

═══════════════════════════════════════════════════════════════════
I. PERSONALIZACIÓN SEGURA (memoria con reglas)
═══════════════════════════════════════════════════════════════════

TRES CAPAS, en orden de precedencia: paquete de marca (cómo habla la
marca) → perfil del contacto (preferencias declaradas u observadas de SU
operación) → contexto del turno (hechos por CLI con folio).
MEMORIA DEL CONTACTO: qué se recuerda está DEFINIDO por política del
tenant (preferencias sí; datos sensibles solo los operativamente
necesarios), con TTL y con ARCO ejecutable (ctc exportar / ctc eliminar
--contacto, con las salvedades legales de retención). La personalización
usa lo consentido y lo operado — jamás enriquecimiento externo no pactado.
LÍMITE DURO (repetido a propósito): se personaliza TONO y RELEVANCIA;
los HECHOS salen del CLI. El agente encantador que inventa saldos
destruye la marca en una semana.

═══════════════════════════════════════════════════════════════════
J. ECONOMÍA UNITARIA Y PRICING
═══════════════════════════════════════════════════════════════════

COSTO POR CONVERSACIÓN por nivel (fuente automática): N0 ~cero (lookup +
plantilla), N1 tokens del turno (token_usage), N2 tiempo humano del
cliente (se reporta, no se cobra), + costo de conversación del canal
(las categorías de WhatsApp tienen precio de Meta; Telegram no) + prorrateo.
La mezcla N0/N1/N2 ES el margen: subir el % resuelto en N0/N1 con calidad
es la optimización continua, visible por tenant.
PRICING: implantación por blueprint (incluye caso de uso semilla y paquete
de marca) + mensualidad por conversaciones en tiers + campañas por
volumen (con el costo de Meta transparente) + casos de uso adicionales
como módulos. Calibrado con el piloto (D-25).
ARGUMENTO DE VENTA MEDIBLE: tiempo a primera respuesta (de horas a
segundos), % resuelto sin humano, y ventas/cobros originados en el canal
— los tres salen solos del sistema.

═══════════════════════════════════════════════════════════════════
K. RIESGOS CON NOMBRE (y mitigación)
═══════════════════════════════════════════════════════════════════

1. Políticas de Meta cambian y sancionan → R2 con fuente y vigencia,
   conector contra API oficial/BSP serio (P-01), contract tests, y la
   calidad del número como SLA interno (D/G).
2. Baneo o degradación del número → warm-up de números nuevos, colas con
   rate limit, opt-in impecable, apagado por regla en campañas; plan de
   contingencia de número documentado.
3. Inyección pública diaria → regla 3 del producto + EXC-C03 + prueba
   adversarial de CRM-5 con mensajes maliciosos reales.
4. Expectativa de "IA que todo lo resuelve" → el catálogo de intenciones
   define el alcance por escrito; "no entendí" honesto; el % N0/N1 se
   PACTA contra el piloto, no contra el marketing.
5. Privacidad (canal lleno de datos personales) → I completa: política de
   memoria, TTL, ARCO, cifrado, bitácora de acceso; dep-leg revisa el
   aviso de privacidad del tenant.
6. Dependencia del BSP → P-01 con criterios de salida (portabilidad del
   número y del historial pactada en contrato).

═══════════════════════════════════════════════════════════════════
L. VALIDACIONES QUE ESTE ANEXO SUMA (a CRM-0..CRM-5)
═══════════════════════════════════════════════════════════════════

· CRM-0: transición ilegal de conversación/caso imposible por BD;
  enviar-sesion con ventana cerrada: rechazado por constraint.
· CRM-1: webhook duplicado del canal → cero respuesta doble (idempotencia
  por message_id); mensaje simultáneo por WA y TG del mismo contacto →
  dos hilos correctos, cero unión silenciosa.
· CRM-2: los 8 EXC del catálogo sembrados y resueltos en su nivel; una
  plantilla rechazada por Meta invocada → exit 1; "no entendí" honesto
  tras dos aclaratorias → escala.
· CRM-3: replay de una conversación real con crm contexto y aud trazar
  (del primer "hola" al folio del pedido); copiloto probado (sugerencia
  editada por humano queda registrada como corrección).
· CRM-4: intención nueva propuesta por el enjambre desde temas reales →
  botón → versión nueva del catálogo en act → el siguiente lote la
  resuelve en N1; campaña con pico de opt-out sembrado se apaga sola.
· CRM-5: adversarial con inyecciones reales de canal público + verificación
  de que ningún dato de contacto cruzó tenants NI contextos fuera de su
  consentimiento (la auditoría específica de E).
