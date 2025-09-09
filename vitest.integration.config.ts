import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node', // 使用 Node.js 环境进行真实的网络请求
    // 不使用设置文件，避免 jsdom 相关的 window 对象问题
    exclude: [
      'node_modules/**',
      'dist/**',
      'e2e/**',
      '**/*.{spec,e2e}.{ts,tsx}'
    ],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});