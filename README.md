# 简历填写助手（Resume Assistant）

一个纯前端的智能简历制作工具：**表单输入 → 实时预览 → AI Agent 修改 → 导出 PDF**。数据只存在浏览器本地，无需注册、无需服务器，任意静态托管即可运行。

## 功能

- **三栏工作台（VS Code 风格）**：左侧编辑表单、中间 A4 实时预览、右侧 AI 助手，面板可拖拽调宽，窄窗口自动收起 AI 栏
- **LangChain Agent 改简历**：右侧对话即可让 AI 直接修改简历——基于 LangGraph `createReactAgent` 实现完整 agent loop（思考 → 调用工具 → 流式输出），18 个白名单工具覆盖全部可编辑内容：更新基本信息、格式归一化（出生年月/性别胶囊/枚举校验）、增改删经历条目、板块显隐/顺序/重命名、主题色/字体/页头对齐等样式、上传照片直接设头像
- **AI 对话体验**：流式输出 + 思考过程折叠块 + 工具调用卡（参数/结果 JSON 完整展示）、Markdown 富文本渲染（表格/代码块/列表）、PDF/Word/TXT/JSON 附件参考、图片附件直接替换头像、停止生成、历史上下文延续
- **AI 智能导入**：上传 PDF、图片、Word（DOCX）、TXT、JSON 简历，AI 自动识别并生成草稿——PDF 优先抽取文本层，扫描件自动转图走视觉模型；无需手动填写
- **多模型配置**：AI 配置页接入多款大模型（OpenAI 兼容 / Gemini / Anthropic 协议自动适配，支持自定义 baseUrl），按需切换
- **表单驱动**：基本信息、教育背景、工作经历、实习经历、项目经历、专业技能、自我评价、荣誉证书、自定义板块；条目支持增删、拖拽排序、显示开关、"至今"开关
- **实时 A4 预览**：改一个字段立即刷新，内容超一页自动分页；多套模板一键切换版式
- **样式设置**：主题色、字体、字号、行距、间距、图标模式、页头布局等，全部即时生效
- **本地存储与备份**：数据通过 Zustand persist 写入 localStorage，刷新不丢；可在设置中选择本地文件夹开启自动备份（File System Access API）
- **多份简历**：支持新建、复制、删除、切换多份简历，投不同岗位互不干扰
- **导出**：A4 单页 PDF（打印样式）、长页 PDF、长图 PNG、Markdown，所见即所得

## 技术栈

Vite · React 18 · TypeScript · Tailwind CSS v4 · Zustand（persist）· framer-motion · react-resizable-panels · Tiptap（富文本）· pdfjs-dist（PDF 解析）· mammoth（DOCX 解析）· jspdf / html2canvas（导出）

AI：LangChain（`@langchain/langgraph` / `@langchain/core` / `@langchain/openai` / `@langchain/anthropic` / `@langchain/google-genai`）· Zod · react-markdown / remark-gfm

> 注：项目根依赖存在 `react@^19` 的 peer 冲突（历史遗留），安装依赖需使用 `npm install --legacy-peer-deps`。

## 快速开始

```bash
npm install --legacy-peer-deps
npm run dev      # 开发：http://localhost:5173
npm run build    # 生产构建，产物在 dist/
npm run preview  # 预览生产构建
```

部署：任意静态托管（Vercel / GitHub Pages / Nginx）均可，`dist/` 目录即完整产物。

## 目录结构

```
src/
├── pages/WorkbenchPage.tsx      # 三栏工作台（表单 + 预览 + AI 助手，AI 面板懒加载）
├── pages/AISettingsPage.tsx     # 模型配置页（协议自动适配 + 测试连接）
├── components/
│   ├── editor/                  # 左侧编辑表单（basic / education / experience …）
│   ├── preview/                 # A4 预览容器 + 模板渲染
│   ├── ai/
│   │   ├── AIEditorPanel.tsx    # AI 助手对话面板（流式 / 思考 / 工具卡 / 附件）
│   │   └── MarkdownContent.tsx  # 消息正文 Markdown 富文本渲染（GFM 表格等）
│   └── dashboard/               # 首页 / 导入对话框
├── lib/agent/langchain/
│   ├── agent.ts                 # LangGraph createReactAgent + 分层系统提示词 + 流式事件封装
│   ├── modelFactory.ts          # AIConnection → ChatOpenAI / ChatAnthropic / ChatGoogleGenerativeAI
│   ├── normalize.ts             # 校验归一化层（日期 / 枚举 / 数组 / HTML 净化 / 图片校验）
│   ├── errors.ts                # 多协议错误映射与中文错误描述
│   └── tools/                   # 18 个白名单工具（读 / 基本信息 / 经历板块 / 结构 / 样式）
├── utils/resumeImport.ts        # PDF 抽文本 / 转图 / 图片压缩预处理
├── store/useResumeStore.ts      # Zustand store + localStorage 持久化（版本迁移）+ 撤销重做
└── types/resume.ts              # 简历数据模型
```

## 设计要点

- **无后端**：存储、导入解析、导出全部由浏览器原生能力完成，静态托管即可运行
- **LangGraph Agent**：`createReactAgent` + 18 个 Zod 校验工具，`agent.stream` 三通道流式（updates 节点 / messages token / tools 生命周期）驱动前端实时渲染
- **字段格式归一化**：所有可编辑字段的取值约束都收敛在 `normalize.ts` 与工具 schema 中——出生年月多种写法统一为 `YYYY-MM`、性别/枚举白名单校验、数组字段防御性读取，保证 AI 输出永远能落进表单约束
- **受控表单 + store 直连**：所有编辑组件直连 Zustand 单一数据源，避免双向同步不一致；selector 返回稳定引用，规避无限重渲染
- **工具写入即历史**：每个工具修改都走 store 的 `updateResume`（自带历史栈），AI 改错可 Ctrl+Z 逐步回退，面板提供「撤销本次全部改动」快照
- **打印即 PDF**：预览区即打印区，通过 `@media print` 隐藏工具栏与表单、还原 A4 原尺寸，保证所见即所得
- **导入兜底链路**：PDF 先抽文本（有文本层走文本模型），抽不到转图片走视觉模型；图片先压缩再转 Base64，保证任意模型都能解析
- **数据迁移**：store 持久化带版本号迁移（当前 v7），历史结构升级与损坏数据修复在 rehydrate 时自动完成
