import { readFileSync } from 'node:fs'

const real = readFileSync('C:/Users/78374/Doubao/chats/2026-09-08/new-chat/session-real.jsonl', 'utf8')
const lines = real.split('\n').filter(Boolean)

let n = 0
for (const line of lines) {
  if (line.includes('"tool/call"')) {
    n++
    const j = JSON.parse(line)
    const d = j.data || {}
    console.log('===== tool/call', n, '=====')
    console.log(JSON.stringify(d).slice(0, 3000))
    console.log('')
    if (n >= 11) break
  }
}
