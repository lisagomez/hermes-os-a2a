import { VerticalCard } from '@/features/dashboard/components/pantheon/vertical-card'
import { getDataSource } from '@/features/dashboard/services'

export const dynamic = 'force-dynamic'

export default async function PantheonPage() {
  const pantheon = await getDataSource().pantheon()

  return (
    <div>
      <h1 className="text-2xl font-bold">Pantheon</h1>
      <p className="mt-1 text-sm text-ink-secondary">
        Una mente, tres bocas: estado del gateway, cerebro y skills por vertical.
        El dashboard observa (API + Supabase); jamás toca los volúmenes.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {pantheon.map((v) => (
          <VerticalCard key={v.vertical} v={v} />
        ))}
      </div>
    </div>
  )
}
