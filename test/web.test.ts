import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test, vi } from 'vitest'

vi.mock('lucide-react', () => ({
  CornerLeftUpIcon: () => null,
  ReplyIcon: () => null,
}))

vi.mock('@/sdk', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  api: { history: () => Promise.resolve({ entries: [] }) },
  events: { emit: () => undefined },
  fillComposer: () => undefined,
  shownUserText: (text: string) => text,
  useComposerReady: () => false,
  useTranscript: () => [],
  UserText: () => null,
  useUltimate: () => ({ focusComposer: () => undefined }),
}))

import extension from '../web.tsx'

const core = createElement('button', { 'data-core': 'original' }, 'Original content and actions')
const original = renderToStaticMarkup(core)
const model = [{ role: 'user', content: 'hello', timestamp: 0 }]

test.each(['pi.user', 'board.message', 'board.reply'])(
  '%s keeps user content inside its layout',
  (kind) => {
    const Renderer = extension.entries[kind]
    const html = renderToStaticMarkup(
      createElement(Renderer, {
        entry: { id: 1, conversationId: 2, kind, input: true, model, data: { from: 'user' } },
        core,
      }),
    )
    expect(html).toContain(original)
    expect(html).toContain('ml-auto')
    expect(html).toContain('sm:w-[86%]')
  },
)

test.each(['board.message', 'board.reply'])(
  '%s leaves agent input unchanged despite model role user',
  (kind) => {
    const Renderer = extension.entries[kind]
    const html = renderToStaticMarkup(
      createElement(Renderer, {
        entry: { id: 1, conversationId: 2, kind, input: true, model, data: { from: 42 } },
        core,
      }),
    )
    expect(html).toBe(original)
  },
)

test('the user overlay renders a readable label without intercepting clicks', () => {
  const html = renderToStaticMarkup(createElement(extension.userBubble[0]))
  expect(html).toContain('You')
  expect(html).toContain('pointer-events-none')
})
