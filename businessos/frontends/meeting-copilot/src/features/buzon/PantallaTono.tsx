'use client'

// Pantalla 4 del asistente (SPEC §11.6): semilla de tono. La promesa de
// privacidad es literal — "no se guardan más allá de la calibración" — así
// que este componente NO llama a ningún action del store con ese texto: vive
// solo en memoria del componente y se descarta al salir de la pantalla.

import { useState } from 'react'
import { Button, Callout } from '@/shared/components/ui'
import { SchemaSemillaTono } from './validacion'

export function PantallaTono({ onListo }: { onListo: () => void }) {
  const [correo1, setCorreo1] = useState('')
  const [correo2, setCorreo2] = useState('')
  const [correo3, setCorreo3] = useState('')
  const [error, setError] = useState<string | null>(null)

  const continuar = () => {
    const parsed = SchemaSemillaTono.safeParse({ correo1, correo2, correo3 })
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Completa los 3 correos de ejemplo.')
    setError(null)
    // Deliberado: los textos NUNCA se pasan al store ni se persisten — se
    // usan solo para "calibrar" (en el mock, ni siquiera eso) y se descartan.
    onListo()
  }

  return (
    <div className="space-y-3" data-testid="pantalla-tono">
      <p className="text-[13px] text-ink-secondary">
        Pega 3 correos que representen cómo escribe tu equipo. No necesitamos acceso a tu bandeja histórica.
      </p>

      <textarea value={correo1} onChange={(e) => setCorreo1(e.target.value)} placeholder="Correo de ejemplo 1" className="input min-h-20 w-full text-[12px]" data-testid="semilla-tono-1" />
      <textarea value={correo2} onChange={(e) => setCorreo2(e.target.value)} placeholder="Correo de ejemplo 2" className="input min-h-20 w-full text-[12px]" data-testid="semilla-tono-2" />
      <textarea value={correo3} onChange={(e) => setCorreo3(e.target.value)} placeholder="Correo de ejemplo 3" className="input min-h-20 w-full text-[12px]" data-testid="semilla-tono-3" />

      <Callout tono="info" variante="inline">
        <p className="text-[12px]">Los usamos solo para calibrar el tono. No se envían a nadie ni se guardan más allá de la calibración.</p>
      </Callout>

      {error ? (
        <Callout tono="danger" variante="inline">
          <p className="text-[12px]">{error}</p>
        </Callout>
      ) : null}

      <Button variante="primary" onClick={continuar} data-testid="continuar-tono">
        Continuar
      </Button>
    </div>
  )
}
