import { create } from 'zustand'

// ─── Modelo activo del agente ─────────────────────────────────────────────────
//
// Fuente de verdad compartida entre superficies: useChat la alimenta (fetch al
// montar + eventos model_changed/usage del SSE) y la leen el Header móvil y el
// header de ChatPanel. Un solo store evita prop-drilling entre el shell y el chat.

const DISPLAY_NAMES: Record<string, string> = {
  'claude-fable-5': 'Fable 5',
  'claude-opus-4-8': 'Opus 4.8',
  'claude-opus-4-7': 'Opus 4.7',
  'claude-opus-4-6': 'Opus 4.6',
  'claude-sonnet-5': 'Sonnet 5',
  'claude-sonnet-4-6': 'Sonnet 4.6',
  'claude-haiku-4-5-20251001': 'Haiku 4.5',
}

/** "claude-opus-4-8[1m]" → "Opus 4.8" (con fallback razonable para ids desconocidos) */
export function modelDisplayName(id: string | null | undefined): string | null {
  if (!id) return null
  const base = id.replace(/\[[^\]]+\]$/, '') // sufijo de contexto del SDK: [1m]
  if (DISPLAY_NAMES[base]) return DISPLAY_NAMES[base]
  const pretty = base
    .replace(/^claude-/, '')
    .replace(/-\d{8,}$/, '') // sufijo de fecha (haiku-4-5-20251001)
    .replace(/-(\d+)-(\d+)$/, ' $1.$2')
    .replace(/-(\d+)$/, ' $1')
    .replace(/-/g, ' ')
  return pretty.charAt(0).toUpperCase() + pretty.slice(1)
}

interface ModelState {
  /** id canónico del modelo activo (ej. 'claude-opus-4-8'), null = aún sin resolver */
  model: string | null
  setModel: (model: string | null) => void
}

export const useModelStore = create<ModelState>((set) => ({
  model: null,
  setModel: (model) => set({ model }),
}))
