/// <reference types="vite/client" />

// 环境变量类型声明
interface ImportMetaEnv {
  readonly VITE_CUSDIS_APP_ID: string;
  readonly VITE_CUSDIS_HOST: string;
  readonly VITE_VAULT_PATH: string;
  readonly VITE_VAULT_ROOT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
