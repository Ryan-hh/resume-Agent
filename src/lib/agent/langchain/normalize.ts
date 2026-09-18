// 校验与归一化层：AI 工具的自由文本输入 → 简历数据结构。
// 规则与编辑器中人为操作的约束保持一致（日期格式、枚举、数组、富文本、图片）。

/** 日期归一化：接受 "2020年5月 / 2020-5 / 2020.05 / 2020/05 / 2020-05"，统一为 YYYY-MM；失败返回 null */
export function normalizeDate(value: unknown): string | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})\s*[年./\-]?\s*(\d{1,2})?\s*月?$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = m[2] ? Number(m[2]) : 1;
  if (year < 1900 || year > 2100 || month < 1 || month > 12) return null;
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** 结束日期归一化："至今/现在/present/当前" → 返回 "至今"（由调用方转 isPresent）；空 → null；否则 YYYY-MM */
export function normalizeEndDate(value: unknown): string | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (/^(至今|现在|当前|present|now)$/i.test(s)) return "至今";
  return normalizeDate(s);
}

/** 布尔归一化：true/false/1/0/"true"/"false"；失败返回 null */
export function normalizeBool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === true || value === 1 || value === "1" || value === "true") return true;
  if (value === false || value === 0 || value === "0" || value === "false") return false;
  return null;
}

/** 枚举归一化：值必须在白名单内，否则返回 null */
export function normalizeEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  const v = String(value ?? "").trim();
  return (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

/** 字符串列表归一化：数组直接取；字符串按换行/顿号/逗号/分号拆分；空结果返回 null */
export function toList(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    const list = value
      .map((v) => String(v ?? "").trim())
      .filter((v) => v !== "");
    return list;
  }
  if (typeof value === "string" && value.trim() !== "") {
    return value
      .split(/\n|、|，|,|；|;/)
      .map((s) => s.trim())
      .filter((s) => s !== "");
  }
  return null;
}

/** 整数钳制：非数字或超出 [min,max] 返回 null */
export function clampInt(value: unknown, min: number, max: number): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n);
  if (r < min || r > max) return null;
  return r;
}

const DANGEROUS_TAG = /<\s*\/?\s*(script|iframe|object|embed|style|link|meta|form)[^>]*>/gi;
const EVENT_ATTR = /\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_URL = /(href|src|action)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi;

/** 富文本净化：剥掉脚本/事件属性/危险链接，防止 AI 输出注入 XSS */
export function sanitizeHtml(html: string): string {
  return html
    .replace(DANGEROUS_TAG, "")
    .replace(EVENT_ATTR, "")
    .replace(JS_URL, "");
}

/** 兼容渲染器（toRichHtml）：纯文本（含换行）转 HTML；已是 HTML 则净化后原样返回 */
export function toRichHtml(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/<[a-z][\s\S]*?>/i.test(text)) return sanitizeHtml(text);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
}

/** 图片 dataURL 校验：必须是 data:image/ 开头且体积不超过 maxMB */
export function isValidImageDataUrl(value: unknown, maxMB = 3): boolean {
  if (typeof value !== "string" || !value.startsWith("data:image/")) return false;
  const comma = value.indexOf(",");
  if (comma < 0) return false;
  const base64 = value.slice(comma + 1);
  const bytes = Math.ceil(base64.length * 0.75);
  return bytes <= maxMB * 1024 * 1024;
}
