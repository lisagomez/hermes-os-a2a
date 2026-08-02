import { Suspense } from 'react'
import { PoliticasBuzon } from '@/features/buzon/PoliticasBuzon'

export default function BuzonPoliticasPage() {
  return (
    <Suspense>
      <PoliticasBuzon />
    </Suspense>
  )
}
