#!/usr/bin/env node
/**
 * Simulate the cordis dynamic-plugin runtime for dynamic/host.js and dynamic/client.js:
 *   - evaluate the code as `(async () => { code })()` in a vm sandbox (host realm globals)
 *   - call the returned plugin's apply with a façade-like ctx
 *   - verify apply's return value passes cordis's `_execute` effect validation:
 *     function | null | undefined | Promise | iterable | async-iterable  (NOT a plain object)
 *   - count harness.handle / tools / slots registrations
 */
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

function effectValid(what, v) {
  if (typeof v === 'function') return true
  if (v === null || v === undefined) return true
  if (typeof v === 'object') {
    if ('then' in v) return true
    if (Symbol.iterator in v) return true
    if (Symbol.asyncIterator in v) return true
    return false
  }
  return false
}

// ---------- HOST ----------
const hostCode = readFileSync('D:/Gooesman/project/dsh/dsh-plugin-remote-dev/dynamic/host.js', 'utf8')
const handles = new Map()
const hostTools = []
const harness = {
  handle: (k, fn) => { handles.set(k, fn) },
  defineTool: (def) => { hostTools.push(def); return {} },
  registerTool: (ctx, def) => { hostTools.push(def); return () => {} }
}
const sub = {
  spawn: () => ({ on: () => {}, kill: () => {}, stdout: { on: () => {} }, stderr: { on: () => {} } }),
  execFile: () => new Promise(() => {}),
  exec: () => new Promise(() => {})
}
const fss = { readFile: async () => '', writeFile: async () => {}, exists: () => false, stat: async () => ({}) }
const sp = { workspaceRoot: 'D:/Gooesman/project/dsh', allow: () => {} }
const hostSandbox = {
  harness, console,
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  TextEncoder, TextDecoder
}
vm.createContext(hostSandbox)
const hfn = vm.runInContext('(async () => {\n' + hostCode + '\n})()', hostSandbox)
const hplugin = await hfn
console.log('host plugin keys:', Object.keys(hplugin), '| inject:', hplugin.inject)

let hBad = 0
const hctx = {
  get: (n) => ({ subprocess: sub, fs: fss, sandboxPolicy: sp }[n]),
  effect: (cb, label) => {
    let r
    try { r = cb() } catch (e) { console.log('  HOST EFFECT THREW:', e.message); hBad++ }
    const ok = effectValid('effect', r)
    if (!ok) { console.log('  INVALID effect [' + label + '] return:', typeof r, r); hBad++ }
    return () => {}
  },
  on: () => {}, once: () => {}, provide: () => {},
  timeout: () => {}, interval: () => {}, setTimeout: () => {}, setInterval: () => {}, throttle: () => {}, debounce: () => {}
}
const hret = hplugin.apply(hctx)
const hretOk = effectValid('apply', hret)
console.log('host apply return:', typeof hret, '| VALID for cordis:', hretOk)
console.log('host handlers:', [...handles.keys()])
console.log('host tools registered:', hostTools.length)
console.log('host effect issues:', hBad)

// ---------- CLIENT ----------
const clientCode = readFileSync('D:/Gooesman/project/dsh/dsh-plugin-remote-dev/dynamic/client.js', 'utf8')
const slotsSeen = []
const stylesObj = { insert: (css) => () => {} }
const clientSandbox = {
  React: { useState: () => [], useEffect: () => {}, createElement: () => ({}) },
  console,
  styles: stylesObj,
  host: { call: async () => ({}) },
  harness: { call: async () => ({}) }
}
vm.createContext(clientSandbox)
const cfn = vm.runInContext('(async () => {\n' + clientCode + '\n})()', clientSandbox)
const cplugin = await cfn
console.log('\nclient plugin keys:', Object.keys(cplugin))
let cBad = 0
const cctx = {
  get: (n) => ({
    slots: { inject: (slot, fn) => { slotsSeen.push(slot); fn && fn() }, register: () => () => {} },
    styles: stylesObj
  }[n]),
  effect: (cb, label) => {
    let r
    try { r = cb() } catch (e) { console.log('  CLIENT EFFECT THREW:', e.message); cBad++ }
    if (!effectValid('effect', r)) { console.log('  INVALID effect [' + label + '] return:', typeof r); cBad++ }
    return () => {}
  },
  on: () => {}, once: () => {}, provide: () => {},
  timeout: () => {}, interval: () => {}, setTimeout: () => {}, setInterval: () => {}, throttle: () => {}, debounce: () => {}
}
const cret = cplugin.apply(cctx)
console.log('client apply return:', typeof cret, '| VALID for cordis:', effectValid('apply', cret))
console.log('client slots:', slotsSeen)
console.log('client effect issues:', cBad)
