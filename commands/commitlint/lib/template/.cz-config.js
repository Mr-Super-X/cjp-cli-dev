"use strict";

// 官方示例：https://github.com/leoforfree/cz-customizable/blob/master/cz-config-EXAMPLE.js
module.exports = {
  // type 类型（定义之后，可通过上下键选择）
  types: [
    { value: "feat", name: "feat     ✨: 新功能" },
    { value: "fix", name: "fix      🐛: 修复bug" },
    { value: "docs", name: "docs     📝: 文档变更" },
    {
      value: "chore",
      name: "chore    🚀: 对构建过程或辅助工具和库的更改（不影响源文件、测试用例）",
    },
    {
      value: "style",
      name: "style    💄: 代码格式（不影响功能，例如空格、分号等格式修正）",
    },
    {
      value: "refactor",
      name: "refactor ♻️: 代码重构（不包括 bug 修复、功能新增）",
    },
    { value: "perf", name: "perf     ⚡️: 性能优化" },
    { value: "test", name: "test     🚨: 添加、修改测试用例" },
    {
      value: "build",
      name: "build    📦️: 构建流程、外部依赖变更（如升级 npm 包、修改 webpack 配置等）",
    },
    { value: "ci", name: "ci       👷: 修改 CI 配置、脚本" },
    { value: "revert", name: "revert   ⏪️: 回滚 commit" },

    /**
     * 这里可以新增自定义的type，主要借助commitlint-config-cz工具包，已在.commitlintrc.js中进行配置
     * 因为是自定义的type，Angular规范不能正确识别它们，
     * 因此需要手动输入git commit -m "version: xxx" 才可以通过验证
     */
    // { value: 'version', name: 'version     🎉: 发布新版本' },
    // { value: 'init', name: 'init     🎉: 初始化' },
  ],
  // scope 类型（定义之后，可通过上下键选择）
  scopes: [
    ["other", "其他修改"],
    ["views", "页面相关"],
    ["router", "路由相关"],
    ["components", "组件相关"],
    ["docs", "文档相关"],
    ["mock", "mock相关"],
    ["utils", "工具方法相关"],
    ["store", "缓存相关"],
    ["theme", "主题相关"],
    ["constant", "常量相关"],
    ["assets", "样式/图片/媒体资源相关"],
    ["request", "http请求相关"],
    ["tests", "测试用例相关"],
    // 如果选择 custom，后面会让你再输入一个自定义的 scope。也可以不设置此项，把后面的 allowCustomScopes 设置为 true
    ["custom", "以上都不是？我要自定义"],
  ].map(([value, description]) => {
    return { value, name: `${value.padEnd(30)} (${description})` };
  }),
  // 是否允许自定义填写 scope，在 scope 选择的时候，会有 empty 和 custom 可以选择。
  allowCustomScopes: true,

  allowTicketNumber: false,
  isTicketNumberRequired: false,
  ticketNumberPrefix: "TICKET-",
  ticketNumberRegExp: "\\d{1,5}",

  // 针对每一个 type 去定义对应的 scopes，例如 fix /*
  // scopeOverrides: {
  //   fix: [{ name: 'merge' }, { name: 'style' }, { name: 'e2eTest' }, { name: 'unitTest' }]
  // },

  // 交互提示信息
  messages: {
    type: "确保本次提交遵循 Angular 规范！文档：https://github.com/angular/angular/blob/main/CONTRIBUTING.md \n选择你要提交的类型（必选）：",
    scope: "选择一个影响范围（可选）：",
    // 选择 scope: custom 时会出下面的提示 customScope: '请输入自定义的 scope：',
    customScope: "请输入自定义修改范围（可选）：",
    subject: "填写简短精炼的变更描述（必填）：",
    body: '填写更加详细的变更描述（可选）。使用 "|" 换行：',
    breaking: "列举非兼容性重大的变更（可选）：",
    footer: "列举出所有变更的 ISSUES CLOSED（可选）。 例如: #31, #34：",
    confirmCommit: "确认提交？",
  },
  // 设置只有 type 选择了 feat 或 fix、refactor、perf，才询问 breaking message
  allowBreakingChanges: ["feat", "fix", "refactor", "perf"],
  // 跳过要询问的步骤
  // skipQuestions: ['body', 'footer'],
  subjectLimit: 100, // subject 限制长度
  breaklineChar: "|", // 换行符，支持 body 和 footer
  footerPrefix: "ISSUES CLOSED:",
  // askForBreakingChangeFirst : true,
};
