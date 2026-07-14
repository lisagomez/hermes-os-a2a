# ANEXO TÉCNICO — ERP LOGÍSTICO AGÉNTICO (profundización)
## Complemento de propuesta-erp-logistica.md · Derivado del Maestro v10

Este anexo profundiza los seis mecanismos donde el fulfillment se gana o se
pierde: estados, promesa, reserva, olas y empaque, integraciones (canales y
transportistas), excepciones y devoluciones — más la economía unitaria y
los riesgos con nombre. Todo bajo las reglas de la fábrica: lo determinista
en código, el juicio en el supervisor, lo irreversible con humano.

═══════════════════════════════════════════════════════════════════
A. MÁQUINAS DE ESTADO (la columna vertebral)
═══════════════════════════════════════════════════════════════════

Dos entidades mandan; todo lo demás las sirve. Sus transiciones son
CONSTRAINTS de BD (una transición ilegal no puede existir), cada transición
escribe sis_bitacora con traza, y los agentes solo pueden pedir
transiciones válidas vía CLI.

PEDIDO (ped, extendido por el pack):
  recibido → validado → prometido → reservado → en_ola → surtido →
  empacado → embarcado → en_transito → entregado → conciliado
  Ramas: cualquier estado → excepcion(codigo) → (resuelto: regresa al
  flujo | cancelado); cancelado con reembolso SIEMPRE es N2 (humano).
  Reglas duras: no hay "prometido" sin cálculo registrado (sección B); no
  hay "reservado" sin reserva atómica (sección C); no hay "embarcado" sin
  manifiesto; "conciliado" exige entrega confirmada + efectos contables
  aplicados (ctb) + costo real de envío cargado.

PAQUETE (emp/env/ras):
  creado → verificado → etiquetado → manifestado → recolectado →
  en_transito → en_reparto → entregado
  Ramas: → excepcion_carrier(codigo normalizado) → (reintento | reexpedido
  | devuelto_origen). Un pedido puede tener N paquetes; la promesa se
  cumple cuando el ÚLTIMO paquete llega (o según política del canal).

Por qué importa tanto: en fulfillment, el 90% de los bugs caros son estados
imposibles (paquete "entregado" de un pedido "cancelado"). Si la BD los
prohíbe, la torre de control gestiona excepciones REALES, no fantasmas de
datos.

═══════════════════════════════════════════════════════════════════
B. MOTOR DE PROMESA (determinista y defendible)
═══════════════════════════════════════════════════════════════════

INSUMOS (todos medidos o configurados, ninguno "estimado por el agente"):
· Cortes: hora límite por transportista/servicio/zona para despachar HOY
· Capacidad del almacén: unidades/hora por estación, MEDIDA de la
  operación real (no la del plan de negocio), con el backlog vigente
· Cobertura y tránsito: días de tránsito p50/p90 por carrier/zona,
  calculados del historial propio (ras_evento), no del folleto
· Buffer de seguridad configurable por canal (el marketplace castiga
  distinto la promesa larga que la promesa rota)

CÁLCULO (código, no LLM):
1. despacho_factible = primer corte alcanzable dado backlog + capacidad
2. transito = p90 del carrier elegible más conveniente para la zona
3. promesa = despacho_factible + transito + buffer_canal
4. Se elige carrier por política: cumplir promesa al menor costo; empates
   por desempeño medido.

REGISTRO DEL PORQUÉ: cada promesa guarda su snapshot de insumos (corte
usado, backlog al momento, p90 vigente, buffer). Cuando un comprador o un
marketplace reclama, la respuesta no es "el sistema lo dijo": es el
snapshot. Y cuando la promesa se rompe, el post-mortem es un query.

RECÁLCULO POR EVENTO: quiebre de inventario, corte perdido, excepción de
carrier → el motor recalcula y emite "promesa en riesgo" con OPCIONES
CALCULADAS: upgrade de servicio (costo +$X, cumple), partir envío (si el
canal lo permite), o incumplir (impacto de reputación estimado). N1 decide
dentro de política; si toca dinero sobre umbral, N2 con botón.

═══════════════════════════════════════════════════════════════════
C. RESERVA DE INVENTARIO (sobrevender es imposible, no improbable)
═══════════════════════════════════════════════════════════════════

MODELO: disponible = físico − reservado − dañado − retenido, por SKU y
almacén (y por seller en modo 3PL).
· PUBLICACIÓN A CANALES: cada canal ve disponible − buffer_canal (el
  amortiguador absorbe la latencia de sincronización entre plataformas)
· RESERVA ATÓMICA: al confirmar una orden, la reserva es UNA transacción
  con bloqueo de fila y constraint disponible ≥ 0. Dos órdenes simultáneas
  por la última pieza: una reserva, la otra recibe rechazo limpio y el
  canal su actualización inmediata. Esto es exactamente la prueba de
  carrera de LOG-1.
· LIBERACIÓN: cancelación o expiración de orden no pagada libera la
  reserva en la misma transacción que cambia el estado.
· FALTANTE EN UBICACIÓN (el inventario mintió): el surtidor escanea y la
  pieza no está → el CLI abre discrepancia, re-alojar la reserva a otra
  ubicación si existe, o dispara recálculo de promesa; la ubicación queda
  marcada para reconteo. La discrepancia es hallazgo, no vergüenza — lo
  grave es no medirla.
· EXACTITUD: conteos cíclicos ABC (los SKUs A se cuentan más), programados
  por el enjambre, ejecutados por estación con escaneo; la exactitud por
  ubicación es métrica de primera clase.
HONESTIDAD OPERATIVA: el sistema garantiza que los DATOS no sobrevendan;
la disciplina física (escanear todo, no "acomodar de memoria") es requisito
del cliente y va por escrito en el blueprint del piloto. Un almacén
indisciplinado derrota a cualquier software.

═══════════════════════════════════════════════════════════════════
D. OLAS, SURTIDO Y EMPAQUE (el piso del almacén)
═══════════════════════════════════════════════════════════════════

OLAS (srt): agrupación de pedidos por corte/carrier/prioridad de promesa;
la ola se lanza cuando conviene al corte, no cuando se acumula por inercia.
Tareas de picking por zona, secuenciadas por recorrido de ubicaciones
(orden de pasillo); el surtidor escanea ubicación → escanea pieza → el CLI
valida ambas (pieza equivocada = rechazo en el acto, no en el empaque).

EMPAQUE (emp): verificación pieza a pieza contra el pedido (escaneo; una
pieza ajena no pasa), cartonización sugerida por volumetría, y el candado
barato que más fraudes y errores caza: PESO ESPERADO vs báscula real con
tolerancia porcentual — discrepancia bloquea la estación y escala a N1 con
el paquete retenido. Ese peso registrado, además, es la evidencia de la
sección F (conciliación de facturas de carrier).

EMBARQUE (env): etiqueta (idempotente con --llave: reimprimir jamás
duplica guía), manifiesto por transportista al corte (IRREVERSIBLE:
--confirmar; cerrar un manifiesto es comprometer la recolección), y
recolección confirmada contra el manifiesto (bulto faltante = excepción
inmediata, no descubrimiento del día siguiente).

═══════════════════════════════════════════════════════════════════
E. INTEGRACIÓN DE CANALES (MELI / Amazon, sin ingenuidad)
═══════════════════════════════════════════════════════════════════

CONTRATO INTERNO ÚNICO: mkc normaliza toda orden externa a UN formato
(orden → pedido unificado) y todo estado interno a los formatos de salida
de cada canal. El resto del sistema no sabe ni le importa de qué
marketplace vino el pedido — esa ignorancia es la escalabilidad.

MERCADO LIBRE:
· Entrada por notificaciones (webhooks) + confirmación por API de órdenes;
  toda notificación se procesa idempotente (--llave = id de recurso+evento)
· Mapeo publicación↔SKU interno (tabla mkc_publicacion): una publicación
  puede ser kit (N SKUs) — el kit explota a componentes al reservar
· Salida: estado y tracking a la API de envíos del canal en su formato y
  plazo; mensajería postventa SOLO dentro de la política del canal y del
  paquete de marca
· Quiebre: pausa de publicación automática (reversible) antes de
  sobrevender; reactivación al reponer
AMAZON (alcance honesto): este pack opera MFN/FBM (fulfillment propio del
seller vía SP-API); el inventario FBA se muestra como visibilidad, NO se
opera — decirlo en la venta evita el proyecto fantasma.

SINCRONIZACIÓN DE STOCK: por evento (cada reserva/liberación empuja) +
RECONCILIACIÓN periódica (el enjambre compara lo publicado vs lo calculado
y las diferencias son hallazgo). Los webhooks se pierden; la reconciliación
es la red de seguridad.

CONTRACT TESTS: cada conector se construye contra el sandbox oficial y
mantiene una suite de contrato (payloads reales versionados). Cuando el
marketplace cambie su API — y va a cambiar — la suite truena en staging,
no la operación en viernes de Hot Sale.

═══════════════════════════════════════════════════════════════════
F. TRANSPORTISTAS: TRACKING NORMALIZADO Y CONCILIACIÓN DE FACTURAS
═══════════════════════════════════════════════════════════════════

CONTRATO DEL CONECTOR (por carrier o agregador, L-01):
cotizar → generar guía (idempotente) → manifestar (irreversible) →
tracking → prueba de entrega. Todo evento de carrier se NORMALIZA a un
catálogo propio de eventos (ras_evento: recolectado, en_transito, en_
reparto, entregado, intento_fallido, retenido, siniestro, devuelto…) —
cada transportista habla su dialecto; la torre opera UN idioma.

DESEMPEÑO MEDIDO: de ras_evento salen los p50/p90 reales por carrier/zona
que alimentan al motor de promesa (B) y a las decisiones N1 de la torre.
El carrier se evalúa por sus hechos en TU operación.

CONCILIACIÓN DE FACTURAS DEL CARRIER (el módulo que se paga solo):
La factura periódica del transportista se cruza contra:
· guías realmente generadas y manifestadas (cobros de guías fantasma)
· peso/dimensión FACTURADOS vs peso REGISTRADO en báscula al empacar
  (sobrepesos y re-dimensionamientos cobrados de más — con evidencia
  trazada: estación, timestamp, operario)
· servicios cobrados vs contratados (zonas extendidas, seguros)
Diferencias → disputa con expediente automático. En operaciones reales,
la recuperación por sobrepesos mal cobrados suele cubrir la mensualidad
del sistema: es el ROI más fácil de demostrar en la venta.

═══════════════════════════════════════════════════════════════════
G. CATÁLOGO DE EXCEPCIONES DE TORRE (política escrita, no improvisación)
═══════════════════════════════════════════════════════════════════

Cada excepción vive en catálogo con: código, disparador MEDIBLE, nivel
inicial, acción de política, SLA de resolución y escalamiento. Muestra:

EXC-001 guía sin evento >24h → N1: abrir caso con carrier; >48h → N2:
decidir reexpedición (costo calculado) vs espera; comprador informado
según política del canal.
EXC-002 promesa en riesgo por corte perdido → N1: opciones del motor
(upgrade/partir/incumplir); toca dinero sobre umbral → N2 con botón.
EXC-003 discrepancia de peso en empaque → N0 bloquea estación; N1
dictamina (pieza de más/de menos/fraude) con paquete retenido.
EXC-004 faltante en ubicación → N0 re-aloja reserva si hay; si no, N1 y
recálculo de promesa; ubicación a reconteo.
EXC-005 intento fallido de entrega ×2 → N1 contacto al comprador (por el
canal permitido); ×3 → retorno y N2 decide reembolso/reenvío.
EXC-006 tasa de cancelación del canal a 80% del umbral → N2 alerta de
reputación; a 90% → N3 con plan calculado (la sanción cuesta más que
cualquier pedido individual).
EXC-007 discrepancia de inventario sobre umbral → ajuste PROPUESTO,
ejecutado solo con botón humano (regla 3 del producto).
EXC-008 webhook de canal caído / credencial vencida → N0 reintento con
backoff; persistente → N2 + reconciliación forzada al restablecer.
El catálogo es configuración versionada por cliente (con mínimos de
fábrica), auditada como las reglas: la torre ejecuta política, no humor.

═══════════════════════════════════════════════════════════════════
H. LOGÍSTICA INVERSA (el flujo que define la reputación)
═══════════════════════════════════════════════════════════════════

RMA autorizado según política del canal (plazos, causas) → guía inversa o
recepción en mostrador → RECEPCIÓN de devolución (escaneo contra RMA; lo
no anunciado se recibe como "sin RMA" y se dictamina aparte) → DICTAMEN
por estación: reintegrable (put-away y disponible de nuevo), merma
(ajuste con compuerta), revisión/garantía → REEMBOLSO: siempre N2 (dinero
= humano), con el efecto contable automático (ctb: nota de crédito o
egreso según el caso, y su CFDI correspondiente por el motor fiscal) →
CIERRE con causa codificada.
El enjambre agrega causas por SKU: un producto que regresa mucho es un
problema de catálogo/proveedor, no de paquetería — y esa señal va al
reporte del cliente con evidencia.

═══════════════════════════════════════════════════════════════════
I. ECONOMÍA UNITARIA Y PRICING (con datos, D-25)
═══════════════════════════════════════════════════════════════════

COSTO POR PEDIDO (visible por tenant, fuente automática):
envío real (F) + insumos de empaque + operación de almacén (prorrateo por
unidades medidas) + tokens del trío y la torre (token_usage por
tarea='<mod>:<verbo>') + prorrateo de fijos. Contra la tarifa del tier:
margen unitario continuo, no descubrimiento trimestral.

PRICING PROPUESTO (se calibra con el piloto, regla de dep-pln: sin plan no
hay precios): setup de implantación por blueprint cerrado + mensualidad
por pedidos procesados en tiers + módulos premium (conciliación de
carriers, multi-seller 3PL) — y en modo 3PL, el operador revende por
seller con su propio margen: la marca blanca de dos pisos.

ARGUMENTOS DE ROI PARA LA VENTA (demostrables, no prometidos):
1. Recuperación de sobrepesos mal cobrados (F) — auditable desde el mes 1
2. Sanciones de marketplace evitadas (G/EXC-006) — el costo de UNA
   suspensión de cuenta paga años de sistema
3. Sobreventa cero estructural (C) — cancelaciones por falta de stock: 0
4. Nómina operativa plana al crecer pedidos (tesis de la fábrica, D-26)

═══════════════════════════════════════════════════════════════════
J. RIESGOS CON NOMBRE (y su mitigación)
═══════════════════════════════════════════════════════════════════

1. APIs de terceros cambian y sancionan → contract tests por conector,
   sandbox primero, reconciliación como red, dep-leg revisa términos.
2. Picos estacionales (Hot Sale, Buen Fin) → prueba de carga ANTES del
   primer pico del cliente: colas con backpressure, capacidad del motor de
   olas medida, y el failsafe de la torre bajo estrés. Va en el blueprint
   como validación obligatoria, no como esperanza.
3. El mundo físico miente → exactitud por conteos cíclicos, discrepancias
   como métrica, y el requisito operativo por escrito: disciplina de
   escaneo del cliente. El software no arregla un almacén que no escanea.
4. Dependencia de un carrier → política multi-carrier desde el diseño
   (L-01); el motor de promesa elige, no se casa.
5. Inyección vía datos de canal (notas de compradores, nombres, direcciones
   creativas) → regla 4 del producto: todo dato entrante es dato; la
   prueba adversarial de LOG-5 lo siembra a propósito.
6. Alcance-fantasma con Amazon (esperar que opere FBA) → dicho en la
   propuesta y en el contrato: MFN se opera, FBA se observa.

═══════════════════════════════════════════════════════════════════
K. QUÉ SE VALIDA DE MÁS POR ESTE ANEXO (suma a LOG-0..LOG-5)
═══════════════════════════════════════════════════════════════════

· LOG-0: transiciones ilegales de estado imposibles por BD (intentarlas).
· LOG-1: carrera por la última pieza (C); reimpresión sin duplicar guía.
· LOG-2: suite de contrato de cada conector en verde contra sandbox;
  catálogo de excepciones cargado con sus SLA; peso esperado vs báscula
  bloqueando una discrepancia sembrada.
· LOG-3: el snapshot del porqué de la promesa del pedido piloto,
  recuperable; una factura de carrier de prueba conciliada con un
  sobrepeso sembrado detectado.
· LOG-4: reconciliación de stock detecta un desfase sembrado entre lo
  publicado y lo calculado; EXC-006 simulada escala a N3 con plan.
· LOG-5: prueba de carga de pico estacional documentada antes de facturar
  al segundo tenant.

═══════════════════════════════════════════════════════════════════
L. GRAFO LOGÍSTICO POR NIVELES (arquitectura de conocimiento A2A)
═══════════════════════════════════════════════════════════════════

El grafo de la fábrica se especializa aquí en CINCO NIVELES apilados, cada
uno con su fuente de verdad, su ritmo de cambio y su dueño A2A. La regla
madre antes que nada: EL GRAFO INDEXA, LA BD MANDA — el grafo nunca es
fuente de verdad del negocio; existe para responder preguntas de CRUCE que
en tablas costarían veinte joins, y si algún día contradice a la BD, el
grafo está mal y eso es hallazgo de auditoría.

G0 — RED FÍSICA (la topología, cambia poco):
Nodos: almacenes, zonas de ubicación, estaciones, muelles, hubs de
transportista, zonas de cobertura postal. Aristas: adyacencia de recorrido
de picking, almacén→hub, hub→zona con servicio.
Fuente: catálogos (alm, trn, cat). ESCRIBE: solo humano con botón —
cambiar la red es decisión de negocio (propuesta por dep-pln o dep-dev,
jamás por iniciativa de un agente operativo).

G1 — FLUJO VIVO (las instancias, cambia por segundo):
Pedidos, olas, paquetes, guías y eventos como nodos/aristas temporales
SOBRE la red. Fuente: proyección DETERMINISTA de las tablas (trigger/ETL
por evento). ESCRIBE: nadie a mano — se deriva; por eso jamás miente
distinto que la BD, y su consistencia se audita (sección N).

G2 — REGLAS Y REGULATORIO (conocimiento con fuente, cambia por norma):
Supuestos de Carta Porte por tipo de traslado, políticas por marketplace
(umbral de cancelación, ventanas de mensajería), restricciones de
mercancía (frágil, restringida, alto valor), coberturas y contratos por
carrier. CADA nodo/arista lleva FUENTE y VIGENCIA — sin fuente no entra
al grafo, punto. ESCRIBE: exe tras validación de sup + aprobación humana;
lo fiscal/legal con la auditoría de siempre (contador, dep-leg).

G3 — DESEMPEÑO (la verdad medida, ventana móvil declarada):
p50/p90 por carrier-zona, exactitud por ubicación, tasa de excepción por
nodo de la red, causas de devolución por SKU. Fuente: agregaciones
nocturnas — el ENJAMBRE calcula y PROPONE, exe materializa tras sup (el
swm jamás escribe ni al grafo: la regla 2 del maestro no tiene asterisco).
Solo datos medidos: el desempeño declarado por el carrier no entra a G3;
a lo más vive en G2 como término contractual, con su fuente.

G4 — ESCENARIOS (lo hipotético, namespace aparte):
"¿Qué pasa si agrego corte vespertino?", "¿capacidad para Hot Sale con
+40%?", "¿carrier B en zona norte?" — subgrafos de escenario versionados,
ligados a las proyecciones de dep-pln (D-25). ESCRIBE: exe-pln; la
decisión de volver real un escenario es humana y registrada. Un escenario
JAMÁS contamina la red real: viven en espacios separados por diseño, y
promover escenario→G0 es el botón humano de G0.

═══════════════════════════════════════════════════════════════════
M. MATRIZ A2A: QUIÉN PREGUNTA QUÉ, QUIÉN ESCRIBE QUÉ
═══════════════════════════════════════════════════════════════════

La correspondencia entre los NIVELES DE LA TORRE (sección G del anexo) y
los NIVELES DEL GRAFO es la clave del costo y de la seguridad: cada nivel
de atención consulta las capas que necesita — y solo esas.

TORRE N0 (automático, milisegundos, costo ~cero):
Lee G0+G1 con lookups deterministas: "ruta de picking de esta ola",
"siguiente corte alcanzable para CP 06600", "¿esta ubicación está
bloqueada?". Sin LLM: son consultas de índice.

TORRE N1 (agente, dentro de política):
Lee G2+G3: "carriers ELEGIBLES para esta zona según contrato (G2) y su
p90 REAL (G3)", "¿este SKU exige Carta Porte o manejo especial? — con la
fuente adjunta", "¿partir el pedido lo permite la política del canal?".
El agente decide con conocimiento fundado y citable, no con memoria del
modelo.

TORRE N2 (humano con contexto):
Recibe el SUBGRAFO del caso: grf contexto --pedido PED-1042 entrega el
mapa completo (orden↔pedido↔paquetes↔guías↔eventos↔reglas aplicables↔
desempeño del carrier involucrado) — el humano ve un mapa de una pantalla,
no mil filas. El handoff empaquetado del CRM, versión logística.

TORRE N3 (dueño, decisiones mayores):
Lee G4: escenarios con costos e impactos CALCULADOS (capacidad, red,
contingencia de carrier), presentados con botones.

ENJAMBRE: lee G1+G3 para sus hallazgos nocturnos; PROPONE actualizaciones
a G3 y candidatos a G2 ("el p90 de la zona norte empeoró 3 días seguidos:
propongo actualizar y alertar") — propuesta, jamás escritura.

DEP-AUD: audita al grafo mismo (sección N).

ESCRITURA POR CAPA (resumen de compuertas):
G0 humano con botón · G1 derivada determinista (nadie a mano) · G2
exe+sup+humano, siempre con fuente · G3 swm propone → exe materializa →
sup valida · G4 exe-pln crea, humano promueve.

═══════════════════════════════════════════════════════════════════
N. CONSULTAS CANÓNICAS Y AUDITORÍA DEL GRAFO
═══════════════════════════════════════════════════════════════════

CLI grf (contrato ERP-1; lecturas + escenarios como única escritura, en su
namespace):
· grf ruta --ola OLA-0021            (G0+G1: recorrido de picking)
· grf corte --cp 06600 --fecha hoy   (G0: cortes alcanzables)
· grf elegibles --zona NTE --sla 48h (G2+G3: carriers con contrato y p90)
· grf regla --sku SKU-881 --tema carta-porte   (G2: con fuente y vigencia)
· grf desempeno --carrier X --zona NTE          (G3: ventana móvil)
· grf contexto --pedido PED-1042     (subgrafo de handoff para N2)
· grf porque --promesa PED-1042      (el snapshot: qué sabía el grafo
  cuando se prometió — hermano del "porqué" del motor de promesa)
· grf escenario crear|evaluar|comparar          (G4, namespace aparte)

TRAZABILIDAD DE CONSULTA: toda respuesta del grafo que motive una decisión
(elección de carrier de N1, opción tomada en una excepción) queda
referenciada en la traza de la operación — reconstruir "qué sabía el
sistema cuando decidió" es un comando, igual que aud trazar.

AUDITORÍA DEL GRAFO (programa nuevo de dep-aud, mismas reglas de
independencia):
· CONSISTENCIA: G1 vs tablas — muestreo diario; cualquier desfase es
  hallazgo (el grafo mal sincronizado es peor que no tener grafo)
· FUENTES: todo G2 con fuente viva y vigencia no vencida; norma vencida =
  hallazgo crítico (decidir con regla muerta)
· FRESCURA: G3 dentro de su ventana declarada; métricas viejas se marcan,
  no se usan en silencio
· HIGIENE DE ESCENARIOS: nada de G4 referenciado por decisiones operativas

VALIDACIONES QUE ESTE APARTADO SUMA (a LOG-2/3/4/5):
· Sembrar un desfase G1↔BD → la auditoría lo encuentra (LOG-4)
· Una decisión N1 real reconstruida con grf porque, fuente incluida (LOG-3)
· Propuesta del enjambre a G3 rechazada por sup con motivo, y una aceptada
  materializada por exe — el ciclo completo (LOG-4)
· Un escenario G4 evaluado y descartado sin dejar rastro en la red real;
  otro promovido a G0 SOLO con botón (LOG-4/5)
· Intento de meter conocimiento a G2 sin fuente: rechazado por el CLI,
  exit 1 (LOG-2)
