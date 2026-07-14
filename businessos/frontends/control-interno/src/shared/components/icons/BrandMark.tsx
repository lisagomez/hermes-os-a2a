import { Bot } from 'lucide-react'

// Marca del producto: el icono generico Bot de lucide-react. Hereda
// `currentColor` igual que cualquier icono Lucide (gris inactivo, morado
// activo en el sidebar). Sustituyelo por tu propio logo al hacer tu fork.
export function BrandMark({ className }: { className?: string }) {
  return <Bot className={className} aria-hidden="true" />
}
