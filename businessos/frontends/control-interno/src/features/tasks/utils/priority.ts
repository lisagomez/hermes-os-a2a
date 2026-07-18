import type { TaskPriority, TaskStatus } from '@/types/database'

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; icon: string; color: string; bgColor: string }> = {
  0: { label: 'No priority', icon: '—', color: 'text-muted/80', bgColor: 'bg-card' },
  1: { label: 'Urgent', icon: '🔴', color: 'text-red-400', bgColor: 'bg-red-500/10' },
  2: { label: 'High', icon: '🟠', color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
  3: { label: 'Medium', icon: '🟡', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  4: { label: 'Low', icon: '🔵', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
}

export const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: string; color: string }> = {
  backlog: { label: 'Backlog', icon: '○', color: 'text-muted' },
  todo: { label: 'To-do', icon: '◐', color: 'text-blue-400' },
  in_progress: { label: 'In Progress', icon: '◑', color: 'text-yellow-400' },
  done: { label: 'Done', icon: '●', color: 'text-emerald-400' },
  archived: { label: 'Archived', icon: '◌', color: 'text-muted/60' },
}

export const ESTIMATE_OPTIONS = [
  { value: null, label: 'No estimate' },
  { value: 1, label: '1 point' },
  { value: 2, label: '2 points' },
  { value: 3, label: '3 points' },
  { value: 5, label: '5 points' },
  { value: 8, label: '8 points' },
  { value: 13, label: '13 points' },
  { value: 21, label: '21 points' },
] as const

export function formatDueDate(dueAt: string | null): string | null {
  if (!dueAt) return null
  const date = new Date(dueAt)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days <= 7) return `Due in ${days}d`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function getDueDateColor(dueAt: string | null): string {
  if (!dueAt) return 'text-muted/80'
  const date = new Date(dueAt)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (days < 0) return 'text-red-400'
  if (days === 0) return 'text-orange-400'
  if (days <= 2) return 'text-yellow-400'
  return 'text-muted'
}
