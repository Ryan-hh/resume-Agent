import * as React from "react";
import { cn } from "@/lib/utils";

// 卡片
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-card text-card-foreground shadow-sm", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)}>{children}</div>;
}

export function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={cn("font-semibold leading-none tracking-tight", className)}>{children}</h3>;
}

export function CardDescription({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>;
}

export function CardContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-6 pt-0", className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex items-center p-6 pt-0", className)}>{children}</div>;
}

// Alert 提示条
export function Alert({
  className,
  variant,
  children,
}: {
  className?: string;
  variant?: "default" | "destructive";
  children: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-lg border p-4 text-sm",
        variant === "destructive"
          ? "border-destructive/50 text-destructive"
          : "border-border bg-background text-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}

export const AlertTitle = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <h5 className={cn("mb-1 font-medium leading-none tracking-tight", className)}>{children}</h5>
);

export const AlertDescription = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("text-sm [&_p]:leading-relaxed", className)}>{children}</div>
);

// 滚动区
export function ScrollArea({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("overflow-auto", className)}>{children}</div>;
}
