/**
 * Remote Dev SSH Plugin - Client Side
 * @module @goosesman/dsh-plugin-remote-dev/client
 */

import React from 'react'

export function apply(ctx) {
  const slots = ctx.get('slots')
  if (slots === undefined) return

  const styles = ctx.get('styles')
  if (styles === undefined) return

  // CSS styles
  const css = `.rdevp{position:fixed;right:16px;bottom:16px;z-index:10000;width:360px;max-height:80vh;display:flex;flex-direction:column;background:rgba(22,24,28,.96);color:#e8eaf0;border:1px solid rgba(255,255,255,.14);border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.45);font-size:12px;overflow:hidden}.rdevh{display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(255,255,255,.06)}.rdt{font-weight:600;font-size:13px}.rdd{width:8px;height:8px;border-radius:50%;background:#888}.rdd.on{background:#4caf7d}.rdx{margin-left:auto;background:none;border:none;color:#cfd3dc;cursor:pointer;font-size:14px}.rdb{padding:10px;display:flex;flex-direction:column;gap:8px;overflow:auto}.rdr{display:flex;gap:6px;align-items:center}.rdr label{width:40px;flex:none;color:#a8aebc}.rdi{flex:1;min-width:0;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);border-radius:6px;color:#e8eaf0;padding:5px 7px;font-size:12px}.rdmd{display:flex;gap:10px;align-items:center;color:#a8aebc}.rdck{display:flex;gap:6px;align-items:center;color:#a8aebc;cursor:pointer;font-size:11px}.rdbt{background:rgba(86,134,244,.9);border:none;border-radius:6px;color:#fff;padding:6px 14px;cursor:pointer;font-size:12px}.rdbt.sec{background:rgba(255,255,255,.14);color:#e8eaf0}.rdbt:disabled{opacity:.5;cursor:default}.rds{color:#a8aebc;font-weight:600}.rdlg{background:rgba(0,0,0,.35);border-radius:6px;padding:6px 8px;font-family:Consolas,monospace;font-size:11px;max-height:220px;overflow:auto;white-space:pre-wrap;word-break:break-all}.rdlg .e{color:#ff8585}.rdlg .o{color:#7fd6a4}.rden{display:flex;flex-wrap:wrap;gap:4px;max-height:120px;overflow:auto}.rde{background:rgba(255,255,255,.1);border:none;border-radius:4px;color:#dfe3ec;padding:2px 8px;cursor:pointer;font-size:11px}.rde.dir{color:#8fc1ff}`

  ctx.effect(() => styles.insert(css), 'remdev:css')

  // Main Panel Component
  function Panel() {
    const [form, setForm] = React.useState({
      host: '192.168.2.10',
      port: '22',
      user: 'zlth',
      keyPath: 'C:/Users/78374/.ssh/id_ed25519',
      password: '',
      hostKeyMode: 'persistent',
      pushKey: false
    })

    const [status, setStatus] = React.useState(null)
    const [busy, setBusy] = React.useState(false)
    const [open, setOpen] = React.useState(true)
    const [workspace, setWorkspace] = React.useState('')
    const [entries, setEntries] = React.useState([])
    const [logs, setLogs] = React.useState([])

    const conn = !!(status && status.connected)
    const disabled = conn || busy

    // Update form field
    function setField(key, value) {
      setForm(prev => ({ ...prev, [key]: value }))
    }

    // Add log entry
    function addLog(text, type = 'i') {
      setLogs(prev => [{ t: text, k: type, n: prev.length ? prev[0].n + 1 : 1 }, ...prev].slice(0, 150))
    }

    // Get initial status
    React.useEffect(() => {
      host.call('status').then(r => {
        setStatus(r)
        if (r && r.workspace) setWorkspace(r.workspace)
      }, () => {})
    }, [])

    // Connect
    async function connect() {
      setBusy(true)
      addLog('connecting ' + (form.user ? form.user + '@' : '') + form.host + ':' + form.port + ' ...')

      try {
        const r = await host.call('connect', {
          host: form.host,
          port: String(form.port),
          user: form.user,
          keyPath: form.keyPath,
          password: form.password,
          hostKeyMode: form.hostKeyMode,
          pushKey: form.pushKey
        })

        if (r && r.connected) {
          addLog('connected (' + r.auth + ')', 'o')
          if (r.home) addLog('home: ' + r.home)
          addLog('fingerprint [' + (r.hostKeyMode === 'temporary' ? '临时，不落盘' : '永久') + ']: ' + (r.fingerprint || '未获取'))
          if (r.push) {
            addLog(r.push.ok ? '公钥已推送：' + r.push.pubKeyPath : '公钥推送失败：' + (r.push.error || ''), r.push.ok ? 'o' : 'e')
          }
          setWorkspace(r.home || '')
          setStatus(await host.call('status'))
        } else {
          addLog('连接失败：' + ((r && r.error) || '未知错误') + (r && r.stderr ? '\n' + String(r.stderr).split('\n').slice(-3).join('\n') : ''), 'e')
        }
      } catch (e) {
        addLog('连接异常：' + String((e && e.message) || e), 'e')
      }

      setBusy(false)
    }

    // Disconnect
    async function disconnect() {
      setBusy(true)
      try {
        await host.call('disconnect')
        setStatus(null)
        setEntries([])
        addLog('已断开')
      } catch (e) {
        addLog('断开异常：' + String((e && e.message) || e), 'e')
      }
      setBusy(false)
    }

    // Set workspace
    async function setWs() {
      if (!workspace) return
      setBusy(true)
      try {
        const r = await host.call('set_workspace', { path: workspace })
        if (r && r.ok) {
          addLog('工作区：' + r.workspace, 'o')
          setStatus(await host.call('status'))
        } else {
          addLog('设置工作区失败：' + ((r && r.error) || ''), 'e')
        }
      } catch (e) {
        addLog('设置工作区异常：' + String((e && e.message) || e), 'e')
      }
      setBusy(false)
    }

    // List directory
    async function browse() {
      setBusy(true)
      try {
        const r = await host.call('ls', { path: workspace || '' })
        if (r && r.ok) {
          setEntries(r.entries || [])
          addLog('列目录：' + (workspace || '$HOME'))
        } else {
          addLog('列目录失败：' + ((r && r.error) || ''), 'e')
        }
      } catch (e) {
        addLog('列目录异常：' + String((e && e.message) || e), 'e')
      }
      setBusy(false)
    }

    // Handle entry click
    function handleEntry(n) {
      if (n.slice(-1) === '/') {
        setWorkspace((workspace || '').replace(/\/+$/, '') + '/' + n)
      } else {
        addLog('文件：' + n)
      }
    }

    return React.createElement('div', { className: 'rdevp' },
      // Header
      React.createElement('div', { className: 'rdevh' },
        React.createElement('span', { className: 'rdd' + (conn ? ' on' : '') }),
        React.createElement('span', { className: 'rdt' }, '远程开发 Remote Dev'),
        React.createElement('button', { className: 'rdx', onClick: () => setOpen(!open) }, open ? '—' : '☰')
      ),

      // Body
      open ? React.createElement('div', { className: 'rdb' },
        // Host input
        React.createElement('div', { className: 'rdr' },
          React.createElement('label', null, '主机'),
          React.createElement('input', { className: 'rdi', value: form.host, disabled: disabled, onChange: e => setField('host', e.target.value) })
        ),

        // Port and User
        React.createElement('div', { className: 'rdr' },
          React.createElement('label', null, '端口'),
          React.createElement('input', { className: 'rdi', value: form.port, disabled: disabled, onChange: e => setField('port', e.target.value) }),
          React.createElement('label', { style: { width: 'auto', marginLeft: 6 } }, '用户'),
          React.createElement('input', { className: 'rdi', value: form.user, disabled: disabled, onChange: e => setField('user', e.target.value) })
        ),

        // Key path
        React.createElement('div', { className: 'rdr' },
          React.createElement('label', null, '密钥'),
          React.createElement('input', { className: 'rdi', value: form.keyPath, disabled: disabled, onChange: e => setField('keyPath', e.target.value), placeholder: '私钥路径（可选）' })
        ),

        // Password
        React.createElement('div', { className: 'rdr' },
          React.createElement('label', null, '密码'),
          React.createElement('input', { className: 'rdi', type: 'password', value: form.password, disabled: disabled, onChange: e => setField('password', e.target.value), placeholder: '密码（可选）' })
        ),

        // Host key mode
        React.createElement('div', { className: 'rdmd' },
          React.createElement('span', null, '指纹策略:'),
          React.createElement('label', null,
            React.createElement('input', { type: 'radio', name: 'rdk', checked: form.hostKeyMode === 'persistent', disabled: disabled, onChange: () => setField('hostKeyMode', 'persistent') }),
            ' 永久保留'
          ),
          React.createElement('label', null,
            React.createElement('input', { type: 'radio', name: 'rdk', checked: form.hostKeyMode === 'temporary', disabled: disabled, onChange: () => setField('hostKeyMode', 'temporary') }),
            ' 临时保留'
          )
        ),

        // Push key checkbox
        React.createElement('label', { className: 'rdck' },
          React.createElement('input', { type: 'checkbox', checked: form.pushKey, disabled: disabled, onChange: e => setField('pushKey', !!e.target.checked) }),
          ' 连接后推送本机公钥（可选）'
        ),

        // Connect/Disconnect buttons
        React.createElement('div', { className: 'rdr' },
          React.createElement('button', { className: 'rdbt', disabled: disabled || !form.host, onClick: connect }, busy ? '...' : '连接'),
          conn ? React.createElement('button', { className: 'rdbt sec', disabled: busy, onClick: disconnect }, '断开') : null,
          status && status.fingerprint ? React.createElement('span', { style: { color: '#a8aebc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, status.fingerprint) : null
        ),

        // Workspace section
        conn ? React.createElement('div', null,
          React.createElement('div', { className: 'rds' }, '远程工作区'),
          React.createElement('div', { className: 'rdr' },
            React.createElement('input', { className: 'rdi', value: workspace, onChange: e => setWorkspace(e.target.value), placeholder: '/home/user/project' }),
            React.createElement('button', { className: 'rdbt sec', disabled: busy || !workspace, onClick: setWs }, '设置'),
            React.createElement('button', { className: 'rdbt sec', disabled: busy, onClick: browse }, '浏览')
          ),
          entries.length ? React.createElement('div', { className: 'rden' },
            entries.map((n, i) => React.createElement('button', { key: i, className: 'rde' + (n.slice(-1) === '/' ? ' dir' : ''), onClick: () => handleEntry(n) }, n))
          ) : null
        ) : null,

        // Logs
        logs.length ? React.createElement('div', { className: 'rdlg' },
          logs.map((m, i) => React.createElement('div', { key: m.n, className: m.k === 'e' ? 'e' : m.k === 'o' ? 'o' : '' }, m.t))
        ) : null
      ) : null
    )
  }

  // Register in shell overlay slot
  slots.inject('shell.overlay', () => {
    return slots.register(
      { name: 'shell.overlay', id: 'remdev-panel', order: 1000, label: 'Remote Dev' },
      () => React.createElement(Panel)
    )
  })

  return {
    apply: () => {},
    stop: () => {}
  }
}

export default {
  apply
}
