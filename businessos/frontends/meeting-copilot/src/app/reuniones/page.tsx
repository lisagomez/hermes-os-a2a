import { Suspense } from 'react'
import { MeetingsList } from '@/features/meetings/MeetingsList'

export default function Page() {
  return (
    <Suspense>
      <MeetingsList />
    </Suspense>
  )
}
