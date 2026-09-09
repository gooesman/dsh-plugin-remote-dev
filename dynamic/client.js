/**
 * Remote Dev SSH Plugin - Client Side
 * @module @goosesman/dsh-plugin-remote-dev/client
 *
 * Renders the bottom-right control panel with vanilla DOM so it mounts in any
 * browser shell (webui and desktop) without depending on the cordis `slots`
 * service. All plugin logic (connect / disconnect / workspace / browse / logs)
 * talks to the host half through `host.call`.
 */

return {
  apply(ctx) {
  if (typeof document === 'undefined' || !document.body) return

  const css = `.rdevp{position:fixed;top:72px;right:16px;bottom:auto;z-index:10000;width:360px;max-height:80vh;display:flex;flex-direction:column;background:rgba(22,24,28,.96);color:#e8eaf0;border:1px solid rgba(255,255,255,.14);border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.45);font-size:12px;overflow:hidden}.rdevpill{position:fixed;top:72px;right:16px;z-index:10000;display:flex;align-items:center;gap:6px;padding:7px 12px;background:rgba(22,24,28,.95);color:#e8eaf0;border:1px solid rgba(255,255,255,.16);border-radius:999px;box-shadow:0 4px 16px rgba(0,0,0,.35);font-size:12px;cursor:pointer;user-select:none}.rdevpill:hover{background:rgba(40,44,52,.98)}.rdevpill .pdot{width:8px;height:8px;border-radius:50%;background:#888}.rdevpill .pdot.on{background:#4caf7d}.rdevh{display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(255,255,255,.06);cursor:grab}.rdevh:active{cursor:grabbing}.rdt{font-weight:600;font-size:13px}.rdd{width:8px;height:8px;border-radius:50%;background:#888}.rdd.on{background:#4caf7d}.rdx{margin-left:auto;background:none;border:none;color:#cfd3dc;cursor:pointer;font-size:14px}.rdb{padding:10px;display:flex;flex-direction:column;gap:8px;overflow:auto}.rdr{display:flex;gap:6px;align-items:center}.rdr label{width:40px;flex:none;color:#a8aebc}.rdi{flex:1;min-width:0;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);border-radius:6px;color:#e8eaf0;padding:5px 7px;font-size:12px}.rdmd{display:flex;gap:10px;align-items:center;color:#a8aebc}.rdck{display:flex;gap:6px;align-items:center;color:#a8aebc;cursor:pointer;font-size:11px}.rdbt{background:rgba(86,134,244,.9);border:none;border-radius:6px;color:#fff;padding:6px 14px;cursor:pointer;font-size:12px}.rdbt.sec{background:rgba(255,255,255,.14);color:#e8eaf0}.rdbt:disabled{opacity:.5;cursor:default}.rds{color:#a8aebc;font-weight:600}.rdlg{background:rgba(0,0,0,.35);border-radius:6px;padding:6px 8px;font-family:Consolas,monospace;font-size:11px;max-height:220px;overflow:auto;white-space:pre-wrap;word-break:break-all}.rdlg .e{color:#ff8585}.rdlg .o{color:#7fd6a4}.rden{display:flex;flex-wrap:wrap;gap:4px;max-height:120px;overflow:auto}.rde{background:rgba(255,255,255,.1);border:none;border-radius:4px;color:#dfe3ec;padding:2px 8px;cursor:pointer;font-size:11px}.rde.dir{color:#8fc1ff}`

  // Inject styles (returns a disposer, so it unwinds with the fiber).
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.remdev = 'css'
    tag.textContent = css
    document.head.append(tag)
    return () => { tag.remove() }
  }, 'remdev:css')

  const state = {
    host: '192.168.2.10',
    port: '22',
    user: 'zlth',
    keyPath: 'C:/Users/78374/.ssh/id_ed25519',
    password: '',
    hostKeyMode: 'persistent',
    pushKey: false,
    status: null,
    busy: false,
    open: false,
    workspace: '',
    entries: [],
    logs: [],
    seq: 0
  }

  const el = (tag, cls, text) => {
    const n = document.createElement(tag)
    if (cls) n.className = cls
    if (text !== undefined) n.textContent = text
    return n
  }

  // ---- build panel once ----
  const pill = el('div', 'rdevpill')
  const pdot = el('span', 'pdot')
  const plabel = el('span', null, '远程开发')
  pill.append(pdot, plabel)

  const panel = el('div', 'rdevp')
  const header = el('div', 'rdevh')
  const dot = el('span', 'rdd')
  const title = el('span', 'rdt', '远程开发 Remote Dev')
  const toggle = el('button', 'rdx', '—')
  header.append(dot, title, toggle)
  const body = el('div', 'rdb')
  panel.append(header, body)

  const makeRow = (labelText, input, ...rest) => {
    const r = el('div', 'rdr')
    r.append(el('label', null, labelText), input)
    for (let i = 0; i + 1 < rest.length; i += 2) {
      const l = rest[i]
      const inp = rest[i + 1]
      if (l) { l.style.width = 'auto'; l.style.marginLeft = '6px'; r.append(l) }
      if (inp) r.append(inp)
    }
    return r
  }

  const inpHost = el('input', 'rdi')
  const inpPort = el('input', 'rdi')
  const inpUser = el('input', 'rdi')
  const inpKey = el('input', 'rdi')
  inpKey.placeholder = '私钥路径（可选）'
  const inpPass = el('input', 'rdi')
  inpPass.type = 'password'
  inpPass.placeholder = '密码（可选）'
  const radPersist = el('input'); radPersist.type = 'radio'; radPersist.name = 'rdk'
  const radTemp = el('input'); radTemp.type = 'radio'; radTemp.name = 'rdk'
  const chkPush = el('input'); chkPush.type = 'checkbox'
  const btnConnect = el('button', 'rdbt', '连接')
  const btnDisconnect = el('button', 'rdbt sec', '断开')
  const fpSpan = el('span')
  fpSpan.style.cssText = 'color:#a8aebc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'
  const inpWs = el('input', 'rdi')
  inpWs.placeholder = '/home/user/project'
  const btnSet = el('button', 'rdbt sec', '设置')
  const btnBrowse = el('button', 'rdbt sec', '浏览')
  const entriesBox = el('div', 'rden')
  const logsBox = el('div', 'rdlg')

  body.append(
    makeRow('主机', inpHost),
    makeRow('端口', inpPort, el('label', null, '用户'), inpUser),
    makeRow('密钥', inpKey),
    makeRow('密码', inpPass)
  )
  // fingerprint-policy row + push-key row + buttons row + workspace section
  const mdRow = el('div', 'rdmd')
  mdRow.append(el('span', null, '指纹策略:'))
  const lblP = el('label', null); lblP.append(radPersist, document.createTextNode(' 永久保留'))
  const lblT = el('label', null); lblT.append(radTemp, document.createTextNode(' 临时保留'))
  mdRow.append(lblP, lblT)
  const pushRow = el('label', 'rdck')
  pushRow.append(chkPush, document.createTextNode(' 连接后推送本机公钥（可选）'))
  const btnRow = el('div', 'rdr')
  btnRow.append(btnConnect, btnDisconnect, fpSpan)
  const wsSection = el('div')
  wsSection.append(el('div', 'rds', '远程工作区'))
  const wsRow = el('div', 'rdr')
  wsRow.append(inpWs, btnSet, btnBrowse)
  wsSection.append(wsRow, entriesBox)
  body.append(mdRow, pushRow, btnRow, wsSection, logsBox)

  const conn = () => !!(state.status && state.status.connected)
  const disabled = () => conn() || state.busy

  function addLog(text, k = 'i') {
    state.logs = [{ t: text, k, n: ++state.seq }, ...state.logs].slice(0, 150)
    sync()
  }

  function sync() {
    const c = conn()
    // pill / panel visibility
    pill.style.display = state.open ? 'none' : ''
    panel.style.display = state.open ? '' : 'none'
    pdot.className = 'pdot' + (c ? ' on' : '')
    dot.className = 'rdd' + (c ? ' on' : '')
    toggle.textContent = '—'
    inpHost.disabled = inpPort.disabled = inpUser.disabled = inpKey.disabled = inpPass.disabled = radPersist.disabled = radTemp.disabled = chkPush.disabled = disabled()
    radPersist.checked = state.hostKeyMode === 'persistent'
    radTemp.checked = state.hostKeyMode === 'temporary'
    chkPush.checked = state.pushKey
    btnConnect.textContent = state.busy ? '...' : '连接'
    btnConnect.disabled = disabled() || !state.host
    btnDisconnect.style.display = c ? '' : 'none'
    btnDisconnect.disabled = state.busy
    fpSpan.textContent = (state.status && state.status.fingerprint) ? state.status.fingerprint : ''
    wsSection.style.display = c ? '' : 'none'
    inpWs.value = state.workspace || ''
    btnSet.disabled = state.busy || !state.workspace
    btnBrowse.disabled = state.busy
    entriesBox.innerHTML = ''
    if (c && state.entries.length) {
      for (const n of state.entries) {
        const b = el('button', 'rde' + (n.slice(-1) === '/' ? ' dir' : ''), n)
        b.addEventListener('click', () => handleEntry(n))
        entriesBox.append(b)
      }
    }
    logsBox.innerHTML = ''
    if (state.logs.length) {
      for (const m of state.logs) {
        const d = el('div', m.k === 'e' ? 'e' : m.k === 'o' ? 'o' : '', m.t)
        logsBox.append(d)
      }
    }
  }

  function setField(key, value) {
    state[key] = value
  }

  function setWorkspace(v) {
    state.workspace = v
  }

  async function connect() {
    state.busy = true
    sync()
    addLog('connecting ' + (state.user ? state.user + '@' : '') + state.host + ':' + state.port + ' ...')
    try {
      const r = await host.call('connect', {
        host: state.host,
        port: String(state.port),
        user: state.user,
        keyPath: state.keyPath,
        password: state.password,
        hostKeyMode: state.hostKeyMode,
        pushKey: state.pushKey
      })
      if (r && r.connected) {
        addLog('connected (' + r.auth + ')', 'o')
        if (r.home) addLog('home: ' + r.home)
        addLog('fingerprint [' + (r.hostKeyMode === 'temporary' ? '临时，不落盘' : '永久') + ']: ' + (r.fingerprint || '未获取'))
        if (r.push) {
          addLog(r.push.ok ? '公钥已推送：' + r.push.pubKeyPath : '公钥推送失败：' + (r.push.error || ''), r.push.ok ? 'o' : 'e')
        }
        state.workspace = r.home || ''
        state.status = await host.call('status')
      } else {
        addLog('连接失败：' + ((r && r.error) || '未知错误') + (r && r.stderr ? '\n' + String(r.stderr).split('\n').slice(-3).join('\n') : ''), 'e')
      }
    } catch (e) {
      addLog('连接异常：' + String((e && e.message) || e), 'e')
    }
    state.busy = false
    sync()
  }

  async function disconnect() {
    state.busy = true
    sync()
    try {
      await host.call('disconnect')
      state.status = null
      state.entries = []
      addLog('已断开')
    } catch (e) {
      addLog('断开异常：' + String((e && e.message) || e), 'e')
    }
    state.busy = false
    sync()
  }

  async function setWs() {
    if (!state.workspace) return
    state.busy = true
    sync()
    try {
      const r = await host.call('set_workspace', { path: state.workspace })
      if (r && r.ok) {
        addLog('工作区：' + r.workspace, 'o')
        state.status = await host.call('status')
      } else {
        addLog('设置工作区失败：' + ((r && r.error) || ''), 'e')
      }
    } catch (e) {
      addLog('设置工作区异常：' + String((e && e.message) || e), 'e')
    }
    state.busy = false
    sync()
  }

  async function browse() {
    state.busy = true
    sync()
    try {
      const r = await host.call('ls', { path: state.workspace || '' })
      if (r && r.ok) {
        state.entries = r.entries || []
        addLog('列目录：' + (state.workspace || '$HOME'))
      } else {
        addLog('列目录失败：' + ((r && r.error) || ''), 'e')
      }
    } catch (e) {
      addLog('列目录异常：' + String((e && e.message) || e), 'e')
    }
    state.busy = false
    sync()
  }

  function handleEntry(n) {
    if (n.slice(-1) === '/') {
      state.workspace = (state.workspace || '').replace(/\/+$/, '') + '/' + n
      sync()
    } else {
      addLog('文件：' + n)
    }
  }

  // ---- wire events ----
  inpHost.addEventListener('input', () => setField('host', inpHost.value))
  inpPort.addEventListener('input', () => setField('port', inpPort.value))
  inpUser.addEventListener('input', () => setField('user', inpUser.value))
  inpKey.addEventListener('input', () => setField('keyPath', inpKey.value))
  inpPass.addEventListener('input', () => setField('password', inpPass.value))
  radPersist.addEventListener('change', () => { state.hostKeyMode = 'persistent'; sync() })
  radTemp.addEventListener('change', () => { state.hostKeyMode = 'temporary'; sync() })
  chkPush.addEventListener('change', () => { state.pushKey = !!chkPush.checked; sync() })
  btnConnect.addEventListener('click', connect)
  btnDisconnect.addEventListener('click', disconnect)
  btnSet.addEventListener('click', setWs)
  btnBrowse.addEventListener('click', browse)
  inpWs.addEventListener('input', () => setWorkspace(inpWs.value))
  toggle.addEventListener('click', () => { state.open = false; sync() })
  pill.addEventListener('click', () => { state.open = true; sync() })

  // ---- drag panel by its header ----
  let drag = null
  header.addEventListener('mousedown', (e) => {
    if (e.target.closest && e.target.closest('.rdx')) return
    drag = { sx: e.clientX, sy: e.clientY, ox: panel.offsetLeft, oy: panel.offsetTop }
    e.preventDefault()
  })
  window.addEventListener('mousemove', (e) => {
    if (!drag) return
    const dx = e.clientX - drag.sx
    const dy = e.clientY - drag.sy
    panel.style.left = (drag.ox + dx) + 'px'
    panel.style.top = (drag.oy + dy) + 'px'
    panel.style.right = 'auto'
  })
  window.addEventListener('mouseup', () => { drag = null })

  // ---- mount + initial status ----
  ctx.effect(() => {
    document.body.append(pill, panel)
    return () => { pill.remove(); panel.remove() }
  }, 'remdev:panel')

  host.call('status').then(r => {
    state.status = r
    if (r && r.workspace) state.workspace = r.workspace
    sync()
  }, () => { sync() })

  sync()
}
}
