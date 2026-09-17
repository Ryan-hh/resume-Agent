import React from "react";
import { useTranslations, zh } from "@/i18n/zh";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function FAQDialog({ trigger }: { trigger: React.ReactNode }) {
  const t = useTranslations();
  const [open, setOpen] = React.useState(false);
  const items = zh.faqDialog.items;

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("faqDialog.title")}</DialogTitle>
            <DialogDescription>
              <div className="flex flex-col gap-4 pt-2 text-left">
                {items.map((item, index) => (
                  <div key={index}>
                    <h4 className="mb-1 font-medium text-foreground">{item.q}</h4>
                    <p className="text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                  </div>
                ))}
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
