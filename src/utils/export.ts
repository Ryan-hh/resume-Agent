// 导出工具：JSON / Markdown / 长页 PDF / 长页图片 / 分页 PDF（浏览器打印）
import { toast } from "sonner";
import { ResumeData } from "@/types/resume";
import { normalizeFontFamily } from "./fonts";
import { generateResumeMarkdown, ResumeMarkdownOptions } from "./markdown";
import { exportResumeToBrowserPrint } from "./print";

const INVALID_FILE_NAME_CHAR_REGEX = /[\\/:*?"<>|]/g;

const getSafeFileName = (title?: string) => {
  const normalized = (title || "resume")
    .trim()
    .replace(INVALID_FILE_NAME_CHAR_REGEX, "_")
    .replace(/\s+/g, " ");
  return normalized || "resume";
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
};

const downloadTextFile = (content: string, fileName: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, fileName);
};

const hidePageBreakLines = (element: HTMLElement) => {
  element.querySelectorAll<HTMLElement>(".page-break-line").forEach((line) => line.remove());
};

const waitForImages = async (element: HTMLElement) => {
  const images = Array.from(element.getElementsByTagName("img"));
  await Promise.all(
    images
      .filter((img) => !img.complete)
      .map(
        (img) =>
          new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
      )
  );
};

const optimizeImages = async (element: HTMLElement) => {
  const images = element.getElementsByTagName("img");
  const imagePromises = Array.from(images)
    .filter((img) => !img.src.startsWith("data:"))
    .map(async (img) => {
      try {
        const response = await fetch(img.src);
        const blob = await response.blob();
        return new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            img.src = reader.result as string;
            resolve();
          };
          reader.readAsDataURL(blob);
        });
      } catch {
        return Promise.resolve();
      }
    });
  await Promise.all(imagePromises);
};

export interface ExportOptions {
  elementId: string;
  title: string;
  pagePadding: number;
  fontFamily?: string;
  onStart?: () => void;
  onEnd?: () => void;
  successMessage?: string;
  errorMessage?: string;
}

const A4_WIDTH_MM = 210;
const PX_PER_MM = 96 / 25.4;
const LONG_PAGE_HEIGHT_BUFFER_MM = 2;
const LONG_PAGE_CAPTURE_BUFFER_PX = 8;

const prepareLongPageCapture = async ({
  elementId,
  pagePadding,
  fontFamily,
}: Pick<ExportOptions, "elementId" | "pagePadding" | "fontFamily">) => {
  const pdfElement = document.querySelector<HTMLElement>(`#${elementId}`);
  if (!pdfElement) throw new Error(`未找到 #${elementId}`);

  const selectedFontFamily = normalizeFontFamily(fontFamily);
  const clonedElement = pdfElement.cloneNode(true) as HTMLElement;
  hidePageBreakLines(clonedElement);
  await optimizeImages(clonedElement);

  clonedElement.style.setProperty("transform", "none", "important");
  clonedElement.style.setProperty("transform-origin", "top left", "important");
  clonedElement.style.setProperty("width", "100%", "important");
  clonedElement.style.setProperty("padding", `${pagePadding}px`, "important");
  clonedElement.style.setProperty("box-sizing", "border-box", "important");
  clonedElement.style.setProperty("background", "white", "important");
  clonedElement.style.setProperty("font-family", selectedFontFamily, "important");

  const rootElement = clonedElement.firstElementChild as HTMLElement | null;
  if (rootElement) {
    rootElement.style.setProperty("height", "auto", "important");
    rootElement.style.setProperty("min-height", "0", "important");
  }
  clonedElement.querySelectorAll<HTMLElement>(".min-h-screen, .min-h-full").forEach((node) => {
    node.style.setProperty("height", "auto", "important");
    node.style.setProperty("min-height", "0", "important");
  });

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = `${A4_WIDTH_MM}mm`;
  container.style.background = "white";
  container.style.pointerEvents = "none";
  container.style.zIndex = "-1";
  container.appendChild(clonedElement);
  document.body.appendChild(container);

  await waitForImages(clonedElement);
  if (document.fonts?.ready) await document.fonts.ready;
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const renderedRect = clonedElement.getBoundingClientRect();
  const contentWidthPx = renderedRect.width || clonedElement.scrollWidth || A4_WIDTH_MM * PX_PER_MM;
  const contentHeightPx = Math.max(renderedRect.height, clonedElement.scrollHeight, 1);
  const pageHeightMm = Math.max(contentHeightPx * (A4_WIDTH_MM / contentWidthPx) + LONG_PAGE_HEIGHT_BUFFER_MM, 1);

  return { container, clonedElement, contentWidthPx, contentHeightPx, pageHeightMm };
};

export const exportToLongPagePdf = async ({
  elementId,
  title,
  pagePadding,
  fontFamily,
  onStart,
  onEnd,
  successMessage,
  errorMessage,
}: ExportOptions) => {
  onStart?.();
  let container: HTMLDivElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  try {
    const capture = await prepareLongPageCapture({ elementId, pagePadding, fontFamily });
    container = capture.container;
    const [{ jsPDF }, renderedCanvas] = await Promise.all([
      import("jspdf"),
      (async () => {
        const { default: html2canvas } = await import("html2canvas");
        return html2canvas(capture.clonedElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
          windowWidth: Math.ceil(capture.contentWidthPx),
          windowHeight: Math.ceil(capture.contentHeightPx + LONG_PAGE_CAPTURE_BUFFER_PX),
        });
      })(),
    ]);
    canvas = renderedCanvas;

    const imageHeightMm = canvas.height * (A4_WIDTH_MM / canvas.width);
    const canvasPageHeightMm = Math.max(imageHeightMm + LONG_PAGE_HEIGHT_BUFFER_MM, capture.pageHeightMm);
    const pdf = new jsPDF({
      unit: "mm",
      format: [A4_WIDTH_MM, canvasPageHeightMm],
      orientation: "portrait",
      compress: true,
    });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, A4_WIDTH_MM, imageHeightMm);
    pdf.save(`${getSafeFileName(title)}.pdf`);
    if (successMessage) toast.success(successMessage);
  } catch (error) {
    console.error("长页 PDF 导出失败:", error);
    if (errorMessage) toast.error(errorMessage);
  } finally {
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
    if (container?.parentNode) container.parentNode.removeChild(container);
    onEnd?.();
  }
};

export const exportToLongPageImage = async ({
  elementId,
  title,
  pagePadding,
  fontFamily,
  onStart,
  onEnd,
  successMessage,
  errorMessage,
}: ExportOptions) => {
  onStart?.();
  let container: HTMLDivElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  try {
    const capture = await prepareLongPageCapture({ elementId, pagePadding, fontFamily });
    container = capture.container;
    const { default: html2canvas } = await import("html2canvas");
    canvas = await html2canvas(capture.clonedElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
      windowWidth: Math.ceil(capture.contentWidthPx),
      windowHeight: Math.ceil(capture.contentHeightPx + LONG_PAGE_CAPTURE_BUFFER_PX),
    });
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas!.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG 转换失败"))), "image/png");
    });
    downloadBlob(blob, `${getSafeFileName(title)}.png`);
    if (successMessage) toast.success(successMessage);
  } catch (error) {
    console.error("长页图片导出失败:", error);
    if (errorMessage) toast.error(errorMessage);
  } finally {
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
    if (container?.parentNode) container.parentNode.removeChild(container);
    onEnd?.();
  }
};

// 分页 PDF：走浏览器打印（Ctrl+P 存为 PDF），与 Puppeteer 服务端导出等价
export const exportToPdf = async ({
  elementId,
  title,
  pagePadding,
  fontFamily,
  onStart,
  onEnd,
  successMessage,
  errorMessage,
}: ExportOptions) => {
  onStart?.();
  try {
    const pdfElement = document.querySelector<HTMLElement>(`#${elementId}`);
    if (!pdfElement) throw new Error(`未找到 #${elementId}`);
    await exportResumeToBrowserPrint(pdfElement, pagePadding, fontFamily);
    if (successMessage) toast.success(successMessage);
  } catch (error) {
    console.error("PDF 导出失败:", error);
    if (errorMessage) toast.error(errorMessage);
  } finally {
    onEnd?.();
  }
};

export const exportResumeAsJson = ({
  resume,
  title,
  onStart,
  onEnd,
  successMessage,
  errorMessage,
}: {
  resume?: ResumeData | null;
  title?: string;
  onStart?: () => void;
  onEnd?: () => void;
  successMessage?: string;
  errorMessage?: string;
}) => {
  onStart?.();
  try {
    if (!resume) throw new Error("无活动简历");
    const json = JSON.stringify(resume, null, 2);
    downloadTextFile(json, `${getSafeFileName(title || resume.title)}.json`, "application/json;charset=utf-8");
    if (successMessage) toast.success(successMessage);
  } catch (error) {
    console.error("JSON 导出失败:", error);
    if (errorMessage) toast.error(errorMessage);
  } finally {
    onEnd?.();
  }
};

export const exportResumeAsMarkdown = ({
  resume,
  title,
  onStart,
  onEnd,
  successMessage,
  errorMessage,
  markdownOptions,
}: {
  resume?: ResumeData | null;
  title?: string;
  onStart?: () => void;
  onEnd?: () => void;
  successMessage?: string;
  errorMessage?: string;
  markdownOptions?: ResumeMarkdownOptions;
}) => {
  onStart?.();
  try {
    if (!resume) throw new Error("无活动简历");
    const markdown = generateResumeMarkdown(resume, markdownOptions);
    downloadTextFile(markdown, `${getSafeFileName(title || resume.title)}.md`, "text/markdown;charset=utf-8");
    if (successMessage) toast.success(successMessage);
  } catch (error) {
    console.error("Markdown 导出失败:", error);
    if (errorMessage) toast.error(errorMessage);
  } finally {
    onEnd?.();
  }
};
