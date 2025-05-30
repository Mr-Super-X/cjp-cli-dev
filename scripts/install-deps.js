const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// 项目根目录
const ROOT_DIR = path.resolve(__dirname, '..');
// 需要处理的目录
const DIRS = ['commands', 'core', 'models', 'utils'];

async function main() {
  try {
    console.log('开始清理所有子包的 node_modules...');
    // 清理子包的 node_modules
    DIRS.forEach(dir => {
      const basePath = path.join(ROOT_DIR, dir);
      if (!fs.existsSync(basePath)) return;

      fs.readdirSync(basePath).forEach(subDir => {
        const nodeModulesPath = path.join(basePath, subDir, 'node_modules');
        if (fs.existsSync(nodeModulesPath)) {
          fs.rmSync(nodeModulesPath, { recursive: true, force: true });
          console.log(`已删除: ${nodeModulesPath}`);
        }
      });
    });

    console.log('\n开始安装子包依赖...');
    // 安装子包依赖
    DIRS.forEach(dir => {
      const basePath = path.join(ROOT_DIR, dir);
      if (!fs.existsSync(basePath)) return;

      fs.readdirSync(basePath).forEach(subDir => {
        const packageJsonPath = path.join(basePath, subDir, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          console.log(`\n正在安装 ${dir}/${subDir} 的依赖...`);
          execSync('npm install', {
            cwd: path.join(basePath, subDir),
            stdio: 'inherit'
          });
        }
      });
    });
    console.log('\n✨ 所有子包依赖均已安装完成!');

    console.log('\n创建全局软链接...');
    execSync('npm link', {
      cwd: path.join(ROOT_DIR, 'core/cli'),
      stdio: 'inherit'
    });

    console.log('\n已为脚手架创建好全局软链接！可在任意终端输入 cjp-cli-dev 命令使用。');
  } catch (error) {
    console.error('\n❌ 安装过程中出现错误:', error);
    process.exit(1);
  }
}

main();