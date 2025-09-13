from backend.services.claude_client import claude_prompt
import json

async def handle_step5(code: str, hypothesis: str, instrument: str, fix_patch: str, choice: str | None = None) -> str:
    
    if choice == "1":  # 需要跑回归测试用例
        return await run_step5(code, hypothesis, instrument, fix_patch)
    elif choice == "2": # 不需要跑回归测试用例，直接进入 Step6
        return "不需要跑回归测试用例，直接进入 Step6"
    else:
        return "无效的选项，请输入 1 或 2"
    
async def run_step5(code: str, hypothesis: str, instrument: str, fix_patch: str) -> str:
    prompt = build_step5_prompt(code, hypothesis, instrument, fix_patch)
    resp = await claude_prompt(prompt)
    print("claude_resp5:", resp)
    resp = json.loads(resp)
    print("resp_dict5:", resp)
    return resp

def build_step5_prompt(code: str, hypothesis: str, instrument: str, fix_patch: str) -> str:
    return f"""
你是一个调试助手。
用户的代码如下：
{code}
这个是 Step 2的结果, 给出了假设成因:{hypothesis}
这个是 Step 3的结果, 给出了插桩计划:{instrument}
这个是 Step 4的结果, 给出了插桩计划:{fix_patch}

基于上述结果, 生成Step 5 回归测试，严格按照以下 JSON 格式输出：
{{
  "step": "Step 5/6",
  "regression_results": {{
      "case_001": "✅",
      "case_002": "✅",
      "case_003": "✅",
      "case_004": "✅",
      "fuzz_10x": "✅"
  }},
  "question": "是否确认进入最后一步?",
  "options": {{"1": "确认", "2": "否"}}
}}
"""
