import { CrmResumenCard } from '@/features/crm/CrmResumenCard'
import { HomeView } from '@/features/home/HomeView'

// La card CRM lee Supabase en cada request (real-source): sin force-dynamic,
// Vercel hornearía sus números en el build.
export const dynamic = 'force-dynamic'

export default function Page() {
  return <HomeView crmCard={<CrmResumenCard />} />
}
