/**
 * Remote Dev SSH Plugin - Host Side
 * @module @goosesman/dsh-plugin-remote-dev/host
 */

return {
  inject: ['timer'],
  apply(ctx) {
  const sub = ctx.get('subprocess')
  const fs = ctx.get('fs')
  if (sub === undefined || fs === undefined) return

  const sp = ctx.get('sandboxPolicy')
  const workDir = (sp !== undefined && typeof sp.workspaceRoot === 'string') ? sp.workspaceRoot : ''

  // Connection state
  let config = null
  let lastFingerprint = null
  const forwards = {}
  const jobs = {}
  let fwdSeq = 0
  let jobSeq = 0
  let sshExe = null
  let cmdExe = null
  let homeCache = null

  // Windows askpass script for password authentication
  const ASKPASS = '@echo off\r\npowershell -NoLogo -NoProfile -NonInteractive -Command "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8;[Console]::Out.Write($env:RDEV_SSH_PASSWORD)"\r\n'
  const B64C = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

  // Base64 encoding
  function b64Bytes(b) {
    let s = ''
    for (let i = 0; i < b.length; i += 3) {
      const h1 = i + 1 < b.length, h2 = i + 2 < b.length
      const b1 = h1 ? b[i + 1] : 0, b2 = h2 ? b[i + 2] : 0
      s += B64C.charAt(b[i] >> 2) + B64C.charAt(((b[i] & 3) << 4) | (b1 >> 4)) + (h1 ? B64C.charAt(((b1 & 15) << 2) | (b2 >> 6)) : '=') + (h2 ? B64C.charAt(b2 & 63) : '=')
    }
    return s
  }

  // PowerShell encoding for command execution
  function psEnc(cmd) {
    const bytes = []
    for (let i = 0; i < cmd.length; i++) {
      const c = cmd.charCodeAt(i)
      bytes.push(c & 255, (c >> 8) & 255)
    }
    return b64Bytes(bytes)
  }

  // Shell quote
  function shq(s) {
    return "'" + String(s).replace(/'/g, "'\\''") + "'"
  }

  // Extract fingerprint from SSH stderr
  function fpOf(stderr) {
    const m = /Server host key: [A-Za-z0-9.\/\-]+ (SHA256:[A-Za-z0-9+\/=]+)/.exec(stderr || '')
    return m ? m[1] : null
  }

  // Extract home directory
  function homeOf(stdout) {
    const m = /HOME=(\S+)/.exec(stdout || '')
    return m ? m[1] : null
  }

  // Read all text from reader
  function readAll(reader) {
    let text = '', off = 0
    for (let i = 0; i < 64; i++) {
      let r
      try { r = reader.readFrom(off) } catch (e) { break }
      if (!r || !r.text) break
      text += r.text
      off = r.nextOffset || 0
    }
    return text
  }

  // Spawn local subprocess
  function spawnLocal(argv, opts) {
    const spec = {
      argv,
      cwd: workDir || 'C:/',
      stdio: {
        stdin: (opts && typeof opts.stdinData === 'string') ? { data: opts.stdinData } : 'ignore',
        stdout: { maxBytes: 524288 },
        stderr: { maxBytes: 524288 }
      },
      graceMs: 5000
    }
    if (opts && opts.env) spec.env = opts.env
    return sub.spawn(spec)
  }

  // Finish subprocess and collect output
  async function finish(h) {
    let o
    try { o = await h.done } catch (e) { o = { exitCode: null, signal: null } }
    let so = '', se = ''
    try { if (h.collected && h.collected.stdout) so = readAll(h.collected.stdout) } catch (e) {}
    try { if (h.collected && h.collected.stderr) se = readAll(h.collected.stderr) } catch (e) {}
    return { exitCode: (o && o.exitCode === null) ? -1 : (o ? o.exitCode : -1), stdout: so, stderr: se }
  }

  // Race with timeout
  function raceT(h, ms) {
    if (!ms) return Promise.resolve(false)
    let fired = false
    const tp = new Promise((res) => ctx.timeout(() => { fired = true; res(true) }, ms))
    const dp = h.done.then(() => false, () => false)
    return Promise.race([tp, dp]).then(() => {
      if (fired) { try { h.terminate() } catch (e) {} }
      return fired
    })
  }

  // Get executable paths
  async function cmdEx() {
    if (!cmdExe) {
      try { cmdExe = await sub.resolveExecutable('cmd') } catch (e) { cmdExe = 'cmd' }
    }
    return cmdExe
  }

  async function sshEx() {
    if (!sshExe) {
      try { sshExe = await sub.resolveExecutable('ssh') } catch (e) { sshExe = 'ssh' }
    }
    return sshExe
  }

  // Get environment variable
  async function envVar(name) {
    const h = spawnLocal([await cmdEx(), '/c', 'echo', '%' + name + '%'])
    const f = await finish(h)
    return f.exitCode === 0 ? f.stdout.trim() : ''
  }

  async function home() {
    if (!homeCache) homeCache = (await envVar('USERPROFILE')) || ''
    return homeCache
  }

  async function workDir2() {
    if (!workDir) workDir = (await envVar('TEMP')) || (await home()) || 'C:/'
    return workDir
  }

  // Run local command
  async function runLocal(argv) {
    const h = spawnLocal(argv)
    const fired = await raceT(h, 60000)
    const f = await finish(h)
    return { ok: !fired && f.exitCode === 0, exitCode: f.exitCode, stdout: f.stdout, stderr: f.stderr }
  }

  // Ensure askpass script exists
  async function ensureAskpass() {
    const p = (await workDir2()) + '/.rdev-askpass.cmd'
    try {
      await fs.writeText(await fs.resolve(p), ASKPASS)
      return p
    } catch (e1) {
      const ps = "Set-Content -Path '" + p.replace(/'/g, "''") + "' -Value '" + ASKPASS.replace(/'/g, "''") + "' -Encoding ASCII -NoNewline"
      const r = await runLocal([await cmdEx(), '/c', 'powershell', '-NoLogo', '-NonInteractive', '-EncodedCommand', psEnc(ps)])
      if (!r.ok) throw new Error('askpass write failed: ' + String((e1 && e1.message) || e1) + ' | ' + (r.stderr || r.stdout || 'exit ' + r.exitCode))
      return p
    }
  }

  // Build SSH base arguments
  async function baseArgs() {
    const a = [await sshEx(), '-o', 'ConnectTimeout=15']
    if (!config || !config.password) a.push('-o', 'BatchMode=yes')
    if (config && config.hostKeyMode === 'temporary') a.push('-o', 'UserKnownHostsFile=NUL')
    a.push('-o', 'StrictHostKeyChecking=accept-new', '-o', 'ServerAliveInterval=15')
    if (config && config.keyPath) a.push('-i', config.keyPath)
    if (config && config.port && String(config.port) !== '22') a.push('-p', String(config.port))
    a.push((config && config.user ? config.user + '@' : '') + (config ? config.host : ''))
    return a
  }

  // Spawn SSH process
  async function spawnSsh(args, stdinData) {
    let env
    if (config && config.password) {
      env = {
        SSH_ASKPASS: await ensureAskpass(),
        SSH_ASKPASS_REQUIRE: 'force',
        RDEV_SSH_PASSWORD: config.password
      }
    }
    return spawnLocal(args, { env, stdinData })
  }

  // Run remote command
  async function runRemote(command, timeoutMs, extraArgs, stdinData) {
    if (!config) return { ok: false, exitCode: -1, stdout: '', stderr: 'not connected', timedOut: false }
    let a = await baseArgs()
    if (extraArgs) a = a.concat(extraArgs)
    a.push(command)
    const h = await spawnSsh(a, stdinData)
    const fired = await raceT(h, timeoutMs || 30000)
    const f = await finish(h)
    return { ok: !fired && f.exitCode === 0, exitCode: f.exitCode, stdout: f.stdout, stderr: f.stderr, timedOut: fired }
  }

  // Find local public key
  async function findPub(explicit) {
    const h = await home()
    const c = []
    if (explicit) c.push(explicit)
    if (config && config.keyPath) c.push(config.keyPath + '.pub')
    if (h) {
      c.push(h + '/.ssh/id_ed25519.pub', h + '/.ssh/id_rsa.pub', h + '/.ssh/id_ecdsa.pub')
    }
    const seen = {}
    for (let i = 0; i < c.length; i++) {
      const p = c[i]
      if (!p || seen[p]) continue
      seen[p] = true
      try {
        const first = String(await fs.readText(await fs.resolve(p))).split(/\r?\n/)[0].trim()
        if (/^(ssh-|ecdsa-|sk-)/.test(first)) {
          return { path: p, content: first, keyType: first.split(' ')[0] }
        }
      } catch (e) {}
    }
    return null
  }

  // Push public key to remote
  async function doPushKey(explicit) {
    if (!config) return { ok: false, pushed: false, pubKeyPath: null, keyType: null, error: 'not connected' }
    const f = await findPub(explicit || '')
    if (!f) return { ok: false, pushed: false, pubKeyPath: null, keyType: null, error: 'no local public key found' }
    const ak = shq(f.content)
    const r = await runRemote(
      'umask 077 && mkdir -p "$HOME/.ssh" && chmod 700 "$HOME/.ssh"; chmod 600 "$HOME/.ssh/authorized_keys" 2>/dev/null; { grep -qF ' + ak + ' "$HOME/.ssh/authorized_keys" 2>/dev/null || echo ' + ak + ' >> "$HOME/.ssh/authorized_keys"; } && echo __KEY_PUSHED__',
      30000
    )
    const ok = r.ok && /__KEY_PUSHED__/.test(r.stdout || '')
    return { ok, pushed: ok, pubKeyPath: f.path, keyType: f.keyType, error: ok ? null : (r.timedOut ? 'timeout' : (r.stderr || r.stdout || 'exit ' + r.exitCode).slice(-300)) }
  }

  // Connect to SSH server
  async function doConnect(a) {
    a = a || {}
    const host = String(a.host || '').trim()
    if (!host) return { ok: false, connected: false, hostKeyMode: null, fingerprint: null, home: null, push: null, error: 'host is required' }

    let port = (a.port === undefined || a.port === null || a.port === '') ? 22 : Number(a.port)
    if (!port || port < 1 || port > 65535) port = 22

    const user = String(a.user || '').trim()
    const pw = typeof a.password === 'string' ? a.password : ''
    const kMode = a.hostKeyMode === 'temporary' ? 'temporary' : 'persistent'

    config = { host, port, user, keyPath: String(a.keyPath || '').trim(), password: pw, remoteRoot: '', hostKeyMode: kMode }
    lastFingerprint = null

    const res = {
      ok: false, connected: false, host, port,
      user: user || null,
      auth: pw ? 'password' : 'key',
      hostKeyMode: kMode,
      fingerprint: null, home: null,
      exitCode: null, stdout: '', stderr: '',
      push: null, error: null
    }

    try {
      const r = await runRemote('echo __RSH_OK__ && echo HOME=$HOME && uname -a && pwd', 25000, ['-v'])
      res.exitCode = r.exitCode
      res.stdout = (r.stdout || '').slice(0, 2000)
      res.stderr = (r.stderr || '').slice(-2000)
      res.ok = r.ok && /__RSH_OK__/.test(r.stdout || '')
      res.connected = res.ok

      if (r.timedOut) res.error = 'connection timed out'
      if (!res.ok && !res.error) res.error = (r.stderr || r.stdout || 'exit ' + r.exitCode).slice(-500)

      lastFingerprint = fpOf(r.stderr)
      res.fingerprint = lastFingerprint

      if (res.ok) {
        res.home = homeOf(r.stdout)
        if (a.pushKey === true) res.push = await doPushKey('')
      }
    } catch (e) {
      res.error = String((e && e.message) || e)
    }

    if (!res.ok) {
      config = null
      lastFingerprint = null
    }

    return res
  }

  // Set workspace
  async function doSetWs(p) {
    if (!config) return { ok: false, workspace: null, error: 'not connected' }
    if (!p) return { ok: false, workspace: null, error: 'path is required' }
    const r = await runRemote('cd ' + shq(p) + ' && pwd', 20000)
    if (r.ok) {
      config.remoteRoot = ((r.stdout || '').trim().split(/\r?\n/).pop()) || p
      return { ok: true, workspace: config.remoteRoot, error: null }
    }
    return { ok: false, workspace: null, error: (r.stderr || r.stdout || 'exit ' + r.exitCode).slice(-400) }
  }

  // Stop all connections
  function stopAll() {
    for (const i in forwards) {
      try { forwards[i].handle.terminate() } catch (e) {}
      delete forwards[i]
    }
    for (const j in jobs) {
      try { jobs[j].handle.terminate() } catch (e) {}
      delete jobs[j]
    }
  }

  // List forwards
  function listF() {
    const o = []
    for (const i in forwards) {
      o.push({ id: i, localPort: forwards[i].localPort, remoteTarget: forwards[i].remoteTarget })
    }
    return o
  }

  // List jobs
  function listJ() {
    const o = []
    for (const j in jobs) {
      o.push({ id: j, command: jobs[j].command, running: jobs[j].settled === null, exitCode: jobs[j].settled ? jobs[j].settled.exitCode : null })
    }
    return o
  }

  // Status
  function statusObj() {
    return {
      connected: config !== null,
      host: config ? config.host : null,
      port: config ? config.port : null,
      user: config ? (config.user || null) : null,
      auth: config ? (config.password ? 'password' : 'key') : null,
      hostKeyMode: config ? config.hostKeyMode : null,
      fingerprint: lastFingerprint || null,
      workspace: (config && config.remoteRoot) ? config.remoteRoot : null,
      forwards: listF(),
      jobs: listJ()
    }
  }

  // Start port forward
  async function startFwd(lp, rp, rh) {
    if (!config) return { ok: false, error: 'not connected' }
    if (!/^\d+$/.test(String(lp)) || !/^\d+$/.test(String(rp))) {
      return { ok: false, error: 'localPort and remotePort must be positive integers' }
    }
    rh = String(rh || '127.0.0.1')
    const id = 'f' + (++fwdSeq)
    const a = (await baseArgs()).concat(['-N', '-L', String(lp) + ':' + rh + ':' + String(rp)])
    const h = await spawnSsh(a)
    const early = await Promise.race([
      h.done.then(() => true, () => true),
      new Promise((res) => ctx.timeout(() => res(false), 2500))
    ])
    if (early) {
      let o
      try { o = await h.done } catch (e) { o = { exitCode: null } }
      let err = ''
      try { if (h.collected && h.collected.stderr) err = readAll(h.collected.stderr) } catch (e) {}
      return { ok: false, error: 'forward failed: ' + (err || 'exit ' + (o ? o.exitCode : '?')).slice(-300) }
    }
    forwards[id] = { handle: h, localPort: String(lp), remoteTarget: rh + ':' + String(rp) }
    return { ok: true, id, localPort: String(lp), remoteTarget: rh + ':' + String(rp) }
  }

  // Start job
  async function startJob(command) {
    if (!config) return { ok: false, error: 'not connected' }
    const c = String(command || '').trim()
    if (!c) return { ok: false, error: 'command is required' }
    const id = 'j' + (++jobSeq)
    let a = await baseArgs()
    a.push(c)
    const h = await spawnSsh(a)
    jobs[id] = { handle: h, command: c, settled: null, outOff: 0, errOff: 0, stdout: '', stderr: '' }
    h.done.then(
      (o) => { const j = jobs[id]; if (j) j.settled = { exitCode: (o && o.exitCode === null) ? -1 : (o ? o.exitCode : -1) } },
      () => { const j = jobs[id]; if (j) j.settled = { exitCode: -1 } }
    )
    return { ok: true, id }
  }

  // Read job output
  function readJob(id) {
    const j = jobs[id]
    if (!j) return { ok: false, error: 'no such job: ' + id, stdout: '', stderr: '', running: false, exitCode: null }
    try {
      if (j.handle.collected && j.handle.collected.stdout) {
        const c = j.handle.collected.stdout.readFrom(j.outOff)
        if (c && c.text) { j.stdout += c.text; j.outOff = c.nextOffset || j.outOff }
      }
      if (j.handle.collected && j.handle.collected.stderr) {
        const e = j.handle.collected.stderr.readFrom(j.errOff)
        if (e && e.text) { j.stderr += e.text; j.errOff = e.nextOffset || j.errOff }
      }
    } catch (err) {}
    return { ok: true, id, stdout: j.stdout.slice(-100000), stderr: j.stderr.slice(-20000), running: j.settled === null, exitCode: j.settled ? j.settled.exitCode : null }
  }

  // Cleanup on stop
  ctx.effect(() => () => stopAll(), 'remdev:teardown')

  // Register internal handlers
  harness.handle('status', async () => statusObj())
  harness.handle('connect', async (a) => doConnect(a))
  harness.handle('disconnect', async () => {
    const was = config !== null
    stopAll()
    config = null
    lastFingerprint = null
    return { ok: true, wasConnected: was }
  })
  harness.handle('set_workspace', async (a) => { a = a || {}; return doSetWs(String(a.path || '').trim()) })
  harness.handle('ls', async (a) => {
    a = a || {}
    if (!config) return { ok: false, error: 'not connected', path: null, entries: [] }
    const p = String(a.path || '').trim()
    const r = await runRemote(p ? 'ls -1Ap ' + shq(p) + ' 2>&1' : 'ls -1Ap $HOME 2>&1', 20000)
    const lines = (r.stdout || '').split(/\r?\n/).map(s => s.trim()).filter(s => s !== '').slice(0, 500)
    return { ok: r.ok, path: p || null, entries: lines, error: r.ok ? null : lines.join('\n').slice(-400) }
  })
  harness.handle('push_key', async (a) => {
    a = a || {}
    if (!config) return { ok: false, pushed: false, pubKeyPath: null, keyType: null, error: 'not connected' }
    return doPushKey(a.pubKeyPath ? String(a.pubKeyPath) : '')
  })

  // Helper for tool rendering
  function kv(lines) { return [{ type: 'text', text: lines.join('\n') }] }
  const defRender = (a, v) => [{ type: 'text', text: JSON.stringify(v) }]

  // Register tools
  function addTool(name, description, parameters, execute, render) {
    const def = harness.defineTool({
      name,
      description,
      parameters: parameters || {},
      output: { schema: { type: 'json' }, render: render || defRender },
      execute
    })
    ctx.effect(() => harness.registerTool(ctx, def), 'tool:' + name)
  }

  // Tool definitions
  addTool('remote_connect',
    'Connect to a Linux server over SSH.',
    {
      host: { type: 'string', required: true, description: 'Server host or IP.' },
      port: { type: 'number', description: 'SSH port, default 22.' },
      user: { type: 'string', description: 'Remote username.' },
      keyPath: { type: 'string', description: 'Local private key path.' },
      password: { type: 'string', description: 'SSH password.' },
      hostKeyMode: { type: 'string', enum: ['persistent', 'temporary'], description: 'Fingerprint policy.' },
      pushKey: { type: 'boolean', description: 'Push local public key.' }
    },
    async (a) => doConnect(a || {}),
    (a, v) => {
      v = v || {}
      const L = [v.connected ? 'connected ' + (v.user ? v.user + '@' : '') + v.host + ':' + v.port + ' (' + v.auth + ')' : 'connect failed' + (v.error ? ': ' + v.error : '')]
      if (v.home) L.push('home: ' + v.home)
      if (v.fingerprint) L.push('fingerprint [' + v.hostKeyMode + ']: ' + v.fingerprint)
      if (v.push) L.push(v.push.ok ? 'public key pushed: ' + v.push.pubKeyPath : 'key push failed: ' + (v.push.error || 'unknown'))
      return kv(L)
    }
  )

  addTool('remote_status', 'Show current SSH connection state.', {}, async () => statusObj())

  addTool('remote_set_workspace', 'Set the remote working directory.', {
    path: { type: 'string', required: true, description: 'Absolute remote directory.' }
  }, async (a) => doSetWs(String((a && a.path) || '').trim()))

  addTool('remote_disconnect', 'Disconnect the SSH session.', {}, async () => {
    const was = config !== null
    stopAll()
    config = null
    lastFingerprint = null
    return { ok: true, wasConnected: was }
  })

  addTool('remote_exec', 'Run a shell command on the remote server.', {
    command: { type: 'string', required: true, description: 'Shell command line.' },
    timeoutMs: { type: 'number', description: 'Timeout ms, default 60000.' }
  }, async (a) => {
    if (!config) return { ok: false, error: 'not connected', exitCode: null, stdout: '', stderr: '' }
    const c = String((a && a.command) || '').trim()
    if (!c) return { ok: false, error: 'command is required', exitCode: null, stdout: '', stderr: '' }
    const r = await runRemote(c, Math.min(Number((a && a.timeoutMs) || 0) || 60000, 600000))
    return { ok: r.ok, exitCode: r.exitCode, stdout: (r.stdout || '').slice(0, 100000), stderr: (r.stderr || '').slice(0, 20000), timedOut: r.timedOut }
  })

  addTool('remote_read', 'Read a remote file.', {
    path: { type: 'string', required: true, description: 'Remote file path.' }
  }, async (a) => {
    if (!config) return { ok: false, error: 'not connected', path: null, size: null, content: '' }
    const p = String((a && a.path) || '').trim()
    if (!p) return { ok: false, error: 'path is required', path: null, size: null, content: '' }
    const r = await runRemote('f=' + shq(p) + '; if [ -f "$f" ]; then wc -c < "$f"; echo __RDEV_SEP__; head -c 200000 "$f" 2>/dev/null; else echo __RDEV_NA__; fi', 60000)
    if (!r.ok) return { ok: false, error: (r.stderr || r.stdout || 'exit ' + r.exitCode).slice(-400), path: p, size: null, content: '' }
    const out = r.stdout || ''
    if (out.indexOf('__RDEV_NA__') >= 0) return { ok: false, error: 'not a file: ' + p, path: p, size: null, content: '' }
    const i = out.indexOf('__RDEV_SEP__')
    const size = i >= 0 ? parseInt(out.slice(0, i).trim(), 10) : null
    const content = i >= 0 ? out.slice(i + 12).replace(/^\r?\n/, '') : out
    return { ok: true, path: p, size, content: content.slice(0, 210000), truncated: (size !== null && size > 200000) ? true : null }
  })

  addTool('remote_write', 'Write UTF-8 text to a remote file.', {
    path: { type: 'string', required: true, description: 'Remote file path.' },
    content: { type: 'string', required: true, description: 'UTF-8 text content.' }
  }, async (a) => {
    if (!config) return { ok: false, error: 'not connected', path: null, bytes: 0 }
    const p = String((a && a.path) || '').trim()
    const content = (a && typeof a.content === 'string') ? a.content : ''
    if (!p) return { ok: false, error: 'path is required', path: null, bytes: 0 }
    if (content.length > 524288) return { ok: false, error: 'content too large (max 512KB)', path: p, bytes: 0 }
    const b64 = btoa(content)
    const r1 = await runRemote('mkdir -p "$(dirname ' + shq(p) + ')"', 30000)
    if (!r1.ok) return { ok: false, error: (r1.stderr || r1.stdout || 'exit ' + r1.exitCode).slice(-300), path: p, bytes: 0 }
    const r2 = await runRemote('base64 -d > ' + shq(p) + ' && echo __RDEV_WRITTEN__', 120000, null, b64)
    const ok = r2.ok && /__RDEV_WRITTEN__/.test(r2.stdout || '')
    return { ok, path: p, bytes: content.length, error: ok ? null : (r2.timedOut ? 'timeout' : (r2.stderr || r2.stdout || 'exit ' + r2.exitCode).slice(-300)) }
  })

  addTool('remote_list', 'List a remote directory.', {
    path: { type: 'string', description: 'Remote directory.' }
  }, async (a) => {
    if (!config) return { ok: false, error: 'not connected', path: null, listing: '' }
    const p = String((a && a.path) || '').trim() || (config.remoteRoot || '$HOME')
    const r = await runRemote('ls -la ' + (p === '$HOME' ? '$HOME' : shq(p)) + ' 2>&1', 30000)
    return { ok: r.ok, path: p, listing: (r.stdout || '').slice(0, 60000), error: r.ok ? null : (r.stdout || r.stderr).slice(-400) }
  })

  addTool('remote_forward', 'Manage SSH port forwards.', {
    action: { type: 'string', enum: ['start', 'stop', 'list'], required: true },
    localPort: { type: 'number', description: 'Local port.' },
    remotePort: { type: 'number', description: 'Remote port.' },
    remoteHost: { type: 'string', description: 'Remote host, default 127.0.0.1.' },
    id: { type: 'string', description: 'Forward id.' }
  }, async (a) => {
    a = a || {}
    if (a.action === 'list') return { ok: true, forwards: listF() }
    if (a.action === 'stop') {
      const f = forwards[String(a.id || '')]
      if (!f) return { ok: false, error: 'no such forward: ' + a.id }
      try { f.handle.terminate() } catch (e) {}
      delete forwards[String(a.id)]
      return { ok: true, stopped: a.id }
    }
    if (a.action === 'start') return startFwd(a.localPort, a.remotePort, a.remoteHost)
    return { ok: false, error: 'unknown action' }
  })

  addTool('remote_process', 'Manage background processes.', {
    action: { type: 'string', enum: ['start', 'read', 'stop', 'list'], required: true },
    command: { type: 'string', description: 'Command line.' },
    id: { type: 'string', description: 'Job id.' }
  }, async (a) => {
    a = a || {}
    if (a.action === 'list') return { ok: true, jobs: listJ() }
    if (a.action === 'start') return startJob(String(a.command || ''))
    if (a.action === 'read') return readJob(String(a.id || ''))
    if (a.action === 'stop') {
      const j = jobs[String(a.id || '')]
      if (!j) return { ok: false, error: 'no such job: ' + a.id }
      try { j.handle.terminate() } catch (e) {}
      return { ok: true, stopped: a.id }
    }
    return { ok: false, error: 'unknown action' }
  })

  addTool('remote_push_key', 'Push local public key to remote.', {
    pubKeyPath: { type: 'string', description: 'Explicit local .pub path.' }
  }, async (a) => doPushKey((a && a.pubKeyPath) ? String(a.pubKeyPath) : ''))

}
}
