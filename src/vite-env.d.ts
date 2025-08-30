/// <reference types="vite/client" />

// 全局常量类型声明
declare const __VAULT_BASE_URL__: string;

// 环境变量类型声明
interface ImportMetaEnv {
  readonly VITE_CUSDIS_APP_ID: string
  readonly VITE_CUSDIS_HOST: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
