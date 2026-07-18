import type { ChatMessage } from '../hooks/useChat'
import type { ChatSession } from '../hooks/useChatHistory'

// Caché EN MEMORIA del último view del chat (module-level: sobrevive el
// unmount de la página al navegar entre tabs, muere al cerrar/recargar la app).
//
// Por qué existe: cada cambio de ruta desmonta ChatPanel completo (no hay
// keep-alive). Sin esto, volver a /chat re-abría la sesión pagando red +
// IndexedDB + esperar la lista de sesiones. Con esto, el view exacto que
// dejaste (mensajes ya deserializados, con toolCalls/thinking/usage vivos,
// scroll incluido) se pinta SÍNCRONO en el primer render — percepción de
// latencia cero. La verdad del server se reconcilia en background después.
export interface ChatViewCache {
  session: ChatSession
  messages: ChatMessage[]
  hasMore: boolean
  oldestLoaded: string | null
  /** scrollTop exacto al salir; null = estaba en el fondo (pin al fondo al volver) */
  scrollTop: number | null
  suggestions: string[]
}

let cache: ChatViewCache | null = null

export function saveChatView(view: ChatViewCache): void {
  cache = view
}

export function getChatView(sessionId: string): ChatViewCache | null {
  return cache && cache.session.id === sessionId ? cache : null
}

export function clearChatView(): void {
  cache = null
}
