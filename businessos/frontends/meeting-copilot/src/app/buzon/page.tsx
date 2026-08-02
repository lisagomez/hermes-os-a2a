import { Suspense } from 'react'
import { BandejaUnificada } from '@/features/buzon/BandejaUnificada'

export default function BuzonPage() {
  return (
    <Suspense>
      <BandejaUnificada />
    </Suspense>
  )
}
