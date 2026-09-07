# @goosesman/dsh-plugin-remote-dev

<div align="center">

**SSH 远程开发插件 for DeepSeek Harness**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/Gooesman/dsh-plugin-remote-dev/releases)
[![DSH](https://img.shields.io/badge/DSH-0.1.1+-brightgreen.svg)](https://github.com/deepseek-ai/deepseek-harness)

[功能](#功能特性) •
[安装](#安装) •
[使用](#使用方法) •
[API](#api 文档) •
[开发](#开发) •
[贡献](#贡献)

</div>

---

## 📖 项目介绍

`dsh-plugin-remote-dev` 是一个为 DeepSeek Harness 设计的 SSH 远程开发插件，提供完整的远程服务器管理能力。通过直观的 UI 界面和丰富的模型工具，您可以在 DSH 中无缝地进行远程开发工作。

### ✨ 核心特性

- 🔐 **灵活的认证方式**：支持密码认证和 SSH 密钥认证
- 🔍 **智能指纹管理**：临时或永久保存主机指纹策略
- 🚀 **一键公钥推送**：自动将本地公钥部署到远程服务器
- 📁 **完整的文件操作**：读取、写入、列出远程文件
- 💻 **命令执行**：在远程服务器上执行任意 shell 命令
- 🔌 **端口转发**：SSH 本地端口转发支持
- 🔄 **后台进程**：管理长期运行的远程进程
- 🎨 **可视化 UI**：悬浮面板提供直观的操作界面
- 🛠️ **工作区管理**：设置和浏览远程工作目录

---

## 🎯 功能特性

### SSH 连接

- ✅ 密码认证（自动处理 SSH_ASKPASS）
- ✅ 密钥认证（支持多种密钥格式）
- ✅ 指纹策略选择
  - `persistent`：永久保存，持久化信任
  - `temporary`：会话期间临时信任
- ✅ 自动主机密钥验证

### 文件管理

- 📄 读取远程文件（最大 200KB）
- ✍️ 写入远程文件（最大 512KB）
- 📂 列出目录内容
- 📋 详细列表（`ls -la` 格式）

### 命令执行

- ⚡ 同步命令执行
- ⏱️ 可配置超时（默认 60 秒）
- 📊 标准输出/错误分离
- 🔄 超时检测

### 高级功能

- 🔀 SSH 端口转发
  - 启动/停止/列出转发
  - 支持任意远程主机
- 🔄 后台进程管理
  - 启动长期运行进程
  - 实时读取输出
  - 优雅终止进程
- 🔑 公钥部署
  - 自动查找本地公钥
  - 幂等推送操作
  - 私钥永不离开本地

### UI 面板

```
┌─────────────────────────────────────┐
│ ● 远程开发 Remote Dev        [—]    │
├─────────────────────────────────────┤
│ 主机  [192.168.2.10________]       │
│ 端口  [22__] 用户 [zlth______]     │
│ 密钥  [C:/Users/.../id_ed25519]    │
│ 密码  [••••••••••••••••]           │
│                                      │
│ 指纹策略：◉永久保留 ○临时保留       │
│ ☑ 连接后推送本机公钥（可选）         │
│                                      │
│ [连接] [断开] SHA256:xxx...         │
│                                      │
│ 远程工作区                           │
│ [/home/user/project______]         │
│ [设置] [浏览]                       │
│                                      │
│ ┌─ 日志 ─────────────────────────┐ │
│ │ connecting zlth@192.168.2.10...│ │
│ │ connected (password) ✓         │ │
│ │ home: /home/zlth               │ │
│ │ fingerprint [永久]: SHA256:... ✓│ │
│ │ 公钥已推送：~/.ssh/id_ed25519.pub│ │
│ └──────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 📦 安装

### 方式 1：动态加载（推荐）

在 DSH 会话中直接使用 `cordis_define` 工具加载插件。

1. 打开 DSH，调用 `cordis_define` 工具
2. 填写以下信息：

```yaml
Plugin kind: new
ID Prefix: remd
Name: Remote Dev SSH
Purpose: SSH 远程开发：密码/密钥登录，指纹策略，可选公钥推送，远程工作区
```

3. 复制 Host 和 Client 代码（见下方）
4. 点击 Define，然后运行 `cordis_run`
5. 批准后，UI 面板出现在页面右下角

**Host 代码：** 从 `src/host/index.js` 复制（去掉 `export function apply(ctx) {` 和最后的 `export default { apply }`）

**Client 代码：** 从 `src/client/index.js` 复制（去掉 `import React from 'react'` 和最后的 `export default { apply }`）

### 方式 2：Agent Preset

创建 Agent Preset 配置文件：

```yaml
# ~/.dsh/.agent-presets/remote-dev/cordis.yml
name: Remote Dev SSH
plugins:
  - name: remote-dev-ssh
    path: /path/to/dsh-plugin-remote-dev
```

### 方式 3：npm 包（发布后）

```bash
npm install @goosesman/dsh-plugin-remote-dev
```

---

## 🚀 使用方法

### 快速开始

#### 1. 连接服务器

```javascript
// 密码认证
remote_connect({
  host: "192.168.2.10",
  port: 22,
  user: "username",
  password: "your_password",
  hostKeyMode: "persistent",
  pushKey: false
})

// 密钥认证
remote_connect({
  host: "192.168.2.10",
  user: "username",
  keyPath: "~/.ssh/id_ed25519",
  hostKeyMode: "persistent",
  pushKey: true
})
```

#### 2. 执行命令

```javascript
remote_exec({
  command: "ls -la /home/user",
  timeoutMs: 60000
})
```

#### 3. 文件操作

```javascript
// 读取文件
remote_read({
  path: "/home/user/file.txt"
})

// 写入文件
remote_write({
  path: "/home/user/newfile.txt",
  content: "文件内容"
})

// 列出目录
remote_list({
  path: "/home/user"
})
```

#### 4. 设置工作区

```javascript
remote_set_workspace({
  path: "/home/user/project"
})
```

#### 5. 端口转发

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
```

#### 6. 后台进程

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
```

---

## 📚 API 文档

完整的 API 文档请查看 [API.md](./API.md)

### 可用工具

| 工具 | 描述 |
|------|------|
| `remote_connect` | 连接 SSH 服务器 |
| `remote_status` | 查看连接状态 |
| `remote_disconnect` | 断开连接 |
| `remote_exec` | 执行远程命令 |
| `remote_read` | 读取远程文件 |
| `remote_write` | 写入远程文件 |
| `remote_list` | 列出远程目录 |
| `remote_set_workspace` | 设置工作区 |
| `remote_forward` | 端口转发管理 |
| `remote_process` | 后台进程管理 |
| `remote_push_key` | 推送公钥 |

---

## 🔧 配置说明

### 指纹策略

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| `persistent` | 永久保存主机指纹 | 可信的固定服务器 |
| `temporary` | 仅会话期间信任 | 临时服务器或测试环境 |

### 认证方式

#### 密码认证
- 优点：简单直接
- 缺点：需要记住密码
- 注意：密码通过 SSH_ASKPASS 安全传递

#### 密钥认证
- 优点：更安全，无需密码
- 缺点：需要配置密钥
- 支持：`id_ed25519`、`id_rsa`、`id_ecdsa`

### 公钥推送

- ✅ 幂等操作（多次执行不会重复）
- ✅ 私钥永不离开本地
- ✅ 自动处理权限设置
- ⚠️ 需要远程服务器有 SSH 访问权限

---

## 💻 开发

### 前置要求

- Node.js 16+
- npm 或 yarn
- Git
- SSH 客户端

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/Gooesman/dsh-plugin-remote-dev.git
cd dsh-plugin-remote-dev

# 安装依赖
npm install

# 构建
npm run build

# 测试
npm test

# 发布
npm publish
```

### 项目结构

```
dsh-plugin-remote-dev/
├── src/
│   ├── host/
│   │   └── index.js          # Host 端代码
│   └── client/
│       └── index.js          # Client 端代码
├── lib/                      # 构建输出
│   ├── host/
│   ├── client/
│   └── types/
├── package.json              # npm 配置
├── README.md                 # 项目说明
├── API.md                    # API 文档
├── CHANGELOG.md              # 更新日志
├── CONTRIBUTING.md           # 贡献指南
├── PUBLISH.md                # 发布指南
├── build.js                  # 构建脚本
└── .gitignore               # Git 忽略
```

---

## 🤝 贡献

欢迎贡献代码！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解如何参与。

### 快速开始

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交变更 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

---

## 📝 更新日志

查看 [CHANGELOG.md](./CHANGELOG.md) 了解详细的版本历史。

---

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](./LICENSE) 文件。

---

## 🙏 致谢

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) - 强大的 AI 开发平台
- [OpenSSH](https://www.openssh.com/) - SSH 协议实现

---

## 📞 联系方式

- **GitHub Issues**: [报告问题或建议](https://github.com/Gooesman/dsh-plugin-remote-dev/issues)
- **Email**: goosesman@example.com

---

## ⭐ 支持

如果这个项目对您有帮助，请给一个 ⭐ Star！

---

<div align="center">

**Made with ❤️ by Gooesman**

</div>
