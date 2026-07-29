import { Suspense } from 'react'
import { ReservaCliente } from '@/features/agenda/ReservaCliente'

export default function ReservarPage() {
  return (
    <Suspense>
      <ReservaCliente />
    </Suspense>
  )
}
