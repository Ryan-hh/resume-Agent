import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AlertDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  };

  return (
    <AlertDialogContext.Provider value={{ open: isOpen, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

const AlertDialogContext = React.createContext<{ open: boolean; setOpen: (v: boolean) => void }>({
  open: false,
  setOpen: () => {},
});

export const AlertDialogTrigger = ({
  asChild,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }) => {
  const { setOpen } = React.useContext(AlertDialogContext);
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setOpen(true);
        props.onClick?.(e);
      }}
    >
      {children}
    </div>
  );
};

export function AlertDialogContent({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open, setOpen } = React.useContext(AlertDialogContext);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center">
          {/* 背景淡入淡出 */}
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          {/* 内容：淡入 + 轻微上移缩放 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative z-10 w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl",
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export const AlertDialogHeader = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}>{children}</div>
);

export const AlertDialogFooter = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4", className)}>
    {children}
  </div>
);

export const AlertDialogTitle = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <h2 className={cn("text-lg font-semibold", className)}>{children}</h2>
);

export const AlertDialogDescription = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>
);

export const AlertDialogAction = ({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const { setOpen } = React.useContext(AlertDialogContext);
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90",
        className
      )}
      onClick={(e) => {
        props.onClick?.(e);
        setOpen(false);
      }}
    >
      {children}
    </button>
  );
};

export const AlertDialogCancel = ({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const { setOpen } = React.useContext(AlertDialogContext);
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
        className
      )}
      onClick={(e) => {
        props.onClick?.(e);
        setOpen(false);
      }}
    >
      {children}
    </button>
  );
};
