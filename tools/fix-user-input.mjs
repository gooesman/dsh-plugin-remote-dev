// fix-user-input.mjs — 修复"用户"输入框未挂载进 DOM 的 bug
import { readFileSync, writeFileSync } from 'node:fs'

const f = 'D:/Gooesman/project/dsh/dsh-plugin-remote-dev/src/client/index.js'
let c = readFileSync(f, 'utf8')
const CRLF = c.includes('\r\n')
const EOL = CRLF ? '\r\n' : '\n'

// 1) makeRow 支持额外 (label, input) 对
const oldMakeRow = [
  "  const makeRow = (labelText, input, extraLabel) => {",
  "    const r = el('div', 'rdr')",
  "    r.append(el('label', null, labelText), input)",
  "    if (extraLabel) {",
  "      extraLabel.style.width = 'auto'",
  "      extraLabel.style.marginLeft = '6px'",
  "      r.append(extraLabel)",
  "    }",
  "    return r",
  "  }"
].join(EOL)

const newMakeRow = [
  "  const makeRow = (labelText, input, ...rest) => {",
  "    const r = el('div', 'rdr')",
  "    r.append(el('label', null, labelText), input)",
  "    for (let i = 0; i + 1 < rest.length; i += 2) {",
  "      const l = rest[i]",
  "      const inp = rest[i + 1]",
  "      if (l) { l.style.width = 'auto'; l.style.marginLeft = '6px'; r.append(l) }",
  "      if (inp) r.append(inp)",
  "    }",
  "    return r",
  "  }"
].join(EOL)

if (!c.includes(oldMakeRow)) { console.error('FAIL: makeRow anchor not found'); process.exit(1) }
c = c.replace(oldMakeRow, newMakeRow)

// 2) 端口行：把 inpUser 挂到"用户"label 后面
const oldUse = "makeRow('端口', inpPort, el('label', null, '用户'))"
const newUse = "makeRow('端口', inpPort, el('label', null, '用户'), inpUser)"
if (!c.includes(oldUse)) { console.error('FAIL: 端口行 anchor not found'); process.exit(1) }
c = c.replace(oldUse, newUse)

writeFileSync(f, c, 'utf8')
console.log('OK patched. makeRow-v2:', c.includes(newMakeRow.split(EOL)[0]), '| inpUser mounted:', c.includes(newUse))
