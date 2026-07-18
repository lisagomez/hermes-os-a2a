import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { remark } from 'remark'
import strip from 'strip-markdown'
import { createServiceClient } from '@/lib/supabase/service'
import { openClawEventSchema, CODING_TOOLS } from '@/types/openclaw'
import type { OpenClawEvent } from '@/types/openclaw'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function summarizePrompt(prompt: string | undefined): string {
  if (!prompt) return 'Untitled Task'
  const cleaned = prompt.trim()
  const firstLine = cleaned.split('\n')[0].trim()
  if (firstLine.length <= 80) return firstLine
  const truncated = firstLine.slice(0, 77)
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > 50) return truncated.slice(0, lastSpace) + '...'
  return truncated + '...'
}

function formatDuration(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime()
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

/**
 * Detect whether an eventType + message combo indicates a coding tool.
 * e.g. eventType = "tool:start", message = "Using tool: edit ..."
 */
function isCodingToolEvent(eventType: string | undefined, message: string | undefined): boolean {
  if (eventType !== 'tool:start' || !message) return false
  const toolMatch = message.match(/Using tool:\s*(\S+)/)
  if (!toolMatch) return false
  return (CODING_TOOLS as readonly string[]).includes(toolMatch[1])
}

// ---------------------------------------------------------------------------
// Agent resolution
// ---------------------------------------------------------------------------

interface AgentRow {
  id: string
  name: string
  session_key: string | null
}

async function resolveAgent(
  supabase: ReturnType<typeof createServiceClient>,
  agentId: string | undefined,
  sessionKey: string | undefined,
): Promise<AgentRow | null> {
  // 1. Try matching agentId against session_key column
  if (agentId) {
    const { data: bySessionKey } = await supabase
      .from('agents')
      .select('id, name, session_key')
      .eq('session_key', agentId)
      .limit(1)
      .single()

    if (bySessionKey) return bySessionKey
  }

  // 2. Try matching agentId against name (case-insensitive)
  if (agentId) {
    const { data: byName } = await supabase
      .from('agents')
      .select('id, name, session_key')
      .ilike('name', agentId)
      .limit(1)
      .single()

    if (byName) return byName
  }

  // 3. Try matching sessionKey against session_key column
  if (sessionKey) {
    const { data: byKey } = await supabase
      .from('agents')
      .select('id, name, session_key')
      .eq('session_key', sessionKey)
      .limit(1)
      .single()

    if (byKey) return byKey
  }

  // 4. Fallback: use the first agent in the table
  const { data: fallback } = await supabase
    .from('agents')
    .select('id, name, session_key')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  return fallback ?? null
}

// ---------------------------------------------------------------------------
// Task resolution
// ---------------------------------------------------------------------------

interface TaskRow {
  id: string
  title: string
  status: string
  started_at: string | null
  used_coding_tools: boolean | null
  openclaw_run_id: string | null
  created_at: string | null
}

async function findTaskByRunId(
  supabase: ReturnType<typeof createServiceClient>,
  runId: string,
): Promise<TaskRow | null> {
  const { data } = await supabase
    .from('tasks')
    .select('id, title, status, started_at, used_coding_tools, openclaw_run_id, created_at')
    .eq('openclaw_run_id', runId)
    .limit(1)
    .single()

  return data ?? null
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

async function handleStart(
  supabase: ReturnType<typeof createServiceClient>,
  event: OpenClawEvent,
  agent: AgentRow,
): Promise<void> {
  const title = summarizePrompt(event.prompt)
  const description = event.prompt || `OpenClaw agent task\nRun ID: ${event.runId}`
  const now = new Date().toISOString()

  let task = await findTaskByRunId(supabase, event.runId)

  if (!task) {
    // Create new task
    const { data: newTask, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        status: 'in_progress',
        tags: ['openclaw'],
        session_key: event.sessionKey ?? null,
        openclaw_run_id: event.runId,
        started_at: now,
      })
      .select('id, title, status, started_at, used_coding_tools, openclaw_run_id, created_at')
      .single()

    if (taskError || !newTask) {
      console.error('[openclaw/event] Failed to create task:', taskError)
      return
    }
    task = newTask
  } else {
    // Update existing task: reset to in_progress
    await supabase
      .from('tasks')
      .update({
        status: 'in_progress',
        started_at: now,
        used_coding_tools: false,
      })
      .eq('id', task.id)

    // Update title if it was a placeholder
    if (event.prompt && task.title.startsWith('Agent task')) {
      await supabase
        .from('tasks')
        .update({ title, description: event.prompt })
        .eq('id', task.id)
    }

    task = { ...task, started_at: now }
  }

  // Upsert task_assignees (avoid duplicates)
  const { data: existingAssignee } = await supabase
    .from('task_assignees')
    .select('id')
    .eq('task_id', task.id)
    .eq('agent_id', agent.id)
    .limit(1)
    .single()

  if (!existingAssignee) {
    await supabase
      .from('task_assignees')
      .insert({ task_id: task.id, agent_id: agent.id })
  }

  // Update agent status
  await supabase
    .from('agents')
    .update({ status: 'active', current_task_id: task.id })
    .eq('id', agent.id)

  // Create activity
  await supabase.from('activities').insert({
    type: 'status_update',
    agent_id: agent.id,
    message: `started "${title}"`,
    target_id: task.id,
  })

  // Create message with prompt
  const sourcePrefix = event.source ? `**${event.source}:** ` : ''
  await supabase.from('messages').insert({
    task_id: task.id,
    from_agent_id: agent.id,
    content: `Started\n\n${sourcePrefix}${event.prompt || 'N/A'}`,
  })
}

async function handleProgress(
  supabase: ReturnType<typeof createServiceClient>,
  event: OpenClawEvent,
  agent: AgentRow,
): Promise<void> {
  const task = await findTaskByRunId(supabase, event.runId)
  if (!task) {
    console.warn('[openclaw/event] progress: no task found for runId', event.runId)
    return
  }

  // Check if this is a coding tool event
  if (isCodingToolEvent(event.eventType, event.message) && !task.used_coding_tools) {
    await supabase
      .from('tasks')
      .update({ used_coding_tools: true })
      .eq('id', task.id)
  }

  // Insert progress message
  await supabase.from('messages').insert({
    task_id: task.id,
    from_agent_id: agent.id,
    content: event.message || 'Progress update',
  })

  // Insert activity
  await supabase.from('activities').insert({
    type: 'message',
    agent_id: agent.id,
    message: `progress update on "${task.title}"`,
    target_id: task.id,
  })
}

async function handleEnd(
  supabase: ReturnType<typeof createServiceClient>,
  event: OpenClawEvent,
  agent: AgentRow,
): Promise<void> {
  const task = await findTaskByRunId(supabase, event.runId)
  if (!task) {
    console.warn('[openclaw/event] end: no task found for runId', event.runId)
    return
  }

  // Determine final status
  const needsFeedback = event.response ? event.response.includes('?') : false

  let isCodingTask = task.used_coding_tools ?? false
  if (!isCodingTask) {
    // Check if any code documents were created for this task
    const { data: codeDocs } = await supabase
      .from('documents')
      .select('id')
      .eq('task_id', task.id)
      .eq('type', 'code')
      .limit(1)

    isCodingTask = (codeDocs?.length ?? 0) > 0
  }

  const endStatus = 'done'

  // Calculate duration
  const startTime = task.started_at || task.created_at || new Date().toISOString()
  const durationStr = formatDuration(startTime)

  // Update task status
  await supabase
    .from('tasks')
    .update({ status: endStatus })
    .eq('id', task.id)

  // Update agent: idle, clear current task
  await supabase
    .from('agents')
    .update({ status: 'idle', current_task_id: null })
    .eq('id', agent.id)

  // Create completion activity
  const statusLabel = needsFeedback ? 'needs input on' : 'completed'
  await supabase.from('activities').insert({
    type: 'status_update',
    agent_id: agent.id,
    message: `${statusLabel} "${task.title}" in ${durationStr}`,
    target_id: task.id,
  })

  // Create completion message
  const icon = needsFeedback ? 'Needs Input' : 'Completed'
  let completionMsg = `${icon} in ${durationStr}`
  if (event.response) {
    completionMsg += `\n\n${event.response}`
  }

  await supabase.from('messages').insert({
    task_id: task.id,
    from_agent_id: agent.id,
    content: completionMsg,
  })
}

async function handleError(
  supabase: ReturnType<typeof createServiceClient>,
  event: OpenClawEvent,
  agent: AgentRow,
): Promise<void> {
  const task = await findTaskByRunId(supabase, event.runId)
  if (!task) {
    console.warn('[openclaw/event] error: no task found for runId', event.runId)
    return
  }

  // Calculate duration
  const startTime = task.started_at || task.created_at || new Date().toISOString()
  const durationStr = formatDuration(startTime)

  // Update task to review
  await supabase
    .from('tasks')
    .update({ status: 'todo' })
    .eq('id', task.id)

  // Update agent to blocked
  await supabase
    .from('agents')
    .update({ status: 'blocked' })
    .eq('id', agent.id)

  // Create error activity
  await supabase.from('activities').insert({
    type: 'status_update',
    agent_id: agent.id,
    message: `error on "${task.title}" after ${durationStr}`,
    target_id: task.id,
  })

  // Create error message
  await supabase.from('messages').insert({
    task_id: task.id,
    from_agent_id: agent.id,
    content: `Error after ${durationStr}\n\n${event.error || 'Unknown error'}`,
  })
}

async function handleDocument(
  supabase: ReturnType<typeof createServiceClient>,
  event: OpenClawEvent,
  agent: AgentRow,
): Promise<void> {
  if (!event.document) {
    console.warn('[openclaw/event] document: no document payload')
    return
  }

  const task = await findTaskByRunId(supabase, event.runId)

  // Create document
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      title: event.document.title,
      content: event.document.content,
      type: event.document.type,
      path: event.document.path ?? null,
      task_id: task?.id ?? null,
      created_by_agent_id: agent.id,
    })
    .select('id')
    .single()

  if (docError || !doc) {
    console.error('[openclaw/event] Failed to create document:', docError)
    return
  }

  // Create activity
  let activityMsg = `created document "${event.document.title}"`
  if (task) {
    activityMsg += ` for "${task.title}"`
  }

  await supabase.from('activities').insert({
    type: 'document_created',
    agent_id: agent.id,
    message: activityMsg,
    target_id: task?.id ?? null,
  })

  // Create message referencing the document (if task exists)
  if (task) {
    const pathLine = event.document.path ? `\nPath: ${event.document.path}` : ''
    await supabase.from('messages').insert({
      task_id: task.id,
      from_agent_id: agent.id,
      content: `Created document: ${event.document.title}\n\nType: ${event.document.type}${pathLine}`,
    })

    // Link document to message via message_attachments
    const { data: msg } = await supabase
      .from('messages')
      .select('id')
      .eq('task_id', task.id)
      .eq('from_agent_id', agent.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (msg) {
      await supabase.from('message_attachments').insert({
        message_id: msg.id,
        document_id: doc.id,
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Conversation handler (legacy + business-os)
// ---------------------------------------------------------------------------

async function handleConversationEvent(
  supabase: ReturnType<typeof createServiceClient>,
  event: OpenClawEvent,
  agent: AgentRow,
): Promise<void> {
  const now = new Date().toISOString()

  switch (event.action) {
    case 'start': {
      await supabase.from('conversations').upsert(
        {
          run_id: event.runId,
          agent_id: agent.id,
          prompt: event.prompt ?? '',
          source: event.source ?? 'business-os',
          status: 'pending',
          started_at: now,
        },
        { onConflict: 'run_id' },
      )
      break
    }
    case 'end': {
      await supabase
        .from('conversations')
        .update({ response: event.response ?? null, status: 'done', ended_at: now })
        .eq('run_id', event.runId)
      break
    }
    case 'error': {
      await supabase
        .from('conversations')
        .update({ error: event.error ?? 'Unknown error', status: 'error', ended_at: now })
        .eq('run_id', event.runId)
      break
    }
    default:
      // progress / document events on convos are ignored
      break
  }
}

// ---------------------------------------------------------------------------
// Cron job handler
// ---------------------------------------------------------------------------

const CRON_JOB_LABELS: Record<string, string> = {
  'gmail-cleanup': 'Gmail Cleanup',
  'morning-briefing': 'Morning Briefing',
  'business-council': 'Business Council',
  'system-council': 'System Council',
  'funnel-watchdog': 'Funnel Watchdog',
  'workspace-backup': 'Workspace Backup',
}


async function getOrCreateAutomatizacionesSession(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<string> {
  const { data: existing } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('title', 'Automatizaciones')
    .eq('is_favorite', true)
    .limit(1)
    .single()

  if (existing) return existing.id

  // Assign cron sessions to the owner
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'owner')
    .limit(1)
    .single()
  const { data: created, error } = await supabase
    .from('chat_sessions')
    .insert({ title: 'Automatizaciones', is_favorite: true, profile_id: ownerProfile?.id ?? null })
    .select('id')
    .single()

  if (error || !created) throw new Error('Failed to create Automatizaciones session')
  return created.id
}

async function handleCronEvent(
  supabase: ReturnType<typeof createServiceClient>,
  event: OpenClawEvent,
  agent: AgentRow,
): Promise<void> {
  const now = new Date().toISOString()
  const hasError = !!event.error

  // Keep existing conversations upsert (for /cron page)
  await supabase.from('conversations').upsert(
    {
      run_id: event.runId,
      agent_id: agent.id,
      prompt: event.prompt ?? '',
      response: event.response ?? null,
      source: 'cron',
      status: hasError ? 'error' : 'done',
      error: event.error ?? null,
      // jobId + costo/tokens UNIDOS en la misma fila (sala Acciones del
      // Artificial Brain). null para runs previos a la instrumentación.
      usage: event.usage ?? null,
      started_at: now,
      ended_at: now,
    },
    { onConflict: 'run_id' },
  )

  // Inject into chat_messages for the "Automatizaciones" session.
  // event.silent = job silencioso: el run ya quedo en conversations (historial
  // input/output del Cron Lens) pero NO toca el chat ni manda push.
  //
  // Notificar si hay output real O si el job fallo. ANTES los errores morian en
  // silencio: con output vacio la condicion era falsa, no se inyectaba nada ni
  // se mandaba push. Resultado: jobs que tronaban (ej. timeout de business-council
  // / monthly-review) "desaparecian" sin que el dueño se enterara. Un watchdog que
  // se rompe en silencio es peor que no tenerlo.
  const output = event.response?.trim() ?? ''
  const hasOutput = !!output && output !== '(no output)'
  if ((hasOutput || hasError) && !event.silent) {
    const jobId = event.prompt ?? 'cron'
    const jobLabel = CRON_JOB_LABELS[jobId] ?? jobId
    const chatContent = hasOutput
      ? output
      : `⚠️ **${jobLabel}** falló:\n\n${event.error ?? 'Error desconocido'}`
    // Session id de "Automatizaciones" — se usa para inyectar el mensaje Y para
    // que el push deep-linkee directo a esa conversacion (?session=) y caiga abajo.
    let autoSessionId: string | null = null
    try {
      autoSessionId = await getOrCreateAutomatizacionesSession(supabase)
      await supabase.from('chat_messages').insert({
        session_id: autoSessionId,
        role: 'assistant',
        content: chatContent,
        metadata: {
          source: 'cron',
          jobId,
          jobLabel,
          isError: hasError,
        },
      })
      await supabase
        .from('chat_sessions')
        .update({ updated_at: now })
        .eq('id', autoSessionId)
    } catch (err) {
      console.error('[openclaw/event] Failed to inject cron message into chat:', err)
      // Non-blocking — don't break the webhook
    }

    await sendCronPush(supabase, jobId, chatContent, hasError, autoSessionId)
  }
}

let vapidReady = false
function ensureVapid() {
  if (vapidReady) return
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  if (!publicKey || !privateKey) return
  webpush.setVapidDetails(
    `mailto:${(process.env.VAPID_EMAIL ?? 'admin@example.com').trim()}`,
    publicKey,
    privateKey,
  )
  vapidReady = true
}

/** Strip markdown to plain text using remark + strip-markdown (handles all GFM) */
async function stripMd(md: string): Promise<string> {
  const file = await remark().use(strip).process(md)
  return String(file).replace(/\n{3,}/g, '\n\n').trim()
}

/** Cron jobs that should NEVER send push notifications regardless of output. */
const SILENT_CRON_JOBS = new Set([
  'gmail-cleanup',
  'metrics-snapshot',
  'funnel-watchdog',
  'workspace-backup',
])

async function sendCronPush(
  supabase: ReturnType<typeof createServiceClient>,
  jobId: string,
  output: string,
  isError: boolean,
  sessionId?: string | null,
): Promise<void> {
  try {
    // Silent jobs never push (unless they error)
    if (SILENT_CRON_JOBS.has(jobId) && !isError) return

    ensureVapid()
    if (!vapidReady) return

    // Only send to the owner — fetch owner profile ids then filter subscriptions
    const { data: owners } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'owner')
    const ownerIds = owners?.map((o) => o.id) ?? []
    if (ownerIds.length === 0) return

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', ownerIds)
    if (!subs?.length) return

    const title = isError
      ? `${CRON_JOB_LABELS[jobId] ?? jobId} — Error`
      : CRON_JOB_LABELS[jobId] ?? jobId
    const plain = await stripMd(output)
    const body = plain.length > 200 ? plain.slice(0, 200) + '...' : plain

    // Deep-link a la conversacion de Automatizaciones (?session=): al tocar la
    // notificacion cae directo en ese chat y hasta abajo (el SW postMessea
    // open-chat-session en warm, y ChatPanel lee ?session= en cold open).
    const url = sessionId ? `/chat?session=${sessionId}` : '/chat'
    const payload = JSON.stringify({
      title,
      body,
      url,
      tag: `cron-${jobId}`,
      icon: '/icon.svg',
    })

    const invalidEndpoints: string[] = []
    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          )
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode
          if (status && status >= 400 && status < 500) {
            invalidEndpoints.push(sub.endpoint)
          }
        }
      }),
    )

    if (invalidEndpoints.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', invalidEndpoints)
    }
  } catch {
    // Push notifications are best-effort — never block the webhook
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    // Authenticate via bearer token
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.OPENCLAW_GATEWAY_TOKEN

    if (!expectedToken) {
      console.error('[openclaw/event] OPENCLAW_GATEWAY_TOKEN env var is not set')
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 },
      )
    }

    const token = authHeader?.replace('Bearer ', '')
    if (token !== expectedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      )
    }

    // Parse and validate payload
    const body: unknown = await request.json()
    const parseResult = openClawEventSchema.safeParse(body)

    if (!parseResult.success) {
      console.warn('[openclaw/event] Invalid payload:', parseResult.error.format())
      return NextResponse.json(
        { error: 'Invalid payload', details: parseResult.error.format() },
        { status: 400 },
      )
    }

    const event = parseResult.data
    console.log(`[openclaw/event] ${event.action} | runId=${event.runId} | agent=${event.agentId ?? 'unknown'}`)

    // Initialize Supabase service client (bypasses RLS for agent writes)
    const supabase = createServiceClient()

    // Resolve agent
    const agent = await resolveAgent(supabase, event.agentId, event.sessionKey)
    if (!agent) {
      console.error('[openclaw/event] No agent found in database')
      return NextResponse.json(
        { error: 'No agent found' },
        { status: 400 },
      )
    }

    // Route conversation events to conversations table (not Kanban)
    if (event.source === 'business-os') {
      await handleConversationEvent(supabase, event, agent)
      return NextResponse.json({ ok: true, action: event.action, runId: event.runId, routed: 'conversations' })
    }

    // Route cron events to conversations table + push notification
    if (event.source === 'cron') {
      await handleCronEvent(supabase, event, agent)
      return NextResponse.json({ ok: true, action: event.action, runId: event.runId, routed: 'cron' })
    }

    // Dispatch to action handler
    switch (event.action) {
      case 'start':
        await handleStart(supabase, event, agent)
        break
      case 'progress':
        await handleProgress(supabase, event, agent)
        break
      case 'end':
        await handleEnd(supabase, event, agent)
        break
      case 'error':
        await handleError(supabase, event, agent)
        break
      case 'document':
        await handleDocument(supabase, event, agent)
        break
    }

    return NextResponse.json({ ok: true, action: event.action, runId: event.runId })
  } catch (err) {
    console.error('[openclaw/event] Unhandled error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: message },
      { status: 500 },
    )
  }
}
