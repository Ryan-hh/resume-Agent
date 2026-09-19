import type { ToolGroup } from "./tools";

// 意图分类：按用户消息关键词决定注入哪些工具组，减少固定输入 token
// 规则零成本、可预测；未命中任何组返回 null → 调用方全量注入（兜底，宁可多花 token 不可让模型无工具可用）

const RULES: { groups: ToolGroup[]; keywords: string[] }[] = [
  {
    groups: ["basic"],
    keywords: [
      "性别",
      "出生",
      "生日",
      "姓名",
      "改名",
      "电话",
      "手机",
      "邮箱",
      "地址",
      "城市",
      "政治面貌",
      "求职意向",
      "自定义字段",
      "头像",
      "照片",
      "一寸",
    ],
  },
  {
    groups: ["sections"],
    keywords: [
      "教育",
      "学校",
      "专业",
      "学历",
      "工作",
      "公司",
      "实习",
      "项目",
      "经历",
      "技能",
      "评价",
      "证书",
      "获奖",
      "荣誉",
      "条目",
      "删除这条",
      "内容",
    ],
  },
  {
    groups: ["structure"],
    keywords: [
      "板块",
      "显示",
      "隐藏",
      "删除板块",
      "新建板块",
      "添加板块",
      "顺序",
      "排序",
      "移动板块",
      "上移",
      "下移",
    ],
  },
  {
    groups: ["settings"],
    keywords: ["主题色", "颜色", "字体", "字号", "行距", "间距", "布局", "对齐", "圆角", "图标模式", "样式", "排版", "页边距"],
  },
  {
    groups: ["polish"],
    keywords: ["润色", "改写", "美化", "润一润", "措辞", "精炼", "打磨", "表达更"],
  },
];

/**
 * 根据用户输入判断需要注入的工具组。
 * 命中多个组时全部返回（如"改工作经历 + 主题色"→ sections + settings）。
 * 返回 null 表示无法判断，调用方应全量注入。
 */
export function classifyToolGroups(text: string): ToolGroup[] | null {
  const input = String(text ?? "");
  if (!input.trim()) return null;
  const matched = new Set<ToolGroup>();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => input.includes(k))) {
      rule.groups.forEach((g) => matched.add(g));
    }
  }
  if (matched.size === 0) return null;
  // read 组由调用方永远注入，不在此返回
  return [...matched];
}
