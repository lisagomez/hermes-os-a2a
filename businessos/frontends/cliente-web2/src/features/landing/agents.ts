// Los 8 agentes ("A2A Cards"). Portado 1:1 de landing-reference.dc.html.
import type { Lang, Shopper } from '@/shared/i18n/strings';

export type Tone = 'legendary' | 'epic' | 'rare';
export type Orb = 'violet' | 'pink';
export type DemoKind = 'cmd' | 'sys' | 'usr' | 'agt' | 'ok' | 'kpi';

export interface DemoLine {
  k: DemoKind;
  es: string;
  en: string;
}

export const KIND_COLOR: Record<DemoKind, string> = {
  cmd: 'var(--text-1)',
  sys: 'var(--lilac)',
  usr: 'var(--text-3)',
  agt: 'var(--pink-pale)',
  ok: 'var(--success-soft)',
  kpi: 'var(--energy-bright)',
};

export interface Agent {
  id: string;
  name: string;
  glyph: string;
  energy: number;
  tone: Tone;
  orb: Orb;
  role: Record<Lang, string>;
  stats: { aut: number; vel: number; int: number };
  /** Copy divertido (shopper humano) */
  fun: Record<Lang, string>;
  /** Copy técnico (shopper A2A) */
  tech: Record<Lang, string>;
  demo: DemoLine[];
}

export const AGENTS: Agent[] = [
  {
    id: 'vendo',
    name: 'VENDO-1',
    glyph: 'V1',
    energy: 4,
    tone: 'legendary',
    orb: 'violet',
    role: { es: 'Comercial / CRM', en: 'Sales / CRM' },
    stats: { aut: 9, vel: 8, int: 9 },
    fun: {
      es: 'Atiende a tus clientes hasta cuando duermes. Nunca pierde un lead, nunca pide vacaciones.',
      en: 'Talks to your customers even while you sleep. Never drops a lead, never asks for PTO.',
    },
    tech: {
      es: 'Pipeline autónomo: captura, califica y cierra vía API CRM. SLA respuesta < 3 s.',
      en: 'Autonomous pipeline: capture, qualify, close via CRM API. Response SLA < 3 s.',
    },
    demo: [
      { k: 'cmd', es: '$ vendo-1 run --canal whatsapp', en: '$ vendo-1 run --channel whatsapp' },
      { k: 'sys', es: '⚙ conectado a CRM · 14 leads en cola', en: '⚙ connected to CRM · 14 leads queued' },
      { k: 'usr', es: '› cliente: "¿tienen envío a Mérida?"', en: '› customer: "do you ship to Mérida?"' },
      {
        k: 'agt',
        es: '◆ vendo-1: "¡Claro! Llega en 48h. ¿Te aparto uno?"',
        en: '◆ vendo-1: "Of course! Arrives in 48h. Want me to hold one?"',
      },
      {
        k: 'ok',
        es: '✓ lead calificado → oportunidad $1,450 creada en CRM',
        en: '✓ lead qualified → $1,450 opportunity created in CRM',
      },
      { k: 'kpi', es: '▲ conversión +18% esta semana', en: '▲ conversion +18% this week' },
    ],
  },
  {
    id: 'flujo',
    name: 'FLUJO-7',
    glyph: 'F7',
    energy: 3,
    tone: 'epic',
    orb: 'pink',
    role: { es: 'Operaciones / Logística', en: 'Ops / Logistics' },
    stats: { aut: 8, vel: 9, int: 7 },
    fun: {
      es: 'Mueve cajas sin mover un dedo. Tu bodega, pero con reflejos de gato.',
      en: 'Moves boxes without lifting a finger. Your warehouse, but with cat reflexes.',
    },
    tech: {
      es: 'Orquestación de rutas e inventario en tiempo real. Webhooks + EDI.',
      en: 'Real-time route & inventory orchestration. Webhooks + EDI.',
    },
    demo: [
      { k: 'cmd', es: '$ flujo-7 optimizar --rutas hoy', en: '$ flujo-7 optimize --routes today' },
      { k: 'sys', es: '⚙ 42 entregas · 6 vehículos · tráfico en vivo', en: '⚙ 42 deliveries · 6 vehicles · live traffic' },
      { k: 'agt', es: '◆ flujo-7: reordené 3 rutas, ahorro estimado 74 km', en: '◆ flujo-7: reordered 3 routes, est. savings 74 km' },
      { k: 'ok', es: '✓ ETA promedio −22 min · combustible −11%', en: '✓ avg ETA −22 min · fuel −11%' },
      { k: 'kpi', es: '▲ entregas a tiempo: 98.2%', en: '▲ on-time deliveries: 98.2%' },
    ],
  },
  {
    id: 'oraculo',
    name: 'ORÁCULO',
    glyph: 'OR',
    energy: 3,
    tone: 'epic',
    orb: 'violet',
    role: { es: 'Datos / Analítica', en: 'Data / Analytics' },
    stats: { aut: 7, vel: 8, int: 9 },
    fun: {
      es: 'Ve el futuro en tus datos (bueno, casi). Te avisa antes de que algo truene.',
      en: 'Sees the future in your data (well, almost). Warns you before things break.',
    },
    tech: {
      es: 'ETL + modelos de forecast. Alertas por anomalía, queries en lenguaje natural.',
      en: 'ETL + forecast models. Anomaly alerts, natural-language queries.',
    },
    demo: [
      { k: 'cmd', es: '$ oraculo pregunta "¿qué producto caerá en agosto?"', en: '$ oraculo ask "which product dips in August?"' },
      { k: 'sys', es: '⚙ escaneando 18 meses de ventas…', en: '⚙ scanning 18 months of sales…' },
      { k: 'agt', es: '◆ oráculo: SKU-204 caerá ~14% (estacionalidad)', en: '◆ oraculo: SKU-204 will dip ~14% (seasonality)' },
      { k: 'ok', es: '✓ sugerencia: promo cruzada con SKU-118 desde jul 28', en: '✓ suggestion: cross-promo with SKU-118 from Jul 28' },
      { k: 'kpi', es: '▲ precisión del forecast: 92%', en: '▲ forecast accuracy: 92%' },
    ],
  },
  {
    id: 'ledger',
    name: 'LEDGER-X',
    glyph: 'LX',
    energy: 5,
    tone: 'legendary',
    orb: 'pink',
    role: { es: 'Web3 / Pagos on-chain', en: 'Web3 / On-chain payments' },
    stats: { aut: 9, vel: 9, int: 8 },
    fun: {
      es: 'Cobra en cripto mientras tú aprendes qué es un wallet. Gas incluido.',
      en: 'Gets you paid in crypto while you learn what a wallet is. Gas included.',
    },
    tech: {
      es: 'Settlement USDC/fiat, escrow programable, firma multisig, auditoría on-chain.',
      en: 'USDC/fiat settlement, programmable escrow, multisig, on-chain audit.',
    },
    demo: [
      { k: 'cmd', es: '$ ledger-x settle --factura INV-0912 --usdc', en: '$ ledger-x settle --invoice INV-0912 --usdc' },
      { k: 'sys', es: '⚙ escrow verificado · red: base · gas: 0.0003', en: '⚙ escrow verified · network: base · gas: 0.0003' },
      { k: 'agt', es: '◆ ledger-x: 2,400 USDC liberados al proveedor', en: '◆ ledger-x: 2,400 USDC released to vendor' },
      { k: 'ok', es: '✓ tx 0x8f2a…c41 confirmada · recibo en panel', en: '✓ tx 0x8f2a…c41 confirmed · receipt in panel' },
      { k: 'kpi', es: '▲ conciliación automática: 100%', en: '▲ auto reconciliation: 100%' },
    ],
  },
  {
    id: 'musa',
    name: 'MUSA-3',
    glyph: 'M3',
    energy: 2,
    tone: 'rare',
    orb: 'violet',
    role: { es: 'Marketing / Contenido', en: 'Marketing / Content' },
    stats: { aut: 6, vel: 9, int: 7 },
    fun: {
      es: 'Publica más que tu community manager con tres cafés encima.',
      en: 'Posts more than your community manager on three espressos.',
    },
    tech: {
      es: 'Calendario editorial autónomo, A/B testing, brand voice entrenada.',
      en: 'Autonomous content calendar, A/B testing, trained brand voice.',
    },
    demo: [
      { k: 'cmd', es: '$ musa-3 campaña --producto "kit verano"', en: '$ musa-3 campaign --product "summer kit"' },
      { k: 'sys', es: '⚙ generando 12 variantes · 3 canales', en: '⚙ generating 12 variants · 3 channels' },
      { k: 'agt', es: '◆ musa-3: variante B gana el A/B (+31% CTR)', en: '◆ musa-3: variant B wins the A/B (+31% CTR)' },
      { k: 'ok', es: '✓ campaña programada jul 18–31 · presupuesto ok', en: '✓ campaign scheduled Jul 18–31 · budget ok' },
      { k: 'kpi', es: '▲ CAC estimado −19%', en: '▲ est. CAC −19%' },
    ],
  },
  {
    id: 'empatia',
    name: 'EMPATÍA-2',
    glyph: 'E2',
    energy: 2,
    tone: 'rare',
    orb: 'pink',
    role: { es: 'Soporte / Atención', en: 'Support / CX' },
    stats: { aut: 7, vel: 8, int: 8 },
    fun: {
      es: 'Responde con más paciencia que tu mejor agente en su mejor día.',
      en: 'More patient than your best support rep on their best day.',
    },
    tech: {
      es: 'Resolución tier-1 autónoma, escalamiento inteligente, CSAT tracking.',
      en: 'Autonomous tier-1 resolution, smart escalation, CSAT tracking.',
    },
    demo: [
      { k: 'cmd', es: '$ empatia-2 run --bandeja soporte', en: '$ empatia-2 run --inbox support' },
      { k: 'usr', es: '› cliente: "mi pedido llegó incompleto 😤"', en: '› customer: "my order arrived incomplete 😤"' },
      {
        k: 'agt',
        es: '◆ empatía-2: "Lo siento mucho. Ya envié la pieza faltante, llega mañana + 10% de descuento."',
        en: '◆ empatia-2: "So sorry. Missing part reshipped, arrives tomorrow + 10% off."',
      },
      { k: 'ok', es: '✓ ticket resuelto en 42 s · CSAT 5/5', en: '✓ ticket resolved in 42 s · CSAT 5/5' },
      { k: 'kpi', es: '▲ 87% tickets sin intervención humana', en: '▲ 87% tickets with zero human touch' },
    ],
  },
  {
    id: 'custodio',
    name: 'CUSTODIO',
    glyph: 'CU',
    energy: 3,
    tone: 'epic',
    orb: 'violet',
    role: { es: 'Legal / Compliance', en: 'Legal / Compliance' },
    stats: { aut: 6, vel: 7, int: 8 },
    fun: {
      es: 'Lee la letra chiquita para que tú no tengas que hacerlo. Nunca.',
      en: 'Reads the fine print so you never have to. Ever.',
    },
    tech: {
      es: 'Revisión de contratos, KYC/AML, alertas regulatorias por jurisdicción.',
      en: 'Contract review, KYC/AML, per-jurisdiction regulatory alerts.',
    },
    demo: [
      { k: 'cmd', es: '$ custodio revisar contrato_proveedor.pdf', en: '$ custodio review vendor_contract.pdf' },
      { k: 'sys', es: '⚙ 34 cláusulas analizadas', en: '⚙ 34 clauses analyzed' },
      { k: 'agt', es: '◆ custodio: cláusula 12.3 con penalización oculta (riesgo alto)', en: '◆ custodio: clause 12.3 has hidden penalty (high risk)' },
      { k: 'ok', es: '✓ contrapropuesta redactada · lista para firma', en: '✓ counter-proposal drafted · ready to sign' },
      { k: 'kpi', es: '▲ riesgo contractual −64%', en: '▲ contract risk −64%' },
    ],
  },
  {
    id: 'tesoro',
    name: 'TESORO',
    glyph: 'T$',
    energy: 3,
    tone: 'epic',
    orb: 'pink',
    role: { es: 'Finanzas / Presupuesto', en: 'Finance / Budget' },
    stats: { aut: 8, vel: 7, int: 9 },
    fun: {
      es: 'Cuida tu dinero como si fuera suyo. Spoiler: no gasta nada.',
      en: "Guards your money like it's his own. Spoiler: he spends nothing.",
    },
    tech: {
      es: 'Control de presupuesto en vivo, proyección de flujo, cierre contable asistido.',
      en: 'Live budget control, cash-flow projection, assisted book closing.',
    },
    demo: [
      { k: 'cmd', es: '$ tesoro proyectar --meses 6', en: '$ tesoro project --months 6' },
      { k: 'sys', es: '⚙ leyendo bancos + CRM + nómina…', en: '⚙ reading banks + CRM + payroll…' },
      { k: 'agt', es: '◆ tesoro: flujo positivo desde octubre (+$18.4k)', en: '◆ tesoro: positive cash flow from October (+$18.4k)' },
      { k: 'ok', es: '✓ alerta: suscripciones duplicadas $340/mes → canceladas', en: '✓ alert: duplicate subscriptions $340/mo → cancelled' },
      { k: 'kpi', es: '▲ desviación de presupuesto < 3%', en: '▲ budget variance < 3%' },
    ],
  },
];

export const RARITY_LABEL: Record<Tone, Record<Lang, string>> = {
  legendary: { es: 'LEGENDARIA', en: 'LEGENDARY' },
  epic: { es: 'ÉPICA', en: 'EPIC' },
  rare: { es: 'RARA', en: 'RARE' },
};

export function agentById(id: string): Agent | undefined {
  return AGENTS.find((a) => a.id === id);
}

/** Copy de la carta según el shopper (humano = divertido, a2a = técnico). */
export function flavorFor(agent: Agent, mode: Shopper, lang: Lang): string {
  return (mode === 'a2a' ? agent.tech : agent.fun)[lang];
}

export interface DeckEconomics {
  count: number;
  energy: number;
  weeks: number;
  loUsd: number;
  hiUsd: number;
  priceLabel: string;
  weeksLabel: string;
}

/** Economía del mazo = cotización estimada. Misma fórmula que la landing original. */
export function deckEconomics(deck: string[], lang: Lang): DeckEconomics {
  const agents = deck.map(agentById).filter((a): a is Agent => Boolean(a));
  const energy = agents.reduce((s, a) => s + a.energy, 0);
  const loUsd = energy * 290;
  const hiUsd = energy * 410;
  const weeks = deck.length ? 2 + Math.ceil(deck.length / 2) : 0;
  return {
    count: deck.length,
    energy,
    weeks,
    loUsd,
    hiUsd,
    priceLabel: deck.length ? `$${loUsd.toLocaleString('en-US')}–${hiUsd.toLocaleString('en-US')} USD` : '$0',
    weeksLabel: deck.length ? `${weeks} ${lang === 'en' ? 'wks' : 'sem'}` : '—',
  };
}
