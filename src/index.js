#!/usr/bin/env node

const { Command } = require("commander");
const chalk = require("chalk");
const figlet = require("figlet");
const boxen = require("boxen");
const DebugSession = require("./debugSession");

const program = new Command();

// 显示欢迎信息
function showWelcome() {
  console.log(
    chalk.cyan(figlet.textSync("VibeStepper", { horizontalLayout: "full" }))
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
  .name("vibestepper")
  .description("协议化调试工具 - 终端交互式调试助手")
  .version("1.0.0");

program
  .command("debug")
  .description("开始调试会话")
  .argument("<bug-report>", "bug报告文件路径 (JSON格式)")
  .option("-s, --server <url>", "后端服务地址", "http://localhost:8000")
  .option("-v, --verbose", "详细输出模式")
  .action(async (bugReport, options) => {
    showWelcome();

    const session = new DebugSession({
      bugReportPath: bugReport,
      serverUrl: options.server,
      verbose: options.verbose,
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
    const fs = require("fs");
    const path = require("path");

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
