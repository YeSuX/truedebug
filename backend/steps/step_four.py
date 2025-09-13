# from services.claude_client import claude_prompt
# from step_five import run_step5
# from step_three import run_step3

# async def handle_step4(code: str, hypothesis: str, choice: str | None = None) -> str:
#     """
#     Step 4 控制逻辑：
#     - 如果没有 choice → 返回插桩计划
#     - 如果 choice=1 → 全部采纳 → 自动进入 Step 4
#     - 如果 choice=2 → 自定义组合 → 自动进入 Step 4（带注释说明）
#     """
#     if choice is None:
#         return await run_step4(code, hypothesis)
#     if choice == "1":  # 确认
#         return await run_step5(code, "all")
#     elif choice == "2":
#         return await run_step3(code, "未应用补丁，回退 Step3")
#     else:
#         return "无效的选项，请输入 1 或 2"
    
# async def run_step4(code: str, hypothesis: str) -> str:
#     prompt = build_step4_prompt(code, hypothesis)
#     return await claude_prompt(prompt)

# def build_step4_prompt(code: str, hypothesis: str) -> str:
#     return f"""
# 你是一个调试助手。
# 用户的代码如下：
# {code}
# Step 4 生成最小补丁 (diff 视图)
# 基于以下可信假设:
# {hypothesis}
# 请你生成:
# 1. 最小补丁 (diff 格式，注意标明 --- buggy.py +++ fixed.py)
# 2. 补丁的影响范围（涉及哪些测试用例、下游函数）

# 最后附上交互提示:
# >> 是否应用此补丁?  
# [1] 确认  
# [2] 否 → 回退 Step3
# """