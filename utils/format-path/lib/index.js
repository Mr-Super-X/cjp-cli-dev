"use strict";

// 内置模块
const path = require("path");

module.exports = formatPath;

function formatPath(p) {
  if (p && typeof p === "string") {
    const sep = path.sep; // macOS返回/ windows返回\
    if (sep === "/") {
      // 如果是macOS直接返回
      return p;
    } else {
      return p.replace(/\\/g, "/");
    }
  }
  return p;
}
