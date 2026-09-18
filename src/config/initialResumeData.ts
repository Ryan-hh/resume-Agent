import { DEFAULT_FIELD_ORDER } from "./constants";
import { GlobalSettings, DEFAULT_CONFIG, ResumeData } from "@/types/resume";

export const initialGlobalSettings: GlobalSettings = {
  baseFontSize: 16,
  pagePadding: 32,
  paragraphSpacing: 12,
  lineHeight: 1.5,
  sectionSpacing: 10,
  headerSize: 18,
  subheaderSize: 16,
  useIconMode: true,
  themeColor: "#000000",
  pageBreakLinesVisible: true,
};

export const initialResumeState: Omit<ResumeData, "id" | "createdAt" | "updatedAt" | "templateId"> = {
  title: "新建简历",
  basic: {
    name: "张三",
    title: "高级前端工程师",
    email: "zhangsan@example.com",
    phone: "13800138000",
    location: "北京市朝阳区",
    birthDate: "1998-05-20",
    gender: "男",
    jobIntention: "高级前端工程师",
    politicalStatus: "群众",
    showAge: true,
    fieldOrder: DEFAULT_FIELD_ORDER,
    icons: {
      email: "Mail",
      phone: "Phone",
      birthDate: "CalendarRange",
      location: "MapPin",
    },
    photoConfig: DEFAULT_CONFIG,
    customFields: [
      { id: "personal", label: "个人网站", value: "https://zhangsan.dev", icon: "Globe" },
    ],
    photo: "",
  },
  education: [
    {
      id: "1",
      school: "北京大学",
      major: "计算机科学与技术",
      degree: "本科",
      startDate: "2013-09",
      endDate: "2017-06",
      visible: true,
      description:
        "<ul>\n<li>主修课程：数据结构、算法设计、操作系统、计算机网络、Web 开发技术</li>\n<li>专业排名前 5%，连续三年获得一等奖学金</li>\n<li>担任计算机协会技术部部长，组织多次技术分享会</li>\n</ul>",
    },
  ],
  skillContent:
    '<div class="skill-content">\n<ul>\n<li>前端框架：熟悉 React、Vue.js，熟悉 Next.js、Nuxt.js 等 SSR 框架</li>\n<li>开发语言：TypeScript、JavaScript(ES6+)、HTML5、CSS3</li>\n<li>UI/样式：熟悉 TailwindCSS、Sass/Less、CSS Module、styled-components</li>\n<li>状态管理：Redux、Vuex、Zustand、Jotai、React Query</li>\n<li>工程化工具：Webpack、Vite、Rollup、Babel、ESLint</li>\n<li>性能优化：熟悉浏览器渲染原理、性能指标监控、代码分割、懒加载等优化技术</li>\n<li>版本控制：Git、SVN</li>\n</ul>\n</div>',
  selfEvaluationContent: "",
  experience: [
    {
      id: "1",
      company: "字节跳动",
      position: "高级前端工程师",
      startDate: "2021-07",
      endDate: "2024-12",
      isPresent: false,
      visible: true,
      details:
        "<ul>\n<li>负责抖音创作者平台的开发与维护，主导多个核心功能的技术方案设计</li>\n<li>优化项目工程化配置，将构建时间从 8 分钟优化至 2 分钟，提升团队开发效率</li>\n<li>设计并实现组件库，提升代码复用率达 70%，显著减少开发时间</li>\n<li>主导性能优化项目，使平台首屏加载时间减少 50%，接入 APM 监控系统</li>\n<li>指导初级工程师，组织技术分享会，提升团队整体技术水平</li>\n</ul>",
    },
  ],
  certificatesContent: "",
  internship: [],
  draggingProjectId: null,
  projects: [
    {
      id: "p1",
      name: "抖音创作者中心",
      role: "前端负责人",
      startDate: "2022-06",
      endDate: "2023-12",
      isPresent: false,
      description:
        "<ul>\n<li>基于 React 开发的创作者数据分析和内容管理平台，服务百万级创作者群体</li>\n<li>包含数据分析、内容管理、收益管理等多个子系统</li>\n<li>使用 Redux 进行状态管理，实现复杂数据流的高效处理</li>\n<li>采用 Ant Design 组件库，确保界面设计的一致性和用户体验</li>\n<li>实施代码分割和懒加载策略，优化大规模应用的加载性能</li>\n</ul>",
      visible: true,
    },
    {
      id: "p2",
      name: "微信小程序开发者工具",
      role: "核心开发者",
      startDate: "2020-03",
      endDate: "2021-06",
      isPresent: false,
      description:
        "<ul>\n<li>为开发者提供小程序开发、调试和发布的一站式解决方案</li>\n<li>基于 Electron 构建的跨平台桌面应用</li>\n<li>支持多平台开发，包括 Windows、macOS 和 Linux</li>\n<li>提供实时的错误日志和性能分析工具</li>\n</ul>",
      visible: true,
    },
  ],
  menuSections: [
    { id: "basic", title: "基本信息", icon: "User", enabled: true, order: 0 },
    { id: "education", title: "教育背景", icon: "GraduationCap", enabled: true, order: 1 },
    { id: "skills", title: "专业技能", icon: "Zap", enabled: true, order: 2 },
    { id: "experience", title: "工作经历", icon: "Briefcase", enabled: true, order: 3 },
    { id: "internship", title: "实习经历", icon: "Laptop", enabled: true, order: 4 },
    { id: "projects", title: "项目经历", icon: "Rocket", enabled: true, order: 5 },
    { id: "certificates", title: "荣誉证书", icon: "Award", enabled: true, order: 6 },
    { id: "selfEvaluation", title: "自我评价", icon: "FileText", enabled: true, order: 7 },
  ],
  activeSection: "basic",
  customData: {},
  globalSettings: initialGlobalSettings,
};
