import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  // 环境变量定义
  define: {
    __VAULT_BASE_URL__: JSON.stringify(
      process.env.VAULT_BASE_URL || '/vault'
    )
  }
})
