from backend.services.claude_client import claude_prompt
from backend.steps.step_three import run_step3
import re
import json

async def handle_step2(code: str, step1_output: str | None = None , hypothesis: str | None = None) -> str:
    """
    Step 2 控制逻辑：
    - 如果没有 hypothesis → 返回候选假设，等前端选择
    - 如果有 hypothesis → 自动进入 Step 3
    """
    if hypothesis is None:
        return await run_step2(code, step1_output)

    if hypothesis in ["a", "b", "c"]:
        prompt = build_step2_prompt(code, step1_output)
        response =  claude_prompt(prompt)
        hypothesis = extract_hypothesis(response, hypothesis)
        return await run_step3(code, step1_output, hypothesis)
    else:
        return "无效的选项，请重新输入"
    
async def run_step2(code: str, step1_output: str | None = None ,hypothesis: str | None = None) -> str:
    prompt = build_step2_prompt(code, step1_output)
    return await claude_prompt(prompt)

def build_step2_prompt(code: str, step1_output: str | None = None) -> str:
    return f"""
你是一个调试助手。
用户提供了一段有错误的代码：{code}
这个是 Step 1的结果, 给出了最小化可复现用例 (MRE):{step1_output}
请生成 Step 2 调试输出，严格遵循下面的格式：

[Step 2/6] 假设成因 (候选根因)
候选假设:
  (a) 循环边界错误: i <= len(list)  → i < len(list) ?
     证据: 日志片段 line 42, 触发 IndexError
  (b) 空输入列表未处理
     证据: 单元测试 case_003, 输入 []
  (c) 并发条件下共享状态污染
     证据: 覆盖率报告, 出错路径涉及全局变量 X
     .....
>> 请选择可信假设 [a/b/c...]:
"""

def extract_hypothesis(claude_response: str, choice: str) -> str:
    """
    从 Claude 返回的 Step2 字符串中提取用户选择的假设信息。
    
    参数:
      claude_response: Claude 返回的完整 Step2 输出字符串
      choice: 用户选择的假设编号，"a"/"b"/"c"
    
    返回:
      JSON 字符串，包含 selected_hypothesis, description, evidence
    """
    # 正则匹配每个假设段落
    # 匹配格式: (a) 描述 ... 证据: ...
    pattern = re.compile(r"\((a|b|c)\)\s*(.*?)\n\s*证据:\s*(.*?)(?=\n\(|$)", re.S)
    matches = pattern.findall(claude_response)

    for code, desc, evidence in matches:
        if code == choice:
            result = {
                "selected_hypothesis": code,
                "description": desc.strip(),
                "evidence": evidence.strip()
            }
            return json.dumps(result, ensure_ascii=False, indent=2)
    
    # 如果没匹配到，返回错误信息
    return json.dumps({"error": f"未找到假设 {choice}"}, ensure_ascii=False, indent=2)