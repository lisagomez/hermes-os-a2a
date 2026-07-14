// Canonical taxonomy of cron jobs — a friendly label + business category +
// "neurological" anatomy (for the Acciones room of the Artificial Brain) for
// each of YOUR cron jobs.
//
// WHITE-LABEL: the CRON_TAXONOMY map below is illustrative only. Replace the
// `example-*` entries with your own job ids. Any id NOT in the map falls back to
// the heuristic functions further down (classify by prefix/keyword), so the
// Acciones room still groups your jobs reasonably with zero config.
//
// SENSOR = a "visible" job: your daemon injects its output into the chat +
// pushes it (the rest are silent workers that only leave a trace in
// `conversations`). Your daemon owns the schedule; this file only labels it.

export type CronCategoria =
  | 'adquisicion'
  | 'conversion'
  | 'retencion'
  | 'inteligencia'
  | 'personal'
  | 'infra'

export type CronAnatomia =
  | 'sentidos'
  | 'reflejos'
  | 'sintesis'
  | 'aprendizaje'
  | 'centinelas'
  | 'personal'

interface CronTaxonomyEntry {
  categoria: CronCategoria
  /** Neurological function inside the Artificial Brain (Acciones room). */
  anatomia: CronAnatomia
  /** What this organ does, in one human line. */
  funcion: string
  /** true = a visible job that talks to you via chat + push. */
  sensor: boolean
  /** Internal route where this cron's effect/output shows up. */
  superficie: string
}

export const CRON_CATEGORIA_LABEL: Record<CronCategoria, string> = {
  adquisicion: 'Acquisition',
  conversion: 'Conversion',
  retencion: 'Retention',
  inteligencia: 'Intelligence',
  personal: 'Personal',
  infra: 'Infra',
}

export const CRON_ANATOMIA_META: Record<
  CronAnatomia,
  { label: string; descripcion: string; orden: number }
> = {
  sintesis: {
    label: 'Synthesis',
    descripcion: 'The brain’s voice: they distill everything and talk to you',
    orden: 1,
  },
  sentidos: {
    label: 'Senses',
    descripcion: 'They perceive the world and the state of the business',
    orden: 2,
  },
  reflejos: {
    label: 'Reflexes',
    descripcion: 'They act on a stimulus without going through the cortex',
    orden: 3,
  },
  aprendizaje: {
    label: 'Learning',
    descripcion: 'They rewrite and train themselves (plasticity)',
    orden: 4,
  },
  centinelas: {
    label: 'Sentinels',
    descripcion: 'They watch; judged by standing risk, not by frequency',
    orden: 5,
  },
  personal: {
    label: 'Personal',
    descripcion: 'They shape the owner, not the business',
    orden: 6,
  },
}

/**
 * Your "sensor" jobs (the visible ones your daemon pushes to chat).
 * Replace with your own ids — unknown ids simply aren't treated as sensors.
 */
export const SENSOR_JOB_IDS = [
  'example-morning-briefing',
  'example-weekly-review',
] as const

const SENSOR_JOB_SET = new Set<string>(SENSOR_JOB_IDS)

// EXAMPLES ONLY — replace with your own cron ids (see the note at the top).
const CRON_TAXONOMY: Record<string, CronTaxonomyEntry> = {
  'example-morning-briefing': { categoria: 'inteligencia', anatomia: 'sintesis', funcion: 'Example: your morning summary (calendar, priorities)', sensor: true, superficie: '/calendar' },
  'example-weekly-review': { categoria: 'inteligencia', anatomia: 'sintesis', funcion: 'Example: a deep weekly review of the business', sensor: true, superficie: '/ops' },
  'example-metrics-snapshot': { categoria: 'inteligencia', anatomia: 'sentidos', funcion: 'Example: a daily snapshot of your business metrics', sensor: false, superficie: '/ops' },
  'example-inbox-cleanup': { categoria: 'infra', anatomia: 'reflejos', funcion: 'Example: archive and tidy your inbox', sensor: false, superficie: '/ops' },
}

/**
 * Classify a known or unknown job_id. Reasonable fallback by prefix/keyword so
 * jobs you never registered here still land in a sensible category.
 */
export function categoriaDeCron(jobId: string): CronCategoria {
  const entry = CRON_TAXONOMY[jobId]
  if (entry) return entry.categoria
  if (jobId.startsWith('custom-')) return 'infra'
  if (jobId.includes('intel') || jobId.includes('scan') || jobId.includes('monitor')) return 'adquisicion'
  if (jobId.includes('churn') || jobId.includes('retention')) return 'retencion'
  if (jobId.includes('review') || jobId.includes('brief') || jobId.includes('council')) return 'inteligencia'
  if (jobId.includes('habit') || jobId.includes('reflection')) return 'personal'
  return 'infra'
}

/** Neurological function of the organ (heuristic fallback for new ids). */
export function anatomiaDeCron(jobId: string): CronAnatomia {
  const entry = CRON_TAXONOMY[jobId]
  if (entry) return entry.anatomia
  if (jobId.includes('watchdog') || jobId.includes('consciousness') || jobId.includes('sentinel')) return 'centinelas'
  if (jobId.includes('model') || jobId.includes('predict') || jobId.includes('train') || jobId.includes('learn')) return 'aprendizaje'
  if (jobId.includes('intel') || jobId.includes('monitor') || jobId.includes('scan') || jobId.includes('snapshot')) return 'sentidos'
  if (jobId.includes('brief') || jobId.includes('council') || jobId.includes('review')) return 'sintesis'
  if (jobId.includes('reflection') || jobId.includes('habit')) return 'personal'
  return 'reflejos'
}

/** true if the job is one of your visible sensors. */
export function esSensor(jobId: string): boolean {
  const entry = CRON_TAXONOMY[jobId]
  if (entry) return entry.sensor
  return SENSOR_JOB_SET.has(jobId)
}

/** Internal route where the owner sees this cron's effect/output. */
export function superficieDeCron(jobId: string): string {
  return CRON_TAXONOMY[jobId]?.superficie ?? '/ops'
}

/** What the organ does in human language (fallback: the id itself). */
export function funcionDeCron(jobId: string): string {
  return CRON_TAXONOMY[jobId]?.funcion ?? jobId
}

/** Short human label for a cron. */
const CRON_LABELS: Record<string, string> = {
  'example-morning-briefing': 'Morning Briefing',
  'example-weekly-review': 'Weekly Review',
}

export function cronLabel(jobId: string): string {
  return CRON_LABELS[jobId] ?? jobId
}

/**
 * Scheduler migration tombstones (v3-migrated, v10-migrated...) are NOT organs
 * and never show in the Acciones room.
 */
export function esOrganoReal(jobId: string): boolean {
  return !/^v\d+-migrated$/.test(jobId)
}
