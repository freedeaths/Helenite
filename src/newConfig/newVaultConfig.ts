/**
 * 新架构 Vault 配置
 * 基于 VaultService 的配置管理
 */

// 环境变量配置
export const NEW_VAULT_CONFIG = {
  // Vault 路径配置
  VAULT_PATH: import.meta.env.VITE_VAULT_PATH || '/vaults/Demo',
  VAULT_BASE_URL: import.meta.env.VITE_VAULT_BASE_URL || '/vaults/Demo',

  // 功能开关
  FEATURES: {
    enableGraphView: true,
    enableTagSearch: true,
    enableAdvancedSearch: true,
    enableFootprints: true,
    enableMermaidDiagrams: true,
    enableTrackMaps: true,
  },

  // 性能配置
  PERFORMANCE: {
    searchDebounceMs: 300,
    cacheExpireMs: 5 * 60 * 1000, // 5分钟
    maxCacheSize: 100,
  },

  // UI 配置
  UI: {
    defaultTheme: 'light' as const,
    enableDevTools: import.meta.env.DEV,
    sidebarDefaultWidth: 320,
  }
} as const;

export type NewVaultConfig = typeof NEW_VAULT_CONFIG;