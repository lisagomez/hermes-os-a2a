// Fuente UNICA de verdad para los colores del calendario.
// Deterministico por nombre de calendario: cada calendario se mapea a una entrada
// de la paleta hasheando su nombre, asi el mismo calendario siempre recibe el mismo
// color sin ningun mapeo hardcodeado por nombre. Client-safe (sin imports de servidor).

export type CalendarColor = { backgroundColor: string; foregroundColor: string }

// Paleta curada (colores bonitos, fondo + texto legible). El calendario elige una
// entrada de forma determinista por hash del nombre.
const PALETTE: CalendarColor[] = [
  { backgroundColor: '#9929bd', foregroundColor: '#ffffff' },
  { backgroundColor: '#14b8a6', foregroundColor: '#042f2e' },
  { backgroundColor: '#ffc677', foregroundColor: '#0f172a' },
  { backgroundColor: '#d58400', foregroundColor: '#ffffff' },
  { backgroundColor: '#22c55e', foregroundColor: '#052e16' },
  { backgroundColor: '#ff4013', foregroundColor: '#ffffff' },
  { backgroundColor: '#f97316', foregroundColor: '#431407' },
  { backgroundColor: '#60a5fa', foregroundColor: '#0f172a' },
  { backgroundColor: '#e392fe', foregroundColor: '#0f172a' },
]

// Slate neutro: un calendario sin nombre no adopta un color de la paleta al azar.
const DEFAULT_COLOR: CalendarColor = { backgroundColor: '#64748b', foregroundColor: '#ffffff' }

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function calendarColorFor(calendarName?: string | null): CalendarColor {
  const name = calendarName?.trim()
  if (!name) return DEFAULT_COLOR
  return PALETTE[hashString(name) % PALETTE.length]
}
