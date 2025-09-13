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
        "User-Agent": "VibeDebug-Tool",
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

      // 提取并获取 issue body 中的代码内容
      console.log(chalk.gray("🔍 开始提取 issue body 中的 GitHub 代码链接..."));
      const codeContents = await this.extractAndFetchCodeFromIssue(issue.body);

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
        // 添加从 GitHub 链接中获取的代码内容
        code_contents: codeContents,
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

  // 从 issue 内容中提取 GitHub 代码链接
  extractGitHubCodeLinks(body) {
    if (!body) return [];

    // 匹配 GitHub 代码链接模式
    const githubCodeLinkPatterns = [
      // 标准的 GitHub blob 链接
      /https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/([^\s)]+)/g,
      // GitHub 代码片段链接 (带行号)
      /https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/([^\s)#]+)#L(\d+)(?:-L(\d+))?/g,
    ];

    const codeLinks = [];

    for (const pattern of githubCodeLinkPatterns) {
      let match;
      while ((match = pattern.exec(body)) !== null) {
        const [fullUrl, owner, repo, branch, filePath, startLine, endLine] =
          match;

        codeLinks.push({
          url: fullUrl,
          owner,
          repo,
          branch,
          filePath,
          startLine: startLine ? parseInt(startLine) : null,
          endLine: endLine ? parseInt(endLine) : null,
        });
      }
    }

    // 去重 - 基于完整URL
    const uniqueLinks = codeLinks.filter(
      (link, index, self) => index === self.findIndex((l) => l.url === link.url)
    );

    return uniqueLinks;
  }

  // 从 GitHub 获取代码文件内容
  async fetchGitHubFileContent(
    owner,
    repo,
    branch,
    filePath,
    startLine = null,
    endLine = null
  ) {
    try {
      // 使用 GitHub API 获取文件内容
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;

      console.log(
        chalk.gray(`🔗 正在获取 GitHub 文件内容: ${owner}/${repo}/${filePath}`)
      );

      // 构建请求头
      const headers = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "VibeDebug-Tool",
      };

      // 如果有 GitHub token，添加认证头
      if (this.githubToken) {
        headers.Authorization = `token ${this.githubToken}`;
      }

      const response = await axios.get(apiUrl, {
        headers,
        timeout: 10000,
      });

      const fileData = response.data;

      // GitHub API 返回的内容是 base64 编码的
      const content = Buffer.from(fileData.content, "base64").toString("utf-8");

      // 如果指定了行号范围，只返回相应的行
      if (startLine !== null) {
        const lines = content.split("\n");
        const start = Math.max(0, startLine - 1); // 转换为0索引
        const end = endLine ? Math.min(lines.length, endLine) : startLine;

        return {
          content: lines.slice(start, end).join("\n"),
          fullContent: content,
          lineRange: { start: startLine, end: endLine || startLine },
          fileName: filePath.split("/").pop(),
          filePath,
          size: fileData.size,
          sha: fileData.sha,
        };
      }

      return {
        content,
        fullContent: content,
        lineRange: null,
        fileName: filePath.split("/").pop(),
        filePath,
        size: fileData.size,
        sha: fileData.sha,
      };
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`GitHub 文件不存在: ${owner}/${repo}/${filePath}`);
      } else if (error.response?.status === 403) {
        if (!this.githubToken) {
          throw new Error(
            `GitHub API 访问受限，无法获取文件内容。请设置 GITHUB_TOKEN 环境变量。\n文件: ${owner}/${repo}/${filePath}`
          );
        } else {
          throw new Error(
            `GitHub API 访问受限: token 可能无效或权限不足\n文件: ${owner}/${repo}/${filePath}`
          );
        }
      } else if (error.code === "ENOTFOUND") {
        throw new Error("无法连接到 GitHub API，请检查网络连接");
      } else {
        throw new Error(
          `获取 GitHub 文件内容失败: ${error.message}\n文件: ${owner}/${repo}/${filePath}`
        );
      }
    }
  }

  // 从 issue body 中提取并获取所有代码内容
  async extractAndFetchCodeFromIssue(issueBody) {
    if (!issueBody) return [];

    try {
      // 提取所有 GitHub 代码链接
      const codeLinks = this.extractGitHubCodeLinks(issueBody);

      if (codeLinks.length === 0) {
        console.log(chalk.gray("📄 未在 issue body 中找到 GitHub 代码链接"));
        return [];
      }

      console.log(
        chalk.blue(
          `🔍 在 issue body 中找到 ${codeLinks.length} 个 GitHub 代码链接`
        )
      );

      // 并行获取所有代码文件内容
      const codeContents = await Promise.allSettled(
        codeLinks.map(async (link) => {
          try {
            const content = await this.fetchGitHubFileContent(
              link.owner,
              link.repo,
              link.branch,
              link.filePath,
              link.startLine,
              link.endLine
            );

            return {
              ...link,
              ...content,
              success: true,
            };
          } catch (error) {
            console.log(
              chalk.yellow(`⚠️  获取文件失败: ${link.url} - ${error.message}`)
            );
            return {
              ...link,
              success: false,
              error: error.message,
            };
          }
        })
      );

      // 处理结果
      const results = codeContents.map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          return {
            ...codeLinks[index],
            success: false,
            error: result.reason?.message || "获取失败",
          };
        }
      });

      const successfulResults = results.filter((r) => r.success);
      const failedResults = results.filter((r) => !r.success);

      console.log(
        chalk.green(`✅ 成功获取 ${successfulResults.length} 个文件的内容`)
      );
      if (failedResults.length > 0) {
        console.log(chalk.yellow(`⚠️  ${failedResults.length} 个文件获取失败`));
      }

      return results;
    } catch (error) {
      console.error(chalk.red(`❌ 提取代码内容时发生错误: ${error.message}`));
      return [];
    }
  }

  // 提交评论到 GitHub issue
  async postCommentToGitHubIssue(githubUrl, comment) {
    try {
      // 解析 GitHub URL，提取 owner, repo, issue_number
      const urlMatch = githubUrl.match(
        /github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/
      );
      if (!urlMatch) {
        throw new Error("无效的 GitHub issue URL 格式");
      }

      const [, owner, repo, issueNumber] = urlMatch;

      // 使用 GitHub API 提交评论
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`;

      console.log(chalk.gray(`🔗 正在提交评论到 GitHub issue: ${apiUrl}`));

      // 构建请求头，包含认证信息
      const headers = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "VibeDebug-Tool",
        "Content-Type": "application/json",
      };

      // 如果有 GitHub token，添加认证头
      if (this.githubToken) {
        headers.Authorization = `token ${this.githubToken}`;
      } else {
        throw new Error(
          "需要 GitHub token 才能提交评论，请在 .env 文件中设置 GITHUB_TOKEN"
        );
      }

      const response = await axios.post(
        apiUrl,
        {
          body: comment,
        },
        {
          headers,
          timeout: 10000,
        }
      );

      console.log(chalk.green(`✅ 成功提交评论到 GitHub issue`));
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error("GitHub issue 不存在或无法访问");
      } else if (error.response?.status === 403) {
        throw new Error("GitHub API 访问受限：token 可能无效或权限不足");
      } else if (error.response?.status === 401) {
        throw new Error("GitHub 认证失败：请检查 token 是否正确");
      } else if (error.code === "ENOTFOUND") {
        throw new Error("无法连接到 GitHub API，请检查网络连接");
      } else {
        throw new Error(`提交 GitHub 评论失败: ${error.message}`);
      }
    }
  }

  async generateMRE(bugReport) {
    try {
      const response = await this.client.post("/step1", {
        bug_report: bugReport,
        user_id: "1",
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
      const response = await this.client.post("/step2", {
        choice: "1",
        user_id: "1",
      });
      return response.data.result.hypotheses;
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
