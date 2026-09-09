import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const copies = [
  'C:/Users/78374/AppData/Local/nvm/v22.19.0/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-tool-cordis/lib/index.js',
  'C:/Users/78374/.dsh/profiles/node_modules/@deepseek-ai/dsh-tool-cordis/lib/index.js',
  'C:/Users/78374/AppData/Local/Programs/DSH Desktop/resources/app.asar.unpacked/node_modules/@deepseek-ai/dsh-tool-cordis/lib/index.js'
]

const IMPORT_LINE = `import { defineTool } from "@deepseek-ai/dsh-tools";`
const FS_IMPORT = `import { readFileSync } from "node:fs";`
const RAWCODE_MARK = `const rawCode = typeof args.code === "string" ? JSON.parse(args.code) : args.code;`
const PATH_RESOLVE = `
			if (rawCode && typeof rawCode.host === "string" && /^[A-Za-z]:[\\\\/]/.test(rawCode.host) && existsSync(rawCode.host)) rawCode.host = readFileSync(rawCode.host, "utf8");
			if (rawCode && typeof rawCode.client === "string" && /^[A-Za-z]:[\\\\/]/.test(rawCode.client) && existsSync(rawCode.client)) rawCode.client = readFileSync(rawCode.client, "utf8");`

let allOk = true
for (const p of copies) {
  if (!existsSync(p)) { console.log('MISSING:', p); allOk = false; continue }
  let s = readFileSync(p, 'utf8')
  const o1 = s.includes(FS_IMPORT)
  const o2 = s.includes(PATH_RESOLVE)
  if (o1 && o2) { console.log('already patched:', p); continue }
  if (!s.includes(IMPORT_LINE)) { console.log('IMPORT anchor missing:', p); allOk = false; continue }
  if (!s.includes(RAWCODE_MARK)) { console.log('RAWCODE anchor missing:', p); allOk = false; continue }
  s = s.replace(IMPORT_LINE, IMPORT_LINE + '\n' + FS_IMPORT)
  s = s.replace(RAWCODE_MARK, RAWCODE_MARK + PATH_RESOLVE)
  writeFileSync(p, s, 'utf8')
  console.log('patched:', p, s.length)
}
// verify hashes
const hs = copies.filter(p => existsSync(p)).map(p => {
  const { createHash } = require('node:crypto')
  return createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 16)
})
console.log('hashes:', hs.join(' '))
console.log('all identical:', new Set(hs).size === 1)
console.log(allOk ? 'OK' : 'SOME FAILED')
