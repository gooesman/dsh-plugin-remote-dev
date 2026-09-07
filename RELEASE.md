# 🚀 dsh-plugin-remote-dev v1.0.0

这是 `dsh-plugin-remote-dev` 的初始发布版本，为 DeepSeek Harness 提供完整的 SSH 远程开发能力。

## ✨ 新增功能

### 🔐 SSH 连接
- ✅ 支持密码认证和 SSH 密钥认证
- ✅ 智能指纹管理（临时/永久策略）
- ✅ 一键公钥推送
- ✅ 自动主机密钥验证

### 📁 文件管理
- 📄 读取远程文件（最大 200KB）
- ✍️ 写入远程文件（最大 512KB）
- 📂 列出目录内容
- 📋 详细列表格式

### 💻 命令执行
- ⚡ 同步命令执行
- ⏱️ 可配置超时（默认 60 秒）
- 📊 标准输出/错误分离
- 🔄 超时检测

### 🔌 高级功能
- 🔀 SSH 端口转发（启动/停止/列出）
- 🔄 后台进程管理
- 🏠 远程工作区管理
- 🎨 可视化 UI 面板

## 📦 安装

### 方式 1：动态加载（推荐）

在 DSH 中使用 `cordis_define` 工具：

1. 打开 DSH，调用 `cordis_define`
2. 填写：
   ```
   Plugin kind: new
   ID Prefix: remd
   Name: Remote Dev SSH
   Purpose: SSH 远程开发
   ```
3. 复制 `src/host/index.js` 和 `src/client/index.js` 的内容
4. Define 并 Run

### 方式 2：从源码

```bash
git clone https://github.com/Gooesman/dsh-plugin-remote-dev.git
cd dsh-plugin-remote-dev
npm install
npm run build
```

## 🚀 快速开始

### 连接服务器

```javascript
// 密码认证
remote_connect({
  host: "192.168.2.10",
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

### 执行命令

```javascript
remote_exec({
  command: "ls -la /home/user",
  timeoutMs: 60000
})
```

### 文件操作

```javascript
// 读取文件
remote_read({ path: "/home/user/file.txt" })

// 写入文件
remote_write({
  path: "/home/user/newfile.txt",
  content: "文件内容"
})

// 列出目录
remote_list({ path: "/home/user" })
```

## 📚 完整文档

- [README.md](README.md) - 项目说明
- [API.md](API.md) - API 文档
- [examples/basic-usage.js](examples/basic-usage.js) - 使用示例
- [CONTRIBUTING.md](CONTRIBUTING.md) - 贡献指南
- [CHANGELOG.md](CHANGELOG.md) - 更新日志

## 🛠️ 可用工具

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

## 🎨 UI 面板

加载后，UI 面板会自动出现在页面**右下角**：

- 🔴 红色圆点 = 未连接
- 🟢 绿色圆点 = 已连接
- 点击右上角 `—` 或 `☰` 展开/收起
- 填写服务器信息后点击"连接"

## ⚙️ 配置说明

### 指纹策略

- `persistent`（默认）：永久保存主机指纹
- `temporary`：仅会话期间临时信任

### 认证方式

- **密码认证**：提供 `password` 参数
- **密钥认证**：提供 `keyPath` 参数

### 公钥推送

- ✅ 幂等操作
- ✅ 私钥永不离开本地
- ✅ 自动处理权限

## 🐛 已知问题

- 暂不支持 SSH 代理转发
- 暂不支持 SFTP 文件传输
- 大文件传输可能超时

## 🤝 贡献

欢迎贡献代码！请查看 [CONTRIBUTING.md](CONTRIBUTING.md)

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交变更 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

## 🙏 致谢

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
- [OpenSSH](https://www.openssh.com/)

## 📞 联系方式

- **GitHub Issues**: [报告问题](https://github.com/Gooesman/dsh-plugin-remote-dev/issues)
- **Email**: goosesman@example.com

---

**Made with ❤️ by Gooesman**
