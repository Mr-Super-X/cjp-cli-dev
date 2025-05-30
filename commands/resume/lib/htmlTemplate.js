// 内置库
const fs = require("fs");
const path = require("path");

// 读取one-light主题样式文件
const oneLight = fs.readFileSync(path.resolve(__dirname, './theme/css/one-light.css'));

module.exports = function (marked, markdownContent) {
  // 将 Markdown 转换为 HTML
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CLI Markdown to PDF</title>
      <style>
        /* 可以在这定义pdf的样式 */
        ${oneLight}
      </style>
    </head>
    <body>
      ${marked.parse(markdownContent)}
    </body>
    </html>
  `;
};
