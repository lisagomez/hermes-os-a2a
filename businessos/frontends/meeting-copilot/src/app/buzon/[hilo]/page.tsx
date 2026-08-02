import { Suspense } from 'react'
import { HiloDetalle } from '@/features/buzon/HiloDetalle'

export default function BuzonHiloPage() {
  return (
    <Suspense>
      <HiloDetalle />
    </Suspense>
  )
}
