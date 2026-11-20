import {
  api,
  defineWebExtension,
  events,
  fillComposer,
  shownUserText,
  useComposerReady,
  useConversation,
  useTranscript,
  UserText,
  useUltimate,
} from '@/sdk'
import type { EntryRecord, EntryRenderer } from '@/sdk'

type ConversationId = EntryRecord['conversationId']
type EntryId = EntryRecord['id']
import { quotedReply, quotable, quoteReferences, replyQuote } from './quote.ts'
import type { Quote } from './quote.ts'
import { CornerLeftUpIcon, ReplyIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

function QuotedReply({ quote }: { quote: Quote }) {
  return (
    <button
      aria-label={`Show the message this answers, #${quote.conversation}/${quote.entry}`}
      className="mb-1.5 flex w-full min-w-0 cursor-pointer items-center gap-1.5 rounded border-l-2 border-brand/50 bg-accent/40 px-1.5 py-1 text-left font-mono text-[11px] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
      onClick={() =>
        events.emit('ultimate:reveal-entry', {
          conversationId: quote.conversation,
          entryId: quote.entry,
        })
      }
      title={`Show the message this answers (#${quote.conversation}/${quote.entry})`}
      type="button"
    >
      <CornerLeftUpIcon className="size-3 shrink-0" />
      <span className="min-w-0 truncate">{quote.excerpt}</span>
      <span className="shrink-0 text-muted-foreground/60">
        #{quote.conversation}/{quote.entry}
      </span>
    </button>
  )
}

const textOf = (entry: EntryRecord) => {
  const content = entry.model?.[0]?.content
  if (typeof content === 'string') return content
  return (content ?? [])
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('\n')
}

const ownTextOf = (entry: EntryRecord) =>
  entry.kind === 'pi.user' ? shownUserText(textOf(entry)) : textOf(entry)

const shownOf = (entry: EntryRecord, text: string) =>
  entry.kind === 'pi.user' ? shownUserText(text) : text

type Source = { id: number; entry?: EntryRecord; settled: boolean }

const useSource = (conversation: ConversationId, entry: number | undefined): Source | undefined => {
  const loaded = useTranscript().find(
    (item) => item.conversationId === conversation && item.id === entry,
  )
  const [fetched, setFetched] = useState<Source>()
  useEffect(() => {
    if (loaded || entry === undefined) return undefined
    const controller = new AbortController()
    const id = entry
    api.history(conversation, (id + 1) as EntryId, controller.signal, id as EntryId).then(
      (page) =>
        setFetched({
          id,
          entry: page.entries.find(
            (item) => item.conversationId === conversation && item.id === id,
          ),
          settled: true,
        }),
      () => setFetched({ id, settled: true }),
    )
    return () => controller.abort()
  }, [conversation, entry, loaded])
  if (loaded) return { id: entry!, entry: loaded, settled: true }
  return fetched?.id === entry ? fetched : undefined
}

function QuotedReplyText({
  core,
  entry,
  references,
  text,
}: {
  core: ReactNode
  entry: EntryRecord
  references: readonly Quote[]
  text: string
}) {
  const transcript = useTranscript()
  const [next, setNext] = useState(0)
  const pending = references[next]
  const source = useSource(entry.conversationId, pending?.entry)
  const sourceOf = (id: number) => {
    const loaded = transcript.find(
      (item) => item.conversationId === entry.conversationId && item.id === id,
    )
    if (loaded) return ownTextOf(loaded)
    return source?.entry?.id === id ? ownTextOf(source.entry) : undefined
  }
  const quote = quotedReply(entry, text, sourceOf)
  useEffect(() => {
    if (!quote && source?.settled && next < references.length - 1) setNext(next + 1)
  }, [quote, source, next, references.length])
  if (!quote) return <>{core}</>
  return (
    <>
      {quote.before && <UserText text={quote.before} />}
      <QuotedReply quote={quote} />
      {quote.answer && <UserText text={quote.answer} />}
    </>
  )
}

function QuoteText({ entry, text, core }: { entry: EntryRecord; text: string; core: ReactNode }) {
  const references = quoteReferences(entry, text)
  return references.length ? (
    <QuotedReplyText core={core} entry={entry} references={references} text={text} />
  ) : (
    <>{core}</>
  )
}

const replyable = (kind: string) => kind === 'pi.user' || kind === 'pi.assistant'

function ReplyButton({ entry, own }: { entry: EntryRecord; own: string }) {
  const { focusComposer } = useUltimate()
  return (
    <button
      aria-label="Reply to this message"
      className="cursor-pointer rounded p-0.5 transition-colors hover:text-foreground [&_svg]:size-3"
      onClick={() => {
        fillComposer(entry.conversationId, replyQuote(entry, own))
        focusComposer()
      }}
      title="Reply"
      type="button"
    >
      <ReplyIcon />
    </button>
  )
}

function ReplyGate({ entry, text }: { entry: EntryRecord; text: string }) {
  const ready = useComposerReady()
  const shown = useConversation((conversation) => conversation.id)
  const own = ownTextOf(entry)
  if (!ready || shown !== entry.conversationId || !quotable(shownOf(entry, text), own)) return null
  return <ReplyButton entry={entry} own={own} />
}

function ReplyAction({ entry, text }: { entry: EntryRecord; text: string }) {
  return replyable(entry.kind) ? <ReplyGate entry={entry} text={text} /> : null
}

const UserEntry: EntryRenderer = ({ entry, core }) => {
  const yours =
    entry.kind === 'pi.user'
      ? entry.model?.[0]?.role === 'user'
      : (entry.data as { from?: unknown } | undefined)?.from === 'user'
  if (!yours) return core
  return <div className="isolate ml-auto w-[calc(100%-0.75rem)] min-w-0 pt-2 sm:w-[86%]">{core}</div>
}

function UserLabel() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 -z-10 rounded-lg ring-1 ring-brand/35"
        data-ui="chat-layout-user"
      />
      <span className="pointer-events-none absolute -top-2 right-3 rounded bg-secondary px-1.5 font-mono text-[11px] leading-4 text-foreground">
        You
      </span>
    </>
  )
}

export default defineWebExtension({
  entries: {
    'pi.user': UserEntry,
    'board.message': UserEntry,
    'board.reply': UserEntry,
  },
  messageActions: [ReplyAction],
  userBubble: [UserLabel],
  userText: [QuoteText],
})
