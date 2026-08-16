#!/usr/bin/env node
/**
 * Build the browser bundle for dsh-niao-quick-open.
 *
 * The bundle contract (see dsh-client-modules): lib/client.js must register
 * a factory via `window.__ModuleLoader__.load({ id, factory })`. The factory
 * is a CommonJS function receiving the runtime-provided `require`, which
 * resolves platform seeds (react) and shell modules. External dependencies
 * stay external; only our own src is bundled.
 *
 * Because src/client.js is plain JS (React.createElement, no JSX) with a
 * single external import (react), we:
 *   1. transpile src/client.js to CommonJS with esbuild (externals: react + @deepseek-ai/*)
 *   2. wrap it in the __ModuleLoader__.load({ id, factory }) registration
 */

import { build } from 'esbuild'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))

const outfile = join(root, 'lib/client.js')

await build({
  entryPoints: [join(root, 'src/client.js')],
  outfile,
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2020',
  // Keep runtime-provided modules external.
  external: ['react', '@deepseek-ai/*'],
  logLevel: 'info',
})

const body = await readFile(outfile, 'utf8')

const wrapped = `window.__ModuleLoader__.load({
  id: ${JSON.stringify(pkg.name)},
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
${body.replace(/\n$/, '')}
    return module.exports;
  }
});
`

await writeFile(outfile, wrapped)
console.log(`built ${outfile}`)
