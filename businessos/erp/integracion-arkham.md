# BLUEPRINT DE INTEGRACIÓN — FÁBRICA SNA × ARKHAM
## La plataforma de Datos & AI (Arkham) + la capa de ejecución gobernada (la fábrica)

Documento estratégico-técnico derivado del Maestro v13 y del análisis de
arkham.tech. Define cómo se integra todo lo construido en esta sesión —
ERP agéntico, packs (CRM, logística, motor comercial, OCR), grafo por
niveles, compuertas, tarjetas A2A, trazabilidad, plan de autonomía — con
la plataforma Arkham (Data Platform, Ontology, AI Platform, TARS, AI
Agents Engine).

═══════════════════════════════════════════════════════════════════
1. LA TESIS DE LA INTEGRACIÓN (una línea)
═══════════════════════════════════════════════════════════════════

Arkham responde "¿QUÉ ESTÁ PASANDO Y QUÉ CONVIENE?" (unificar, medir,
predecir, recomendar). La fábrica responde "HAZLO — CON COMPUERTAS"
(ejecutar sobre sistemas reales con gobernanza: tarjetas, botones
humanos, trazas, techo estructural). Son las dos mitades del mismo
círculo: INSIGHT → ACCIÓN GOBERNADA → EVIDENCIA → mejor insight.

Hoy la frontera típica de una plataforma de datos termina en la
recomendación ("Analítica e Inteligencia" y "Control y Automatización"
de pipelines). La fábrica aporta lo que va después: el brazo operativo
que timbra, cobra, dispersa, contesta WhatsApp y cierra periodos — sin
que ningún modelo toque dinero ni actos irreversibles sin un humano. Esa
capa de ejecución gobernada es, además, el diferenciador más difícil de
copiar del stack conjunto.

═══════════════════════════════════════════════════════════════════
2. MAPA DE CORRESPONDENCIAS (pieza por pieza)
═══════════════════════════════════════════════════════════════════

ARKHAM                          FÁBRICA SNA
─────────────────────────────   ─────────────────────────────────────
Data Lakehouse + Data Sync   ↔  Capa analítica del módulo bi←dwh (el
                                 maestro lo nombró desde el día uno; la
                                 decisión natural: bi = Arkham, no se
                                 construye un warehouse propio)
Data Connectors / Pipelines  ↔  Extracción desde el OLTP de la fábrica
                                 (Supabase): sis_bitacora, token_usage,
                                 tablas de dominio, R3/G3 — SOLO lectura
Ontology / Ontology Builder  ↔  El GRAFO POR NIVELES (G0–G4, R0–R4,
                                 C0–C4): la ontología es su casa natural;
                                 nuestros metadatos de FUENTE y VIGENCIA
                                 (G2) se vuelven propiedades de la
                                 ontología
ML Hub (forecasting,         ↔  Los DRIVERS medidos: demanda → promesa
anomaly, segmentation)           de entrega y quiebres (log/inv);
                                 pronóstico de cobranza → flujo 13
                                 semanas (5D.3); anomalías → CANDIDATOS
                                 de hallazgo para el enjambre/dep-aud;
                                 segmentación → pricing y campañas
TARS AI Copilot              ↔  La interfaz de PREGUNTA analítica
                                 (lectura); complementa a hermes, que es
                                 la interfaz de ENCARGO operativo
AI Agents Engine             ↔  Nuestro enjambre (solo lectura) es el
                                 patrón compatible; los agentes que
                                 ESCRIBEN siguen siendo el trío con
                                 tarjeta D-14 — ver frontera, sección 4
Workbooks / Playground       ↔  El análisis de sup-* y dep-pln con datos
                                 gobernados
Pipeline Monitoring /        ↔  Complementa (no sustituye) el programa
Data Governance                  de dep-aud: Arkham vigila el dato en
                                 tránsito; dep-aud vigila compuertas,
                                 permisos y trazas del negocio
SOC 2 / ISO 27001 / GDPR     ↔  Se suma a nuestro estándar (RLS, vault
                                 D-18, LFPDPPP) — argumento conjunto
                                 para enterprise

═══════════════════════════════════════════════════════════════════
3. ARQUITECTURA DE LA INTEGRACIÓN (el circuito completo)
═══════════════════════════════════════════════════════════════════

SUBIDA (operación → Arkham, solo lectura):
Conector programado extrae del OLTP de la fábrica hacia el Lakehouse:
bitácora, trazas, token_usage, dominio (ventas, cobros, inventario,
conversaciones R3, promesas y eventos de logística) — POR TENANT y
respetando el aislamiento (la extracción corre con un rol de solo
lectura equivalente a rol_swm; el service role jamás, ni para Arkham).
La Ontology modela las entidades del negocio una vez (pedido, factura,
contacto, paquete, póliza) y los niveles del grafo viven ahí con sus
metadatos de fuente/vigencia.

INTELIGENCIA (dentro de Arkham):
ML Hub entrena con datos ya trazados: pronóstico de demanda, riesgo de
cobranza, anomalías de margen/inventario/tesorería, segmentación de
contactos. TARS y Workbooks para la pregunta libre de los equipos.

BAJADA (Arkham → operación, SIEMPRE como propuesta):
Toda salida de Arkham entra a la fábrica por UNA sola puerta: el ciclo
PROPUESTA → validación (sup-*) → botón humano si toca dinero o
irreversible → ejecución por CLI con traza. Ejemplos:
· Anomalía de margen detectada por ML Hub → hallazgo candidato →
  dep-aud/dep-com lo procesan con su ciclo normal
· Pronóstico de quiebre → propuesta de compra (cmp) → botón
· Segmento de reactivación → candidata de campaña (dif) → hipótesis de
  ROI (prm) → botón → medición
· Score de riesgo de cobranza → prioridad de recordatorios (cob+CRM)
REGLA DE ORO: Arkham NUNCA escribe al OLTP ni dispara verbos — propone
con evidencia; la fábrica decide con compuertas. El modelo recomienda;
el humano (o la regla aprobada) actúa.

CIERRE DEL CÍRCULO:
El resultado de cada acción (¿la campaña pagó?, ¿el pronóstico atinó?,
¿el hallazgo era real?) regresa al Lakehouse con su traza — los modelos
de Arkham entrenan con VERDAD MEDIDA de punta a punta, que es lo que
casi ningún cliente puede darles. La traza (aud trazar) se vuelve linaje
de negocio, no solo de datos.

═══════════════════════════════════════════════════════════════════
4. LA FRONTERA AGENTES-CON-AGENTES (evitar el choque)
═══════════════════════════════════════════════════════════════════

Ambos stacks tienen "agentes". La frontera que evita duplicidad y
riesgo, en una regla: LOS AGENTES DE ARKHAM LEEN Y PROPONEN (analítica,
como nuestro enjambre — solo lectura estructural); LOS AGENTES DE LA
FÁBRICA ESCRIBEN CON TARJETA (D-14), COMPUERTA Y TRAZA. Un agente
analítico que quiera "actuar" no se conecta a los sistemas: emite una
propuesta al ciclo de la fábrica. Y el plan de autonomía progresiva
(A0–A3, techo estructural) aplica igual a cualquier automatización que
nazca de una recomendación de Arkham: la regla destilada sube la
escalera con evidencia; el dinero y lo irreversible jamás.

Extensión natural de dep-aud: el programa de agentes audita también las
credenciales del conector de Arkham (solo lectura verificada en
Postgres, como al swarm) y que ninguna escritura del negocio tenga
origen fuera del ciclo de compuertas.

═══════════════════════════════════════════════════════════════════
5. TRES JUGADAS ESTRATÉGICAS (según qué sea "el proyecto")
═══════════════════════════════════════════════════════════════════

JUGADA A — LA FÁBRICA USA ARKHAM (integración de stack):
Arkham como la capa bi/analítica de la fábrica y de sus tenants: los
tableros de supervisión siguen siendo operativos (compuertas en vivo),
y lo analítico profundo (tendencias, cohortes, ML) vive en Arkham.
Beneficio: no construimos warehouse ni ML propios; vendemos ambos.

JUGADA B — ARKHAM GANA CAPA DE EJECUCIÓN (la fábrica como producto
dentro de Arkham): para los clientes enterprise de Arkham (retail, CPG,
crédito, manufactura), el ciclo hoy termina en insight/automatización de
datos; la fábrica añade el "aplicativo inteligente" que EJECUTA con
gobernanza demostrable — las demos (A2ACard, tableros) enseñan en tres
minutos lo que un comité de riesgo tarda meses en aprobar: el agente no
puede pasarse, el humano decide, todo se reconstruye. El pitch interno:
"del insight a la acción sin perder el control".

JUGADA C — VERTICALES CONJUNTOS (por industria): los packs mapean
directo a las industrias de Arkham — retail/CPG (cadena mínima +
logística + motor comercial), crédito (cob + scoring del ML Hub +
cobranza conversacional), manufactura e infraestructura (activos act +
mantenimiento como pack futuro con cliente real, regla 10 intacta). El
perfil regulatorio (D-16) y la Carta Porte/CFDI son el diferenciador
local que una plataforma de datos no trae de serie.

═══════════════════════════════════════════════════════════════════
6. FASES DE INTEGRACIÓN (cierran por validación)
═══════════════════════════════════════════════════════════════════

ARK-0 — CONECTOR DE SUBIDA: rol de solo lectura dedicado, extracción de
bitácora/token_usage/dominio de UN tenant a Lakehouse. VALIDA: cero
escrituras posibles desde el conector (probado en Postgres); el
aislamiento por tenant sobrevive a la extracción; una consulta en TARS
responde con datos reales de la operación.
ARK-1 — ONTOLOGÍA = GRAFO: entidades del negocio y niveles G/R/C en la
Ontology con fuente/vigencia como metadatos. VALIDA: grf porque y aud
trazar resolubles también desde la ontología; una regla con vigencia
vencida se ve vencida en ambos lados.
ARK-2 — PRIMER CIRCUITO CERRADO: un caso de ML Hub de punta a punta —
pronóstico de quiebre → propuesta de compra → botón → compra → resultado
de vuelta al Lakehouse con traza. VALIDA: la bajada entró SOLO por el
ciclo de propuesta; el resultado midió al modelo.
ARK-3 — TABLEROS CONECTADOS: los tableros de supervisión consumen la
analítica de Arkham (tendencias junto a las compuertas). VALIDA: una
anomalía sembrada en el Lakehouse termina como hallazgo con folio HAL-.
ARK-4 — PILOTO CONJUNTO: un cliente real del vertical elegido operando
el círculo completo. VALIDA: la venta/operación real + adversarial (el
conector intentando escribir: imposible) + el costo del circuito medido.

═══════════════════════════════════════════════════════════════════
7. RIESGOS CON NOMBRE
═══════════════════════════════════════════════════════════════════

1. Doble fuente de verdad → regla: el OLTP manda en lo operativo, el
   Lakehouse en lo analítico; la ontología indexa (nuestra regla madre
   del grafo, extendida). Consistencia auditada por dep-aud.
2. Choque de agentes → la frontera de la sección 4, por escrito y
   auditada.
3. Latencia analítica confundida con operación → los tableros marcan la
   frescura y la fuente de cada panel (ya lo hacen); lo operativo nunca
   espera al pipeline.
4. Datos sensibles al Lakehouse (nómina, candidatos, contactos) → la
   extracción respeta la clasificación de la casa: per_*/nom_* solo
   agregados o con la misma protección reforzada; LFPDPPP y los avisos
   de cada tenant mandan sobre cualquier caso de uso analítico.
5. Dependencia comercial → contrato con portabilidad (nuestros datos y
   ontología exportables), coherente con lo que exigimos dar a nuestros
   propios tenants.

REGISTRO PROPUESTO AL MAESTRO (v14): D-41 · Arkham como capa analítica
(bi) y de ML de la fábrica, con la regla de bajada "solo propuesta" y la
frontera de agentes de la sección 4.
