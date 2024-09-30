// 该文件用于存放cli所使用到的一些公共常量

// 定义 cli 名称
const CLI_NAME = "cjp-cli-dev";

// 定义 cli home路径
const DEFAULT_CLI_HOME = ".cjp-cli-dev";

// 定义依赖缓存目录
const DEPENDENCIES_CACHE_DIR = "dependencies";

// 定义模板缓存目录
const TEMPLATE_CACHE_DIR = "template";

// 定义默认安装源为淘宝源
const DEFAULT_NPM_REGISTRY = "https://registry.npmmirror.com/"

module.exports = {
  CLI_NAME, // cli 名称
  DEFAULT_CLI_HOME, // 缓存主目录
  DEPENDENCIES_CACHE_DIR, // 依赖缓存目录
  TEMPLATE_CACHE_DIR, // 模板缓存目录
  DEFAULT_NPM_REGISTRY, // 默认 npm 源
};
