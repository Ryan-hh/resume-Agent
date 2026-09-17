import React from "react";
import { ChevronDown, X, Eye, EyeOff, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { Reorder, useDragControls, motion, AnimatePresence } from "framer-motion";
import { useResumeStore } from "@/store/useResumeStore";
import { Education } from "@/types/resume";
import { Field, RichTextarea } from "../shared/Field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/controls";
import { MonthPicker } from "@/components/ui/month-picker";
import { cn } from "@/lib/utils";

const DEGREE_OPTIONS = [
  { value: "大专", label: "大专" },
  { value: "本科", label: "本科" },
  { value: "硕士", label: "硕士" },
  { value: "博士", label: "博士" },
];

export function EducationPanel() {
  const education = useResumeStore((s) => s.activeResume?.education) || [];
  const updateEducation = useResumeStore((s) => s.updateEducation);
  const deleteEducation = useResumeStore((s) => s.deleteEducation);

  const moveEducation = (from: number, to: number) => {
    if (to < 0 || to >= education.length) return;
    const next = [...education];
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed);
    useResumeStore.getState().updateEducationBatch(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <Reorder.Group
        axis="y"
        values={education}
        onReorder={(items) => useResumeStore.getState().updateEducationBatch(items as Education[])}
        className="flex flex-col gap-3"
      >
        {education.map((item, index) => (
          <EducationItem
            key={item.id}
            item={item}
            index={index}
            total={education.length}
            onChange={updateEducation}
            onDelete={deleteEducation}
            onMoveUp={() => moveEducation(index, index - 1)}
            onMoveDown={() => moveEducation(index, index + 1)}
          />
        ))}
      </Reorder.Group>
    </div>
  );
}

function EducationItem({
  item,
  index,
  total,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  item: Education;
  index: number;
  total: number;
  onChange: (item: Education) => void;
  onDelete: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [open, setOpen] = React.useState(true);
  const controls = useDragControls();

  const summary = [item.school, item.major].filter(Boolean).join(" · ") || "未命名教育背景";

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      layout
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/30"
    >
      <div className="flex items-center gap-0.5 px-3 py-2">
        {/* 拖拽手柄 */}
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          className="cursor-grab touch-none rounded p-1 text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
          title="拖动排序"
          aria-label="拖动排序"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setOpen(!open)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="shrink-0">
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={cn("truncate text-sm font-medium", !item.visible && "opacity-50")}>{summary}</span>
          </span>
        </button>
        {/* 上移 / 下移：调换条目顺序 */}
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          title="上移"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          title="下移"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onChange({ ...item, visible: !item.visible })}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {item.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 border-t border-border p-3">
              <div className="grid grid-cols-1 gap-3 @[17rem]:grid-cols-2">
                <Field label="学校名称">
                  <Input
                    value={item.school}
                    onChange={(e) => onChange({ ...item, school: e.target.value })}
                    placeholder="如 武汉大学"
                  />
                </Field>
                <Field label="专业">
                  <Input
                    value={item.major}
                    onChange={(e) => onChange({ ...item, major: e.target.value })}
                    placeholder="如 计算机科学与技术"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 @[17rem]:grid-cols-3">
                <Field label="学历">
                  <Select
                    options={DEGREE_OPTIONS}
                    value={item.degree || ""}
                    onChange={(v) => onChange({ ...item, degree: v })}
                    placeholder="请选择学历"
                    className="h-9 w-full"
                  />
                </Field>
                <div className="col-span-2">
                  <Field label="在校时间">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <MonthPicker
                          value={item.startDate}
                          onChange={(v) => onChange({ ...item, startDate: v })}
                          placeholder="开始年月"
                        />
                      </div>
                      <span className="shrink-0 select-none text-muted-foreground">-</span>
                      <div className="min-w-0 flex-1">
                        <MonthPicker
                          value={item.endDate}
                          onChange={(v) => onChange({ ...item, endDate: v })}
                          placeholder="结束年月"
                        />
                      </div>
                    </div>
                  </Field>
                </div>
              </div>
              <Field label="在校经历（可选）">
                <RichTextarea
                  value={item.description || ""}
                  onChange={(v) => onChange({ ...item, description: v })}
                  placeholder="奖学金、竞赛、学生工作等亮点（工具栏支持加粗、列表）"
                />
              </Field>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}
