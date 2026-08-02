import { Suspense } from 'react'
import { BitacoraBuzon } from '@/features/buzon/BitacoraBuzon'

export default function BuzonBitacoraPage() {
  return (
    <Suspense>
      <BitacoraBuzon />
    </Suspense>
  )
}
