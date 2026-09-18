import React from "react";
import { ChevronDown, X, Eye, EyeOff, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { Reorder, useDragControls, motion, AnimatePresence } from "framer-motion";
import { useResumeStore } from "@/store/useResumeStore";
import { Project } from "@/types/resume";
import { Field, RichTextarea } from "../shared/Field";
import { TimeRangeInput, PresentToggle } from "../shared/TimeRange";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ProjectPanel() {
  const projects = useResumeStore((s) => s.activeResume?.projects) || [];
  const updateProjects = useResumeStore((s) => s.updateProjects);
  const deleteProject = useResumeStore((s) => s.deleteProject);

  const moveProject = (from: number, to: number) => {
    if (to < 0 || to >= projects.length) return;
    const next = [...projects];
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed);
    useResumeStore.getState().updateProjectsBatch(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <Reorder.Group
        axis="y"
        values={projects}
        onReorder={(items) => useResumeStore.getState().updateProjectsBatch(items as Project[])}
        className="flex flex-col gap-3"
      >
        {projects.map((item, index) => (
          <ProjectItem
            key={item.id}
            item={item}
            index={index}
            total={projects.length}
            onChange={updateProjects}
            onDelete={deleteProject}
            onMoveUp={() => moveProject(index, index - 1)}
            onMoveDown={() => moveProject(index, index + 1)}
          />
        ))}
      </Reorder.Group>
    </div>
  );
}

function ProjectItem({
  item,
  index,
  total,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  item: Project;
  index: number;
  total: number;
  onChange: (item: Project) => void;
  onDelete: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [open, setOpen] = React.useState(true);
  const controls = useDragControls();

  const summary = item.name || item.role || "未命名项目";

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
                <Field label="项目名称">
                  <Input
                    value={item.name}
                    onChange={(e) => onChange({ ...item, name: e.target.value })}
                    placeholder="如 简历制作系统"
                  />
                </Field>
                <Field label="担任角色">
                  <Input
                    value={item.role}
                    onChange={(e) => onChange({ ...item, role: e.target.value })}
                    placeholder="如 前端负责人"
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
              <Field label="项目描述">
                <RichTextarea
                  value={item.description}
                  onChange={(v) => onChange({ ...item, description: v })}
                />
              </Field>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}
