import React from "react";
import { ChevronDown, X, Eye, EyeOff, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { Reorder, useDragControls, motion, AnimatePresence } from "framer-motion";
import { useResumeStore } from "@/store/useResumeStore";
import { Experience } from "@/types/resume";
import { Field, RichTextarea } from "../shared/Field";
import { TimeRangeInput, PresentToggle } from "../shared/TimeRange";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function InternshipPanel() {
  const internships = useResumeStore((s) => s.activeResume?.internship) || [];
  const updateInternship = useResumeStore((s) => s.updateInternship);
  const deleteInternship = useResumeStore((s) => s.deleteInternship);

  const moveInternship = (from: number, to: number) => {
    if (to < 0 || to >= internships.length) return;
    const next = [...internships];
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed);
    useResumeStore.getState().updateInternshipBatch(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <Reorder.Group
        axis="y"
        values={internships}
        onReorder={(items) => useResumeStore.getState().updateInternshipBatch(items as Experience[])}
        className="flex flex-col gap-3"
      >
        {internships.map((item, index) => (
          <InternshipItem
            key={item.id}
            item={item}
            index={index}
            total={internships.length}
            onChange={updateInternship}
            onDelete={deleteInternship}
            onMoveUp={() => moveInternship(index, index - 1)}
            onMoveDown={() => moveInternship(index, index + 1)}
          />
        ))}
      </Reorder.Group>
    </div>
  );
}

function InternshipItem({
  item,
  index,
  total,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  item: Experience;
  index: number;
  total: number;
  onChange: (item: Experience) => void;
  onDelete: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [open, setOpen] = React.useState(true);
  const controls = useDragControls();

  const summary = [item.company, item.position].filter(Boolean).join(" · ") || "未命名实习";

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
          <span className="truncate text-sm font-medium">
            <span className={cn(!item.visible && "opacity-50")}>{summary}</span>
          </span>
        </button>
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
          disabled={total <= 1}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
          title={total <= 1 ? "至少保留一条" : "删除该条"}
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
                <Field label="公司">
                  <Input
                    value={item.company}
                    onChange={(e) => onChange({ ...item, company: e.target.value })}
                    placeholder="如 腾讯科技"
                  />
                </Field>
                <Field label="职位">
                  <Input
                    value={item.position}
                    onChange={(e) => onChange({ ...item, position: e.target.value })}
                    placeholder="如 产品实习生"
                  />
                </Field>
              </div>
              <Field
                label="时间"
                labelRight={<PresentToggle checked={!!item.isPresent} onChange={(v) => onChange({ ...item, isPresent: v })} />}
              >
                <TimeRangeInput
                  start={item.startDate}
                  end={item.endDate}
                  isPresent={item.isPresent}
                  onStart={(v) => onChange({ ...item, startDate: v })}
                  onEnd={(v) => onChange({ ...item, endDate: v })}
                />
              </Field>
              <Field label="实习内容">
                <RichTextarea
                  value={item.details}
                  onChange={(v) => onChange({ ...item, details: v })}
                  placeholder="描述主要职责与成果，建议用要点列出（工具栏支持加粗、列表等）"
                contextLabel="实习经历"
                />
              </Field>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}
