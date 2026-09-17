import React from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Check,
  ExternalLink,
  ShieldCheck,
  Wifi,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  AI_PROVIDERS,
  AI_PROVIDER_DEFINITIONS,
  BUILTIN_AI_MODELS,
  AI_PROTOCOLS,
  isModelConfigured,
  type AIModelProfile,
  type AIProvider,
  type AIConnection,
  type AIProtocol,
} from "@/config/ai-models";
import { useAIConfigStore } from "@/store/useAIConfigStore";
import { testAIConnection, AIRequestError } from "@/lib/ai-request";
import { Card } from "@/components/ui/primitives";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/controls";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { ProviderLogo } from "@/components/ai/ProviderLogo";
import { cn } from "@/lib/utils";

type TestState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "success" }
  | { status: "error"; message: string };

// 从 store 中取该厂商的配置；没有则返回默认配置（仅内置信息，Key 为空）
function getProviderProfile(models: AIModelProfile[], provider: AIProvider): AIModelProfile {
  const existing = models.find((m) => m.provider === provider);
  if (existing) return existing;
  const def = AI_PROVIDER_DEFINITIONS[provider];
  return {
    id: `provider:${provider}`,
    provider,
    name: def.name,
    website: def.website,
    apiKey: "",
    model: BUILTIN_AI_MODELS[provider][0]?.id ?? "",
    baseUrl: def.baseUrl,
    protocol: def.protocol,
  };
}

const PROTOCOL_LABELS: Record<AIProtocol, string> = {
  "chat-completions": "OpenAI 兼容",
  gemini: "Gemini 原生",
  anthropic: "Anthropic",
};

function testErrorMessage(error: unknown): string {
  let message = "连接失败，请检查配置";
  if (error instanceof AIRequestError) {
    const map: Record<string, string> = {
      networkError: "网络错误或跨域限制，请检查请求地址",
      timeout: "连接超时，请稍后重试",
      unauthorized: "密钥无效或无权限",
      modelNotFound: "模型不存在，请检查模型名称",
      badRequest: "请求参数错误",
      upstreamError: "服务端返回错误",
    };
    message = map[error.code] ?? message;
    if (error.message && error.code !== "networkError") {
      message += `：${error.message}`;
    }
  }
  return message;
}

// AI 配置页：供应商为中心——填写即自动保存；测试连接仅用于验证当前配置
export default function AISettingsPage() {
  const models = useAIConfigStore((s) => s.models);
  const textModelId = useAIConfigStore((s) => s.textModelId);
  const saveModel = useAIConfigStore((s) => s.saveModel);
  const deleteModel = useAIConfigStore((s) => s.deleteModel);
  const assignModel = useAIConfigStore((s) => s.assignModel);

  const [selectedId, setSelectedId] = React.useState("provider:deepseek");

  const selectedProfile = React.useMemo(() => {
    const found = models.find((m) => m.id === selectedId);
    if (found) return found;
    const provider = selectedId.startsWith("provider:")
      ? (selectedId.replace("provider:", "") as AIProvider)
      : null;
    if (provider && provider in AI_PROVIDER_DEFINITIONS) {
      return getProviderProfile(models, provider);
    }
    return null;
  }, [models, selectedId]);

  const isPreset = !!selectedProfile && selectedProfile.provider !== "custom";
  const presetDef = isPreset
    ? AI_PROVIDER_DEFINITIONS[selectedProfile!.provider as AIProvider]
    : null;

  // ---- 表单状态 ----
  const [nameInput, setNameInput] = React.useState("");
  const [websiteInput, setWebsiteInput] = React.useState("");
  const [keyInput, setKeyInput] = React.useState("");
  const [showKey, setShowKey] = React.useState(false);
  const [modelInput, setModelInput] = React.useState("");
  const [baseUrlInput, setBaseUrlInput] = React.useState("");
  const [protocolInput, setProtocolInput] = React.useState<AIProtocol>("chat-completions");
  const [testState, setTestState] = React.useState<TestState>({ status: "idle" });
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  // 切换供应商时同步表单
  React.useEffect(() => {
    if (!selectedProfile) return;
    setNameInput(selectedProfile.name ?? "");
    setWebsiteInput(selectedProfile.website ?? "");
    setKeyInput(selectedProfile.apiKey ?? "");
    setModelInput(selectedProfile.model ?? "");
    setBaseUrlInput(selectedProfile.baseUrl ?? "");
    setProtocolInput(selectedProfile.protocol ?? "chat-completions");
    setShowKey(false);
    setTestState({ status: "idle" });
  }, [selectedProfile]);

  // ---- 自动保存（防抖）：任何表单字段变化都会在停顿后写入 store ----
  const profileRef = React.useRef(selectedProfile);
  profileRef.current = selectedProfile;
  React.useEffect(() => {
    const p = profileRef.current;
    if (!p) return;
    const timer = setTimeout(() => {
      saveModel({
        ...p,
        name: nameInput.trim() || p.name,
        website: websiteInput.trim(),
        apiKey: keyInput.trim(),
        model: modelInput.trim(),
        baseUrl: baseUrlInput.trim().replace(/\/+$/, ""),
        protocol: protocolInput,
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [nameInput, websiteInput, keyInput, modelInput, baseUrlInput, protocolInput]);

  const customProfiles = models.filter((m) => m.provider === "custom");
  const configuredCount = AI_PROVIDERS.filter((p) =>
    isModelConfigured(getProviderProfile(models, p))
  ).length;
  const isCurrent = !!selectedProfile && textModelId === selectedProfile.id;

  // ---- 动作 ----
  const handleTest = async () => {
    if (!selectedProfile) return;
    const key = keyInput.trim();
    const model = modelInput.trim();
    if (!key) {
      toast.error("请先填写 API Key");
      return;
    }
    if (!model) {
      toast.error("请填写模型名称");
      return;
    }
    setTestState({ status: "running" });
    try {
      const connection: AIConnection = {
        provider: selectedProfile.provider,
        protocol: protocolInput,
        apiKey: key,
        model,
        baseUrl: baseUrlInput.trim().replace(/\/+$/, ""),
      };
      await testAIConnection(connection);
      setTestState({ status: "success" });
      toast.success("连接成功，该 Key 与模型可用");
    } catch (error) {
      const message = testErrorMessage(error);
      setTestState({ status: "error", message });
      toast.error(message);
    }
  };

  const handleAddCustom = () => {
    const id = `custom-${Date.now()}`;
    const count = customProfiles.length + 1;
    saveModel({
      id,
      provider: "custom",
      name: `自定义供应商 ${count}`,
      website: "",
      apiKey: "",
      model: "",
      baseUrl: "",
      protocol: "chat-completions",
    });
    setSelectedId(id);
  };

  const handleDeleteCurrent = () => {
    if (!selectedProfile || isPreset) return;
    deleteModel(selectedProfile.id);
    setSelectedId("provider:deepseek");
    setDeleteOpen(false);
    toast.success("自定义供应商已删除");
  };

  // 左栏单选：勾选哪个供应商，润色就走哪个（仅已配置完整的可选）
  const toggleCurrent = (profile: AIModelProfile) => {
    if (textModelId === profile.id) {
      assignModel(null);
      toast.success("已取消指定润色模型");
      return;
    }
    if (!isModelConfigured(profile)) {
      toast.error("该供应商尚未配置完整，请先填写 API Key 与模型并保存");
      return;
    }
    assignModel(profile.id);
    toast.success("当前润色模型已切换");
  };

  // 单选圆钮：当前使用 = 实心高亮；可配置 = 空心可点；未配置 = 置灰不可点
  const RadioDot = ({ profile }: { profile: AIModelProfile }) => {
    const current = textModelId === profile.id;
    const configured = isModelConfigured(profile);
    return (
      <button
        type="button"
        onClick={() => toggleCurrent(profile)}
        title={
          current
            ? "当前润色使用中，点击取消"
            : configured
              ? "设为当前润色模型"
              : "尚未配置完整，无法设为当前"
        }
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all",
          current
            ? "border-primary bg-primary"
            : configured
              ? "border-border hover:border-primary"
              : "cursor-not-allowed border-border/50"
        )}
      >
        {current && <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3.5} />}
      </button>
    );
  };

  const StatusDot = ({ profile }: { profile: AIModelProfile }) => (
    <span
      className={cn(
        "h-1.5 w-1.5 shrink-0 rounded-full",
        isModelConfigured(profile) ? "bg-emerald-500" : "bg-muted-foreground/25"
      )}
      title={isModelConfigured(profile) ? "已配置" : "未配置"}
    />
  );

  return (
    <div className="mx-auto w-full max-w-7xl p-6 lg:p-8">
      {/* 页头 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mb-6 flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Sparkles className="h-6 w-6 text-primary" />
            AI 配置
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            填写即自动保存；保存后在左侧勾选即可用于简历内容智能润色
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              configuredCount > 0 ? "bg-emerald-500" : "bg-muted-foreground/30"
            )}
          />
          {configuredCount > 0 ? `${configuredCount} 个供应商已配置` : "尚未配置密钥"}
        </span>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
        {/* 左栏：预设 + 自定义供应商 */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
          className="space-y-4"
        >
          <Card className="p-2">
            <p className="px-2 pb-1.5 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              预设供应商
            </p>
            <div className="flex flex-col gap-0.5">
              {AI_PROVIDERS.map((item) => {
                const itemProfile = getProviderProfile(models, item);
                const active = selectedId === `provider:${item}`;
                return (
                  <div
                    key={item}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-2 transition-colors",
                      active ? "bg-primary/10" : "hover:bg-accent/60"
                    )}
                  >
                    <RadioDot profile={itemProfile} />
                    <button
                      type="button"
                      onClick={() => setSelectedId(`provider:${item}`)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    >
                      <ProviderLogo provider={item} className="h-5 w-5 shrink-0" />
                      <span
                        className={cn(
                          "truncate text-sm",
                          active ? "font-medium text-primary" : "text-foreground"
                        )}
                      >
                        {AI_PROVIDER_DEFINITIONS[item].name}
                      </span>
                    </button>
                    <StatusDot profile={itemProfile} />
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-2">
            <div className="flex items-center justify-between px-2 pb-1.5 pt-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                自定义供应商
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleAddCustom}
                className="h-6 gap-1 rounded-md px-1.5 text-[11px] font-medium text-primary"
              >
                <Plus className="h-3 w-3" />
                添加
              </Button>
            </div>
            <div className="flex flex-col gap-0.5">
              {customProfiles.length === 0 && (
                <p className="px-2 py-2 text-xs text-muted-foreground/70">
                  还没有自定义供应商，点击「添加」创建一个
                </p>
              )}
              {customProfiles.map((item) => {
                const active = selectedId === item.id;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-2 transition-colors",
                      active ? "bg-primary/10" : "hover:bg-accent/60"
                    )}
                  >
                    <RadioDot profile={item} />
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground">
                        {(item.name || "自").slice(0, 1).toUpperCase()}
                      </span>
                      <span
                        className={cn(
                          "truncate text-sm",
                          active ? "font-medium text-primary" : "text-foreground"
                        )}
                      >
                        {item.name || "自定义供应商"}
                      </span>
                    </button>
                    <StatusDot profile={item} />
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        {/* 右栏：供应商表单 */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
          className="min-w-0 space-y-4"
        >
          {selectedProfile && (
            <>
              <Card className="p-5">
                {/* 供应商信息 */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60">
                      <ProviderLogo provider={selectedProfile.provider} className="h-6 w-6" />
                    </span>
                    <div>
                      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                        {isPreset ? (
                          presetDef!.name
                        ) : (
                          <input
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            placeholder="供应商名称"
                            className="w-44 rounded-none border-0 bg-transparent px-0 py-0 text-base font-semibold leading-6 text-foreground underline decoration-dashed decoration-border decoration-1 underline-offset-4 outline-none transition-colors placeholder:font-normal placeholder:text-muted-foreground hover:decoration-primary focus:decoration-primary"
                          />
                        )}
                        {isPreset && presetDef!.website && (
                          <a
                            href={presetDef!.website}
                            target="_blank"
                            rel="noreferrer"
                            title="打开官网"
                            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                            <Check className="h-3 w-3" />
                            当前使用
                          </span>
                        )}
                      </h2>
                    </div>
                  </div>
                  {!isPreset && (
                    <button
                      type="button"
                      onClick={() => setDeleteOpen(true)}
                      title="删除该自定义供应商"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* 表单 */}
                <div className="mt-5 space-y-4">
                  {/* API Key（带显示/隐藏） */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                      API Key
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        autoComplete="off"
                        spellCheck={false}
                        value={keyInput}
                        onChange={(e) => setKeyInput(e.target.value)}
                        placeholder="输入 API Key，仅保存在本地浏览器"
                        className="h-9 pr-9 font-mono text-xs"
                        // 隐藏时用 CSS 掩码而非 password 类型，避免触发浏览器“保存密码”提示
                        style={
                          {
                            WebkitTextSecurity: showKey ? "none" : "disc",
                            textSecurity: showKey ? "none" : "disc",
                          } as React.CSSProperties
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey((v) => !v)}
                        title={showKey ? "隐藏密钥" : "显示密钥"}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* 模型 + 协议：同一排 */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-foreground">
                        模型
                      </label>
                      <Input
                        type="text"
                        autoComplete="off"
                        spellCheck={false}
                        value={modelInput}
                        onChange={(e) => setModelInput(e.target.value)}
                        placeholder="输入模型名称"
                        className="h-9 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-foreground">
                        协议
                        {isPreset && (
                          <span className="ml-1 font-normal text-muted-foreground">
                            （{presetDef!.name} 支持：
                            {presetDef!.protocols.map((p) => PROTOCOL_LABELS[p]).join("、")}）
                          </span>
                        )}
                      </label>
                      <Select
                        value={protocolInput}
                        onChange={(v) => {
                          const next = v as AIProtocol;
                          setProtocolInput(next);
                          // 预设供应商：切换协议时自动带入该协议对应的默认请求地址
                          if (isPreset) {
                            const fallback = presetDef!.protocolBaseUrls[next];
                            if (fallback) setBaseUrlInput(fallback);
                          }
                        }}
                        options={(isPreset ? presetDef!.protocols : AI_PROTOCOLS).map((p) => ({
                          value: p,
                          label: PROTOCOL_LABELS[p],
                        }))}
                      />
                    </div>
                  </div>

                  {/* 请求地址 */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-foreground">
                      请求地址
                    </label>
                    <Input
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      value={baseUrlInput}
                      onChange={(e) => setBaseUrlInput(e.target.value)}
                      className="h-9 font-mono text-xs"
                    />
                  </div>

                  {/* 测试连接 */}
                  <div className="border-t border-border/60 pt-4">
                    <Button
                      type="button"
                      onClick={handleTest}
                      disabled={testState.status === "running"}
                      className="h-9 gap-1.5 px-3.5 text-xs font-medium"
                    >
                      {testState.status === "running" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Wifi className="h-3.5 w-3.5" />
                      )}
                      {testState.status === "running" ? "测试中…" : "测试连接"}
                    </Button>
                  </div>

                </div>
              </Card>

              {/* 删除自定义供应商确认 */}
              <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>删除自定义供应商？</AlertDialogTitle>
                    <AlertDialogDescription>
                      将删除「{selectedProfile.name || "该供应商"}」的完整配置（含 API Key），此操作不可恢复。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteCurrent}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* 隐私提示：Key 只存在本地 */}
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <span>API Key 仅保存在本地浏览器（localStorage），不会上传到任何服务器</span>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
