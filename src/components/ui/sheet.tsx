import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Sheet 侧滑面板
const SheetContext = React.createContext<{ open: boolean; setOpen: (v: boolean) => void }>({
  open: false,
  setOpen: () => {},
});

export function Sheet({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <SheetContext.Provider value={{ open, setOpen }}>
      {children}
    </SheetContext.Provider>
  );
}

export const SheetTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, onClick, ...props }, ref) => {
  const { setOpen, open } = React.useContext(SheetContext);
  return (
    <button
      ref={ref}
      className={className}
      onClick={(e) => {
        onClick?.(e);
        setOpen(!open);
      }}
      {...props}
    >
      {children}
    </button>
  );
});
SheetTrigger.displayName = "SheetTrigger";

export function SheetClose({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { setOpen } = React.useContext(SheetContext);
  return (
    <button className={className} onClick={() => setOpen(false)}>
      {children}
    </button>
  );
}

export function SheetContent({
  side = "left",
  className,
  children,
}: {
  side?: "left" | "right" | "bottom";
  className?: string;
  children: React.ReactNode;
}) {
  const { open, setOpen } = React.useContext(SheetContext);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const isRight = side === "right";
  const isBottom = side === "bottom";

  const variants = isBottom
    ? { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" } }
    : { initial: { x: isRight ? "100%" : "-100%" }, animate: { x: 0 }, exit: { x: isRight ? "100%" : "-100%" } };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[105]">
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            {...variants}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              "absolute flex border-border bg-background shadow-2xl",
              isBottom
                ? "inset-x-0 bottom-0 max-h-[85vh] flex-col rounded-t-2xl border-t"
                : isRight
                  ? "right-0 top-0 bottom-0 w-full max-w-md flex-col border-l"
                  : "left-0 top-0 bottom-0 w-full max-w-md flex-col border-r",
              className
            )}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export const SheetHeader = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("flex flex-col space-y-2 p-6 pb-2", className)}>{children}</div>
);

export const SheetTitle = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <h2 className={cn("text-lg font-semibold", className)}>{children}</h2>
);

export const SheetDescription = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>
);
