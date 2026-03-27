import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    base_url=os.getenv("QWEN_BASE_URL")
)

def analyze_portuguese_text(pt_text: str) -> dict:
    prompt = f"""
请以 JSON 格式输出，并严格返回以下字段：
{{
  "translation_zh": "中文翻译",
  "sentence_explanations": [
    {{"sentence": "葡语原句", "explanation_zh": "中文解释"}}
  ],
  "key_words": [
    {{"word": "单词", "meaning_zh": "中文意思", "pos": "词性", "example": "葡语例句"}}
  ],
  "grammar_notes": [
    "语法点1",
    "语法点2"
  ]
}}

任务：
你是一名面向中文学习者的葡萄牙语学习助手。
请对下面的葡萄牙语内容做详细学习型分析。

葡语文本：
{pt_text}
"""

    resp = client.chat.completions.create(
        model=os.getenv("QWEN_MODEL"),
        messages=[
            {"role": "system", "content": "你是专业的葡萄牙语学习分析助手。"},
            {"role": "user", "content": prompt}
        ],
        temperature=0.2
    )

    content = resp.choices[0].message.content

    try:
        return json.loads(content)
    except Exception:
        return {
            "translation_zh": content,
            "sentence_explanations": [],
            "key_words": [],
            "grammar_notes": []
        }