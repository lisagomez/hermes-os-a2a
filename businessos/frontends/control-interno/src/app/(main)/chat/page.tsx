'use client'

// Chat + Live en una sola superficie (2 jul 2026). Live (Command Center de voz) era
// una ruta propia poco usada; ahora es pestaña. Carga lazy: el HUD de voz
// solo se monta si se abre la pestaña.

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Bot, AudioLines, Loader2 } from 'lucide-react'
import { ChatPanel } from '@/features/chat/components/ChatPanel'

const CommandCenterLive = dynamic(
  () => import('@/features/command-center/components/CommandCenterLive').then(m => m.CommandCenterLive),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full"><Loader2 size={20} className="animate-spin text-primary" /></div> }
)

function ChatTabs() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'chat' | 'live'>(searchParams.get('tab') === 'live' ? 'live' : 'chat')

  // En móvil el toggle Live vive en el Header global (no en el header del panel,
  // que es hidden md:flex). El Header despacha este evento para cambiar de vista.
  useEffect(() => {
    const goLive = () => setTab('live')
    window.addEventListener('openclaw:go-live', goLive)
    return () => window.removeEventListener('openclaw:go-live', goLive)
  }, [])

  // Toggle de modo: un solo boton que lleva al OTRO modo, viviendo en el header
  // del panel activo. En Chat: "Live" a la izquierda del "+". En Live: "Chat" en
  // la esquina superior derecha.
  const liveToggle = (
    <button
      onClick={() => setTab('live')}
      title="Command Center · Live"
      className="nav-item min-h-0 px-2.5 py-1.5 text-xs font-semibold"
    >
      <AudioLines size={13} strokeWidth={1.8} />
      Live
    </button>
  )

  const chatToggle = (
    <button
      onClick={() => setTab('chat')}
      title="Volver al chat"
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/15 text-white/70 hover:text-white hover:bg-white/10 transition-colors text-xs font-medium"
    >
      <Bot size={13} strokeWidth={1.8} />
      Chat
    </button>
  )

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0">
        {tab === 'chat'
          ? <ChatPanel headerAction={liveToggle} />
          : <CommandCenterLive headerAction={chatToggle} />}
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 size={20} className="animate-spin text-primary" /></div>}>
      <ChatTabs />
    </Suspense>
  )
}
