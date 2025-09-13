from backend.services.claude_client import claude_prompt
from backend.steps.step_three import run_step3
import re
import json
from typing import Optional

async def handle_step2(code: str, step1_output: Optional[str] = None , hypothesis: Optional[str] = None) -> str:
    
    # if hypothesis is None:
    #     return await run_step2(code, step1_output)

    # if hypothesis in ["a", "b", "c"]:
    #     resp_hypo = await run_step2(code, step1_output)
    #     hypothesis = extract_hypothesis(resp_hypo, hypothesis)
    #     return await run_step3(code, step1_output, hypothesis)
    # else:
    #     return "无效的选项，请重新输入"
    if hypothesis == "1":
        resp_hypo = await run_step2(code, step1_output, hypothesis)
        return resp_hypo
    else:
        return "输入否，重新请求step1"
    
async def run_step2(code: str, step1_output: str | None = None , hypothesis: str | None = None) -> str:
    prompt = build_step2_prompt(code, step1_output)
    resp = await claude_prompt(prompt)
    print("claude_resp2:", resp)
    resp = json.loads(resp)
    print("resp_dict2:", resp)
    return resp

# def build_step2_prompt(code: str, step1_output: str | None = None) -> str:
#     return f"""
# 你是一个调试助手。
# 用户提供了一段有错误的代码：{code}
# 这个是 Step 1的结果, 给出了最小化可复现用例 (MRE):{step1_output}
# 请生成 Step 2 调试输出，严格遵循下面的格式：

# 请生成 Step 2 调试输出，严格遵循下面的 JSON 格式：
# {{
#   "step": "Step 2/6",
#   "hypotheses": [
#     {{
#       "id": "a",
#       "title": "循环边界错误: i <= len(list) → i < len(list) ?",
#       "evidence": "日志片段 line 42, 触发 IndexError"
#     }},
#     {{
#       "id": "b",
#       "title": "空输入列表未处理",
#       "evidence": "单元测试 case_003, 输入 []"
#     }},
#     {{
#       "id": "c",
#       "title": "并发条件下共享状态污染",
#       "evidence": "覆盖率报告, 出错路径涉及全局变量 X"
#     }}
#   ],
#   "question": "请选择可信假设，返回对应 id"
# }}
# """

def build_step2_prompt(code: str, step1_output: str | None = None) -> str:
    return f"""
你是一个调试助手。
用户提供了一段有错误的代码：{code}
这是 Step 1 的结果，给出了最小化可复现用例 (MRE): {step1_output}

你的任务：
1.基于代码和 Step 1 的运行结果，推理可能的 bug 假设 (hypotheses)。
2.每个假设包含 id、title(简短标题)、evidence(证据来源）。
3.至少生成 2 个不同的假设。

最终必须输出 JSON, 保持固定结构, 不要包含额外解释。

输出 JSON 的格式如下（保持键不变，只替换内容）：
{{
  "step": "Step 2/6",
  "hypotheses": [
    {{
      "id": "a",
      "title": "循环边界错误: i <= len(list) → i < len(list) ?",
      "evidence": "日志片段 line 42, 触发 IndexError"
    }},
    {{
      "id": "b",
      "title": "空输入列表未处理",
      "evidence": "单元测试 case_003, 输入 []"
    }},
    {{
      "id": "c",
      "title": "并发条件下共享状态污染",
      "evidence": "覆盖率报告, 出错路径涉及全局变量 X"
    }}
  ],
  "question": "请选择可信假设，返回对应 id"
}}
"""

def extract_hypothesis(step2_resp: dict, hypothesis_id: str) -> dict | None:
    """
    从 Step 2 输出中提取指定假设的信息

    参数:
        step2_resp: dict, Step 2 JSON 结构
        hypothesis_id: str, 用户选择的 id，例如 "a"/"b"/"c"

    返回:
        dict, 包含 title 和 evidence，示例:
        {
            "id": "a",
            "title": "...",
            "evidence": "..."
        }
        如果没有找到，返回 None
    """
    if not step2_resp or "hypotheses" not in step2_resp:
        return None

    for h in step2_resp["hypotheses"]:
        if h.get("id") == hypothesis_id:
            return h

    return None