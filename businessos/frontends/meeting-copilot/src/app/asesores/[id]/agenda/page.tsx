import { Suspense } from 'react'
import { AgendaAsesor } from '@/features/agenda/AgendaAsesor'

export default function AgendaAsesorPage() {
  return (
    <Suspense>
      <AgendaAsesor />
    </Suspense>
  )
}
