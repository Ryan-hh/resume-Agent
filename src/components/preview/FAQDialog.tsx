import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function FAQDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const items = [
    { q: "数据存在哪里？", a: "所有简历数据仅保存在你的浏览器 localStorage 中，不会上传到任何服务器。建议在设置中配置本地备份目录。" },
    { q: "如何导出 PDF？", a: "点击顶栏的导出按钮，选择「导出 PDF」或「打印」，即可获得适合投递的 A4 版 PDF 文件。" },
    { q: "如何找回误删的简历？", a: "如果配置了本地备份目录，可在备份文件夹中找到对应 JSON 文件，再通过「导入」恢复。" },
  ];

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>使用帮助</DialogTitle>
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
