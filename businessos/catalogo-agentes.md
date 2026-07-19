# Catalogo de agentes fabricables (demanda de mercado 2025-2026)

> Investigacion de mercado (2026-07-18, fan-out de 2 subagentes Sonnet con busqueda web, sintesis
> curada). Proposito: cuando un cliente pida "un agente de X", ya existe la ficha con su senal de
> demanda y su ICONO representativo (enchufa directo al sistema visual del ser-ia:
> `src/features/indicador-actividad/`, generacion con `--refs` de la imagen fuente).
> Los 8 del mazo actual (`cliente-web2/src/features/landing/agents.ts`) estan marcados (mazo).
> Catalogo VIVO: crece con pedidos reales; re-validar demanda ~cada 6 meses (la data envejece).

## A. Top 20 funciones horizontales (cualquier PYME)

Fuentes principales: Zapier AI agents survey 2026, Salesforce Agentforce, Relevance/Lindy
marketplaces, Gartner/Deloitte, digitalapplied, atera, herohunt, chatsell. [Probable] salvo nota.

| # | Rol | Que hace | Demanda | Icono |
|---|---|---|---|---|
| 1 | Soporte / Atencion (mazo) | Tickets, triage, primer nivel | MUY ALTA (41% empresas; $0.62 vs $7.40/contacto) | auricular/diadema |
| 2 | Datos / Analitica (mazo) | Analisis y reportes | MUY ALTA (caso #1 encuesta Zapier, 60%) | tablero de graficos |
| 3 | Comercial / CRM (mazo) | Prospecta, califica, agenda, cierra | MUY ALTA (Agentforce SDR; template #1 Relevance) | diana con flecha |
| 4 | Marketing / Contenido (mazo) | Genera y distribuye contenido | MUY ALTA (96% adopcion en content marketers) | megafono con ondas |
| 5 | RRHH / Reclutamiento | Sourcing, screening CVs, entrevistas | MUY ALTA (69% ya usa IA; 52% planea agentes) | lupa-persona |
| 6 | IT Helpdesk interno | Tickets L1, accesos, troubleshooting | MUY ALTA (74% ya desplego; -55% backlog) | llave-tuerca |
| 7 | Atencion por WhatsApp | Vende/atiende por WhatsApp Business | MUY ALTA (canal #1 LATAM, 90%+ penetracion) | logo-mensaje |
| 8 | SEO / Growth organico | Audita, optimiza, monitorea posicionamiento | MUY ALTA (ROI 11.4x reportado por agencias) | lupa-flecha-arriba |
| 9 | Legal / Compliance (mazo) | Contratos, KYC, alertas regulatorias | ALTA (80% equipos legales adopto/evalua) | balanza |
| 10 | Finanzas / Presupuesto (mazo) | Concilia, forecast, cierre | ALTA (cierre 30-50% mas rapido) | calculadora+monedas |
| 11 | Cobranza | Negocia pagos, gestiona morosidad | ALTA (60%+ contactos sin humano; 3x acuerdos) | recibo |
| 12 | Onboarding de empleados | Documentacion, accesos, capacitacion | ALTA (prioridad #1 CHROs 2026, Gartner) | puerta |
| 13 | Agendamiento / Citas | Reserva, confirma, reduce no-shows | ALTA (no-shows -30/50%; salud 26.1% CAGR) | calendario |
| 14 | Compras / Procurement | Sourcing, RFQ, aprobacion de PO | ALTA (86% escalara en 2026; -16% gasto) | carrito |
| 15 | Operaciones / Logistica (mazo) | Inventario, rutas, forecasting | ALTA (41% usa IA en supply chain) | caja+rutas |
| 16 | Investigacion / Research | Mercado, competencia, reportes citados | ALTA (mayor cuota del mercado de agentes ~25%) | libro |
| 17 | Email management | Clasifica, redacta, enruta correo | MEDIA (68% equipos usa IA en email) | sobre |
| 18 | QA / Testing | Genera y corre pruebas de regresion | MEDIA (72% QA usa IA; poco operacionalizado) | insecto |
| 19 | Ciberseguridad / SOC | Triage de alertas, respuesta a incidentes | MEDIA (Gartner: 50% SOCs con IA en 2026) | escudo-candado |
| 20 | Web3 / Pagos on-chain (mazo) | Settlement cripto, escrow, conciliacion | MEDIA (nicho cripto-nativo, no PYME mainstream) | moneda-cadena |

**Lectura:** los 8 del mazo estan validados; el mas debil en demanda PYME real es Web3 (nicho).
Los 3 candidatos con evidencia mas fuerte para el proximo build: **RRHH/Reclutamiento, IT Helpdesk
y Atencion por WhatsApp** (canal dominante LATAM). SEO merece carta propia separada de Marketing.

## B. ~40 agentes verticales por industria (PYME LATAM/Espana)

Contexto: Gartner proyecta 80% de adopcion de agentes verticales en 2026 (gasto vertical 36.5% CAGR
vs 18.9% generica); en LATAM WhatsApp es la capa operativa (99% de PYMES, CEPAL). Fuentes: aurorainbox,
teamroma, aerochat, trichter, locate2u, tubot, cifrato, normina, automationanywhere, entre otras.

| Industria | Agente | Que hace | Demanda | Icono |
|---|---|---|---|---|
| Salud/Clinicas | Agendador de citas | Agenda/confirma/reprograma por WhatsApp | ALTA (no-show 20-30% -> 8-12%) | calendario |
| Salud/Clinicas | Recordatorios anti-no-show | Recordatorio 24h/2h con confirmar/reagendar | ALTA | campana |
| Salud/Clinicas | Triage/preclasificacion | Motivo y urgencia sin datos sensibles | MEDIA (limite normativo) | estetoscopio |
| Restaurantes | Reservas de mesa | Fecha/hora/comensales, alternativas | ALTA | mesa |
| Restaurantes | Pedidos y delivery | Pedido+cobro+estado por WhatsApp | ALTA (evita comision 20-30% de apps) | moto-entrega |
| Restaurantes | Feedback/reactivacion | Encuesta post-consumo, promos | MEDIA | estrella |
| Retail/E-comm | Recuperador de carrito | Reactiva venta abandonada | ALTA (recupera 25-35% vs 8-12% email) | carrito |
| Retail/E-comm | Vendedor de catalogo 24/7 | Navega catalogo, upsell conversacional | ALTA | vitrina |
| Retail/E-comm | Devoluciones/postventa | Cambios y devoluciones solo | MEDIA | caja-devolucion |
| Inmobiliaria | Calificador de leads | Frio/tibio/caliente 24/7 (BANT) | ALTA (+35-50% conversion) | embudo |
| Inmobiliaria | Agendador de visitas | Coordina citas a propiedades | ALTA | casa |
| Inmobiliaria | Avaluo preliminar | Estima precio del inmueble | MEDIA | regla |
| Seguros | Cotizador de polizas | Cotizacion instantanea por riesgo | ALTA (estandar en carga MX) | cotizacion |
| Seguros | Gestor de siniestros (FNOL) | Documentacion y seguimiento | ALTA | expediente |
| Seguros | Mercancia en transito | Monitorea envio asegurado, alerta siniestro | ALTA (oportunidad ya validada por a2a en MX) | camion-candado |
| Educacion | Asistente de admisiones | Leads de aspirantes, inscripcion/becas | ALTA (caso UNC Argentina) | birrete |
| Educacion | Tutor de refuerzo | Practica y retroalimentacion | MEDIA | libro |
| Turismo/Hoteles | Reservas conversacional | Booking completo por WhatsApp | ALTA (Asksuite/HiJiffy/Visito) | llave-habitacion |
| Turismo/Hoteles | Concierge virtual | Room service, recomendaciones, upsell | MEDIA | campana-servicio |
| Construccion | Cotizador de presupuestos | Presupuesto de obra desde lenguaje natural | ALTA (60-150h/mes -> 8-15h) | casco |
| Construccion | Analizador de licitaciones | Extrae requisitos de pliegos PDF | MEDIA | lupa-documento |
| Transporte/Logistica | Dispatch/ruteo | Reasigna entregas, conductor mas cercano | ALTA (Locate2u) | mapa-ruta |
| Transporte/Logistica | Tracking conversacional | Estado de envio (WISMO) | ALTA | paquete-gps |
| Agro | Asesor agronomico | Plagas/fertilizacion/riego por WhatsApp | MEDIA (FarmerChat 1M+ agricultores) | hoja |
| Agro | Precios de mercado | Cotizacion de commodities | MEDIA | grafica-moneda |
| Belleza/Spas | Agendador y recordatorio | Reserva y confirma; no-show -40/60% | ALTA | tijeras |
| Belleza/Spas | Fidelizacion/cross-sell | Tratamientos complementarios, llena agenda | MEDIA | brillo |
| Gimnasios | Agendador de clases | Clases grupales y lista de espera | MEDIA | mancuerna |
| Gimnasios | Retencion/cobranza | Recordatorio de pago, riesgo de baja | MEDIA | tarjeta-pago |
| Contadores | Causacion y conciliacion | Facturas, bancos, SAT/DIAN/SII/SUNAT | ALTA (Cifrato, CONTPAQi) | factura |
| Contadores | Atencion fiscal | Dudas de nomina/facturacion | MEDIA | balanza-chat |
| Abogados/Notarias | Intake legal/triage | Capta caso, clasifica urgencia y area | MEDIA (ahorra 15-20h/abogado/semana) | contrato |
| Abogados/Notarias | Generador de documentos | Minutas, validacion de poderes | MEDIA (Croowly) | pluma |
| Talleres mecanicos | Cotizador por foto | Presupuesto desde fotos del dano | ALTA (-60/80% llamadas) | camara-foto |
| Talleres mecanicos | Seguimiento de reparacion | Estado del vehiculo, upsell | MEDIA | auto-check |
| Veterinarias | Agendador y vacunas | Citas, desparasitacion, vacunas | ALTA (Converpilot, Tecca) | hueso |
| Veterinarias | Triage de emergencias | Orienta urgencia | MEDIA | cruz-veterinaria |
| Farmacias | Disponibilidad y pedido | Stock y pedido a domicilio | ALTA | pastilla |
| Farmacias | Recordatorio de recompra | Alerta de tratamiento cronico | MEDIA | reloj-pastilla |
| Manufactura | Control de calidad visual | Vision detecta defectos en linea | ALTA (-30/50% defectos) | camara-calidad |
| Manufactura | Reorden de inventario | Predice demanda, ajusta compras | ALTA (hasta -30% inventario) | caja-inventario |

**Lecturas para el negocio:**
- El patron **agendamiento + recordatorio + anti-no-show** se repite en salud, belleza, veterinarias
  y talleres: mismo esqueleto tecnico, catalogo distinto -> candidato natural a PLANTILLA reusable.
- **Seguros de mercancia en transito**: el mercado ya vende cotizacion/siniestros/tracking SIN IA
  (Transcargo, GMX, MAPFRE, HDI) -> hueco para diferenciarse con agente; a2a ya valido la
  oportunidad en Mexico.
- **Retail y logistica** tienen la evidencia cuantitativa mas solida (25-35% recuperacion de
  carrito; 40-50% consultas de flota automatizadas) -> mejores cifras para pitch comercial.

## Como agregar una carta nueva al mazo/ser-ia

1. Tomar la ficha de este catalogo (rol + icono).
2. Generar la imagen con `image-generation` usando `--refs src/features/indicador-actividad/exploracion/ser-ia-fuente.png` (consistencia de personaje) y el icono como herramienta en el pecho.
3. Registrar en `agents.ts` (landing) y/o en el array SHAPES de `ser-ia.vN.html`.
Regla de iconos (cross-check 2026-07-18): un solo elemento visual dominante por carta; el lenguaje
"grafico/chart" es EXCLUSIVO de Datos/Analitica; sin chispas/sparkles (leen "IA generica"); evitar
falsos amigos (engranaje=ajustes, lupa sola=buscar, embudo=filtrar salvo funnel inmobiliario).
