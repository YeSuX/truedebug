from backend.services.claude_client import claude_prompt
import json

async def handle_step4(code: str, hypothesis: str, instrument: str, choice: str | None = None) -> str:
    
    if choice == "1":  # 全部采纳
        return await run_step4(code, hypothesis, instrument)
    elif choice == "2":
        # todo: 这个情况比较复杂，暂时先不开发
        return ""
    else:
        return "无效的选项，请输入 1 或 2"
    
async def run_step4(code: str, hypothesis: str, instrument: str) -> str:
    prompt = build_step4_prompt(code, hypothesis, instrument)
    resp = await claude_prompt(prompt)
    print("claude_resp4:", resp)
    resp = json.loads(resp)
    print("resp_dict4:", resp)
    return resp

def build_step4_prompt(code: str, hypothesis: str, instrument: str) -> str:
    return f"""
你是一个调试助手。
用户的代码如下：
{code}
这个是 Step 2的结果, 给出了假设成因:{hypothesis}
这个是 Step 3的结果, 给出了插桩计划:{instrument}

基于上述结果，请生成 Step 4 输出，严格遵循下面的 JSON 格式：
{{
  "step": "Step 4/6",
  "patch": "--- buggy.py\\n+++ fixed.py\\n<补丁内容示例>",
  "impact_scope": [
      "涉及测试用例: test_case_001, test_case_003",
      "影响函数: func_a, func_b"
  ],
  "question": "是否应用此补丁？",
  "options": {{"1": "确认", "2": "回退"}}
}}
"""