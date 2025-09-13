import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import Table from "cli-table3";
import fs from "fs";
import path from "path";
import ApiClient from "./apiClient.js";

class DebugSession {
  constructor(options) {
    this.bugReportPath = options.bugReportPath;
    this.serverUrl = options.serverUrl;
    this.verbose = options.verbose;
    this.apiClient = new ApiClient(options.serverUrl);
    this.currentStep = 1;
    this.totalSteps = 7;
    this.sessionData = {};
  }

  async start() {
    console.log(chalk.blue(`\n🚀 启动调试会话: ${this.bugReportPath}\n`));

    // 加载bug报告
    await this.loadBugReport();

    // 执行7步调试流程
    const steps = [
      () => this.step1_reproduce(),
      () => this.step2_hypothesize(),
      () => this.step3_instrument(),
      () => this.step4_experiment(),
      () => this.step5_patch(),
      () => this.step6_regression(),
      () => this.step7_document(),
    ];

    for (let i = 0; i < steps.length; i++) {
      this.currentStep = i + 1;
      const shouldContinue = await steps[i]();
      if (!shouldContinue) {
        console.log(chalk.yellow("🔄 用户选择退出或回退"));
        break;
      }
    }
  }

  async loadBugReport() {
    try {
      const reportContent = fs.readFileSync(this.bugReportPath, "utf8");
      this.sessionData.bugReport = JSON.parse(reportContent);

      if (this.verbose) {
        console.log(chalk.gray("📄 Bug报告已加载:"));
        console.log(
          chalk.gray(JSON.stringify(this.sessionData.bugReport, null, 2))
        );
      }
    } catch (error) {
      throw new Error(`无法加载bug报告: ${error.message}`);
    }
  }

  showStepHeader(stepName, description) {
    console.log(chalk.cyan(`\n⸻\n`));
    console.log(
      chalk.bold.white(
        `[Step ${this.currentStep}/${this.totalSteps}] ${stepName}`
      )
    );
    console.log(chalk.gray(description));
    console.log();
  }

  async step1_reproduce() {
    this.showStepHeader("复现场景", "最小化可复现用例 (MRE)");

    const spinner = ora("生成可复现用例...").start();

    try {
      // 调用后端API生成MRE
      const mreResult = await this.apiClient.generateMRE(
        this.sessionData.bugReport
      );
      spinner.succeed("已生成可复现用例 test_mre.py");

      console.log(
        chalk.green("运行结果:"),
        chalk.red("程序崩溃 (IndexError: list index out of range)")
      );

      const { action } = await inquirer.prompt([
        {
          type: "list",
          name: "action",
          message: "确认此用例是否能复现问题?",
          choices: [
            { name: "✅ 确认", value: "confirm" },
            { name: "❌ 不能复现 → 回退/调整", value: "retry" },
            { name: "⏭️  跳过", value: "skip" },
          ],
        },
      ]);

      this.sessionData.mreConfirmed = action === "confirm";
      return action !== "retry";
    } catch (error) {
      spinner.fail(`生成MRE失败: ${error.message}`);
      return false;
    }
  }

  async step2_hypothesize() {
    this.showStepHeader("假设成因", "候选根因");

    const spinner = ora("分析可能的根因...").start();

    try {
      // 调用后端API分析根因
      const hypotheses = await this.apiClient.analyzeRootCause(
        this.sessionData.bugReport
      );
      spinner.succeed("已生成候选假设");

      console.log(chalk.white("候选假设:"));
      hypotheses.forEach((hyp, index) => {
        const letter = String.fromCharCode(97 + index); // a, b, c...
        console.log(chalk.yellow(`(${letter}) ${hyp.description}`));
        console.log(chalk.gray(`证据: ${hyp.evidence}`));
      });

      const { selectedHypothesis } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedHypothesis",
          message: "请选择可信假设:",
          choices: hypotheses.map((hyp, index) => ({
            name: `(${String.fromCharCode(97 + index)}) ${hyp.description}`,
            value: index,
          })),
        },
      ]);

      this.sessionData.selectedHypothesis = hypotheses[selectedHypothesis];
      return true;
    } catch (error) {
      spinner.fail(`根因分析失败: ${error.message}`);
      return false;
    }
  }

  async step3_instrument() {
    this.showStepHeader("插桩计划", "最小侵入");

    const instrumentations = [
      "1. 在 loop 入口打印 i, len(list)",
      "2. 在 case_003 输入时打印 list 长度",
      "3. 在全局变量 X 写入时加断言",
    ];

    console.log(chalk.white("建议插桩:"));
    instrumentations.forEach((inst) => {
      console.log(chalk.cyan(inst));
    });

    const { instrumentAction } = await inquirer.prompt([
      {
        type: "list",
        name: "instrumentAction",
        message: "是否采纳?",
        choices: [
          { name: "✅ 全部采纳", value: "all" },
          { name: "🔸 仅选 1,2", value: "partial" },
          { name: "✏️  自定义", value: "custom" },
          { name: "⏭️  跳过", value: "skip" },
        ],
      },
    ]);

    this.sessionData.instrumentationPlan = instrumentAction;
    return instrumentAction !== "skip";
  }

  async step4_experiment() {
    this.showStepHeader("实验执行", "");

    const spinner = ora("在沙箱运行 test_mre.py + 插桩...").start();

    try {
      // 模拟实验执行
      await new Promise((resolve) => setTimeout(resolve, 2000));
      spinner.succeed("实验执行完成");

      console.log(chalk.white("输出片段:"));
      console.log(chalk.yellow("[LOG] i=5, len(list)=5 → 出现 IndexError"));
      console.log(chalk.green("[ASSERT] 全局变量 X 正常"));

      // 显示覆盖率表格
      const table = new Table({
        head: ["测试用例", "状态", "覆盖率"],
        colWidths: [15, 10, 10],
      });

      table.push(
        ["case_001", chalk.green("✅"), "85%"],
        ["case_002", chalk.green("✅"), "90%"],
        ["case_003", chalk.red("❌"), "75%"],
        ["case_004", chalk.green("✅"), "88%"]
      );

      console.log("\n" + table.toString());

      const { confirmRootCause } = await inquirer.prompt([
        {
          type: "list",
          name: "confirmRootCause",
          message: '是否确认"循环边界错误"为根因?',
          choices: [
            { name: "✅ 确认", value: "confirm" },
            { name: "❌ 否 → 回退 Step 2", value: "back" },
            { name: "⏭️  跳过", value: "skip" },
          ],
        },
      ]);

      if (confirmRootCause === "back") {
        this.currentStep = 1; // 回退到Step 2
        return await this.step2_hypothesize();
      }

      this.sessionData.rootCauseConfirmed = confirmRootCause === "confirm";
      return confirmRootCause !== "skip";
    } catch (error) {
      spinner.fail(`实验执行失败: ${error.message}`);
      return false;
    }
  }

  async step5_patch() {
    this.showStepHeader("最小修复", "diff 视图");

    console.log(chalk.white("--- buggy.py"));
    console.log(chalk.white("+++ fixed.py"));
    console.log(chalk.cyan("@@ -40,7 +40,7 @@"));
    console.log();
    console.log(chalk.red("- for i in range(len(items)+1):"));
    console.log(chalk.green("+ for i in range(len(items)):"));
    console.log();

    console.log(chalk.white("影响范围:"));
    console.log(chalk.gray("- 单元测试 case_001 ~ case_004"));
    console.log(chalk.gray("- 下游函数 process_items()"));

    const { applyPatch } = await inquirer.prompt([
      {
        type: "list",
        name: "applyPatch",
        message: "是否应用此补丁?",
        choices: [
          { name: "✅ 确认", value: "confirm" },
          { name: "❌ 否 → 回退 Step 4", value: "back" },
          { name: "⏭️  跳过", value: "skip" },
        ],
      },
    ]);

    if (applyPatch === "back") {
      return await this.step4_experiment();
    }

    this.sessionData.patchApplied = applyPatch === "confirm";
    return applyPatch !== "skip";
  }

  async step6_regression() {
    this.showStepHeader("回归测试", "");

    const spinner = ora("运行回归测试...").start();

    try {
      // 模拟回归测试
      await new Promise((resolve) => setTimeout(resolve, 3000));
      spinner.succeed("回归测试完成");

      console.log(chalk.white("运行结果:"));
      const testResults = [
        "case_001: ✅",
        "case_002: ✅",
        "case_003: ✅",
        "case_004: ✅",
        "fuzz_10x: ✅",
      ];

      testResults.forEach((result) => {
        console.log(chalk.green(result));
      });

      console.log(chalk.white("\n矩阵: 全部通过 (5/5)"));

      const { proceedToFinal } = await inquirer.prompt([
        {
          type: "confirm",
          name: "proceedToFinal",
          message: "确认进入最后一步?",
          default: true,
        },
      ]);

      return proceedToFinal;
    } catch (error) {
      spinner.fail(`回归测试失败: ${error.message}`);
      return false;
    }
  }

  async step7_document() {
    this.showStepHeader("知识沉淀", "调试纪要");

    const reportContent = {
      问题:
        this.sessionData.bugReport?.error_message ||
        "IndexError: list index out of range",
      证据: "日志 i=5, len(list)=5",
      决策: "假设 (a) 循环边界错误 → 验证成立",
      补丁: "修改 for 循环边界条件",
      回归结果: "全部通过 (5/5)",
      时间戳: new Date().toISOString(),
    };

    console.log(chalk.white("问题:"), chalk.yellow(reportContent.问题));
    console.log(chalk.white("证据:"), chalk.cyan(reportContent.证据));
    console.log(chalk.white("决策:"), chalk.green(reportContent.决策));
    console.log(chalk.white("补丁:"), chalk.blue(reportContent.补丁));
    console.log(chalk.white("回归结果:"), chalk.green(reportContent.回归结果));

    // 保存调试报告
    const reportFileName = `debug_report_${new Date()
      .toISOString()
      .split("T")[0]
      .replace(/-/g, "")}.md`;
    const reportMarkdown = this.generateMarkdownReport(reportContent);

    fs.writeFileSync(reportFileName, reportMarkdown);

    console.log(chalk.green(`\n已保存到: ${reportFileName}`));
    console.log(chalk.gray("可附加到 GitHub PR / Issue"));

    console.log(chalk.yellowBright("\n🎉 调试完成！"));

    return true;
  }

  generateMarkdownReport(content) {
    return `# 调试报告

## 问题描述
${content.问题}

## 证据分析
${content.证据}

## 决策过程
${content.决策}

## 解决方案
${content.补丁}

## 验证结果
${content.回归结果}

## 时间戳
${content.时间戳}

---
*由 VibeStepper 自动生成*
`;
  }
}

export default DebugSession;
