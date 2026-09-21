import React from "react";
import * as Icons from "lucide-react";
import {
  BasicInfo,
  Education,
  Experience,
  GlobalSettings,
  Project,
  getPhotoRadius,
} from "@/types/resume";
import { formatDateRange, formatDateString } from "@/lib/utils";

// hex 主题色 → 带透明度的 rgba（支持 #RGB / #RRGGBB；已是 rgba 或其他格式原样返回）
const withAlpha = (hex: string, alpha: number): string => {
  const m = hex.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return hex;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// 条目内容判空：任何字段有值即视为已填写（避免空白条目在简历上多占一行）
const hasExperienceContent = (e: Experience): boolean =>
  !!(
    e.company?.trim() ||
    e.position?.trim() ||
    e.startDate?.trim() ||
    e.endDate?.trim() ||
    e.isPresent ||
    (e.details && e.details.trim())
  );

const hasProjectContent = (p: Project): boolean =>
  !!(
    p.name?.trim() ||
    p.role?.trim() ||
    p.startDate?.trim() ||
    p.endDate?.trim() ||
    p.isPresent ||
    (p.description && p.description.trim())
  );

const hasEducationContent = (e: Education): boolean =>
  !!(
    e.school?.trim() ||
    e.major?.trim() ||
    e.degree?.trim() ||
    e.startDate?.trim() ||
    e.endDate?.trim() ||
    (e.description && e.description.trim())
  );

// ===== PageBlock：A4 分页的最小块（标题块 / 条目块） =====
// keepNext：该块不能成为一页的最后一个块（标题需与下一条目保持同页）
export function PageBlock({
  col = 0,
  keepNext = false,
  children,
  style,
}: {
  col?: number;
  keepNext?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div data-page-block data-col={col} data-keep-next={keepNext || undefined} style={style}>
      {children}
    </div>
  );
}

// ===== SectionWrapper：板块容器（纯展示，无 hover/点击交互），供分页克隆后清理空板块 =====
export function SectionWrapper({
  sectionId,
  children,
  style,
}: {
  sectionId: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div data-section-wrapper={sectionId} style={style}>
      {children}
    </div>
  );
}

// ===== SectionTitle：各模板通过 variant 差异化 =====
export type SectionTitleVariant =
  | "default" // 左侧粗体标题 + 细线
  | "center" // 居中标题
  | "line" // 下划线
  | "bold" // 超大粗体
  | "elegant" // 居中 + 两侧装饰线
  | "icon" // 图标 + 竖线
  | "chip" // 蓝色实心圆图标 + 彩色标题 + 右侧延伸细线
  | "solid-label" // 实心色块标签 + 白字（超级蓝 / 标签黑）
  | "gray-band" // 整行浅灰背景条 + 深色标题（极简灰）
  | "rule" // 深色粗体标题 + 整行主题色细线（深色科技）
  | "editorial"; // 编号 + 粗体

export function SectionTitle({
  title,
  icon,
  globalSettings,
  variant = "default",
}: {
  title: string;
  icon?: string;
  globalSettings: GlobalSettings;
  variant?: SectionTitleVariant;
}) {
  const themeColor = globalSettings.themeColor || "#000000";
  const headerSize = globalSettings.headerSize || 18;

  const common: React.CSSProperties = {
    fontSize: `${headerSize}px`,
    fontWeight: 700,
    color: "inherit",
  };

  // 所有变体统一标题内容区高度（随字号自适应），各样式在固定高度内垂直居中 → 8 套模板小标题视觉高度一致
  const HEADER_H = Math.round(headerSize * 1.5 + 6);
  const rowBase: React.CSSProperties = {
    height: `${HEADER_H}px`,
    display: "flex",
    alignItems: "center",
    marginBottom: "12px",
  };

  switch (variant) {
    case "center":
      return (
        <div style={{ ...rowBase, justifyContent: "center" }}>
          <h3 style={{ ...common, textAlign: "center", margin: 0 }}>{title}</h3>
        </div>
      );
    case "line":
      return (
        <div style={rowBase}>
          <h3 style={{ ...common, display: "inline-block", borderBottom: `2px solid ${themeColor}`, paddingBottom: "4px", margin: 0 }}>
            {title}
          </h3>
        </div>
      );
    case "bold":
      return (
        <div style={{ ...rowBase, flexDirection: "column", justifyContent: "center" }}>
          <h3 style={{ ...common, fontSize: `${Math.max(headerSize, 20)}px`, letterSpacing: "0.02em", margin: 0, lineHeight: 1.2 }}>{title}</h3>
          <div style={{ width: "100%", height: "3px", background: themeColor, marginTop: "6px" }} />
        </div>
      );
    case "elegant":
      return (
        <div style={{ ...rowBase, gap: "12px" }}>
          <div style={{ flex: 1, height: "1px", background: themeColor, opacity: 0.4 }} />
          <h3 style={{ ...common, whiteSpace: "nowrap", margin: 0 }}>{title}</h3>
          <div style={{ flex: 1, height: "1px", background: themeColor, opacity: 0.4 }} />
        </div>
      );
    case "icon":
      return (
        <div style={{ ...rowBase, gap: "8px" }}>
          {renderIcon(icon, headerSize, themeColor)}
          <h3 style={{ ...common, margin: 0 }}>{title}</h3>
          <div style={{ flex: 1, height: "1px", background: themeColor, opacity: 0.25 }} />
        </div>
      );
    case "chip":
      // 蓝点风格：实心圆底白图标 + 彩色加粗标题 + 标题右侧延伸同色细线
      return (
        <div style={{ ...rowBase, gap: "10px" }}>
          <span
            style={{
              width: `${Math.round(headerSize + 8)}px`,
              height: `${Math.round(headerSize + 8)}px`,
              borderRadius: "50%",
              background: themeColor,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {renderIcon(icon, Math.round((headerSize + 8) * 0.55), "#ffffff")}
          </span>
          <h3 style={{ ...common, color: themeColor, whiteSpace: "nowrap", margin: 0 }}>{title}</h3>
          <div style={{ flex: 1, height: "2px", background: themeColor, opacity: 0.3 }} />
        </div>
      );
    case "editorial":
      return (
        <div style={{ ...rowBase, gap: "10px" }}>
          <span style={{ ...common, color: themeColor, fontFamily: "Georgia, serif" }}>{String(title).slice(0, 1)}</span>
          <h3 style={{ ...common, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>{title}</h3>
        </div>
      );
    case "solid-label":
      // 实心色块标签 + 白字（直角方块）
      return (
        <div style={rowBase}>
          <h3 style={{ ...common, display: "inline-block", background: themeColor, color: "#ffffff", padding: "3px 10px", lineHeight: 1.3, margin: 0 }}>
            {title}
          </h3>
        </div>
      );
    case "gray-band":
      // 整行主题色浅背景条（跟随主题色 + 12% 透明度）+ 深色标题，占满统一高度
      return (
        <div style={rowBase}>
          <div
            style={{
              height: "100%",
              width: "100%",
              background: withAlpha(themeColor, 0.12),
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
            }}
          >
            <h3 style={{ ...common, color: "#1A1A1A", margin: 0 }}>{title}</h3>
          </div>
        </div>
      );
    case "rule":
      // 深色粗体标题 + 整行主题色细线
      return (
        <div style={{ ...rowBase, flexDirection: "column", justifyContent: "center" }}>
          <h3 style={{ ...common, color: "#1A1A1A", margin: 0, lineHeight: 1.2 }}>{title}</h3>
          <div style={{ width: "100%", height: "2px", background: themeColor, marginTop: "6px" }} />
        </div>
      );
    default:
      return (
        <div style={{ ...rowBase, gap: "10px" }}>
          <span style={{ width: "4px", height: `${headerSize}px`, background: themeColor, borderRadius: "2px" }} />
          <h3 style={{ ...common, margin: 0 }}>{title}</h3>
        </div>
      );
  }
}

// ===== 公共图标渲染 =====
export function renderIcon(iconName: string | undefined, size = 16, color?: string): React.ReactNode {
  const IconComponent = Icons[iconName as keyof typeof Icons] as React.ElementType;
  if (!IconComponent) return null;
  return <IconComponent style={{ width: size, height: size, marginTop: "0.2em", flexShrink: 0 }} color={color} />;
}

// ===== BaseInfo =====
// 个人信息固定字段顺序（不提供排序）
const BASIC_FIELDS: { key: keyof BasicInfo; label: string; icon: string }[] = [
  { key: "birthDate", label: "出生年月", icon: "CalendarRange" },
  { key: "gender", label: "性别", icon: "User" },
  { key: "phone", label: "电话", icon: "Phone" },
  { key: "email", label: "邮箱", icon: "Mail" },
  { key: "politicalStatus", label: "政治面貌", icon: "BadgeCheck" },
  { key: "location", label: "所在地", icon: "MapPin" },
];

// 根据出生日期计算周岁
function calcAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate.replace(/-/g, "/"));
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 ? age : null;
}

export function BaseInfoSection({
  basic,
  globalSettings,
  titleVariant,
  layout = "left",
}: {
  basic: BasicInfo;
  globalSettings: GlobalSettings;
  titleVariant?: SectionTitleVariant;
  layout?: "left" | "center" | "right";
}) {
  const useIconMode = globalSettings.useIconMode ?? false;

  const getOrderedFields = React.useMemo(() => {
    return BASIC_FIELDS.map((field) => {
      let value = (basic[field.key] as string) ?? "";
      if (field.key === "birthDate" && value) {
        // 出生年月只展示年月（兼容旧数据可能带日）
        value = formatDateString(value.slice(0, 7));
        if (basic.showAge) {
          const age = calcAge(basic.birthDate);
          if (age !== null) value = `${value}（${age}岁）`;
        }
      }
      return { key: field.key, value, icon: field.icon, label: field.label, visible: true };
    }).filter((item) => Boolean(item.value));
  }, [basic]);

  const allFields = [
    ...getOrderedFields,
    ...(Array.isArray(basic.customFields)
      ? basic.customFields
          .filter((field) => field.visible !== false && Boolean(field.value))
          .map((field) => ({
            key: field.id,
            value: field.value,
            icon: field.icon,
            label: field.label,
            visible: true,
            custom: true,
            displayLabel: field.displayLabel,
          }))
      : []),
  ];

  const name = basic?.name || "";
  const title = basic?.title || "";

  // 头像：固定一寸照比例（3:4，90×120），可调圆角；由「显示头像」开关控制显隐
  const photoVisible = basic.photoConfig?.visible !== false;
  const PHOTO_HEIGHT = 120;
  const PHOTO_WIDTH = 90;
  const PhotoComponent = photoVisible && (
    <div
      style={{
        width: PHOTO_WIDTH,
        height: PHOTO_HEIGHT,
        borderRadius: getPhotoRadius(basic.photoConfig),
        overflow: "hidden",
        flexShrink: 0,
        background: "#f1f5f9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {basic.photo ? (
        <img
          src={basic.photo}
          alt={`${basic.name || ""} 的照片`}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )}
    </div>
  );

  // 头部布局：信息区（名字/职称/基本信息）+ 头像
  //  - left：头像在左，信息在右
  //  - right：头像在右，信息在左（默认，所有模板当前均用此布局）
  //  - center：纵向居中，头像在名字上方
  const layoutStyles = {
    left: {
      container: { display: "flex", flexDirection: "row" as const, alignItems: "center", justifyContent: "space-between", gap: "28px" },
      infoBlock: { display: "flex", flexDirection: "column" as const, alignItems: "flex-start", flex: 1, minWidth: 0 },
      fields: { display: "flex", flexWrap: "wrap" as const, justifyContent: "flex-start", gap: "7px 18px", marginTop: "10px" },
    },
    right: {
      container: { display: "flex", flexDirection: "row" as const, alignItems: "center", justifyContent: "space-between", gap: "28px" },
      infoBlock: { display: "flex", flexDirection: "column" as const, alignItems: "flex-start", flex: 1, minWidth: 0 },
      fields: { display: "flex", flexWrap: "wrap" as const, justifyContent: "flex-start", gap: "7px 18px", marginTop: "10px" },
    },
    center: {
      container: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "14px" },
      infoBlock: { display: "flex", flexDirection: "column" as const, alignItems: "center", width: "100%", minWidth: 0 },
      fields: { display: "flex", flexWrap: "wrap" as const, justifyContent: "center", gap: "7px 18px", marginTop: "10px" },
    },
  };

  const styles = layoutStyles[layout] || layoutStyles.right;
  const baseFont = globalSettings.baseFontSize || 14;
  const nameSize = Math.max(28, baseFont + 14);
  const fieldIconSize = baseFont + 1;

  // 字段项：图标模式为 [icon]+值，文本模式为 标签: 值（均为中性色，不随主题色变化）
  const renderField = (item: (typeof allFields)[number]) => (
    <div key={item.key} style={{ display: "flex", alignItems: "center", gap: "5px", minWidth: 0 }}>
      {useIconMode ? (
        <>
          {renderIcon(item.icon, fieldIconSize)}
          {item.key === "email" ? (
            <a href={`mailto:${item.value}`} style={{ minWidth: 0, overflowWrap: "anywhere", color: "inherit" }}>{item.value}</a>
          ) : (
            <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{item.value}</span>
          )}
        </>
      ) : (
        <>
          <span style={{ flexShrink: 0, fontWeight: 500 }}>{item.label}:</span>
          {item.key === "email" ? (
            <a href={`mailto:${item.value}`} style={{ minWidth: 0, overflowWrap: "anywhere", color: "inherit" }}>{item.value}</a>
          ) : (
            <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{item.value}</span>
          )}
        </>
      )}
    </div>
  );

  return (
    <SectionWrapper sectionId="basic">
      <PageBlock col={0}>
        <div style={styles.container}>
          {layout === "left" && PhotoComponent}
          <div style={styles.infoBlock}>
            {layout === "center" && PhotoComponent}
            {name && (
              <h1 style={{ fontWeight: 700, fontSize: `${nameSize}px`, margin: 0, lineHeight: 1.2, wordBreak: "break-word" }}>
                {name}
              </h1>
            )}
            {title && (
              <h2
                style={{
                  fontSize: `${globalSettings.subheaderSize || 16}px`,
                  margin: "4px 0 0 0",
                  fontWeight: 500,
                  color: "#4b5563",
                  wordBreak: "break-word",
                }}
              >
                {title}
              </h2>
            )}
            {allFields.length > 0 && (
              <div style={{ ...styles.fields, fontSize: `${baseFont}px`, color: "#4b5563" }}>
                {allFields.map(renderField)}
              </div>
            )}
          </div>
          {layout === "right" && PhotoComponent}
        </div>
      </PageBlock>
    </SectionWrapper>
  );
}

// ===== 富文本内容渲染 =====
// 注意：.resume-rich 使用 white-space: pre-wrap（用户输入的空格原样显示），
// 因此 HTML 源码里标签之间的换行/缩进（如 <ul>\n<li>）也会被当成真实换行渲染，
// 导致板块行距异常变大。渲染前把标签间空白折叠掉（> < 之间仅空白 → ><），
// 文本内容内部的空格不受影响。
const normalizeRichHtml = (html: string): string => html.replace(/>\s+</g, "><");

const renderRich = (html: string) => (
  <div className="resume-rich" dangerouslySetInnerHTML={{ __html: normalizeRichHtml(html) }} />
);

// 兼容旧数据：纯文本（含换行）转成可渲染的 HTML；已是 HTML 则原样返回
const toRichHtml = (text: string): string => {
  if (!text) return "";
  if (/<[a-z][\s\S]*?>/i.test(text)) return text;
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
};

// ===== Experience =====
export function ExperienceSection({
  experiences,
  globalSettings,
  titleVariant,
  title,
  icon,
  style,
}: {
  experiences: Experience[];
  globalSettings: GlobalSettings;
  titleVariant?: SectionTitleVariant;
  title?: string;
  icon?: string;
  style?: React.CSSProperties;
}) {
  const baseFont = globalSettings.baseFontSize || 14;
  const items = experiences.filter((e) => e.visible !== false && hasExperienceContent(e));
  return (
    <SectionWrapper sectionId="experience" style={style}>
      <PageBlock col={0} keepNext>
        <SectionTitle title={title || "工作经历"} icon={icon} globalSettings={globalSettings} variant={titleVariant} />
      </PageBlock>
      <div style={{ display: "flex", flexDirection: "column", gap: `${globalSettings.paragraphSpacing || 12}px` }}>
        {items.map((item) => (
          <PageBlock col={0} key={item.id}>
            {/* 三栏：公司靠左 / 职位居中 / 日期靠右，全部黑色 */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,auto) 1fr auto", alignItems: "baseline", gap: "12px" }}>
              <span style={{ fontWeight: 700, fontSize: `${baseFont + 1}px`, color: "#000000", wordBreak: "break-word" }}>{item.company}</span>
              <span style={{ textAlign: "center", fontWeight: 500, fontSize: `${baseFont}px`, color: "#000000", minWidth: 0 }}>{item.position}</span>
              <span style={{ fontSize: `${baseFont - 1}px`, color: "#000000", whiteSpace: "nowrap" }}>
                {formatDateRange(item.startDate, item.endDate, item.isPresent)}
              </span>
            </div>
            {item.details && (
              <div style={{ fontSize: `${baseFont}px`, lineHeight: 1.6, marginTop: "4px" }}>{renderRich(item.details)}</div>
            )}
          </PageBlock>
        ))}
      </div>
    </SectionWrapper>
  );
}

// ===== Education =====
export function EducationSection({
  education,
  globalSettings,
  titleVariant,
  title,
  icon,
  style,
}: {
  education: Education[];
  globalSettings: GlobalSettings;
  titleVariant?: SectionTitleVariant;
  title?: string;
  icon?: string;
  style?: React.CSSProperties;
}) {
  const baseFont = globalSettings.baseFontSize || 14;
  const items = education.filter((e) => e.visible !== false && hasEducationContent(e));
  return (
    <SectionWrapper sectionId="education" style={style}>
      <PageBlock col={0} keepNext>
        <SectionTitle title={title || "教育背景"} icon={icon} globalSettings={globalSettings} variant={titleVariant} />
      </PageBlock>
      <div style={{ display: "flex", flexDirection: "column", gap: `${globalSettings.paragraphSpacing || 12}px` }}>
        {items.map((item) => (
          <PageBlock col={0} key={item.id}>
            {/* 三栏：名称靠左 / 专业（学历）居中 / 日期靠右，全部黑色 */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,auto) 1fr auto", alignItems: "baseline", gap: "12px" }}>
              <span style={{ fontWeight: 700, fontSize: `${baseFont + 1}px`, color: "#000000", wordBreak: "break-word" }}>{item.school}</span>
              <span style={{ textAlign: "center", fontSize: `${baseFont}px`, color: "#000000", minWidth: 0 }}>
                {item.major}
                {item.degree ? <span>（{item.degree}）</span> : null}
              </span>
              <span style={{ fontSize: `${baseFont - 1}px`, color: "#000000", whiteSpace: "nowrap" }}>
                {[item.startDate, item.endDate].filter(Boolean).join(" - ")}
              </span>
            </div>
            {item.description && (
              <div style={{ fontSize: `${baseFont}px`, lineHeight: 1.6, marginTop: "4px" }}>{renderRich(item.description)}</div>
            )}
          </PageBlock>
        ))}
      </div>
    </SectionWrapper>
  );
}

// ===== Project =====
export function ProjectSection({
  projects,
  globalSettings,
  titleVariant,
  title,
  icon,
  style,
}: {
  projects: Project[];
  globalSettings: GlobalSettings;
  titleVariant?: SectionTitleVariant;
  title?: string;
  icon?: string;
  style?: React.CSSProperties;
}) {
  const baseFont = globalSettings.baseFontSize || 14;
  const items = projects.filter((p) => p.visible !== false && hasProjectContent(p));
  return (
    <SectionWrapper sectionId="projects" style={style}>
      <PageBlock col={0} keepNext>
        <SectionTitle title={title || "项目经历"} icon={icon} globalSettings={globalSettings} variant={titleVariant} />
      </PageBlock>
      <div style={{ display: "flex", flexDirection: "column", gap: `${globalSettings.paragraphSpacing || 12}px` }}>
        {items.map((item) => (
          <PageBlock col={0} key={item.id}>
            {/* 三栏：项目名靠左 / 角色居中 / 日期靠右，全部黑色 */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,auto) 1fr auto", alignItems: "baseline", gap: "12px" }}>
              <span style={{ fontWeight: 700, fontSize: `${baseFont + 1}px`, color: "#000000", wordBreak: "break-word" }}>{item.name}</span>
              {item.role && <span style={{ textAlign: "center", fontWeight: 500, fontSize: `${baseFont}px`, color: "#000000", minWidth: 0 }}>{item.role}</span>}
              <span style={{ fontSize: `${baseFont - 1}px`, color: "#000000", whiteSpace: "nowrap" }}>
                {formatDateRange(item.startDate, item.endDate, item.isPresent)}
              </span>
            </div>
            {item.description && (
              <div style={{ fontSize: `${baseFont}px`, lineHeight: 1.6, marginTop: "4px" }}>{renderRich(item.description)}</div>
            )}
          </PageBlock>
        ))}
      </div>
    </SectionWrapper>
  );
}

// ===== Skill =====
export function SkillSection({
  skill,
  globalSettings,
  titleVariant,
  title,
  icon,
  style,
}: {
  skill: string;
  globalSettings: GlobalSettings;
  titleVariant?: SectionTitleVariant;
  title?: string;
  icon?: string;
  style?: React.CSSProperties;
}) {
  const baseFont = globalSettings.baseFontSize || 14;
  return (
    <SectionWrapper sectionId="skills" style={style}>
      <PageBlock col={0} keepNext>
        <SectionTitle title={title || "专业技能"} icon={icon} globalSettings={globalSettings} variant={titleVariant} />
      </PageBlock>
      <PageBlock col={0}>
        <div style={{ fontSize: `${baseFont}px`, lineHeight: 1.6 }}>{renderRich(skill)}</div>
      </PageBlock>
    </SectionWrapper>
  );
}

// ===== SelfEvaluation =====
export function SelfEvaluationSection({
  content,
  globalSettings,
  titleVariant,
  title,
  icon,
  style,
}: {
  content: string;
  globalSettings: GlobalSettings;
  titleVariant?: SectionTitleVariant;
  title?: string;
  icon?: string;
  style?: React.CSSProperties;
}) {
  const baseFont = globalSettings.baseFontSize || 14;
  return (
    <SectionWrapper sectionId="selfEvaluation" style={style}>
      <PageBlock col={0} keepNext>
        <SectionTitle title={title || "自我评价"} icon={icon} globalSettings={globalSettings} variant={titleVariant} />
      </PageBlock>
      <PageBlock col={0}>
        <div style={{ fontSize: `${baseFont}px`, lineHeight: 1.7 }}>{renderRich(toRichHtml(content))}</div>
      </PageBlock>
    </SectionWrapper>
  );
}

// ===== Custom =====
export function CustomSection({
  title,
  sectionId,
  content,
  globalSettings,
  titleVariant,
  icon,
  style,
}: {
  title: string;
  sectionId: string;
  content: string;
  globalSettings: GlobalSettings;
  titleVariant?: SectionTitleVariant;
  icon?: string;
  style?: React.CSSProperties;
}) {
  const baseFont = globalSettings.baseFontSize || 14;
  // 兼容旧数据（customData 可能仍为条目数组）：数组则拼接各条目描述
  const text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? (content as Array<{ description?: string }>)
            .map((it) => it?.description || "")
            .filter(Boolean)
            .join("\n")
        : "";
  return (
    <SectionWrapper sectionId={sectionId} style={style}>
      <PageBlock col={0} keepNext>
        <SectionTitle title={title} icon={icon} globalSettings={globalSettings} variant={titleVariant} />
      </PageBlock>
      <PageBlock col={0}>
        <div style={{ fontSize: `${baseFont}px`, lineHeight: 1.7 }}>{renderRich(toRichHtml(text))}</div>
      </PageBlock>
    </SectionWrapper>
  );
}

// ===== Certificates（荣誉证书：文本区域） =====
export function CertificatesSection({
  certificatesContent,
  globalSettings,
  titleVariant,
  title,
  icon,
  style,
}: {
  certificatesContent: string;
  globalSettings: GlobalSettings;
  titleVariant?: SectionTitleVariant;
  title?: string;
  icon?: string;
  style?: React.CSSProperties;
}) {
  const baseFont = globalSettings.baseFontSize || 14;
  return (
    <SectionWrapper sectionId="certificates" style={style}>
      <PageBlock col={0} keepNext>
        <SectionTitle title={title || "荣誉证书"} icon={icon} globalSettings={globalSettings} variant={titleVariant} />
      </PageBlock>
      <PageBlock col={0}>
        <div style={{ fontSize: `${baseFont}px`, lineHeight: 1.6 }}>{renderRich(toRichHtml(certificatesContent))}</div>
      </PageBlock>
    </SectionWrapper>
  );
}

// ===== Internship（实习经历） =====
export function InternshipSection({
  internships,
  globalSettings,
  titleVariant,
  title,
  icon,
  style,
}: {
  internships: Experience[];
  globalSettings: GlobalSettings;
  titleVariant?: SectionTitleVariant;
  title?: string;
  icon?: string;
  style?: React.CSSProperties;
}) {
  const baseFont = globalSettings.baseFontSize || 14;
  const items = internships.filter((e) => e.visible !== false && hasExperienceContent(e));
  return (
    <SectionWrapper sectionId="internship" style={style}>
      <PageBlock col={0} keepNext>
        <SectionTitle title={title || "实习经历"} icon={icon} globalSettings={globalSettings} variant={titleVariant} />
      </PageBlock>
      <div style={{ display: "flex", flexDirection: "column", gap: `${globalSettings.paragraphSpacing || 12}px` }}>
        {items.map((item) => (
          <PageBlock col={0} key={item.id}>
            {/* 三栏：公司靠左 / 职位居中 / 日期靠右，全部黑色 */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,auto) 1fr auto", alignItems: "baseline", gap: "12px" }}>
              <span style={{ fontWeight: 700, fontSize: `${baseFont + 1}px`, color: "#000000", wordBreak: "break-word" }}>{item.company}</span>
              <span style={{ textAlign: "center", fontWeight: 500, fontSize: `${baseFont}px`, color: "#000000", minWidth: 0 }}>{item.position}</span>
              <span style={{ fontSize: `${baseFont - 1}px`, color: "#000000", whiteSpace: "nowrap" }}>
                {formatDateRange(item.startDate, item.endDate, item.isPresent)}
              </span>
            </div>
            {item.details && (
              <div style={{ fontSize: `${baseFont}px`, lineHeight: 1.6, marginTop: "4px" }}>{renderRich(item.details)}</div>
            )}
          </PageBlock>
        ))}
      </div>
    </SectionWrapper>
  );
}
