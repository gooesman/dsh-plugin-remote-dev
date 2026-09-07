# 贡献指南

感谢考虑为 `dsh-plugin-remote-dev` 做出贡献！

## 开发设置

### 前置要求

- Node.js 16+
- npm 或 yarn
- Git
- SSH 客户端（Windows 10+ 默认包含）

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
```

## 代码风格

### JavaScript

- 使用 ES6+ 语法
- 偏好函数式编程
- 使用 `const` 和 `let`，避免 `var`
- 箭头函数用于回调
- 异步函数使用 `async/await`

### 命名约定

- 文件名：`kebab-case`
- 变量和函数：`camelCase`
- 类和大写常量：`PascalCase` 或 `UPPER_SNAKE_CASE`
- 私有变量：前缀 `_`

### 注释

- 为复杂逻辑添加注释
- 使用 JSDoc 格式注释公共 API
- 保持注释简洁明了

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### 类型

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档变更
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关

### 示例

```bash
feat(ssh): 添加 SSH 代理转发支持
fix(file): 修复大文件读取超时问题
docs(readme): 更新安装说明
refactor(core): 重构连接管理逻辑
```

## 提交 Pull Request

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交变更 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

### PR 检查清单

- [ ] 代码遵循项目风格
- [ ] 添加了必要的注释
- [ ] 更新了文档
- [ ] 添加了测试（如适用）
- [ ] 无警告信息
- [ ] PR 标题遵循提交规范

## 开发流程

### 1. 问题讨论

在开始开发前，先在 Issue 中讨论您的想法。

### 2. 开发

```bash
# 创建新分支
git checkout -b feature/your-feature

# 开发并测试
# ...

# 提交
git add .
git commit -m "feat: add your feature"
```

### 3. 测试

确保所有测试通过：

```bash
npm test
```

### 4. 提交 PR

- 描述清楚您的变更
- 关联相关 Issue
- 等待 CI 检查通过

## 问题报告

使用 GitHub Issues 报告 Bug 或提出功能建议。

### Bug 报告模板

```markdown
**描述**
清晰的 Bug 描述

**复现步骤**
1. 打开...
2. 点击...
3. 看到错误...

**预期行为**
清晰的预期行为描述

**环境**
- OS: [e.g. Windows 10]
- DSH 版本: [e.g. 0.1.1]
- 插件版本: [e.g. 1.0.0]

**附加信息**
截图、日志等
```

## 版本发布

维护者负责版本发布，流程如下：

1. 更新 `package.json` 版本号
2. 更新 `CHANGELOG.md`
3. 提交并打标签
4. 发布到 npm
5. 创建 GitHub Release

## 许可证

贡献的代码将采用 MIT 许可证。

## 联系方式

- GitHub Issues: [报告问题](https://github.com/Gooesman/dsh-plugin-remote-dev/issues)
- Email: goosesman@example.com

感谢您的贡献！ 🎉
