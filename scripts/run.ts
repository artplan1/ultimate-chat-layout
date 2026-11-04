import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, parse, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.env.ULTIMATE_ROOT
if (!root) throw new Error('Set ULTIMATE_ROOT to an Ultimate checkout with dependencies installed.')
const host = resolve(root)
const require = createRequire(join(host, 'package.json'))
const mode = process.argv[2]
let command: string
let args: string[]

if (mode === 'check') {
  mkdirSync('.cache', { recursive: true })
  writeFileSync(
    '.cache/tsconfig.json',
    JSON.stringify({
      extends: join(host, 'tsconfig.web.json'),
      compilerOptions: {
        composite: false,
        noEmit: true,
        emitDeclarationOnly: false,
        rootDir: parse(host).root,
        types: [join(dirname(require.resolve('vite-plus/package.json')), 'dist/client.d.ts')],
        paths: {
          '@/*': [join(host, 'web/src/*')],
          react: [join(dirname(require.resolve('@types/react/package.json')), 'index.d.ts')],
          'react/*': [join(dirname(require.resolve('@types/react/package.json')), '*')],
        },
      },
      files: [resolve('web.tsx')],
      include: [],
    }),
  )
  command = join(dirname(require.resolve('typescript/package.json')), 'bin/tsc')
  args = ['-p', '.cache/tsconfig.json']
} else if (mode === 'test') {
  command = join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs')
  args = ['run', '--config', 'vitest.config.ts']
} else {
  throw new Error('Expected check or test.')
}

const result = spawnSync(process.execPath, [command, ...args], { stdio: 'inherit' })
if (result.error) throw result.error
process.exitCode = result.status ?? 1
