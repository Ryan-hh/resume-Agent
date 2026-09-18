# 简历填写助手（Resume Assistant）

一个纯前端的智能简历制作工具：**表单输入 → 实时预览 → AI 润色修改 → 导出 PDF**。数据只存在浏览器本地，无需注册、无需服务器，任意静态托管即可运行。

## 功能

- **三栏工作台（VS Code 风格）**：左侧编辑表单、中间 A4 实时预览、右侧 AI 助手，面板可拖拽调宽，窄窗口自动收起 AI 栏
- **AI 助手改简历**：把一段经历文本或一句修改指令丢给 AI，Agent 通过白名单工具直接修改简历（更新基本信息 / 增改经历条目 / 修改字段 / 删除条目 / 更新文本板块）；每次修改进入撤销历史，可 Ctrl+Z 逐步回退，也可一键撤销本次会话的全部改动
- **AI 智能导入**：上传 PDF、图片、Word（DOCX）、TXT、JSON 简历，AI 自动识别并生成草稿——PDF 优先抽取文本层，扫描件自动转图走视觉模型；无需手动填写
- **多模型配置**：AI 配置页接入多款大模型（OpenAI 兼容 / Gemini / Anthropic 协议自动适配），按需切换
- **表单驱动**：基本信息、教育背景、工作经历、实习经历、项目经历、专业技能、自我评价、荣誉证书、自定义板块；条目支持增删、拖拽排序、显示开关、"至今"开关
- **实时 A4 预览**：改一个字段立即刷新，内容超一页自动分页；多套模板一键切换版式
- **样式设置**：主题色、字体、字号、行距、间距、图标模式、页头布局等，全部即时生效
- **本地存储与备份**：数据通过 Zustand persist 写入 localStorage，刷新不丢；可在设置中选择本地文件夹开启自动备份（File System Access API）
- **多份简历**：支持新建、复制、删除、切换多份简历，投不同岗位互不干扰
- **导出**：A4 单页 PDF（打印样式）、长页 PDF、长图 PNG、Markdown，所见即所得

## 技术栈

Vite · React 18 · TypeScript · Tailwind CSS v4 · Zustand（persist）· framer-motion · react-resizable-panels · Tiptap（富文本）· pdfjs-dist（PDF 解析）· mammoth（DOCX 解析）· jspdf / html2canvas（导出）

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
├── pages/WorkbenchPage.tsx      # 三栏工作台（表单 + 预览 + AI 助手）
├── components/
│   ├── editor/                  # 左侧编辑表单（basic / education / experience …）
│   ├── preview/                 # A4 预览容器 + 模板渲染
│   ├── ai/AIEditorPanel.tsx     # AI 助手对话面板
│   └── dashboard/               # 首页 / 导入对话框
├── lib/
│   ├── agent/                   # AI Agent：agentLoop（循环引擎）+ resumeTools（白名单工具）
│   ├── ai-request.ts            # 多协议 LLM 请求（OpenAI / Gemini / Anthropic）
│   └── resumeImport.ts          # AI 导入提示词与解析清洗
├── utils/resumeImport.ts        # PDF 抽文本 / 转图 / 图片压缩预处理
├── store/useResumeStore.ts      # Zustand store + localStorage 持久化 + 撤销重做
└── types/resume.ts              # 简历数据模型
```

## 设计要点

- **无后端**：存储、导入解析、导出全部由浏览器原生能力完成，静态托管即可运行
- **受控表单 + store 直连**：所有编辑组件直连 Zustand 单一数据源，避免双向同步不一致；selector 返回稳定引用，规避无限重渲染
- **打印即 PDF**：预览区即打印区，通过 `@media print` 隐藏工具栏与表单、还原 A4 原尺寸，保证所见即所得
- **Agent 工具白名单**：AI 只能通过固定工具集修改简历，每次写入走 store 的撤销历史，改错可回退；工具描述严格对齐表单可编辑字段
- **导入兜底链路**：PDF 先抽文本（有文本层走文本模型），抽不到转图片走视觉模型；图片先压缩再转 Base64，保证任意模型都能解析
