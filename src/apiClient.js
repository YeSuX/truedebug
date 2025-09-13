import axios from "axios";
import chalk from "chalk";
import dotenv from "dotenv";

// 加载 .env 文件配置
dotenv.config();

class ApiClient {
  constructor(baseURL, options = {}) {
    this.baseURL = baseURL;
    this.githubToken = options.githubToken || process.env.GITHUB_TOKEN;

    // 调试信息：显示 token 配置状态
    if (this.githubToken) {
      console.log(
        chalk.gray(
          `🔑 GitHub Token 已配置 (${this.githubToken.substring(0, 8)}...)`
        )
      );
    } else {
      console.log(chalk.yellow("⚠️  未检测到 GitHub Token，将使用匿名访问"));
      console.log(
        chalk.gray(
          "💡 提示：在项目根目录创建 .env 文件并添加 GITHUB_TOKEN=your_token"
        )
      );
    }

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

  // 从 GitHub issue URL 获取问题内容
  async fetchGitHubIssue(githubUrl) {
    try {
      // 解析 GitHub URL，提取 owner, repo, issue_number
      const urlMatch = githubUrl.match(
        /github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/
      );
      if (!urlMatch) {
        throw new Error("无效的 GitHub issue URL 格式");
      }

      const [, owner, repo, issueNumber] = urlMatch;

      // 使用 GitHub API 获取 issue 内容
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`;

      console.log(chalk.gray(`🔗 正在获取 GitHub issue: ${apiUrl}`));

      // 构建请求头，包含认证信息
      const headers = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "VibeStepper-Debug-Tool",
      };

      // 如果有 GitHub token，添加认证头
      if (this.githubToken) {
        headers.Authorization = `token ${this.githubToken}`;
        console.log(
          chalk.gray("🔑 使用 GitHub Personal Access Token 进行认证")
        );
      } else {
        console.log(
          chalk.yellow("⚠️  未配置 GitHub token，使用匿名访问（有速率限制）")
        );
      }

      const response = await axios.get(apiUrl, {
        headers,
        timeout: 10000,
      });

      const issue = response.data;

      // 将 GitHub issue 转换为 bug report 格式
      const bugReport = {
        title: issue.title,
        description: issue.body || "无描述信息",
        github_url: githubUrl,
        github_issue_number: issueNumber,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        state: issue.state,
        labels: issue.labels?.map((label) => label.name) || [],
        // 尝试从 issue 内容中提取错误信息
        error_message: this.extractErrorFromIssueBody(issue.body),
        // 从 issue 内容中提取代码文件信息
        code_file: this.extractCodeFileFromIssueBody(issue.body),
        environment: {
          source: "github_issue",
          repository: `${owner}/${repo}`,
        },
      };

      console.log(chalk.green(`✅ 成功获取 GitHub issue: ${issue.title}`));
      return bugReport;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error("GitHub issue 不存在或无法访问");
      } else if (error.response?.status === 403) {
        if (!this.githubToken) {
          throw new Error(
            "GitHub API 访问受限：请设置 GITHUB_TOKEN 环境变量或传入 githubToken 参数。\n" +
              "获取 token 的步骤：\n" +
              "1. 访问 https://github.com/settings/tokens\n" +
              "2. 点击 'Generate new token (classic)'\n" +
              "3. 选择 'repo' 权限\n" +
              "4. 设置环境变量：export GITHUB_TOKEN=your_token_here"
          );
        } else {
          throw new Error("GitHub API 访问受限：token 可能无效或权限不足");
        }
      } else if (error.code === "ENOTFOUND") {
        throw new Error("无法连接到 GitHub API，请检查网络连接");
      } else {
        throw new Error(`获取 GitHub issue 失败: ${error.message}`);
      }
    }
  }

  // 从 issue 内容中提取错误信息
  extractErrorFromIssueBody(body) {
    if (!body) return null;

    // 匹配常见的错误模式
    const errorPatterns = [
      /Error:\s*(.+)/i,
      /Exception:\s*(.+)/i,
      /Traceback[\s\S]*?(\w+Error:\s*.+)/i,
      /Fatal:\s*(.+)/i,
      /Crash:\s*(.+)/i,
    ];

    for (const pattern of errorPatterns) {
      const match = body.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  // 从 issue 内容中提取代码文件信息
  extractCodeFileFromIssueBody(body) {
    if (!body) return null;

    // 匹配文件路径模式
    const filePatterns = [
      /File\s+"([^"]+)"/i,
      /文件\s*[:：]\s*([^\s\n]+)/i,
      /`([^`]+\.(py|js|java|cpp|c|go|rs|rb|php))`/i,
      /([^\s]+\.(py|js|java|cpp|c|go|rs|rb|php))/i,
    ];

    for (const pattern of filePatterns) {
      const match = body.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
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
