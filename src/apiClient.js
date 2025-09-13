import axios from "axios";
import chalk from "chalk";

class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        console.log(
          chalk.gray(
            `🔗 API请求: ${config.method?.toUpperCase()} ${config.url}`
          )
        );
        return config;
      },
      (error) => {
        console.error(chalk.red("❌ 请求错误:"), error.message);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        console.log(
          chalk.gray(`✅ API响应: ${response.status} ${response.statusText}`)
        );
        return response;
      },
      (error) => {
        if (error.code === "ECONNREFUSED") {
          console.error(
            chalk.red("❌ 无法连接到后端服务，请确保Python服务正在运行")
          );
        } else {
          console.error(chalk.red("❌ API错误:"), error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  async generateMRE(bugReport) {
    try {
      const response = await this.client.post("/api/generate-mre", {
        bug_report: bugReport,
      });
      return response.data;
    } catch (error) {
      // 如果后端不可用，返回模拟数据
      console.log(chalk.yellow("⚠️  使用模拟数据 (后端服务不可用)"));
      return {
        mre_code: `# 最小可复现用例
def process_items(items):
    for i in range(len(items)+1):  # 这里有bug
        print(f"Processing item {i}: {items[i]}")

# 测试用例
items = ["a", "b", "c"]
process_items(items)  # 会抛出 IndexError
`,
        can_reproduce: true,
      };
    }
  }

  async analyzeRootCause(bugReport) {
    try {
      const response = await this.client.post("/api/analyze-root-cause", {
        bug_report: bugReport,
      });
      return response.data.hypotheses;
    } catch (error) {
      // 如果后端不可用，返回模拟数据
      console.log(chalk.yellow("⚠️  使用模拟数据 (后端服务不可用)"));
      return [
        {
          description: "循环边界错误: i <= len(list) → i < len(list) ?",
          evidence: "日志片段 line 42, 触发 IndexError",
          confidence: 0.85,
        },
        {
          description: "空输入列表未处理",
          evidence: "单元测试 case_003, 输入 []",
          confidence: 0.65,
        },
        {
          description: "并发条件下共享状态污染",
          evidence: "覆盖率报告, 出错路径涉及全局变量 X",
          confidence: 0.45,
        },
      ];
    }
  }

  async generateInstrumentation(hypothesis) {
    try {
      const response = await this.client.post("/api/generate-instrumentation", {
        hypothesis: hypothesis,
      });
      return response.data;
    } catch (error) {
      console.log(chalk.yellow("⚠️  使用模拟数据 (后端服务不可用)"));
      return {
        instrumentations: [
          "在 loop 入口打印 i, len(list)",
          "在 case_003 输入时打印 list 长度",
          "在全局变量 X 写入时加断言",
        ],
      };
    }
  }

  async runExperiment(mreCode, instrumentations) {
    try {
      const response = await this.client.post("/api/run-experiment", {
        mre_code: mreCode,
        instrumentations: instrumentations,
      });
      return response.data;
    } catch (error) {
      console.log(chalk.yellow("⚠️  使用模拟数据 (后端服务不可用)"));
      return {
        output:
          "[LOG] i=5, len(list)=5 → 出现 IndexError\n[ASSERT] 全局变量 X 正常",
        coverage: {
          case_001: 85,
          case_002: 90,
          case_003: 75,
          case_004: 88,
        },
        root_cause_confirmed: true,
      };
    }
  }

  async generatePatch(hypothesis, experimentResult) {
    try {
      const response = await this.client.post("/api/generate-patch", {
        hypothesis: hypothesis,
        experiment_result: experimentResult,
      });
      return response.data;
    } catch (error) {
      console.log(chalk.yellow("⚠️  使用模拟数据 (后端服务不可用)"));
      return {
        patch: {
          old_code: "for i in range(len(items)+1):",
          new_code: "for i in range(len(items)):",
          file_path: "buggy.py",
          line_number: 42,
        },
        impact_analysis: [
          "单元测试 case_001 ~ case_004",
          "下游函数 process_items()",
        ],
      };
    }
  }

  async runRegressionTest(patchedCode) {
    try {
      const response = await this.client.post("/api/run-regression", {
        patched_code: patchedCode,
      });
      return response.data;
    } catch (error) {
      console.log(chalk.yellow("⚠️  使用模拟数据 (后端服务不可用)"));
      return {
        test_results: {
          case_001: "passed",
          case_002: "passed",
          case_003: "passed",
          case_004: "passed",
          fuzz_10x: "passed",
        },
        all_passed: true,
        total_tests: 5,
        passed_tests: 5,
      };
    }
  }
}

export default ApiClient;
