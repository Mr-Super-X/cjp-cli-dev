# Commitlint 命令设计规格书

> 日期：2026-03-30
> 状态：已确认
> 目标：为 cjp-cli-dev 脚手架提供 `commitlint` 命令，一键创建统一提交规范，集成 Angular 规范校验 + 汉化版 commitizen 交互工具。

---

## 1. 命令定义

```bash
cjp-cli-dev commitlint [options]
```

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--install` | `-i` | 安装 commitlint + commitizen | `false` |

## 2. 目录结构

```
commands/commitlint/
├── package.json
├── lib/
│   ├── index.js              # CommitlintCommand 主类
│   └── template/
│       ├── .commitlintrc.js  # commitlint 规则配置模板
│       └── .cz-config.js     # 汉化版 commitizen 自定义配置
└── __tests__/
    └── commitlint.test.js
```

## 3. 依赖声明

```json
{
  "name": "@cjp-cli-dev/commitlint",
  "dependencies": {
    "@cjp-cli-dev/command": "file:../../models/command",
    "@cjp-cli-dev/log": "file:../../utils/log",
    "@cjp-cli-dev/utils": "file:../../utils/utils"
  }
}
```

## 4. 版本策略

| Node 主版本 | 安装的依赖包 |
|------------|------------|
| 16 | `@commitlint/cli@17.6.7` `@commitlint/config-conventional@17.6.7` `commitizen@4.3.0` `commitlint-config-cz@0.13.3` `cz-customizable@7.0.0` |
| 18 | `@commitlint/cli@19.5.0` `@commitlint/config-conventional@19.5.0` `commitizen@4.3.1` `commitlint-config-cz@0.13.3` `cz-customizable@7.2.1` |
| 其他 | 所有包用 `@latest` |

## 5. 执行流程

```
prepare() → checkCommitlint() → checkCurrentNodeVersion() — 生成版本兼容的依赖包
→ installPackage()
    ├─ execInstallPackages()         — npm install -D <packages>
    ├─ createCommitlintConfig()      — 生成 .commitlintrc.js 和 .cz-config.js
    └─ modifyPackageScripts()
          ├─ 添加 scripts.commit = "git add . && cz"
          ├─ 添加 scripts.push = "git add . && cz && git push"
          ├─ 添加 config.commitizen.path
          ├─ 添加 config["cz-customizable"].config
          └─ 检查 type === "module" → 警告兼容性问题
```

## 6. 关键实现细节

### 6.1 package.json 注入内容

```json
{
  "scripts": {
    "commit": "git add . && cz",
    "push": "git add . && cz && git push"
  },
  "config": {
    "commitizen": { "path": "./node_modules/cz-customizable" },
    "cz-customizable": { "config": "./.cz-config.js" }
  }
}
```

### 6.2 type: "module" 兼容性检查

`cz-customizable` 使用 `require()` 加载 `.cz-config.js`，若项目设置 `type: "module"` 会导致加载失败。检测到时输出警告。

### 6.3 与 husky 的协作

commitlint 依赖于 husky 命令预先生成的 `commit-msg` Hook：
```
husky 安装 → 生成 commit-msg Hook → 触发 commitlint 校验
→ 用户通过 npm run commit 调用 cz → 生成规范提交信息 → 校验通过
```

## 7. 注册方式

```javascript
const SETTINGS = { commitlint: "@cjp-cli-dev/commitlint" };

program
  .command("commitlint")
  .description("创建统一提交规范")
  .option("-i, --install", "为项目安装Git提交信息Angular规范校验工具", false)
  .action(exec);
```
