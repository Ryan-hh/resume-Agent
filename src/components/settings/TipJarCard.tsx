import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, X } from "lucide-react";
import { Card } from "@/components/ui/primitives";

// 打赏板块：静态展示项目内收款码（public/tip-wechat.jpg、public/tip-alipay.jpg），
// 微信 / 支付宝各一张，并排展示；替换 public 下的图片文件即更换收款码，无需上传。
// 点击二维码可放大查看，方便扫码。
export function TipJarCard() {
  const [zoomed, setZoomed] = React.useState<string | null>(null);

  return (
    <Card className="overflow-hidden rounded-2xl">
      {/* 收款码：图片保持小尺寸靠左排列，不占满容器 */}
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap gap-4">
          {/* 微信收款码 */}
          <div className="group relative w-44 cursor-zoom-in overflow-hidden rounded-xl border border-border bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:w-52">
            <img
              src="/tip-wechat.jpg"
              alt="微信收款码"
              className="block h-auto w-full"
              onClick={() => setZoomed("/tip-wechat.jpg")}
            />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-2 pb-1.5 pt-4 text-center text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
              点击放大
            </span>
          </div>

          {/* 支付宝收款码 */}
          <div className="group relative w-44 cursor-zoom-in overflow-hidden rounded-xl border border-border bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:w-52">
            <img
              src="/tip-alipay.jpg"
              alt="支付宝收款码"
              className="block h-auto w-full"
              onClick={() => setZoomed("/tip-alipay.jpg")}
            />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-2 pb-1.5 pt-4 text-center text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
              点击放大
            </span>
          </div>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Heart className="h-3 w-3 text-rose-400" />
          点击二维码放大，长按识别或扫码打赏，感谢支持
        </p>
      </div>

      {/* 放大查看遮罩 */}
      <AnimatePresence>
        {zoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: "none" }}
            transition={{ duration: 0.15 }}
            onClick={() => setZoomed(null)}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm"
          >
            <motion.img
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              src={zoomed}
              alt="收款码大图"
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-[92vw] rounded-xl bg-white p-3 shadow-2xl"
            />
            <button
              onClick={() => setZoomed(null)}
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              title="关闭"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
