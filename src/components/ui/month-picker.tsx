import React from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

// 年-月选择器：只选择年份和月份（用于出生年月等场景）

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function parseYM(value: string): { y: number; m: number } | null {
  if (!value) return null;
  // 兼容完整日期（如 1998-05-20）与点分隔年月（如 2021.07），只取年月部分
  const m = value.match(/^(\d{4})[.-](\d{1,2})/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  return { y, m: mo };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatCN(y: number, m: number): string {
  return `${y}.${pad2(m)}`;
}

type Mode = "month" | "year";

export function MonthPicker({
  value,
  onChange,
  placeholder = "选择年月",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<Mode>("month");
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number } | null>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);

  const parsed = parseYM(value);
  const now = new Date();
  const [view, setView] = React.useState(() => ({
    y: parsed?.y ?? now.getFullYear(),
    m: parsed?.m ?? now.getMonth() + 1,
  }));

  const openPicker = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 250) });
    }
    setOpen(true);
  };

  React.useEffect(() => {
    if (open) {
      setMode("month");
      setView({ y: parsed?.y ?? now.getFullYear(), m: parsed?.m ?? now.getMonth() + 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const year = view.y;

  // 年份视图：以当前年份为中心的 12 年
  const yearStart = year - 5;
  const yearRange = Array.from({ length: 12 }, (_, i) => yearStart + i);

  const handlePickMonth = (m: number) => {
    onChange(`${year}-${pad2(m)}`);
    setOpen(false);
  };

  const handlePickYear = (y: number) => {
    setView({ y, m: view.m });
    setMode("month");
  };

  return (
    <div ref={wrapRef} className="relative">
      <div
        ref={triggerRef}
        className={cn(
          "flex h-9 w-full items-center rounded-md border bg-transparent shadow-sm transition-colors",
          open ? "border-primary/60 ring-1 ring-primary/20" : "border-input hover:border-input"
        )}
      >
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : openPicker())}
          className="flex h-full min-w-0 flex-1 items-center rounded-l-md px-3 text-left text-sm focus-visible:outline-none"
        >
          <span className={cn("truncate", !parsed && "text-muted-foreground")}>
            {parsed ? formatCN(parsed.y, parsed.m) : placeholder}
          </span>
        </button>
        {parsed && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setOpen(false);
            }}
            className="flex h-full shrink-0 items-center px-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="清除出生年月"
            title="清除"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (open) setOpen(false);
            else openPicker();
          }}
          className="flex h-full shrink-0 items-center pl-1 pr-2.5 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="打开年月选择"
        >
          <CalendarDays className="h-4 w-4" />
        </button>
      </div>

      {open && pos && (
        <div
          className="fixed z-[120] rounded-xl border border-border bg-popover p-3 shadow-xl"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          {/* ===== 月份视图 ===== */}
          {mode === "month" && (
            <>
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setView({ y: year - 1, m: view.m })}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="上一年"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setMode("year")}
                  className="rounded-md px-2 py-0.5 text-sm font-medium transition-colors hover:bg-accent"
                >
                  {year} 年
                </button>
                <button
                  type="button"
                  onClick={() => setView({ y: year + 1, m: view.m })}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="下一年"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {MONTHS.map((m) => {
                  const isCurrent = parsed ? m === parsed.m && year === parsed.y : false;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handlePickMonth(m)}
                      className={cn(
                        "flex h-9 items-center justify-center rounded-lg text-sm transition-colors",
                        isCurrent
                          ? "bg-primary font-medium text-primary-foreground"
                          : "text-foreground hover:bg-accent"
                      )}
                    >
                      {m} 月
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ===== 年份视图 ===== */}
          {mode === "year" && (
            <>
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setView({ y: yearStart - 1, m: view.m })}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="前 12 年"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium">
                  {yearStart} - {yearStart + 11}
                </span>
                <button
                  type="button"
                  onClick={() => setView({ y: yearStart + 11, m: view.m })}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="后 12 年"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {yearRange.map((y) => {
                  const isCurrent = y === year;
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => handlePickYear(y)}
                      className={cn(
                        "flex h-9 items-center justify-center rounded-lg text-sm transition-colors",
                        isCurrent ? "bg-primary/10 font-medium text-primary" : "text-foreground hover:bg-accent"
                      )}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
