'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SessionsMonitor } from '@/features/activity/components'
import { CronJobList } from '@/features/cron/components'
import { AgentLogs } from '@/features/ops/components'
import { MessageSquare, Clock, Terminal, Activity } from 'lucide-react'

type TabView = 'sessions' | 'cron' | 'logs'

function OpsTab({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof MessageSquare; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-fast ease-out-expo ${
        active
          ? 'bg-primary/15 text-primary border border-primary/40 shadow-[0_0_20px_rgba(104,58,204,0.35),inset_0_1px_0_rgba(255,255,255,0.08)] -translate-y-px'
          : 'text-muted hover:text-foreground hover:bg-card-hover border border-transparent hover:border-border-subtle'
      }`}
    >
      <Icon size={14} strokeWidth={1.8} />
      {label}
    </button>
  )
}

function OpsContent() {
  const searchParams = useSearchParams()
  const viewParam = searchParams.get('view') as TabView | null
  const initialView: TabView = viewParam && ['sessions', 'cron', 'logs'].includes(viewParam) ? viewParam : 'sessions'
  const [tab, setTab] = useState<TabView>(initialView)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 md:px-6 pt-6 pb-4 border-b border-border-subtle space-y-5">
        <div className="flex items-center gap-4">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/12 border border-primary/30 shadow-glow-purple">
            <Activity size={20} className="text-primary" strokeWidth={1.8} />
          </span>
          <div>
            <h1 className="font-sans text-3xl md:text-4xl font-bold tracking-tight leading-none bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
              Ops
            </h1>
            <p className="text-[11px] text-muted mt-1 italic font-sans">sesiones · cron · agent logs</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <OpsTab active={tab === 'sessions'} onClick={() => setTab('sessions')} icon={MessageSquare} label="Sessions" />
          <OpsTab active={tab === 'cron'} onClick={() => setTab('cron')} icon={Clock} label="Cron Jobs" />
          <OpsTab active={tab === 'logs'} onClick={() => setTab('logs')} icon={Terminal} label="Agent Logs" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {tab === 'sessions' ? (
          <SessionsMonitor />
        ) : tab === 'cron' ? (
          <CronJobList />
        ) : (
          <AgentLogs />
        )}
      </div>
    </div>
  )
}

export default function OpsPage() {
  return (
    <Suspense>
      <OpsContent />
    </Suspense>
  )
}
