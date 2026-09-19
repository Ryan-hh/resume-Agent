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

  switch (variant) {
    case "center":
      return (
        <h3 style={{ ...common, textAlign: "center", marginBottom: "12px" }}>{title}</h3>
      );
    case "line":
      return (
        <div style={{ marginBottom: "12px" }}>
          <h3 style={{ ...common, display: "inline-block", borderBottom: `2px solid ${themeColor}`, paddingBottom: "4px" }}>
            {title}
          </h3>
        </div>
      );
    case "bold":
      return (
        <div style={{ marginBottom: "12px" }}>
          <h3 style={{ ...common, fontSize: `${Math.max(headerSize, 20)}px`, letterSpacing: "0.02em" }}>{title}</h3>
          <div style={{ width: "100%", height: "3px", background: themeColor, marginTop: "6px" }} />
        </div>
      );
    case "elegant":
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <div style={{ flex: 1, height: "1px", background: themeColor, opacity: 0.4 }} />
          <h3 style={{ ...common, whiteSpace: "nowrap" }}>{title}</h3>
          <div style={{ flex: 1, height: "1px", background: themeColor, opacity: 0.4 }} />
        </div>
      );
    case "icon":
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          {renderIcon(icon, headerSize, themeColor)}
          <h3 style={{ ...common }}>{title}</h3>
          <div style={{ flex: 1, height: "1px", background: themeColor, opacity: 0.25 }} />
        </div>
      );
    case "chip":
      // 蓝点风格：实心圆底白图标 + 彩色加粗标题 + 标题右侧延伸同色细线
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
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
          <h3 style={{ ...common, color: themeColor, whiteSpace: "nowrap" }}>{title}</h3>
          <div style={{ flex: 1, height: "2px", background: themeColor, opacity: 0.3 }} />
        </div>
      );
    case "editorial":
      return (
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "12px" }}>
          <span style={{ ...common, color: themeColor, fontFamily: "Georgia, serif" }}>{String(title).slice(0, 1)}</span>
          <h3 style={{ ...common, textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</h3>
        </div>
      );
    default:
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <span style={{ width: "4px", height: `${headerSize}px`, background: themeColor, borderRadius: "2px" }} />
          <h3 style={{ ...common }}>{title}</h3>
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
}: {
  basic: BasicInfo;
  globalSettings: GlobalSettings;
  titleVariant?: SectionTitleVariant;
}) {
  const useIconMode = globalSettings.useIconMode ?? false;
  const layout = basic?.layout || "left";
  const themeColor = globalSettings.themeColor || "#000000";

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

  const layoutStyles = {
    left: {
      container: { display: "flex", flexDirection: "row" as const, alignItems: "center", justifyContent: "space-between", gap: "24px" },
      leftContent: { display: "flex", flexDirection: "row" as const, alignItems: "center", gap: "24px", flexShrink: 0, minWidth: 0, maxWidth: "42%" },
      fields: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "8px 24px", justifyItems: "start" },
    },
    right: {
      container: { display: "flex", flexDirection: "row-reverse" as const, alignItems: "center", justifyContent: "space-between", gap: "24px" },
      leftContent: { display: "flex", flexDirection: "row-reverse" as const, alignItems: "center", gap: "24px", flexShrink: 0, minWidth: 0, maxWidth: "42%" },
      fields: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "8px 24px", justifyItems: "end", textAlign: "right" as const },
    },
    center: {
      container: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "12px" },
      leftContent: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "16px" },
      fields: { display: "flex", flexWrap: "wrap" as const, justifyContent: "center", gap: "12px" },
    },
  };

  const styles = layoutStyles[layout] || layoutStyles.left;
  const baseFont = globalSettings.baseFontSize || 14;
  const nameSize = Math.max(28, baseFont + 14);

  return (
    <SectionWrapper sectionId="basic">
      <PageBlock col={0}>
        <div style={styles.container}>
          <div style={styles.leftContent}>
            {PhotoComponent}
            <div style={{ display: "flex", flexDirection: "column", alignItems: layout === "center" ? "center" : layout === "right" ? "flex-end" : "flex-start" }}>
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
                    color: themeColor,
                    wordBreak: "break-word",
                  }}
                >
                  {title}
                </h2>
              )}
            </div>
          </div>
          <div style={{ ...styles.fields, fontSize: `${baseFont}px`, color: "#4b5563", maxWidth: layout === "center" ? "none" : "600px" }}>
            {allFields.map((item) => (
              <div key={item.key} style={{ display: "flex", minWidth: 0, alignItems: "flex-start" }}>
                {useIconMode ? (
                  <div style={{ display: "flex", minWidth: 0, alignItems: "flex-start", gap: "4px" }}>
                    {renderIcon(item.icon, baseFont + 2)}
                    {item.key === "email" ? (
                      <a href={`mailto:${item.value}`} style={{ minWidth: 0, overflowWrap: "anywhere", color: "inherit" }}>{item.value}</a>
                    ) : (
                      <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{item.value}</span>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", minWidth: 0, alignItems: "flex-start", gap: "8px" }}>
                    <span style={{ flexShrink: 0 }}>{item.label}:</span>
                    <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{item.value}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </PageBlock>
    </SectionWrapper>
  );
}

// ===== 富文本内容渲染 =====
const renderRich = (html: string) => (
  <div className="resume-rich" dangerouslySetInnerHTML={{ __html: html }} />
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
  const themeColor = globalSettings.themeColor || "#000000";
  const items = experiences.filter((e) => e.visible !== false && hasExperienceContent(e));
  return (
    <SectionWrapper sectionId="experience" style={style}>
      <PageBlock col={0} keepNext>
        <SectionTitle title={title || "工作经历"} icon={icon} globalSettings={globalSettings} variant={titleVariant} />
      </PageBlock>
      <div style={{ display: "flex", flexDirection: "column", gap: `${globalSettings.paragraphSpacing || 12}px` }}>
        {items.map((item) => (
          <PageBlock col={0} key={item.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap", minWidth: 0 }}>
                <span style={{ fontWeight: 700, fontSize: `${baseFont + 1}px` }}>{item.company}</span>
                <span style={{ fontWeight: 500, fontSize: `${baseFont}px`, color: themeColor }}>{item.position}</span>
              </div>
              <span style={{ fontSize: `${baseFont - 1}px`, color: "#6b7280", whiteSpace: "nowrap" }}>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap", minWidth: 0 }}>
                <span style={{ fontWeight: 700, fontSize: `${baseFont + 1}px` }}>{item.school}</span>
                {item.major && <span style={{ fontSize: `${baseFont}px` }}>{item.major}</span>}
                {item.degree && <span style={{ fontSize: `${baseFont - 1}px`, color: "#6b7280" }}>{item.degree}</span>}
              </div>
              <span style={{ fontSize: `${baseFont - 1}px`, color: "#6b7280", whiteSpace: "nowrap" }}>
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
  const themeColor = globalSettings.themeColor || "#000000";
  const items = projects.filter((p) => p.visible !== false && hasProjectContent(p));
  return (
    <SectionWrapper sectionId="projects" style={style}>
      <PageBlock col={0} keepNext>
        <SectionTitle title={title || "项目经历"} icon={icon} globalSettings={globalSettings} variant={titleVariant} />
      </PageBlock>
      <div style={{ display: "flex", flexDirection: "column", gap: `${globalSettings.paragraphSpacing || 12}px` }}>
        {items.map((item) => (
          <PageBlock col={0} key={item.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap", minWidth: 0 }}>
                <span style={{ fontWeight: 700, fontSize: `${baseFont + 1}px` }}>{item.name}</span>
                {item.role && <span style={{ fontWeight: 500, fontSize: `${baseFont}px`, color: themeColor }}>{item.role}</span>}
              </div>
              <span style={{ fontSize: `${baseFont - 1}px`, color: "#6b7280", whiteSpace: "nowrap" }}>
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
  const themeColor = globalSettings.themeColor || "#000000";
  const items = internships.filter((e) => e.visible !== false && hasExperienceContent(e));
  return (
    <SectionWrapper sectionId="internship" style={style}>
      <PageBlock col={0} keepNext>
        <SectionTitle title={title || "实习经历"} icon={icon} globalSettings={globalSettings} variant={titleVariant} />
      </PageBlock>
      <div style={{ display: "flex", flexDirection: "column", gap: `${globalSettings.paragraphSpacing || 12}px` }}>
        {items.map((item) => (
          <PageBlock col={0} key={item.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap", minWidth: 0 }}>
                <span style={{ fontWeight: 700, fontSize: `${baseFont + 1}px` }}>{item.company}</span>
                <span style={{ fontWeight: 500, fontSize: `${baseFont}px`, color: themeColor }}>{item.position}</span>
              </div>
              <span style={{ fontSize: `${baseFont - 1}px`, color: "#6b7280", whiteSpace: "nowrap" }}>
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
