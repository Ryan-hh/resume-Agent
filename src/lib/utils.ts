import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function formatDateString(date: string, locale: string = "zh"): string {
  if (!date) return "";
  const trimmed = date.trim();
  const isYearMonth = /^\d{4}[./-]\d{1,2}$/.test(trimmed);
  const normalized = trimmed.replace(/-/g, "/");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return date;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  if (isYearMonth) {
    return locale === "en" ? `${month}/${year}` : `${year}.${month}`;
  }
  const day = String(parsed.getDate()).padStart(2, "0");
  if (locale === "en") return `${month}/${day}/${year}`;
  return `${year}.${month}.${day}`;
}

// 起止时间区间展示：支持「至今」；格式 2021.07 - 2024.12 / 2021.07 - 至今
export function formatDateRange(start?: string, end?: string, isPresent?: boolean): string {
  const s = (start || "").trim();
  const e = (end || "").trim();
  if (isPresent) return s ? `${s} - 至今` : "至今";
  if (s && e) return `${s} - ${e}`;
  return s || e || "";
}
