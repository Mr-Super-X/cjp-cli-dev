# Init 命令设计规格书

> 日期：2026-03-30
> 状态：已确认
> 目标：为 cjp-cli-dev 脚手架提供 `init` 命令，支持交互式创建标准项目模板、自定义项目模板及组件库模板，通过 npm 包机制下载模板并完成 EJS 渲染与依赖安装。

---

## 1. 命令定义

```bash
cjp-cli-dev init [projectName] [options]
```

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `projectName` | - | 项目名称（可选，未指定则在交互流程中输入） | `""` |
| `--force` | `-f` | 强制初始化，跳过"是否继续"首次确认（仍需二次确认清空目录） | `false` |
| `--registry` | `-reg` | 指定 npm 源地址，用于模板包下载 | `https://registry.npmmirror.com` |

## 2. 目录结构

```
commands/init/
├── package.json
├── lib/
│   ├── index.js              # InitCommand 主类，继承 Command 基类
│   ├── getProjectTemplate.js # 通过 HTTP 接口获取模板列表
│   └── commandWhitelist.js   # 可执行命令白名单
└── __tests__/
    └── init.test.js
```

## 3. 依赖声明

```json
{
  "name": "@cjp-cli-dev/init",
  "dependencies": {
    "@cjp-cli-dev/command": "file:../../models/command",
    "@cjp-cli-dev/log": "file:../../utils/log",
    "@cjp-cli-dev/package": "file:../../models/package",
    "@cjp-cli-dev/request": "file:../../utils/request",
    "@cjp-cli-dev/utils": "file:../../utils/utils",
    "kebab-case": "^1.0.2",
    "validate-npm-package-name": "^5.0.1"
  }
}
```

## 4. 核心类设计

### InitCommand（继承 Command 基类）

| 方法 | 职责 |
|------|------|
| `init()` | 解析命令行参数 `projectName`、`force`、`registry`，挂载到实例属性 |
| `exec()` | 编排三阶段主流程：prepare → downloadTemplate → installTemplate |
| `prepare()` | 获取模板列表、检查目录是否为空、交互式确认清空、收集项目信息 |
| `getProjectInfo()` | 选择项目/组件类型、输入名称/版本号/模板、组件额外输入描述信息 |
| `downloadTemplate()` | 通过 Package 模型从 npm 下载或更新模板包到本地缓存 |
| `installTemplate()` | 根据模板类型分发：标准安装或自定义安装 |
| `installNormalTemplate()` | 标准模板：拷贝文件 → EJS 渲染 → 生成组件配置 → 执行安装/启动命令 |
| `installCustomTemplate()` | 自定义模板：子进程执行模板入口文件 |
| `ejsRender(options)` | glob 遍历所有文件，调用 `ejs.renderFile` 替换模板变量 |
| `createComponentFile(targetPath)` | 若为组件类型，生成 `.componentrc` 配置文件 |
| `parsingCommandExec(command, field, logInfo)` | 解析命令字符串，白名单校验后通过 `spawnAsync` 执行 |
| `checkCommandInWhitelist(command)` | 校验命令是否在 `COMMAND_WHITELIST` 中，不在则抛出错误 |

## 5. 执行流程

```
InitCommand.exec()
│
├─ 1. prepare() — 准备阶段
│     ├─ 获取模板列表（优先本地 ~/.cjp-cli-dev/data/project.json，降级 HTTP 接口）
│     ├─ 检查当前目录是否为空
│     │   ├─ 不为空且未指定 --force → 询问"是否继续创建？"
│     │   └─ 继续 → 二次确认"是否清空当前目录？"
│     └─ getProjectInfo() — 交互式收集项目信息
│           ├─ 选择类型：项目(project) / 组件(component)
│           ├─ 输入项目名称（校验：字母开头、2-64字符、支持 @scope/name）
│           ├─ 输入版本号（默认 1.0.0，semver 校验）
│           ├─ 选择模板
│           └─ [组件类型] 额外输入组件描述
│
├─ 2. downloadTemplate() — 下载模板
│     ├─ 创建 Package 实例
│     ├─ 模板包不存在 → npmPackage.install()
│     └─ 模板包已存在 → npmPackage.update()
│
└─ 3. installTemplate() — 安装模板
      ├─ [normal] 标准安装
      │     ├─ fse.copySync() 拷贝模板文件
      │     ├─ ejsRender() — EJS 渲染
      │     ├─ [组件类型] createComponentFile() 生成 .componentrc
      │     ├─ 执行 installCommand（白名单校验 → spawnAsync）
      │     └─ 执行 startCommand
      └─ [custom] 自定义安装
            └─ spawnAsync("node", ["-e", code]) 子进程执行模板入口文件
```

## 6. 关键实现细节

### 6.1 模板数据来源（双源策略）

优先读取本地配置 `~/.cjp-cli-dev/data/project.json`，不存在则通过 HTTP 接口 `/project/template` 从后端获取。

### 6.2 安全性：命令白名单

```javascript
const COMMAND_WHITELIST = ["npm", "cnpm", "yarn", "pnpm", "node"];
```

模板中配置的 `installCommand` 和 `startCommand` 在执行前必须通过白名单校验，防止 `rm -rf` 等危险操作。

### 6.3 EJS 渲染

- `glob("**", { nodir: true, dot: true })` 遍历所有文件（含隐藏文件）
- 默认忽略 `node_modules/**`，支持模板配置额外 `ignore` 数组
- `Promise.all` 并发渲染所有文件

### 6.4 自定义模板安装机制

```javascript
const code = `require('${rootFile}')(${JSON.stringify(options)})`;
await spawnAsync("node", ["-e", code], { stdio: "inherit", cwd: process.cwd() });
```

将控制权交给模板自身，由模板入口文件决定安装逻辑。

## 7. 注册方式

### exec 映射表（core/exec/lib/index.js）

```javascript
const SETTINGS = {
  init: "@cjp-cli-dev/init",
};
```

### CLI 命令注册（core/cli/lib/index.js）

```javascript
program
  .command("init [projectName]")
  .description("创建标准项目模板、自定义项目模板、组件库模板")
  .option("-reg, --registry <registry>", "指定npm源地址", "")
  .option("-f, --force", "是否强制初始化项目")
  .action(exec);
```
