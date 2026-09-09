import { readFileSync } from 'node:fs'
import { decompress } from 'fzstd'

const zstdPath = process.argv[2]
if (!zstdPath) { console.error('usage: node analyze-session.mjs <session.jsonl.zstd>'); process.exit(1) }

// zstd -> comma-separated byte list text -> rebuild binary -> utf8 jsonl
const comp = readFileSync(zstdPath)
const raw = decompress(comp)
const listText = raw.toString('utf8')
const nums = listText.split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n))
const buf = Uint8Array.from(nums)
const text = Buffer.from(buf).toString('utf8')
console.log('DECODED LEN:', text.length)
console.log('HAS tool/call:', text.includes('tool/call'))
console.log('HEAD:', text.slice(0, 300))
console.log('---')
// extract tool/call lines
const lines = text.split('\n')
let n = 0
for (const line of lines) {
  if (line.includes('tool/call')) {
    n++
    try {
      const j = JSON.parse(line)
      const d = j.data || j
      console.log('===== tool/call', n, '=====')
      const s = JSON.stringify(d)
      console.log('len:', s.length)
      console.log(s.slice(0, 1500))
      // if it's cordis_define, dump the tail of the arguments
      const args = d.arguments || (d.msg && d.msg.arguments)
      if (args) {
        const a = typeof args === 'string' ? args : JSON.stringify(args)
        console.log('--- arguments tail 400 ---')
        console.log(a.slice(-400))
      }
      console.log('')
    } catch (e) {
      console.log('===== tool/call', n, '(parse fail) =====', line.slice(0, 300))
    }
  }
}
console.log('TOTAL tool/call lines:', n)
