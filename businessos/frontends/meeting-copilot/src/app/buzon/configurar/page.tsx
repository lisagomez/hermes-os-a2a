import { Suspense } from 'react'
import { ConfigurarBuzon } from '@/features/buzon/ConfigurarBuzon'

export default function BuzonConfigurarPage() {
  return (
    <Suspense>
      <ConfigurarBuzon />
    </Suspense>
  )
}
