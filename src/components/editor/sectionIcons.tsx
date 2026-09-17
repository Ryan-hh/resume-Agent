import {
  Award,
  Briefcase,
  FileText,
  FolderKanban,
  GraduationCap,
  Laptop,
  Package,
  User,
  Wrench,
  type LucideIcon,
} from "lucide-react";

// 模块 id → 线性图标（替代 emoji）
export const SECTION_ICONS: Record<string, LucideIcon> = {
  basic: User,
  education: GraduationCap,
  skills: Wrench,
  experience: Briefcase,
  internship: Laptop,
  projects: FolderKanban,
  certificates: Award,
  selfEvaluation: FileText,
  custom: Package,
};

// 按模块 id 渲染图标，未知 id（自定义板块）回退到 Package
export function SectionIcon({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const Icon = SECTION_ICONS[id] || Package;
  return <Icon className={className || "h-4 w-4 shrink-0"} />;
}
