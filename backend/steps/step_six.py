# from services.claude_client import claude_prompt

# async def handle_step6(code: str, hypothesis: str, choice: str | None = None) -> str:
    
#     return await run_step6(code, hypothesis)
    
# async def run_step6(code: str, hypothesis: str) -> str:
#     prompt = build_step6_prompt(code, hypothesis)
#     return await claude_prompt(prompt)

# def build_step6_prompt(code: str, hypothesis: str) -> str:
#     return f"""

#         生成 Claude 提示词，汇总前面步骤的调试过程

# [Step 6/7] 调试纪要 (知识沉淀)

# 原始代码:
# {code}

# 可信假设:
# {hypothesis}

# 补丁:
# {patch}

# 回归测试结果:
# {test_results}

# 请你生成一份调试纪要，格式如下:
# - 问题: (错误原因)
# - 证据: (关键信息)
# - 决策: (选择的假设 & 验证情况)
# - 补丁: (最终修改)
# - 回归结果: (是否全部通过)
# - 保存路径: debug_report_{{date}}.md

# 最后输出一句 🎉 调试完成！

# """
