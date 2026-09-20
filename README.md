# 简历助手 · 智能小昊

一个纯前端的智能简历制作工具：**表单 / 对话输入 → A4 实时预览 → AI 智能体改写 → 一键导出 PDF**。内置 AI 助手「**智能小昊**」，你用自然语言描述需求，它直接把修改写进简历并实时渲染。所有数据只保存在浏览器本地，无需注册、无需服务器，任意静态托管即可运行。

## 功能亮点

### AI 对话式编辑（智能小昊）
- 右侧对话即可改简历：「把这段经历润色一下」「主题换成蓝色」「删掉第二段实习」，智能小昊直接落地修改
- 基于 LangGraph `createReactAgent` 的完整 Agent 循环（思考 → 调用工具 → 流式输出），工具白名单覆盖全部可编辑内容：基本信息、增删改经历条目、板块显隐 / 排序 / 重命名、主题色 / 字体 / 页头对齐等样式、上传照片设头像
- 流式输出 + 思考过程折叠 + 工具调用卡（参数 / 结果可见）、Markdown 富文本渲染（表格 / 代码块 / 列表）
- 每次修改都进历史栈，AI 改错可逐步撤销，面板提供「撤销本次全部改动」快照

### 编辑器与预览
- **三栏工作台（VS Code 风格）**：左侧编辑表单、中间 A4 实时预览、右侧 AI，面板可拖拽调宽，窄窗口自动收起
- **11 套模板**：经典、极简、优雅、瑞士网格、蓝点、时间线，以及经典蓝、超级蓝、极简灰、标签黑、深色科技——一键切换不丢内容
- **Tiptap 富文本**：加粗、列表、字号字色、下划线，所见即所得
- **拖拽排序**：板块与条目自由排序、显示 / 隐藏，「至今」开关
- **实时 A4 预览**：改一个字段立即刷新，内容超页自动分页

### 多模型与导入
- **多模型接入**：AI 配置页兼容 OpenAI / Anthropic Claude / Google Gemini 及任意 OpenAI 兼容接口（自定义 baseUrl），自带密钥、本地配置、按需切换
- **智能导入**：上传 PDF / Word（DOCX）/ TXT / JSON / 图片，智能小昊自动识别并填入对应板块；PDF 有文本层走文本模型，扫描件自动转图走视觉模型

### 隐私与导出
- **本地存储**：Zustand persist 写入 localStorage，刷新不丢；可选本地文件夹自动备份（File System Access API）
- **多份简历**：新建 / 复制 / 删除 / 切换，投不同岗位互不干扰
- **导出**：A4 单页 PDF（打印样式）、长页 PDF、长图 PNG、Markdown，所见即所得
- **深浅色主题**：跟随系统或手动切换

## 技术栈

| 分类 | 技术 |
| --- | --- |
| 前端框架 | React 18 · TypeScript · Vite 5 · React Router |
| 样式与动画 | Tailwind CSS v4 · Framer Motion · Ant Design 6 / @ant-design/x · Lucide Icons |
| 状态与交互 | Zustand（persist）· @dnd-kit 拖拽 · react-resizable-panels |
| AI 智能体 | LangChain · LangGraph（`createReactAgent`）· ReAct 工具链 · Zod 校验 |
| 编辑器与文档 | Tiptap 富文本 · pdfjs-dist 解析 · Mammoth（DOCX）· jsPDF + html2canvas 导出 |
| 其他 | react-markdown / remark-gfm · sonner 提示 |

> 注：项目根依赖存在历史 peer 冲突，安装依赖需使用 `npm install --legacy-peer-deps`。

## 快速开始

```bash
npm install --legacy-peer-deps
npm run dev      # 开发：http://localhost:5173
npm run build    # 生产构建，产物在 dist/
npm run preview  # 预览生产构建
```

- 主应用 `/`：简历列表 → 进入工作台编辑
- 产品介绍首页 `/home`：功能与技术栈介绍
- 部署：任意静态托管（Vercel / GitHub Pages / Nginx）均可，`dist/` 即完整产物。

## 目录结构

```
src/
├── pages/
│   ├── HomePage.tsx            # 产品介绍首页（/home）
│   ├── WorkbenchPage.tsx       # 三栏工作台（表单 + 预览 + 智能小昊，AI 面板懒加载）
│   ├── AISettingsPage.tsx      # 模型配置页（协议自动适配 + 测试连接）
│   └── ...
├── components/
│   ├── editor/                 # 左侧编辑表单（basic / education / experience …）
│   ├── preview/                # A4 预览容器
│   ├── templates/              # 11 套模板渲染组件 + shared 公共片段
│   ├── ai/
│   │   ├── AIEditorPanel.tsx   # 智能小昊对话面板（流式 / 思考 / 工具卡 / 附件）
│   │   └── MarkdownContent.tsx # 消息正文 Markdown 渲染（GFM 表格等）
│   └── home/                   # 首页区块（Hero / 功能 / 技术栈 / CTA）
├── lib/agent/langchain/
│   ├── agent.ts                # createReactAgent + 分层系统提示词 + 流式事件封装
│   ├── modelFactory.ts         # 连接配置 → ChatOpenAI / ChatAnthropic / ChatGoogle
│   ├── normalize.ts           # 校验归一化（日期 / 枚举 / 数组 / HTML 净化 / 图片校验）
│   ├── errors.ts               # 多协议错误映射与中文描述
│   └── tools/                  # 白名单工具（读 / 基本信息 / 经历板块 / 结构 / 样式）
├── utils/resumeImport.ts       # PDF 抽文本 / 转图 / 图片压缩预处理
├── store/useResumeStore.ts     # Zustand store + localStorage 持久化 + 撤销重做
└── types/resume.ts             # 简历数据模型
```

## 设计要点

- **无后端**：存储、导入解析、导出全部由浏览器原生能力完成，静态托管即可运行
- **数据驱动渲染**：简历是结构化 JSON，模板是纯渲染函数；智能小昊通过工具读写同一份数据，任何修改实时反映在 A4 预览上
- **字段格式归一化**：取值约束收敛在 `normalize.ts` 与工具 schema 中——出生年月统一为 `YYYY-MM`、枚举白名单校验、数组防御性读取，保证 AI 输出永远能落进表单
- **受控表单 + store 直连**：所有编辑组件直连 Zustand 单一数据源，selector 返回稳定引用，规避无限重渲染
- **打印即 PDF**：预览区即打印区，`@media print` 隐藏工具栏与表单、还原 A4 原尺寸，所见即所得
- **导入兜底链路**：PDF 先抽文本，抽不到转图片走视觉模型；图片先压缩再转 Base64，保证任意模型可解析
- **数据迁移**：store 持久化带版本号迁移，历史结构升级与损坏数据修复在 rehydrate 时自动完成
