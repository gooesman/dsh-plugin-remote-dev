#!/usr/bin/env node
/**
 * Generate the cordis_define-ready dynamic-plugin source for the webui form.
 * Contract (verified against dsh-cordis-host-runner + dsh-cordis-client-runner):
 *   - code is the BODY of `(async () => { ... })()` and must `return { apply(ctx) {...} }`
 *   - plain JS only: no import / require / export / TS / JSX
 *   - host sandbox exposes global `harness` (handle/defineTool/registerTool); timers via inject:['timer'] + ctx.timeout
 *   - client sandbox exposes global `React` + `host.call`; slots/styles via ctx.get
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const dynDir = join(root, 'dynamic')
await mkdir(dynDir, { recursive: true })
const HOST_IN = join(root, 'src', 'host', 'index.js')
const CLIENT_IN = join(root, 'src', 'client', 'index.js')
const HOST_OUT = join(root, 'dynamic', 'host.js')
const CLIENT_OUT = join(root, 'dynamic', 'client.js')

const TAIL = '}\n\nexport default {\n  apply\n}\n'
const TAIL_REPLACEMENT = '}\n}\n'
const EOL = /\r?\n/g

function normalizeEol(s) {
  return s.replace(EOL, '\n')
}

function transformHost(src) {
  let out = normalizeEol(src)
  // 1. entry: `export function apply(ctx) {` -> plugin object with timer inject
  out = out.replace('export function apply(ctx) {', 'return {\n  inject: [\'timer\'],\n  apply(ctx) {')
  // 2. dynamic API: ctx.harness.* -> harness.*
  out = out.split('ctx.harness.').join('harness.')
  // 3. tail: close apply + close returned object (drop `export default { apply }`)
  out = out.replace(TAIL, TAIL_REPLACEMENT)
  return out
}

function transformClient(src) {
  let out = normalizeEol(src)
  // 1. drop `import React from 'react'` (React arrives as a closure symbol)
  out = out.replace("import React from 'react'\n\n", '')
  // 2. entry
  out = out.replace('export function apply(ctx) {', 'return {\n  apply(ctx) {')
  // 3. tail
  out = out.replace(TAIL, TAIL_REPLACEMENT)
  return out
}

const host = transformHost(await readFile(HOST_IN, 'utf8'))
const client = transformClient(await readFile(CLIENT_IN, 'utf8'))

// sanity checks
const problems = []
if (/\b(import|require|export)\b/.test(host)) problems.push('host still has import/require/export')
if (/\b(import|require|export)\b/.test(client)) problems.push('client still has import/require/export')
if (/ctx\.harness/.test(host)) problems.push('host still uses ctx.harness')
if (host.includes('ctx.harness') || host.includes('harness.') === false) problems.push('host harness global check failed')
if (client.includes('host.call') === false) problems.push('client host.call missing')

await writeFile(HOST_OUT, host, 'utf8')
await writeFile(CLIENT_OUT, client, 'utf8')

console.log('dynamic/host.js   :', host.length, 'chars')
console.log('dynamic/client.js :', client.length, 'chars')
if (problems.length) { console.error('PROBLEMS:\n' + problems.join('\n')); process.exit(1) }
console.log('sanity checks: OK')
