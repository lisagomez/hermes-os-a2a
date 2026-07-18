'use client'
import { usePathname } from 'next/navigation'
import { Search, PanelLeft, MessageSquare, Plus, FolderTree, AudioLines, ChevronDown, Bot } from 'lucide-react'
import { AGENT_NAME } from '@/shared/agent-identity'
import { useLayoutStore } from '@/shared/stores/layout-store'
import { useSearchStore } from '@/features/search/components'
import { NotificationBell } from '@/features/notifications/components/NotificationBell'
import { ThemeToggle } from '@/shared/components/ThemeToggle'
import { useIsMobile } from '@/shared/hooks/useMediaQuery'
import { useModelStore, modelDisplayName } from '@/features/chat/stores/model-store'

export function Header() {
  const { toggleLeftSidebar, toggleChatSessionsPanel, toggleDrawSidebar } = useLayoutStore()
  const pathname = usePathname()
  const isChatPage = pathname === '/chat'
  const isDrawPage = pathname.startsWith('/draw3')
  const isMobile = useIsMobile()
  // Modelo real detrás del agente (lo alimenta useChat: fetch al montar + SSE)
  const model = useModelStore((s) => s.model)
  const modelLabel = modelDisplayName(model)

  const handleNewChat = () => {
    window.dispatchEvent(new CustomEvent('openclaw:new-chat'))
  }

  const handleGoLive = () => {
    window.dispatchEvent(new CustomEvent('openclaw:go-live'))
  }

  const handleOpenModelPicker = () => {
    window.dispatchEvent(new CustomEvent('openclaw:open-model-picker'))
  }

  return (
    <header className="titanium-header h-14 border-b border-border-subtle flex items-center justify-between px-4 relative z-10">
      <span className="specular-rim" />

      {/* Left: Sidebar toggle + sessions toggle on mobile chat */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleLeftSidebar}
          className="icon-btn size-9"
          title="Sidebar"
        >
          <PanelLeft size={18} />
        </button>

        {isChatPage && (
          <button
            onClick={toggleChatSessionsPanel}
            className="icon-btn size-9 md:hidden"
            title="Conversaciones"
          >
            <MessageSquare size={18} />
          </button>
        )}

        {isDrawPage && isMobile && (
          <button
            onClick={toggleDrawSidebar}
            className="icon-btn size-9"
            title="Páginas y carpetas"
          >
            <FolderTree size={18} />
          </button>
        )}
      </div>

      {/* Center: agente en chat móvil, badge de marca en el resto */}
      <div className="flex items-center gap-2">
        {isChatPage ? (
          <>
            <div className="md:hidden flex items-center gap-2">
              <span className="relative flex w-7 h-7 items-center justify-center rounded-full bg-card border border-primary/40">
                <Bot size={15} className="text-primary" aria-hidden />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-success border border-background" />
              </span>
              {/* Nombre + MODELO real (verdad del daemon vía model-store). Tap → selector. */}
              <button
                onClick={handleOpenModelPicker}
                className="select-none text-left rounded-lg px-1.5 py-1 -my-1 active:bg-card-hover transition-colors"
                title="Cambiar modelo"
                aria-label="Cambiar modelo de IA"
              >
                <p className="text-sm font-semibold text-foreground leading-none">{AGENT_NAME}</p>
                <p className="text-[10px] text-muted mt-0.5 flex items-center gap-0.5">
                  {modelLabel ?? AGENT_NAME}
                  <ChevronDown size={9} className="text-muted/70" />
                </p>
              </button>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <BrandBadge />
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <BrandBadge />
          </div>
        )}
      </div>

      {/* Right: actions. En /chat móvil solo Live + Nueva conversación (el toggle
          que decidimos). Search/tema/notificaciones se ocultan ahí y viven en el
          resto de las páginas (y en desktop siguen en el sidebar). */}
      <div className="flex items-center gap-1">
        {isChatPage && (
          <>
            <button
              onClick={handleGoLive}
              title="Command Center · Live"
              className="icon-btn size-9 md:hidden"
            >
              <AudioLines size={18} />
            </button>
            <button
              onClick={handleNewChat}
              title="Nueva conversación"
              className="icon-btn size-9 md:hidden"
            >
              <Plus size={18} />
            </button>
          </>
        )}
        <div className={`items-center gap-1 ${isChatPage ? 'hidden md:flex' : 'flex'}`}>
          <button
            onClick={() => useSearchStore.getState().toggle()}
            className="icon-btn size-9"
            title="Buscar"
          >
            <Search size={18} />
          </button>
          <ThemeToggle binary compact />
          <NotificationBell />
        </div>
      </div>
    </header>
  )
}

function BrandBadge() {
  return (
    <div className="relative flex items-center gap-2 px-3 py-1 rounded-full titanium-panel overflow-hidden">
      <span className="absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
      <Bot className="size-3.5 text-foreground" aria-hidden="true" />
      <span className="font-sans text-[11px] font-semibold tracking-[0.18em] uppercase text-foreground">
        business-os-new
      </span>
      <span className="block w-1 h-1 rounded-full bg-gold shadow-glow-gold" />
    </div>
  )
}
