import { CSSProperties } from "react";

// 模板分类：单栏 / 双栏 / 特色
export type TemplateCategory = "single" | "double" | "featured";

// 板块标题变体：统一骨架下 8 套模板的唯一视觉差异（样式实现在 shared/sections.tsx SectionTitle）
export type TemplateTitleVariant =
  | "default" // 左侧粗体标题 + 细线
  | "center" // 居中标题
  | "line" // 下划线
  | "bold" // 超大粗体
  | "elegant" // 居中 + 两侧装饰线
  | "icon" // 图标 + 竖线
  | "chip" // 实心圆图标 + 彩色标题 + 右侧延伸细线
  | "solid-label" // 实心色块标签 + 白字
  | "gray-band" // 整行浅灰背景条 + 深色标题
  | "rule" // 深色粗体标题 + 整行主题色细线
  | "editorial"; // 编号 + 粗体

export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  layout: string;
  category: TemplateCategory;
  colorScheme: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  spacing: {
    sectionGap: number;
    itemGap: number;
    contentPadding: number;
  };
  basic: {
    layout?: "left" | "center" | "right";
  };
  titleVariant: TemplateTitleVariant;
  availableSections?: string[];
}
