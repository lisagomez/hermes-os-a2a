import { Suspense } from 'react'
import { ColaAprobaciones } from '@/features/buzon/ColaAprobaciones'

export default function BuzonAprobacionesPage() {
  return (
    <Suspense>
      <ColaAprobaciones />
    </Suspense>
  )
}
