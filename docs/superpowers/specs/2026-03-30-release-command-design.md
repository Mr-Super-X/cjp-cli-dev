# Release 命令设计规格书

> 日期：2026-03-30
> 状态：已确认
> 目标：为 cjp-cli-dev 脚手架提供 `release` 命令，自动升级项目版本号并生成 Git 版本变更记录文档（基于 release-it）。

---

## 1. 命令定义

```bash
cjp-cli-dev release [options]
```

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--install` | `-i` | 为当前项目安装 release-it 功能 | `false` |
| `--patch` | `-pa` | 升级 patch 版本（如 1.0.0 → 1.0.1） | `false` |
| `--minor` | `-mi` | 升级 minor 版本（如 1.0.0 → 1.1.0） | `false` |
| `--major` | `-ma` | 升级 major 版本（如 1.0.0 → 2.0.0） | `false` |

## 2. 目录结构

```
commands/release/
├── package.json
├── lib/
│   ├── index.js                # ReleaseCommand 主类
│   └── template/
│       └── .release-it.json    # release-it 默认配置模板
└── __tests__/
    └── release.test.js
```

## 3. 依赖声明

```json
{
  "name": "@cjp-cli-dev/release",
  "dependencies": {
    "@cjp-cli-dev/command": "file:../../models/command",
    "@cjp-cli-dev/log": "file:../../utils/log",
    "@cjp-cli-dev/utils": "file:../../utils/utils"
  }
}
```

## 4. 执行流程

### 4.1 安装流程（--install）

```
prepare() → checkReleaseIt() → checkCurrentNodeVersion()
→ installPackage()
    ├─ execInstallPackages()       — npm install -D <packages>
    ├─ createReleaseItConfig()     — 拷贝模板 → .release-it.json
    └─ modifyPackageScripts()      — 注入 release:patch/minor/major scripts
```

### 4.2 发布流程（--patch/--minor/--major）

```
prepare() → checkReleaseIt() → execRelease(option)
→ spawnAsync("npx", ["release-it", option])
```

## 5. 关键实现细节

### 5.1 Node 版本与 release-it 包版本策略

| Node 主版本 | release-it | @release-it/conventional-changelog | auto-changelog |
|-------------|------------|-------------------------------------|----------------|
| 16 | `16.0.0` | `7.0.0` | `2.4.0` |
| 18 | `17.10.0` | `9.0.1` | `2.5.0` |
| 其他 | `latest` | `latest` | `latest` |

### 5.2 重复安装保护

通过检查 `devDependencies["release-it"]` 判断是否已安装，已安装时弹出 confirm 交互询问。

### 5.3 version 字段自动创建

若 `package.json` 缺少 `version` 字段，自动通过 prompt 交互询问用户输入语义化版本号。

## 6. 注册方式

```javascript
// exec 映射表
const SETTINGS = { release: "@cjp-cli-dev/release" };

// CLI 注册
program
  .command("release")
  .description("自动升级项目版本、自动生成Git版本变更记录文档")
  .option("-i, --install", "为当前项目安装release-it功能", false)
  .option("-pa, --patch", "自动升级patch版本", false)
  .option("-mi, --minor", "自动升级minor版本", false)
  .option("-ma, --major", "自动升级major版本", false)
  .action(exec);
```
