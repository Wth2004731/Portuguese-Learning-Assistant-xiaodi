let currentFileId = null;

async function uploadAudio() {
  const fileInput = document.getElementById("audioFile");
  const file = fileInput.files[0];
  if (!file) {
    alert("请先选择文件");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  document.getElementById("result").innerHTML = "<p>处理中，请稍候...</p>";

  try {
    const resp = await fetch("/upload", {
      method: "POST",
      body: formData
    });

    const data = await resp.json();
    console.log("upload response:", data);

    if (!resp.ok) {
      document.getElementById("result").innerHTML = `<p>出错了：${data.error || "未知错误"}</p>`;
      return;
    }

    currentFileId = data.file_id;

    document.getElementById("result").innerHTML = `
      <h2>葡语转写</h2>
      <p>${data.transcription || ""}</p>
      <h2>中文翻译</h2>
      <p>${data.analysis?.translation_zh || ""}</p>
    `;

    const exportBtn = document.getElementById("exportBtn");
    exportBtn.style.display = "inline-block";
    exportBtn.onclick = () => {
      window.location.href = `/export/${currentFileId}`;
    };

  } catch (err) {
    console.error(err);
    document.getElementById("result").innerHTML = `<p>请求失败：${err}</p>`;
  }
}