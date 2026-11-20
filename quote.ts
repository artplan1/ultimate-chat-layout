import type { EntryRecord } from '@/sdk'

type ConversationId = EntryRecord['conversationId']

export const fragmentLength = 80

const firstLine = (text: string) =>
  text.split('\n').find((candidate) => candidate.trim())?.trim() ?? ''

export const excerptOf = (text: string) => firstLine(text).slice(0, fragmentLength)

export const quotable = (shown: string, own: string) =>
  excerptOf(shown) !== '' && excerptOf(shown) === excerptOf(own)

export const replyQuote = (entry: Pick<EntryRecord, 'conversationId' | 'id'>, shown: string) =>
  `> ${excerptOf(shown)} (#${entry.conversationId}/${entry.id})\n\n`

export type Quote = {
  conversation: ConversationId
  entry: number
  excerpt: string
  before: string
  answer: string
}

function lineQuote(entry: Pick<EntryRecord, 'conversationId'>, line: string) {
  if (!line.startsWith('> ')) return undefined
  const reference = / \(#(\d+)\/(\d+)\)$/.exec(line)
  if (!reference) return undefined
  const conversation = Number(reference[1])
  const entryId = Number(reference[2])
  const suffix = ` (#${conversation}/${entryId})`
  if (conversation !== entry.conversationId || !line.endsWith(suffix)) return undefined
  const excerpt = line.slice(2, line.length - suffix.length)
  return excerpt ? { conversation: entry.conversationId, entry: entryId, excerpt } : undefined
}

export function quoteReferences(
  entry: Pick<EntryRecord, 'conversationId'>,
  text: string,
): Quote[] {
  const lines = text.split('\n')
  return lines.flatMap((line, index) => {
    const head = lineQuote(entry, line)
    if (!head) return []
    return [
      {
        ...head,
        before: lines.slice(0, index).join('\n').trim(),
        answer: lines
          .slice(index + 1)
          .join('\n')
          .replace(/^\s*\n/, ''),
      },
    ]
  })
}

export function quotedReply(
  entry: Pick<EntryRecord, 'conversationId'>,
  text: string,
  sourceOf: (entry: number) => string | undefined,
): Quote | undefined {
  return quoteReferences(entry, text).find((candidate) => {
    const source = sourceOf(candidate.entry)
    return source !== undefined && candidate.excerpt === excerptOf(source)
  })
}
