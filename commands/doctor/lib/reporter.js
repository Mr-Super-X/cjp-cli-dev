"use strict";

const { colors } = require("@cjp-cli-dev/utils");

// 状态图标
const STATUS_ICONS = {
  pass: "✓",
  warn: "⚠",
  fail: "✗",
  skip: "-",
};

// 状态颜色
const STATUS_COLORS = {
  pass: "green",
  warn: "yellow",
  fail: "red",
  skip: "gray",
};

function renderReport(results) {
  const lineWidth = 50;
  const border = "═".repeat(lineWidth);

  console.log();
  console.log(`╔${border}╗`);
  console.log(`║${centerText("cjp-cli-dev 项目体检报告", lineWidth)}║`);
  console.log(`╠${border}╣`);

  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;
  let skipCount = 0;
  let fixableCount = 0;

  for (const group of results) {
    console.log(`║${padRight(` ${group.name}`, lineWidth)}║`);

    for (const item of group.items) {
      const icon = STATUS_ICONS[item.status] || "?";
      const colorFn = STATUS_COLORS[item.status] || "white";
      const fixTag = item.fixable ? " [可修复]" : "";
      const line = `   ${icon} ${item.label}: ${item.message}${fixTag}`;

      console.log(`║${colors[colorFn](padRight(line, lineWidth))}║`);

      // 统计
      if (item.status === "pass") passCount++;
      else if (item.status === "warn") warnCount++;
      else if (item.status === "fail") failCount++;
      else if (item.status === "skip") skipCount++;

      if (item.fixable && (item.status === "fail" || item.status === "warn")) {
        fixableCount++;
      }
    }
  }

  console.log(`╠${border}╣`);
  const summary = ` 总计: ${passCount} 通过 / ${warnCount} 警告 / ${failCount} 不通过`;
  console.log(`║${padRight(summary, lineWidth)}║`);

  if (fixableCount > 0) {
    const fixSummary = ` 其中 ${fixableCount} 项可通过 --fix 自动修复`;
    console.log(`║${padRight(fixSummary, lineWidth)}║`);
  }

  if (skipCount > 0) {
    const skipSummary = ` ${skipCount} 项跳过`;
    console.log(`║${colors.gray(padRight(skipSummary, lineWidth))}║`);
  }

  console.log(`╚${border}╝`);
  console.log();
}

function padRight(str, width) {
  const strWidth = getStringWidth(str);
  if (strWidth >= width) return str.substring(0, width);
  return str + " ".repeat(width - strWidth);
}

function centerText(str, width) {
  const strWidth = getStringWidth(str);
  const padding = Math.max(0, Math.floor((width - strWidth) / 2));
  const right = Math.max(0, width - strWidth - padding);
  return " ".repeat(padding) + str + " ".repeat(right);
}

function getStringWidth(str) {
  let width = 0;
  for (const char of str) {
    if (char.charCodeAt(0) > 0x7f) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

module.exports = { renderReport };
