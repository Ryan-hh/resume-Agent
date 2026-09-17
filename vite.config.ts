import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    // @lobehub/icons 包入口会连带引入 @lobehub/ui / antd 等重型依赖，
    // 本项目仅使用其厂商子路径图标（es/<Provider>），排除预构建、按需转换
    exclude: ['@lobehub/icons'],
  },
})
