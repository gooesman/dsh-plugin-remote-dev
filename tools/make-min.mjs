import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = 'D:/Gooesman/project/dsh/dsh-plugin-remote-dev'
const dyn = join(root, 'dynamic')

// Safe transform: strip // and /* */ comments, collapse blank lines, trim trailing
// whitespace on each line. Does NOT touch string contents (line-based, string-aware
// enough: we skip comment stripping inside strings by tracking quote state).
function stripComments(src) {
  const out = []
  let i = 0
  const n = src.length
  let state = 'code' // code | line | block | sq | dq | tmpl
  let blockStart = 0
  let lineStart = 0
  while (i < n) {
    const c = src[i]
    const d = src[i + 1]
    switch (state) {
      case 'code':
        if (c === '/' && d === '/') { state = 'line'; i += 2; break }
        if (c === '/' && d === '*') { state = 'block'; blockStart = i; i += 2; break }
        if (c === "'") { state = 'sq'; i++; break }
        if (c === '"') { state = 'dq'; i++; break }
        if (c === '`') { state = 'tmpl'; i++; break }
        i++
        break
      case 'line':
        if (c === '\n') { state = 'code'; i++; break }
        i++
        break
      case 'block':
        if (c === '*' && d === '/') { state = 'code'; i += 2; break }
        i++
        break
      case 'sq':
        if (c === '\\') { i += 2; break }
        if (c === "'") { state = 'code'; i++; break }
        if (c === '\n') { state = 'code'; i++; break }
        i++
        break
      case 'dq':
        if (c === '\\') { i += 2; break }
        if (c === '"') { state = 'code'; i++; break }
        if (c === '\n') { state = 'code'; i++; break }
        i++
        break
      case 'tmpl':
        if (c === '\\') { i += 2; break }
        if (c === '`') { state = 'code'; i++; break }
        i++
        break
    }
  }
  // Rebuild: replace comment spans with nothing, keep code.
  let result = ''
  let pos = 0
  let mode = 'code'
  const comments = []
  // simpler: do a second pass emitting only non-comment chars
  i = 0
  let codeOut = ''
  state = 'code'
  while (i < n) {
    const c = src[i]
    const d = src[i + 1]
    switch (state) {
      case 'code':
        if (c === '/' && d === '/') { state = 'line'; i += 2; break }
        if (c === '/' && d === '*') { state = 'block'; i += 2; break }
        if (c === "'") { state = 'sq'; codeOut += c; i++; break }
        if (c === '"') { state = 'dq'; codeOut += c; i++; break }
        if (c === '`') { state = 'tmpl'; codeOut += c; i++; break }
        codeOut += c; i++
        break
      case 'line':
        if (c === '\n') { state = 'code'; codeOut += '\n'; i++; break }
        i++
        break
      case 'block':
        if (c === '*' && d === '/') { state = 'code'; i += 2; break }
        i++
        break
      case 'sq':
        if (c === '\\') { codeOut += c + (d ?? ''); i += 2; break }
        if (c === "'") { state = 'code'; codeOut += c; i++; break }
        codeOut += c; i++
        break
      case 'dq':
        if (c === '\\') { codeOut += c + (d ?? ''); i += 2; break }
        if (c === '"') { state = 'code'; codeOut += c; i++; break }
        codeOut += c; i++
        break
      case 'tmpl':
        if (c === '\\') { codeOut += c + (d ?? ''); i += 2; break }
        if (c === '`') { state = 'code'; codeOut += c; i++; break }
        codeOut += c; i++
        break
    }
  }
  // collapse blank lines, trim trailing spaces
  return codeOut.split('\n').map(l => l.trimEnd()).filter((l, idx, arr) => !(l.trim() === '' && (idx === 0 || arr[idx - 1].trim() === ''))).join('\n').trim() + '\n'
}

for (const name of ['host.js', 'client.js']) {
  const src = readFileSync(join(dyn, name), 'utf8')
  const min = stripComments(src)
  const outPath = join(dyn, name.replace('.js', '.min.js'))
  writeFileSync(outPath, min, 'utf8')
  console.log(`${name}: ${src.length}B -> ${outPath} ${min.length}B (${Math.round(min.length / src.length * 100)}%)`)
}
