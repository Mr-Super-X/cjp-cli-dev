import globals from 'globals'
import pluginJs from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended'

// http://eslint.cn/
export default [
  // 忽略文件
  {
    ignores: [
      'node_modules',
      'dist',
      'public',
    ],
  },
  // 配置全局变量，解决使用未导入的全局变量报错
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  // 指定继承的规则 js推荐
  // pluginJs.configs.recommended为eslint推荐的选项配置
  pluginJs.configs.recommended,
  // eslintConfigPrettier 作用是解决prettier和eslint冲突，需要安装eslint-config-prettier
  eslintConfigPrettier,
  // 关闭prettier与eslint的规则冲突，优先使用prettier规则，会合并根目录下的.prettierrc.js 文件
  eslintPluginPrettier,

  // 可单独为每一项配置规则，vue规则示例：
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        // 设置ECMA语法支持最新
        ecmaVersion: 'latest',
        // 允许在.vue 文件中使用 JSX
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    // 在这里追加 vue 规则
    rules: {
      // 关闭检测组件名称是否使用驼峰或多单词命名
      'vue/multi-word-component-names': 'off',
    },
  },

  // 通用规则，全部生效
  {
    // 在rules中追加规则
    rules: {
      // 生产环境使用console报警告，开发环境关闭
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      // 生产环境使用debugger报警告，开发环境关闭
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      // 关闭使用symbol时一定要传入描述
      'symbol-description': 'off',
      // 未使用变量报警告
      'no-unused-vars': 'warn',
    },
  },
]
