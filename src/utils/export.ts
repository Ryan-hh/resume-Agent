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
  // 优先用「未分页的连续流」容器（PagedResume 的测量树 #<id>-flow）导出长页：
  // 它就是完整文档本身，没有 A4 分页、没有页与页之间叠加的上下边距，
  // 长图/长页 PDF 里不会出现分页造成的空白间隔。
  // 找不到连续流容器时回退到分页预览（#<id>），兼容旧行为。
  const flowElement = document.querySelector<HTMLElement>(`#${elementId}-flow`);
  const sourceElement = flowElement ?? document.querySelector<HTMLElement>(`#${elementId}`);
  if (!sourceElement) throw new Error(`未找到 #${elementId}`);

  const selectedFontFamily = normalizeFontFamily(fontFamily);
  const clonedElement = sourceElement.cloneNode(true) as HTMLElement;
  hidePageBreakLines(clonedElement);
  await optimizeImages(clonedElement);

  clonedElement.style.setProperty("transform", "none", "important");
  clonedElement.style.setProperty("transform-origin", "top left", "important");
  clonedElement.style.setProperty("width", "100%", "important");
  // 连续流容器原本 hidden/absolute：导出时改为可见并回到文档流，
  // 宽度由外层 794px 容器决定（内容左右边距由模板根容器 pagePadding 提供）
  clonedElement.style.setProperty("visibility", "visible", "important");
  clonedElement.style.setProperty("position", "static", "important");
  clonedElement.style.setProperty("pointer-events", "none", "important");
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
  container.style.left = "0";
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

// 分页 PDF（直接下载）：把预览渲染好的多页 A4 转成 PDF 直接下载，不依赖浏览器打印对话框。
// 每页尺寸与预览完全一致（794×1123px = A4 @96dpi），左右边距由模板根容器提供，所见即所得。
// 实现：克隆容器放到视口内（z-index 最低、不挡交互），整份内容一次截图，再按页高切片装入多页 PDF。
// 注意不能放屏幕外（left:-10000px）——html2canvas 按元素视口坐标绘制，屏幕外元素会截出空白。
export const exportToPagedPdf = async ({
  elementId,
  title,
  fontFamily,
  onStart,
  onEnd,
  successMessage,
  errorMessage,
}: Omit<ExportOptions, "pagePadding"> & { pagePadding?: number }) => {
  onStart?.();
  let container: HTMLDivElement | null = null;
  let fullCanvas: HTMLCanvasElement | null = null;
  const canvases: HTMLCanvasElement[] = [];
  try {
    const pdfElement = document.querySelector<HTMLElement>(`#${elementId}`);
    if (!pdfElement) throw new Error(`未找到 #${elementId}`);
    const selectedFontFamily = normalizeFontFamily(fontFamily);
    const clonedElement = pdfElement.cloneNode(true) as HTMLElement;
    hidePageBreakLines(clonedElement);
    clonedElement.style.setProperty("transform", "none", "important");
    clonedElement.style.setProperty("transform-origin", "top left", "important");
    // 外层不加 padding/gap：边距由模板根容器（pagePadding）提供，页面间不留空隙
    clonedElement.style.setProperty("padding", "0", "important");
    clonedElement.style.setProperty("gap", "0", "important");
    clonedElement.style.setProperty("font-family", selectedFontFamily, "important");
    await optimizeImages(clonedElement);

    // 直接子元素即 A4 页面（PagedResume 渲染的 pageEl），
    // 页高必须在元素挂载到 DOM 并完成渲染后再测量，否则 offsetHeight 全为 0
    container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "0";
    container.style.top = "0";
    container.style.width = "794px";
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

    const pageHeights: number[] = [];
    Array.from(clonedElement.children).forEach((el) => {
      if (el instanceof HTMLElement && el.offsetWidth > 0) pageHeights.push(el.offsetHeight);
    });
    if (pageHeights.length === 0) throw new Error("未找到可导出的页面");
    const totalHeight = pageHeights.reduce((s, h) => s + h, 0);

    const { default: html2canvas } = await import("html2canvas");
    fullCanvas = await html2canvas(clonedElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
      windowWidth: 794,
      windowHeight: totalHeight,
    });

    // 按页高从整图中切片
    let y = 0;
    for (const h of pageHeights) {
      const c = document.createElement("canvas");
      c.width = fullCanvas.width;
      c.height = Math.max(1, Math.round(h * 2));
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.drawImage(fullCanvas, 0, Math.round(y * 2), fullCanvas.width, c.height, 0, 0, c.width, c.height);
      }
      canvases.push(c);
      y += h;
    }

    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    canvases.forEach((canvas, i) => {
      if (i > 0) pdf.addPage();
      const imgData = canvas.toDataURL("image/png");
      const ratio = canvas.height / canvas.width;
      if (ratio > 297 / 210 + 0.001) {
        // 页面异常超高：按高度适配并水平居中，避免变形/裁切
        const imgW = (297 * canvas.width) / canvas.height;
        pdf.addImage(imgData, "PNG", (210 - imgW) / 2, 0, imgW, 297);
      } else {
        pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
      }
    });
    pdf.save(`${getSafeFileName(title)}.pdf`);
    if (successMessage) toast.success(successMessage);
  } catch (error) {
    console.error("PDF 导出失败:", error);
    if (errorMessage) toast.error(errorMessage);
  } finally {
    canvases.forEach((c) => {
      c.width = 0;
      c.height = 0;
    });
    if (fullCanvas) {
      fullCanvas.width = 0;
      fullCanvas.height = 0;
    }
    if (container?.parentNode) container.parentNode.removeChild(container);
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
