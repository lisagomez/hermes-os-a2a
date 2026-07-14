import type {
  ChatPromptInput,
  LocalDrawingRecord,
  LocalEventRecord,
  LocalFileRecord,
  LocalTaskRecord,
  OfflinePackRequest,
  OfflinePackResult,
  SearchHit,
  SyncQueueItem,
  SyncResult,
  MarkSyncQueueItemInput,
} from './types'

interface BrowserLocalState {
  tasks: LocalTaskRecord[]
  events: LocalEventRecord[]
  drawings: LocalDrawingRecord[]
  files: LocalFileRecord[]
  queue: SyncQueueItem[]
  snapshots: Record<string, { module: string; payload: unknown; updatedAt: string }>
  lastSyncedAt?: string | null
  lastPackPath?: string | null
}

const STORE_KEY = 'business-os-local-first-v1'

async function kv() {
  return import('idb-keyval')
}

function now() {
  return new Date().toISOString()
}

function uuid(prefix: string) {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}_${id}`
}

async function readState(): Promise<BrowserLocalState> {
  if (typeof window === 'undefined') return emptyState()
  const { get } = await kv()
  return (await get<BrowserLocalState>(STORE_KEY)) ?? emptyState()
}

async function writeState(state: BrowserLocalState) {
  if (typeof window === 'undefined') return
  const { set } = await kv()
  await set(STORE_KEY, state)
}

function emptyState(): BrowserLocalState {
  return {
    tasks: [],
    events: [],
    drawings: [],
    files: [],
    queue: [],
    snapshots: {},
    lastSyncedAt: null,
    lastPackPath: null,
  }
}

function enqueue(state: BrowserLocalState, entityType: string, entityId: string, operation: string, payload: unknown): SyncQueueItem {
  const item: SyncQueueItem = {
    id: uuid('queue'),
    entityType,
    entityId,
    operation,
    payloadJson: JSON.stringify(payload),
    status: 'pending',
    attempts: 0,
    lastError: null,
    createdAt: now(),
    updatedAt: now(),
  }
  state.queue.unshift(item)
  return item
}

function upsertById<T extends { id: string }>(rows: T[], next: T) {
  const index = rows.findIndex((row) => row.id === next.id)
  if (index === -1) return [next, ...rows]
  const copy = [...rows]
  copy[index] = next
  return copy
}

export async function browserStatus() {
  const state = await readState()
  return {
    pendingCount: state.queue.filter((item) => item.status === 'pending').length,
    failedCount: state.queue.filter((item) => item.status === 'failed').length,
    conflictCount: state.queue.filter((item) => item.status === 'conflict').length,
    lastSyncedAt: state.lastSyncedAt ?? null,
    lastPackPath: state.lastPackPath ?? null,
  }
}

export async function listLocalTasks() {
  const state = await readState()
  return state.tasks.filter((task) => !task.deletedAt)
}

export async function upsertLocalTask(task: LocalTaskRecord, queue = true) {
  const state = await readState()
  const next = { ...task, syncStatus: task.syncStatus ?? 'queued' as const, updatedAt: task.updatedAt || now() }
  state.tasks = upsertById(state.tasks, next)
  if (queue) enqueue(state, 'task', next.id, 'upsert', next)
  await writeState(state)
  return next
}

export async function listLocalEvents(from?: string, to?: string) {
  const state = await readState()
  return state.events
    .filter((event) => !event.deletedAt)
    .filter((event) => !from || event.startsAt >= from)
    .filter((event) => !to || event.startsAt <= to)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

export async function upsertLocalEvent(event: LocalEventRecord, queue = true) {
  const state = await readState()
  const next = { ...event, status: event.status ?? 'queued' as const, updatedAt: event.updatedAt || now() }
  state.events = upsertById(state.events, next)
  if (queue) enqueue(state, 'calendar_event', next.id, 'upsert', next)
  await writeState(state)
  return next
}

export async function listLocalDrawings() {
  const state = await readState()
  return state.drawings.filter((drawing) => !drawing.deletedAt)
}

export async function upsertLocalDrawing(drawing: LocalDrawingRecord, queue = true) {
  const state = await readState()
  const next = { ...drawing, syncStatus: drawing.syncStatus ?? 'queued' as const, updatedAt: drawing.updatedAt || now() }
  state.drawings = upsertById(state.drawings, next)
  if (queue) enqueue(state, 'drawing', next.id, 'upsert', next)
  await writeState(state)
  return next
}

export async function registerLocalFile(file: LocalFileRecord) {
  const state = await readState()
  state.files = upsertById(state.files, file)
  await writeState(state)
  return file
}

export async function listSyncQueue() {
  const state = await readState()
  return state.queue.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function markSyncQueueItem(input: MarkSyncQueueItemInput) {
  const state = await readState()
  const item = state.queue.find((row) => row.id === input.id)
  if (!item) throw new Error(`Sync queue item not found: ${input.id}`)

  item.status = input.status
  item.lastError = input.lastError ?? null
  item.attempts += 1
  item.updatedAt = now()

  if (item.entityType === 'task') {
    state.tasks = state.tasks.map((task) => (
      task.id === item.entityId
        ? { ...task, cloudId: input.cloudId ?? task.cloudId ?? null, syncStatus: input.status === 'pending' ? 'queued' : input.status }
        : task
    ))
  } else if (item.entityType === 'calendar_event') {
    state.events = state.events.map((event) => (
      event.id === item.entityId
        ? { ...event, cloudId: input.cloudId ?? event.cloudId ?? null, status: input.status === 'pending' ? 'queued' : input.status }
        : event
    ))
  } else if (item.entityType === 'drawing') {
    state.drawings = state.drawings.map((drawing) => (
      drawing.id === item.entityId
        ? { ...drawing, cloudId: input.cloudId ?? drawing.cloudId ?? null, syncStatus: input.status === 'pending' ? 'queued' : input.status }
        : drawing
    ))
  }

  if (input.status === 'synced') state.lastSyncedAt = now()
  await writeState(state)
  return item
}

export async function queueChatPrompt(input: ChatPromptInput) {
  const state = await readState()
  const item = enqueue(state, 'chat_prompt', uuid('chat_prompt'), 'send_prompt', {
    ...input,
    createdAt: now(),
  })
  await writeState(state)
  return item
}

export async function syncNow(online: boolean): Promise<SyncResult> {
  const state = await readState()
  const candidates = state.queue.filter((item) => item.status === 'pending' || item.status === 'failed')
  const result: SyncResult = { processed: 0, synced: 0, failed: 0, conflicts: 0 }
  for (const item of candidates) {
    result.processed += 1
    item.attempts += 1
    item.updatedAt = now()
    if (!online) {
      item.status = 'failed'
      item.lastError = 'Offline; queued for retry when connectivity returns'
      result.failed += 1
      continue
    }
    item.status = 'synced'
    item.lastError = null
    result.synced += 1
  }
  if (result.synced > 0) state.lastSyncedAt = now()
  await writeState(state)
  return result
}

export async function prepareOfflinePack(request: OfflinePackRequest): Promise<OfflinePackResult> {
  const state = await readState()
  const generatedAt = now()
  const name = request.name ?? `browser-pack-${generatedAt.slice(0, 10)}`
  const manifest = {
    name,
    generatedAt,
    notes: request.notes ?? null,
    counts: {
      tasks: state.tasks.length,
      events: state.events.length,
      drawings: state.drawings.length,
      files: state.files.length,
    },
    snapshots: request.snapshots ?? {},
  }
  const { set } = await kv()
  const packPath = `indexeddb://${STORE_KEY}/packs/${name}`
  await set(`${STORE_KEY}:pack:${name}`, manifest)
  state.lastPackPath = packPath
  await writeState(state)
  return {
    packPath,
    manifestPath: `${packPath}/manifest.json`,
    generatedAt,
    tasks: state.tasks.length,
    events: state.events.length,
    drawings: state.drawings.length,
    files: state.files.length,
  }
}

export async function cacheSnapshot(module: string, key: string, payload: unknown) {
  const state = await readState()
  state.snapshots[key] = { module, payload, updatedAt: now() }
  await writeState(state)
}

export async function getCachedSnapshot<T>(key: string): Promise<T | null> {
  const state = await readState()
  return (state.snapshots[key]?.payload as T | undefined) ?? null
}

export async function searchLocal(query: string): Promise<SearchHit[]> {
  const state = await readState()
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  const taskHits = state.tasks
    .filter((task) => !task.deletedAt && task.title.toLowerCase().includes(needle))
    .slice(0, 25)
    .map<SearchHit>((task) => ({
      id: task.id,
      module: 'tasks',
      title: task.title,
      subtitle: task.status ?? null,
      updatedAt: task.updatedAt,
    }))
  const eventHits = state.events
    .filter((event) => !event.deletedAt && event.title.toLowerCase().includes(needle))
    .slice(0, 25)
    .map<SearchHit>((event) => ({
      id: event.id,
      module: 'calendar',
      title: event.title,
      subtitle: event.startsAt,
      updatedAt: event.updatedAt,
    }))
  const drawingHits = state.drawings
    .filter((drawing) => !drawing.deletedAt && drawing.title.toLowerCase().includes(needle))
    .slice(0, 25)
    .map<SearchHit>((drawing) => ({
      id: drawing.id,
      module: 'canvas',
      title: drawing.title,
      subtitle: drawing.syncStatus ?? null,
      updatedAt: drawing.updatedAt,
    }))
  return [...taskHits, ...eventHits, ...drawingHits]
}
