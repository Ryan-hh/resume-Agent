import { ResumeImportError } from "@/lib/resumeImport";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

// 简历导入预处理：纯前端完成，数据不出浏览器
// 策略：PDF 先抽文本（有文本层走文本模型），抽不到再逐页转图（扫描件走视觉模型）；
//       图片直接压缩转 Base64；DOCX 用 mammoth 提取文本；TXT/MD 直接读。
export const MAX_PDF_IMPORT_PAGES = 10;
export const MAX_PDF_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_PDF_REQUEST_BYTES = 16 * 1024 * 1024;
export const MAX_TEXT_FILE_BYTES = 5 * 1024 * 1024;
export const PDF_IMAGE_QUALITY = 0.82;
export const PDF_MAX_IMAGE_WIDTH = 1600;
export const PDF_MAX_IMAGE_HEIGHT = 3000;
export const IMAGE_MAX_EDGE = 1600;
export const IMAGE_QUALITY = 0.85;
// 每页文本量低于该值视为扫描件（无文本层），转图处理
export const TEXT_MIN_CHARS_PER_PAGE = 50;

export type PreparedPdf =
  | { kind: "text"; text: string }
  | { kind: "images"; images: string[] };

function renderPageToImage(
  page: import("pdfjs-dist").PDFPageProxy
): Promise<string> {
  const base = page.getViewport({ scale: 2 });
  const scale = Math.min(
    1,
    PDF_MAX_IMAGE_WIDTH / base.width,
    PDF_MAX_IMAGE_HEIGHT / base.height
  );
  const viewport = page.getViewport({ scale: 2 * scale });
  const canvas = document.createElement("canvas");
  return new Promise((resolve, reject) => {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      reject(new ResumeImportError("invalidPdf"));
      return;
    }
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    page
      .render({ canvas, canvasContext: context, viewport })
      .promise.then(() => {
        const image = canvas.toDataURL("image/jpeg", PDF_IMAGE_QUALITY);
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
        resolve(image);
      })
      .catch((error: unknown) => {
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
        reject(error);
      });
  });
}

async function loadPdf(file: File) {
  if (file.size > MAX_PDF_FILE_BYTES) throw new ResumeImportError("fileTooLarge");
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  });
  // 密码保护的文件直接失败，不等待不存在的密码输入框
  loadingTask.onPassword = () => {
    void loadingTask.destroy();
  };
  try {
    const pdf = await loadingTask.promise;
    if (pdf.numPages > MAX_PDF_IMPORT_PAGES) {
      throw new ResumeImportError("tooManyPages");
    }
    return { pdfjs, pdf };
  } catch (error) {
    await loadingTask.destroy();
    throw error;
  }
}

// PDF 预处理：先抽文本；文本量达标（有文本层）走文本，否则逐页转图
export async function preparePdf(file: File): Promise<PreparedPdf> {
  const { pdf } = await loadPdf(file);
  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      pages.push(text);
      page.cleanup();
    }
    const totalChars = pages.reduce((sum, text) => sum + text.length, 0);
    const avgPerPage = totalChars / pdf.numPages;
    if (avgPerPage >= TEXT_MIN_CHARS_PER_PAGE) {
      const text = pages
        .map((pageText, index) => `--- 第 ${index + 1} 页 ---\n${pageText}`)
        .join("\n\n")
        .trim();
      return { kind: "text", text };
    }
    // 扫描件：逐页转图，交给视觉模型
    const images: string[] = [];
    let imageBytes = 0;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const image = await renderPageToImage(page);
      imageBytes += image.length;
      if (imageBytes > MAX_PDF_REQUEST_BYTES) {
        throw new ResumeImportError("requestTooLarge");
      }
      images.push(image);
    }
    return { kind: "images", images };
  } finally {
    await pdf.destroy?.().catch?.(() => {});
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new ResumeImportError("invalidImage"));
    img.src = url;
  });
}

// 图片压缩为 data URL：限最长边、JPEG 0.85（PNG 保留透明底转白底）
export async function compressImageFile(file: File): Promise<string> {
  if (file.size > MAX_PDF_FILE_BYTES) throw new ResumeImportError("fileTooLarge");
  const isPng = file.type === "image/png";
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(
      1,
      IMAGE_MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight)
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new ResumeImportError("invalidImage");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(
      isPng ? "image/png" : "image/jpeg",
      isPng ? 1 : IMAGE_QUALITY
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// Word(.docx) 提取纯文本：mammoth 纯前端解析（Vite 自动应用 browser 映射）
export async function extractTextFromDocx(file: File): Promise<string> {
  if (file.size > MAX_PDF_FILE_BYTES) throw new ResumeImportError("fileTooLarge");
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({
    arrayBuffer: await file.arrayBuffer(),
  });
  const text = String(result.value ?? "").trim();
  if (!text) throw new ResumeImportError("emptyText");
  return text;
}

// 纯文本文件（TXT / MD / 任意 JSON）直接读
export async function readTextFile(file: File): Promise<string> {
  if (file.size > MAX_TEXT_FILE_BYTES) throw new ResumeImportError("fileTooLarge");
  return await file.text();
}
