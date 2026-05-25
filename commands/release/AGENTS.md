<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# commands/release

## Purpose
版本发布命令 (`@cjp-cli-dev/release`)。自动升级项目版本（patch/minor/major）、自动生成 CHANGELOG.md。基于 release-it 工具。

## Key Files
| File | Description |
|------|-------------|
| `lib/index.js` | ReleaseCommand 类——安装 release-it、版本升级 |
| `lib/template/.release-it.json` | release-it 配置模板 |
| `package.json` | 包配置 |

## For AI Agents

### Working In This Directory
- 继承 `@cjp-cli-dev/command` 基类
- 支持 `--patch/--minor/--major` 指定升级级别

### Testing Requirements
- `__tests__/release.test.js`

## Dependencies

### Internal
- `@cjp-cli-dev/command` — 基类
- `@cjp-cli-dev/log` — 日志
- `@cjp-cli-dev/utils` — 工具集

<!-- MANUAL: -->
