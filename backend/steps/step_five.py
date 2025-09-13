# from services.claude_client import claude_prompt
# from step_four import run_step4
# from step_six import run_step6

# async def handle_step5(code: str, hypothesis: str, choice: str | None = None) -> str:
#     """
#     Step 4 控制逻辑：
#     - 如果没有 choice → 返回插桩计划
#     - 如果 choice=1 → 全部采纳 → 自动进入 Step 4
#     - 如果 choice=2 → 自定义组合 → 自动进入 Step 4（带注释说明）
#     """
#     if choice is None:
#         return await run_step4(code, hypothesis)
#     if choice == "1":  # 确认
#         return await run_step6(code, "回归测试通过，进入 Step6")
#     elif choice == "2":
#         return await run_step4(code, "用户拒绝进入最后一步，回退 Step4")
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
# Step 5 回归测试
# 基于以下补丁:
# {hypothesis}
# 请你执行以下任务:
# 1. 生成回归测试结果（至少包含 case_001 ~ case_004, fuzz_10x）
# 2. 输出结果矩阵（例如 ✅/❌）
# 3. 附带提示:
# >> 确认进入最后一步? 确认/否
# """
