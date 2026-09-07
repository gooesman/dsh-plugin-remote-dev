# 发布指南

## 发布到 npm

### 1. 登录 npm

```bash
npm login
```

### 2. 更新版本号

编辑 `package.json` 中的 `version` 字段：

```json
{
  "version": "1.0.1"
}
```

### 3. 构建

```bash
cd dsh-plugin-remote-dev
npm run build
```

### 4. 发布

```bash
npm publish
```

## 发布到 GitHub

### 1. 创建 GitHub 仓库

在 https://github.com/new 创建新仓库：
- 仓库名：`dsh-plugin-remote-dev`
- 描述：SSH 远程开发插件 for DeepSeek Harness
- 公开仓库

### 2. 初始化 Git 并推送

```bash
cd dsh-plugin-remote-dev
git init
git add .
git commit -m "Initial release v1.0.0"
git branch -M main
git remote add origin https://github.com/Gooesman/dsh-plugin-remote-dev.git
git push -u origin main
```

### 3. 创建 Release

在 GitHub 仓库页面：
1. 点击 "Releases" → "Draft a new release"
2. 标签：`v1.0.0`
3. 标题：`Release v1.0.0`
4. 描述：更新日志和功能说明
5. 点击 "Publish release"

## 更新日志格式

```markdown
## [1.0.1] - 2024-01-01

### Added
- 新功能描述

### Fixed
- Bug 修复描述

### Changed
- 变更描述
```

## 版本规则

- **MAJOR** (1.0.0 → 2.0.0): 不兼容的 API 变更
- **MINOR** (1.0.0 → 1.1.0): 向后兼容的新功能
- **PATCH** (1.0.0 → 1.0.1): 向后兼容的 Bug 修复

## 用户安装

用户安装插件：

```bash
npm install @goosesman/dsh-plugin-remote-dev
```

或在 DSH 中使用动态加载。
