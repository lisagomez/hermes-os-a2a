// Sección "Intake y cotización" (mazo por prompt). Catálogo del trío en producción,
// detección por keywords y armado de cotización. Todo simulado: esta sección no
// consume tokens de runtime. Portado del mock intake-cotizacion-mazo.html.
import type { Lang } from '@/shared/i18n/strings';

export interface IntakeCard {
  id: string;
  suit: string;
  /** Siempre en el mazo */
  base?: boolean;
  /** Opcional por cotizar (borde punteado dorado) */
  opt?: boolean;
  /** Keywords (es+en) que la activan */
  kw?: string[];
  role: Record<Lang, string>;
  fn: Record<Lang, string>;
  meta: Record<Lang, string>;
}

export const INTAKE_DECK: IntakeCard[] = [
  {
    id: 'coord',
    suit: '♠',
    base: true,
    role: { es: 'Coordinador', en: 'Coordinator' },
    fn: {
      es: 'Recibe tu prompt, genera el PRP (blueprint) y arma el DAG de sub-tareas con el planner.',
      en: 'Takes your prompt, generates the PRP (blueprint) and builds the sub-task DAG with the planner.',
    },
    meta: { es: 'SIEMPRE · corre 1 vez por proyecto', en: 'ALWAYS · runs once per project' },
  },
  {
    id: 'grafo',
    suit: '♣',
    kw: ['imss', 'lft', 'lss', 'ley', 'fiscal', 'nómina', 'nomina', 'payroll', 'idse', 'sua', 'incapacidad', 'laboral', 'labor law', 'tax'],
    role: { es: 'Grafo Regulatorio', en: 'Regulatory Graph' },
    fn: {
      es: 'Veredictos con fuente primaria citada: LFT, LSS, reglas IMSS/SUA. Fail-safe y disclaimer siempre.',
      en: 'Verdicts citing primary sources: LFT, LSS, IMSS/SUA rules. Fail-safe and disclaimer, always.',
    },
    meta: { es: 'SE ACTIVA · dominio fiscal/laboral detectado', en: 'ACTIVATES · tax/labor domain detected' },
  },
  {
    id: 'ejec',
    suit: '♦',
    base: true,
    role: { es: 'Enjambre Ejecutor', en: 'Executor Swarm' },
    fn: {
      es: '2–5 ejecutores en worktrees con alcances disjuntos: esquema, motor de reglas, UI, conectores, docs.',
      en: '2–5 executors on worktrees with disjoint scopes: schema, rules engine, UI, connectors, docs.',
    },
    meta: { es: 'SIEMPRE · escala con el alcance', en: 'ALWAYS · scales with scope' },
  },
  {
    id: 'super',
    suit: '♥',
    base: true,
    role: { es: 'Supervisor', en: 'Supervisor' },
    fn: {
      es: 'Gates deterministas: lint, tests, Playwright, anti-sello-de-goma. Nada se entrega sin pasar por él.',
      en: 'Deterministic gates: lint, tests, Playwright, no rubber-stamping. Nothing ships without passing it.',
    },
    meta: { es: 'SIEMPRE · veto sobre el enjambre', en: 'ALWAYS · veto over the swarm' },
  },
  {
    id: 'conector',
    suit: '♦',
    kw: ['checador', 'reloj', 'biométric', 'biometric', 'time clock', 'noi', 'sua'],
    role: { es: 'Agente Conector', en: 'Connector Agent' },
    fn: {
      es: 'Ingesta de relojes checadores (API/CSV) y export compatible NOI/SUA con conciliación de excepciones.',
      en: 'Time-clock ingestion (API/CSV) and NOI/SUA-compatible export with exception reconciliation.',
    },
    meta: { es: 'SE ACTIVA · checadores o NOI detectados', en: 'ACTIVATES · time clocks or NOI detected' },
  },
  {
    id: 'idse',
    suit: '♣',
    kw: ['idse', 'afiliatorio', 'patronal'],
    role: { es: 'Preparador IDSE', en: 'IDSE Preparer' },
    fn: {
      es: 'Genera layouts de movimientos afiliatorios. NUNCA envía: el envío a IDSE es gate humano, siempre.',
      en: 'Generates affiliation movement layouts. NEVER submits: sending to IDSE is a human gate, always.',
    },
    meta: { es: 'SE ACTIVA · IDSE detectado · gate humano', en: 'ACTIVATES · IDSE detected · human gate' },
  },
  {
    id: 'mant',
    suit: '♥',
    kw: ['mantenimiento', 'soporte', 'mensual', 'maintenance', 'support', 'monthly'],
    role: { es: 'Agente de Mantenimiento', en: 'Maintenance Agent' },
    fn: {
      es: 'Stress tests mensuales, resolución de incidencias, escalamiento a humano vía Slack, manual dinámico.',
      en: 'Monthly stress tests, incident resolution, human escalation via Slack, living runbook.',
    },
    meta: { es: 'MENSUAL · si contratas mantenimiento', en: 'MONTHLY · if you hire maintenance' },
  },
  {
    id: 'ledger',
    suit: '♠',
    base: true,
    role: { es: 'Contador de Tokens', en: 'Token Ledger' },
    fn: {
      es: 'Ledger token_usage por tarea: gasto real por cliente y asset digital, desglosado a cuenta contable y póliza.',
      en: 'Per-task token_usage ledger: real spend per client and digital asset, down to account and journal entry.',
    },
    meta: { es: 'SIEMPRE · gobernanza auditable', en: 'ALWAYS · auditable governance' },
  },
  {
    id: 'loop',
    suit: '★',
    opt: true,
    kw: ['mejora', 'mejorar', 'optimiz', 'bucle', 'improve'],
    role: { es: 'Bucle de Mejora Continua', en: 'Continuous Improvement Loop' },
    fn: {
      es: 'Revisión nocturna del sistema: detecta patrones, propone reglas nuevas y PRs al manual de operación.',
      en: 'Nightly system review: detects patterns, proposes new rules and PRs to the operations manual.',
    },
    meta: { es: 'OPCIONAL · feature por cotizar', en: 'OPTIONAL · feature to be quoted' },
  },
  {
    id: 'consejo',
    suit: '★',
    opt: true,
    kw: ['estrategia', 'decisión', 'decision', 'consejo', 'strategy', 'council'],
    role: { es: 'Consejo (5 asesores)', en: 'Council (5 advisors)' },
    fn: {
      es: 'Solo para decisiones caras/irreversibles del proyecto: peer-review anónimo + síntesis del Chairman.',
      en: 'Only for costly/irreversible project decisions: anonymous peer-review + Chairman synthesis.',
    },
    meta: { es: 'OPCIONAL · manual, convocado por humano', en: 'OPTIONAL · manual, convened by a human' },
  },
];

export interface DetectedTag {
  label: Record<Lang, string>;
  opt?: boolean;
}

export interface IntakeAnalysis {
  tags: DetectedTag[];
  deck: IntakeCard[];
  text: string;
}

export function analyzeIntake(raw: string): IntakeAnalysis {
  const t = raw.toLowerCase();
  const has = (arr: string[]) => arr.some((k) => t.includes(k));
  const tags: DetectedTag[] = [];
  if (has(['imss', 'incapacidad', 'lft', 'laboral', 'labor law', 'sick leave']))
    tags.push({ label: { es: 'Dominio: RH / Ley IMSS', en: 'Domain: HR / IMSS law' } });
  if (has(['sucursal', 'corporativo', 'multi', 'branch', 'headquarters']))
    tags.push({ label: { es: 'Multi-sucursal + corporativo', en: 'Multi-branch + HQ' } });
  if (has(['checador', 'reloj', 'biométric', 'biometric', 'time clock']))
    tags.push({ label: { es: 'Relojes checadores', en: 'Biometric time clocks' } });
  if (has(['noi'])) tags.push({ label: { es: 'Sistema NOI', en: 'NOI system' } });
  if (has(['idse'])) tags.push({ label: { es: 'Integración IDSE · gate humano', en: 'IDSE integration · human gate' }, opt: true });
  if (has(['mantenimiento', 'mensual', 'soporte', 'maintenance', 'monthly', 'support']))
    tags.push({ label: { es: 'Mantenimiento mensual', en: 'Monthly maintenance' } });
  if (has(['demo'])) tags.push({ label: { es: 'Demo 20 min', en: '20-min demo' } });
  if (!tags.length) tags.push({ label: { es: 'Dominio general · mazo base', en: 'General domain · base deck' } });
  const deck = INTAKE_DECK.filter((c) => c.base || (c.kw && has(c.kw)));
  return { tags, deck, text: t };
}

export interface QuoteRow {
  concept: Record<Lang, string>;
  scope: Record<Lang, string>;
  /** miles de tokens proyectados */
  tk: number;
  mxn: number;
  opt?: boolean;
  included?: boolean;
}

export interface IntakeQuote {
  rows: QuoteRow[];
  totalMxn: number;
  totalTk: number;
}

export function buildIntakeQuote(a: IntakeAnalysis): IntakeQuote {
  const t = a.text;
  const rows: QuoteRow[] = [
    {
      concept: { es: 'Demo funcional en 20 minutos', en: 'Working demo in 20 minutes' },
      scope: { es: 'Propuesta + demo + repo GitHub en tu org', en: 'Proposal + demo + GitHub repo in your org' },
      tk: 790,
      mxn: 0,
      included: true,
    },
  ];
  let totalMxn = 0;
  let totalTk = 790;
  const add = (concept: QuoteRow['concept'], scope: QuoteRow['scope'], tk: number, mxn: number, opt?: boolean) => {
    rows.push({ concept, scope, tk, mxn, opt });
    if (!opt) {
      totalMxn += mxn;
      totalTk += tk;
    }
  };
  add(
    { es: 'Personalización e implementación · base', en: 'Customization & implementation · base' },
    { es: 'Motor de incidencias, reglas LFT/LSS, reportes', en: 'Incidents engine, LFT/LSS rules, reports' },
    1100,
    58000,
  );
  if (t.includes('sucursal') || t.includes('corporativo') || t.includes('branch'))
    add(
      { es: 'Multi-sucursal + corporativo', en: 'Multi-branch + HQ' },
      { es: 'Roles por sede, consolidación corporativa', en: 'Per-site roles, corporate consolidation' },
      320,
      17000,
    );
  if (t.includes('checador') || t.includes('reloj') || t.includes('biométric') || t.includes('biometric') || t.includes('time clock'))
    add(
      { es: 'Conector relojes checadores', en: 'Time-clock connector' },
      { es: 'API/CSV + detección automática + conciliación', en: 'API/CSV + auto-detection + reconciliation' },
      260,
      14000,
    );
  if (t.includes('noi') || t.includes('idse'))
    add(
      { es: 'Export NOI/SUA + layouts IDSE', en: 'NOI/SUA export + IDSE layouts' },
      { es: 'Movimientos afiliatorios · envío SIEMPRE con gate humano', en: 'Affiliation movements · submission ALWAYS behind a human gate' },
      410,
      21000,
    );
  if (t.includes('manten') || t.includes('mensual') || t.includes('soporte') || t.includes('maintenance') || t.includes('monthly') || t.includes('support'))
    add(
      { es: 'Mantenimiento mensual', en: 'Monthly maintenance' },
      { es: 'Stress test + incidencias + manual dinámico + SLA', en: 'Stress test + incidents + living runbook + SLA' },
      350,
      7500,
    );
  add(
    { es: 'Bucle de mejora continua', en: 'Continuous improvement loop' },
    { es: 'Revisión nocturna + PRs al manual (feature opcional)', en: 'Nightly review + PRs to the runbook (optional feature)' },
    280,
    12000,
    true,
  );
  add(
    { es: 'Infraestructura dedicada', en: 'Dedicated infrastructure' },
    { es: 'Proyecto Supabase exclusivo o self-host (mensual, opcional)', en: 'Exclusive Supabase project or self-host (monthly, optional)' },
    0,
    2900,
    true,
  );
  return { rows, totalMxn, totalTk };
}

export interface TimedItem {
  when: Record<Lang, string>;
  text: Record<Lang, string>;
}

export const INTAKE_DELIVERABLES: TimedItem[] = [
  {
    when: { es: 'T+20 MIN', en: 'T+20 MIN' },
    text: {
      es: 'Propuesta ejecutiva + demo funcional (datos 100% sintéticos) + repo GitHub privado en tu organización',
      en: 'Executive proposal + working demo (100% synthetic data) + private GitHub repo in your organization',
    },
  },
  {
    when: { es: 'SEM 1–2', en: 'WK 1–2' },
    text: {
      es: 'Personalización a tu caso de uso · avances por PR con releases etiquetados · seguimiento en Mission Control',
      en: 'Customization to your use case · progress via PRs with tagged releases · tracking on Mission Control',
    },
  },
  {
    when: { es: 'PRE-PROD', en: 'PRE-PROD' },
    text: {
      es: 'Auditoría preliminar 8 puntos + gate humano IDSE armado + plan de reversa y respaldos',
      en: '8-point preliminary audit + IDSE human gate armed + rollback plan and backups',
    },
  },
  {
    when: { es: 'PRODUCCIÓN', en: 'PRODUCTION' },
    text: {
      es: 'Implementación, capacitación y manual de operación v1.0',
      en: 'Deployment, training and operations manual v1.0',
    },
  },
  {
    when: { es: 'MENSUAL', en: 'MONTHLY' },
    text: {
      es: 'Mantenimiento: stress test, resolución de incidencias, manual dinámico, reporte de tokens por póliza',
      en: 'Maintenance: stress tests, incident resolution, living runbook, per-entry token report',
    },
  },
];

export const INTAKE_KICKOFF: TimedItem[] = [
  {
    when: { es: 'AHORA', en: 'NOW' },
    text: {
      es: 'Contrato generado y enviado a firma electrónica · decision_id asignado al hilo de trazabilidad',
      en: 'Contract generated and sent for e-signature · decision_id assigned to the traceability thread',
    },
  },
  {
    when: { es: 'AL FIRMAR', en: 'ON SIGNING' },
    text: {
      es: 'Liga de pago del anticipo (50%) — el sprint no arranca sin pago confirmado (invariante)',
      en: 'Down-payment link (50%) — the sprint does not start without confirmed payment (invariant)',
    },
  },
  {
    when: { es: 'T+0', en: 'T+0' },
    text: {
      es: 'Sprint de 20 min: PRP → grafo regulatorio → enjambre → gates → gate humano → entrega A2A',
      en: '20-min sprint: PRP → regulatory graph → swarm → gates → human gate → A2A delivery',
    },
  },
  {
    when: { es: 'T+20 MIN', en: 'T+20 MIN' },
    text: {
      es: 'Recibes: propuesta ejecutiva + demo funcional + repo GitHub privado en tu organización',
      en: 'You receive: executive proposal + working demo + private GitHub repo in your organization',
    },
  },
  {
    when: { es: 'SIGUIENTE', en: 'NEXT' },
    text: {
      es: 'Supervisión del avance en el dashboard Mission Control (la sección de abajo)',
      en: 'Track progress on the Mission Control dashboard (section below)',
    },
  },
];

export type A2aLineKind = 'in' | 'out' | 'sys' | 'warn';

export interface A2aStep {
  delay: number;
  kind: A2aLineKind;
  label?: string;
  text: Record<Lang, string>;
  pre?: string;
}

const PRE_INTAKE = `{
 "type": "project_request",
 "domain": "hr.incidencias",
 "compliance": ["ley_imss","lft","lss"],
 "context": {
   "sucursales": "multi+corporativo",
   "checadores": true,
   "sistemas": ["NOI"],
   "integraciones": ["IDSE"]
 },
 "requiere": ["demo_rapida","personalizacion","mantenimiento_mensual"]
}`;

const PRE_PROPOSAL = `{
 "type": "quotation_proposal",
 "decision_id": "DEC-20260717-RH01",
 "deck": ["coordinador","grafo_regulatorio","enjambre_ejecutor",
          "supervisor","conector_checadores_noi","preparador_idse",
          "mantenimiento","contador_tokens"],
 "opcionales": ["bucle_mejora","infra_dedicada"],
 "precio_mxn": {"proyecto": 110000, "anticipo_50": 55000,
                "mantenimiento_mensual": 7500},
 "tokens_proyectados": 2880000,
 "invariantes": ["gate_humano_idse","datos_sensibles_lfpdppp",
                 "repo_propiedad_cliente","rls_por_tenant"]
}`;

export const A2A_STEPS: A2aStep[] = [
  {
    delay: 0,
    kind: 'in',
    label: '◂ IN · agente-cliente',
    text: { es: 'POST /a2a/intake', en: 'POST /a2a/intake' },
    pre: PRE_INTAKE,
  },
  {
    delay: 900,
    kind: 'sys',
    text: {
      es: 'Coordinador ▸ intake validado · PRP preliminar · mazo armado (8 agentes + 2 opcionales) · cotización calculada.',
      en: 'Coordinator ▸ intake validated · preliminary PRP · deck dealt (8 agents + 2 optional) · quote computed.',
    },
  },
  {
    delay: 1800,
    kind: 'out',
    label: '▸ OUT · propuesta',
    text: { es: 'payload legible por máquina:', en: 'machine-readable payload:' },
    pre: PRE_PROPOSAL,
  },
  {
    delay: 3400,
    kind: 'in',
    label: '◂ IN · agente-cliente',
    text: {
      es: '{"type":"approval","decision_id":"DEC-20260717-RH01","aprueba":["deck","precio","entregables"],"opcionales_aceptados":["bucle_mejora"],"firma":"delegada_a_humano"}',
      en: '{"type":"approval","decision_id":"DEC-20260717-RH01","approves":["deck","price","deliverables"],"accepted_optionals":["improvement_loop"],"signature":"delegated_to_human"}',
    },
  },
  {
    delay: 4300,
    kind: 'warn',
    text: {
      es: '⚠ Invariante: la firma del contrato y el pago son actos del humano del cliente, aunque su agente negocie. Liga de firma + pago emitida al responsable humano registrado.',
      en: '⚠ Invariant: contract signature and payment are acts of the client’s human, even if their agent negotiates. Signing + payment link issued to the registered human owner.',
    },
  },
  {
    delay: 5300,
    kind: 'in',
    label: '◂ IN',
    text: {
      es: '{"type":"contract_signed","anticipo":"confirmado"} — el humano del cliente firmó y pagó.',
      en: '{"type":"contract_signed","down_payment":"confirmed"} — the client’s human signed and paid.',
    },
  },
  {
    delay: 6200,
    kind: 'out',
    label: '▸ OUT',
    text: {
      es: '{"type":"kickoff","sprint":"iniciado","eta":"20min","tracking":"mission-control"} · El resto ya lo conoces: es el dashboard de Mission Control. ✓',
      en: '{"type":"kickoff","sprint":"started","eta":"20min","tracking":"mission-control"} · You already know the rest: it’s the Mission Control dashboard. ✓',
    },
  },
];

export const INTAKE_DEFAULT_PROMPT: Record<Lang, string> = {
  es: 'Necesito un proyecto de recursos humanos: gestión de incidencias (faltas, retardos, incapacidades, vacaciones, permisos) en base a la ley del IMSS. Tenemos varias sucursales y un corporativo, relojes checadores biométricos, y usamos NOI; quiero integrarlo con IDSE. Requiero demo funcional rápida, personalización a nuestra operación y mantenimiento mensual.',
  en: 'I need an HR project: incident management (absences, tardiness, sick leave, vacations, permits) based on Mexican IMSS law. We have several branch offices and an HQ, biometric time clocks, and we use NOI; I want IDSE integration. I need a quick working demo, customization to our operation and monthly maintenance.',
};
