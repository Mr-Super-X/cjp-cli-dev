# Package 包管理模型设计规格书

> 日期：2026-03-30
> 状态：已确认
> 目标：`@cjp-cli-dev/package` 封装了 npm 包的完整生命周期管理，包括下载、安装、缓存、版本更新和入口文件定位。是 exec 执行引擎和 init/add 命令的核心依赖。

---

## 1. 包定义

| 属性 | 值 |
|------|-----|
| 包名 | `@cjp-cli-dev/package` |
| 版本 | `1.3.0` |
| 入口文件 | `lib/index.js` |
| 导出 | `Package` 类 |

## 2. 目录结构

```
models/package/
├── package.json
├── lib/
│   └── index.js       # Package 类定义
└── __tests__/
    └── package.test.js
```

## 3. 依赖声明

```json
{
  "name": "@cjp-cli-dev/package",
  "dependencies": {
    "@cjp-cli-dev/format-path": "file:../../utils/format-path",
    "@cjp-cli-dev/get-npm-info": "file:../../utils/get-npm-info",
    "@cjp-cli-dev/log": "file:../../utils/log",
    "@cjp-cli-dev/utils": "file:../../utils/utils",
    "npminstall": "^7.12.0",
    "pkg-dir": "^5.0.0"
  }
}
```

| 依赖 | 用途 |
|------|------|
| `npminstall` | 以编程方式安装 npm 包（cnpm 团队出品），支持指定 registry 和存储目录 |
| `pkg-dir` | 向上查找包含 `package.json` 的目录（包根目录） |
| `@cjp-cli-dev/format-path` | 跨平台路径转换（Windows 反斜杠 → 正斜杠） |
| `@cjp-cli-dev/get-npm-info` | 查询 npm Registry 获取包的最新版本号 |

## 4. 核心类设计

### Package 类

```javascript
class Package {
  constructor(options)           // 初始化包信息
  async prepare()                // 创建缓存目录 + 解析 latest 版本号
  get cacheFilePath()            // 计算当前版本的缓存路径（getter）
  getSpecificCacheFilePath(ver)  // 计算指定版本的缓存路径
  async exists()                 // 判断包是否已存在（缓存/本地）
  async install()                // 安装包到缓存目录
  async update()                 // 检查并更新到最新版本
  getRootFilePath()              // 获取包的入口文件路径
}
```

### 4.1 构造函数

```javascript
constructor(options) {
  // 参数校验
  if (!options) throw new Error("Package类的options参数不能为空！");
  if (!isObject(options)) throw new Error("Package类的options参数类型必须为Object！");

  this.targetPath = options.targetPath;         // 包路径（安装根目录）
  this.storeDir = options.storeDir;             // 缓存存储目录（node_modules）
  this.packageName = options.packageName;       // npm 包名
  this.packageVersion = options.packageVersion; // 版本号（可以是 "latest"）
  this.registry = options.registry;             // npm 源地址
  // npminstall 缓存前缀：@scope/name → @scope+name
  this.cacheFilePathPrefix = this.packageName.replace("/", "+");
}
```

| 参数 | 说明 | 示例 |
|------|------|------|
| `targetPath` | 安装根目录 | `~/.cjp-cli-dev/dependencies` |
| `storeDir` | node_modules 路径 | `~/.cjp-cli-dev/dependencies/node_modules` |
| `packageName` | npm 包名 | `@cjp-cli-dev/init` |
| `packageVersion` | 版本号 | `"latest"` 或 `"1.3.0"` |
| `registry` | npm 源 | `https://registry.npmmirror.com/` |

### 4.2 缓存路径计算

npminstall 的缓存结构模拟 pnpm 的扁平存储：

```
node_modules/.store/@scope+name@version/node_modules/@scope/name
```

对应计算方式：

```javascript
get cacheFilePath() {
  return path.resolve(
    this.storeDir,                                    // node_modules/
    ".store",                                         // .store/
    `${this.cacheFilePathPrefix}@${this.packageVersion}`, // @cjp-cli-dev+init@1.3.0/
    "node_modules",                                   // node_modules/
    this.packageName                                  // @cjp-cli-dev/init
  );
}
```

**示例路径：**
```
~/.cjp-cli-dev/dependencies/node_modules/.store/@cjp-cli-dev+init@1.3.0/node_modules/@cjp-cli-dev/init
```

## 5. 执行流程

### 5.1 安装流程（exec 首次执行某命令时）

```
pkg.exists()
├─ prepare()
│   ├─ storeDir 不存在 → fse.mkdirpSync() 创建
│   └─ packageVersion === "latest" → getNpmLatestVersion() 获取真实版本号
├─ pathExists(cacheFilePath) → false（不存在）
│
pkg.install()
├─ prepare()（再次确保版本号已解析）
└─ npminstall({
     root: targetPath,          // 安装根目录
     storeDir: storeDir,        // 缓存存储目录
     registry: registry,        // npm 源
     pkgs: [{ name, version }]  // 要安装的包
   })
```

### 5.2 更新流程（exec 再次执行时）

```
pkg.exists() → true（已存在）
│
pkg.update()
├─ prepare()
├─ getNpmLatestVersion() → latestVersion
├─ getSpecificCacheFilePath(latestVersion) → latestFilePath
├─ pathExists(latestFilePath)
│   ├─ false → npminstall 安装最新版 + 输出升级日志
│   └─ true  → 输出"已存在最新版本，无需安装"
└─ this.packageVersion = latestVersion（更新版本号）
```

### 5.3 入口文件定位

```
pkg.getRootFilePath()
├─ 判断是否使用缓存模式（this.storeDir 是否存在）
│   ├─ 缓存模式 → _getRootFile(this.cacheFilePath)
│   └─ 本地模式 → _getRootFile(this.targetPath)
│
_getRootFile(targetPath)
├─ pkgDir(targetPath) → 向上查找 package.json 所在目录
├─ require(package.json) → 读取 main 或 lib 字段
├─ path.resolve(dir, main) → 拼接完整入口路径
└─ formatPath() → Windows 反斜杠转正斜杠
```

## 6. 关键实现细节

### 6.1 两种工作模式

| 模式 | 触发条件 | storeDir | 行为 |
|------|----------|----------|------|
| **缓存模式** | `storeDir` 有值 | 有缓存目录 | 从 npm 下载到缓存，通过 `cacheFilePath` 定位 |
| **本地模式** | `storeDir` 为空 | 无缓存 | 直接使用 `targetPath`，用于 `--targetPath` 调试场景 |

### 6.2 版本号解析

当 `packageVersion` 为 `"latest"` 时，在 `prepare()` 中自动解析为真实版本号：

```javascript
if (this.packageVersion === "latest") {
  this.packageVersion = await getNpmLatestVersion(this.packageName);
}
```

这确保了缓存路径中包含精确版本号，避免多版本冲突。

### 6.3 npminstall 参数

```javascript
await npminstall({
  root: this.targetPath,       // 安装根目录
  storeDir: this.storeDir,     // 存储目录（类似 pnpm 的 .store）
  registry: this.registry || getDefaultRegistry(),  // npm 源（默认淘宝镜像）
  pkgs: [{ name: this.packageName, version: this.packageVersion }]
});
```

npminstall 是 cnpm 团队开发的安装器，与 npm install 功能等价但支持更灵活的存储路径配置。

### 6.4 入口文件查找策略

```javascript
function _getRootFile(targetPath) {
  const dir = pkgDir(targetPath);  // 向上查找 package.json
  if (dir) {
    const pkgFile = require(path.resolve(dir, "package.json"));
    if (pkgFile && (pkgFile.main || pkgFile.lib)) {
      return formatPath(path.resolve(dir, pkgFile.main || pkgFile.lib));
    }
  }
  return null;
}
```

优先级：`main` > `lib`。通过 `format-path` 处理 Windows 路径兼容性。

## 7. 被引用关系

| 使用方 | 场景 |
|--------|------|
| `core/exec` | 动态加载命令包：下载 → 缓存 → 定位入口文件 → 子进程执行 |
| `commands/init` | 下载项目模板包到缓存 |
| `commands/add` | 下载页面模板/代码片段模板包到缓存 |
