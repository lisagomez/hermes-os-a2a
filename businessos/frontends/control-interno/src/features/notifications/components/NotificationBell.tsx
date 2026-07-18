'use client'
import { useState, useEffect, useCallback, useRef, useId } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, BellOff } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Notification } from '@/types/database'
import { usePushSubscription } from '../hooks/usePushSubscription'

interface NotificationBellProps {
  compact?: boolean
  placement?: 'top' | 'bottom'
  // ghost = botón sutil sin marco/placa titanium (acciones secundarias del sidebar)
  ghost?: boolean
}

export function NotificationBell({ compact = true, placement = 'bottom', ghost = false }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const reactId = useId()
  const { status: pushStatus, loading: pushLoading, subscribe, unsubscribe } = usePushSubscription()

  const fetchNotifications = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) {
      setNotifications(data as Notification[])
      setUnreadCount(data.filter((n) => !n.delivered).length)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()

    const supabase = createClient()
    const topic = `notifications-bell-${reactId}`
    const stale = supabase.getChannels().find((c) => c.topic === `realtime:${topic}`)
    if (stale) supabase.removeChannel(stale)

    const channel = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => fetchNotifications()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchNotifications, reactId])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const markAllRead = async () => {
    const supabase = createClient()
    await supabase.from('notifications').update({ delivered: true }).eq('delivered', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, delivered: true })))
    setUnreadCount(0)
  }

  const handlePushToggle = () => {
    if (pushStatus === 'subscribed') {
      unsubscribe()
    } else if (pushStatus === 'unsubscribed') {
      subscribe()
    }
  }

  return (
    <div ref={ref} className={compact ? 'relative' : 'relative w-full'}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={compact ? `${ghost ? 'icon-btn-ghost' : 'icon-btn'} size-10 relative` : 'nav-item w-full text-sm md:text-xs'}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="size-5 md:size-[15px]" />
        {compact && unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-error text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {!compact && (
          <>
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="ml-auto rounded-full bg-error/12 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-error">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {isOpen && (
        <div
          className={`titanium-panel absolute z-50 w-[min(20rem,calc(100vw-1rem))] overflow-hidden ${
            placement === 'top'
              ? 'bottom-full left-0 mb-2'
              : 'right-0 top-full mt-2'
          }`}
        >
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle">
            <h3 className="text-xs font-semibold text-foreground/85">Notifications</h3>
            <div className="flex items-center gap-2">
              {/* Push toggle */}
              {pushStatus !== 'unsupported' && pushStatus !== 'loading' && (
                <button
                  onClick={handlePushToggle}
                  disabled={pushLoading || pushStatus === 'denied'}
                  title={
                    pushStatus === 'denied'
                      ? 'Push bloqueado — permite en ajustes del browser'
                      : pushStatus === 'subscribed'
                      ? 'Desactivar notificaciones push'
                      : 'Activar notificaciones push'
                  }
                  className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md transition-colors disabled:opacity-40
                    ${pushStatus === 'subscribed'
                      ? 'text-primary bg-primary/10 hover:bg-primary/20'
                      : 'text-muted/80 hover:text-foreground/70 hover:bg-card-hover'
                    }`}
                >
                  {pushLoading ? (
                    <span className="w-2.5 h-2.5 border border-border-accent border-t-foreground/70 rounded-full animate-spin" />
                  ) : pushStatus === 'subscribed' ? (
                    <Bell size={10} />
                  ) : (
                    <BellOff size={10} />
                  )}
                  <span>{pushStatus === 'subscribed' ? 'Push on' : 'Push'}</span>
                </button>
              )}
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] text-muted/80 hover:text-foreground/70 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-2.5 border-b border-border-subtle hover:bg-card transition-colors
                    ${!n.delivered ? 'bg-card/40' : ''}
                  `}
                >
                  <div className="flex items-start gap-2">
                    {!n.delivered && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0 shadow-glow-purple" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground/75 leading-relaxed">{n.content}</p>
                      {n.created_at && (
                        <p className="text-[10px] text-muted/70 mt-0.5">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <p className="text-xs text-muted/60">No notifications</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
