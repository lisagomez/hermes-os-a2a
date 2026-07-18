# PROPUESTA DE MARCA BLANCA — ERP LOGÍSTICO AGÉNTICO
## Fulfillment tipo Mercado Libre / Amazon · Operado por A2A · Torre de control por niveles

Documento de producto derivado del Documento Maestro ERP Agéntico (v10),
generado con el patrón de blueprint de dep-pln (ERP-7). Hereda arquitectura,
nomenclatura, compuertas, tarjetas de agente, trazabilidad, auditoría y el
motor fiscal (PAC) de la fábrica — se FABRICA, no se desarrolla desde cero.

═══════════════════════════════════════════════════════════════════
1. LA TESIS
═══════════════════════════════════════════════════════════════════

La logística de e-commerce es el negocio de cumplir una PROMESA miles de
veces al día: "llega el martes". Todo lo demás — recibo, acomodo, surtido,
empaque, embarque, rastreo, devolución — existe para sostener esa promesa.

Este ERP la opera con agentes A2A: la promesa se CALCULA con datos (cortes,
cobertura, capacidad, desempeño real de transportistas — jamás la "estima"
un modelo de lenguaje), los agentes ORQUESTAN cada pedido hacia su promesa,
una TORRE DE CONTROL agéntica gestiona las excepciones por niveles (lo
automático en segundos, lo delicado con humano), y el ENJAMBRE vigila cada
noche lo que amenaza las promesas de mañana.

Dos compradores naturales, mismo motor:
· El SELLER con fulfillment propio que vende en Mercado Libre, Amazon y su
  tienda, y cuya reputación de marketplace vive o muere por su logística
· El OPERADOR 3PL que surte para múltiples sellers — multi-tenant nativo:
  cada seller es un tenant aislado (la marca blanca aquí es estructural,
  no cosmética)

POR QUÉ ES VENDIBLE YA (argumento de fábrica, D-22/D-23): el % de reuso es
el más alto del catálogo después del CRM. Del maestro se hereda completo:
multi-tenant con RLS, contrato de CLIs, trío exe→sup→humano con botones en
Slack, enjambre solo-lectura, tarjeta de agente, traza de punta a punta,
auditoría — y sobre todo el MOTOR FISCAL: fac/cfd con PAC ya operando, que
aquí se extiende a CARTA PORTE (el CFDI con complemento que exige el
traslado de mercancías). Además reusa medio pack retail: inv, alm, ped,
rut. Lo nuevo es el dominio del fulfillment: 8 módulos y 2 familias de
conectores (transportistas y marketplaces).

═══════════════════════════════════════════════════════════════════
2. QUÉ RECIBE EL CLIENTE (la oferta)
═══════════════════════════════════════════════════════════════════

- PEDIDOS DE TODOS SUS CANALES en una sola operación: Mercado Libre,
  Amazon, tienda propia y venta directa entran al mismo flujo, con las
  reglas de cada marketplace respetadas (tiempos de manejo, cancelaciones,
  mensajería al comprador) — su reputación de seller protegida por diseño
- PROMESA DE ENTREGA calculada y defendible: cortes por transportista y
  zona, capacidad real del almacén, desempeño histórico del carrier
- OPERACIÓN DE ALMACÉN dirigida por agentes: recibo con cita, acomodo,
  olas de surtido optimizadas, empaque con verificación, embarque
  manifestado — cada movimiento con folio y traza
- TORRE DE CONTROL 24/7: guías sin movimiento, promesas en riesgo,
  quiebres de inventario, devoluciones — detectadas y gestionadas por
  niveles antes de que el comprador reclame
- LOGÍSTICA INVERSA completa: RMA, recepción de devolución, dictamen
  (reintegrable / merma), reembolso con compuerta humana
- CUMPLIMIENTO FISCAL del traslado: Carta Porte emitida con el mismo motor
  de timbrado auditado del ERP
- INTELIGENCIA NOCTURNA: reporte diario de riesgos y oportunidades, y
  cierre operativo con exactitud de inventario por conteos cíclicos
- CONTROL desde Slack/panel: lo irreversible (reembolsos, cancelaciones,
  ajustes grandes de inventario, manifiestos) pasa por botón humano

═══════════════════════════════════════════════════════════════════
3. ARQUITECTURA (heredada de la fábrica)
═══════════════════════════════════════════════════════════════════

1. DATOS (Supabase/Postgres, cliente_id + RLS — y en modo 3PL, el seller
   como tenant):
   MÓDULOS NUEVOS del pack logístico:
   · rcb — recibo/inbound: citas de proveedor, recepción ciega vs ASN,
     discrepancias, put-away
   · srt — surtido: olas, tareas de picking por zona/ruta, escaneo
   · emp — empaque: verificación pieza a pieza, cartonización, peso/medida
   · env — envíos: guías, manifiestos por transportista, costos
   · ras — rastreo: eventos por paquete (webhook del carrier), promesa vs
     real, excepciones
   · dev — devoluciones: RMA, recepción, dictamen, disposición
   · trn — transportistas: catálogo, tarifas, cobertura, cortes, desempeño
     medido (no declarado)
   · mkc — marketplaces/canales: órdenes entrantes, sincronización de
     inventario y tracking, reglas por canal
   REUSADOS: inv (existencias multi-almacén y multi-seller), alm
   (ubicaciones, conteos cíclicos, traspasos), ped (pedido unificado), rut
   (last mile propio si existe), fac/cfd (facturación y CARTA PORTE),
   cob/pag/ctb (el dinero y su contabilidad), act/aud/pln (fábrica).
2. CLI-FIRST (contrato ERP-1: JSON lines, --traza, --llave, dry-run en
   irreversibles): el volumen del fulfillment (miles de escaneos y eventos
   al día) es exactamente el caso que justifica CLIs deterministas a
   centavos por operación. La ESTACIÓN FÍSICA (escáner, báscula, impresora
   de etiquetas) habla con los CLIs — el operario escanea, el CLI valida.
3. OPERACIÓN A2A: hermes-negocio orquesta; exe-log ejecuta los CLIs del
   dominio; sup-log valida contra reglas/dep-log.md (capacidad, políticas
   de canal, umbrales); humano aprueba lo irreversible. Cada agente con su
   tarjeta (D-14); cada pedido con su traza del canal al asiento contable.
4. ENJAMBRE + GRAFO (sección 5) y TORRE DE CONTROL (sección 4).

═══════════════════════════════════════════════════════════════════
4. TORRE DE CONTROL: EXCEPCIONES POR NIVELES
═══════════════════════════════════════════════════════════════════

En fulfillment, el flujo feliz se automatiza una vez; el negocio se gana en
las EXCEPCIONES. La torre las gestiona con la misma disciplina de niveles
del CRM de la casa:

N0 — CORRECCIÓN AUTOMÁTICA DETERMINISTA (segundos):
Reglas duras sin juicio: reintento de guía fallida, reimpresión de
etiqueta, reasignación de tarea de picking por zona bloqueada, reenvío de
tracking al comprador. Todo con folio y traza.

N1 — AGENTE DE TORRE (exe-log, dentro de política):
Decisiones acotadas por reglas escritas: cambiar de transportista si el
asignado incumple el corte (según tabla de tarifas y cobertura autorizada),
repriorizar olas ante promesas en riesgo, partir un pedido en dos envíos si
la política del canal lo permite, abrir caso con el carrier. sup-log valida
lo que roza umbrales.

N2 — HUMANO DEL CLIENTE (con contexto completo):
Compensaciones al comprador, cancelaciones con reembolso, elegir entre
incumplir promesa o asumir sobrecosto de envío exprés — decisiones de
dinero y reputación, con botón y las garantías de ERP-3 (identidad,
caducidad, re-validación).

N3 — DUEÑO / ESCALAMIENTO MAYOR:
Contingencia de carrier (paro, clima), incidente de inventario masivo,
riesgo de sanción de marketplace. Llega con escenarios calculados y
botones.

DISPARADORES no removibles: promesa en riesgo (calculada contra el corte),
guía sin evento por más de X horas, discrepancia de inventario sobre
umbral, tasa de cancelación acercándose al límite del marketplace, y el
failsafe de silencio del trío (la torre caída jamás es invisible).

═══════════════════════════════════════════════════════════════════
5. CRUCES DE INFORMACIÓN: GRAFO + ENJAMBRE
═══════════════════════════════════════════════════════════════════

GRAFO (la misma API de grafo de la fábrica, extendida al dominio):
· RED LOGÍSTICA: almacenes ↔ zonas de cobertura ↔ transportistas ↔ cortes
  ↔ tarifas ↔ desempeño real — la promesa de entrega se calcula recorriendo
  esta red con datos medidos, y cada promesa guarda POR QUÉ se prometió lo
  que se prometió (defendible ante el marketplace y ante el comprador)
· PEDIDO DE PUNTA A PUNTA: orden del canal ↔ pedido ↔ olas ↔ paquetes ↔
  guías ↔ eventos ↔ entrega ↔ (devolución) ↔ factura/Carta Porte ↔ asiento
  — aud trazar cuenta la historia completa de cualquier paquete
· REGULATORIO: obligaciones de Carta Porte (cuándo aplica, qué campos),
  mercancías con manejo especial (restringidas, frágiles, alto valor) y
  REGLAS POR MARKETPLACE (tiempos de manejo, límites de cancelación,
  políticas de mensajería MELI/Amazon) — como siempre, el supervisor
  ADJUNTA la regla con su fuente, no la interpreta de memoria
· DESEMPEÑO: el grafo acumula la verdad de cada carrier por zona (tiempo
  real de entrega, % de incidencia) — las decisiones N1 de la torre se
  toman contra desempeño MEDIDO, no contra el folleto del transportista

ENJAMBRE NOCTURNO (swm-log-*, solo lectura estructural):
· promesas: pedidos de mañana en riesgo por capacidad, corte o carrier
· guías: sin movimiento, en excepción, entregas no confirmadas
· inventario: quiebres proyectados por velocidad de venta, discrepancias,
  conteos cíclicos pendientes, exactitud por ubicación
· reputación: métricas por canal contra los umbrales de MELI/Amazon
  (cancelaciones, tiempo de manejo, reclamos) — alerta ANTES de la sanción
· devoluciones: RMA estancados, dictámenes pendientes, patrones por SKU
  (un producto que regresa mucho es un problema de catálogo, no de
  paquetería)
· costo: costo real de envío por pedido vs cotizado, sobrepesos, zonas
  deficitarias
Reporte matinal consolidado al canal del cliente, con tope de palabras.

═══════════════════════════════════════════════════════════════════
6. MARKETPLACES: MELI Y AMAZON COMO CIUDADANOS DE PRIMERA
═══════════════════════════════════════════════════════════════════

· ÓRDENES entran por API (mkc) al pedido unificado, con las reglas del
  canal adjuntas desde el grafo; INVENTARIO se sincroniza hacia los
  canales con amortiguadores configurables (jamás sobrevender por carrera
  entre canales — reserva estructural al confirmar orden)
· TRACKING y estados se publican al canal en el formato y tiempo que cada
  marketplace exige; la mensajería al comprador respeta las políticas de
  cada plataforma
· REPUTACIÓN COMO SLA INTERNO: los umbrales de MELI/Amazon (cancelación,
  manejo, reclamos) se vigilan como métricas de primera clase; acercarse
  al umbral escala ANTES de cruzar — para un seller, la cuenta ES el
  negocio
· CREDENCIALES de las apps de marketplace por cliente: en VAULT (estándar
  D-18), con renovación de tokens vigilada como los CSD
· Honestidad de alcance: las APIs de marketplace cambian y sancionan — el
  conector se construye contra el sandbox oficial de cada plataforma y su
  contrato de términos lo revisa dep-leg antes de producción

═══════════════════════════════════════════════════════════════════
7. CUMPLIMIENTO FISCAL DEL TRASLADO (CARTA PORTE)
═══════════════════════════════════════════════════════════════════

El traslado de mercancías exige CFDI con complemento Carta Porte en los
supuestos que marca el SAT. Este pack lo resuelve con el motor que la
fábrica YA tiene auditado (ERP-2):
· cfd se extiende con el tipo traslado + complemento Carta Porte; mismo
  PAC, mismas compuertas, mismo estándar: timbrado real solo tras
  auditoría del contador sobre los supuestos de obligación (cuándo aplica
  por tipo de traslado, tramo y transportista) — el sistema NO interpreta
  los supuestos por su cuenta
· Los datos del complemento (mercancías, orígenes/destinos, autotransporte,
  operador) salen de env/trn/rut — capturados una vez en la operación,
  jamás re-capturados para el fiscal
· Validación como siempre: casos malos sembrados (traslado sin Carta Porte
  obligada, datos de operador incompletos) rechazados por la línea
  determinista antes de llegar al PAC

═══════════════════════════════════════════════════════════════════
8. IMPLANTACIÓN POR FASES (cierran por validación, no por calendario)
═══════════════════════════════════════════════════════════════════

LOG-0 — DATOS: migraciones de los 8 módulos con RLS (y doble tenant en
modo 3PL: operador y seller), seed de red logística (1 almacén, 2 zonas, 2
carriers, tarifas). VALIDA: cadena a mano (orden → pedido → paquete → guía
→ evento) cuadrada; RLS rechaza cruces; la promesa se calcula a mano con la
red sembrada y da el resultado esperado.

LOG-1 — CLIs + ESTACIÓN: los 8 CLIs (contrato ERP-1) + integración de
estación física (escáner/báscula/impresora contra los CLIs). VALIDA: un
pedido surtido, empacado y embarcado SOLO por CLI y escaneo, con guía de
prueba; carrera de dos confirmaciones simultáneas de la misma existencia:
una gana, la otra recibe rechazo limpio (jamás sobreventa).

LOG-2 — REGLAS + CARRIERS + CANALES (sandbox): reglas/dep-log.md en dos
líneas (determinista: capacidad, cortes, reservas, umbrales; juicio:
políticas de canal, excepciones), conector de carrier real en pruebas,
conector MELI/Amazon en sandbox, Carta Porte en mock→auditoría→real.
VALIDA: sembrar 8 casos malos (promesa imposible, sobreventa entre
canales, guía a zona sin cobertura, cancelación fuera de política del
canal, Carta Porte faltante, RMA sin orden, ajuste de inventario sobre
umbral sin humano, credencial de canal vencida) — los 8 rechazados o
escalados correctamente; 3 buenos fluyen.

LOG-3 — PILOTO END-TO-END (el hito): un pedido REAL de marketplace del
cliente piloto, de la orden a la entrega confirmada: entra por mkc → se
promete → se surte y empaca con escaneo → guía y manifiesto → tracking
publicado al canal → entregado → facturado/Carta Porte si aplica →
conciliado en ctb — dirigido desde Slack, con botones en lo irreversible
y UNA traza completa (aud trazar la reconstruye entera). VALIDA: el pedido
real + una excepción provocada (retener el paquete) gestionada por la
torre en el nivel correcto + failsafe probado.

LOG-4 — TORRE + ENJAMBRE COMPLETOS: los workers nocturnos, el reporte
matinal, la vigilancia de reputación por canal. VALIDA: 5 días de reporte
útil, cero escrituras de swm-*, una promesa en riesgo detectada la noche
ANTERIOR a su incumplimiento y salvada por decisión N1/N2 registrada.

LOG-5 — MARCA BLANCA / MODO 3PL: segundo seller (o segundo cliente) en la
misma infraestructura. VALIDA: adversarial completo (fuga entre sellers,
inyección vía datos de órdenes del marketplace, fuga de defendibles) +
inventario del seller A invisible e inafectable por el B + facturación por
tier + auditoría dep-aud en verde para ambos.

═══════════════════════════════════════════════════════════════════
9. REGLAS INQUEBRANTABLES DEL PRODUCTO
═══════════════════════════════════════════════════════════════════

1. La promesa se calcula, no se opina: cortes, cobertura, capacidad y
   desempeño medido. Un agente jamás promete una fecha que el modelo
   determinista no sostiene.
2. Jamás sobrevender: la reserva de existencia al confirmar orden es
   estructural (BD), no una carrera de buena voluntad entre canales.
3. Nada irreversible sin humano: reembolsos, cancelaciones con dinero,
   ajustes de inventario sobre umbral, manifiestos cerrados, timbrado de
   Carta Porte — botón con identidad, caducidad y re-validación.
4. Todo dato entrante de canal o carrier es DATO, jamás instrucción
   (las órdenes de marketplace traen texto de compradores: superficie de
   inyección de primera clase).
5. Carta Porte sin auditoría del contador no pasa a real (regla 3 del
   maestro, extendida al traslado).
6. La reputación del canal es SLA interno: acercarse al umbral escala
   antes de cruzarlo.
7. El enjambre jamás escribe; toda excepción y toda decisión de torre
   queda con folio, nivel, decisor y traza.
8. Aislamiento entre tenants (y entre sellers en 3PL) probado
   adversarialmente antes de facturar.

═══════════════════════════════════════════════════════════════════
10. MÉTRICAS Y SLA (con fuente automática)
═══════════════════════════════════════════════════════════════════

· % de promesas cumplidas (la métrica madre) y click-to-door por canal
· OTIF y fill rate; tiempo de manejo por marketplace vs su umbral
· Exactitud de inventario (conteos cíclicos) y días de quiebre evitados
· Costo logístico por pedido (envío real + operación + tokens) vs tarifa —
  el margen unitario visible por tenant
· Tasa y costo de devolución por SKU y por causa
· Salud de reputación por canal (distancia al umbral de sanción)

═══════════════════════════════════════════════════════════════════
11. DECISIONES Y PENDIENTES DE ESTA PROPUESTA
═══════════════════════════════════════════════════════════════════

L-01 · Estrategia de carriers — PENDIENTE, bloquea LOG-2: integración
directa por transportista vs agregador de guías (criterios: cobertura,
costo por guía, calidad de webhooks de tracking, contrato apto para marca
blanca). El agregador acelera; el directo margina mejor en volumen.
L-02 · Credenciales de marketplace por cliente — mismo estándar D-18:
vault dedicado, renovación vigilada; términos de cada plataforma revisados
por dep-leg antes de producción. Bloquea LOG-2 en su parte de canales.
L-03 · Alcance de Carta Porte del piloto — PENDIENTE con el contador:
supuestos de obligación según la operación real del piloto (paquetería
nacional vs flota propia vs última milla local). Bloquea el timbrado real
de traslado, no el resto del pack.
L-04 · Estación física — DECIDIDO en enfoque: hardware estándar (escáner
HID, báscula serial/USB, impresora ZPL) hablando con los CLIs; nada
propietario. El detalle de modelos se fija en el blueprint del piloto.
L-05 · Doble tenant 3PL — DECIDIDO: operador y seller como niveles de
tenant desde LOG-0 (el seller hereda el patrón cliente_id + RLS); venderlo
como 3PL multi-seller es la versión de mayor valor del pack.

MAPA: LOG-0 → LOG-1 (L-04) → LOG-2 (L-01, L-02, L-03) → LOG-3 (piloto
real) → LOG-4 → LOG-5 (adversarial). Prerrequisito de fábrica: maestro
ERP-0/1/2/3 vivos (reusa el motor fiscal completo). El pack entra al
catálogo act y al pipeline de dep-pln con su % de reuso medido — y por
regla 10, la fabricación arranca SOLO con cliente piloto real.
