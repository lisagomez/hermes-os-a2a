import { Suspense } from 'react'
import { ReprogramarCita } from '@/features/agenda/ReprogramarCita'

export default function ReprogramarPage() {
  return (
    <Suspense>
      <ReprogramarCita />
    </Suspense>
  )
}
