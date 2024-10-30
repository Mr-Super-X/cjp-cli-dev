// 内置库
const fs = require("fs"); // 用于文件操作
const path = require("path"); // 用于获取路径
// 自建库
const log = require("@cjp-cli-dev/log"); // 用于给log信息添加各种自定义风格
const {
  prompt,
  fse,
  CLI_NAME,
  DEPENDENCIES_CACHE_DIR,
} = require("@cjp-cli-dev/utils"); // 工具方法

module.exports = function (options, command) {
  const requireKeys = ["all", "dep"];

  log.verbose("options", options);

  // 检查是否没传参数
  function checkKeys(keys, obj) {
    let result = false;

    keys.forEach((key) => {
      if (obj[key] === true) {
        result = true;
      }
    });

    return result;
  }

  // 找出所需要的参数
  const commandOptions = command.options.map((item) => ({
    flag: item.flags,
    description: item.description,
    defaultValue: item.defaultValue
  }));

  if (!checkKeys(requireKeys, options)) {
    log.warn(
      `请指定参数确认您想清除的内容，支持以下参数：\n\n${commandOptions
        .map((option) => `['${option.flag}'：${option.description}，默认值：${option.defaultValue}]`)
        .join(
          "\n"
        )}\n\n您可以输入 ${CLI_NAME} ${command.name()} -h 查看使用帮助`
    );
    return;
  }

  if (options.all) {
    cleanAll();
  } else if (options.dep) {
    cleanDep();
  }
};

async function getConfirmClean(msg) {
  // 二次确认
  const { confirmClean } = await prompt({
    type: "confirm",
    name: "confirmClean",
    default: false,
    message: msg,
  });

  return confirmClean;
}

// 清空所有缓存
async function cleanAll() {
  if (!fs.existsSync(process.env.CLI_HOME_PATH)) {
    log.warn("缓存路径不存在", process.env.CLI_HOME_PATH);
    return;
  }

  const confirmClean = await getConfirmClean(
    "确认要清除所有缓存吗？（注意：此操作将删除所有缓存数据）"
  );

  // 用户选择不确认，中断执行
  if (!confirmClean) return;
  log.info("开始清除所有缓存");
  fse.emptyDirSync(process.env.CLI_HOME_PATH);
  log.success("清除所有缓存成功", process.env.CLI_HOME_PATH);
}

// 清空依赖文件
async function cleanDep() {
  const depPath = path.resolve(
    process.env.CLI_HOME_PATH,
    DEPENDENCIES_CACHE_DIR
  );
  if (!fs.existsSync(depPath)) {
    log.success("依赖缓存路径不存在", depPath);
    return;
  }
  const confirmClean = await getConfirmClean(
    "确认要清除依赖缓存吗？（注意：此操作将删除所有依赖缓存数据）"
  );

  // 用户选择不确认，中断执行
  if (!confirmClean) return;
  log.info("开始清除依赖缓存文件");
  fse.emptyDirSync(depPath);
  log.success("清除依赖缓存文件成功", depPath);
}
