from backend.services.claude_client import claude_prompt
# from step_four import run_step4

async def handle_step3(code: str, hypothesis: str, choice: str | None = None) -> str:
    """
    Step 3 控制逻辑：
    - 如果没有 choice → 返回插桩计划
    - 如果 choice=1 → 全部采纳 → 自动进入 Step 4
    - 如果 choice=2 → 自定义组合 → 自动进入 Step 4（带注释说明）
    """
    if choice is None:
        return await run_step3(code, hypothesis)

    # if choice == "1":
    #     return await run_step4(code, "all")
    # elif choice == "2":
    #     return await run_step4(code, "partial")
    # else:
    #     return "无效的选项，请输入 1 或 2"
    
async def run_step3(code: str, hypothesis: str) -> str:
    prompt = build_step3_prompt(code, hypothesis)
    return await claude_prompt(prompt)

def build_step3_prompt(code: str, hypothesis: str) -> str:
    return f"""
你是一个调试助手。
用户的代码如下：
{code}
Step 2 用户选择的假设是: {hypothesis}

请生成 Step 3 调试输出，严格遵循下面的格式：

[Step 3/7] 插桩计划 (最小侵入)
建议插桩:
  1. 在 loop 入口打印 i, len(list)
  2. 在 case_003 输入时打印 list 长度
  3. 在全局变量 X 写入时加断言
>> 是否采纳?  
[1] 全部采纳  
[2] 自定义组合上述插桩
"""