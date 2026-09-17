import { CSSProperties } from "react";

// 模板分类：单栏 / 双栏 / 特色
export type TemplateCategory = "single" | "double" | "featured";

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
  availableSections?: string[];
}
