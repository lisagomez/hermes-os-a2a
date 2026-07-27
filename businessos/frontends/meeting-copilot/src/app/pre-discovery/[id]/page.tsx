import { Suspense } from 'react'
import { VistaCaso } from '@/features/pre-discovery/VistaCaso'

export default function Page() {
  return (
    <Suspense>
      <VistaCaso />
    </Suspense>
  )
}
