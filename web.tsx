import { defineWebExtension } from '@/sdk'
import type { EntryRenderer } from '@/sdk'

const UserEntry: EntryRenderer = ({ entry, core }) => {
  const yours =
    entry.kind === 'pi.user'
      ? entry.model?.[0]?.role === 'user'
      : (entry.data as { from?: unknown } | undefined)?.from === 'user'
  if (!yours) return core
  return <div className="ml-auto w-[calc(100%-0.75rem)] min-w-0 pt-2 sm:w-[86%]">{core}</div>
}

function UserLabel() {
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-lg border border-brand/35"
      data-ui="chat-layout-user"
    >
      <span className="absolute -top-2 right-3 rounded bg-secondary px-1.5 font-mono text-[11px] leading-4 text-foreground">
        You
      </span>
    </div>
  )
}

export default defineWebExtension({
  entries: {
    'pi.user': UserEntry,
    'board.message': UserEntry,
    'board.reply': UserEntry,
  },
  userBubble: [UserLabel],
})
