import React from "react";
import {
  Upload,
  X,
  Plus,
  UserRound,
  User,
  Briefcase,
  CalendarDays,
  Cake,
  Mail,
  Phone,
  MapPin,
  BadgeCheck,
  Globe,
  Github,
  Heart,
  Languages,
  Link,
  Star,
  BookOpen,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { CustomFieldType, PHOTO_RADIUS_OPTIONS, getPhotoRadius } from "@/types/resume";
import { Field } from "../shared/Field";
import { Input, Label } from "@/components/ui/input";
import { MonthPicker } from "@/components/ui/month-picker";
import { Select, Switch } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GENDER_OPTIONS = [
  { value: "", label: "不填" },
  { value: "男", label: "男" },
  { value: "女", label: "女" },
];

// 基本信息编辑：头像固定尺寸 + 默认占位；个人信息字段固定顺序展示
export function BasicPanel() {
  const basic = useResumeStore((s) => s.activeResume?.basic);
  const updateBasicInfo = useResumeStore((s) => s.updateBasicInfo);

  if (!basic) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateBasicInfo({ photo: reader.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // 允许重复选择同一张照片
  };

  const photoVisible = basic.photoConfig?.visible !== false;

  // 头像框：固定一寸照比例（3:4，90×120），圆角可调
  const PHOTO_H = 120;
  const PHOTO_W = 90;
  const PHOTO_R = getPhotoRadius(basic.photoConfig);

  const FieldLabel = ({ icon: Icon, text }: { icon: LucideIcon; text: string }) => (
    <span className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />
      {text}
    </span>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* 头像 */}
      <section className="rounded-xl border border-border p-4">
        <h3 className="mb-3 text-sm font-semibold">头像</h3>
        <div className="flex items-start gap-5">
          {/* 头像框：容器不裁切，圆角应用到照片本身；右上角移除按钮完整显示 */}
          <div
            className="group relative shrink-0 border border-border"
            style={{ width: PHOTO_W, height: PHOTO_H, borderRadius: PHOTO_R }}
          >
            {basic.photo ? (
              <img
                src={basic.photo}
                alt="头像"
                className="h-full w-full object-cover"
                style={{ borderRadius: PHOTO_R }}
              />
            ) : (
              <div
                className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-muted/40"
                style={{ borderRadius: PHOTO_R }}
              >
                <UserRound className="h-9 w-9 text-muted-foreground/40" />
                <span className="text-[11px] text-muted-foreground">未上传</span>
              </div>
            )}

            {/* 移除照片：右上角小按钮（有照片时显示） */}
            {basic.photo && (
              <button
                type="button"
                onClick={() => updateBasicInfo({ photo: "" })}
                className="absolute right-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white/90 transition-colors hover:bg-destructive"
                title="移除照片"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {/* 悬停遮罩：上传 / 更换 */}
            <label
              className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center gap-1 bg-black/45 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
              style={{ borderRadius: PHOTO_R }}
            >
              <Upload className="h-3.5 w-3.5" />
              {basic.photo ? "更换" : "上传"}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>

          {/* 右侧：显示开关 + 圆角 */}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-xs text-muted-foreground">在简历中显示</span>
              <Switch
                checked={photoVisible}
                onCheckedChange={(v) =>
                  updateBasicInfo({ photoConfig: { ...basic.photoConfig, visible: v } })
                }
              />
            </div>

            {/* 圆角：直角 / 圆角 / 圆形 */}
            <div>
              <span className="text-xs text-muted-foreground">圆角</span>
              <div className="mt-1 grid grid-cols-3 gap-1">
                {PHOTO_RADIUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      updateBasicInfo({ photoConfig: { ...basic.photoConfig, borderRadius: opt.value } })
                    }
                    className={cn(
                      "rounded-md border px-1 py-1 text-[11px] transition-colors",
                      (basic.photoConfig?.borderRadius ?? "none") === opt.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          悬停头像可上传或更换照片，右上角可移除；头像固定一寸照比例（3:4）。
        </p>
      </section>

      {/* 个人信息（字段顺序固定） */}
      <section className="rounded-xl border border-border p-4">
        <h3 className="mb-3 text-sm font-semibold">个人信息</h3>
        <div className="grid grid-cols-1 gap-3 @[17rem]:grid-cols-2">
          <Field label={<FieldLabel icon={User} text="姓名" />}>
            <Input
              value={basic.name}
              onChange={(e) => updateBasicInfo({ name: e.target.value })}
              placeholder="如 小昊"
            />
          </Field>
          <Field label={<FieldLabel icon={Briefcase} text="职位" />}>
            <Input
              value={basic.title}
              onChange={(e) => updateBasicInfo({ title: e.target.value })}
              placeholder="如 高级前端工程师"
            />
          </Field>
          <Field label={<FieldLabel icon={CalendarDays} text="出生年月" />}>
            <MonthPicker
              value={basic.birthDate}
              onChange={(v) => updateBasicInfo({ birthDate: v })}
              placeholder="选择出生年月"
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Cake className="h-3.5 w-3.5 text-muted-foreground/70" />
                年龄
              </span>
            </Label>
            <div className="flex h-9 items-center justify-between gap-2 rounded-md border border-input px-3">
              <span className="truncate text-sm text-muted-foreground">显示年龄</span>
              <Switch
                checked={!!basic.showAge}
                onCheckedChange={(v) => updateBasicInfo({ showAge: v })}
              />
            </div>
          </div>
          <Field label={<FieldLabel icon={UserRound} text="性别" />}>
            <Select
              options={GENDER_OPTIONS}
              value={basic.gender || ""}
              onChange={(v) => updateBasicInfo({ gender: v })}
              placeholder="选择性别"
            />
          </Field>
          <Field label={<FieldLabel icon={BadgeCheck} text="政治面貌" />}>
            <Input
              value={basic.politicalStatus || ""}
              onChange={(e) => updateBasicInfo({ politicalStatus: e.target.value })}
              placeholder="如 中共党员"
            />
          </Field>
          <Field label={<FieldLabel icon={Phone} text="电话" />}>
            <Input
              value={basic.phone}
              onChange={(e) => updateBasicInfo({ phone: e.target.value })}
              placeholder="如 177****3711"
            />
          </Field>
          <Field label={<FieldLabel icon={Mail} text="邮箱" />}>
            <Input
              value={basic.email}
              onChange={(e) => updateBasicInfo({ email: e.target.value })}
              placeholder="如 name@example.com"
            />
          </Field>
          <Field label={<FieldLabel icon={MapPin} text="所在地" />}>
            <Input
              value={basic.location}
              onChange={(e) => updateBasicInfo({ location: e.target.value })}
              placeholder="如 湖北省省武汉市"
            />
          </Field>
        </div>
      </section>

      {/* 自定义字段 */}
      <CustomFields
        fields={basic.customFields || []}
        onChange={(customFields) => updateBasicInfo({ customFields })}
      />
    </div>
  );
}

// 自定义字段标签（图标）选项：有限范围内选择
const CUSTOM_ICON_OPTIONS: { name: string; label: string; icon: LucideIcon }[] = [
  { name: "Globe", label: "网站", icon: Globe },
  { name: "Github", label: "GitHub", icon: Github },
  { name: "MapPin", label: "地址", icon: MapPin },
  { name: "Phone", label: "电话", icon: Phone },
  { name: "Mail", label: "邮箱", icon: Mail },
  { name: "Heart", label: "爱好", icon: Heart },
  { name: "Languages", label: "语言", icon: Languages },
  { name: "Link", label: "链接", icon: Link },
  { name: "Star", label: "荣誉", icon: Star },
  { name: "BookOpen", label: "著作", icon: BookOpen },
];

// 自定义字段
function CustomFields({
  fields,
  onChange,
}: {
  fields: CustomFieldType[];
  onChange: (fields: CustomFieldType[]) => void;
}) {
  return (
    <section className="rounded-xl border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">自定义字段</h3>
        <span className="text-xs text-muted-foreground">简历中没有的字段，可在此添加</span>
      </div>
      {fields.length > 0 && (
        <div className="mb-3 flex flex-col gap-2">
          {fields.map((field) => (
            <div key={field.id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
              <CustomIconPicker
                value={field.icon || ""}
                onChange={(icon) =>
                  onChange(fields.map((f) => (f.id === field.id ? { ...f, icon } : f)))
                }
              />
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 @[17rem]:grid-cols-[1fr_1.2fr]">
                <Input
                  value={field.label}
                  onChange={(e) =>
                    onChange(fields.map((f) => (f.id === field.id ? { ...f, label: e.target.value } : f)))
                  }
                  placeholder="字段名"
                  className="h-8"
                />
                <Input
                  value={field.value}
                  onChange={(e) =>
                    onChange(fields.map((f) => (f.id === field.id ? { ...f, value: e.target.value } : f)))
                  }
                  placeholder="字段值"
                  className="h-8"
                />
              </div>
              <button
                onClick={() => onChange(fields.filter((f) => f.id !== field.id))}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="删除该字段"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs"
        onClick={() =>
          onChange([
            ...fields,
            { id: `custom-${Date.now()}`, label: "", value: "", icon: "Tag", visible: true },
          ])
        }
      >
        <Plus className="h-4 w-4" />
        添加自定义字段
      </Button>
    </section>
  );
}

// 自定义字段标签（图标）选择器
function CustomIconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number } | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);

  const Current = CUSTOM_ICON_OPTIONS.find((o) => o.name === value)?.icon || Tag;

  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const openPicker = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({ top: rect.bottom + 6, left: rect.left, width: 216 });
    }
    setOpen(true);
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="选择标签"
      >
        <Current className="h-4 w-4" />
      </button>
      {open && pos && (
        <div
          className="fixed z-[120] grid grid-cols-5 gap-1 rounded-xl border border-border bg-popover p-2 shadow-xl"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          {CUSTOM_ICON_OPTIONS.map((opt) => (
            <button
              key={opt.name}
              type="button"
              onClick={() => {
                onChange(opt.name);
                setOpen(false);
              }}
              className={cn(
                "flex h-9 items-center justify-center rounded-lg transition-colors",
                opt.name === value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              title={opt.label}
            >
              <opt.icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
