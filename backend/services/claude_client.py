# backend/services/claude_client.py
import os
import json
import asyncio
from openai import AsyncOpenAI

# ==== 配置 ====
API_KEY = os.getenv("OPENAI_API_KEY", "nb-xxxxxx-your-key")  # 可直接写死测试
API_BASE = os.getenv("OPENAI_API_BASE", "http://cooper.k8s.nb-prod.com/v1")
GPT_MODEL = "gpt-4o-2024-08-06"

client = AsyncOpenAI(api_key=API_KEY, base_url=API_BASE)


async def claude_prompt(prompt: str, max_tokens: int = 500, temperature: float = 0) -> str:
    """
    调用 Claude (gpt-4o) 接口获取文本结果
    返回字符串
    """
    try:
        completion = await client.chat.completions.create(
            model=GPT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=temperature,
            timeout=30,
            n=1,
            stream=False,
            response_format={"type": "text"}  # 返回普通字符串
        )
        return completion.choices[0].message.content
    except Exception as e:
        return f"请求 Claude 接口失败: {e}"


async def gpt4_prompt(messages, max_tokens=500, temperature=0.7, is_json=False) -> str | dict:
    """
    通用接口，支持 messages 列表、返回字符串或 JSON
    messages: str 或 [{"role":"user","content":"xxx"},...]
    is_json: True 则返回 dict，否则返回 str
    """
    if isinstance(messages, str):
        messages = [{"role": "user", "content": messages}]
    
    try:
        completion = await client.chat.completions.create(
            model=GPT_MODEL,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            timeout=30,
            n=1,
            stream=False,
            response_format={"type": "json_object" if is_json else "text"}
        )
        output = completion.choices[0].message.content

        if is_json:
            # 如果返回里有 ```json，提取纯 JSON
            if "```json" in output:
                output = output[output.find("{") : output.rfind("}") + 1]
            return json.loads(output)
        else:
            return output
    except Exception as e:
        return f"请求 Claude 接口失败: {e}"
