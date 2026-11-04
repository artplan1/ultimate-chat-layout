import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
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
