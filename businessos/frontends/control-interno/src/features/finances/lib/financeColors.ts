// Colores estables para cuentas y categorías de finanzas (dark theme).
// Las cuentas no tienen colores hardcodeados: cada nombre cae a un color
// determinístico de la paleta (mismo nombre → mismo color, siempre).

const PALETTE = [
  '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EC4899',
  '#06B6D4', '#14B8A6', '#F97316', '#A78BFA', '#84CC16',
]

function hashColor(key: string): string {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export function accountColor(name: string): string {
  return hashColor(name)
}

// Categorías de gasto → color (para barras por categoría).
const CATEGORY_COLORS: Record<string, string> = {
  vivienda: '#EC4899',
  comida: '#F59E0B',
  despensa: '#FBBF24',
  transporte: '#A78BFA',
  viajes: '#8B5CF6',
  salud: '#10B981',
  suscripciones: '#3B82F6',
  'equipo-tech': '#06B6D4',
  educacion: '#14B8A6',
  familia: '#FB923C',
  'negocio-ops': '#6366F1',
  otros: '#64748B',
}

export function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? hashColor(cat)
}

// Fuentes de ingreso → color.
const INCOME_COLORS: Record<string, string> = {
  ventas: '#10B981',
  salario: '#3B82F6',
  freelance: '#8B5CF6',
  inversiones: '#F59E0B',
  otros: '#64748B',
}

export function incomeColor(source: string): string {
  return INCOME_COLORS[source] ?? hashColor(source)
}
