import React from "react";
import { toast } from "sonner";
import { Coffee, RotateCcw, Upload } from "lucide-react";
import { Card } from "@/components/ui/primitives";

const TIP_CODE_KEY = "resume-assistant-tip-code";
const DEFAULT_TIP_CODE = "/tip-code-default.svg";

// 打赏板块：默认展示占位收款码，hover 点击可换成自己的收款码（仅存本地浏览器）
export function TipJarCard() {
  const [tipImage, setTipImage] = React.useState<string | null>(() => {
    try {
      return localStorage.getItem(TIP_CODE_KEY);
    } catch {
      return null;
    }
  });
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : null;
      if (!dataUrl) return;
      setTipImage(dataUrl);
      try {
        localStorage.setItem(TIP_CODE_KEY, dataUrl);
      } catch {
        // 图片过大超出 localStorage 配额时仅本次生效
      }
      toast.success("收款码已更新");
    };
    reader.readAsDataURL(file);
  };

  const resetDefault = () => {
    setTipImage(null);
    try {
      localStorage.removeItem(TIP_CODE_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md p-5">
      <div className="mb-4 flex items-baseline gap-2">
        <Coffee className="h-4 w-4 shrink-0 translate-y-0.5 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">支持开发者</h3>
        <span className="text-xs text-muted-foreground">如果这个工具帮到了你，欢迎打赏</span>
      </div>

      {/* 收款码：hover 显示"更换收款码" */}
      <div className="group relative mx-auto w-44 overflow-hidden rounded-xl border border-border bg-white">
        <img
          src={tipImage || DEFAULT_TIP_CODE}
          alt="收款码"
          className="block h-auto w-full"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          title="更换收款码"
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/0 text-white opacity-0 transition-all duration-200 group-hover:bg-black/50 group-hover:opacity-100"
        >
          <Upload className="h-5 w-5" />
          <span className="text-xs font-medium">更换收款码</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>收款码仅保存在本地浏览器</span>
        {tipImage && (
          <button
            type="button"
            onClick={resetDefault}
            className="flex items-center gap-1 rounded px-1.5 py-1 transition-colors hover:bg-accent hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            恢复默认
          </button>
        )}
      </div>
    </Card>
  );
}
