'use client'
import { useEffect, useCallback, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTasksStore } from '@/shared/stores/tasks-store'
import { useLayoutStore } from '@/shared/stores/layout-store'
import { notifyTaskAssigned } from '@/lib/notifications'
import type { TaskStatus, TaskPriority, TaskWithAssignees } from '@/types/database'

const STATUS_CYCLE: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'done']

function isInputFocused(): boolean {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || (el as HTMLElement).isContentEditable
}

interface UseGlobalShortcutsOptions {
  onCreateTask: () => void
  onShowHelp: () => void
}

export function useGlobalShortcuts({ onCreateTask, onShowHelp }: UseGlobalShortcutsOptions) {
  const router = useRouter()
  const pathname = usePathname()

  const tasks = useTasksStore((s) => s.tasks)
  const focusedTaskId = useTasksStore((s) => s.focusedTaskId)
  const selectedTaskId = useTasksStore((s) => s.selectedTaskId)
  const selectTask = useTasksStore((s) => s.selectTask)
  const focusTask = useTasksStore((s) => s.focusTask)
  const focusNextTask = useTasksStore((s) => s.focusNextTask)
  const focusPrevTask = useTasksStore((s) => s.focusPrevTask)
  const updateTask = useTasksStore((s) => s.updateTask)
  const showArchived = useTasksStore((s) => s.showArchived)
  const toggleLeftSidebar = useLayoutStore((s) => s.toggleLeftSidebar)

  // Build flat list of visible task IDs (column by column, top to bottom)
  const visibleTaskIds = useMemo(() => {
    const statuses: TaskStatus[] = showArchived
      ? [...STATUS_CYCLE, 'archived']
      : STATUS_CYCLE
    const ids: string[] = []
    for (const status of statuses) {
      const columnTasks = tasks
        .filter((t) => t.status === status)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      for (const t of columnTasks) {
        ids.push(t.id)
      }
    }
    return ids
  }, [tasks, showArchived])

  const getFocusedTask = useCallback((): TaskWithAssignees | null => {
    if (!focusedTaskId) return null
    return tasks.find((t) => t.id === focusedTaskId) ?? null
  }, [focusedTaskId, tasks])

  const updateTaskInDb = useCallback(async (taskId: string, updates: Record<string, unknown>) => {
    const supabase = createClient()
    await supabase.from('tasks').update(updates).eq('id', taskId)
  }, [])

  // S — cycle status on focused task
  const cycleStatus = useCallback(() => {
    const task = getFocusedTask()
    if (!task) return
    const idx = STATUS_CYCLE.indexOf(task.status)
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
    updateTask(task.id, { status: next })
    updateTaskInDb(task.id, { status: next })
  }, [getFocusedTask, updateTask, updateTaskInDb])

  // P — cycle priority on focused task (0→1→2→3→4→0)
  const cyclePriority = useCallback(() => {
    const task = getFocusedTask()
    if (!task) return
    const current = task.priority ?? 0
    const next = ((current + 1) % 5) as TaskPriority
    updateTask(task.id, { priority: next })
    updateTaskInDb(task.id, { priority: next })
  }, [getFocusedTask, updateTask, updateTaskInDb])

  // A — cycle assignee on focused task (rotate through team members)
  const cycleAssignee = useCallback(async () => {
    const task = getFocusedTask()
    if (!task) return
    const supabase = createClient()
    const { data: profiles } = await supabase.from('profiles').select('*').order('full_name')
    if (!profiles || profiles.length === 0) return

    const currentAssigneeId = task.assignees[0]?.id ?? null
    const currentIdx = currentAssigneeId ? profiles.findIndex((p) => p.id === currentAssigneeId) : -1
    const nextIdx = (currentIdx + 1) % profiles.length
    const nextProfile = profiles[nextIdx]

    // Remove old assignees and add new one
    await supabase.from('task_assignees').delete().eq('task_id', task.id)
    await supabase.from('task_assignees').insert({ task_id: task.id, profile_id: nextProfile.id })
    updateTask(task.id, { assignees: [nextProfile] })
    notifyTaskAssigned(nextProfile.id, task.title, task.id)
  }, [getFocusedTask, updateTask])

  // X — mark focused task as done
  const markDone = useCallback(() => {
    const task = getFocusedTask()
    if (!task) return
    const newStatus = task.status === 'done' ? 'backlog' : 'done'
    updateTask(task.id, { status: newStatus as TaskStatus })
    updateTaskInDb(task.id, { status: newStatus })
  }, [getFocusedTask, updateTask, updateTaskInDb])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Never intercept when a modal/detail panel has focus on inputs
      if (isInputFocused()) return
      // Don't intercept when any modal is open (TaskDetail, CreateTask)
      if (selectedTaskId) {
        // Only Escape works when detail panel is open
        if (e.key === 'Escape') {
          e.preventDefault()
          selectTask(null)
        }
        return
      }

      switch (e.key.toLowerCase()) {
        case 'j':
          e.preventDefault()
          focusNextTask(visibleTaskIds)
          break
        case 'k':
          e.preventDefault()
          focusPrevTask(visibleTaskIds)
          break
        case 'enter':
          if (focusedTaskId) {
            e.preventDefault()
            selectTask(focusedTaskId)
          }
          break
        case 'escape':
          e.preventDefault()
          if (focusedTaskId) {
            focusTask(null)
          }
          break
        case 'c':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            onCreateTask()
          }
          break
        case 's':
          if (!e.metaKey && !e.ctrlKey && focusedTaskId) {
            e.preventDefault()
            cycleStatus()
          }
          break
        case 'p':
          if (!e.metaKey && !e.ctrlKey && focusedTaskId) {
            e.preventDefault()
            cyclePriority()
          }
          break
        case 'a':
          if (!e.metaKey && !e.ctrlKey && focusedTaskId) {
            e.preventDefault()
            cycleAssignee()
          }
          break
        case 'x':
          if (!e.metaKey && !e.ctrlKey && focusedTaskId) {
            e.preventDefault()
            markDone()
          }
          break
        case '[':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            toggleLeftSidebar()
          }
          break
        case 'h':
          // Cmd+Ctrl+H — hide/show sidebar (Miro-style global toggle)
          if (e.metaKey && e.ctrlKey) {
            e.preventDefault()
            toggleLeftSidebar()
          }
          break
        case '?':
          e.preventDefault()
          onShowHelp()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    visibleTaskIds, focusedTaskId, selectedTaskId, pathname,
    focusNextTask, focusPrevTask, selectTask, focusTask,
    onCreateTask, onShowHelp, cycleStatus, cyclePriority,
    cycleAssignee, markDone, toggleLeftSidebar, router,
  ])
}
