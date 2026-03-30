# Doctor 命令设计规格书

> 日期：2026-03-30
> 状态：已确认
> 目标：为 cjp-cli-dev 脚手架新增 `doctor` 命令，对当前项目执行全面体检并输出结构化报告，支持可选的防御式自动修复。

---

## 1. 命令定义

```bash
cjp-cli-dev doctor [options]
```

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--fix` | `-f` | 检查后逐项询问用户并自动修复可修复的问题 | `false` |

## 2. 目录结构

```
commands/doctor/
├── package.json
├── lib/
│   ├── index.js                # DoctorCommand 主类，继承 Command 基类
│   ├── reporter.js             # 终端报告渲染（彩色表格输出）
│   └── checkers/               # 各检查项独立模块
│       ├── env-checker.js      # 环境检查
│       ├── deps-checker.js     # 依赖检查
│       ├── lint-checker.js     # 规范检查
│       ├── structure-checker.js # 项目结构检查
│       └── git-checker.js      # Git 状态检查
└── __tests__/
    └── doctor.test.js
```

**拆分 checkers 的理由：**
- 每个 checker 职责单一，可独立测试
- 新增检查项只需加文件，不改主逻辑
- 避免单文件过大（吸取 `models/git` 1670 行的教训）

## 3. 依赖声明

```json
{
  "name": "@cjp-cli-dev/doctor",
  "dependencies": {
    "@cjp-cli-dev/command": "file:../../models/command",
    "@cjp-cli-dev/log": "file:../../utils/log",
    "@cjp-cli-dev/utils": "file:../../utils/utils"
  }
}
```

不引入新的第三方依赖，全部使用 Node.js 内置方法（`child_process.execSync`）和项目已有的工具包（如 `semver`、`pathExists` 等均从 `@cjp-cli-dev/utils` 中解构获取）。

## 4. Checker 接口规范

每个 checker 模块导出统一格式：

```javascript
module.exports = {
  name: '环境检查',              // 分类名称

  async check() {
    // 返回检查项数组
    return [
      {
        label: 'Node.js 版本',   // 检查项名称
        status: 'pass',          // 'pass' | 'warn' | 'fail' | 'skip'
        message: 'v16.20.2 (要求 >=16.0.0)',  // 描述信息
        fixable: false           // 是否可通过 --fix 修复
      }
    ];
  },

  async fix(confirmedItems) {
    // 可选。对用户已确认的 fixable 项执行修复
    // 注意：inquirer 逐项确认在 DoctorCommand 层完成，
    //       此方法接收的是用户已确认要修复的项，不再做任何询问，只执行操作
    // 返回修复结果数组
    return [
      {
        label: 'Node.js 版本',
        success: true,           // 修复是否成功
        message: '已修复'        // 修复结果描述
      }
    ];
  }
};
```

## 5. 各 Checker 详细规格

### 5.1 env-checker.js（环境检查）

| 检查项 | 通过条件 | 级别 | 可修复 |
|--------|----------|------|--------|
| Node.js 版本 | 满足 `package.json` 的 `engines.node`；无 engines 字段时满足脚手架最低要求 `>=16.0.0` | fail | 否 |
| npm 版本 | 满足 `engines.npm`；无该字段时仅输出当前版本 | warn | 否 |
| 包管理器识别 | 检测 lock 文件类型，输出使用的包管理器（npm/yarn/pnpm） | pass（仅信息） | 否 |

**实现方式：**
- Node.js 版本：`process.version` 与 `require('@cjp-cli-dev/utils').semver.satisfies` 比对（semver 从 `@cjp-cli-dev/utils` 解构获取，不单独安装）
- npm 版本：`execSync('npm -v')` 获取
- 包管理器：检测 `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml` 是否存在

### 5.2 deps-checker.js（依赖检查）

| 检查项 | 通过条件 | 级别 | 可修复 | --fix 行为 |
|--------|----------|------|--------|-----------|
| 过期依赖 | `npm outdated` 无输出 | warn（列出过期包名和最新版本） | 否（风险太高） | - |
| 安全漏洞 | `npm audit --json` 无 high/critical 级别漏洞 | fail | 是 | 执行 `npm audit fix` |
| lock 文件存在 | 存在任一 lock 文件 | warn | 否 | - |

**实现方式：**
- 过期依赖：`execSync('npm outdated --json')` 解析 JSON 输出
- 安全漏洞：`execSync('npm audit --json')` 解析 JSON 输出，仅关注 high 和 critical
- lock 文件：`pathExists` 检查三种 lock 文件

**check 阶段前置检查：**
- 执行 `npm outdated` 和 `npm audit` 前先检查 `node_modules` 是否存在，不存在时直接返回一条 `warn` 级别结果：`"未检测到 node_modules，请先安装依赖"`，不依赖 try-catch 静默吞掉

**--fix 前置检查：**
- 执行 `npm audit fix` 前检查 `node_modules` 和 lock 文件是否存在，不存在则跳过并提示"请先安装依赖"

### 5.3 lint-checker.js（规范检查）

| 检查项 | 通过条件 | 级别 | 可修复 | --fix 行为 |
|--------|----------|------|--------|-----------|
| ESLint | 存在 `.eslintrc.*` / `eslint.config.*` 或 package.json 中有 `eslintConfig` | fail | 是 | 通过 `require('@cjp-cli-dev/codelint')` 直接调用命令模块 |
| Prettier | 存在 `.prettierrc.*` 或 package.json 中有 `prettier` | warn | 是 | 同上（codelint 一并处理） |
| Husky | 存在 `.husky/` 目录 | warn | 是 | 通过 `require('@cjp-cli-dev/husky')` 直接调用命令模块 |
| CommitLint | 存在 `commitlint.config.*` 或 `.commitlintrc.*` | warn | 是 | 通过 `require('@cjp-cli-dev/commitlint')` 直接调用命令模块 |

**实现方式：**
- 用 `glob` 或 `fs.existsSync` 检测配置文件是否存在
- ESLint 需要兼容多种配置文件格式（`.eslintrc.js`、`.eslintrc.json`、`eslint.config.mjs` 等）

**--fix 调用方式说明：**
- 不通过 `execSync('cjp-cli-dev xxx')` shell 调用（避免依赖全局安装和 `CLI_TARGET_PATH` 不一致问题）
- 而是通过 `require` 直接引用对应命令包模块，以函数调用方式执行
- 若 `require` 失败（命令包未安装），catch 错误后提示用户"该命令包未安装，请手动执行 `cjp-cli-dev xxx --install`"

**--fix 前置检查：**
- 执行前检查对应配置文件是否已存在，已存在则跳过并提示"已配置，跳过"

### 5.4 structure-checker.js（项目结构检查）

| 检查项 | 通过条件 | 级别 | 可修复 | --fix 行为 |
|--------|----------|------|--------|-----------|
| package.json 存在 | 文件存在 | fail | 否 | - |
| name 字段 | 字段存在且非空 | fail | 是 | 用当前目录名补全 |
| version 字段 | 字段存在且为合法 semver | fail | 是 | 补全为 `"1.0.0"` |
| scripts 字段 | 至少存在 build 或 dev 脚本 | warn | 否 | - |
| .gitignore | 文件存在 | warn | 是 | 创建默认 .gitignore |
| README.md | 文件存在且非空 | warn | 否 | - |

**--fix 前置检查：**
- 补全 JSON 字段：逐字段检查，只补真正缺失的字段，已有值的字段不覆盖
- 创建 .gitignore：`fs.existsSync` 检查文件是否已存在，已存在则跳过

**默认 .gitignore 内容：**
```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
```

### 5.5 git-checker.js（Git 状态检查）

| 检查项 | 通过条件 | 级别 | 可修复 |
|--------|----------|------|--------|
| Git 仓库 | 当前目录在 Git 仓库中 | warn（不在仓库中时） / pass（在仓库中时） | 否 |
| 未提交更改 | 无 staged/unstaged 更改 | warn（列出文件数量） | 否 |
| 当前分支 | 输出分支名 | pass（仅信息） | 否 |

**实现方式：**
- `execSync('git rev-parse --is-inside-work-tree')` 判断是否在 Git 仓库
- 若不在 Git 仓库中：第一项返回 `warn`，后续两项返回 `status: 'skip'`，message 为"非 Git 仓库，跳过检查"
- 若在 Git 仓库中：
  - `execSync('git status --porcelain')` 获取未提交更改
  - `execSync('git branch --show-current')` 获取当前分支

**Git 检查不提供 --fix**，自动提交代码风险太高。

## 6. 执行流程

```
DoctorCommand.exec()
│
├─ 1. 依次执行 5 个 checker 的 check() 方法，收集所有结果
│     执行顺序：env → deps → lint → structure → git
│     每个 checker 独立 try-catch，单个 checker 异常不阻断后续
│
├─ 2. 调用 reporter.js 渲染终端报告
│     ✓ 绿色 / ⚠ 黄色 / ✗ 红色
│     底部统计：X 通过 / X 警告 / X 不通过
│
└─ 3. 若传入 --fix
      ├─ 从结果中筛选 fixable: true 且 status 为 'fail' 或 'warn' 的项
      ├─ 若无可修复项 → 输出"没有可自动修复的问题"
      └─ 有可修复项 → 逐项 inquirer confirm 询问用户
            ├─ 用户选择"是" → try-catch 执行修复 → 复验 → 输出结果
            └─ 用户选择"否" → 跳过
```

## 7. --fix 防御式安全规则

**核心原则：宁可跳过，不可破坏。**

1. **前置检查**：每个修复操作执行前必须通过对应的前置检查

   | 操作类型 | 前置检查 | 不通过时行为 |
   |----------|----------|-------------|
   | 创建新文件 | 文件是否已存在 | 跳过，提示"文件已存在，跳过" |
   | 补全 JSON 字段 | 该字段是否已有值 | 跳过该字段，只补真正缺失的 |
   | 调用现有命令 | 对应配置文件是否已存在 | 跳过，提示"已配置，跳过" |
   | npm audit fix | node_modules 和 lock 文件是否存在 | 跳过，提示"请先安装依赖" |

2. **逐项确认**：每个可修复项执行前用 inquirer 询问用户，不批量执行

3. **try-catch 隔离**：每个修复操作独立 try-catch，单项失败不影响后续项

4. **修复后复验**：单项修复完成后立即重新执行对应检查验证结果，输出"修复成功"或"修复失败，请手动处理"

## 8. 终端报告输出样例

```
╔══════════════════════════════════════════╗
║        cjp-cli-dev 项目体检报告          ║
╠══════════════════════════════════════════╣
║ 环境检查                                 ║
║   ✓ Node.js v16.20.2 (要求 >=16.0.0)    ║
║   ✓ npm 8.19.4                          ║
║   ✓ 包管理器: npm (package-lock.json)    ║
║ 依赖检查                                 ║
║   ⚠ 发现 5 个过期依赖                    ║
║   ✗ 发现 2 个安全漏洞 (1 high) [可修复]  ║
║   ✓ lock 文件存在                        ║
║ 规范检查                                 ║
║   ✓ ESLint 已配置                        ║
║   ✗ Prettier 未配置 [可修复]             ║
║   ✗ Husky 未配置 [可修复]                ║
║   ⚠ CommitLint 未配置 [可修复]           ║
║ 项目结构                                 ║
║   ✓ package.json 存在                    ║
║   ✓ name/version 字段完整                ║
║   ✓ 存在 build 脚本                      ║
║   ✓ .gitignore 存在                      ║
║   ⚠ README.md 内容为空                   ║
║ Git 状态                                 ║
║   ✓ Git 仓库 (分支: develop)             ║
║   ⚠ 有 3 个未提交的文件                  ║
╠══════════════════════════════════════════╣
║ 总计: 10 通过 / 4 警告 / 3 不通过        ║
║ 其中 4 项可通过 --fix 自动修复            ║
╚══════════════════════════════════════════╝
```

## 9. 注册方式

### exec 映射表（core/exec/lib/index.js）

```javascript
const SETTINGS = {
  // ... 现有命令
  doctor: "@cjp-cli-dev/doctor",
};
```

### CLI 命令注册（core/cli/lib/index.js）

```javascript
program
  .command("doctor")
  .description("对当前项目进行全面体检，输出健康报告")
  .option("-f, --fix", "检查后逐项确认并自动修复可修复的问题", false)
  .action(exec);
```
