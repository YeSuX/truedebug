from backend.services.claude_client import claude_prompt
from backend.steps.step_two import run_step2,handle_step2
import json

async def run_step1(code: str) -> str:
    """
    Step 1: 调用 Claude，返回调试结果
    """
    prompt = build_step1_prompt(code)
    resp = await claude_prompt(prompt)
    print("claude_resp:", resp)
    resp = json.loads(resp)
    print("resp_dict:", resp)
    return resp

# def build_step1_prompt(code: str) -> str:
#     """
#     构造 Step 1 的 Prompt
#     """
#     return f"""
# 你是一个调试助手。
# 用户提供了一段有错误的代码：{code}

# 请生成 Step 1 调试输出，严格遵循下面的 JSON 格式：
# {{
#   "step": "Step 1/6",
#   "mre_file": "test_mre.py",
#   "run_result": "程序崩溃 (IndexError: list index out of range)",
#   "question": "确认此用例是否能复现问题?",
#   "options": {{"1": "确认", "2": "回退"}}
# }}
# """

def build_step1_prompt(code: str) -> str:
    """
    构造 Step 1 的 Prompt
    """
    return f"""
你是一个调试助手。
用户提供了一段可能有错误的代码：{code}

你的任务：
1. 尝试运行（或模拟运行）这段代码，并推理它的运行结果。
2.如果代码能正常运行，描述主要输出。
3.如果代码会报错，请写出崩溃原因和报错信息（包括异常类型）。

最终严格输出 JSON,不要包含额外解释,输出 JSON 的格式如下（保持键值不变，只替换 run_result 的内容）：
{{
  "step": "Step 1/6",
  "mre_file": "test_mre.py",
  "run_result": "程序崩溃 (IndexError: list index out of range)",
  "question": "确认此用例是否能复现问题?",
  "options": {{"1": "确认", "2": "回退"}}
}}
"""

async def handle_step1(code: str, choice: str | None = None) -> str:
    """
    根据用户选择控制流程
    """
    if choice is None:
        # 第一次进入 Step1
        step1_result = await run_step1(code)
        return step1_result

    # if choice == "1":
    #     # 确认 → 自动进入 Step2
    #     # 先生成 Step1 的 MRE / 输出
    #     step1_result = await run_step1(code)
    #     # 把 Step1 输出传给 Step2
    #     return await handle_step2(code, step1_result)  # 这里先默认返回 Step2 的候选假设
    # elif choice == "2":
    #     # 不能复现 → 重新跑 Step1，并加解释
    #     explanation = "⚠️ 代码在本地未能复现问题，可能输入条件或环境不同。请调整 MRE 后重试。"
    #     result = await run_step1(code)
    #     return explanation + "\n\n" + result
    # else:
    #     return "无效的选项，请输入 1 / 2"