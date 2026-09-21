import * as React from "react";
import * as ReactDOM from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Switch 开关
interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onCheckedChange, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
        className
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}

// Slider 滑块
interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

export function Slider({ value, onValueChange, min = 0, max = 100, step = 1, disabled, className }: SliderProps) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onValueChange(Number(e.target.value))}
      className={cn(
        "h-2 w-full cursor-pointer appearance-none rounded-full bg-input accent-[var(--color-primary)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={{ accentColor: "var(--color-primary)" }}
    />
  );
}

// Select（自定义下拉：点击弹出选项列表，样式与主题一致，替代原生 select）
interface SelectProps {
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Select({ options, value, onChange, placeholder = "请选择", className, disabled }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number } | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  const popupRef = React.useRef<HTMLDivElement>(null);

  // 打开时按按钮的实际位置计算 fixed 坐标，并挂到 body —— 避免被父容器 overflow 裁切/遮挡
  const openList = () => {
    const node = ref.current;
    if (!node) return;
    const r = node.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.left, width: r.width });
    setOpen(true);
  };

  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      const inPopup = !!popupRef.current && popupRef.current.contains(t);
      if (ref.current && !ref.current.contains(t) && !inPopup) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // 任何滚动/缩放变化都关闭下拉，避免 fixed 位置错位
    const onScroll = () => setOpen(false);
    const onResize = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={cn("relative w-full", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-none border bg-transparent px-3 py-1 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          open ? "border-primary/60 ring-1 ring-primary/20" : "border-input hover:border-input"
        )}
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>
      {open &&
        pos &&
        ReactDOM.createPortal(
          <div
            ref={popupRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
            className="overflow-hidden rounded-none border border-border bg-popover p-1 shadow-lg"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange?.(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center rounded-none px-2.5 py-1.5 text-left text-sm transition-colors",
                  opt.value === value
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-foreground hover:bg-accent"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
