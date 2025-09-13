#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import figlet from "figlet";
import boxen from "boxen";
import fs from "fs";
import path from "path";
import DebugSession from "./debugSession.js";

const program = new Command();

// 显示欢迎信息
function showWelcome() {
  console.log(
    chalk.cyan(figlet.textSync("VibeDebug", { horizontalLayout: "full" }))
  );
  console.log(
    boxen(
      chalk.white("🌈 协议化调试工具\n") +
        chalk.gray("让调试过程可验证、可追溯、可复现"),
      {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        borderColor: "cyan",
      }
    )
  );
}

program
  .name("vibedebug")
  .description("协议化调试工具 - 终端交互式调试助手")
  .version("1.0.0");

program
  .command("debug")
  .description("开始调试会话")
  .argument("<github-url>", "GitHub issue URL")
  .option("-s, --server <url>", "后端服务地址", "http://localhost:8000")
  .action(async (githubUrl, options) => {
    showWelcome();

    // 验证 GitHub URL 格式
    const urlPattern = /github\.com\/[^\/]+\/[^\/]+\/issues\/\d+/;
    if (!urlPattern.test(githubUrl)) {
      console.error(chalk.red("❌ 错误: 请提供有效的 GitHub issue URL"));
      console.log(chalk.gray("使用示例:"));
      console.log(
        chalk.gray("  vibedebug debug https://github.com/owner/repo/issues/123")
      );
      process.exit(1);
    }

    const session = new DebugSession({
      githubUrl: githubUrl,
      serverUrl: options.server,
    });

    try {
      await session.start();
    } catch (error) {
      console.error(chalk.red("❌ 调试会话出错:"), error.message);
      process.exit(1);
    }
  });

program
  .command("init")
  .description("初始化示例bug报告")
  .action(() => {
    const exampleBugReport = {
      title: "IndexError: list index out of range",
      description: "程序在处理列表时出现索引越界错误",
      code_file: "buggy.py",
      error_message: "IndexError: list index out of range",
      stack_trace: [
        'File "buggy.py", line 42, in process_items',
        "    item = items[i]",
        "IndexError: list index out of range",
      ],
      test_cases: ["case_001", "case_002", "case_003", "case_004"],
      environment: {
        python_version: "3.9.0",
        os: "Linux",
      },
    };

    fs.writeFileSync(
      "bug_report.json",
      JSON.stringify(exampleBugReport, null, 2)
    );
    console.log(chalk.green("✅ 已创建示例bug报告: bug_report.json"));
  });

// 错误处理
process.on("uncaughtException", (error) => {
  console.error(chalk.red("❌ 未捕获的异常:"), error.message);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(chalk.red("❌ 未处理的Promise拒绝:"), reason);
  process.exit(1);
});

program.parse();
