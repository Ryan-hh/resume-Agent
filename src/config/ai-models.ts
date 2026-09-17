// AI 服务商与模型目录：参考 GitHub 开源简历项目的 AI 配置实现，按本项目（纯前端富文本润色）精简
export const AI_PROVIDERS = [
  "openai",
  "deepseek",
  "qwen",
  "gemini",
  "anthropic",
  "zhipu",
  "minimax",
] as const;
export type AIProvider = (typeof AI_PROVIDERS)[number];
export type AIProtocol = "chat-completions" | "gemini" | "anthropic";
// 模型归属厂商：内置厂商或用户自定义（"custom"）
export type AnyProvider = AIProvider | "custom";

export interface AIConnection {
  provider: AnyProvider;
  protocol: AIProtocol;
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface AIModelProfile extends AIConnection {
  id: string;
  name: string;
  /** 官网链接（可选，预设供应商自动填充） */
  website?: string;
}

export interface AISettingsData {
  models: AIModelProfile[];
  textModelId: string | null;
}

export interface BuiltinAIModel {
  id: string;
  name: string;
  description: string;
  recommended?: boolean;
}

interface ProviderDefinition {
  name: string;
  /** 默认请求地址（选中该服务商时自动填入） */
  baseUrl: string;
  /** 默认协议 */
  protocol: AIProtocol;
  /** 该服务商真正支持的协议列表（下拉只显示这些） */
  protocols: readonly AIProtocol[];
  /** 每种支持协议对应的默认请求地址，切换协议时自动带入 */
  protocolBaseUrls: Partial<Record<AIProtocol, string>>;
  keyUrl: string;
  /** 官网链接，选择预设供应商时自动填入 */
  website: string;
}

export const AI_PROVIDER_DEFINITIONS: Record<AIProvider, ProviderDefinition> = {
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    protocol: "chat-completions",
    protocols: ["chat-completions"],
    protocolBaseUrls: { "chat-completions": "https://api.openai.com/v1" },
    keyUrl: "https://platform.openai.com/api-keys",
    website: "https://platform.openai.com",
  },
  deepseek: {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    protocol: "chat-completions",
    protocols: ["chat-completions", "anthropic"],
    protocolBaseUrls: {
      "chat-completions": "https://api.deepseek.com",
      anthropic: "https://api.deepseek.com/anthropic",
    },
    keyUrl: "https://platform.deepseek.com",
    website: "https://platform.deepseek.com",
  },
  qwen: {    name: "通义千问",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    protocol: "chat-completions",
    protocols: ["chat-completions"],
    protocolBaseUrls: {
      "chat-completions": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    },
    keyUrl: "https://bailian.console.aliyun.com",
    website: "https://bailian.console.aliyun.com",
  },
  gemini: {
    name: "Gemini",
    baseUrl: "https://generativelanguage.googleapis.com",
    protocol: "gemini",
    protocols: ["gemini", "chat-completions"],
    protocolBaseUrls: {
      gemini: "https://generativelanguage.googleapis.com",
      "chat-completions": "https://generativelanguage.googleapis.com/v1beta/openai",
    },
    keyUrl: "https://aistudio.google.com/app/apikey",
    website: "https://ai.google.dev",
  },
  anthropic: {
    name: "Claude",
    baseUrl: "https://api.anthropic.com/v1",
    protocol: "anthropic",
    protocols: ["anthropic"],
    protocolBaseUrls: { anthropic: "https://api.anthropic.com/v1" },
    keyUrl: "https://console.anthropic.com/settings/keys",
    website: "https://platform.claude.com",
  },
  zhipu: {
    name: "智谱 GLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    protocol: "chat-completions",
    protocols: ["chat-completions"],
    protocolBaseUrls: { "chat-completions": "https://open.bigmodel.cn/api/paas/v4" },
    keyUrl: "https://open.bigmodel.cn/usercenter/apikeys",
    website: "https://open.bigmodel.cn",
  },
  minimax: {
    name: "MiniMax",
    baseUrl: "https://api.minimax.chat/v1",
    protocol: "chat-completions",
    protocols: ["chat-completions"],
    protocolBaseUrls: { "chat-completions": "https://api.minimax.chat/v1" },
    keyUrl: "https://platform.minimaxi.com",
    website: "https://platform.minimaxi.com",
  },
};

export const BUILTIN_AI_MODELS: Record<AIProvider, readonly BuiltinAIModel[]> = {
  openai: [
    { id: "gpt-5.6-sol", name: "GPT-5.6 Sol", description: "旗舰级推理与复杂写作", recommended: true },
    { id: "gpt-5.6-terra", name: "GPT-5.6 Terra", description: "质量、速度与成本均衡" },
    { id: "gpt-5.6-luna", name: "GPT-5.6 Luna", description: "快速、低成本的日常处理" },
  ],
  deepseek: [
    {
      id: "deepseek-v4-pro",
      name: "DeepSeek V4 Pro",
      description: "旗舰级深度推理与高质量写作",
      recommended: true,
    },
    {
      id: "deepseek-flash",
      name: "DeepSeek Flash",
      description: "快速、低成本的通用对话与润色",
    },
  ],
  qwen: [
    { id: "qwen3.8-max", name: "Qwen 3.8 Max", description: "旗舰级文本生成与推理", recommended: true },
    { id: "qwen3.7-plus", name: "Qwen 3.7 Plus", description: "效果与成本均衡" },
    { id: "qwen3.8-flash", name: "Qwen 3.8 Flash", description: "快速、低成本的批量处理" },
  ],
  gemini: [
    { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", description: "前沿级性能，快速高效", recommended: true },
    { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", description: "复杂推理与高质量生成" },
    { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash-Lite", description: "低成本、高吞吐处理" },
  ],
  anthropic: [
    { id: "claude-opus-4-8", name: "Claude Opus 4.8", description: "旗舰级复杂任务与高质量理解", recommended: true },
    { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", description: "质量与速度均衡" },
    { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", description: "快速、低成本的日常处理" },
  ],
  zhipu: [
    { id: "glm-4-plus", name: "GLM-4 Plus", description: "旗舰级推理与生成", recommended: true },
    { id: "glm-4-flash", name: "GLM-4 Flash", description: "快速、低成本的通用处理" },
    { id: "glm-4-air", name: "GLM-4 Air", description: "轻量高效的日常处理" },
  ],
  minimax: [
    { id: "minimax-text-01", name: "MiniMax Text-01", description: "旗舰级长文本生成", recommended: true },
    { id: "abab6.5s-chat", name: "ABAB 6.5s", description: "通用对话模型" },
  ],
};

export const builtinModelId = (provider: AIProvider, model: string) =>
  `builtin:${provider}:${model}`;

export function createBuiltinModelProfile(
  provider: AIProvider,
  model: BuiltinAIModel,
  apiKey = "",
): AIModelProfile {
  const preset = AI_PROVIDER_DEFINITIONS[provider];
  return {
    id: builtinModelId(provider, model.id),
    provider,
    name: model.name,
    apiKey,
    model: model.id,
    baseUrl: preset.baseUrl,
    protocol: preset.protocol,
  };
}

export function isValidBaseUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return (
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

export const AI_PROTOCOLS: readonly AIProtocol[] = [
  "chat-completions",
  "gemini",
  "anthropic",
];

export function isModelConfigured(
  connection: AIConnection | null | undefined,
): connection is AIConnection {
  return (
    !!connection &&
    !!connection.apiKey.trim() &&
    !!connection.model.trim() &&
    isValidBaseUrl(connection.baseUrl) &&
    AI_PROTOCOLS.includes(connection.protocol)
  );
}

// 厂商显示名：内置厂商取官方名，自定义厂商统一显示"自定义"
export function getProviderLabel(provider: string): string {
  return provider === "custom"
    ? "自定义"
    : AI_PROVIDER_DEFINITIONS[provider as AIProvider]?.name ?? "自定义";
}

export function toAIConnection(profile: AIConnection): AIConnection {
  return {
    provider: profile.provider,
    protocol: profile.protocol,
    apiKey: profile.apiKey.trim(),
    model: profile.model.trim(),
    baseUrl: profile.baseUrl.trim().replace(/\/+$/, ""),
  };
}

export const modelDisplayName = (model: AIModelProfile) =>
  model.name.trim() ||
  model.model ||
  (model.provider === "custom"
    ? "自定义模型"
    : AI_PROVIDER_DEFINITIONS[model.provider].name);
