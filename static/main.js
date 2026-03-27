let currentFileId = null;
let isUploading = false;
let dragCounter = 0;

function getExportButton() {
  return document.getElementById("exportBtn");
}

function hideExportButton() {
  const exportBtn = getExportButton();
  if (exportBtn) {
    exportBtn.style.display = "none";
    exportBtn.onclick = null;
  }
}

function showExportButton(fileId) {
  const exportBtn = getExportButton();
  if (exportBtn) {
    exportBtn.style.display = "block";
    exportBtn.onclick = () => {
      window.location.href = `/export/${fileId}`;
    };
  }
}

function getDropZone() {
  return document.getElementById("dropZone");
}

function getFileMetaElements() {
  return {
    fileMeta: document.getElementById("fileMeta"),
    fileName: document.getElementById("fileName"),
    fileSize: document.getElementById("fileSize")
  };
}

function formatFileSize(size) {
  if (!Number.isFinite(size) || size < 0) {
    return "";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function updateSelectedFileMeta(file) {
  const { fileMeta, fileName, fileSize } = getFileMetaElements();

  if (!file || !fileMeta || !fileName || !fileSize) {
    return;
  }

  fileName.textContent = file.name || "未命名文件";
  fileSize.textContent = `大小：${formatFileSize(file.size || 0)}`;
  fileMeta.style.display = "block";
}

function clearSelectedFileMeta() {
  const { fileMeta, fileName, fileSize } = getFileMetaElements();

  if (fileMeta) {
    fileMeta.style.display = "none";
  }
  if (fileName) {
    fileName.textContent = "";
  }
  if (fileSize) {
    fileSize.textContent = "";
  }
}

function setDropZoneDragState(active) {
  const dropZone = getDropZone();
  if (dropZone) {
    dropZone.classList.toggle("is-dragover", active);
  }
}

function isAllowedAudioFile(file) {
  if (!file || !file.name) {
    return false;
  }

  const allowedExtensions = [".mp3", ".wav", ".m4a", ".mp4"];
  const lowerName = file.name.toLowerCase();
  return allowedExtensions.some((ext) => lowerName.endsWith(ext));
}

function bindFileInputEnhancements() {
  const fileInput = document.getElementById("audioFile");
  const dropZone = getDropZone();

  if (!fileInput || !dropZone) {
    return;
  }

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) {
      updateSelectedFileMeta(file);
    } else {
      clearSelectedFileMeta();
    }
  });

  dropZone.addEventListener("dragenter", (event) => {
    event.preventDefault();
    dragCounter += 1;
    setDropZoneDragState(true);
  });

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    setDropZoneDragState(true);
  });

  dropZone.addEventListener("dragleave", (event) => {
    event.preventDefault();
    dragCounter = Math.max(0, dragCounter - 1);
    if (dragCounter === 0) {
      setDropZoneDragState(false);
    }
  });

  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dragCounter = 0;
    setDropZoneDragState(false);

    const files = event.dataTransfer?.files;
    const file = files?.[0];

    if (!file) {
      return;
    }

    if (!isAllowedAudioFile(file)) {
      alert("当前仅支持 mp3、wav、m4a、mp4 格式音频");
      return;
    }

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;
    updateSelectedFileMeta(file);
  });
}

function setResultHtml(html) {
  const result = document.getElementById("result");
  if (result) {
    result.innerHTML = html;
  }
}

function scrollToResult() {
  const result = document.getElementById("result");
  if (result) {
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function setLoadingState(loading) {
  const button = document.querySelector(".primary-btn");
  const fileInput = document.getElementById("audioFile");
  const dropZone = getDropZone();

  isUploading = loading;

  if (button) {
    button.disabled = loading;
    button.textContent = loading ? "正在分析..." : "上传并分析";
  }

  if (fileInput) {
    fileInput.disabled = loading;
  }

  if (dropZone) {
    dropZone.classList.toggle("is-disabled", loading);
  }
}

function renderEmptyState(icon, title, message) {
  setResultHtml(`
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <h3>${title}</h3>
      <p>${message}</p>
    </div>
  `);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatParagraphs(text) {
  const safeText = escapeHtml(text);
  return safeText.replace(/\n/g, "<br>");
}

function normalizeKeyWords(keyWords) {
  return Array.isArray(keyWords) ? keyWords : [];
}

function renderAnalysisResult(data) {
  const transcription = formatParagraphs(data.transcription || "");
  const translation = formatParagraphs(data.analysis?.translation_zh || "");
  const sentenceExplanations = Array.isArray(data.analysis?.sentence_explanations)
    ? data.analysis.sentence_explanations
    : [];
  const grammarNotes = Array.isArray(data.analysis?.grammar_notes)
    ? data.analysis.grammar_notes
    : [];
  const keyWords = normalizeKeyWords(data.analysis?.key_words);

  const sentenceHtml = sentenceExplanations.length
    ? `
      <h2>逐句解释</h2>
      ${sentenceExplanations
        .map(
          (item) => `
            <div class="analysis-block">
              <p><strong>原句：</strong>${formatParagraphs(item?.sentence || "")}</p>
              <p><strong>解释：</strong>${formatParagraphs(item?.explanation_zh || "")}</p>
            </div>
          `
        )
        .join("")}
    `
    : "";

  const grammarHtml = grammarNotes.length
    ? `
      <h2>语法点</h2>
      <div class="analysis-block">
        ${grammarNotes
          .map((note) => `<p>• ${formatParagraphs(note)}</p>`)
          .join("")}
      </div>
    `
    : "";

  const keyWordsHtml = keyWords.length
    ? `
      <h2>重点词汇</h2>
      ${keyWords
        .map(
          (item) => `
            <div class="analysis-block">
              <p><strong>单词：</strong>${formatParagraphs(item?.word || "")}</p>
              <p><strong>中文：</strong>${formatParagraphs(item?.meaning_zh || "")}</p>
              <p><strong>词性：</strong>${formatParagraphs(item?.pos || "未标注")}</p>
              <p><strong>例句：</strong>${formatParagraphs(item?.example || "未提供")}</p>
            </div>
          `
        )
        .join("")}
    `
    : "";

  setResultHtml(`
    <h2>葡语转写</h2>
    <p>${transcription}</p>
    <h2>中文翻译</h2>
    <p>${translation}</p>
    ${sentenceHtml}
    ${keyWordsHtml}
    ${grammarHtml}
  `);
  scrollToResult();
}

async function parseResponseSafely(resp) {
  const contentType = resp.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return await resp.json();
  }

  const text = await resp.text();
  return { error: text || "服务器返回了无法识别的响应" };
}

document.addEventListener("DOMContentLoaded", () => {
  bindFileInputEnhancements();
  clearSelectedFileMeta();
});

async function uploadAudio() {
  if (isUploading) {
    return;
  }

  const fileInput = document.getElementById("audioFile");
  const file = fileInput?.files?.[0];
  hideExportButton();

  if (!file) {
    alert("请先选择文件");
    return;
  }

  if (!isAllowedAudioFile(file)) {
    alert("当前仅支持 mp3、wav、m4a、mp4 格式音频");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  setLoadingState(true);
  renderEmptyState("⏳", "处理中", "音频正在上传、转写与分析，请稍候...");
  scrollToResult();

  try {
    const resp = await fetch("/upload", {
      method: "POST",
      body: formData
    });

    const data = await parseResponseSafely(resp);
    console.log("upload response:", data);

    if (!resp.ok) {
      renderEmptyState("⚠️", "出错了", escapeHtml(data.error || "未知错误"));
      return;
    }

    currentFileId = data.file_id;
    renderAnalysisResult(data);
    showExportButton(currentFileId);
  } catch (err) {
    console.error(err);
    renderEmptyState("❌", "请求失败", escapeHtml(err?.message || String(err)));
  } finally {
    setLoadingState(false);
  }
}