# Validación de oportunidad — SaaS agent-to-agent para seguros de mercancía (México)

> **Etapa:** discovery / validación de mercado (un paso ANTES de un blueprint de
> producto como los de `ocr/`, `crm/`, `logistica/`). Fuente: investigación externa
> con 31 referencias citadas (ver §Referencias al final). Integrado al repo el 2026-07-15.
> **Veredicto de la investigación:** oportunidad comercial viable, condicionada a un
> ciclo de discovery de 30 días (10–20 entrevistas) antes de comprometer desarrollo.

---

## 0. Encaje con Hermes OS · A2A (lectura del proyecto)

Esta oportunidad NO es un producto ajeno: es casi un caso de uso de manual para la
arquitectura que ya existe. El mapeo pieza-por-pieza:

| Lo que pide la oportunidad | Lo que Hermes OS ya tiene | Qué habría que construir |
|---|---|---|
| SaaS **agent-to-agent** (intake→scoring→comparación→recomendación) | El patrón A2A completo (card + executor + cliente), vivo en `grafo-a2a` y `ventas-a2a`; servicios hermanos en `hermes-net` | 4 servicios A2A nuevos (un agente por paso), reusando el patrón |
| Carga **regulatoria** (CNSF, LISF, Reglamento de Agentes de Seguros) | El **grafo** con su dimensión `regulatorio`/`contractual` y la regla de oro "señala, no asesora, cita fuente" | Nueva jurisdicción-dimensión: MX + seguros/intermediación, seed citando LISF + Reglamento |
| **Construir** el MVP por fases | El **trío** (Ejecutor+Supervisor, Fase 6) y el **enjambre** (Coordinador, Fase 7), con gates deterministas | Nada de infra: se le encargan tareas con criterios de aceptación |
| **Vender** a brokers/insurtechs | El departamento de **adquisición** (Fase 9): `ventas-a2a`, tabla `leads`, edge público con card A2A | ICP y oferta propios (es venta B2B externa = white-label/producto) |
| Datos de embarques, cotizaciones, pólizas | **Supabase** (service_role, RLS) — mismo patrón que `facturas`/`token_usage` | Esquema `embarques`/`cotizaciones`/`polizas` |

**Dos alineaciones con los principios del proyecto que refuerzan el veredicto:**

1. **"Citar fuentes, no inventar" aplicado a coberturas.** El *agente de comparación de
   cobertura* (§7, caso 3) interpreta condiciones generales en PDF para extraer coberturas,
   exclusiones y deducibles. Eso es EXACTAMENTE la disciplina del grafo/facturas: cada
   afirmación de cobertura debe citar la cláusula, jamás alucinar. Un "sí cubre robo" sin
   la cláusula que lo respalda es el mismo bug que un veredicto fiscal sin fuente.

2. **El riesgo regulatorio del §6.4 lo desactiva el propio grafo.** La investigación advierte
   que la plataforma NO debe asumir intermediación (presentar propuestas, recabar
   aceptaciones) sin licencia CNSF, o debe operar aliada a un agente/corredor autorizado.
   Ese es precisamente el tipo de bandera que el grafo levanta con fuente (LISF Art. 91 y
   ss., Reglamento de Agentes) — "copiloto, no autopiloto": la plataforma es apoyo analítico,
   la intermediación y la relación contractual siguen en manos del agente autorizado. La
   arquitectura ya encarna la mitigación que el documento recomienda.

**Qué se reusa vs qué es nuevo (resumen):**
- **Se reusa (cero arquitectura nueva):** patrón A2A, grafo (extendido por seed), trío/enjambre
  para construir, Supabase, edge público, pipeline de adquisición, gate humano en lo irreversible.
- **Es nuevo (dominio):** seed regulatorio de seguros MX, parser de condiciones generales por
  aseguradora, esquema de intake de embarque, motor de comparación/recomendación, y las
  relaciones/datos con aseguradoras (que la propia investigación marca como el mayor riesgo
  de integración, §6.3).

**Encuadre estratégico (no lo cambies sin discovery):** el ICP son actores EXTERNOS
(brokers, insurtechs, forwarders) — esto es una línea de **producto white-label**, distinta
de los departamentos internos que operan la fábrica de la dueña. Vive como oportunidad, no
como fase comprometida del ROADMAP, hasta que el discovery de 30 días (§9) confirme dolor,
frecuencia y disposición de pago. El wedge recomendado (multicotizador + cockpit de
recomendación, sin emisión ni siniestros al inicio) encaja con "acotar antes de escalar".

**Siguiente paso concreto:** correr el ciclo de discovery de §9 (hipótesis, perfiles a
entrevistar, preguntas, criterios seguir/pivotear/descartar) antes de escribir un PRP. Si
pasa el gate, el PRP reusa el patrón de Fase 5/9 (servicio A2A + card honesta con fronteras
negativas) y el de blueprint de producto de `ocr/`/`crm/`.

---

## 1. Resumen ejecutivo

El mercado de seguros de carga y mercancías en México es relevante en tamaño (alrededor de 1,2 mil millones de dólares en 2024 con crecimiento proyectado a 1,73 mil millones para 2033) y atraviesa un proceso de digitalización incompleto, con alta dependencia en intermediarios humanos y procesos manuales. Los seguros de carga cubren robos, daños, pérdidas y averías durante el tránsito, y son clave para empresas que mueven mercancía por carretera, mar, aire o ferrocarril.[^1][^2][^3][^4][^5]

Los principales pains detectados se relacionan con: alta complejidad en coberturas y tipos de póliza, procesos de cotización y comparación poco estandarizados, fuerte carga documental, tiempos de respuesta lentos y fricciones en reclamaciones y siniestros, especialmente en rutas de alto riesgo por robo. Aunque existen aseguradoras grandes con productos de transporte (GNP, HDI, AXA, Chubb, MAPFRE, Sura, GMX, entre otras) y brokers especializados, la orquestación comparativa multi-aseguradora a nivel de embarque sigue, en gran medida, apoyándose en correo, Excel y portales independientes.[^6][^7][^8][^3][^4][^9][^10][^11][^12][^13][^14]

Los segmentos con mayor potencial para una solución SaaS agent-to-agent son: brokers especializados en carga, insurtechs logísticas, freight forwarders medianos que no tienen tecnología propia avanzada, operadores 3PL con exposición significativa a robo y averías, y empresas importadoras/exportadoras con alta frecuencia de embarques. Estos actores tienen incentivos claros para optimizar selección de aseguradora, cobertura y proceso operativo, ya que el costo de un siniestro mal gestionado puede ser muy alto y la presión competitiva por responder rápido a clientes es creciente.[^3][^4][^12][^15][^13][^14][^16][^1]

La recomendación inicial para el MVP es enfocarse en un motor de recomendación y comparación de aseguradoras para seguros de carga (pólizas por viaje o declarativas), orientado a brokers e insurtechs logísticas, integrado primero como cockpit operativo y multicotizador especializado, antes de intentar automatizar emisión o siniestros en profundidad. Este wedge aprovecha patrones ya conocidos en otros ramos (multicotizadores, simuladores de seguros de auto) pero adaptados al ramo de transporte de mercancías, donde la digitalización es menor y el dolor operativo mayor.[^17][^18][^19][^20][^21][^16]

Veredicto preliminar: existe una oportunidad comercial viable, pero requiere un enfoque muy específico en segmentos con volumen, apertura a SaaS y disposición a colaborar en integración de datos de embarques y riesgos; el éxito dependerá de encontrar 3–5 clientes piloto dispuestos a co-diseñar el flujo y validar la propuesta de valor alrededor de ahorro de tiempo, mejor selección de cobertura y reducción de errores en la operación documental.[^2][^15][^16][^3]

## 2. Cómo funciona hoy el mercado

### Actores principales

En México, el seguro de transporte de mercancías o seguro de carga protege los bienes en tránsito contra robos, accidentes, daños por manipulación, fenómenos naturales y pérdidas totales o parciales. Las coberturas incluyen riesgos ordinarios de tránsito (incendio, colisión, volcadura, varadura, hundimiento), avería particular y responsabilidad civil hacia terceros.[^4][^5][^1]

Los actores clave son: instituciones aseguradoras que diseñan y suscriben los productos; agentes y brokers de seguros autorizados por la Comisión Nacional de Seguros y Fianzas (CNSF); intermediarios logísticos como freight forwarders y operadores 3PL; y los dueños de la carga (importadores, exportadores, fabricantes y distribuidores). La CNSF regula a las aseguradoras y a los agentes de seguros, que requieren autorización, examen de capacidad técnica y cumplimiento de requisitos para realizar actividades de intermediación.[^22][^23][^15][^24][^25][^3]

### Tipos de póliza frecuentes

Las fuentes especializadas describen varias modalidades de póliza de carga: pólizas por viaje (para envíos únicos), pólizas abiertas (para múltiples viajes entre un mismo origen y destino), pólizas flotantes (para cargas frecuentes hacia distintos destinatarios) y pólizas declarativas (en las que se comunica cada embarque a la aseguradora). También existen pólizas anuales para cargas continuas y regulares, especialmente para empresas con alto volumen de embarques recurrentes. Estas modalidades permiten ajustar la prima, alcance y deducibles según el tipo de mercancía, ruta, frecuencia y valor asegurado.[^5][^14][^1][^4]

### Aseguradoras relevantes y concentración

Varias aseguradoras grandes en México tienen productos explícitos de transporte de carga y mercancías, incluyendo GNP, GMX, HDI, AXA, MAPFRE, Sura y Chubb, que ofrecen coberturas para mercancías en tránsito nacional e internacional y permiten armar coberturas según las necesidades del negocio. La presencia de múltiples jugadores con productos similares sugiere un mercado con cierto grado de competencia y opciones, más que totalmente concentrado, aunque los datos de participación por aseguradora no son públicos en detalle a nivel de ramo de carga.[^7][^8][^9][^10][^11][^26][^12][^27][^6][^2]

Insurtechs como SafeLink Marine y Zuru Logistics Insurtech se posicionan como actores especializados en seguros de carga y gestión de riesgo logístico, ofreciendo seguros de carga, contenedor y responsabilidad civil, además de herramientas de gestión de riesgo con inteligencia artificial y tracking de contenedores. Estas insurtechs se integran con aseguradoras tradicionales para ofrecer productos más adaptados a rutas de alto riesgo y a la necesidad de visibilidad operacional.[^28][^29][^15][^13][^16][^3]

### Papel de brokers, agentes, forwarders y operadores logísticos

La Ley de Instituciones de Seguros y Fianzas y el Reglamento de Agentes de Seguros y Fianzas definen que los agentes, personas físicas o morales, son intermediarios que intercambian propuestas y aceptaciones de seguros y asesoran sobre contratación, conservación o modificación de pólizas. Para operar como agente o corredor de seguros se requiere autorización de la CNSF, cumplimiento de requisitos formales y acreditación de capacidad técnica mediante examen, además de contar con seguro de responsabilidad civil por errores y omisiones.[^23][^15][^25][^22]

En la práctica, muchos dueños de carga recurren a brokers o agentes especializados en seguros de carga para cotizar y contratar pólizas, mientras que freight forwarders y 3PL pueden ofrecer seguros como servicio complementario, ya sea mediante convenios con aseguradoras o brokers. Estos intermediarios manejan gran parte de la operación cotidiana: solicitar cotizaciones, revisar condiciones, emitir pólizas o certificados de seguro, gestionar endosos y apoyar en siniestros, normalmente mediante correo, hojas de cálculo y portales de cada aseguradora.[^12][^15][^18][^20][^3][^5][^17]

## 3. ICP y segmentos prioritarios

### Segmentos candidatos

Los tipos de empresas que parecen ser clientes probables para una plataforma agent-to-agent de seguros de mercancía incluyen:[^15][^13][^16][^3][^12]

- Brokers de seguros especializados en transporte de carga y comercio exterior, que ya manejan múltiples aseguradoras y tipos de póliza.
- Insurtechs logísticas (por ejemplo, Zuru Logistics Insurtech, SafeLink Marine) que buscan diferenciarse mediante gestión de riesgo y soluciones digitales.[^29][^13][^16][^3][^28]
- Freight forwarders medianos y grandes, que concentran volúmenes importantes de embarques y frecuentemente coordinan seguros para sus clientes.[^5][^12][^15]
- Operadores 3PL y empresas de autotransporte con exposición relevante a robo y daños en rutas de alto riesgo.[^30][^3][^15]
- Empresas importadoras y exportadoras con alto volumen de operaciones, que frecuentemente requieren pólizas flotantes o declarativas.[^14][^4][^5]

### Buyer persona y usuario operativo

En brokers y agencias de seguros, el buyer suele ser el director o socio del broker, mientras que el usuario diario es un ejecutivo de suscripción, ejecutivo de cuentas o personal de operaciones de pólizas, que prepara cotizaciones, compara condiciones y captura datos en sistemas internos. En freight forwarders y 3PL, el buyer puede ser el gerente de operaciones o de riesgo/seguridad, y el usuario operativo suele ser un ejecutivo de tráfico, operaciones o customer service, responsable de gestionar cada embarque, solicitar seguro y coordinar la documentación.[^18][^31][^20][^12][^23][^5]

En empresas importadoras/exportadoras, el comprador se ubica en el área de procurement logístico, tesorería o gestión de riesgos, mientras que los usuarios diarios incluyen analistas de logística, coordinadores de transporte y personal de seguros. La solución propuesta se alinea con perfiles que ya manejan datos de embarques (tipo de mercancía, ruta, valor, incoterms) y necesitan tomar decisiones repetidas sobre aseguradoras y coberturas.[^4][^14][^5]

### Señales de disposición de compra y adopción SaaS

Las señales de capacidad de pago y disposición a adoptar software incluyen: volumen elevado de embarques y uso frecuente de seguros de carga; exposición a rutas de alto riesgo donde la criminalidad contra autotransporte es significativa; dependencia en seguros de carga para proteger activos y evitar pérdidas financieras graves; y presión por reducir tiempos de respuesta al cliente. Empresas y brokers que ya utilizan TMS, WMS o sistemas internos, y que han adoptado herramientas digitales para otros ramos (por ejemplo, multicotizadores de auto, simuladores de seguros) muestran mayor probabilidad de adopción de una solución SaaS especializada.[^19][^31][^20][^21][^1][^3][^12][^15][^18][^14]

Insurtechs como Zuru y SafeLink demuestran un apetito del mercado por soluciones tecnológicas en seguros de carga, incluyendo gestión de riesgo con IA y monitoreo digital, lo cual sugiere apertura a soluciones agent-to-agent si se conectan con sus flujos existentes.[^13][^16][^3][^28][^29][^15]

## 4. Problemas y fricciones del proceso actual

### Cotización y comparación

Actualmente, la cotización de seguros de carga implica determinar el tipo de mercancía, ruta, medio de transporte, valor asegurado y nivel de cobertura deseado, y posteriormente cotizar con varias aseguradoras o brokers para comparar precio y alcance de coberturas. Fuentes educativas y blogs recomiendan comparar diferentes opciones, revisar condiciones generales, restricciones, deducibles y cláusulas específicas antes de contratar, ya que las aseguradoras difieren en qué riesgos cubren y bajo qué condiciones.[^1][^14][^4][^5]

Sin embargo, no existe un multicotizador masivo especializado en seguros de carga como los simuladores disponibles para seguros de autos, por lo que la comparación suele hacerse de forma manual mediante hojas de cálculo, correos y llamadas. Los agentes de seguros están obligados a explicar de manera amplia y detallada el alcance real de la cobertura, pero esto se apoya en documentos PDF y textos legales difíciles de comparar entre compañías, generando riesgo de errores y malentendidos.[^27][^20][^21][^12][^23][^19][^4]

### Emisión y documentación

Para contratar un seguro de carga adecuado, se deben llenar solicitudes de seguro, declarar el valor real de la mercancía, comunicar cada embarque en pólizas declarativas y mantener registrados certificados, endosos y condiciones generales. Las aseguradoras suelen exigir documentación específica para la activación de cobertura y para reclamaciones, incluyendo facturas, documentos de transporte, reportes de siniestro y fotografías, entre otros.[^6][^7][^27][^4]

Muchos procesos de emisión y endoso siguen siendo manuales o semi-manuales, mediante portales propios de cada aseguradora, correos y carga de PDF, sin integración directa con TMS o sistemas logísticos, lo que obliga a capturar datos de embarques dos veces y genera riesgo de errores de captura.[^31][^7][^12][^27]

### Siniestros y reclamaciones

En caso de siniestro (robo, accidente, daños), el asegurado debe avisar inmediatamente a la aseguradora, reunir documentación y seguir procedimientos de reclamación que pueden ser complejos y variar entre aseguradoras. La falta de visibilidad sobre coberturas específicas, exclusiones y requisitos documentales puede llevar a reclamaciones rechazadas o a tiempos de indemnización prolongados, especialmente cuando la información del embarque no está centralizada y trazable.[^15][^14][^6][^1][^4][^5]

Las insurtechs enfocadas en transporte anotan que las altas tasas de criminalidad contra el autotransporte hacen crítica la gestión adecuada del riesgo y de los seguros de carga, pero no describen una digitalización completa del proceso de siniestros, lo que sugiere espacios para mejorar trazabilidad y seguimiento.[^3][^30][^15]

### Dolores predominantes

Los dolores más frecuentes parecen concentrarse en: complejidad documental y legal (condiciones generales, exclusiones, cláusulas), dificultad para comparar coberturas y deducibles entre aseguradoras, tiempos de respuesta en cotización y emisión, riesgo de rechazo de siniestros por errores en declaración o documentación, y falta de visibilidad unificada de pólizas y certificados a nivel de embarque. El precio es importante, pero las fuentes enfatizan más la necesidad de comprender la relación entre coberturas, deducibles y exclusiones, y de reducir pérdidas asociadas a siniestros mal gestionados o no cubiertos.[^23][^27][^14][^1][^3][^4][^15]

## 5. Panorama competitivo

### Soluciones digitales e insurtechs existentes

En México y Latam existen insurtechs centradas en seguros de transporte y carga, como SafeLink Marine y Zuru Logistics Insurtech, que ofrecen seguros de carga y herramientas de gestión de riesgo con inteligencia artificial y tracking en tiempo real. Zuru Max, lanzado en colaboración con Chubb y AI27, se presenta como una solución integral que combina monitoreo digital, evaluación de riesgos por rutas y servicios de recuperación, orientada a reducir impacto de robos y siniestros.[^16][^28][^29][^13][^3][^15]

Artículos de la Asociación Insurtech en México destacan que la principal labor de una insurtech en transporte de carga es crear un ecosistema tecnológico y digital que beneficie a todas las partes, incluyendo aseguradoras, brokers y clientes finales, pero no describen una solución genérica de multicotización multi-aseguradora a nivel de embarque.[^3][^15]

### Software para agencias y multicotizadores

Existen plataformas de gestión para agencias de seguros que ayudan con seguimiento de pólizas, documentación, contabilidad y creación de informes, y software multicotizador para agentes que permite cotizar diversos productos aseguradores de forma simultánea e inmediata, principalmente en ramos como autos y gastos médicos. Asimismo, simuladores públicos de seguros de auto, como el de CONDUSEF, permiten comparar beneficios y precios entre aseguradoras de ese ramo.[^20][^21][^18][^19]

Sin embargo, no se identifican públicamente plataformas multicotizadoras especializadas en seguros de carga para México, con foco en variables logísticas avanzadas (tipo de mercancía, ruta, historial de siniestros, modalidad de transporte, tiempos de respuesta y facilidad operativa), lo que sugiere un gap competitivo específico.[^12][^18][^14][^20]

### Herramientas sustitutas actuales

Las herramientas sustitutas que el mercado utiliza hoy incluyen: Excel y hojas de cálculo para comparar cotizaciones y registrar pólizas; correo electrónico y llamadas para solicitar cotizaciones y coordinar emisión; portales propios de cada aseguradora para carga de datos y emisión de certificados; y sistemas internos (ERP, TMS, WMS, CRM) que no están integrados directamente con las aseguradoras en el ramo de carga.[^7][^17][^18][^31][^20][^12]

TMS como Logistaas o soluciones combinadas con plataformas de telemetría como Samsara buscan simplificar procesos de transporte y reducir accidentes, pero su foco primario es operativo/logístico, no la orquestación de seguros de carga multi-aseguradora. Esto abre la posibilidad de un módulo o capa especializada en seguros que se conecte con estos sistemas fuente.[^31][^30]

### Gaps competitivos

Los principales gaps competitivos identificados son:

- Falta de un multicotizador especializado en seguros de carga que conecte varias aseguradoras y brokers con lógica de recomendación basada en riesgo, cobertura y desempeño operativo.[^18][^14][^20][^12]
- Ausencia de una vista unificada de pólizas, certificados y coberturas por embarque en herramientas logísticas estándar, generando duplicidad de captura y falta de trazabilidad documental.[^7][^12][^31]
- Poca estandarización en formatos y flujos entre aseguradoras, lo que dificulta automatizar procesos de declaración de embarques y emisión de certificados.[^27][^23][^15]
- Limitada digitalización del proceso de siniestros, con poca visibilidad agregada de tiempos de respuesta, tasas de rechazo y desempeño por aseguradora, variables críticas para recomendar al "mejor" asegurador por tipo de embarque.[^4][^15][^3]

Estos huecos sugieren espacio para una solución SaaS agent-to-agent que funcione como capa de orquestación entre sistemas logísticos de clientes y múltiples aseguradoras/brokers, enfocada primero en comparación y recomendación, y posteriormente en automatización de documentación y siniestros.

## 6. Viabilidad del MVP

### Mejor wedge inicial

El wedge comercial más viable parece ser un multicotizador especializado y cockpit operativo para seguros de carga, dirigido inicialmente a brokers e insurtechs con cartera de clientes logísticos, que permita:

- Ingestar datos de embarque (mercancía, ruta, valor, modalidad de transporte) desde Excel o API simple.[^14][^1][^4]
- Generar comparaciones estructuradas de cotizaciones entre aseguradoras, con estandarización de coberturas, deducibles y exclusiones.[^5][^14][^4]
- Recomendar aseguradora y tipo de póliza según reglas de riesgo y preferencias del cliente.

Este wedge se inspira en soluciones de otros ramos (multicotizadores, simuladores CONDUSEF) que han demostrado al mercado el valor de comparar rápidamente opciones de varias aseguradoras. Focalizarse en brokers que ya tienen relación con varias aseguradoras reduce la necesidad de negociar integraciones directas con cada compañía en la fase inicial, ya que el flujo puede empezar con captura semi-manual de cotizaciones.[^21][^19][^20][^23][^18]

### Dependencias mínimas y datos requeridos

Para recomendar al asegurador más óptimo se requieren al menos los siguientes datos:

- Tipo de mercancía (categoría de riesgo, sensibilidad a daños, valor por unidad).[^1][^4][^5]
- Ruta (origen, destino, tramo, presencia de zonas de alto riesgo por robo o accidentes).[^30][^15][^14]
- Modalidad de transporte (carretera, marítimo, aéreo, ferroviario, multimodal).[^1][^4][^5]
- Valor asegurado y condiciones comerciales (Incoterms, responsabilidad contractual).[^14][^4][^5]
- Historial de siniestros del cliente y, idealmente, de la aseguradora por tipo de ruta (cuando esté disponible).[^29][^15][^3]

En una primera fase, estos datos pueden capturarse desde sistemas fuente como ERP, TMS, WMS o incluso plantillas de Excel, evitando integraciones profundas y permitiendo un MVP funcional a través de carga de archivos o formularios web. La complejidad de integración aumenta cuando se busca sincronizar automáticamente embarques en tiempo real desde TMS, pero esto puede ser un roadmap posterior.[^20][^18][^31]

### Riesgos de integración

Los principales riesgos de integración incluyen: diversidad de sistemas fuente entre clientes (ERP, TMS, WMS, CRM, hojas de cálculo); ausencia de APIs estándar por parte de las aseguradoras para cotizar y emitir pólizas de carga; variabilidad en formatos y requisitos documentales entre compañías; y resistencia de aseguradoras a abrir interfaces para terceros sin relación contractual clara.[^15][^27][^31][^7]

Por ello, la viabilidad inicial del MVP se basa en diseñar flujos que funcionen con input de datos estructurados (CSV, Excel, formularios) y output de comparaciones y recomendaciones, dejando la emisión y siniestros aún en portales de aseguradoras o herramientas propias de brokers. La solución puede evolver hacia integraciones específicas con insurtechs ya conectadas a aseguradoras (por ejemplo, mediante colaboración con Zuru o SafeLink), reduciendo el número de conexiones directas necesarias.[^13][^17][^16][^29][^18][^20][^3][^15]

### Riesgos regulatorios

La regulación mexicana establece que la actividad de intermediación de seguros está reservada a agentes autorizados, personas físicas o morales, que cumplen requisitos y cuentan con cédula otorgada por la CNSF. Un software de apoyo operativo que ayude a comparar, documentar y gestionar información sobre seguros puede operar como herramienta de soporte, pero si la plataforma asumiera directamente funciones de intermediación (presentar propuestas, recabar aceptaciones, asesorar sobre contratación en nombre de aseguradoras) podría requerir autorización o tener que operar aliada con un agente o corredor autorizado.[^25][^22][^23][^15]

Esto implica que el MVP debe diseñarse explícitamente como plataforma para brokers, agentes o insurtechs con licencia, evitando posicionarse como intermediario directo frente al cliente final sin respaldo regulatorio, y cuidando la forma en que se presentan recomendaciones (como apoyo analítico basado en datos, pero la decisión final y la relación contractual siguen siendo del agente/aseguradora).[^25][^23][^15]

> **Nota de integración (Hermes OS):** este riesgo es exactamente la clase de bandera que
> el **grafo** levanta con fuente citada (dimensión regulatorio/contractual). En el diseño
> del PRP, la superficie de la plataforma debe declarar fronteras negativas literales —el
> patrón de `ventas-a2a` (Fase 9): *no intermedia, no cierra pólizas, no asesora en nombre
> de la aseguradora*— y todo lo que toque intermediación pasa por el agente autorizado.

## 7. Casos de uso agent-to-agent

### Lista priorizada de casos de uso

A partir del análisis de procesos actuales y gaps, los casos de uso agent-to-agent con mayor sentido económico y operativo serían:

1. **Agente de intake de embarque**: captura semi-automatizada de datos de embarques (mercancía, ruta, valor, modalidad) desde Excel, TMS o formularios, con normalización y validación básica.
2. **Agente de scoring de riesgo**: evaluación del riesgo del embarque según tipo de mercancía, ruta (zonas de alto riesgo), modalidad y exposición histórica a siniestros.[^29][^30][^15]
3. **Agente de comparación de cobertura**: interpretación de condiciones generales de las aseguradoras (PDF) para extraer coberturas, exclusiones y deducibles relevantes para ese tipo de embarque.[^23][^27][^4]
4. **Agente de recomendación de asegurador**: motor que combina precio, cobertura y desempeño (por ejemplo, tiempos de respuesta históricos, tasas de rechazo) para sugerir al agente humano qué aseguradora utilizar para cada embarque.[^3][^29][^14]
5. **Agente de validación documental**: chequeo de documentación requerida para activar cobertura y preparar reclamaciones (facturas, documentos de transporte, evidencias), comparando contra listas de requisitos de cada aseguradora.[^6][^7][^4]
6. **Agente de seguimiento de siniestro**: tablero que orquesta actualizaciones de estado de siniestros, recordatorios de documentación y tiempos de respuesta, conectado con correo y portales existentes.[^6][^4][^1]
7. **Agente de cumplimiento**: soporte para agentes y brokers en obligaciones regulatorias (informar alcance real de cobertura, conservar documentación, evitar errores y omisiones).[^25][^23]

### Agentes a construir primero

Para un MVP, tendría sentido priorizar:

- Agente de intake de embarque.
- Agente de scoring de riesgo básico (reglas heurísticas, no necesariamente modelos avanzados al inicio).
- Agente de comparación de cobertura, limitado a un conjunto acotado de aseguradoras y tipos de póliza comunes.
- Agente de recomendación de asegurador.

Estos agentes se alinean directamente con el wedge de multicotización y recomendación, y pueden operar inicialmente con datos estructurados y condiciones generales digitalizadas, sin depender de integraciones profundas con sistemas de aseguradoras.[^27][^20][^4][^14]

### Tareas humanas que seguirían siendo necesarias

Incluso con agentes especializados, seguirían siendo indispensables:

- La decisión final de recomendación y contratación por parte del agente o broker autorizado, que asume responsabilidad ante el cliente.[^23][^25]
- La negociación de condiciones particulares con aseguradoras, especialmente en casos complejos o clientes grandes.
- La relación comercial con aseguradoras, inclusión de productos en el portafolio y gestión de comisiones.
- La gestión de siniestros que requiere juicio humano y negociación, aunque apoyada en información y alertas automatizadas.[^4][^15][^6]

## 8. Recomendación de MVP

### Problema principal a atacar primero

El problema prioritario es la ineficiencia y riesgo en la selección y operación de seguros de carga para cada embarque, causada por procesos manuales de cotización, comparación y documentación entre múltiples aseguradoras, con alta complejidad legal y variabilidad de coberturas. Esto se traduce en tiempo perdido, errores de captura, posibles brechas de cobertura y reclamaciones rechazadas, especialmente en empresas con alto volumen de embarques.[^12][^15][^27][^14][^4]

### ICP inicial

El ICP inicial recomendado es:

- Brokers y agentes de seguros especializados en carga y comercio exterior con cartera de empresas logísticas y exportadoras.
- Insurtechs de logística y seguros de carga que ya trabajan con aseguradoras y buscan ampliar su oferta digital.[^28][^16][^13][^29][^3]

Estos segmentos ya operan la intermediación regulada, tienen relación con múltiples aseguradoras y manejan suficiente volumen para justificar inversión en mejora de procesos.

### Propuesta de valor inicial

Una propuesta de valor clara podría ser:

"Plataforma SaaS de orquestación y recomendación para seguros de carga que ayuda a brokers e insurtechs a escoger la mejor aseguradora y póliza para cada embarque, reduciendo tiempos de cotización y errores documentales, y mejorando la trazabilidad de coberturas y siniestros".[^20][^15][^4]

Beneficios esperados:

- Menos tiempo en cotizar y comparar, con estandarización de condiciones y deducibles.
- Reducción de errores en declaración de embarques y documentación.
- Mayor visibilidad de qué aseguradora es óptima por tipo de ruta y mercancía.

### Flujo mínimo de producto

Un flujo mínimo (MVP) podría incluir:

1. Alta de cliente y definición de parámetros generales de riesgo (tipos de mercancía, rutas frecuentes).
2. Captura o importación de datos de embarque (Excel o API simple).
3. Llamadas a agentes internos de scoring y comparación para generar un panel de opciones de aseguradoras (precio, coberturas, deducibles, tiempos estimados de respuesta).[^14][^20][^4]
4. Recomendación de aseguradora y póliza (por viaje, flotante, declarativa) con explicación básica.
5. Generación de un resumen estandarizado para registrar la decisión y vincularla a la documentación de emisión en el portal de la aseguradora.

### Datos mínimos requeridos

Los datos mínimos incluyen: tipo de mercancía, ruta, modalidad de transporte, valor asegurado, cliente, póliza base disponible (si es póliza abierta o flotante), y resultados de cotizaciones existentes. Adicionalmente, se puede capturar información sobre siniestros pasados y preferencias del cliente (priorizar precio vs cobertura amplia).[^5][^1][^4][^14]

### Métrica de éxito temprana

Las métricas de éxito tempranas podrían ser:

- Reducción del tiempo promedio de cotización y comparación por embarque (por ejemplo, de horas/días a minutos).[^19][^20]
- Reducción del número de errores documentales detectados en siniestros o auditorías internas.
- Porcentaje de embarques gestionados a través de la plataforma vs proceso tradicional.
- Número de clientes piloto que renuevan el uso y están dispuestos a pagar por la solución tras periodo de prueba.

## 9. Roadmap de validación comercial (30 días)

### Hipótesis a validar

En las primeras 4–6 semanas, se deberían validar hipótesis como:

1. Los brokers e insurtechs perciben la selección de aseguradora por embarque como un dolor operativo relevante y recurrente.
2. Están dispuestos a centralizar información de embarques y pólizas en una plataforma externa.
3. Están dispuestos a pagar por un SaaS que les ahorre tiempo y reduzca errores, aunque la plataforma no emita pólizas directamente.
4. Es posible obtener datos suficientes (cotizaciones, condiciones generales) para alimentar un motor de comparación sin integraciones profundas iniciales.
5. Las aseguradoras no bloquean el uso de una capa externa de apoyo para brokers, siempre que la intermediación siga en manos autorizadas.[^22][^15][^23]

### Perfiles de empresas a entrevistar (10–20)

Perfiles recomendados:

- 4–6 brokers/agentes de seguros especializados en transporte de carga y comercio exterior (incluyendo al menos uno con enfoque en rutas de alto riesgo).[^12][^15]
- 3–4 insurtechs de logística y seguros de carga (por ejemplo, empresas con ofertas similares a SafeLink y Zuru).[^16][^13][^29][^3]
- 3–4 freight forwarders medianos con operaciones internacionales y volumen constante de embarques.[^5][^12]
- 2–3 operadores 3PL/autotransporte con exposición relevante a robo y daños.[^30][^15]
- 2–3 empresas importadoras/exportadoras con pólizas flotantes o abiertas y procesos internos robustos.

### Preguntas clave de discovery

Algunas preguntas clave:

- ¿Cómo cotizas y comparas hoy seguros de carga para tus clientes? ¿Qué herramientas usas?
- ¿Cuánto tiempo te toma, en promedio, preparar una cotización y seleccionar aseguradora para un embarque complejo?
- ¿Qué partes del proceso consideras más dolorosas (documentación, comparación de coberturas, tiempos de respuesta, siniestros)?
- ¿Cuántas aseguradoras manejas en este ramo y cómo gestionas las diferencias en condiciones generales?
- ¿Has tenido reclamaciones rechazadas o problemas recurrentes por errores de declaración o documentación? ¿Qué impacto económico han tenido?
- ¿Qué tipo de solución ideal imaginarías para reducir estos dolores? ¿Qué datos estarías dispuesto a compartir con una plataforma SaaS?
- ¿Qué obstáculos regulatorios o de relación con aseguradoras ves para usar una herramienta de recomendación y comparación?

### Criterios para decidir seguir, pivotear o descartar

Decisión de seguir:

- Al menos 5–7 entrevistas confirman dolor recurrente y disposición a probar un piloto.
- Se identifican 2–3 clientes dispuestos a co-diseñar flujo y compartir datos de embarques.
- No se detectan barreras regulatorias insalvables si la plataforma opera como apoyo para agentes/brokers autorizados.

Decisión de pivotear:

- Se detecta que el mayor dolor está en siniestros y reclamaciones, más que en cotización/comparación, sugiriendo pivot hacia cockpit de siniestros.
- Las aseguradoras son reticentes a que terceros manejen lógica de recomendación, pero los brokers están interesados en automatizar documentación.

Decisión de descartar:

- Los actores clave no consideran suficiente el dolor como para pagar por una solución adicional.
- La mayoría ya tiene soluciones internas o insurtechs que cubren las necesidades con baja fricción.
- La regulación y las políticas de aseguradoras dificultan la operación de una plataforma independiente.

## 10. Limitaciones

### Información no pública

No se encuentran datos públicos detallados de participación por aseguradora en el ramo de seguros de carga en México, ni estadísticas abiertas sobre tiempos de respuesta en siniestros, tasas de rechazo o desempeño operativo por compañía. Tampoco hay evidencia pública de APIs estándar abiertas para cotización y emisión de seguros de transporte de carga en México, más allá de iniciativas específicas de insurtechs y plataformas cerradas.[^2][^13][^16][^15][^3]

### Supuestos que requieren entrevistas

Varias inferencias clave requieren validación por entrevistas:

- El nivel real de digitalización en brokers y forwarders, más allá de marketing de insurtechs.[^15][^3]
- La disposición de actores a centralizar información sensible de embarques en una plataforma externa.
- La tolerancia de aseguradoras a que se use una lógica de recomendación multi-aseguradora externa.
- El valor económico concreto (tiempo, reducción de errores, mejora de selección de aseguradora) que los clientes perciben.

Estos puntos deben abordarse en discovery estructurado antes de avanzar a desarrollo de MVP.

## Conclusión ejecutiva (una página)

El nicho de seguros de mercancía en México muestra condiciones favorables para explorar una solución SaaS agent-to-agent enfocada en comparación y recomendación de aseguradoras por embarque, pero su atractivo depende de un diseño cuidadoso del ICP, del wedge y de la alineación con la regulación vigente. El mercado de seguros de carga tiene tamaño suficiente y crece de forma sostenida, con múltiples aseguradoras ofreciendo productos similares, lo que genera necesidad de herramientas de diferenciación y selección inteligente. Al mismo tiempo, la elevada criminalidad contra el autotransporte y la complejidad de coberturas hacen que las consecuencias de errores en seguros de carga sean económicamente significativas para empresas logísticas e importadoras/exportadoras.[^26][^2][^7][^6][^1][^3][^15][^14]

¿Para quién vale la pena? Principalmente para brokers especializados en carga, agentes de seguros con cartera logística, e insurtechs como Zuru y SafeLink que ya operan productos y servicios en este nicho. También para freight forwarders medianos y operadores 3PL que desean mejorar su propuesta de valor al cliente ofreciendo seguros más eficientes y trazables. Estos actores manejan múltiples aseguradoras, viven el dolor de procesos manuales y se enfrentan a exigencias crecientes de sus clientes en rapidez, claridad y seguridad. Para ellos, una plataforma que orqueste datos de embarques, reglas de cobertura y desempeño de aseguradoras puede convertirse en una ventaja competitiva clara.[^28][^13][^31][^16][^29][^3][^12][^5]

El punto de entrada más conveniente es un MVP centrado en multicotización y recomendación: una capa de orquestación que ingesta datos de embarques, estructura opciones de pólizas de varias aseguradoras y ofrece una recomendación transparente al agente o insurtech, manteniendo la intermediación regulada en manos autorizadas. Este enfoque permite demostrar valor en tiempos de respuesta y calidad de selección, utilizando integraciones ligeras (CSV, formularios, conexión mínima con TMS) antes de comprometerse con emisiones automatizadas o gestión integral de siniestros. El motor agent-to-agent puede operar inicialmente con agentes de intake, scoring y comparación, dejando para fases posteriores la automatización profunda de siniestros y cumplimiento.[^21][^18][^19][^31][^20][^4]

¿Qué no debería construirse todavía? No conviene intentar en la primera fase:

- Un "marketplace" directo al cliente final que actúe como intermediario regulado sin asociarse a agentes autorizados, por los riesgos regulatorios.[^22][^25][^23]
- Una solución que prometa emisión automática multi-aseguradora sin haber resuelto primero estandarización de datos y acuerdos específicos con cada compañía.[^7][^27][^15]
- Un cockpit de siniestros altamente automatizado basado en datos que hoy no son fácilmente accesibles (tasas de rechazo, tiempos de respuesta por aseguradora).

En resumen, el nicho sí vale la pena explorar para un equipo de desarrollo SaaS con IA, siempre que se enfoque en un MVP acotado, B2B, aliado con brokers e insurtechs autorizados, orientado a demostrar rápidamente ahorro de tiempo, reducción de errores y mejor transparencia en la selección de aseguradora para seguros de carga. El próximo paso lógico es ejecutar un ciclo de discovery de 30 días con entrevistas a 10–20 actores clave para confirmar la severidad del problema, la frecuencia, la disposición de pago y la viabilidad operativa, y, a partir de ahí, decidir si avanzar, pivotear hacia siniestros/documentación o descartar la oportunidad.[^2][^16][^3][^15]

---

## Referencias

1. [Seguro de Transporte de Carga en México](https://hanseatica.com/seguro-de-carga-mexico/) - El costo de un seguro de transporte de carga internacional en México depende del tipo de mercancía, ...

2. [Mercado de Seguros de Carga en México 2033](https://www.imarcgroup.com/report/es/mexico-cargo-insurance-market) - El tamaño del mercado de seguros de carga en México alcanzó los USD 1,245.5 millones en 2025. De car...

3. [Las Insurtech en los seguros de transporte y carga](https://asociacioninsurtech.mx/las-insurtech-en-los-seguros-de-transporte-y-carga/) - Para ZURU LATAM, la principal labor de una Insurtech es crear un ecosistema tecnológico y digital qu...

4. [Los beneficios de contratar un seguro de carga para el ...](https://www.andresycia.com/noticias-consejos/los-beneficios-de-contratar-un-seguro-de-carga-para-el-transporte-de-mercancias/) - Cobertura por avería particular: cubre la pérdida o daño parcial de la mercancía por causas inherent...

5. [Seguro de Mercancías: Todo lo que Necesita Saber](https://alianza-logistics.com/seguro-de-mercancias-todo-lo-que-necesita-saber/) - Este seguro cubre los riesgos asociados con el transporte, incluyendo daños, pérdida o robo de las m...

6. [Seguro de Mercancías y Transporte de Carga](https://www.mapfre.com.mx/empresas/seguros-empresariales/seguro-transporte-carga/) - El seguro de mercancías de MAPFRE protege la carga en tránsito ante accidentes, averías y actos deli...

7. [Seguro de transporte de mercancías](https://www.gnp.com.mx/seguro-empresarial-de-danos-en-mercancias) - También conocido como "carga", el seguro de transporte de mercancías, es un servicio de protección f...

8. [HDI Transporte: cuidamos tu mercancía](https://www.hdi.com.mx/empresas/hdi-transporte/) - Arma tu seguro con base en las necesidades de tu negocio, contratando solo las coberturas que tu mer...

9. [Transporte de Mercancía](https://www.segurossura.com.mx/pymes/transporte-de-mercancia/) - Brinda protección ante los riesgos más comunes a los que puede estar expuesta tu mercancía durante s...

10. [Seguros de Transporte de Carga y Mercancías](https://www.chubb.com/mx-es/empresas/transporte-de-carga-y-mercancias.html) - Un Seguro de Transporte de Carga brinda protección inmediata a los bienes durante su traslado de un ...

11. [Seguro de Carga en Tránsito protección de mercancía](https://www.gmx.com.mx/seguros/transportes-y-aviacion/carga-en-transito.html) - El Seguro de Carga en Tránsito de GMX protege tu mercancía contra robos y riesgos del transporte. Te...

12. [Seguros de Carga en México](https://transporte.mx/seguros-de-carga/) - El seguro de carga (también llamado seguro de transporte de mercancías) protege el valor económico d...

13. [SafeLink Marine: Seguros de Carga y Transporte](https://www.safelinkmexico.com/) - Ofrecemos seguros de carga, contenedor y responsabilidad civil para transporte terrestre, aéreo, mar...

14. [How to Choose the Best Cargo Insurance in Mexico](https://www.youtube.com/watch?v=69tk1HpOuR4) - Guía para Contratar un Seguro de Carga Internacional ¿Sabías que un error al transportar tus mercanc...

15. [Seguros de carga: las legislaciones en México y ...](https://www.safelinkmexico.com/blog/seguros-de-carga-las-legislaciones-en-mexico-y-centroamerica/) - Ante la enorme tasa de criminalidad contra el autotransporte, las legislaciones enfocadas en seguros...

16. [Zuru Logistics Insurtech](https://zurulatam.com/) - Con Zuru tienes acceso a herramientas de protección, gestión de riesgo con inteligencia artificial, ...

17. [Seguro de Transporte de Carga y Mercancía](https://surexs.com/seguros/danos-rc/seguro-transporte-carga-mercancia-empresas) - Con Surexs, compara aseguradoras, optimiza condiciones y administra tu póliza con soporte técnico du...

18. [Software para corredurías de seguros](https://www.capterra.mx/directory/31282/p&c-insurance/software) - Sistema de gestión de agencias que ayuda a las empresas de seguros con el seguimiento de pólizas, la...

19. [Todo sobre cómo cotizar seguro de auto en línea](https://www.bbva.mx/educacion-financiera/seguros/como-cotizar-seguro-auto-en-linea.html) - Quieres asegurar tu coche? Conoce paso a paso cómo cotizar seguro de auto en línea. Ahorra tiempo, p...

20. [Software Multicotizadores para Agentes](https://blog.segutrends.com/blog/software/software-multicotizadores-para-agentes) - Un software multicotizador es una plataforma que permite a los agentes de seguros cotizar diferentes...

21. [Simulador de seguro de autos](https://webappsos.condusef.gob.mx/SimuladorSeguroAutomovil/entradas-tabs.jsp) - Compara los beneficios de cada producto que se ajustan a tu presupuesto: ¿Hasta cuánto puedes gastar...

22. [de los agentes de seguros y de fianzas - CNSF Interactiva](https://lisfcusf.cnsf.gob.mx/LISF/LISF_4_2_S1) - Las autorizaciones podrán otorgarse para realizar actividades de intermediación en las operaciones y...

23. [Unidad 3. Agente de seguros](https://gc.scalahed.com/recursos/files/r161r/w24032w/r_u4_01.pdf) - El Reglamento de Agentes de Seguros y de Fianzas establece: Que los intermediarios de seguros y pers...

24. [Agentes e intermediarios - Base de datos](https://www.datos.gob.mx/dataset/agentes_intermediarios) - Listado de los asesores externos de seguros registrados ante la CNSF, vigentes al 2025. Incluye nomb...

25. [Agentes de Seguros y de Fianzas Personas Físicas](https://www.gob.mx/cnsf/documentos/agentes-de-seguros-y-o-fianzas) - Con fundamento en el artículo 93 de la LISF, para el ejercicio de la actividad de agente de seguros ...

26. [Seguro Daños Marítimo | AXA México - Portal Público](https://axa.mx/seguro-danos/maritimo-transporte) - El Seguro de Transportes Carga otorga protección a una amplia gama de bienes cuando éstos son transp...

27. [SEGURO DE TRANSPORTES DE CARGA](https://www.hdi.com.mx/wp-content/uploads/2023/04/cg-seguro-de-transporte-cnsf-s0027-0458-2022-condusef-005601-02.pdf) - 3.3.1 Para el Medio de Transporte terrestre, las mercancías y/o bienes asegurados bajo esta Póliza p...

28. [insurtech.accelerator basada en USA, invierte en ZURU](https://www.startuplinks.world/noticias/insurtech-accelerator-basada-en-usa-invierte-en-zuru) - insurtech.accelerator, la aceleradora de insurtechs líder en Latam, ha decidido sumarse como inversi...

29. [Chubb, Zuru Logistics Insurtech y AI27 lanzan "Zuru Max"](https://chubb.mediaroom.com/chubb_zuru_logistics_y_ai27_lanzan_zuru_max) - Zuru Max fue diseñado para ofrecer una solución integral que combina monitoreo digital, evaluación d...

30. [TMS – Samsara, binomio orientado a favorecer ...](https://t21.com.mx/tms-samsara-binomio-orientado-a-favorecer-operadores-y-seguridad-vial/) - La alianza estratégica tiene como, con el ambicioso objetivo de reducir un 24% los accidentes durant...

31. [Transformando el transporte de carga en México](https://logistaas.com/es/transformando-el-transporte-de-carga-en-mexico-como-el-tms-de-vanguardia-de-logistaas-esta-cambiando-el-juego/) - Un Sistema de Gestión de Transporte (TMS) es una plataforma diseñada para simplificar los procesos c...

[^1]: https://hanseatica.com/seguro-de-carga-mexico/
[^2]: https://www.imarcgroup.com/report/es/mexico-cargo-insurance-market
[^3]: https://asociacioninsurtech.mx/las-insurtech-en-los-seguros-de-transporte-y-carga/
[^4]: https://www.andresycia.com/noticias-consejos/los-beneficios-de-contratar-un-seguro-de-carga-para-el-transporte-de-mercancias/
[^5]: https://alianza-logistics.com/seguro-de-mercancias-todo-lo-que-necesita-saber/
[^6]: https://www.mapfre.com.mx/empresas/seguros-empresariales/seguro-transporte-carga/
[^7]: https://www.gnp.com.mx/seguro-empresarial-de-danos-en-mercancias
[^8]: https://www.hdi.com.mx/empresas/hdi-transporte/
[^9]: https://www.segurossura.com.mx/pymes/transporte-de-mercancia/
[^10]: https://www.chubb.com/mx-es/empresas/transporte-de-carga-y-mercancias.html
[^11]: https://www.gmx.com.mx/seguros/transportes-y-aviacion/carga-en-transito.html
[^12]: https://transporte.mx/seguros-de-carga/
[^13]: https://www.safelinkmexico.com/
[^14]: https://www.youtube.com/watch?v=69tk1HpOuR4
[^15]: https://www.safelinkmexico.com/blog/seguros-de-carga-las-legislaciones-en-mexico-y-centroamerica/
[^16]: https://zurulatam.com/
[^17]: https://surexs.com/seguros/danos-rc/seguro-transporte-carga-mercancia-empresas
[^18]: https://www.capterra.mx/directory/31282/p&c-insurance/software
[^19]: https://www.bbva.mx/educacion-financiera/seguros/como-cotizar-seguro-auto-en-linea.html
[^20]: https://blog.segutrends.com/blog/software/software-multicotizadores-para-agentes
[^21]: https://webappsos.condusef.gob.mx/SimuladorSeguroAutomovil/entradas-tabs.jsp
[^22]: https://lisfcusf.cnsf.gob.mx/LISF/LISF_4_2_S1
[^23]: https://gc.scalahed.com/recursos/files/r161r/w24032w/r_u4_01.pdf
[^24]: https://www.datos.gob.mx/dataset/agentes_intermediarios
[^25]: https://www.gob.mx/cnsf/documentos/agentes-de-seguros-y-o-fianzas
[^26]: https://axa.mx/seguro-danos/maritimo-transporte
[^27]: https://www.hdi.com.mx/wp-content/uploads/2023/04/cg-seguro-de-transporte-cnsf-s0027-0458-2022-condusef-005601-02.pdf
[^28]: https://www.startuplinks.world/noticias/insurtech-accelerator-basada-en-usa-invierte-en-zuru
[^29]: https://chubb.mediaroom.com/chubb_zuru_logistics_y_ai27_lanzan_zuru_max
[^30]: https://t21.com.mx/tms-samsara-binomio-orientado-a-favorecer-operadores-y-seguridad-vial/
[^31]: https://logistaas.com/es/transformando-el-transporte-de-carga-en-mexico-como-el-tms-de-vanguardia-de-logistaas-esta-cambiando-el-juego/
