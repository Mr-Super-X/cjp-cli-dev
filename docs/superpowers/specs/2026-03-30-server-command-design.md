# Server 命令设计规格书

> 日期：2026-03-30
> 状态：已确认
> 目标：为 cjp-cli-dev 脚手架提供 `server` 命令，启动本地静态资源托管服务，支持配置 HTTP 请求代理。

---

## 1. 命令定义

```bash
cjp-cli-dev server [options]
```

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--port` | `-p` | 指定服务监听端口 | `3000` |

## 2. 目录结构

```
commands/server/
├── package.json
├── lib/
│   └── index.js       # ServerCommand 主类
└── __tests__/
    └── server.test.js
```

## 3. 依赖声明

```json
{
  "name": "@cjp-cli-dev/server",
  "dependencies": {
    "@cjp-cli-dev/command": "file:../../models/command",
    "@cjp-cli-dev/log": "file:../../utils/log",
    "@cjp-cli-dev/utils": "file:../../utils/utils",
    "express": "^4.21.1",
    "http-proxy-middleware": "^3.0.3"
  }
}
```

## 4. 执行流程

```
exec()
├─ prepare()             — 检查 index.html 是否存在
├─ getPublicPath()       — 交互式输入 publicPath（默认 "/"）
├─ getProxyConfirm()     — 询问是否需要代理
│   ├─ [是] → 询问单/多服务器
│   │   ├─ 单服务器 → 输入 target + pathRewrite
│   │   └─ 多服务器 → 输入 JSON 数组配置
│   └─ [否] → 跳过
└─ startExpress()        — 启动服务
```

## 5. 关键实现细节

### 5.1 Express 中间件链

| 顺序 | 中间件 | 说明 |
|------|--------|------|
| 1 | 禁用缓存 | `Cache-Control: no-store` |
| 2 | publicPath 重写 | 将 publicPath 前缀请求转发给静态文件中间件 |
| 3 | express.static | 以当前工作目录为根提供静态文件 |
| 4 | proxy 代理 | `http-proxy-middleware` 处理 API 请求转发 |
| 5 | fallback | 所有未匹配路由返回 index.html（SPA 路由兜底） |

### 5.2 代理配置模式

**单服务器：**
```javascript
{ target: 'http://api.example.com', changeOrigin: true, pathRewrite: { '/api': '' } }
```

**多服务器（JSON 数组输入）：**
```json
[
  { "apiPrefix": "/api1", "target": "http://a.example.com", "pathRewrite": { "/api": "" } },
  { "apiPrefix": "/api2", "target": "http://b.example.com" }
]
```

### 5.3 本机地址获取

通过 `os.networkInterfaces()` 获取 WLAN IPv4 地址，输出局域网可访问链接。

## 6. 注册方式

```javascript
const SETTINGS = { server: "@cjp-cli-dev/server" };

program
  .command("server")
  .description("启动本地静态资源托管服务，支持配置http请求代理")
  .option("-p, --port <port>", "指定启动服务的端口", 3000)
  .action(exec);
```
