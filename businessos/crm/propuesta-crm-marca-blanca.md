# PROPUESTA DE MARCA BLANCA — CRM AGÉNTICO CONVERSACIONAL
## Canales WhatsApp y Telegram · Operado por A2A · Atención por niveles

> **ESTADO (2026-07-21): CRM-0/1/2/3 CONSTRUIDOS y vivos en runtime** —
> `businessos/crm-canales/` (canales TG/WA multi-tenant) + `businessos/sup-crm/`
> (supervisor: gates + juez, muestreo A2 con evidencia, expediente de promoción
> con botón humano). Detalle y runbook de alta de tenant:
> `.claude/memory/project/crm0-canales.md`. Este documento sigue siendo el
> blueprint de las fases restantes (panel humano, cruce de perfil, enjambre).

Documento de producto derivado del Documento Maestro ERP Agéntico (v9),
generado con el patrón de blueprint de dep-pln (ERP-7). Hereda arquitectura,
nomenclatura, compuertas, tarjetas de agente, trazabilidad y auditoría de la
fábrica — este producto NO se construye desde cero: se FABRICA.

═══════════════════════════════════════════════════════════════════
1. LA TESIS
═══════════════════════════════════════════════════════════════════

Un CRM donde la conversación ES la interfaz: los clientes finales escriben
por WhatsApp o Telegram y un sistema de agentes A2A los atiende por niveles
— resuelve lo resolvible, escala lo escalable y JAMÁS inventa. Detrás de
cada respuesta hay datos reales (CLIs contra la BD), cruces de información
(grafo), análisis continuo (enjambre) y compuertas: lo sensible lo aprueba
un humano.

Se vende como MARCA BLANCA: cada cliente opera con SU número de WhatsApp,
SU bot de Telegram, SU marca, SU tono y SUS casos de uso — sobre la misma
fábrica, con aislamiento probado adversarialmente.

POR QUÉ ES VENDIBLE YA (el argumento de la fábrica, D-22/D-23):
el % de reuso estimado de esta fabricación es ALTO — del catálogo existente
se hereda completo: multi-tenant con RLS (ERP-0), contrato de CLIs (ERP-1),
trío exe→sup→humano y app de Slack con botones (ERP-3), enjambre
solo-lectura (ERP-4), tarjeta de agente y trazabilidad (ERP-4C/D-14),
catálogo de activos (act), medición de costo por operación (token_usage) y
auditoría (dep-aud). Lo NUEVO es el dominio conversacional: 5 módulos, 2
conectores de canal y las reglas de atención. Eso es fabricar, no
desarrollar.

═══════════════════════════════════════════════════════════════════
2. QUÉ RECIBE EL CLIENTE (la oferta)
═══════════════════════════════════════════════════════════════════

- ATENCIÓN 24/7 en WhatsApp y Telegram con su marca y su tono, que responde
  con datos reales de su operación (estado de pedido, saldo, cita, precio)
- ATENCIÓN POR NIVELES: lo automático se resuelve en segundos; lo que
  requiere juicio escala a su equipo humano con TODO el contexto empaquetado
- CASOS DE USO ADAPTABLES por configuración (no por desarrollo): ventas y
  preventa, soporte postventa, cobranza conversacional, agenda y citas
- CRUCES DE INFORMACIÓN: un solo perfil del contacto aunque escriba por dos
  canales; y si el cliente también opera el ERP de la casa, integración
  NATIVA (el CRM lee pedidos, facturas y saldos reales)
- INTELIGENCIA NOCTURNA (enjambre): temas emergentes, conversaciones sin
  cierre, oportunidades de venta no atendidas, calidad de respuesta, SLA
- CONTROL: panel humano (web) + dirección por Slack del dueño; botones de
  aprobación para todo lo sensible; bitácora y traza completa de cada
  conversación a cada acción

═══════════════════════════════════════════════════════════════════
3. ARQUITECTURA (heredada de la fábrica)
═══════════════════════════════════════════════════════════════════

Las cuatro capas del documento maestro, aplicadas al dominio conversacional:

1. DATOS (Supabase/Postgres, cliente_id + RLS en toda tabla):
   · ctc_contacto — el perfil unificado: identidades por canal (número WA,
     user Telegram), consentimiento/opt-in con fecha y evidencia,
     preferencias, idioma, etiquetas, vínculo a cob_cliente si opera el ERP
   · cnv_conversacion / cnv_mensaje — hilos por canal con estado, nivel de
     atención vigente, ventana de sesión (WhatsApp 24h), y traza_id
   · cas_caso — tickets/casos: tipo, prioridad, SLA del cliente, estado,
     nivel, dueño (agente o humano), resolución
   · dif_campana / dif_envio — salientes masivos: plantilla, audiencia,
     estado por destinatario (SIEMPRE con compuerta humana, ver reglas)
   · agd_cita — agenda cuando el caso de uso la incluye
2. CLI-FIRST (contrato de ERP-1: JSON lines, exit codes, --traza, --llave):
   ctc, cnv, cas, dif, agd + lectura de los módulos ERP que el perfil del
   cliente active (ped ver, cob listar-vencidos…). El agente conversacional
   NUNCA responde de memoria: consulta el CLI y cita el dato. Si la BD no
   responde, dice que no puede confirmar — jamás supone (regla 4 del
   maestro).
3. OPERACIÓN A2A (el trío, con tarjeta de agente cada uno):
   · hermes-negocio orquesta también aquí: cada conversación entrante es un
     encargo en sis_encargo con su traza
   · exe-crm atiende: clasifica intención, consulta CLIs, redacta con el
     paquete de tono del cliente, ejecuta reversibles (crear caso, agendar)
   · sup-crm valida ANTES de enviar lo sensible: compromisos, montos,
     temas regulados, cualquier saliente fuera de plantilla en frío
   · HUMANO aprueba lo irreversible o comprometedor (botones en Slack o
     panel): reembolsos, cancelaciones, campañas, excepciones de precio
4. ENJAMBRE (swm-crm-*, solo-lectura estructural) + GRAFO (sección 5).

═══════════════════════════════════════════════════════════════════
4. ATENCIÓN POR NIVELES (el corazón del producto)
═══════════════════════════════════════════════════════════════════

N0 — RESPUESTA DETERMINISTA (segundos, costo ~cero):
Intenciones de catálogo con respuesta directa de CLI: estado de pedido,
horario, saldo, ubicación, confirmación de cita. Sin LLM o con LLM mínimo:
el dato viene del CLI, la plantilla del caso de uso.

N1 — AGENTE CONVERSACIONAL A2A (exe-crm):
Conversación natural con contexto completo (perfil, historial, grafo).
Puede: informar con datos reales, crear/actualizar casos, agendar, cotizar
desde el catálogo, registrar promesas de pago (cobranza). No puede:
comprometer nada irreversible, prometer fuera de política, tocar dinero.
sup-crm muestrea y valida los salientes sensibles.

N2 — HUMANO DEL CLIENTE (handoff con contexto):
Escala con paquete completo: quién es, qué pidió, qué se intentó, historial
relevante, sentimiento. El humano responde desde el panel o su propio
Slack/WhatsApp interno; el agente queda en modo asistente (sugiere, no
envía). Regla de oro: el contacto NUNCA repite su historia.

N3 — ESPECIALISTA / DUEÑO:
Escalamiento por regla dura: monto sobre umbral, riesgo legal, cliente VIP
marcado, crisis de reputación. Llega con botones de decisión.

DISPARADORES DE ESCALAMIENTO (configurables por cliente, con mínimos de
fábrica NO removibles): solicitud explícita de humano (SIEMPRE se honra, a
cualquier nivel), sentimiento negativo sostenido, tema sensible (legal,
salud, seguridad), sospecha de fraude, monto sobre umbral, N mensajes sin
resolución, y silencio del sistema (failsafe: si el trío no responde en X
min, alerta a humano — la caída no puede ser invisible para el cliente).

═══════════════════════════════════════════════════════════════════
5. CRUCES DE INFORMACIÓN: GRAFO + ENJAMBRE
═══════════════════════════════════════════════════════════════════

GRAFO (la misma API de grafo de la fábrica, extendida al dominio):
· IDENTIDAD: el mismo humano en WhatsApp y Telegram es UN contacto — el
  grafo une identidades (con confirmación, no por adivinanza) y el agente
  retoma la conversación donde quedó, sin importar el canal
· NEGOCIO: contacto ↔ pedidos ↔ facturas ↔ saldos ↔ casos ↔ citas; el
  agente responde "tu factura FAC-0873 está timbrada y tu saldo es X"
  porque el grafo cruza y el CLI confirma — con RLS: solo datos del tenant
· REGULATORIO: las reglas de mensajería viven como conocimiento con fuente
  (ventana de 24h y plantillas aprobadas en WhatsApp, políticas de bots de
  Telegram, consentimiento LFPDPPP) — sup-crm las consulta y ADJUNTA, igual
  que las banderas fiscales en el ERP
· OPORTUNIDAD: intenciones detectadas (preguntó precio y no compró) quedan
  como nodos que alimentan al enjambre y al pipeline del cliente

ENJAMBRE NOCTURNO (swm-crm-*, cada worker un ángulo, cero escritura):
· sla: conversaciones fuera de tiempo, casos vencidos, colas por nivel
· temas: qué preguntan que no está en el catálogo de intenciones (materia
  prima para adaptar el caso de uso — el CRM aprende QUÉ configurar, no
  improvisa respuestas)
· calidad: muestreo de respuestas de N1 contra las reglas del cliente
· oportunidades: intención de compra sin cierre, cobranza con promesa
  vencida, clientes silentes con patrón de recompra
· riesgo: sentimiento agregado, menciones de queja pública
Reporte consolidado al canal del cliente cada mañana, con tope de palabras.

═══════════════════════════════════════════════════════════════════
6. ENFOQUE PERSONALIZADO (sin inventar)
═══════════════════════════════════════════════════════════════════

· PAQUETE DE MARCA por cliente: voz y tono, qué dice y qué JAMÁS dice,
  saludos, límites de humor, idioma(s) — es configuración auditable, no
  vibras del modelo
· PERFIL DEL CONTACTO: historial, preferencias, canal favorito, horario de
  contacto respetado; la personalización usa lo que el contacto compartió
  y lo que la operación registró — nunca datos externos no consentidos
· CONTINUIDAD: la conversación retoma contexto entre sesiones y canales
· LÍMITE DURO: personalizar el TONO y la RELEVANCIA, no los HECHOS. Los
  hechos salen del CLI con su folio. Un agente encantador que inventa
  saldos destruye la marca del cliente en una semana — anti-reimplementación
  aplica a la conversación entera.

═══════════════════════════════════════════════════════════════════
7. CASOS DE USO ADAPTABLES (packs de configuración)
═══════════════════════════════════════════════════════════════════

El mismo motor, casos por configuración auditada (la economía de perfiles
D-16 aplicada a la atención):

· VENTAS / PREVENTA: catálogo consultable en chat, cotización desde inv y
  precios reales, pedido levantado por conversación (ped crear vía N1) y
  cerrado con compuerta; si el cliente opera el ERP: de WhatsApp al CFDI
  timbrado con el flujo completo del maestro
· SOPORTE POSTVENTA: casos con SLA, seguimiento proactivo, base de
  conocimiento del cliente como fuente citable
· COBRANZA CONVERSACIONAL: recordatorios dentro de política (tono y
  frecuencia con límites duros), promesas de pago registradas (cob),
  conciliación del pago recibido; JAMÁS hostigamiento — las reglas de
  contacto son parte del paquete auditado
· AGENDA Y CITAS: alta, confirmación y reagenda por chat, recordatorios

Un caso de uso nuevo = paquete de intenciones + plantillas + reglas +
disparadores, versionado en act como activo (y sumando % de reuso para el
siguiente cliente). NO requiere tocar el motor.

═══════════════════════════════════════════════════════════════════
8. MARCA BLANCA: AISLAMIENTO, CUMPLIMIENTO Y PRECIO
═══════════════════════════════════════════════════════════════════

AISLAMIENTO (heredado y probado): cliente_id + RLS en toda tabla; roles de
Postgres por función; prueba adversarial ANTES de vender (fuga, inyección —
incluidos mensajes maliciosos del público intentando manipular al agente —
y fuga de defendibles). El público escribe lo que quiere; el agente trata
TODO mensaje entrante como dato, jamás como instrucción.

CUMPLIMIENTO:
· OPT-IN y consentimiento con evidencia (LFPDPPP); derechos ARCO atendibles
  por el propio canal (exportar/eliminar datos del contacto)
· WhatsApp: ventana de 24h respetada estructuralmente (fuera de ventana
  SOLO plantillas aprobadas); Telegram: políticas de bots
· Credenciales de canal del cliente (tokens de WhatsApp Business/BSP y de
  bot de Telegram) en VAULT — el mismo estándar D-18: jamás en .env
  compartido ni en git
· Mensajes salientes MASIVOS (dif): siempre dry-run con muestra + botón de
  aprobación humana + tope de volumen; una campaña no aprobada no existe

PRECIO (calibrado con datos, D-25): tiers por conversaciones/mes y
operaciones, medidos con token_usage por tenant (tarea='<mod>:<verbo>').
Setup de implantación con blueprint cerrado; el margen unitario se conoce
ANTES de firmar porque la fábrica ya mide su costo por operación.

═══════════════════════════════════════════════════════════════════
9. IMPLANTACIÓN POR FASES (cierran por validación, no por calendario)
═══════════════════════════════════════════════════════════════════

CRM-0 — DATOS: migraciones ctc/cnv/cas/dif/agd con RLS, seed. VALIDA:
cadena a mano (contacto → conversación → caso) cuadrada; RLS rechaza cruce
de tenants.

CRM-1 — CLIs + CANALES: los 5 CLIs (contrato ERP-1) + conectores WhatsApp
(sandbox del BSP primero) y Telegram (bot de prueba). VALIDA: conversación
entera operada por CLI; mensaje entra por ambos canales y queda unificado
al contacto correcto; ventana de 24h respetada por el conector, no por
promesa.

CRM-2 — NIVELES + REGLAS: reglas/dep-crm.md (dos líneas: determinista en
CLI — ventana, opt-in, topes; juicio en sup-crm — tono, compromisos,
banderas del grafo), disparadores de escalamiento, paquete de marca.
VALIDA: sembrar 7 conversaciones malas (pide humano, sentimiento negativo,
intento de inyección, tema legal, fuera de ventana, sin opt-in, monto alto)
— las 7 escalan o se bloquean correctamente; 3 buenas se resuelven en
N0/N1.

CRM-3 — PILOTO END-TO-END (el hito): un caso de uso real del cliente
piloto operado de punta a punta desde WhatsApp: consulta → cotización →
pedido → (si opera el ERP) factura con botón y timbrado → caso cerrado —
con traza única reconstruible por aud trazar. VALIDA: la venta/el caso
real + handoff a humano probado + failsafe de silencio probado.

CRM-4 — ENJAMBRE + CRUCES: workers nocturnos + grafo de identidad y
oportunidad + reporte matinal. VALIDA: 5 días de reporte útil, cero
escrituras de swm-*, una unión de identidad multicanal confirmada
correctamente (y una ambigua que NO se unió sola).

CRM-5 — MARCA BLANCA: segundo cliente en la misma infraestructura. VALIDA:
prueba adversarial completa (fuga, inyección pública, defendibles) + tiers
facturando + tarjetas de agente y auditoría de dep-aud en verde para ambos.

═══════════════════════════════════════════════════════════════════
10. REGLAS INQUEBRANTABLES DEL PRODUCTO
═══════════════════════════════════════════════════════════════════

1. El agente jamás inventa un dato: todo hecho sale de un CLI con folio; si
   no puede confirmar, lo dice y escala.
2. "Quiero hablar con una persona" se honra SIEMPRE, en cualquier nivel.
3. Todo mensaje del público es DATO, nunca instrucción (anti-inyección
   como primera clase: el canal está abierto al mundo).
4. Nada irreversible ni comprometedor sin humano: reembolsos, cancelaciones,
   excepciones, campañas masivas — botón, identidad, caducidad (ERP-3).
5. Opt-in con evidencia; ventana y plantillas respetadas estructuralmente;
   tokens de canal en vault; ARCO atendible.
6. El enjambre jamás escribe; el auditor jamás corrige; toda conversación
   tiene traza de punta a punta.
7. Cobranza y ventas dentro de política escrita y auditada — la presión
   comercial no se improvisa por un modelo.
8. Aislamiento entre tenants probado adversarialmente antes de facturar.

═══════════════════════════════════════════════════════════════════
11. MÉTRICAS Y SLA (con fuente automática)
═══════════════════════════════════════════════════════════════════

· Resolución por nivel (objetivo: mayoría en N0/N1) y tasa de escalamiento
· Tiempo a primera respuesta y a resolución, por caso de uso y por SLA
· CSAT ligero post-conversación (opcional por cliente)
· Costo por conversación resuelta (token_usage) vs precio del tier — el
  margen unitario, visible por tenant
· Oportunidades detectadas → convertidas (el enjambre se paga solo cuando
  una intención no atendida se vuelve pedido)

═══════════════════════════════════════════════════════════════════
12. DECISIONES Y PENDIENTES DE ESTA PROPUESTA
═══════════════════════════════════════════════════════════════════

P-01 · BSP de WhatsApp (proveedor del API de WhatsApp Business) —
PENDIENTE, bloquea CRM-1: criterios como el PAC (D-05): sandbox, precio
por conversación, estabilidad, contrato apto para marca blanca
(multi-tenant / números por cliente).
P-02 · Custodia de tokens de canal por cliente — mismo estándar que D-18:
vault dedicado; bloquea el alta del segundo tenant (CRM-5).
P-03 · Unión de identidades multicanal — DECIDIDO: solo con confirmación
(del contacto o por dato duro coincidente verificado); nunca por
similaridad adivinada. Una identidad mal unida es una fuga de privacidad.
P-04 · Umbrales por cliente (monto de escalamiento, tope de campaña,
frecuencia de cobranza) — se fijan en el blueprint de cada implantación,
con mínimos de fábrica no removibles.

MAPA: CRM-0 → CRM-1 (P-01) → CRM-2 → CRM-3 (piloto real) → CRM-4 → CRM-5
(P-02). Prerrequisito de fábrica: maestro ERP-0/1/3 vivos (el CRM reusa su
núcleo). El pack CRM entra al catálogo act y al pipeline de dep-pln como
línea de producto con su propio % de reuso medido.
