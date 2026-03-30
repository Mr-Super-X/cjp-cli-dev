# Codelint 命令设计规格书

> 日期：2026-03-30
> 状态：已确认
> 目标：为 cjp-cli-dev 脚手架提供 `codelint` 命令，一键创建统一代码规范，集成 ESLint + Prettier + lint-staged。

---

## 1. 命令定义

```bash
cjp-cli-dev codelint [options]
```

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--install` | `-i` | 安装 ESLint + Prettier + lint-staged | `false` |

## 2. 目录结构

```
commands/codelint/
├── package.json
├── lib/
│   ├── index.js              # CodelintCommand 主类
│   └── template/             # 配置文件模板目录
│       ├── .eslintrc.js      # ESLint 稳定版配置模板
│       ├── eslint.config.mjs # ESLint 最新版配置模板（Flat Config）
│       └── .prettierrc.js    # Prettier 配置模板
└── __tests__/
    └── codelint.test.js
```

## 3. 依赖声明

```json
{
  "name": "@cjp-cli-dev/codelint",
  "dependencies": {
    "@cjp-cli-dev/command": "file:../../models/command",
    "@cjp-cli-dev/log": "file:../../utils/log",
    "@cjp-cli-dev/utils": "file:../../utils/utils"
  }
}
```

## 4. 版本策略

| eslint 版本 | 配套依赖 | ESLint 配置文件 |
|-------------|---------|----------------|
| `eslint@8.49.0`（稳定版） | `eslint-config-prettier@9.1.0` `eslint-plugin-prettier@5.2.1` `@babel/eslint-parser@7.25.9` `prettier@3.3.3` `lint-staged@13.2.3` | `.eslintrc.js` |
| `eslint@latest`（最新版） | `@eslint/js@latest` `eslint-config-prettier@latest` `eslint-plugin-prettier@latest` `prettier@latest` `lint-staged@latest` | `eslint.config.mjs` |

## 5. 执行流程

```
prepare() → checkEslint() → checkCodelintVersion() — 交互选择版本
→ installPackage()
    ├─ execInstallPackages()       — npm install -D <packages>
    ├─ createCodelintConfig()      — 生成 eslint/prettier/lint-staged 配置文件
    └─ checkHusky()                — 检查 husky 是否安装
          ├─ 已安装 → 自动添加 lint-staged 到 pre-commit hook
          └─ 未安装 → 提示用户手动安装 husky
```

## 6. 关键实现细节

### 6.1 lint-staged 配置差异

- **稳定版**：`*.{js,jsx,ts,tsx}` 和 `*.vue` 同时执行 `eslint --fix` 和 `prettier --write`
- **最新版**：ESLint 8.53.0 起弃用代码风格规则，所有文件统一仅用 `prettier --write`

### 6.2 生成的配置文件

| 文件 | 版本适用 | 生成方式 |
|------|---------|---------|
| `.eslintrc.js` | 稳定版 | 模板拷贝 |
| `eslint.config.mjs` | 最新版 | 模板拷贝 |
| `.prettierrc.js` | 全版本 | 模板拷贝 |
| `lint-staged.config.js` | 全版本 | 动态生成写入 |

### 6.3 与 husky 的联动

安装完成后检测 `.husky` 目录是否存在，若存在则自动调用 `cjp-cli-dev husky --add pre-commit "npx lint-staged"` 添加 Hook。

## 7. 注册方式

```javascript
const SETTINGS = { codelint: "@cjp-cli-dev/codelint" };

program
  .command("codelint")
  .description("创建统一代码规范")
  .option("-i, --install", "为项目安装代码规范校验工具", false)
  .action(exec);
```
