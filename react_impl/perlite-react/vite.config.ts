import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // 允许访问上级目录的文件
      allow: ['..', '../..']
    }
  },
  // 环境变量定义
  define: {
    __VAULT_BASE_URL__: JSON.stringify(
      process.env.VAULT_BASE_URL || '/src/../../../Publish'
    )
  }
})
