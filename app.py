import os
import uuid
from fastapi import FastAPI, UploadFile, File, Request
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from services.cos_service import upload_to_cos, get_presigned_url
from services.asr_service import transcribe_audio_by_dashscope
from services.qwen_service import analyze_portuguese_text
from services.doc_service import export_to_word

app = FastAPI()

os.makedirs("uploads", exist_ok=True)
os.makedirs("outputs", exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

RESULTS = {}

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/upload")
async def upload_audio(file: UploadFile = File(...)):
    try:
        if not file.filename:
            return JSONResponse({"error": "未检测到文件名"}, status_code=400)

        allowed_exts = {".mp3", ".wav", ".m4a", ".mp4"}
        ext = os.path.splitext(file.filename)[1].lower()

        if not ext:
            return JSONResponse({"error": "文件缺少扩展名"}, status_code=400)

        if ext not in allowed_exts:
            return JSONResponse({"error": f"不支持的文件类型: {ext}"}, status_code=400)

        file_id = str(uuid.uuid4())
        local_path = f"uploads/{file_id}{ext}"

        with open(local_path, "wb") as f:
            f.write(await file.read())

        object_key = f"audio/{file_id}{ext}"

        upload_to_cos(local_path, object_key)
        signed_url = get_presigned_url(object_key, expired=3600)

        transcription = transcribe_audio_by_dashscope(signed_url, language_hint="pt")
        analysis = analyze_portuguese_text(transcription)

        RESULTS[file_id] = {
            "transcription": transcription,
            "analysis": analysis,
            "object_key": object_key,
            "signed_url": signed_url
        }

        return JSONResponse({
            "message": "上传并分析成功",
            "file_id": file_id,
            "transcription": transcription,
            "analysis": analysis
        })

    except Exception as e:
        return JSONResponse({
            "error": str(e)
        }, status_code=500)

@app.get("/export/{file_id}")
async def export_doc(file_id: str):
    data = RESULTS.get(file_id)
    if not data:
        return JSONResponse({"error": "结果不存在"}, status_code=404)

    output_path = f"outputs/{file_id}.docx"
    export_to_word(data["transcription"], data["analysis"], output_path)

    return FileResponse(
        path=output_path,
        filename="portuguese_learning_result.docx",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )