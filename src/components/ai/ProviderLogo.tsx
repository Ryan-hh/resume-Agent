import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import OpenAIcon from "@lobehub/icons/es/OpenAI/components/Mono";
import DeepSeekIcon from "@lobehub/icons/es/DeepSeek/components/Color";
import GeminiIcon from "@lobehub/icons/es/Gemini/components/Color";
import AnthropicIcon from "@lobehub/icons/es/Claude/components/Color";
import QwenIcon from "@lobehub/icons/es/Qwen/components/Color";
import ZhipuIcon from "@lobehub/icons/es/Zhipu/components/Color";
import MiniMaxIcon from "@lobehub/icons/es/MiniMax/components/Color";

type IconComponent = ComponentType<{ size?: string | number; className?: string }>;

// 各服务商官方品牌 logo（来自 @lobehub/icons，真实品牌图形）
// OpenAI 官方无彩色版，使用官方单色标识；其余使用官方彩色版
const OFFICIAL: Record<string, IconComponent> = {
  openai: OpenAIcon,
  deepseek: DeepSeekIcon,
  gemini: GeminiIcon,
  anthropic: AnthropicIcon,
  qwen: QwenIcon,
  zhipu: ZhipuIcon,
  minimax: MiniMaxIcon,
};

// 服务商 logo：内置厂商显示官方品牌 logo，自定义显示模型名称首字母占位
export function ProviderLogo({
  provider,
  name,
  className,
  size = 16,
}: {
  provider: string;
  name?: string;
  className?: string;
  size?: string | number;
}) {
  const Icon = OFFICIAL[provider];
  if (Icon) {
    return (
      <Icon
        size={size}
        className={cn("shrink-0", className)}
        aria-hidden="true"
      />
    );
  }
  return (
    <span
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground",
        className
      )}
    >
      {(name || provider).slice(0, 1).toUpperCase()}
    </span>
  );
}
