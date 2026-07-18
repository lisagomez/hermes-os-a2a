'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

/**
 * AI-first conversational path: pre-fills the chat input with a draft and opens
 * the chat. It NEVER auto-sends — the chat reads `?draft=` and only sets the
 * input. Gate the buttons that use this behind owner access (the chat is
 * owner-only). This is how "mirror" surfaces hand an action to the agent instead
 * of adding operate-buttons of their own.
 */
export function useAskAgent() {
  const router = useRouter()
  return useCallback(
    (draft: string) => {
      router.push(`/chat?draft=${encodeURIComponent(draft)}`)
    },
    [router],
  )
}
