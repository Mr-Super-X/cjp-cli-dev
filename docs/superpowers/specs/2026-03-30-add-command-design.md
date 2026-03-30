# Add 命令设计规格书

> 日期：2026-03-30
> 状态：已确认
> 目标：为 cjp-cli-dev 脚手架提供 `add` 命令，支持添加组件代码片段模板和页面模板到当前项目。

---

## 1. 命令定义

```bash
cjp-cli-dev add [templateName] [options]
```

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `templateName` | - | 模板名称（可选，省略时进入交互式选择） | - |
| `--registry` | `-reg` | 指定 npm 源地址 | 默认淘宝镜像 |

## 2. 目录结构

```
commands/add/
├── package.json
├── lib/
│   ├── index.js        # AddCommand 主类，继承 Command 基类
│   └── getTemplate.js  # 获取页面/代码片段模板列表
└── __tests__/
    └── add.test.js
```

## 3. 依赖声明

```json
{
  "name": "@cjp-cli-dev/add",
  "dependencies": {
    "@cjp-cli-dev/command": "file:../../models/command",
    "@cjp-cli-dev/log": "file:../../utils/log",
    "@cjp-cli-dev/package": "file:../../models/package",
    "@cjp-cli-dev/request": "file:../../utils/request",
    "@cjp-cli-dev/utils": "file:../../utils/utils",
    "read-pkg-up": "^7.0.1"
  }
}
```

## 4. 核心类设计

### AddCommand（继承 Command 基类）

两种模式：**页面模板（page）** 和 **代码片段（section）**

| 方法 | 职责 |
|------|------|
| `init()` | 解析 `templateName`、`registry` 参数 |
| `exec()` | 询问复用模式后分发到对应流程 |
| `installPageTemplate()` | 页面模板安装主流程 |
| `installSectionTemplate()` | 代码片段安装主流程 |
| `downloadTemplate(addMode)` | 通过 Package 模型下载模板到缓存 |
| `ejsRender(options)` | EJS 渲染模板变量 |
| `mergeDependencies(options)` | 依赖合并：对比差异、提示冲突、自动安装 |
| `installSection()` | 代码片段：选择源码文件 → 插入组件 → 注册局部组件 → 拷贝组件目录 |

## 5. 执行流程

### 5.1 页面模板流程

```
选择模板 → 输入页面名称 → 预检查(重名检测)
→ 下载模板包(Package) → 拷贝到目标目录 → EJS渲染
→ 依赖合并(dependenciesDiff) → 自动安装依赖
```

### 5.2 代码片段流程

```
选择模板 → 输入组件名称 → 预检查
→ 下载模板包 → 选择要插入的源码文件 → 输入插入行号
→ 选择Vue版本风格(vue2/vue3/vue3 setup)
→ 插入组件标签 → 插入import语句 → 注册局部组件
→ 拷贝组件目录到 components/
```

## 6. 关键实现细节

### 6.1 依赖合并策略（dependenciesDiff）

- 项目中不存在该依赖 → 自动添加到 package.json
- 项目中存在且版本一致 → 跳过
- 项目中存在但版本冲突 → 打印警告，提示用户手动处理

### 6.2 Vue 版本风格差异

| Vue 风格 | import 位置 | 注册方式 |
|---------|-----------|---------|
| vue2 | `<script>` 顶部 | `components: { XxxComponent }` |
| vue3 | `<script>` 顶部 | `components: { XxxComponent }` |
| vue3 setup | `<script setup>` 顶部 | 自动可用，无需注册 |

### 6.3 模板数据来源

优先本地配置 `~/.cjp-cli-dev/data/page.json`（页面）或 `section.json`（代码片段），不存在则通过 HTTP 接口获取。

### 6.4 自定义页面模板

当模板类型为 `custom` 时，通过子进程执行模板包入口文件，由模板自行控制安装逻辑。

## 7. 注册方式

```javascript
// exec 映射表
const SETTINGS = { add: "@cjp-cli-dev/add" };

// CLI 注册
program
  .command("add [templateName]")
  .description("添加组件代码片段模板、页面标准模板、自定义页面模板")
  .option("-reg, --registry <registry>", "指定npm源地址", "")
  .action(exec);
```
