import json
from typing import Optional

def extract_hypothesis(step2_resp: dict, hypothesis_id: str) -> Optional[dict]:
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