import { Suspense } from 'react'
import { PlaybooksView } from '@/features/playbooks/PlaybooksView'

export default function Page() {
  return (
    <Suspense>
      <PlaybooksView />
    </Suspense>
  )
}
