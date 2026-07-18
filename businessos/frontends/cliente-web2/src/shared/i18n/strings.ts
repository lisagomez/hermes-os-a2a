// Diccionario bilingüe ES/EN de la landing de A2A Factory.
// Español es el idioma primario. Portado 1:1 de landing-reference.dc.html.

export type Lang = 'es' | 'en';
export type Shopper = 'human' | 'a2a';

export interface Strings {
  brandTbd: string;
  modeHuman: string;
  modeA2A: string;
  ctaCall: string;
  ctaCards: string;
  heroBadge: string;
  heroTitle1: string;
  heroTitle2: string;
  heroSub: string;
  chip1: string;
  chip2: string;
  chip3: string;
  termTitle: string;
  step1k: string;
  step1t: string;
  step1d: string;
  step2k: string;
  step2t: string;
  step2d: string;
  step3k: string;
  step3t: string;
  step3d: string;
  cardsTitle: string;
  cardsSub: string;
  cardsHint: string;
  btnDemo: string;
  deckKicker: string;
  deckTitle: string;
  deckSub: string;
  deckEmpty: string;
  quoteTitle: string;
  quoteAgents: string;
  quoteEnergy: string;
  quoteSetup: string;
  quoteMonthly: string;
  quoteNote: string;
  quoteCta: string;
  panelKicker: string;
  panelTitle: string;
  panelSub: string;
  panelB1: string;
  panelB2: string;
  panelB3: string;
  dashTitle: string;
  kpi1: string;
  kpi2: string;
  kpi3: string;
  kpiWeek: string;
  kpiSaved: string;
  projTitle: string;
  tabOps: string;
  tabFin: string;
  tabProj: string;
  fin1: string;
  fin2: string;
  fin3: string;
  finAlert: string;
  projNote: string;
  act1: string;
  act2: string;
  act3: string;
  a2aKicker: string;
  a2aTitle: string;
  a2aSub: string;
  simBadge: string;
  calKicker: string;
  calTitle: string;
  calSub: string;
  calSim: string;
  calPick: string;
  calConfirm: string;
  calDone: string;
  calAgain: string;
  demoLabel: string;
  demoReplay: string;
  demoAdd: string;
  footer: string;
  // Añadidos para la integración web2 (formulario de lead)
  leadName: string;
  leadEmail: string;
  leadCompany: string;
  leadSending: string;
  leadOk: string;
  leadErr: string;
  // Sección Oficina A2A (OfficeSim)
  officeKicker: string;
  officeTitle: string;
  officeSub: string;
  officeMeeting: string;
  officeCafe: string;
  officeCenter: string;
  officeCta: string;
  stWorking: string;
  stIdle: string;
  stWalking: string;
  stClosing: string;
}

const es: Strings = {
  brandTbd: 'nombre por definir',
  modeHuman: 'Humano',
  modeA2A: 'Agente A2A',
  ctaCall: 'Agendar llamada',
  ctaCards: 'Ver A2A Cards',
  heroBadge: 'CLI-FIRST · AGENT-TO-AGENT · END-TO-END',
  heroTitle1: 'Fábrica de agentes de IA:',
  heroTitle2: 'de tu caso de uso al panel de control.',
  heroSub:
    'Adaptamos cada proyecto con inteligencia artificial de principio a fin — agentes a la medida de tu caso de uso y alcance, con panel operativo y financiero, control de presupuesto y proyección.',
  chip1: 'setup en semanas',
  chip2: 'panel ops + finanzas',
  chip3: 'humanos opcionales',
  termTitle: 'demo en vivo',
  step1k: 'DESCUBRIMIENTO',
  step1t: 'Tu caso de uso X, alcance Y',
  step1d:
    'Cuéntanos (o que tu agente nos consulte por protocolo) qué necesitas y hasta dónde. La IA mapea el proyecto completo.',
  step2k: 'FÁBRICA',
  step2t: 'Adaptación con IA, end-to-end',
  step2d:
    'Ensamblamos y entrenamos los agentes exactos para tu operación. Sin plantillas genéricas: cada pieza se adapta a tu flujo.',
  step3k: 'CONTROL',
  step3t: 'Panel operativo y financiero',
  step3d:
    'Entregamos un panel con métricas de operación, control de presupuesto y proyección. Tú ves todo; los agentes trabajan.',
  cardsTitle: 'Elige a tu equipo',
  cardsSub:
    'Cada especialidad es una carta. Abre su demo funcional, revisa sus stats y añádela a tu mazo para cotizar.',
  cardsHint: '⚡ = energía (coste relativo)\n▶ demo = simulador funcional',
  btnDemo: 'Demo',
  deckKicker: 'TU MAZO',
  deckTitle: 'Arma tu mazo de agentes',
  deckSub:
    'El mazo es tu cotización: añade cartas y mira presupuesto estimado, energía total y tiempo de setup en vivo.',
  deckEmpty: '// mazo vacío — añade cartas desde la sección A2A Cards',
  quoteTitle: 'COTIZACIÓN ESTIMADA',
  quoteAgents: 'Agentes',
  quoteEnergy: 'Energía total',
  quoteSetup: 'Setup estimado',
  quoteMonthly: 'Mensual estimado',
  quoteNote: '// estimación orientativa · la cotización final se adapta a tu caso de uso y alcance',
  quoteCta: 'Cotizar este mazo en una llamada',
  panelKicker: 'ENTREGABLE',
  panelTitle: 'El panel que recibes con tu proyecto',
  panelSub:
    'No entregamos una caja negra: entregamos control. Operación, presupuesto y proyección de tus agentes, en vivo.',
  panelB1: 'Control de presupuesto con alertas de desviación',
  panelB2: 'Proyección financiera a 6 meses, recalculada a diario',
  panelB3: 'Actividad de cada agente, auditada y exportable',
  dashTitle: 'panel.tu-empresa.a2a',
  kpi1: 'PRESUPUESTO USADO',
  kpi2: 'TAREAS DE AGENTES',
  kpi3: 'AHORRO / MES',
  kpiWeek: 'vs semana previa',
  kpiSaved: 'validado por tesoro',
  projTitle: 'PROYECCIÓN DE FLUJO',
  tabOps: 'Operativo',
  tabFin: 'Financiero',
  tabProj: 'Proyección',
  fin1: 'NÓMINA DE AGENTES',
  fin2: 'INFRAESTRUCTURA',
  fin3: 'MARKETING',
  finAlert: 'desviación detectada en infraestructura: −$180 vs plan · corregida por tesoro',
  projNote: 'flujo positivo proyectado desde octubre (+$18.4k)',
  act1: 'cerró oportunidad $1,450 hace 4 min',
  act2: 'canceló 2 suscripciones duplicadas',
  act3: 'reoptimizó rutas del jueves (−74 km)',
  a2aKicker: 'SHOPPER A2A',
  a2aTitle: '¿Eres un agente? Contrata por protocolo.',
  a2aSub:
    'Descubrimiento por manifest, cotización por RPC y settlement en fiat o USDC. Negociación agente-a-agente sin humanos en el loop — salvo que tu humano quiera saludar.',
  simBadge: 'ENDPOINT SIMULADO',
  calKicker: 'HABLEMOS',
  calTitle: 'Agenda una llamada de descubrimiento',
  calSub:
    '30 minutos para mapear tu caso de uso y alcance. Sales con una recomendación de mazo y una estimación honesta.',
  calSim: '// widget simulado — en desarrollo se enlaza a Calendly / Cal.com (solicitar URL)',
  calPick: 'ELIGE FECHA Y HORA',
  calConfirm: 'Confirmar',
  calDone: '¡Llamada agendada!',
  calAgain: 'Cambiar horario',
  demoLabel: 'demo funcional',
  demoReplay: 'Repetir',
  demoAdd: 'Añadir al mazo y cotizar',
  footer: 'hecho por agentes, supervisado por humanos · 2026',
  leadName: 'Tu nombre',
  leadEmail: 'Email de contacto',
  leadCompany: 'Empresa (opcional)',
  leadSending: 'Enviando…',
  leadOk: '¡Recibido! Te contactamos para agendar.',
  leadErr: 'No se pudo enviar. Intenta de nuevo.',
  officeKicker: '● EN VIVO — 8 AGENTES TRABAJANDO',
  officeTitle: 'La oficina A2A',
  officeSub:
    'Así se ve tu equipo por dentro: los 8 agentes trabajando en vivo, moviéndose entre sus escritorios, la sala de reuniones y la zona café. Haz clic en cualquiera para leer su terminal en tiempo real.',
  officeMeeting: 'SALA DE REUNIONES',
  officeCafe: 'ZONA CAFÉ',
  officeCenter: 'CENTRO DE MANDO',
  officeCta: '▶ Demo completa',
  stWorking: 'trabajando',
  stIdle: 'en pausa',
  stWalking: 'moviéndose',
  stClosing: 'cerrando',
};

const en: Strings = {
  brandTbd: 'name TBD',
  modeHuman: 'Human',
  modeA2A: 'A2A Agent',
  ctaCall: 'Book a call',
  ctaCards: 'View A2A Cards',
  heroBadge: 'CLI-FIRST · AGENT-TO-AGENT · END-TO-END',
  heroTitle1: 'An AI agent factory:',
  heroTitle2: 'from your use case to your control panel.',
  heroSub:
    'We tailor every project with AI from start to finish — agents fitted to your use case and scope, with an operational & financial panel, budget control and projections.',
  chip1: 'setup in weeks',
  chip2: 'ops + finance panel',
  chip3: 'humans optional',
  termTitle: 'live demo',
  step1k: 'DISCOVERY',
  step1t: 'Your use case X, scope Y',
  step1d:
    'Tell us (or have your agent query us over protocol) what you need and how far. AI maps the full project.',
  step2k: 'FACTORY',
  step2t: 'AI-tailored, end-to-end',
  step2d:
    'We assemble and train the exact agents your operation needs. No generic templates: every piece adapts to your flow.',
  step3k: 'CONTROL',
  step3t: 'Operational & financial panel',
  step3d:
    'You get a panel with ops metrics, budget control and projections. You see everything; the agents do the work.',
  cardsTitle: 'Pick your team',
  cardsSub:
    'Each specialty is a card. Open its functional demo, check its stats and add it to your deck to get a quote.',
  cardsHint: '⚡ = energy (relative cost)\n▶ demo = functional simulator',
  btnDemo: 'Demo',
  deckKicker: 'YOUR DECK',
  deckTitle: 'Build your agent deck',
  deckSub:
    'Your deck is your quote: add cards and watch estimated budget, total energy and setup time update live.',
  deckEmpty: '// empty deck — add cards from the A2A Cards section',
  quoteTitle: 'ESTIMATED QUOTE',
  quoteAgents: 'Agents',
  quoteEnergy: 'Total energy',
  quoteSetup: 'Estimated setup',
  quoteMonthly: 'Est. monthly',
  quoteNote: '// ballpark estimate · final quote adapts to your use case and scope',
  quoteCta: 'Quote this deck on a call',
  panelKicker: 'DELIVERABLE',
  panelTitle: 'The panel you get with your project',
  panelSub:
    "We don't ship a black box — we ship control. Your agents' operations, budget and projections, live.",
  panelB1: 'Budget control with variance alerts',
  panelB2: '6-month financial projection, recalculated daily',
  panelB3: "Every agent's activity, audited and exportable",
  dashTitle: 'panel.your-company.a2a',
  kpi1: 'BUDGET USED',
  kpi2: 'AGENT TASKS',
  kpi3: 'SAVINGS / MO',
  kpiWeek: 'vs last week',
  kpiSaved: 'validated by tesoro',
  projTitle: 'CASH-FLOW PROJECTION',
  tabOps: 'Operations',
  tabFin: 'Financial',
  tabProj: 'Projection',
  fin1: 'AGENT PAYROLL',
  fin2: 'INFRASTRUCTURE',
  fin3: 'MARKETING',
  finAlert: 'variance detected in infrastructure: −$180 vs plan · corrected by tesoro',
  projNote: 'positive cash flow projected from October (+$18.4k)',
  act1: 'closed $1,450 opportunity 4 min ago',
  act2: 'cancelled 2 duplicate subscriptions',
  act3: 're-optimized Thursday routes (−74 km)',
  a2aKicker: 'A2A SHOPPER',
  a2aTitle: 'Are you an agent? Procure over protocol.',
  a2aSub:
    'Manifest discovery, RPC quoting and settlement in fiat or USDC. Agent-to-agent negotiation with no humans in the loop — unless your human wants to say hi.',
  simBadge: 'SIMULATED ENDPOINT',
  calKicker: "LET'S TALK",
  calTitle: 'Book a discovery call',
  calSub:
    '30 minutes to map your use case and scope. You leave with a deck recommendation and an honest estimate.',
  calSim: '// simulated widget — production links to Calendly / Cal.com (request URL)',
  calPick: 'PICK DATE & TIME',
  calConfirm: 'Confirm',
  calDone: 'Call booked!',
  calAgain: 'Change time',
  demoLabel: 'functional demo',
  demoReplay: 'Replay',
  demoAdd: 'Add to deck & quote',
  footer: 'built by agents, supervised by humans · 2026',
  leadName: 'Your name',
  leadEmail: 'Contact email',
  leadCompany: 'Company (optional)',
  leadSending: 'Sending…',
  leadOk: 'Got it! We\'ll reach out to schedule.',
  leadErr: 'Could not send. Try again.',
  officeKicker: '● LIVE — 8 AGENTS AT WORK',
  officeTitle: 'The A2A office',
  officeSub:
    "Here's what your team looks like inside: all 8 agents working live, moving between their desks, the meeting room and the coffee corner. Click any of them to read its terminal in real time.",
  officeMeeting: 'MEETING ROOM',
  officeCafe: 'COFFEE CORNER',
  officeCenter: 'COMMAND CENTER',
  officeCta: '▶ Full demo',
  stWorking: 'working',
  stIdle: 'idle',
  stWalking: 'moving',
  stClosing: 'closing',
};

export const STRINGS: Record<Lang, Strings> = { es, en };

export function getStrings(lang: Lang): Strings {
  return STRINGS[lang];
}
