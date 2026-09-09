import { readFileSync, writeFileSync } from 'node:fs'

const files = [
  'C:/Users/78374/.dsh/profiles/node_modules/@deepseek-ai/dsh-tool-cordis/lib/index.js',
  'C:/Users/78374/AppData/Local/Programs/DSH Desktop/resources/app.asar.unpacked/node_modules/@deepseek-ai/dsh-tool-cordis/lib/index.js',
]

const OLD = '\t\t\t\tadditionalProperties: false,\n\t\t\t\trequired: true,\n\t\t\t\tproperties: {'
const NEW = '\t\t\t\tadditionalProperties: false,\n\t\t\t\trequired: [],\n\t\t\t\tproperties: {'

for (const file of files) {
  let src = readFileSync(file, 'utf8')
  const count = src.split(OLD).length - 1
  if (count !== 1) {
    console.log(`FAIL ${file}: matched ${count} times`)
    process.exit(1)
  }
  src = src.split(OLD).join(NEW)
  writeFileSync(file, src, 'utf8')
  console.log('FIXED OK:', file)
}
