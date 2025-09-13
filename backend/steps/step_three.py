from backend.services.claude_client import claude_prompt
import json
# from step_four import run_step4

async def handle_step3(code: str, hypothesis: str, choice: str | None = None) -> str:
    return await run_step3(code, hypothesis)

    # if choice == "1":
    #     return await run_step4(code, "all")
    # elif choice == "2":
    #     return await run_step4(code, "partial")
    # else:
    #     return "无效的选项，请输入 1 或 2"
    
async def run_step3(code: str, hypothesis: str) -> str:
    prompt = build_step3_prompt(code, hypothesis)
    resp = await claude_prompt(prompt)
    print("claude_resp_3:", resp)
    resp = json.loads(resp)
    print("resp_dict_3:", resp)
    return resp

def build_step3_prompt(code: str, hypothesis: str) -> str:
    return f"""
你是一个调试助手。
用户的代码如下：
{code}
Step 2 用户选择的假设是: {hypothesis}

请生成 Step 3 调试输出，严格遵循下面 JSON 格式：
{{
  "step": "Step 3/6",
  "hypothesis": "{hypothesis}",
  "instrumentation_plan": [
    "在 loop 入口打印 i, len(list)",
    "在 case_003 输入时打印 list 长度",
    "在全局变量 X 写入时加断言"
  ],
  "question": "是否采纳这些插桩？",
  "options": {{"1": "全部采纳", "2": "自定义组合上述插桩"}}
}}
"""