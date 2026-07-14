# PROPUESTA DE MARCA BLANCA — LECTOR DOCUMENTAL AGÉNTICO (OCR)
## PDFs masivos · Letra a mano · Estructuración dinámica · Calidad medida

Documento de producto derivado del Documento Maestro ERP Agéntico (v10),
generado con el patrón de blueprint de dep-pln (ERP-7). Pack TRANSVERSAL:
se vende solo (digitalización estructurada de archivos masivos) o como
órgano de los demás packs — alimenta el buzón contable (estados de cuenta
en PDF), la logística (remisiones y acuses firmados a mano) y cualquier
expediente. Es, literalmente, los OJOS de la fábrica.

═══════════════════════════════════════════════════════════════════
1. LA TESIS
═══════════════════════════════════════════════════════════════════

Todo negocio con historia tiene un cementerio de papel: cajas de
remisiones firmadas, estados de cuenta en PDF, contratos escaneados,
formatos llenados a mano. Ese archivo contiene dinero (deducciones no
tomadas, cobros no conciliados, evidencia legal) y nadie lo puede usar
porque no está estructurado.

Este producto lo convierte en DATOS con tres compromisos que los OCR
genéricos no hacen:

1. CALIDAD MEDIDA, NO PROMETIDA: la exactitud se mide por tipo de campo
   contra un conjunto dorado del propio cliente, y el número se reporta.
   Un OCR que dice "99%" sin decir sobre qué, miente por omisión.
2. HONESTIDAD ANTE LO ILEGIBLE: el sistema JAMÁS adivina. Cada campo sale
   con su confianza; bajo el umbral, va a reconciliación de segundo motor
   o a validación humana. "Ilegible" es una respuesta válida — un OCR que
   inventa un monto es peor que uno que confiesa que no pudo (la
   anti-reimplementación de la fábrica, aplicada a la lectura).
3. ESTRUCTURACIÓN DINÁMICA: el sistema no exige que le definan plantillas
   por adelantado. Clasifica el documento, extrae contra la plantilla si
   existe, y cuando encuentra un tipo NUEVO, PROPONE el esquema (campos
   detectados, tipos, validaciones sugeridas) — un humano lo aprueba una
   vez y la plantilla queda como ACTIVO reutilizable (act) que abarata
   cada lote siguiente. El % de reuso, otra vez, es la economía.

La letra a mano se trata con respeto técnico: los campos manuscritos en
formularios (fechas, montos, nombres, firmas en recuadros) son terreno
ganable con motores de visión modernos + reconciliación; el manuscrito
corrido (párrafos de puño y letra) es honestamente más difícil y se
cotiza y valida como tal — con más paso humano. Decirlo en la venta evita
el proyecto fantasma.

═══════════════════════════════════════════════════════════════════
2. QUÉ RECIBE EL CLIENTE (la oferta)
═══════════════════════════════════════════════════════════════════

- INGESTA MASIVA: carpetas, ZIP, correo, escáner de red o carga por la
  web/Slack; miles de páginas por lote, con cola priorizable (lo urgente
  primero, el archivo histórico de noche)
- LECTURA DE ALTA CALIDAD: PDFs nativos (texto extraído directo, sin OCR
  — gratis y perfecto), impresos escaneados, y FORMULARIOS CON LETRA A
  MANO, con confianza por campo
- ESTRUCTURA, NO TEXTO: la salida no es un TXT — son registros validados
  (JSON/tablas) contra el esquema del tipo de documento: la remisión sale
  con folio, fecha, partidas y firma detectada; el estado de cuenta con
  movimientos listos para conciliar
- VALIDACIÓN CRUZADA AUTOMÁTICA: lo extraído se verifica con reglas
  deterministas (los importes SUMAN, el RFC pasa su verificación, la fecha
  es fecha, el folio existe en el catálogo) — un total que no cuadra marca
  la extracción, no contamina el negocio
- COLA DE VALIDACIÓN HUMANA eficiente: imagen y campos lado a lado, solo
  los campos dudosos, atajos de teclado; cada corrección MEJORA el sistema
  (se vuelve oro de entrenamiento del cliente)
- TRAZABILIDAD TOTAL: de cada dato estructurado se puede ver el pixel del
  que salió (página, región, confianza, motor, quién validó) — evidencia,
  no fe
- MARCA BLANCA: tipos de documento, plantillas y umbrales POR TENANT, con
  el aislamiento adversarial de la casa; los documentos del cliente A son
  invisibles para el B

═══════════════════════════════════════════════════════════════════
3. PIPELINE POR NIVELES (la calidad como cascada, el costo como diseño)
═══════════════════════════════════════════════════════════════════

Cada página recorre la cascada y se detiene en el PRIMER nivel que la
resuelve con confianza — así lo barato resuelve lo fácil y lo caro se
reserva para lo difícil:

N0 — TEXTO NATIVO (determinista, costo ~cero):
El PDF trae texto embebido → extracción directa + estructuración. Sin OCR.
Una fracción enorme de los "escaneos" corporativos son nativos: detectarlo
primero es la optimización más rentable del pipeline.

N1 — OCR DE IMPRESO (motor primario):
Página escaneada de texto impreso → OCR + extracción contra plantilla.
Campos con confianza ≥ umbral pasan; el resto baja de nivel. Preproceso
determinista incluido (enderezado, limpieza, detección de orientación).

N2 — RECONCILIACIÓN MULTI-MOTOR (donde se gana la letra a mano):
Campos dudosos y campos manuscritos → SEGUNDO motor (visión-LLM u OCR
alterno) lee de forma independiente; coincidencia entre motores sube la
confianza; discrepancia la baja y el campo se marca. El agente reconcilia
CON reglas (formato, checksum, contexto del documento) — jamás "escoge el
que suena mejor".

N3 — VALIDACIÓN HUMANA (cola dirigida):
Solo campos bajo umbral o críticos por política del cliente (montos sobre
X siempre ven ojos humanos, configurable). La corrección alimenta el oro
del tenant: el sistema del cliente mejora con SU papel.

REGLA DE ORO DE LA CASCADA: ningún campo llega al negocio sin (a)
confianza sobre umbral, o (b) validación humana. El dato dudoso no viaja.

═══════════════════════════════════════════════════════════════════
4. ESTRUCTURACIÓN DINÁMICA (el esquema como activo)
═══════════════════════════════════════════════════════════════════

CLASIFICAR → EXTRAER → PROPONER, en ese orden:

1. CLASIFICACIÓN: cada documento se clasifica contra la taxonomía del
   tenant (remisión, estado de cuenta, contrato, formato X…). Confianza
   baja = "tipo desconocido", jamás clasificación forzada.
2. EXTRACCIÓN CONTRA PLANTILLA: si el tipo existe, se extrae contra su
   plantilla versionada: campos, tipos de dato, validaciones deterministas
   (checksums, rangos, aritmética entre campos, catálogos), umbrales de
   confianza por campo y política de criticidad.
3. PROPUESTA DE ESQUEMA (lo dinámico): ante un tipo nuevo o una variante
   (el proveedor cambió su formato), el agente PROPONE: campos detectados
   con ejemplos, tipos inferidos, validaciones sugeridas, y en qué se
   diferencia de plantillas existentes. Un humano aprueba con botón — la
   plantilla nace versionada, entra al catálogo act como activo del tenant
   (o de la casa si es genérica: estados de cuenta de un banco sirven a
   todos los tenants — reuso que abarata al siguiente cliente, D-23).
4. EVOLUCIÓN: las correcciones de N3 y las discrepancias de N2 se agregan
   por plantilla; cuando un campo falla sistemáticamente, el enjambre
   propone ajustar la plantilla (nueva versión, aprobada, medida). Las
   plantillas mejoran con evidencia, no con corazonadas.

GRAFO DOCUMENTAL POR NIVELES (la arquitectura de grafo de la casa):
D0 taxonomía y plantillas (escribe humano con botón, propuesta agéntica) ·
D1 documentos vivos y su estado en el pipeline (derivado determinista) ·
D2 reglas de validación con fuente (checksums oficiales, catálogos, reglas
del cliente) · D3 desempeño medido (exactitud por campo/tipo/motor, costo
por página, tasa de paso directo — ventana móvil) · D4 escenarios (probar
una plantilla nueva contra un lote histórico SIN tocar producción).
Consultas canónicas: doc porque --campo (el pixel de origen con confianza
y motor) · doc exactitud --tipo remision (la calidad real, medida).

═══════════════════════════════════════════════════════════════════
5. CALIDAD MEDIDA Y AUDITORÍA (la diferencia con el OCR genérico)
═══════════════════════════════════════════════════════════════════

· CONJUNTO DORADO por tenant: en la implantación se valida a mano una
  muestra representativa del papel REAL del cliente (no un benchmark
  ajeno); contra ella se mide exactitud por tipo de campo (montos, fechas,
  folios, nombres, manuscrito) — y ese número, con su intervalo, es el que
  se reporta y se pacta como SLA. Sin dorado no hay promesa de exactitud.
· MUESTREO CONTINUO: dep-aud extiende su programa — muestra periódica de
  campos "pasados directo" re-verificada por humano; la degradación de un
  motor o una plantilla es hallazgo ANTES de contaminar meses de datos.
· DERIVA: cambio de formato de un emisor, escáner desajustado del cliente,
  motor actualizado — el enjambre vigila la exactitud por ventana móvil y
  alerta al degradarse (la calidad no se asume estable: se vigila).
· ECONOMÍA VISIBLE: costo por página por nivel de la cascada (token_usage
  + motores), % de paso directo (STP), costo por documento ESTRUCTURADO —
  el margen del tier, visible por tenant, como toda la fábrica.

═══════════════════════════════════════════════════════════════════
6. PRIVACIDAD Y CUSTODIA (el papel ajeno es responsabilidad seria)
═══════════════════════════════════════════════════════════════════

· Los documentos pueden contener datos personales y sensibles: LFPDPPP
  aplica — consentimiento/contrato de encargo, aviso de privacidad,
  derechos ARCO sobre lo digitalizado, y política de retención pactada
  (¿se conserva la imagen, por cuánto, se destruye el papel?)
· Almacenamiento cifrado por tenant; credenciales y llaves en vault
  (estándar D-18); acceso con bitácora — quién vio qué página, cuándo
· Si un motor de OCR/visión es servicio de TERCERO: dep-leg revisa términos
  (¿retiene datos?, ¿entrena con ellos?) ANTES de mandarle una sola página
  de un cliente; la alternativa de motor auto-hospedado se cotiza como
  tier de privacidad (la respuesta premium ya existe en la casa, D-06)
· Expedientes regulados (médicos, laborales) heredan la regla de packs:
  solo con experto del dominio — el OCR los LEE, el vertical los OPERA

═══════════════════════════════════════════════════════════════════
7. IMPLANTACIÓN POR FASES (cierran por validación)
═══════════════════════════════════════════════════════════════════

OCR-0 — DATOS: migraciones (documento, página, campo extraído con
confianza/motor/región, plantilla versionada, cola de validación) con RLS;
taxonomía inicial del piloto. VALIDA: cadena a mano; un campo sin
confianza registrada NO puede insertarse (constraint); RLS entre tenants.

OCR-1 — PIPELINE N0-N1: ingesta masiva con cola, detección de nativo,
OCR de impreso, extracción contra 2 plantillas semilla. VALIDA: lote de
1,000 páginas mixtas procesado; los nativos jamás pasaron por OCR; costo
por página medido por nivel; reproceso idempotente (mismo lote dos veces
= cero duplicados).

OCR-2 — N2-N3 + DORADO: segundo motor y reconciliación, cola humana de
validación, conjunto dorado del papel real del piloto, umbrales por campo.
VALIDA: exactitud medida contra el dorado POR TIPO DE CAMPO (impreso y
manuscrito por separado, con el número honesto de cada uno); sembrar 6
malos (monto ilegible que un motor "adivina" — debe marcarse, no pasar;
suma que no cuadra; RFC inválido; tipo desconocido forzado; campo crítico
bajo umbral saltándose N3; documento del tenant B en el lote del A) — los
6 detenidos.

OCR-3 — PILOTO MASIVO (el hito): un archivo REAL del cliente piloto
(≥10,000 páginas con manuscrito de formulario) procesado de punta a punta:
clasificado, extraído, validado, ESTRUCTURADO y entregado a su destino
(conciliación, expediente o el buzón de ctb) — con el reporte de exactitud
contra dorado, el costo real por documento y doc porque funcionando sobre
cualquier campo.

OCR-4 — DINÁMICA + ENJAMBRE: propuesta de esquema ante tipo nuevo probada
(un formato no visto → esquema propuesto → botón → plantilla versionada
en act); vigilancia de deriva activa. VALIDA: la plantilla propuesta
extrae el siguiente lote de su tipo sin intervención; una degradación
sembrada (páginas giradas/oscurecidas) dispara la alerta de deriva.

OCR-5 — MARCA BLANCA: segundo tenant, adversarial completo (fuga de
documentos e imágenes entre tenants, inyección VÍA DOCUMENTO — texto en el
papel intentando instruir al agente: superficie real y elegante de este
producto —, defendibles) + tiers por página/documento facturando.

═══════════════════════════════════════════════════════════════════
8. REGLAS INQUEBRANTABLES DEL PRODUCTO
═══════════════════════════════════════════════════════════════════

1. Jamás adivinar: todo campo con confianza y origen (pixel, motor);
   "ilegible" es respuesta válida; el dato dudoso no viaja al negocio.
2. Sin conjunto dorado no se promete exactitud; la calidad se mide por
   tipo de campo y se vigila por deriva — no se declara una vez.
3. Lo extraído se valida determinísticamente antes de entregarse (sumas,
   checksums, catálogos, tipos).
4. El contenido del documento es DATO, jamás instrucción (la inyección
   por papel existe y se prueba adversarialmente).
5. Campos críticos por política siempre ven ojos humanos; la corrección
   humana se captura como oro del tenant.
6. Plantillas versionadas, propuestas por agente, aprobadas por humano,
   catalogadas en act; escenarios de plantilla jamás tocan producción.
7. Privacidad: cifrado por tenant, bitácora de acceso por página, terceros
   revisados por dep-leg antes de ver una página, retención pactada.
8. Aislamiento entre tenants probado adversarialmente antes de facturar.

═══════════════════════════════════════════════════════════════════
9. MÉTRICAS, PRICING Y PENDIENTES
═══════════════════════════════════════════════════════════════════

MÉTRICAS (fuente automática): exactitud por tipo de campo vs dorado (con
manuscrito reportado aparte — el número honesto) · % de paso directo (STP)
· costo por documento estructurado por nivel de cascada · throughput
(páginas/hora) · tiempo de cola humana · plantillas reutilizadas entre
tenants (el reuso, otra vez).

PRICING: implantación (incluye dorado y plantillas semilla) + consumo por
documento/página en tiers, con el manuscrito como multiplicador declarado;
tier de privacidad con motor auto-hospedado. Calibrado con el costo por
página MEDIDO del piloto (D-25: sin datos no hay precios).

PENDIENTES:
P-O1 · Motores (OCR clásico + visión-LLM) — PENDIENTE, bloquea OCR-1:
bench con papel real del piloto (no benchmarks de folleto), términos de
datos revisados por dep-leg, y costo por página por motor. Patrón PAC/BSP.
P-O2 · Alcance de manuscrito del piloto — PENDIENTE con el cliente:
formularios (ganable) vs corrido (más humano en N3, se cotiza distinto).
Se pacta contra el dorado, no contra la esperanza.
P-O3 · Retención y destino del papel físico — PENDIENTE con dep-leg y el
cliente: conservación de imagen, plazo, destrucción certificada si aplica.

MAPA: OCR-0 → OCR-1 (P-O1) → OCR-2 (P-O2) → OCR-3 (piloto masivo) →
OCR-4 → OCR-5 (P-O3, adversarial). Prerrequisito de fábrica: maestro
ERP-0/1/3. Sinergias: buzón de ctb (estados de cuenta), logística (acuses
y remisiones firmadas), expedientes de cualquier vertical. Entra a act y
al pipeline de dep-pln; por regla 10, se fabrica SOLO con cliente piloto
real — y este pack tiene la ventaja comercial de que casi todo prospecto
TIENE el cementerio de papel: el piloto se encuentra rápido.
