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
  // 注意：不再使用 manualChunks 手工分包。
  // prosemirror 等库内部存在循环依赖，类静态字段初始化依赖模块执行顺序，
  // 手工拆到独立 chunk 会触发 "Cannot read properties of undefined (reading 'empty')"。
  // 保留路由懒加载即可：首屏只加载入口 + 当前页面，其余库由 Rollup 自动分块、按需加载。
})
