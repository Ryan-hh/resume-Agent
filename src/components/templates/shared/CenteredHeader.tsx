import React from "react";
import * as Icons from "lucide-react";
import { BasicInfo, GlobalSettings, getPhotoRadius } from "@/types/resume";
import { SectionWrapper, PageBlock } from "./sections";

// 联系字段（与 BaseInfoSection 展示顺序一致）
function collectContactFields(basic: BasicInfo): { icon: string; value: string }[] {
  const fields: { icon: string; value: string }[] = [];
  const push = (icon: string, value: string | undefined) => {
    if (value && value.trim()) fields.push({ icon, value: value.trim() });
  };
  push("Phone", basic.phone);
  push("Mail", basic.email);
  if (basic.birthDate) {
    const d = new Date(basic.birthDate.replace(/-/g, "/"));
    if (!Number.isNaN(d.getTime())) {
      let age = new Date().getFullYear() - d.getFullYear();
      const m = new Date().getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && new Date().getDate() < d.getDate())) age--;
      if (age >= 0) push("Cake", `${age}岁`);
    }
  }
  push("User", basic.gender);
  push("BadgeCheck", basic.politicalStatus);
  push("MapPin", basic.location);
  return fields;
}

function ContactIcon({ name, size = 13 }: { name: string; size?: number }) {
  const Cmp = (Icons as unknown as Record<string, React.ElementType>)[name];
  if (!Cmp) return null;
  return <Cmp style={{ width: size, height: size, flexShrink: 0, marginTop: "0.15em" }} />;
}

/**
 * 居中头部：姓名居中 + 联系字段居中 + 证件照居右上角。
 * 复刻自用户提供的 PDF 简历版式（经典蓝/超级蓝/极简灰/标签黑/深色科技 共用头部）。
 */
export default function CenteredHeader({
  basic,
  globalSettings,
  themeColor,
  showHeaderRule = false,
}: {
  basic: BasicInfo;
  globalSettings: GlobalSettings;
  themeColor: string;
  showHeaderRule?: boolean;
}) {
  const baseFont = globalSettings.baseFontSize || 14;
  const name = basic?.name || "";
  const title = basic?.title || "";
  const contactFields = collectContactFields(basic);

  const photoVisible = basic.photoConfig?.visible !== false;
  const PHOTO_W = 90;
  const PHOTO_H = 120;

  return (
    <SectionWrapper sectionId="basic">
      <PageBlock col={0}>
        <div style={{ position: "relative", marginBottom: "20px" }}>
          {photoVisible && (
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: PHOTO_W,
                height: PHOTO_H,
                borderRadius: getPhotoRadius(basic.photoConfig),
                overflow: "hidden",
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
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", textAlign: "center" }}>
            {name && (
              <h1 style={{ fontWeight: 700, fontSize: `${Math.max(28, baseFont + 16)}px`, margin: 0, lineHeight: 1.2, letterSpacing: "0.04em" }}>
                {name}
              </h1>
            )}
            {title && (
              <h2 style={{ fontSize: `${globalSettings.subheaderSize || 15}px`, margin: 0, fontWeight: 500, color: themeColor }}>
                {title}
              </h2>
            )}
            {contactFields.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px 18px", fontSize: `${baseFont}px`, color: "#4b5563" }}>
                {contactFields.map((f, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <ContactIcon name={f.icon} />
                    <span>{f.value}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {showHeaderRule && (
            <div style={{ width: "100%", height: "1px", background: "#E5E7EB", marginTop: "16px" }} />
          )}
        </div>
      </PageBlock>
    </SectionWrapper>
  );
}
