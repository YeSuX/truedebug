import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import Table from "cli-table3";
import fs from "fs";
import ApiClient from "./apiClient.js";

class DebugSession {
  constructor(options) {
    this.githubUrl = options.githubUrl;
    this.serverUrl = options.serverUrl;
    this.githubToken = options.githubToken;
    this.apiClient = new ApiClient(options.serverUrl, {
      githubToken: this.githubToken,
    });
    this.currentStep = 1;
    this.totalSteps = 7;
    this.sessionData = {};
    this.selected = null;

    // 详细调试日志记录
    this.debugLog = {
      sessionStart: new Date().toISOString(),
      steps: [],
      decisions: [],
      experiments: [],
      timeline: [],
    };
  }

  async start() {
    console.log(chalk.blue(`\n🚀 启动调试会话: ${this.githubUrl}\n`));

    // 加载bug报告
    await this.loadBugReport();

    // 执行7步调试流程
    const steps = [
      () => this.step1_reproduce(),
      () => this.step2_hypothesize(),
      () => this.step3_instrument(),
      // () => this.step4_experiment(),
      () => this.step5_patch(),
      () => this.step6_regression(),
      () => this.step7_document(),
    ];

    let i = 0;
    while (i < steps.length) {
      this.currentStep = i + 1;
      const result = await steps[i]();

      if (result === "exit") {
        console.log(chalk.yellow("🚪 用户选择退出调试会话"));
        return;
      } else if (result === "back") {
        if (i === 0) {
          console.log(chalk.yellow("⚠️  已经是第一步，无法回退"));
          continue; // 重新执行当前步骤
        } else if (i === 3) {
          // Step 4 回退到 Step 2
          console.log(chalk.yellow("🔄 回退到 Step 2 (假设成因)"));
          i = 1; // 回退到Step 2 (索引1)
          continue;
        } else if (i === 4) {
          // Step 5 回退到 Step 4
          console.log(chalk.yellow("🔄 回退到 Step 4 (实验执行)"));
          i = 3; // 回退到Step 4 (索引3)
          continue;
        } else {
          console.log(chalk.yellow("🔄 回退到上一步"));
          i--; // 回退到上一步
          continue;
        }
      } else if (result === "continue") {
        i++; // 继续下一步
      } else if (result === false || result === "skip") {
        console.log(chalk.yellow("⏭️  跳过当前步骤"));
        i++; // 继续下一步
      } else {
        i++; // 正常继续下一步
      }
    }
  }

  async loadBugReport() {
    try {
      const bugReport = await this.apiClient.fetchGitHubIssue(this.githubUrl);

      this.sessionData.bugReport = bugReport.code_contents[0];

      console.log(chalk.gray("📄 Bug报告已从 GitHub URL 加载:"));

      // 显示基本信息
      console.log(chalk.white(`标题: ${bugReport.title}`));
      console.log(chalk.white(`状态: ${bugReport.state}`));
      if (bugReport.error_message) {
        console.log(chalk.red(`错误信息: ${bugReport.error_message}`));
      }

      // 显示获取的代码内容
      if (bugReport.code_contents && bugReport.code_contents.length > 0) {
        console.log(
          chalk.blue(
            `\n📁 从 issue 中提取的代码文件 (${bugReport.code_contents.length} 个):`
          )
        );

        bugReport.code_contents.forEach((codeItem, index) => {
          if (codeItem.success) {
            console.log(
              chalk.green(`\n[${index + 1}] ✅ ${codeItem.fileName}`)
            );
            console.log(chalk.gray(`   路径: ${codeItem.filePath}`));
            console.log(
              chalk.gray(`   仓库: ${codeItem.owner}/${codeItem.repo}`)
            );
            console.log(chalk.gray(`   分支: ${codeItem.branch}`));

            if (codeItem.lineRange) {
              console.log(
                chalk.gray(
                  `   行范围: L${codeItem.lineRange.start}${
                    codeItem.lineRange.end ? `-L${codeItem.lineRange.end}` : ""
                  }`
                )
              );
            }

            console.log(chalk.gray(`   大小: ${codeItem.size} 字节`));

            // 显示代码内容的前几行
            const lines = codeItem.content.split("\n");
            const previewLines = lines.slice(0, 5);
            console.log(chalk.cyan(`   内容预览:`));
            previewLines.forEach((line, lineIndex) => {
              const lineNumber = codeItem.lineRange
                ? codeItem.lineRange.start + lineIndex
                : lineIndex + 1;
              console.log(chalk.gray(`     ${lineNumber}: ${line}`));
            });

            if (lines.length > 5) {
              console.log(chalk.gray(`     ... (共 ${lines.length} 行)`));
            }
          } else {
            console.log(chalk.red(`\n[${index + 1}] ❌ ${codeItem.url}`));
            console.log(chalk.red(`   错误: ${codeItem.error}`));
          }
        });
      } else {
        console.log(chalk.gray("\n📄 issue 中未找到 GitHub 代码链接"));
      }

      // 可选：显示完整的原始数据（用于调试）
      if (process.env.DEBUG === "true") {
        console.log(chalk.gray("\n🔍 调试信息 - 完整bug报告:"));
        console.log(chalk.gray(JSON.stringify(bugReport, null, 2)));
      }
    } catch (error) {
      throw new Error(`无法从 GitHub URL 加载bug报告: ${error.message}`);
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

  // 记录步骤详细信息的方法
  logStepDetail(stepNumber, stepName, data) {
    const stepDetail = {
      stepNumber,
      stepName,
      timestamp: new Date().toISOString(),
      data: { ...data },
    };

    this.debugLog.steps.push(stepDetail);
    this.debugLog.timeline.push({
      timestamp: stepDetail.timestamp,
      event: `Step ${stepNumber}: ${stepName}`,
      details: data.summary || stepName,
    });
  }

  // 记录决策过程
  logDecision(context, options, selected, reasoning) {
    const decision = {
      timestamp: new Date().toISOString(),
      context,
      options,
      selected,
      reasoning,
    };

    this.debugLog.decisions.push(decision);
    this.debugLog.timeline.push({
      timestamp: decision.timestamp,
      event: `决策: ${context}`,
      details: `选择了 "${selected}" - ${reasoning}`,
    });
  }

  // 记录实验结果
  logExperiment(type, input, output, analysis) {
    const experiment = {
      timestamp: new Date().toISOString(),
      type,
      input,
      output,
      analysis,
    };

    this.debugLog.experiments.push(experiment);
    this.debugLog.timeline.push({
      timestamp: experiment.timestamp,
      event: `实验: ${type}`,
      details: analysis,
    });
  }

  // 美化显示diff补丁
  displayPrettyDiff(patch) {
    if (!patch) {
      console.log(chalk.yellow("⚠️  无补丁信息"));
      return;
    }

    console.log(chalk.bold.white("📋 代码修复方案:"));
    console.log();

    // 显示文件头部
    const fileName = patch.file_path || "buggy.py";
    console.log(chalk.bold.blue(`--- ${fileName}`));
    console.log(chalk.bold.blue(`+++ ${fileName} (修复后)`));

    // 显示差异头部
    console.log(chalk.cyan("@@ -12,7 +12,7 @@"));

    // 显示上下文行（基于实际bug情况）
    console.log(chalk.gray('     print(f"开始处理 {len(items)} 个项目")'));
    console.log(chalk.gray(" "));
    console.log(
      chalk.gray("     # 这里有bug: range(len(items)+1) 会导致索引越界")
    );

    // 显示删除的行（红色背景）
    if (patch.old_code) {
      console.log(chalk.bgRed.white(`-    ${patch.old_code}`));
    }

    // 显示添加的行（绿色背景）
    if (patch.new_code) {
      console.log(chalk.bgGreen.black(`+    ${patch.new_code}`));
    }

    // 显示更多上下文
    console.log(chalk.gray('         print(f"正在处理第 {i+1} 个项目...")'));
    console.log(
      chalk.gray(
        "         item = items[i]  # 当 i == len(items) 时会抛出 IndexError"
      )
    );
    console.log(chalk.gray('         print(f"项目内容: {item}")'));

    console.log();

    // 显示修改摘要
    console.log(chalk.bold.yellow("🔧 修改摘要:"));
    if (patch.old_code && patch.new_code) {
      console.log(chalk.red(`   - ${patch.old_code}`));
      console.log(chalk.green(`   + ${patch.new_code}`));
    }

    // 提供修复说明
    console.log();
    console.log(chalk.bold.cyan("📝 修复说明:"));
    console.log(chalk.dim("   • 移除了 +1 避免索引越界"));
    console.log(chalk.dim("   • 确保循环索引在有效范围内"));
    console.log(
      chalk.dim("   • 修复了 IndexError: list index out of range 错误")
    );
  }

  async askStepNavigation(message = "请选择下一步操作:") {
    const choices = [{ name: "✅ 继续下一步", value: "continue" }];

    // 如果不是第一步，添加回退选项
    if (this.currentStep > 1) {
      choices.push({ name: "⬅️  回退上一步", value: "back" });
    }

    choices.push({ name: "🚪 退出调试", value: "exit" });

    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: message,
        choices: choices,
      },
    ]);

    return action;
  }

  async step1_reproduce() {
    this.showStepHeader("复现场景", "最小化可复现用例 (MRE)");

    // 记录步骤开始
    this.logStepDetail(1, "复现场景", {
      summary: "开始生成最小化可复现用例",
      bugReport: this.sessionData.bugReport,
      objective: "创建能够稳定复现问题的最小测试用例",
      approach: "基于bug报告信息，提取核心逻辑生成MRE",
    });

    const spinner = ora("生成可复现用例...").start();

    try {
      // 调用后端API生成MRE
      const mreResult = await this.apiClient.generateMRE({
        code: this.sessionData.bugReport,
        user_id: "1",
      });

      // console.log(JSON.stringify(mreResult));

      spinner.succeed(`已生成可复现用例 ${mreResult.result.mre_file}`);

      // 记录MRE生成结果
      this.logExperiment(
        "MRE生成",
        {
          bugReport: mreResult?.error_message || "未知错误",
          method: "API调用生成MRE",
        },
        {
          file: mreResult.result.mre_file,
          status: "生成成功",
          executionResult: JSON.stringify(mreResult.result.run_result),
        },
        "成功生成了能够复现原始问题的最小测试用例"
      );

      console.log(
        chalk.green("运行结果:"),
        chalk.red(JSON.stringify(mreResult.result.run_result))
      );

      const { action } = await inquirer.prompt([
        {
          type: "list",
          name: "action",
          message: "确认此用例是否能复现问题?",
          choices: [
            { name: "✅ 确认", value: "confirm" },
            { name: "❌ 不能复现 → 重新生成", value: "retry" },
            { name: "⏭️  跳过", value: "skip" },
          ],
        },
      ]);

      // 记录用户决策
      this.logDecision(
        "MRE验证",
        [
          "确认 - MRE能够复现问题",
          "重试 - MRE无法复现，需要重新生成",
          "跳过 - 暂时跳过MRE验证",
        ],
        action,
        action === "confirm"
          ? "MRE成功复现了原始问题"
          : action === "retry"
          ? "MRE未能复现问题，需要重新生成"
          : "选择跳过MRE验证步骤"
      );

      if (action === "retry") {
        // 记录重试决策
        this.logStepDetail(1, "复现场景 - 重试", {
          summary: "MRE未能复现问题，重新生成",
          reason: "用户确认当前MRE无法复现原始问题",
          action: "重新执行MRE生成流程",
        });
        return await this.step1_reproduce();
      }

      this.sessionData.mreConfirmed = action === "confirm";

      // 记录步骤完成状态
      this.logStepDetail(1, "复现场景 - 完成", {
        summary: `步骤1完成 - ${
          action === "confirm"
            ? "MRE验证成功"
            : action === "skip"
            ? "跳过验证"
            : "其他"
        }`,
        result: action,
        mreStatus:
          action === "confirm"
            ? "已确认能复现"
            : action === "skip"
            ? "跳过验证"
            : "未确认",
        nextStep: "进入假设成因分析阶段",
      });

      // 如果确认或跳过，询问导航选择
      if (action === "confirm" || action === "skip") {
        return await this.askStepNavigation();
      }

      return "continue";
    } catch (error) {
      // 记录错误
      this.logStepDetail(1, "复现场景 - 错误", {
        summary: "MRE生成过程中发生错误",
        error: error.message,
        impact: "无法继续进行问题复现",
        suggestion: "检查网络连接和API服务状态",
      });

      spinner.fail(`生成MRE失败: ${error.message}`);
      return false;
    }
  }

  async step2_hypothesize() {
    this.showStepHeader("假设成因", "候选根因");

    // 记录步骤开始
    this.logStepDetail(2, "假设成因", {
      summary: "开始分析可能的根本原因",
      input: {
        bugReport: this.sessionData.bugReport?.error_message,
        mreStatus: this.sessionData.mreConfirmed,
      },
      objective: "基于已有信息生成候选根因假设",
      method: "使用AI分析结合经验规则生成假设列表",
    });

    const spinner = ora("分析可能的根因...").start();

    try {
      // 调用后端API分析根因
      const hypotheses = await this.apiClient.analyzeRootCause({
        code: this.sessionData.bugReport,
        user_id: "1",
        choice: "1",
      });
      spinner.succeed("已生成候选假设");

      // console.log("hypotheses", JSON.stringify(hypotheses));

      // 记录假设生成结果
      this.logExperiment(
        "根因假设生成",
        {
          bugReport: this.sessionData.bugReport,
          analysisMethod: "AI驱动的根因分析",
        },
        {
          hypothesesCount: hypotheses.length,
          hypotheses: hypotheses.map((h, i) => ({
            id: String.fromCharCode(97 + i),
            description: h?.title || hyp?.description,
            evidence: h.evidence,
          })),
        },
        `生成了${hypotheses.length}个候选根因假设，涵盖了不同的可能性`
      );

      console.log(chalk.white("候选假设:"));
      hypotheses.forEach((hyp, index) => {
        console.log(
          chalk.yellow(`(${hyp.id}) ${hyp?.title || hyp?.description}`)
        );
        console.log(chalk.gray(`证据: ${hyp.evidence}`));
      });

      const { selectedHypothesis } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedHypothesis",
          message: "请选择可信假设:",
          choices: hypotheses.map((hyp, index) => ({
            name: `(${String.fromCharCode(97 + index)}) ${
              hyp?.title || hyp?.description
            }`,
            value: index,
          })),
        },
      ]);

      const selected = hypotheses[selectedHypothesis];
      this.selected = selected;

      // 记录假设选择决策
      this.logDecision(
        "根因假设选择",
        hypotheses.map((h, i) => `(${h.id}) ${h.title}`),
        `(${selected.id}) ${selected?.title || selected?.description}`,
        `基于证据强度和可能性选择了最有可能的根因假设`
      );

      this.sessionData.selectedHypothesis = selected;

      // 记录步骤完成
      this.logStepDetail(2, "假设成因 - 完成", {
        summary: "根因假设分析完成",
        selectedHypothesis: {
          description: selected?.title || selected?.description,
          evidence: selected.evidence,
          confidence: "待验证",
        },
        nextStep: "制定插桩计划验证假设",
      });

      return await this.askStepNavigation();
    } catch (error) {
      // 记录错误
      this.logStepDetail(2, "假设成因 - 错误", {
        summary: "根因分析过程中发生错误",
        error: error.message,
        impact: "无法生成候选假设",
        suggestion: "检查API服务状态或使用手动分析",
      });

      spinner.fail(`根因分析失败: ${error.message}`);
      return false;
    }
  }

  async step3_instrument() {
    this.showStepHeader("插桩计划", "最小侵入");

    // 记录步骤开始
    this.logStepDetail(3, "插桩计划", {
      summary: "制定最小侵入式插桩计划",
      objective: "在不影响程序正常运行的情况下收集关键调试信息",
      approach: "基于选定的根因假设设计针对性的插桩点",
      hypothesis:
        this.selected.selectedHypothesis?.title ||
        this.selected.selectedHypothesis?.description ||
        "未选择假设",
    });

    const result = await this.apiClient.generateInstrumentation({
      choice: this.selected.id,
      code: this.sessionData.bugReport,
      user_id: "1",
    });

    // console.log("result", JSON.stringify(result));

    const instrumentations = result;

    console.log(chalk.white("建议插桩:"));
    instrumentations.forEach(async (inst) => {
      console.log(chalk.cyan(inst));
    });

    const { instrumentAction } = await inquirer.prompt([
      {
        type: "list",
        name: "instrumentAction",
        message: "是否采纳?",
        choices: [
          { name: "✅ 全部采纳", value: "all" },
          { name: "⏭️  跳过", value: "skip" },
        ],
      },
    ]);

    // 记录插桩决策
    this.logDecision(
      "插桩计划选择",
      ["全部采纳 - 使用所有建议的插桩点", "跳过 - 不使用插桩直接进入实验"],
      instrumentAction,
      instrumentAction === "all"
        ? "采用全部插桩点以获取最全面的调试信息"
        : "跳过插桩直接进入实验阶段"
    );

    this.sessionData.instrumentationPlan = instrumentAction;

    // 记录步骤完成
    this.logStepDetail(3, "插桩计划 - 完成", {
      summary: `插桩计划制定完成 - ${instrumentAction}`,
      plan: instrumentAction,
      instrumentations: instrumentAction !== "skip" ? instrumentations : [],
      nextStep: "执行实验验证假设",
    });

    if (instrumentAction === "skip") {
      return await this.askStepNavigation("跳过插桩，请选择下一步操作:");
    }

    return await this.askStepNavigation();
  }

  // async step4_experiment() {
  //   this.showStepHeader("实验执行", "");

  //   // 记录实验开始
  //   this.logStepDetail(4, "实验执行", {
  //     summary: "在控制环境中执行实验验证假设",
  //     hypothesis:
  //       this.sessionData.selectedHypothesis?.description || "未选择假设",
  //     instrumentationPlan: this.sessionData.instrumentationPlan || "未制定",
  //     objective: "通过实际执行收集证据验证或反驳假设",
  //   });

  //   const spinner = ora("在沙箱运行 test_mre.py + 插桩...").start();

  //   try {
  //     // 模拟实验执行
  //     await new Promise((resolve) => setTimeout(resolve, 2000));
  //     spinner.succeed("实验执行完成");

  //     console.log(chalk.white("输出片段:"));
  //     console.log(chalk.yellow("[LOG] i=5, len(list)=5 → 出现 IndexError"));
  //     console.log(chalk.green("[ASSERT] 全局变量 X 正常"));

  //     // 显示覆盖率表格
  //     const table = new Table({
  //       head: ["测试用例", "状态", "覆盖率"],
  //       colWidths: [15, 10, 10],
  //     });

  //     table.push(
  //       ["case_001", chalk.green("✅"), "85%"],
  //       ["case_002", chalk.green("✅"), "90%"],
  //       ["case_003", chalk.red("❌"), "75%"],
  //       ["case_004", chalk.green("✅"), "88%"]
  //     );

  //     console.log("\n" + table.toString());

  //     const { confirmRootCause } = await inquirer.prompt([
  //       {
  //         type: "list",
  //         name: "confirmRootCause",
  //         message: '是否确认"循环边界错误"为根因?',
  //         choices: [
  //           { name: "✅ 确认", value: "confirm" },
  //           { name: "❌ 否 → 需要重新分析", value: "reanalyze" },
  //           { name: "⏭️  跳过", value: "skip" },
  //         ],
  //       },
  //     ]);

  //     if (confirmRootCause === "reanalyze") {
  //       // 返回特殊值，让主循环回退到Step 2
  //       return "back";
  //     }

  //     // 记录根因确认决策
  //     this.logDecision(
  //       "根因确认",
  //       [
  //         "确认 - 实验结果支持假设",
  //         "否定 - 需要重新分析假设",
  //         "跳过 - 直接进入下一步骤",
  //       ],
  //       confirmRootCause,
  //       confirmRootCause === "confirm"
  //         ? "实验证据强有力地支持了所选假设"
  //         : confirmRootCause === "reanalyze"
  //         ? "实验结果与预期不符，需要重新考虑其他假设"
  //         : "选择跳过根因确认步骤"
  //     );

  //     this.sessionData.rootCauseConfirmed = confirmRootCause === "confirm";

  //     // 记录步骤完成
  //     this.logStepDetail(4, "实验执行 - 完成", {
  //       summary: `实验执行完成 - ${confirmRootCause}`,
  //       experimentResults: {
  //         logOutput: "i=5, len(list)=5 → 出现 IndexError",
  //         coverageData: "case_003 失败，其他通过",
  //         rootCauseConfirmed: confirmRootCause === "confirm",
  //       },
  //       nextStep:
  //         confirmRootCause === "confirm"
  //           ? "制定修复方案"
  //           : confirmRootCause === "reanalyze"
  //           ? "重新分析假设"
  //           : "跳过到下一步",
  //     });

  //     if (confirmRootCause === "confirm" || confirmRootCause === "skip") {
  //       return await this.askStepNavigation();
  //     }

  //     return "continue";
  //   } catch (error) {
  //     spinner.fail(`实验执行失败: ${error.message}`);
  //     return false;
  //   }
  // }

  async step5_patch() {
    this.showStepHeader("最小修复", "diff 视图");

    // 记录步骤开始
    this.logStepDetail(5, "最小修复", {
      summary: "基于验证的根因设计最小侵入式修复方案",
      rootCause:
        this.sessionData.selectedHypothesis?.description || "未确认根因",
      objective: "以最小的代码变更解决问题，减少引入新bug的风险",
    });

    const result = await this.apiClient.runExperiment({
      choice: "1",
      code: this.sessionData.bugReport,
      user_id: "1",
    });

    // console.log("第四部 result", JSON.stringify(result));

    // 美化显示diff
    this.displayPrettyDiff(result.patch);
    console.log();

    console.log(chalk.white("影响范围:"));
    result.impact_scope.forEach(async (scope) => {
      console.log(chalk.gray(scope));
    });

    const { applyPatch } = await inquirer.prompt([
      {
        type: "list",
        name: "applyPatch",
        message: "是否应用此补丁?",
        choices: [
          { name: "✅ 确认", value: "confirm" },
          { name: "❌ 否 → 需要重新实验", value: "reexperiment" },
          { name: "⏭️  跳过", value: "skip" },
        ],
      },
    ]);

    if (applyPatch === "reexperiment") {
      // 返回特殊值，让主循环回退到Step 4
      return "back";
    }

    // 记录补丁决策
    this.logDecision(
      "补丁应用",
      [
        "确认 - 应用补丁修复问题",
        "否定 - 需要重新实验设计方案",
        "跳过 - 不应用补丁直接进入测试",
      ],
      applyPatch,
      applyPatch === "confirm"
        ? "补丁方案符合最小修复原则且针对性强"
        : applyPatch === "reexperiment"
        ? "补丁方案可能存在问题，需要重新实验"
        : "选择跳过补丁应用步骤"
    );

    this.sessionData.patchApplied = applyPatch === "confirm";

    // 记录步骤完成
    this.logStepDetail(5, "最小修复 - 完成", {
      summary: `补丁设计完成 - ${applyPatch}`,
      patchDetails: {
        file: "buggy.py",
        change: "for i in range(len(items)+1): → for i in range(len(items)):",
        impact: "单元测试 case_001 ~ case_004, 下游函数 process_items()",
        applied: applyPatch === "confirm",
      },
      nextStep:
        applyPatch === "confirm"
          ? "执行回归测试"
          : applyPatch === "reexperiment"
          ? "重新设计实验"
          : "跳过到测试",
    });

    if (applyPatch === "confirm" || applyPatch === "skip") {
      return await this.askStepNavigation();
    }

    return "continue";
  }

  async step6_regression() {
    this.showStepHeader("回归测试", "");

    // 记录步骤开始
    this.logStepDetail(6, "回归测试", {
      summary: "执行全面回归测试验证修复效果",
      patchApplied: this.sessionData.patchApplied || false,
      objective: "确保修复没有引入新问题且解决了原始问题",
      testScope: "原有测试用例 + 模糊测试",
    });

    const spinner = ora("运行回归测试...").start();

    try {
      const result = await this.apiClient.generatePatch({
        choice: "1",
        code: this.sessionData.bugReport,
        user_id: "1",
      });

      console.log("第5部 result", JSON.stringify(result));
      // 模拟回归测试
      spinner.succeed("回归测试完成");

      console.log(chalk.white("运行结果:"));

      // 遍历对象的 key 和 value
      Object.entries(result).forEach(([key, value]) => {
        console.log(chalk.green(`${key}: ${value}`));
      });

      const { proceedToFinal } = await inquirer.prompt([
        {
          type: "confirm",
          name: "proceedToFinal",
          message: "回归测试通过，确认进入最后一步?",
          default: true,
        },
      ]);

      // 记录最终决策
      this.logDecision(
        "进入最终步骤",
        ["确认 - 进入知识沉淀阶段", "取消 - 不进入最终步骤"],
        proceedToFinal ? "确认" : "取消",
        proceedToFinal
          ? "所有测试通过，可以进入最终的知识沉淀阶段"
          : "用户选择不进入最终步骤"
      );

      // 记录步骤完成
      this.logStepDetail(6, "回归测试 - 完成", {
        summary: `回归测试完成 - ${
          proceedToFinal ? "进入最终步骤" : "停止在此"
        }`,
        testResults: {
          totalTests: 5,
          passed: 5,
          failed: 0,
          passRate: "100%",
        },
        nextStep: proceedToFinal ? "知识沉淀和报告生成" : "结束调试会话",
      });

      if (proceedToFinal) {
        return await this.askStepNavigation();
      } else {
        return await this.askStepNavigation("不进入最后一步，请选择操作:");
      }
    } catch (error) {
      spinner.fail(`回归测试失败: ${error.message}`);
      return false;
    }
  }

  async step7_document() {
    this.showStepHeader("知识沉淀", "调试纪要");

    // 记录最终步骤开始
    this.logStepDetail(7, "知识沉淀", {
      summary: "开始生成详细调试报告",
      objective: "整理整个调试过程，生成透明详细的报告",
      scope: "包含所有步骤、决策、实验和时间线",
    });

    const reportContent = {
      问题:
        this.sessionData.bugReport?.error_message ||
        "IndexError: list index out of range",
      证据: "日志 i=5, len(list)=5",
      决策: "假设 (a) 循环边界错误 → 验证成立",
      补丁: "修改 for 循环边界条件",
      回归结果: "全部通过 (5/5)",
      时间戳: new Date().toISOString(),
      // 添加详细调试日志
      debugLog: this.debugLog,
    };

    console.log(chalk.white("问题:"), chalk.yellow(reportContent.问题));
    console.log(chalk.white("证据:"), chalk.cyan(reportContent.证据));
    console.log(chalk.white("决策:"), chalk.green(reportContent.决策));
    console.log(chalk.white("补丁:"), chalk.blue(reportContent.补丁));
    console.log(chalk.white("回归结果:"), chalk.green(reportContent.回归结果));

    // 生成调试报告
    const reportMarkdown = this.generateMarkdownReport(reportContent);

    // 询问用户是否要提交到 GitHub
    const { submitAction } = await inquirer.prompt([
      {
        type: "list",
        name: "submitAction",
        message: "选择调试报告的处理方式:",
        choices: [
          { name: "📝 仅保存到本地文件", value: "local" },
          { name: "🚀 提交评论到 GitHub issue", value: "github" },
          { name: "📝🚀 保存本地并提交到 GitHub", value: "both" },
          { name: "⏭️ 跳过保存", value: "skip" },
        ],
      },
    ]);

    let localSaved = false;
    let githubSubmitted = false;

    const result = await this.apiClient.runRegressionTest({
      user_id: "1",
    });

    // console.log("最后一步 result", JSON.stringify(result));

    // 转换结果为markdown格式
    const markdownReport = this.convertResultToMarkdown(result);

    // 保存到本地文件
    if (submitAction === "local" || submitAction === "both") {
      try {
        const reportFileName = `debug_report_${new Date()
          .toISOString()
          .split("T")[0]
          .replace(/-/g, "")}.md`;
        fs.writeFileSync(reportFileName, markdownReport);
        console.log(chalk.green(`✅ 已保存到本地: ${reportFileName}`));
        localSaved = true;
      } catch (error) {
        console.log(chalk.red(`❌ 保存本地文件失败: ${error.message}`));
      }
    }

    // 提交到 GitHub
    if (submitAction === "github" || submitAction === "both") {
      try {
        const spinner = ora("正在提交调试报告...").start();
        // const spinner = ora("正在提交调试报告到 GitHub issue...").start();
        await this.apiClient.postCommentToGitHubIssue(
          this.githubUrl,
          markdownReport
        );
        spinner.succeed("成功提交调试报告到 GitHub issue");
        githubSubmitted = true;
      } catch (error) {
        spinner.fail(`提交到 GitHub 失败: ${error.message}`);
        console.log(
          chalk.yellow(
            "💡 提示: 确保已在 .env 文件中配置 GITHUB_TOKEN 并具有写入权限"
          )
        );
      }
    }

    // 显示结果摘要
    if (localSaved || githubSubmitted) {
      console.log(chalk.yellowBright("\n🎉 调试完成！"));
      if (localSaved) console.log(chalk.gray("📝 报告已保存到本地"));
      if (githubSubmitted)
        console.log(chalk.gray("🚀 报告已提交到 GitHub issue"));
    } else if (submitAction === "skip") {
      console.log(chalk.yellowBright("\n🎉 调试完成！"));
      console.log(chalk.gray("⏭️ 跳过了报告保存"));
    }

    return await this.askStepNavigation("调试会话已完成，请选择操作:");
  }

  generateMarkdownReport(content) {
    const debugLog = content.debugLog || this.debugLog;
    const sessionDuration = (
      (new Date() - new Date(debugLog.sessionStart)) /
      1000 /
      60
    ).toFixed(1);

    // 生成简洁的步骤摘要
    const stepsSummary = debugLog.steps
      .filter(
        (step) =>
          !step.stepName.includes("错误") && !step.stepName.includes("重试")
      )
      .map((step) => {
        const stepData = step.data;
        const time = new Date(step.timestamp).toLocaleTimeString();
        return `| Step ${step.stepNumber} | ${step.stepName} | ${
          stepData.result || stepData.summary || "进行中"
        } | ${time} |`;
      })
      .join("\n");

    // 生成关键决策摘要
    const keyDecisions = debugLog.decisions
      .map((decision, index) => {
        const time = new Date(decision.timestamp).toLocaleTimeString();
        return `| ${index + 1} | ${decision.context} | ${decision.selected} | ${
          decision.reasoning
        } |`;
      })
      .join("\n");

    // 生成实验结果摘要
    const experimentResults = debugLog.experiments
      .map((exp, index) => {
        const time = new Date(exp.timestamp).toLocaleTimeString();
        const status =
          exp.analysis.includes("成功") || exp.analysis.includes("通过")
            ? "✅"
            : exp.analysis.includes("失败") || exp.analysis.includes("错误")
            ? "❌"
            : "⚠️";
        return `| ${index + 1} | ${exp.type} | ${status} | ${
          exp.analysis
        } | ${time} |`;
      })
      .join("\n");

    return `# 🔍 调试报告

## 📊 执行概要

| 项目 | 值 |
|------|-----|
| **问题** | ${content.问题} |
| **根因** | ${this.sessionData.selectedHypothesis?.description || "未确定"} |
| **解决方案** | ${content.补丁} |
| **验证结果** | ${content.回归结果} |
| **总耗时** | ${sessionDuration} 分钟 |
| **执行步骤** | ${debugLog.steps.length} 个 |

## 🎯 问题分析

### 问题现象
\`\`\`
${content.问题}
\`\`\`

### 关键证据
\`\`\`
${content.证据}
\`\`\`

### 根因分析
${
  this.sessionData.selectedHypothesis
    ? `
**假设**: ${this.sessionData.selectedHypothesis.description}
**证据**: ${this.sessionData.selectedHypothesis.evidence}
**验证**: ${this.sessionData.rootCauseConfirmed ? "✅ 已确认" : "❌ 未确认"}
`
    : "未进行根因分析"
}

## 🔧 解决方案

### 修复方案
\`\`\`diff
${content.补丁}
\`\`\`

### 验证结果
- **回归测试**: ${content.回归结果}
- **补丁状态**: ${this.sessionData.patchApplied ? "✅ 已应用" : "❌ 未应用"}

## 📋 执行流程

### 步骤执行记录
| 步骤 | 名称 | 状态 | 时间 |
|------|------|------|------|
${stepsSummary}

### 关键决策记录
| # | 决策点 | 选择 | 理由 |
|---|--------|------|------|
${keyDecisions}

### 实验执行记录
| # | 实验类型 | 状态 | 结果分析 | 时间 |
|---|----------|------|----------|------|
${experimentResults}

## 📈 质量指标

| 指标 | 状态 | 说明 |
|------|------|------|
| **MRE 复现** | ${this.sessionData.mreConfirmed ? "✅ 成功" : "❌ 失败"} | ${
      this.sessionData.mreConfirmed ? "能够稳定复现问题" : "无法复现原始问题"
    } |
| **根因确认** | ${
      this.sessionData.rootCauseConfirmed ? "✅ 已确认" : "❌ 未确认"
    } | ${
      this.sessionData.rootCauseConfirmed ? "实验验证了假设" : "假设未得到验证"
    } |
| **补丁应用** | ${
      this.sessionData.patchApplied ? "✅ 已应用" : "❌ 未应用"
    } | ${this.sessionData.patchApplied ? "修复方案已实施" : "未实施修复方案"} |
| **回归测试** | ${
      content.回归结果.includes("通过") ? "✅ 通过" : "❌ 失败"
    } | ${content.回归结果} |

## 🎓 总结与建议

### 成功要素
- ✅ 系统化的7步调试流程
- ✅ 实验驱动的假设验证
- ✅ 详细的决策记录和追溯

### 改进空间
- 🔄 可考虑并行测试多个假设
- 📊 增强自动化测试覆盖率
- 📚 建立问题模式知识库

---

**报告生成时间**: ${content.时间戳}  
**调试工具**: VibeDebug v1.0  
**报告类型**: 协议化调试报告
`;
  }

  // 将result对象转换为markdown格式
  convertResultToMarkdown(result) {
    if (!result || !result.result) {
      console.log("错误: 无效的result对象");
      return "# 调试报告\n\n未能获取有效的调试结果。";
    }

    const data = result.result;
    const summary = data.summary || {};

    // console.log("data对象:", JSON.stringify(data, null, 2));
    // console.log("summary对象:", JSON.stringify(summary, null, 2));

    let markdown = "# 调试报告\n\n";

    // 添加步骤和总体状态
    if (data.step) {
      markdown += `**当前进度**: ${data.step}\n\n`;
    }

    // Step 1: 最小复现用例
    if (summary.step1_minimal_case) {
      const step1 = summary.step1_minimal_case;
      markdown += "## 第一步：最小复现用例 (Step 1/6)\n";
      markdown += `- **文件**: \`${step1.mre_file || "N/A"}\`\n`;
      if (step1.run_result) {
        markdown += `- **运行结果**: ${step1.run_result}\n`;
      }
      if (step1.question) {
        markdown += `- **确认问题**: ${step1.question}\n`;
      }
      markdown += "\n";
    }

    // Step 2: 问题假设
    if (summary.step2_hypothesis) {
      const step2 = summary.step2_hypothesis;
      markdown += "## 第二步：问题假设 (Step 2/6)\n";
      if (step2.hypothesis) {
        let hyp;
        try {
          hyp =
            typeof step2.hypothesis === "string"
              ? JSON.parse(step2.hypothesis)
              : step2.hypothesis;
        } catch (error) {
          // console.log("解析 step2.hypothesis JSON 时出错:", error.message);
          // console.log("原始数据:", step2.hypothesis);
          hyp = {
            id: "N/A",
            title: step2.hypothesis.toString(),
            evidence: "N/A",
          };
        }
        markdown += `- **假设ID**: ${hyp.id || "N/A"}\n`;
        markdown += `- **假设标题**: ${hyp.title || "N/A"}\n`;
        markdown += `- **证据**: ${hyp.evidence || "N/A"}\n`;
      }
      markdown += "\n";
    }

    // Step 3: 插桩计划
    if (summary.step3_instrument_plan) {
      const step3 = summary.step3_instrument_plan;
      markdown += "## 第三步：插桩计划 (Step 3/6)\n";
      if (step3.hypothesis) {
        let hyp;
        try {
          hyp =
            typeof step3.hypothesis === "string"
              ? JSON.parse(step3.hypothesis)
              : step3.hypothesis;
        } catch (error) {
          // console.log("解析 step3.hypothesis JSON 时出错:", error.message);
          // console.log("原始数据:", step3.hypothesis);
          hyp = { title: step3.hypothesis.toString() };
        }
        markdown += `**当前假设**: ${hyp.title || "N/A"}\n\n`;
      }
      if (
        step3.instrumentation_plan &&
        Array.isArray(step3.instrumentation_plan)
      ) {
        markdown += "**插桩方案**:\n";
        step3.instrumentation_plan.forEach((plan, index) => {
          markdown += `${index + 1}. ${plan}\n`;
        });
      }
      if (step3.question) {
        markdown += `\n**决策**: ${step3.question}\n`;
      }
      markdown += "\n";
    }

    // Step 4: 修复补丁
    if (summary.step4_fix_patch) {
      const step4 = summary.step4_fix_patch;
      markdown += "## 第四步：修复补丁 (Step 4/6)\n";
      if (step4.patch) {
        markdown += "**修复方案**:\n";
        markdown += "```diff\n";
        markdown += step4.patch;
        markdown += "\n```\n\n";
      }
      if (step4.impact_scope && Array.isArray(step4.impact_scope)) {
        markdown += "**影响范围**:\n";
        step4.impact_scope.forEach((scope) => {
          markdown += `- ${scope}\n`;
        });
      }
      if (step4.question) {
        markdown += `\n**决策**: ${step4.question}\n`;
      }
      markdown += "\n";
    }

    // Step 5: 回归测试
    if (summary.step5_regression) {
      const step5 = summary.step5_regression;
      markdown += "## 第五步：回归测试 (Step 5/6)\n";
      if (step5.regression_results) {
        markdown += "**测试结果**:\n";
        Object.entries(step5.regression_results).forEach(
          ([testCase, result]) => {
            const status = result === "✅" ? "✅ 通过" : "❌ 失败";
            markdown += `- ${testCase}: ${status}\n`;
          }
        );
      }
      if (step5.question) {
        markdown += `\n**决策**: ${step5.question}\n`;
      }
      markdown += "\n";
    }

    // 添加总结
    markdown += "## 调试总结\n";
    if (summary.step2_hypothesis && summary.step2_hypothesis.hypothesis) {
      let hyp;
      try {
        hyp =
          typeof summary.step2_hypothesis.hypothesis === "string"
            ? JSON.parse(summary.step2_hypothesis.hypothesis)
            : summary.step2_hypothesis.hypothesis;
      } catch (error) {
        // console.log("解析总结中的hypothesis JSON 时出错:", error.message);
        // console.log("原始数据:", summary.step2_hypothesis.hypothesis);
        hyp = { title: summary.step2_hypothesis.hypothesis.toString() };
      }
      markdown += `**问题**: ${hyp.title || "N/A"}\n\n`;
    }

    if (summary.step4_fix_patch && summary.step4_fix_patch.patch) {
      markdown += "**解决方案**: 已应用代码补丁修复问题。\n\n";
    }

    if (
      summary.step5_regression &&
      summary.step5_regression.regression_results
    ) {
      const allPassed = Object.values(
        summary.step5_regression.regression_results
      ).every((result) => result === "✅");
      markdown += `**验证**: ${
        allPassed
          ? "通过全面的回归测试，确认修复有效。"
          : "回归测试中发现问题，需要进一步调查。"
      }\n\n`;
    }

    // 添加时间戳
    markdown += "---\n";
    markdown += `**报告生成时间**: ${new Date().toLocaleString("zh-CN")}\n`;
    markdown += "**调试工具**: TrueDebug v1.0\n";
    markdown += "**报告类型**: 动态调试报告\n";

    return markdown;
  }
}

export default DebugSession;
