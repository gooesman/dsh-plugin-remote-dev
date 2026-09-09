import { readFileSync } from 'node:fs'
import { decompress } from 'fzstd'
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const zstdPath = process.argv[2]
const comp = readFileSync(zstdPath)
const raw = decompress(comp)
const nums = raw.toString('utf8').split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n))
const text = Buffer.from(Uint8Array.from(nums)).toString('utf8')

const calls = []
const lines = text.split('\n')
for (let li = 0; li < lines.length; li++) {
  const line = lines[li]
  if (!line.includes('tool/call')) continue
  let j
  try { j = JSON.parse(line) } catch (e) { continue }
  if (j.type === 'tool/call' && j.data && (j.data.name === 'cordis_define' || j.data.name === 'cordis_undefine' || j.data.name === 'cordis_run' || j.data.name === 'cordis_stop')) {
    calls.push({ li, name: j.data.name, args: j.data.arguments })
  }
}
console.log('total tool calls:', calls.length)
for (const c of calls) console.log(`  line ${c.li}: ${c.name}`)
const defs = calls.filter(c => c.name === 'cordis_define')
if (!defs.length) { console.log('no define'); process.exit(0) }
const last = defs[defs.length - 1]
console.log('LAST define at line', last.li)
let parsed
try { parsed = JSON.parse(last.args) } catch (e) { console.log('args not JSON:', last.args.slice(0, 300)); process.exit(0) }
console.log('plugin:', JSON.stringify(parsed.plugin))
const codeObj = typeof parsed.code === 'string' ? JSON.parse(parsed.code) : parsed.code
console.log('code keys:', Object.keys(codeObj || {}))
const realHost = readFileSync('D:/Gooesman/project/dsh/dsh-plugin-remote-dev/dynamic/host.js', 'utf8')
const realClient = readFileSync('D:/Gooesman/project/dsh/dsh-plugin-remote-dev/dynamic/client.js', 'utf8')
const mh = (codeObj && codeObj.host) || ''
const mc = (codeObj && codeObj.client) || ''
console.log('host: model', mh.length, 'real', realHost.length, 'identical', mh === realHost)
console.log('client: model', mc.length, 'real', realClient.length, 'identical', mc === realClient)
if (mh !== realHost) {
  let i = 0; while (i < Math.min(mh.length, realHost.length) && mh[i] === realHost[i]) i++
  console.log('host first diff at', i)
  console.log('model: ...', JSON.stringify(mh.slice(Math.max(0, i - 60), i + 100)))
  console.log('real : ...', JSON.stringify(realHost.slice(Math.max(0, i - 60), i + 100)))
}
console.log('--- model host tail:', JSON.stringify(mh.slice(-60)))
console.log('--- model client tail:', JSON.stringify(mc.slice(-60)))
for (const [name, code] of [['host', mh], ['client', mc]]) {
  const tmp = join(tmpdir(), 'tx2-' + name + '.js')
  writeFileSync(tmp, 'async(()=>{\n' + code + '\n})();\n', 'utf8')
  try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); console.log(name, '=> TRANSMITTED WRAP SYNTAX OK') }
  catch (e) { console.log(name, '=> TRANSMITTED WRAP SYNTAX FAIL'); console.log(String(e.stderr).split('\n').slice(0, 10).join('\n')) }
}
