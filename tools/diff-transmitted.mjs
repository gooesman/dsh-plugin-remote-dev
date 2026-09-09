import { readFileSync } from 'node:fs'
import { decompress } from 'fzstd'
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const zstdPath = 'C:/Users/78374/.dsh/sessions/--D-Gooesman-project-dsh--/session-ce6177ab-eb85-45a4-923b-cf34064c30de/session.jsonl.zstd'
const comp = readFileSync(zstdPath)
const raw = decompress(comp)
const nums = raw.toString('utf8').split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n))
const text = Buffer.from(Uint8Array.from(nums)).toString('utf8')

let args = null
const lines = text.split('\n')
for (let li = 0; li < lines.length; li++) {
  const line = lines[li]
  if (!line.includes('tool/call') || !line.includes('cordis_define')) continue
  let j
  try { j = JSON.parse(line) } catch (e) { continue }
  if (j.type === 'tool/call' && j.data && j.data.name === 'cordis_define') {
    args = j.data.arguments
    console.log('found full tool/call at line', li)
    break
  }
}
if (!args) { console.log('no cordis_define found'); process.exit(1) }

const parsed = JSON.parse(args)
console.log('plugin:', parsed.plugin)
console.log('name:', parsed.name)
console.log('code type:', typeof parsed.code)
const codeObj = typeof parsed.code === 'string' ? JSON.parse(parsed.code) : parsed.code
console.log('code keys:', Object.keys(codeObj))
console.log('host len:', (codeObj.host || '').length, 'client len:', (codeObj.client || '').length)

// Compare host with the real file
const realHost = readFileSync('D:/Gooesman/project/dsh/dsh-plugin-remote-dev/dynamic/host.js', 'utf8')
const realClient = readFileSync('D:/Gooesman/project/dsh/dsh-plugin-remote-dev/dynamic/client.js', 'utf8')
console.log('real host len:', realHost.length)
console.log('host identical:', codeObj.host === realHost)
console.log('client identical:', codeObj.client === realClient)

// Find first divergence
if (codeObj.host !== realHost) {
  let i = 0
  const a = codeObj.host, b = realHost
  while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++
  console.log('host first diff at char', i)
  console.log('model: ...', JSON.stringify(a.slice(Math.max(0, i - 80), i + 120)))
  console.log('real : ...', JSON.stringify(b.slice(Math.max(0, i - 80), i + 120)))
}
// Also check tail
console.log('--- model host tail ---')
console.log(JSON.stringify(codeObj.host.slice(-200)))
console.log('--- real host tail ---')
console.log(JSON.stringify(realHost.slice(-200)))
console.log('--- model client tail ---')
console.log(JSON.stringify((codeObj.client || '').slice(-200)))
console.log('--- real client tail ---')
console.log(JSON.stringify(realClient.slice(-200)))

// Syntax check the transmitted host
for (const [name, code] of [['host', codeObj.host], ['client', codeObj.client]]) {
  const tmp = join(tmpdir(), 'tx-' + name + '.js')
  writeFileSync(tmp, 'async(()=>{\n' + code + '\n})();\n', 'utf8')
  try {
    execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' })
    console.log(name, '=> TRANSMITTED WRAP SYNTAX OK')
  } catch (e) {
    console.log(name, '=> TRANSMITTED WRAP SYNTAX FAIL')
    console.log(String(e.stderr).split('\n').slice(0, 12).join('\n'))
  }
}
