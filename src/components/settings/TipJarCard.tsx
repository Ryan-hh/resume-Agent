import React from "react";
import { Coffee, Heart } from "lucide-react";
import { Card } from "@/components/ui/primitives";

// 打赏板块：静态展示项目内收款码（public/tip-wechat.jpg、public/tip-alipay.jpg），
// 微信 / 支付宝各一张，并排展示；替换 public 下的图片文件即更换收款码，无需上传
export function TipJarCard() {
  return (
    <Card className="overflow-hidden rounded-2xl">
      {/* 头部 */}
      <div className="flex items-center gap-3 border-b border-border/60 bg-muted/20 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Coffee className="h-5 w-5 text-primary" />
        </span>
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">支持开发者</h3>
          <p className="mt-1 text-xs text-muted-foreground">如果这个工具帮到了你，欢迎打赏一杯咖啡</p>
        </div>
      </div>

      {/* 收款码 */}
      <div className="p-5">
        <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
          {/* 微信收款码 */}
          <div className="group relative overflow-hidden rounded-xl border border-border bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <img src="/tip-wechat.jpg" alt="微信收款码" className="block h-auto w-full" />
          </div>

          {/* 支付宝收款码 */}
          <div className="group relative overflow-hidden rounded-xl border border-border bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <img src="/tip-alipay.jpg" alt="支付宝收款码" className="block h-auto w-full" />
          </div>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Heart className="h-3 w-3 text-rose-400" />
          长按识别或扫码打赏，感谢支持
        </p>
      </div>
    </Card>
  );
}
