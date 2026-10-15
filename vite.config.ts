import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// 备份说明：自动备份改由浏览器 File System Access API 实现
// （见 src/utils/fileSystem.ts），不再依赖本地服务 / C# 文件夹选择器。

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // @anthropic-ai/sdk 的 exports 通配未覆盖无扩展名子路径，Rollup 解析不到；
      // 直接指向实际 CJS 文件（@langchain/anthropic 仅用到 transformJSONSchema）
      '@anthropic-ai/sdk/lib/transform-json-schema': path.resolve(
        __dirname,
        './node_modules/@anthropic-ai/sdk/lib/transform-json-schema.js'
      ),
    },
  },
  optimizeDeps: {
    // @lobehub/icons 包入口会连带引入 @lobehub/ui / antd 等重型依赖，
    // 本项目仅使用其厂商子路径图标（es/<Provider>），排除预构建、按需转换
    exclude: ['@lobehub/icons'],
  },
  build: {
    rollupOptions: {
      output: {
        // 按库拆分 vendor chunk：首屏并行下载多个小 chunk，且各库独立缓存
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return;
          const p = id.split('node_modules')[1] ?? '';
          if (/(react|react-dom|react-router|scheduler|zustand|sonner)/.test(p)) return 'vendor-react';
          if (/(framer-motion|lucide-react|clsx|tailwind-merge|class-variance)/.test(p)) return 'vendor-ui';
          if (/(antd|@ant-design|rc-|@rc-component)/.test(p)) return 'vendor-antd';
          if (/(tiptap|prosemirror)/.test(p)) return 'vendor-tiptap';
          if (/(react-markdown|remark|rehype|micromark|unist|hast|mdast|unified|vfile|trough|bail|property-information|space-separated|comma-separated|character-entities|decode-named|html-void|devlop|trim-lines)/.test(p)) return 'vendor-markdown';
          if (/(@langchain|@anthropic-ai|@google|langgraph|langsmith|openai|zod)/.test(p)) return 'vendor-ai';
          if (/(html2canvas|jspdf|pdfjs-dist|mammoth|dompurify)/.test(p)) return 'vendor-docs';
          if (/(@dnd-kit|react-resizable-panels)/.test(p)) return 'vendor-dnd';
          return 'vendor-misc';
        },
      },
    },
  },
})
