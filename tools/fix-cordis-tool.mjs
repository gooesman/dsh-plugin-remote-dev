import { readFileSync, writeFileSync } from 'node:fs'

const files = [
  'C:/Users/78374/.dsh/profiles/node_modules/@deepseek-ai/dsh-tool-cordis/lib/index.js',
  'C:/Users/78374/AppData/Local/Programs/DSH Desktop/resources/app.asar.unpacked/node_modules/@deepseek-ai/dsh-tool-cordis/lib/index.js',
]

// current broken tail of the code schema block (missing the properties close)
const BROKEN = '\t\t\t\t\t\tdescription: "Plain JavaScript function body that returns the browser Client-half Cordis Plugin."\n\t\t\t\t\t}\n\t\t\t\t}, {\n\t\t\t\t\ttype: "string",\n\t\t\t\t\tdescription: "JSON string form of the whole code object; parsed by the tool for compatibility."\n\t\t\t\t}]\n\t\t\t}\n\t\t},\n\t\toutput: {'
const FIXED = '\t\t\t\t\t\tdescription: "Plain JavaScript function body that returns the browser Client-half Cordis Plugin."\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t\t}, {\n\t\t\t\t\ttype: "string",\n\t\t\t\t\tdescription: "JSON string form of the whole code object; parsed by the tool for compatibility."\n\t\t\t\t}]\n\t\t\t}\n\t\t},\n\t\toutput: {'

for (const file of files) {
  let src = readFileSync(file, 'utf8')
  const count = src.split(BROKEN).length - 1
  if (count !== 1) {
    console.log(`FAIL ${file}: broken tail matched ${count} times`)
    process.exit(1)
  }
  src = src.split(BROKEN).join(FIXED)
  writeFileSync(file, src, 'utf8')
  console.log('FIXED OK:', file)
}
