import os
import requests
import dashscope
from dashscope.audio.asr import Transcription
from dotenv import load_dotenv

load_dotenv()

dashscope.api_key = os.getenv("DASHSCOPE_API_KEY")
dashscope.base_http_api_url = "https://dashscope.aliyuncs.com/api/v1"


def transcribe_audio_by_dashscope(file_url: str, language_hint: str = "pt") -> str:
    if not dashscope.api_key:
        raise ValueError("DASHSCOPE_API_KEY 未配置，请检查 .env 文件")

    if not file_url:
        raise ValueError("file_url 不能为空")

    task_response = Transcription.async_call(
        model="fun-asr-mtl",
        file_urls=[file_url],
        language_hints=[language_hint]
    )

    if not hasattr(task_response, "output") or not hasattr(task_response.output, "task_id"):
        raise RuntimeError(f"ASR 任务创建失败: {task_response}")

    task_id = task_response.output.task_id
    result = Transcription.wait(task=task_id)

    if not hasattr(result, "output"):
        raise RuntimeError(f"ASR 返回结果异常: {result}")

    texts = []

    results = getattr(result.output, "results", None)
    if not results:
        raise RuntimeError(f"ASR 未返回有效 results: {result}")

    for item in results:
        transcription_url = None

        if isinstance(item, dict):
            transcription_url = item.get("transcription_url")
        else:
            transcription_url = getattr(item, "transcription_url", None)

        if transcription_url:
            resp = requests.get(transcription_url, timeout=60)
            resp.raise_for_status()
            data = resp.json()

            for seg in data.get("transcripts", []):
                text = seg.get("text", "").strip()
                if text:
                    texts.append(text)

    final_text = " ".join(texts).strip()

    if not final_text:
        raise RuntimeError("ASR 转写完成，但没有提取到任何文本")

    return final_text