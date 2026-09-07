# @goosesman/dsh-plugin-remote-dev

SSH 远程开发插件 for DeepSeek Harness

## 功能特性

- ✅ SSH 连接：支持密码认证和密钥认证
- ✅ 指纹策略：临时（会话期间）或永久（持久化）保存主机指纹
- ✅ 公钥推送：一键推送本地公钥到远程服务器
- ✅ 远程工作区：设置和浏览远程工作目录
- ✅ 文件操作：读取、写入、列出远程文件
- ✅ 命令执行：在远程服务器上执行 shell 命令
- ✅ 端口转发：SSH 本地端口转发
- ✅ 后台进程：管理远程长期运行的进程
- ✅ UI 面板：悬浮面板提供可视化操作界面

## 安装

### 方式 1：从 npm 安装（发布后）

```bash
npm install @goosesman/dsh-plugin-remote-dev
```

### 方式 2：从源码安装

```bash
git clone https://github.com/Gooesman/dsh-plugin-remote-dev.git
cd dsh-plugin-remote-dev
npm install
npm run build
```

## 使用方法

### 方式 1：动态加载（推荐）

在 DSH 会话中使用 `cordis_define` 工具加载插件：

```javascript
// Host 代码
// 从 src/host/index.js 复制

// Client 代码  
// 从 src/client/index.js 复制
```

### 方式 2：Agent Preset

创建 Agent Preset 配置文件：

```yaml
# ~/.dsh/.agent-presets/my-remote-dev/agent.cordis.yml
name: Remote Dev SSH
plugins:
  - dsh-plugin-remote-dev
```

## 模型工具

插件提供以下模型工具：

### remote_connect
连接 SSH 服务器
```javascript
remote_connect({
  host: "192.168.2.10",
  port: 22,
  user: "username",
  password: "password", // 或 keyPath
  keyPath: "~/.ssh/id_ed25519",
  hostKeyMode: "persistent", // 或 "temporary"
  pushKey: false
})
```

### remote_status
查看连接状态
```javascript
remote_status()
```

### remote_exec
执行远程命令
```javascript
remote_exec({
  command: "ls -la",
  timeoutMs: 60000
})
```

### remote_read
读取远程文件
```javascript
remote_read({
  path: "/home/user/file.txt"
})
```

### remote_write
写入远程文件
```javascript
remote_write({
  path: "/home/user/file.txt",
  content: "文件内容"
})
```

### remote_list
列出远程目录
```javascript
remote_list({
  path: "/home/user"
})
```

### remote_set_workspace
设置远程工作区
```javascript
remote_set_workspace({
  path: "/home/user/project"
})
```

### remote_disconnect
断开连接
```javascript
remote_disconnect()
```

### remote_forward
端口转发管理
```javascript
// 启动转发
remote_forward({
  action: "start",
  localPort: 9229,
  remotePort: 9229,
  remoteHost: "127.0.0.1"
})

// 停止转发
remote_forward({
  action: "stop",
  id: "f1"
})

// 列出转发
remote_forward({
  action: "list"
})
```

### remote_process
后台进程管理
```javascript
// 启动进程
remote_process({
  action: "start",
  command: "node --inspect=0.0.0.0:9229 app.js"
})

// 读取输出
remote_process({
  action: "read",
  id: "j1"
})

// 停止进程
remote_process({
  action: "stop",
  id: "j1"
})

// 列出进程
remote_process({
  action: "list"
})
```

### remote_push_key
推送公钥
```javascript
remote_push_key({
  pubKeyPath: "~/.ssh/id_ed25519.pub" // 可选
})
```

## UI 面板

插件会在页面右下角显示一个悬浮面板，提供：

- 连接表单配置
- 指纹策略选择
- 公钥推送选项
- 工作区设置和浏览
- 实时消息日志

## 配置说明

### 指纹策略

- `persistent`（默认）：将主机指纹保存到系统的 known_hosts 文件，永久信任
- `temporary`：仅在当前会话信任，不持久化，重启后需要重新确认

### 认证方式

- **密码认证**：提供 `password` 参数，插件会自动处理 SSH_ASKPASS
- **密钥认证**：提供 `keyPath` 参数指向私钥文件

### 公钥推送

- 勾选"推送本机公钥"会在连接成功后自动将本地公钥添加到远程 `~/.ssh/authorized_keys`
- 公钥推送是幂等的，多次执行不会重复添加
- 私钥始终保留在本地，不会传输

## 依赖要求

- Windows: 需要安装 OpenSSH 客户端（Windows 10+ 默认包含）
- Linux/Mac: 需要 `ssh` 命令在 PATH 中

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 发布到 npm
npm publish

# 推送到 GitHub
git push origin main
```

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0
- 初始版本发布
- 支持 SSH 密码和密钥认证
- 支持指纹策略配置
- 支持公钥推送
- 支持文件操作和命令执行
- 支持端口转发和后台进程
- 提供可视化 UI 面板
