import { expect, test } from 'vitest'
import { quotedReply, quotable, quoteReferences, replyQuote } from '../quote.ts'

const source = 'Первый абзац ответа.\n\nхвост'
const quote = (of: string) => replyQuote({ conversationId: 52, id: 97 }, of)
const find = (id: number) => (id === 97 ? source : undefined)

test('a quote Reply writes is read back, with the answer under it', () => {
  expect(quotedReply({ conversationId: 52 }, `${quote(source)}че?`, find)).toEqual({
    conversation: 52,
    entry: 97,
    excerpt: 'Первый абзац ответа.',
    before: '',
    answer: 'че?',
  })
})

test('the same quote still reads back after the composer trims a reply with no words', () => {
  expect(quotedReply({ conversationId: 52 }, quote(source).trim(), find)).toEqual({
    conversation: 52,
    entry: 97,
    excerpt: 'Первый абзац ответа.',
    before: '',
    answer: '',
  })
})

test('the quote reads back wherever a merged queued input put it', () => {
  expect(quotedReply({ conversationId: 52 }, `вопрос\n${quote(source)}второй текст`, find)).toEqual(
    {
      conversation: 52,
      entry: 97,
      excerpt: 'Первый абзац ответа.',
      before: 'вопрос',
      answer: 'второй текст',
    },
  )
})

test('a quote cut where the 80th character is a space is read back too', () => {
  const line = `${'а'.repeat(79)} ${'б'.repeat(20)}`
  const long = `${line}\n\nrest`
  expect(quotedReply({ conversationId: 52 }, `${quote(long)}мой ответ`, () => long)).toEqual({
    conversation: 52,
    entry: 97,
    excerpt: `${'а'.repeat(79)} `,
    before: '',
    answer: 'мой ответ',
  })
})

test('ordinary text stays text', () => {
  expect(quotedReply({ conversationId: 52 }, '> просто цитата\n\nответ', find)).toBeUndefined()
  expect(quotedReply({ conversationId: 52 }, '> другие слова (#52/97)\n\nответ', find)).toBeUndefined()
  expect(quotedReply({ conversationId: 53 }, `${quote(source)}че?`, find)).toBeUndefined()
  expect(quotedReply({ conversationId: 52 }, `${quote(source)}че?`, () => undefined)).toBeUndefined()
  expect(quoteReferences({ conversationId: 52 }, '> Первый абзац ответа. (#052/097)')).toEqual([])
  expect(quoteReferences({ conversationId: 52 }, '> Первый абзац ответа. (#52/97)   ')).toEqual([])
})

test('an unverified look-alike above the reply does not hide it', () => {
  const text = `> другие слова (#52/97)\nвопрос\n${quote(source)}че?`
  expect(quotedReply({ conversationId: 52 }, text, find)).toEqual({
    conversation: 52,
    entry: 97,
    excerpt: 'Первый абзац ответа.',
    before: '> другие слова (#52/97)\nвопрос',
    answer: 'че?',
  })
})

test('a look-alike whose source is unknown does not stop the search at another entry', () => {
  const later = 'Второй абзац ответа.'
  const text = `> другие слова (#52/97)\n> ${later} (#52/98)`
  expect(
    quotedReply({ conversationId: 52 }, text, (id) => (id === 98 ? later : undefined)),
  ).toEqual({
    conversation: 52,
    entry: 98,
    excerpt: 'Второй абзац ответа.',
    before: '> другие слова (#52/97)',
    answer: '',
  })
})

test('Reply is offered only where the shown words are the entry own', () => {
  expect(quotable('Первый абзац ответа.', 'Первый абзац ответа.')).toBe(true)
  expect(quotable('Первый абзац ответа.', 'другой текст')).toBe(false)
  expect(quotable('', 'Первый абзац ответа.')).toBe(false)
  expect(quotable('', 'Attached file: `a.png` (1 KB, image/png) at `/tmp/a.png`')).toBe(false)
})
