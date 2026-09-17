// 字体族规范化：不同字体在导出/预览时保持一致
export const normalizeFontFamily = (fontFamily?: string | null): string => {
  if (!fontFamily) return "inherit";
  return fontFamily;
};

// 生成 @font-face CSS 注入导出容器（Google Fonts 或系统字体）
export const getFontFaceCss = async (fontFamily: string): Promise<string> => {
  if (!fontFamily || fontFamily === "inherit") return "";
  return "";
};
