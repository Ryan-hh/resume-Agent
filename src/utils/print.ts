// 浏览器打印导出：把 #resume-preview 的内容搬进临时窗口后调用打印
import { normalizeFontFamily } from "./fonts";

export const exportResumeToBrowserPrint = async (
  element: HTMLElement,
  pagePadding: number,
  fontFamily?: string
) => {
  const printWindow = window.open("", "_blank", "width=900,height=1200");
  if (!printWindow) {
    throw new Error("无法打开打印窗口，请检查浏览器弹窗设置");
  }

  const cloned = element.cloneNode(true) as HTMLElement;
  // 移除预览中的分页线与缩放 transform
  cloned.querySelectorAll(".page-break-line").forEach((n) => n.remove());
  cloned.style.removeProperty("transform");
  cloned.style.removeProperty("transform-origin");
  cloned.style.setProperty("width", "210mm", "important");
  cloned.style.setProperty("padding", `${pagePadding}px`, "important");
  cloned.style.setProperty("box-sizing", "border-box", "important");
  cloned.style.setProperty("background", "white", "important");
  cloned.style.setProperty("font-family", normalizeFontFamily(fontFamily), "important");

  const styles = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join("\n");
      } catch {
        return "";
      }
    })
    .join("\n");

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>简历打印</title>
<style>
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; background: white; }
  #resume-print-root { width: 210mm; background: white; }
</style>
<style>${styles}</style>
</head>
<body>
<div id="resume-print-root"></div>
</body>
</html>`);
  printWindow.document.close();

  const root = printWindow.document.getElementById("resume-print-root");
  if (root) {
    root.appendChild(cloned);
  }

  // 等待图片与字体就绪
  await Promise.all([
    new Promise((resolve) => setTimeout(resolve, 600)),
    printWindow.document.fonts?.ready?.catch(() => undefined) ?? Promise.resolve(),
  ]);
  printWindow.focus();
  printWindow.print();
};
