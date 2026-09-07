# API 文档

## 概述

`@goosesman/dsh-plugin-remote-dev` 提供了一套完整的 SSH 远程开发工具，包括模型工具和 UI 组件。

## 模型工具 API

### 连接管理

#### `remote_connect`

连接到 SSH 服务器。

**参数：**

```typescript
interface RemoteConnectParams {
  host: string;        // 服务器主机或 IP（必需）
  port?: number;       // SSH 端口，默认 22
  user?: string;       // 远程用户名
  keyPath?: string;    // 本地私钥路径
  password?: string;   // SSH 密码
  hostKeyMode?: 'persistent' | 'temporary';  // 指纹策略
  pushKey?: boolean;   // 是否推送公钥
}
```

**返回：**

```typescript
interface RemoteConnectResult {
  ok: boolean;
  connected: boolean;
  host: string;
  port: number;
  user: string | null;
  auth: 'password' | 'key';
  hostKeyMode: 'persistent' | 'temporary';
  fingerprint: string | null;
  home: string | null;
  push: {
    ok: boolean;
    pushed: boolean;
    pubKeyPath: string | null;
    keyType: string | null;
    error: string | null;
  } | null;
  error: string | null;
}
```

**示例：**

```javascript
// 密码认证
remote_connect({
  host: "192.168.2.10",
  port: 22,
  user: "username",
  password: "password",
  hostKeyMode: "persistent"
})

// 密钥认证
remote_connect({
  host: "192.168.2.10",
  user: "username",
  keyPath: "~/.ssh/id_ed25519",
  pushKey: true
})
```

---

#### `remote_status`

查看当前连接状态。

**参数：** 无

**返回：**

```typescript
interface RemoteStatusResult {
  connected: boolean;
  host: string | null;
  port: number | null;
  user: string | null;
  auth: 'password' | 'key' | null;
  hostKeyMode: 'persistent' | 'temporary' | null;
  fingerprint: string | null;
  workspace: string | null;
  forwards: Array<{
    id: string;
    localPort: string;
    remoteTarget: string;
  }>;
  jobs: Array<{
    id: string;
    command: string;
    running: boolean;
    exitCode: number | null;
  }>;
}
```

---

#### `remote_disconnect`

断开 SSH 连接。

**参数：** 无

**返回：**

```typescript
interface RemoteDisconnectResult {
  ok: boolean;
  wasConnected: boolean;
}
```

---

### 文件操作

#### `remote_read`

读取远程文件。

**参数：**

```typescript
interface RemoteReadParams {
  path: string;  // 远程文件路径（必需）
}
```

**返回：**

```typescript
interface RemoteReadResult {
  ok: boolean;
  path: string | null;
  size: number | null;
  content: string;
  truncated: boolean | null;
  error: string | null;
}
```

**注意：** 最多返回 200KB 内容

---

#### `remote_write`

写入远程文件。

**参数：**

```typescript
interface RemoteWriteParams {
  path: string;   // 远程文件路径（必需）
  content: string; // UTF-8 文本内容（必需）
}
```

**返回：**

```typescript
interface RemoteWriteResult {
  ok: boolean;
  path: string | null;
  bytes: number;
  error: string | null;
}
```

**注意：** 最大 512KB

---

#### `remote_list`

列出远程目录。

**参数：**

```typescript
interface RemoteListParams {
  path?: string;  // 远程目录路径，默认当前工作区
}
```

**返回：**

```typescript
interface RemoteListResult {
  ok: boolean;
  path: string | null;
  listing: string;  // ls -la 输出
  error: string | null;
}
```

---

#### `remote_exec`

执行远程命令。

**参数：**

```typescript
interface RemoteExecParams {
  command: string;   // Shell 命令（必需）
  timeoutMs?: number; // 超时时间，默认 60000ms
}
```

**返回：**

```typescript
interface RemoteExecResult {
  ok: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  error: string | null;
}
```

---

### 工作区管理

#### `remote_set_workspace`

设置远程工作目录。

**参数：**

```typescript
interface RemoteSetWorkspaceParams {
  path: string;  // 绝对路径（必需）
}
```

**返回：**

```typescript
interface RemoteSetWorkspaceResult {
  ok: boolean;
  workspace: string | null;
  error: string | null;
}
```

---

### 端口转发

#### `remote_forward`

管理 SSH 端口转发。

**参数：**

```typescript
interface RemoteForwardParams {
  action: 'start' | 'stop' | 'list';
  localPort?: number;    // 本地端口（start）
  remotePort?: number;   // 远程端口（start）
  remoteHost?: string;   // 远程主机，默认 127.0.0.1（start）
  id?: string;           // 转发 ID（stop）
}
```

**返回：**

```typescript
interface RemoteForwardResult {
  ok: boolean;
  id?: string;
  localPort?: string;
  remoteTarget?: string;
  stopped?: string;
  forwards?: Array<{
    id: string;
    localPort: string;
    remoteTarget: string;
  }>;
  error: string | null;
}
```

**示例：**

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

---

### 后台进程

#### `remote_process`

管理远程后台进程。

**参数：**

```typescript
interface RemoteProcessParams {
  action: 'start' | 'read' | 'stop' | 'list';
  command?: string;  // 命令（start）
  id?: string;       // 作业 ID（read/stop）
}
```

**返回：**

```typescript
interface RemoteProcessResult {
  ok: boolean;
  id?: string;
  stdout?: string;
  stderr?: string;
  running?: boolean;
  exitCode?: number | null;
  stopped?: string;
  jobs?: Array<{
    id: string;
    command: string;
    running: boolean;
    exitCode: number | null;
  }>;
  error: string | null;
}
```

**示例：**

```javascript
// 启动 Node.js 调试器
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
```

---

### 公钥管理

#### `remote_push_key`

推送本地公钥到远程服务器。

**参数：**

```typescript
interface RemotePushKeyParams {
  pubKeyPath?: string;  // 显式指定 .pub 文件路径
}
```

**返回：**

```typescript
interface RemotePushKeyResult {
  ok: boolean;
  pushed: boolean;
  pubKeyPath: string | null;
  keyType: string | null;
  error: string | null;
}
```

**注意：** 
- 公钥推送是幂等的
- 私钥始终保留在本地
- 自动查找默认密钥：`~/.ssh/id_ed25519.pub`、`~/.ssh/id_rsa.pub` 等

---

## UI 组件

### 悬浮面板

面板自动渲染在页面右下角（`shell.overlay` Slot）。

**功能：**
- 连接/断开服务器
- 配置 SSH 参数
- 选择指纹策略
- 推送公钥
- 设置工作区
- 浏览远程目录
- 查看操作日志

**样式类名：**
- `.rdevp` - 面板容器
- `.rdevh` - 面板头部
- `.rdt` - 标题
- `.rdd` - 状态指示灯
- `.rdb` - 面板主体
- `.rdr` - 表单行
- `.rdi` - 输入框
- `.rdbt` - 按钮
- `.rdlg` - 日志区域

---

## 错误处理

所有工具返回的结果都包含 `ok` 字段和 `error` 字段：

```typescript
if (!result.ok) {
  console.error('操作失败:', result.error);
}
```

常见错误：
- `not connected` - 未连接服务器
- `host is required` - 缺少主机参数
- `path is required` - 缺少路径参数
- `command is required` - 缺少命令参数
- `no such job/forward: xxx` - 作业/转发不存在
- `connection timed out` - 连接超时
- `timeout` - 操作超时

---

## 类型定义

完整的 TypeScript 类型定义在 `lib/types/` 目录中。

```typescript
import type {
  RemoteConnectParams,
  RemoteConnectResult,
  RemoteStatusResult,
  // ... 其他类型
} from '@goosesman/dsh-plugin-remote-dev/types';
```

---

## 最佳实践

### 1. 连接前检查

```javascript
const status = await remote_status();
if (!status.connected) {
  await remote_connect({ host: "192.168.2.10", ... });
}
```

### 2. 错误重试

```javascript
let success = false;
for (let i = 0; i < 3; i++) {
  const result = await remote_exec({ command: "..." });
  if (result.ok) {
    success = true;
    break;
  }
  await new Promise(r => setTimeout(r, 1000 * (i + 1)));
}
```

### 3. 超时控制

```javascript
const result = await remote_exec({
  command: "long-running-command",
  timeoutMs: 300000  // 5 分钟
});
if (result.timedOut) {
  console.log('命令执行超时');
}
```

### 4. 大文件处理

```javascript
const result = await remote_read({ path: "large-file.txt" });
if (result.truncated) {
  console.warn('文件被截断，总大小:', result.size);
}
```

---

## 性能建议

- 使用 `hostKeyMode: "temporary"` 避免频繁确认指纹
- 批量操作时使用单个长连接
- 大文件建议使用 `scp` 或 `sftp` 工具
- 长时间运行的命令使用 `remote_process`

---

## 安全建议

- 使用密钥认证而非密码
- 敏感信息不要硬编码
- 定期更新 SSH 密钥
- 使用 `hostKeyMode: "persistent"` 确保主机验证
- 公钥推送后验证权限设置
