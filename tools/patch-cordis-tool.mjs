import { readFileSync, writeFileSync } from 'node:fs'

const files = [
  'C:/Users/78374/.dsh/profiles/node_modules/@deepseek-ai/dsh-tool-cordis/lib/index.js',
  'C:/Users/78374/AppData/Local/Programs/DSH Desktop/resources/app.asar.unpacked/node_modules/@deepseek-ai/dsh-tool-cordis/lib/index.js',
]

// --- patch fragments (exact, tab-indented as in the file) ---
const P1_OLD = '\t\t\t\t}]\n\t\t\t},\n\t\t\tname: {\n\t\t\t\ttype: "string",\n\t\t\t\trequired: true,\n\t\t\t\tdescription: "Short, readable Package name."'
const P1_NEW = '\t\t\t\t}, {\n\t\t\t\t\ttype: "string",\n\t\t\t\t\tdescription: "JSON string form of the plugin descriptor; accepted for compatibility and parsed by the tool."\n\t\t\t\t}]\n\t\t\t},\n\t\t\tname: {\n\t\t\t\ttype: "string",\n\t\t\t\trequired: true,\n\t\t\t\tdescription: "Short, readable Package name."'

const P2_OLD = '\t\t\tcode: {\n\t\t\t\ttype: "object",\n\t\t\t\tadditionalProperties: false,\n\t\t\t\trequired: true,\n\t\t\t\tproperties: {'
const P2_NEW = '\t\t\tcode: {\n\t\t\t\toneOf: [{\n\t\t\t\ttype: "object",\n\t\t\t\tadditionalProperties: false,\n\t\t\t\trequired: true,\n\t\t\t\tproperties: {'

const P3_OLD = '\t\t\t\t\t\tdescription: "Plain JavaScript function body that returns the browser Client-half Cordis Plugin."\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t},\n\t\toutput: {'
const P3_NEW = '\t\t\t\t\t\tdescription: "Plain JavaScript function body that returns the browser Client-half Cordis Plugin."\n\t\t\t\t\t}\n\t\t\t\t}, {\n\t\t\t\t\ttype: "string",\n\t\t\t\t\tdescription: "JSON string form of the whole code object; parsed by the tool for compatibility."\n\t\t\t\t}]\n\t\t\t}\n\t\t},\n\t\toutput: {'

const P4_OLD = '\t\t\tconst plugin = args.plugin.kind === "new" ? {\n\t\t\t\tkind: "new",\n\t\t\t\tidPrefix: args.plugin.idPrefix\n\t\t\t} : {\n\t\t\t\tkind: "existing",\n\t\t\t\tpluginId: CordisDynamicPluginId(args.plugin.pluginId)\n\t\t\t};\n\t\t\tconst receipt = ctx.dynamicCordisRunner.define({\n\t\t\t\tsessionId: requireAgent(exec).id,\n\t\t\t\tplugin,\n\t\t\t\tname: args.name,\n\t\t\t\tpurpose: args.purpose,\n\t\t\t\tcode: {\n\t\t\t\t\t...args.code.host === void 0 ? {} : { host: args.code.host },\n\t\t\t\t\t...args.code.client === void 0 ? {} : { client: args.code.client }\n\t\t\t\t}\n\t\t\t});'
const P4_NEW = '\t\t\tconst rawPlugin = typeof args.plugin === "string" ? JSON.parse(args.plugin) : args.plugin;\n\t\t\tconst rawCode = typeof args.code === "string" ? JSON.parse(args.code) : args.code;\n\t\t\tconst plugin = rawPlugin.kind === "new" ? {\n\t\t\t\tkind: "new",\n\t\t\t\tidPrefix: rawPlugin.idPrefix\n\t\t\t} : {\n\t\t\t\tkind: "existing",\n\t\t\t\tpluginId: CordisDynamicPluginId(rawPlugin.pluginId)\n\t\t\t};\n\t\t\tconst receipt = ctx.dynamicCordisRunner.define({\n\t\t\t\tsessionId: requireAgent(exec).id,\n\t\t\t\tplugin,\n\t\t\t\tname: args.name,\n\t\t\t\tpurpose: args.purpose,\n\t\t\t\tcode: {\n\t\t\t\t\t...rawCode.host === void 0 ? {} : { host: rawCode.host },\n\t\t\t\t\t...rawCode.client === void 0 ? {} : { client: rawCode.client }\n\t\t\t\t}\n\t\t\t});'

for (const file of files) {
  let src = readFileSync(file, 'utf8')
  const patches = [P1_OLD, P2_OLD, P3_OLD, P4_OLD]
  const news = [P1_NEW, P2_NEW, P3_NEW, P4_NEW]
  for (let i = 0; i < patches.length; i++) {
    const count = src.split(patches[i]).length - 1
    if (count !== 1) {
      console.log(`FAIL ${file}: patch ${i + 1} matched ${count} times`)
      process.exit(1)
    }
    src = src.split(patches[i]).join(news[i])
  }
  writeFileSync(file, src, 'utf8')
  console.log('PATCHED OK:', file)
}
