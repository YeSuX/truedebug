# 🌈 VibeStepper - 协议化调试工具

> 让调试过程可验证、可追溯、可复现

VibeStepper 是一个创新的 AI 驱动调试工具，通过 7 步协议化流程，将传统的"黑箱调试"转变为"透明化、可验证"的调试体验。

## ✨ 核心特性

- 🔍 **协议化调试流程**: 标准化的 7 步调试方法论
- 🤖 **AI 辅助分析**: 智能根因分析和假设生成
- 📊 **可视化证据**: 实时日志、覆盖率、测试结果展示
- 🔄 **交互式确认**: 每一步都可确认、回退或跳过
- 📝 **知识沉淀**: 自动生成调试报告和文档
- 🚀 **快速演示**: 3-5 分钟完整体验调试流程

## 🏗️ 项目架构

```
truedebug/
├── src/                    # JavaScript CLI前端
│   ├── index.js           # 主入口文件
│   ├── debugSession.js    # 调试会话管理
│   └── apiClient.js       # API客户端
├── backend/               # Python后端服务
│   ├── main.py           # FastAPI服务器
│   └── requirements.txt  # Python依赖
├── demo/                 # 演示文件
│   ├── buggy.py         # 有bug的示例代码
│   ├── bug_report.json  # 示例bug报告
│   └── test_cases.py    # 测试用例
├── package.json         # Node.js依赖配置
└── README.md           # 项目文档
```

## 🚀 快速开始

### 1. 环境准备

确保你的系统已安装：

- Node.js (>= 16.0.0)
- Python (>= 3.8)
- npm 或 yarn

### 2. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd backend
pip install -r requirements.txt
cd ..
```

### 3. 配置 GitHub 访问 (可选但推荐)

如果你需要从 GitHub issue 导入 bug 报告，建议配置 GitHub Personal Access Token 以避免 API 速率限制：

```bash
# 方法1: 使用 .env 文件 (推荐)
cp env.example .env
# 然后编辑 .env 文件，设置你的 GITHUB_TOKEN

# 方法2: 设置环境变量
export GITHUB_TOKEN=your_personal_access_token_here

# 方法3: 在命令行中指定
vibestepper debug <github-url> --token your_token_here
```

**获取 GitHub Token 的步骤：**

1. 访问 [GitHub Settings > Personal access tokens](https://github.com/settings/tokens)
2. 点击 "Generate new token (classic)"
3. 选择 `repo` 权限（用于访问公共和私有仓库的 issues）
4. 复制生成的 token 并设置到 `.env` 文件中

### 4. 启动服务

**启动后端服务:**

```bash
cd backend
python main.py
```

后端服务将在 `http://localhost:8000` 启动

**安装 CLI 工具:**

```bash
npm install -g .
# 或者使用本地版本
npm link
```

### 5. 体验演示

```bash
# 初始化示例bug报告
vibestepper init

# 开始调试会话 (使用本地 JSON 文件)
vibestepper debug bug_report.json

# 或使用演示文件
vibestepper debug demo/bug_report.json

# 从 GitHub issue 导入并调试 (需要配置 .env 文件)
vibestepper debug https://github.com/owner/repo/issues/123
```

## 🔄 7 步调试流程

### Step 1: 复现场景 (MRE)

- 生成最小可复现用例
- 验证 bug 是否能稳定复现
- 为后续分析提供基础

### Step 2: 假设成因

- AI 分析可能的根本原因
- 提供多个候选假设
- 基于证据评估可信度

### Step 3: 插桩计划

- 设计最小侵入的插桩方案
- 针对性收集调试信息
- 平衡信息量与性能开销

### Step 4: 实验执行

- 在沙箱环境运行插桩代码
- 收集日志、覆盖率等证据
- 验证或排除假设

### Step 5: 最小修复

- 生成针对性补丁
- 展示 diff 视图
- 分析影响范围

### Step 6: 回归测试

- 运行完整测试套件
- 确保修复不引入新问题
- 验证所有测试用例通过

### Step 7: 知识沉淀

- 生成结构化调试报告
- 记录决策过程和证据
- 便于后续参考和学习

## 🎯 使用场景

### 开发调试

```bash
# 调试生产环境bug
vibestepper debug production_bug.json

# 指定后端服务地址
vibestepper debug bug_report.json --server http://your-server:8000
```

### 教学演示

```bash
# 快速演示调试流程
vibestepper debug demo/bug_report.json

# 查看生成的调试报告
cat debug_report_*.md
```

### CI/CD 集成

```bash
# 在CI流程中运行调试分析
vibestepper debug ci_bug_report.json --non-interactive
```

## 📊 API 接口

后端提供以下 REST API 接口：

- `GET /health` - 健康检查
- `POST /api/generate-mre` - 生成 MRE
- `POST /api/analyze-root-cause` - 根因分析
- `POST /api/generate-instrumentation` - 生成插桩
- `POST /api/run-experiment` - 运行实验
- `POST /api/generate-patch` - 生成补丁
- `POST /api/run-regression` - 回归测试

API 文档: `http://localhost:8000/docs`

## 🔧 配置选项

### CLI 选项

```bash
vibestepper debug <bug-report> [options]

Options:
  -s, --server <url>    后端服务地址 (默认: http://localhost:8000)
  -h, --help           显示帮助信息
  --version            显示版本号
```

### Bug 报告格式

```json
{
  "title": "错误标题",
  "description": "详细描述",
  "code_file": "出错文件路径",
  "error_message": "错误信息",
  "stack_trace": ["堆栈跟踪"],
  "test_cases": ["相关测试用例"],
  "environment": {
    "python_version": "3.9.0",
    "os": "macOS"
  }
}
```

## 🧪 运行测试

```bash
# 运行演示bug
python demo/buggy.py

# 运行测试用例
python demo/test_cases.py

# 测试API服务
curl http://localhost:8000/health
```

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- 感谢所有贡献者的努力
- 灵感来源于现代软件工程最佳实践
- 特别感谢开源社区的支持

---

**让调试不再是黑魔法，而是可验证的科学过程！** 🚀
