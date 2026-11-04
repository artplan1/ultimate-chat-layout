import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'

const root = process.env.ULTIMATE_ROOT
if (!root) throw new Error('Set ULTIMATE_ROOT to an Ultimate checkout with dependencies installed.')
const host = resolve(root)
const require = createRequire(join(host, 'package.json'))

export default {
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: [
      { find: /^@\/sdk$/, replacement: join(host, 'web/src/sdk/types.ts') },
      {
        find: /^vitest$/,
        replacement: join(dirname(require.resolve('vitest/package.json')), 'dist/index.js'),
      },
      ...['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom/server'].map(
        (name) => ({
          find: new RegExp(`^${name}$`),
          replacement: require.resolve(name),
        }),
      ),
    ],
  },
  test: { include: ['test/**/*.test.ts'], environment: 'node' },
}
