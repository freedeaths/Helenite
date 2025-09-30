import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  // 环境变量定义 - 现在使用 import.meta.env，不需要 define 了
  // 构建配置 - 排除 vault 目录
  publicDir: 'public',
  build: {
    copyPublicDir: true,
    rollupOptions: {
      external: ['/vaults/**']
    }
  }
})
