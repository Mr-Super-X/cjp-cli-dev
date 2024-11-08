"use strict";

// 自建库
const Command = require("@cjp-cli-dev/command");
const log = require("@cjp-cli-dev/log");
const { prompt, CLI_NAME, simpleGit } = require("@cjp-cli-dev/utils"); // 工具方法

// 将当前进程执行的上下文路径传给simpleGit
const git = simpleGit(process.cwd());
const COMMAND_NAME = "delete-branch";

/**
 * 快速删除本地和远端分支（支持多选）
 * 1. 支持参数，branchName、force、multiple
 * 2. multiple参数为true，列出所有本地和远端分支供用户选择
 * 3. multiple为false，单删模式，输入命令 + branchName即可
 * 4. 检查force参数，单删和多删都生效，为true则不进行二次确认直接删除，false则进行二次确认
 * 5. 检查本地和远端要删除的分支是否存在，存在则删除，不存在则跳过
 * 6. 完成删除功能
 */
class DeleteBranchCommand extends Command {
  init() {
    this.branchName = this._args[0] || "";
    this.force = this._args[1].force || false;
    this.multiple = this._args[1].multiple || false;
    this.commandOptions = this._args[2].options || [];
    // debug模式下输出以下变量
    log.verbose("branchName", this.branchName);
    log.verbose("force", this.force);
    log.verbose("multiple", this.multiple);
    log.verbose("commandOptions", this.commandOptions);
  }
  async exec() {
    try {
      await this.execCommand();
    } catch (err) {
      log.error(err.message);

      // debug模式下打印执行栈，便于调试
      if (process.env.LOG_LEVEL === "verbose") {
        console.log(err);
      }
    }
  }

  // 执行命令
  async execCommand() {
    // 删除多个分支
    if (this.multiple) {
      const branches = await this.getBranches();
      const localBranches = [];
      const remoteBranches = [];
      // 筛选出本地和远程分支
      branches.forEach((item) => {
        if (item.startsWith("origin/")) {
          remoteBranches.push(item);
        } else {
          localBranches.push(item);
        }
      });

      // 检查force参数
      if (this.force) {
        await this.batchDeleteBranches(localBranches, remoteBranches);
      } else {
        // 二次确认
        const confirmDelete = await this.getConfirmDelete(branches);

        if (confirmDelete) {
          await this.batchDeleteBranches(localBranches, remoteBranches);
        } else {
          log.notice(`您已取消删除分支：${branches}`);
        }
      }
    } else {
      // 找出所需要的参数
      const commandOptions = this.commandOptions.map((item) => ({
        flag: item.flags,
        description: item.description,
        defaultValue: item.defaultValue
      }));

      // 删除单个分支
      if (!this.branchName) {
        log.warn(
          `请指定您想删除的分支名称，支持以下参数：\n\n${commandOptions
            .map((option) => `['${option.flag}'：${option.description}，默认值：${option.defaultValue}]`)
            .join(
              "\n"
            )}\n\n您可以输入 ${CLI_NAME} ${COMMAND_NAME} -h 查看使用帮助`
        );
        return;
      }

      // 支持force参数直接删除，无需二次确认
      if (this.force) {
        // 检查并删除本地分支
        await this.checkLocalBranch(this.branchName);
        // 检查并删除远程分支
        await this.checkRemoteBranch(this.branchName);
      } else {
        // 二次确认
        const confirmDelete = await this.getConfirmDelete(this.branchName);

        if (confirmDelete) {
          // 检查并删除本地分支
          await this.checkLocalBranch(this.branchName);
          // 检查并删除远程分支
          await this.checkRemoteBranch(this.branchName);
        } else {
          log.notice(`您已取消删除分支：${this.branchName}`);
        }
      }
    }
  }

  // 检查并删除本地分支
  async checkLocalBranch(branchName) {
    log.info("检查本地是否存在分支：" + branchName);
    const localBranchList = await git.branchLocal();
    log.verbose("localBranchList", localBranchList);

    const hasBranch = localBranchList.all.find((item) => item === branchName);

    if (!hasBranch) {
      log.info(`本地分支 ${branchName} 不存在，跳过删除分支`);
      return false;
    } else {
      log.info(`本地分支 ${branchName} 存在，自动删除该分支`);
      await this.deleteLocalBranch(branchName);
      return true;
    }
  }

  // 检查并删除远程分支
  async checkRemoteBranch(branchName) {
    log.info("检查远程是否存在分支：" + branchName);
    const remoteBranchList = await git.branch(["-r"]);
    log.verbose("remoteBranchList", remoteBranchList);

    const hasBranch = remoteBranchList.all.find((item) => item === branchName);

    if (!hasBranch) {
      log.info(`远程分支 ${branchName} 不存在，跳过删除分支`);
      return false;
    } else {
      log.info(`远程分支 ${branchName} 存在，自动删除该分支`);
      await this.deleteRemoteBranch(branchName);
      return true;
    }
  }

  // 删除本地开发分支
  async deleteLocalBranch(branchName) {
    log.info("开始删除本地分支", branchName);
    await git.deleteLocalBranch(branchName);
    log.success(`删除本地分支 ${branchName} 成功`);
  }

  // 删除远程开发分支
  async deleteRemoteBranch(branchName) {
    // 删除远程分支时不需要开头的origin/，简单处理兼容一下
    branchName = branchName.startsWith("origin/")
      ? branchName.replace(/^origin\//, "")
      : branchName;
    log.info("开始删除远程分支", branchName);
    await git.push(["origin", "--delete", branchName]);
    log.success(`删除远程分支 ${branchName} 成功`);
  }

  // 二次确认
  async getConfirmDelete(branchName) {
    const { confirmDelete } = await prompt({
      type: "confirm", // type为confirm时，默认值是true，则提示的字母Y为大写，否则提示的字母N为大写
      name: "confirmDelete",
      default: false,
      message: `您确定要删除 ${branchName} 分支吗？`,
    });

    return confirmDelete;
  }

  // 询问要删除的分支
  async getBranches() {
    const { branches } = await prompt({
      type: "checkbox",
      name: "branches",
      message: "请选择您要删除的分支：",
      default: "",
      choices: await this.createBranchChoices(),
    });

    return branches;
  }

  // 生成本地和远程分支列表选项
  async createBranchChoices() {
    const localBranchList = await git.branchLocal();
    const remoteBranchList = await git.branch(["-r"]);

    // 返回本地分支和远端分支集合
    const allBranches = [
      ...localBranchList.all.map((item) => ({
        name: `本地：${item}`,
        value: item,
      })),
      ...remoteBranchList.all.map((item) => ({
        name: `远程：${item}`,
        value: item,
      })),
    ];

    log.verbose("allBranches", allBranches);
    return allBranches;
  }

  // 批量删除本地和远程分支
  async batchDeleteBranches(localBranches, remoteBranches) {
    // 删除选中的本地分支
    localBranches.forEach(async (item) => {
      await this.deleteLocalBranch(item);
    });

    // 删除选中的远端分支
    remoteBranches.forEach(async (item) => {
      await this.deleteRemoteBranch(item);
    });
  }
}

function init(args) {
  return new DeleteBranchCommand(args);
}

module.exports = init;
module.exports.DeleteBranchCommand = DeleteBranchCommand;
