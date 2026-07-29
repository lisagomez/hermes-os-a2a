import { Suspense } from 'react'
import { TableroCitas } from '@/features/agenda/TableroCitas'

export default function CitasPage() {
  return (
    <Suspense>
      <TableroCitas />
    </Suspense>
  )
}
