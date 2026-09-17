# 简历填写助手（Resume Assistant）

一个纯前端的简历制作工具：**表单输入 → 实时预览 → 导出 PDF**，数据只存在浏览器本地，无需注册、无需服务器。

## 功能

- **表单驱动**：基本信息、工作经历、项目经历、教育背景、专业技能、证书/荣誉六大模块；工作/项目/教育条目支持增删、排序
- **实时预览**：右侧按 A4 真实尺寸显示，改一个字段立即刷新；窗口放不下时可滚动查看
- **3 套模板**：简约单栏 / 经典双栏 / 侧边栏，同一份数据一键切换版式
- **主题色**：7 种强调色，切换立即生效
- **自动保存**：数据通过 Zustand persist 写入 localStorage，刷新不丢
- **多份简历**：支持新建、复制、删除、切换多份简历（投不同岗位）
- **导出 PDF**：浏览器打印样式输出 A4 单页（`导出 PDF` 按钮 → 另存为 PDF）
- **备份迁移**：JSON 一键导出 / 导入，防止清缓存丢数据，也可跨设备迁移

## 技术栈

Vite · React 18 · TypeScript · Tailwind CSS v4 · Zustand（persist）· zod

> 说明：表单采用受控组件直连 Zustand 单一数据源（比 react-hook-form 集成更简单可靠，适合实时预览场景）；zod 用于数据 schema 校验（JSON 导入时的结构检查）。

## 快速开始

```bash
npm install
npm run dev      # 开发：http://localhost:5173
npm run build    # 生产构建，产物在 dist/
npm run preview  # 预览生产构建
```

部署：任意静态托管（Vercel / GitHub Pages / Nginx）均可，`dist/` 目录即完整产物。

## 目录结构

```
src/
├── types/resume.ts          # 简历数据模型
├── store/useResumeStore.ts  # Zustand store + localStorage 持久化
├── data/sample.ts           # 示例数据 / 工具函数
├── utils/io.ts              # JSON 导入导出、打印、校验
├── components/
│   ├── Toolbar.tsx          # 顶部工具栏（模板/主题/简历管理/导入导出）
│   ├── forms/               # 分组表单组件
│   └── preview/             # A4 预览容器 + 3 套模板
└── App.tsx                  # 左右分栏布局
```

## 设计要点

- **无后端**：所有能力（存储、导出、校验）均由浏览器原生 API 完成，静态托管即可运行
- **打印即 PDF**：预览区即打印区，通过 `@media print` 隐藏工具栏与表单、还原 A4 原尺寸，保证所见即所得
- **受控表单 + store 直连**：避免双向同步不一致；zustand selector 均返回稳定引用，规避无限重渲染

## 与 Magic Resume 的关系

本项目**仅参考** Magic Resume（JOYCEQL/magic-resume）的"表单 + 实时预览 + 本地存储 + 导出 PDF"实现思路，**不沿用其代码与技术栈**：不使用 TanStack Start 全栈框架、Tiptap 富文本、AI 模型接入，全部为自研轻量实现。
