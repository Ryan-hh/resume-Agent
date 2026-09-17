import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FileJson, FileImage, Loader2 } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { useAIConfigStore } from "@/store/useAIConfigStore";
import { isModelConfigured, toAIConnection } from "@/config/ai-models";
import { AIRequestError, chatCompletion, ChatMessage } from "@/lib/ai-request";
import {
  ResumeImportError,
  RESUME_IMPORT_PROMPT,
  RESUME_IMPORT_TEXT_PROMPT,
  parseJsonPayload,
  validateImportedResume,
  createResumeFromImport,
} from "@/lib/resumeImport";
import {
  compressImageFile,
  extractTextFromDocx,
  preparePdf,
  readTextFile,
} from "@/utils/resumeImport";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PdfImportPreview } from "@/components/dashboard/PdfImportPreview";
import { cn } from "@/lib/utils";
import type { ResumeData } from "@/types/resume";

const IMPORT_TIMEOUT_MS = 120_000;
const IMPORT_MAX_TOKENS = 8192;

function importErrorMessage(error: unknown): string {
  if (error instanceof ResumeImportError) {
    switch (error.code) {
      case "fileTooLarge":
        return "文件过大，请选择 20MB 以内的文件";
      case "tooManyPages":
        return "PDF 页数超过 10 页，请拆分后导入";
      case "requestTooLarge":
        return "转换后的图片数据过大，请压缩后重试";
      case "invalidPdf":
        return "PDF 解析失败，请确认文件未损坏或未加密";
      case "invalidImage":
        return "图片解析失败，请更换图片重试";
      case "invalidOutput":
        return "AI 返回内容无法解析，请重试";
      case "emptyOutput":
        return "未能从文件中识别出简历内容";
      case "emptyText":
        return "未从文件中提取到文本内容，请检查文件";
      case "unsupportedFormat":
        return "不支持的文件格式，请使用 PDF / 图片 / Word / TXT / JSON";
      case "unsupportedDocFormat":
        return "不支持 .doc 旧格式，请用 Word 另存为 .docx 后再导入";
      default:
        return "导入失败，请重试";
    }
  }
  if (error instanceof AIRequestError) {
    switch (error.code) {
      case "networkError":
        return "网络请求失败，请检查网络后重试";
      case "timeout":
        return "AI 响应超时（120 秒），请重试或更换更快的模型";
      case "unauthorized":
        return "API Key 无效或没有权限，请检查 AI 配置";
      case "modelNotFound":
        return "模型不存在，请在 AI 配置中检查模型 ID";
      case "badRequest":
        return "请求被拒绝，请确认所选模型支持图片识别（PDF 扫描件 / 图片需要视觉模型）";
      case "upstreamError":
        return "AI 服务返回异常，请重试";
      default:
        return "AI 请求失败，请重试";
    }
  }
  return "导入失败，请重试";
}

// 导入简历对话框：支持 JSON 直接导入 + 多格式（PDF / 图片 / Word / TXT / JSON）AI 解析导入
export function ImportResumeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const addResume = useResumeStore((s) => s.addResume);
  const [importingType, setImportingType] = React.useState<"json" | "ai" | null>(null);
  const [pendingResume, setPendingResume] = React.useState<ResumeData | null>(null);
  const jsonFileInputRef = React.useRef<HTMLInputElement>(null);
  const aiFileInputRef = React.useRef<HTMLInputElement>(null);

  // 本应用格式 JSON 直接入库（不调 AI）
  const importResumeJson = (parsed: unknown, fileName: string): boolean => {
    if (!parsed || typeof parsed !== "object" || !(parsed as Record<string, unknown>).basic) {
      return false;
    }
    const legacyData = parsed as Record<string, unknown>;
    const merged = {
      ...legacyData,
      menuSections: legacyData.menuSections || [],
      globalSettings: legacyData.globalSettings || {},
      customData: legacyData.customData || {},
    };
    const newId = addResume(merged as ResumeData);
    toast.success("简历导入成功");
    onOpenChange(false);
    navigate(`/workbench/${newId}`);
    return true;
  };

  const handleJsonFile = async (file: File) => {
    if (!file) return;
    setImportingType("json");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!importResumeJson(parsed, file.name)) {
        throw new Error("invalid resume format");
      }
    } catch (error) {
      console.error("导入失败:", error);
      toast.error("导入失败，请检查文件格式");
    } finally {
      setImportingType(null);
      if (jsonFileInputRef.current) jsonFileInputRef.current.value = "";
    }
  };

  const handleAiFile = async (file: File) => {
    if (!file) return;
    setImportingType("ai");
    try {
      // 1. 检查 AI 配置：必须已启用模型
      const { models, textModelId } = useAIConfigStore.getState();
      const profile = models.find((m) => m.id === textModelId);
      if (!profile || !isModelConfigured(profile)) {
        toast.error("请先在「AI 配置」中添加并启用一个模型");
        setImportingType(null);
        onOpenChange(false);
        navigate("/ai");
        return;
      }
      const connection = toAIConnection(profile);

      // 2. 类型路由：统一成「文本」或「图片数组」两种负载
      const lowerName = file.name.toLowerCase();
      let payload: { kind: "text"; text: string } | { kind: "images"; images: string[] };

      if (file.type === "application/pdf" || lowerName.endsWith(".pdf")) {
        const prepared = await preparePdf(file);
        payload =
          prepared.kind === "text"
            ? { kind: "text", text: prepared.text }
            : { kind: "images", images: prepared.images };
      } else if (file.type.startsWith("image/")) {
        payload = { kind: "images", images: [await compressImageFile(file)] };
      } else if (lowerName.endsWith(".docx")) {
        payload = { kind: "text", text: await extractTextFromDocx(file) };
      } else if (lowerName.endsWith(".doc")) {
        throw new ResumeImportError("unsupportedDocFormat");
      } else if (lowerName.endsWith(".json")) {
        // 本应用格式直接入库；其他 JSON 交给 AI 映射成标准结构
        try {
          const parsed = JSON.parse(await file.text());
          if (importResumeJson(parsed, file.name)) return;
        } catch {
          // 解析失败则按文本交给 AI
        }
        payload = { kind: "text", text: await file.text() };
      } else if (lowerName.endsWith(".txt") || lowerName.endsWith(".md")) {
        payload = { kind: "text", text: await readTextFile(file) };
      } else {
        throw new ResumeImportError("unsupportedFormat");
      }

      // 3. AI 解析：文本负载走文本模型，图片负载走视觉模型
      let messages: ChatMessage[];
      if (payload.kind === "text") {
        messages = [
          { role: "system", content: RESUME_IMPORT_TEXT_PROMPT },
          { role: "user", content: payload.text },
        ];
      } else {
        messages = [
          { role: "system", content: RESUME_IMPORT_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "请从这份简历中提取信息并输出 JSON。" },
              ...payload.images.map((image) => ({
                type: "image_url" as const,
                image_url: image,
              })),
            ],
          },
        ];
      }
      const raw = await chatCompletion(
        connection,
        messages,
        IMPORT_MAX_TOKENS,
        IMPORT_TIMEOUT_MS
      );

      // 4. 解析 + 校验 + 转简历数据
      const parsed = parseJsonPayload(raw);
      const { resume: imported, warnings } = validateImportedResume(parsed);
      const fileName = file.name.replace(/\.[^.]+$/, "").trim() || "导入的简历";
      const resume = createResumeFromImport(imported, fileName);

      // 5. 打开预览确认
      setPendingResume(resume);
      onOpenChange(false);
      if (warnings.includes("missingName")) {
        toast.warning("未识别到姓名，导入后请手动补充");
      }
    } catch (error) {
      console.error("AI 导入失败:", error);
      toast.error(importErrorMessage(error));
    } finally {
      setImportingType(null);
      if (aiFileInputRef.current) aiFileInputRef.current.value = "";
    }
  };

  const handleAiFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) handleAiFile(file);
  };

  const confirmImport = () => {
    if (!pendingResume) return;
    const newId = addResume(pendingResume);
    setPendingResume(null);
    toast.success("AI 解析简历已导入");
    navigate(`/workbench/${newId}`);
  };

  const cancelPreview = () => setPendingResume(null);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>导入简历</DialogTitle>
            <DialogDescription>
              直接导入 JSON，或让 AI 识别简历文件生成草稿
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              disabled={importingType !== null}
              onClick={() => jsonFileInputRef.current?.click()}
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border border-border p-4 text-left transition-all hover:border-primary/40 hover:shadow-sm",
                importingType !== null && "opacity-60"
              )}
            >
              <div className="flex w-full items-center justify-between">
                {importingType === "json" ? (
                  <Loader2
                    className="h-5 w-5 animate-spin text-primary"
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                  />
                ) : (
                  <FileJson className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm font-semibold">JSON 文件</span>
              </div>
              <span className="text-xs leading-relaxed text-muted-foreground">
                导入此前导出的 .json 简历文件，数据完整保留
              </span>
            </button>
            <button
              disabled={importingType !== null}
              onClick={() => aiFileInputRef.current?.click()}
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border border-border p-4 text-left transition-all hover:border-primary/40 hover:shadow-sm",
                importingType !== null && "opacity-60"
              )}
            >
              <div className="flex w-full items-center justify-between">
                {importingType === "ai" ? (
                  <Loader2
                    className="h-5 w-5 animate-spin text-primary"
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                  />
                ) : (
                  <FileImage className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm font-semibold">AI 智能解析</span>
              </div>
              <span className="text-xs leading-relaxed text-muted-foreground">
                上传简历文件，AI 自动识别并生成草稿
              </span>
            </button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            隐私提示：AI 解析会将文件内容发送至你配置的模型服务商（Key 仅存于本地浏览器）。
          </p>
        </DialogContent>
        <input
          ref={jsonFileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleJsonFile(file);
          }}
        />
        <input
          ref={aiFileInputRef}
          type="file"
          accept=".pdf,application/pdf,.png,image/png,.jpg,image/jpeg,.jpeg,image/jpeg,.webp,image/webp,.docx,.doc,.txt,text/plain,.md,text/markdown,.json,application/json"
          className="hidden"
          onChange={handleAiFileChange}
        />
      </Dialog>
      <PdfImportPreview
        resume={pendingResume}
        onCancel={cancelPreview}
        onConfirm={confirmImport}
      />
    </>
  );
}
