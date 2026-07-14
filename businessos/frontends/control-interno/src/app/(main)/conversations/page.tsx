import { ConversationFeed } from '@/features/conversations/components/ConversationFeed'

export default function ConversationsPage() {
  return (
    <div className="h-full p-4">
      <div className="h-full rounded-2xl border border-border-subtle bg-card/40 overflow-hidden">
        <ConversationFeed />
      </div>
    </div>
  )
}
