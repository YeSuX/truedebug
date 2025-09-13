# backend/services/claude_client.py
import os
import json
import asyncio
from openai import AsyncOpenAI

# ==== 配置 ====
API_KEY = os.getenv("OPENAI_API_KEY", "sk-ai-v1-bf85085ef129d72264c1fb94c07cda86046eb505e9d42ddda34be83b54bdf654")  # 可直接写死测试
API_BASE = os.getenv("OPENAI_API_BASE", "https://zenmux.ai/api/v1")
GPT_MODEL = "openai/gpt-5"

client = AsyncOpenAI(api_key=API_KEY, base_url=API_BASE)


# async def claude_prompt(prompt: str, max_tokens: int = 500, temperature: float = 0) -> str:
#     """
#     调用 Claude (gpt-4o) 接口获取文本结果
#     返回字符串
#     """
#     try:
#         completion = await client.chat.completions.create(
#             model=GPT_MODEL,
#             messages=[{"role": "user", "content": prompt}],
#             max_tokens=max_tokens,
#             temperature=temperature,
#             timeout=30,
#             n=1,
#             stream=False,
#             response_format={"type": "text"}  # 返回普通字符串
#         )
#         print("3")
#         return completion.choices[0].message.content
#     except Exception as e:
#         return f"请求 Claude 接口失败: {e}"
# backend/services/claude_client.py
import os
import json
import asyncio
from openai import OpenAI

# ==== 配置 ====
API_KEY = os.getenv("OPENAI_API_KEY", "sk-ai-v1-bf85085ef129d72264c1fb94c07cda86046eb505e9d42ddda34be83b54bdf654")  # 可写死测试
API_BASE = os.getenv("OPENAI_API_BASE", "https://zenmux.ai/api/v1")
GPT_MODEL = "openai/gpt-5"  # 使用你当前的模型

client = OpenAI(api_key=API_KEY, base_url=API_BASE)

async def claude_prompt(prompt: str) -> str:
    completion = client.chat.completions.create(
    model="openai/gpt-5", 
    messages=[
        {
            "role": "user",
            "content": prompt
        }
    ]
    )
    return completion.choices[0].message.content
