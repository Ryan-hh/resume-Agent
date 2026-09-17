import * as React from "react";
import { cn } from "@/lib/utils";

// 简单 Tooltip：hover 显示
interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  delayDuration?: number;
  className?: string;
}

export function Tooltip({ children, content, side = "bottom", sideOffset = 8, delayDuration = 100, className }: TooltipProps) {
  const [visible, setVisible] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>();

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(true), delayDuration);
  };
  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  const sideClasses: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span
          className={cn(
            "pointer-events-none absolute z-[120] whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-lg",
            sideClasses[side],
            className
          )}
          style={{ marginLeft: side === "right" ? sideOffset : undefined, marginRight: side === "left" ? sideOffset : undefined, marginTop: side === "bottom" ? sideOffset : undefined, marginBottom: side === "top" ? sideOffset : undefined }}
        >
          {content}
        </span>
      )}
    </span>
  );
}

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const TooltipTrigger = ({ asChild, children }: { asChild?: boolean; children: React.ReactNode }) => <>{children}</>;
export const TooltipContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={className}>{children}</span>
);
