import { redirect } from 'next/navigation'

export default function CronPage() {
  redirect('/ops?view=cron')
}
