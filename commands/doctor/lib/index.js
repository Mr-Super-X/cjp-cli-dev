"use strict";

const Command = require("@cjp-cli-dev/command");
const log = require("@cjp-cli-dev/log");
const { prompt } = require("@cjp-cli-dev/utils");

const envChecker = require("./checkers/env-checker");
const depsChecker = require("./checkers/deps-checker");
const lintChecker = require("./checkers/lint-checker");
const structureChecker = require("./checkers/structure-checker");
const gitChecker = require("./checkers/git-checker");
const { renderReport } = require("./reporter");

const CHECKERS = [envChecker, depsChecker, lintChecker, structureChecker, gitChecker];

class DoctorCommand extends Command {
  init() {
    this.fix = this._args[0].fix || false;
    log.verbose("fix", this.fix);
  }

  async exec() {
    try {
      // 1. 依次执行所有 checker，收集结果
      const results = await this.runCheckers();
      // 2. 渲染终端报告
      renderReport(results);
      // 3. 若传入 --fix，执行修复流程
      if (this.fix) {
        await this.runFix(results);
      }
    } catch (err) {
      log.error(err.message);
      if (process.env.LOG_LEVEL === "verbose") {
        console.log(err);
      }
    }
  }

  async runCheckers() {
    const results = [];
    for (const checker of CHECKERS) {
      try {
        const items = await checker.check();
        results.push({ name: checker.name, items, checker });
      } catch (err) {
        log.warn(`${checker.name} 检查异常：${err.message}`);
        results.push({
          name: checker.name,
          items: [{ label: checker.name, status: "skip", message: `检查异常：${err.message}`, fixable: false }],
          checker,
        });
      }
    }
    return results;
  }

  async runFix(results) {
    // 收集所有可修复项
    const fixableItems = [];
    for (const group of results) {
      for (const item of group.items) {
        if (item.fixable && (item.status === "fail" || item.status === "warn")) {
          fixableItems.push({ ...item, checkerName: group.name, checker: group.checker });
        }
      }
    }

    if (fixableItems.length === 0) {
      log.info("没有可自动修复的问题");
      return;
    }

    log.info(`发现 ${fixableItems.length} 项可修复的问题`);

    // 按 checker 分组，逐项确认并修复
    const groupedByChecker = {};
    for (const item of fixableItems) {
      if (!groupedByChecker[item.checkerName]) {
        groupedByChecker[item.checkerName] = { checker: item.checker, items: [] };
      }
      groupedByChecker[item.checkerName].items.push(item);
    }

    for (const [checkerName, group] of Object.entries(groupedByChecker)) {
      const confirmedItems = [];
      for (const item of group.items) {
        const { confirm } = await prompt({
          type: "confirm",
          name: "confirm",
          default: true,
          message: `是否修复：${item.label}（${item.message}）？`,
        });
        if (confirm) {
          confirmedItems.push(item);
        } else {
          log.info(`跳过修复：${item.label}`);
        }
      }

      if (confirmedItems.length > 0 && group.checker.fix) {
        try {
          const fixResults = await group.checker.fix(confirmedItems);
          for (const result of fixResults) {
            if (result.success) {
              log.success(`修复成功：${result.label} — ${result.message}`);
            } else {
              log.error(`修复失败：${result.label} — ${result.message}，请手动处理`);
            }
          }
        } catch (err) {
          log.error(`${checkerName} 修复异常：${err.message}`);
        }
      }
    }
  }
}

function init(args) {
  return new DoctorCommand(args);
}

module.exports = init;
module.exports.DoctorCommand = DoctorCommand;
