# Resume 命令设计规格书

> 日期：2026-03-30
> 状态：已确认
> 目标：为 cjp-cli-dev 脚手架提供 `resume` 命令，支持创建 Markdown 简历并导出为 PDF。

---

## 1. 命令定义

```bash
cjp-cli-dev resume [options]
```

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--install` | `-i` | 下载并初始化简历模板 | `false` |
| `--export` | `-e` | 将 Markdown 简历导出为 PDF | `false` |
| `--resetChromePath` | `-rcp` | 重置 Chrome 浏览器安装路径缓存 | `false` |

## 2. 目录结构

```
commands/resume/
├── package.json
├── lib/
│   ├── index.js            # ResumeCommand 主类
│   ├── htmlTemplate.js     # PDF 导出用的 HTML 模板生成器
│   └── template/
│       └── resume.md       # Markdown 简历模板（含 EJS 变量）
└── __tests__/
    └── resume.test.js
```

## 3. 依赖声明

```json
{
  "name": "@cjp-cli-dev/resume",
  "dependencies": {
    "@cjp-cli-dev/command": "file:../../models/command",
    "@cjp-cli-dev/log": "file:../../utils/log",
    "@cjp-cli-dev/utils": "file:../../utils/utils",
    "image-to-base64": "...",
    "puppeteer-core": "...",
    "marked": "..."
  }
}
```

> **为什么使用 `puppeteer-core` 而非 `puppeteer`：** `puppeteer` 安装时会自动下载 Chromium（~170MB+），在国内网络环境下极易超时卡死。`puppeteer-core` 仅提供 API，需手动指定本机已安装的 Chrome 路径。

## 4. 执行流程

### 4.1 install 流程

```
交互式收集个人信息（姓名/手机/邮箱/职位/年龄/工龄/求职地点）
→ 可选导入证件照（列出当前目录 jpg/png 文件供选择）
→ 拷贝 template/resume.md 到当前目录
→ EJS 渲染变量（<%= name %> 等）
→ 输出简历文件名：{职位}-{姓名}-{工龄}年经验-{地点}-简历.md
```

### 4.2 export 流程

```
选择当前目录下的 .md 文件
→ 证件照转 Base64（image-to-base64）内嵌到 HTML
→ marked 将 Markdown 转 HTML
→ 获取 Chrome 路径（首次需输入，缓存到 ~/.cjp-cli-dev/chrome_install_path）
→ puppeteer-core 启动 Chrome → page.pdf() 导出 A4 格式 PDF
```

### 4.3 resetChromePath 流程

```
删除缓存文件 ~/.cjp-cli-dev/chrome_install_path
→ 下次 export 时重新输入
```

## 5. 关键实现细节

### 5.1 Chrome 路径缓存机制

```
缓存目录: ~/.cjp-cli-dev/
缓存文件: chrome_install_path（纯文本，存储绝对路径）

查找优先级:
  1. 读取缓存文件
  2. 缓存不存在 → 交互式输入 → 写入缓存
  3. --resetChromePath 可手动清除缓存
```

### 5.2 证件照处理

- **install 阶段**：以相对路径引用（`<img src="./photo.jpg">`）
- **export 阶段**：通过 `image-to-base64` 将图片转为 `data:image/xxx;base64,...` 内嵌到 HTML，确保 PDF 中图片正常显示

### 5.3 EJS 模板变量

| 变量 | 说明 |
|------|------|
| `<%= name %>` | 姓名 |
| `<%= phone %>` | 手机号 |
| `<%= email %>` | 邮箱 |
| `<%= position %>` | 求职职位 |
| `<%= age %>` | 年龄 |
| `<%= seniority %>` | 工龄 |
| `<%= location %>` | 求职地点 |
| `<%= photo %>` | 证件照路径 |

### 5.4 跨平台 Chrome 路径提示

| 平台 | 典型路径 |
|------|---------|
| Windows | `C:\Program Files\Google\Chrome\Application\chrome.exe` |
| macOS | `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` |

### 5.5 PDF 导出配置

```javascript
{
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
}
```

## 6. 注册方式

```javascript
const SETTINGS = { resume: "@cjp-cli-dev/resume" };

program
  .command("resume")
  .description("创建markdown简历，支持转为PDF")
  .option("-i, --install", "下载markdown简历模板", false)
  .option("-e, --export", "将markdown简历转为PDF", false)
  .option("-rcp, --resetChromePath", "重置chrome浏览器安装路径缓存", false)
  .action(exec);
```
