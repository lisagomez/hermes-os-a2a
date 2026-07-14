import { redirect } from 'next/navigation'

type HomePageProps = {
  searchParams?: Promise<{
    task?: string | string[]
  }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const taskParam = Array.isArray(params?.task) ? params?.task[0] : params?.task

  if (taskParam) {
    redirect(`/board?task=${encodeURIComponent(taskParam)}`)
  }

  // Default de la app (AI-first): abrir el producto = caer en el
  // chat con conversación nueva. El dashboard vive a un tap en el sidebar.
  redirect('/chat')
}
