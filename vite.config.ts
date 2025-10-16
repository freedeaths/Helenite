import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  // 环境变量定义 - 现在使用 import.meta.env，不需要 define 了
  // 构建配置 - 排除 vaults 目录但保留其他 public 文件
  publicDir: 'public',
  build: {
    // 使用 Vite 插件来自定义文件复制行为
    rollupOptions: {
      // 这里不需要配置，交给插件处理
    },
  },
  // 添加插件来过滤 public 文件
  plugins: [
    react(),
    {
      name: 'exclude-vaults',
      writeBundle() {
        // 构建完成后删除 vaults 目录
        const vaultsPath = path.resolve('dist/vaults');
        if (fs.existsSync(vaultsPath)) {
          fs.rmSync(vaultsPath, { recursive: true, force: true });
        }
      },
    },
  ],
});
