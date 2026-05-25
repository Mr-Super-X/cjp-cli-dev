<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# commands/resume

## Purpose
简历生成命令 (`@cjp-cli-dev/resume`)。创建 Markdown 格式简历，支持导出为 PDF。

## Key Files
| File | Description |
|------|-------------|
| `lib/index.js` | ResumeCommand 类——模板下载、Markdown 渲染、PDF 导出 |
| `lib/htmlTemplate.js` | HTML 模板——将 Markdown 转为 HTML 的模板 |
| `lib/template/resume.md` | Markdown 简历模板 |
| `lib/theme/css/one-light.css` | 简历主题样式 |
| `package.json` | 包配置 |

## For AI Agents

### Working In This Directory
- 继承 `@cjp-cli-dev/command` 基类
- PDF 导出依赖 Chrome 浏览器的 headless 打印功能
- `--resetChromePath` 重置 Chrome 路径缓存

### Testing Requirements
- `__tests__/resume.test.js`

## Dependencies

### Internal
- `@cjp-cli-dev/command` — 基类
- `@cjp-cli-dev/log` — 日志
- `@cjp-cli-dev/utils` — 工具集

<!-- MANUAL: -->
