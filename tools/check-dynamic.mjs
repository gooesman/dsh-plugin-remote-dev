import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

for (const name of ['host.js', 'client.js']) {
  const code = readFileSync(join('D:/Gooesman/project/dsh/dsh-plugin-remote-dev/dynamic', name), 'utf8')
  const wrapped = 'async(()=>{\n' + code + '\n})();\n'
  const tmp = join(tmpdir(), 'wrap-' + name + '.js')
  writeFileSync(tmp, wrapped, 'utf8')
  try {
    execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' })
    console.log(name, '=> WRAP SYNTAX OK')
  } catch (e) {
    console.log(name, '=> WRAP SYNTAX FAIL')
    console.log(String(e.stderr).split('\n').slice(0, 8).join('\n'))
  }
}
