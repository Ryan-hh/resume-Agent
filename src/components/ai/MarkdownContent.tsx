import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink } from "lucide-react";
import type { Components } from "react-markdown";

// AI 消息正文的 Markdown 渲染（GFM：表格/任务列表/删除线）
// 安全：react-markdown 默认不渲染原始 HTML，LLM 输出中的 <script> 等会被忽略
const components: Components = {
  // 表格：外层可横向滚动，表头加背景
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-left text-[12.5px] leading-relaxed">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/60 text-foreground">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border-b border-border px-2.5 py-1.5 font-semibold whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border/60 px-2.5 py-1.5 align-top">{children}</td>
  ),
  // 行内代码与代码块（v10 无 inline prop：块级代码带 language- 前缀，或内容含换行）
  code: ({ className, children }) => {
    const text = String(children ?? "");
    const isBlock = !!className?.startsWith("language-") || text.includes("\n");
    if (isBlock) {
      return (
        <code
          className={`${className ?? ""} block overflow-x-auto rounded-md bg-muted/70 px-3 py-2 font-mono text-[12px] leading-relaxed text-foreground`}
        >
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-muted/70 px-1 py-0.5 font-mono text-[12px] text-foreground">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg border border-border bg-muted/50 p-0 font-mono text-[12.5px] leading-relaxed">
      {children}
    </pre>
  ),
  // 链接：新窗口打开，带外链图标
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 text-primary underline underline-offset-2 hover:opacity-80"
    >
      {children}
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  ),
  // 图片：不直接加载外部图片，改为可点击的链接（防第三方追踪/隐私泄漏）
  img: ({ src, alt }) => (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:opacity-80"
    >
      {alt || src}
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  ),
  h1: ({ children }) => (
    <h1 className="mb-1 mt-2 text-[15px] font-bold text-foreground first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-1 mt-2 text-[14px] font-bold text-foreground first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 mt-1.5 text-[13.5px] font-semibold text-foreground first:mt-0">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-1 mt-1.5 text-[13px] font-semibold text-foreground first:mt-0">{children}</h4>
  ),
  ul: ({ children }) => (
    <ul className="my-1.5 list-disc space-y-0.5 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-1.5 list-decimal space-y-0.5 pl-5">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  // GFM 任务列表
  input: ({ checked, disabled }) => (
    <input type="checkbox" checked={!!checked} disabled={disabled} readOnly className="mr-1.5 align-middle" />
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-primary/40 pl-3 text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-2 border-border" />,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  p: ({ children }) => <p className="my-1.5 leading-relaxed first:mt-0 last:mb-0">{children}</p>,
};

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="text-[13px] text-foreground [&_*]:break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
