/**
 * 新架构 Vault 配置
 * 基于 VaultService 的配置管理
 * 整合了原 vaultConfig.ts 的所有功能
 */

// 环境变量和路径配置
export const VAULTS_ROOT = import.meta.env.VITE_VAULTS_ROOT || '/vaults';
export const VAULT_SUBDIR = import.meta.env.VITE_VAULT_SUBDIR || 'Demo';
export const VAULT_PATH = `${VAULTS_ROOT}/${VAULT_SUBDIR}`;

// 内部使用的 Obsidian 插件路径
const METADATA_PLUGINS_PATH = `${VAULT_PATH}/.obsidian/plugins/metadata-extractor`;

// 新架构配置
export const VAULT_CONFIG = {
  // Vault 路径配置
  VAULT_PATH: VAULT_PATH,
  VAULT_BASE_URL: import.meta.env.VITE_VAULT_BASE_URL || VAULT_PATH,
  VAULTS_ROOT: VAULTS_ROOT,
  VAULT_SUBDIR: VAULT_SUBDIR,

  // 默认主页文件
  indexFile: 'Welcome.md',

  // 需要过滤的文件夹列表（不显示在文件树中，也不参与搜索）
  excludedFolders: [
    'Attachments', // 附件文件夹（用户请求）
    '.obsidian', // Obsidian 配置文件夹
    '.git', // Git 仓库文件夹
    '.vscode', // VSCode 配置文件夹
    'node_modules', // Node.js 依赖
  ],

  // 需要过滤的文件扩展名
  excludedExtensions: [
    '.DS_Store', // macOS 系统文件
    '.gitignore', // Git 忽略文件
    'desktop.ini', // Windows 桌面配置
    'Thumbs.db', // Windows 缩略图文件
  ],

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

  // 搜索配置
  search: {
    debounceMs: 300,
    maxResults: 100,
    maxMatchesPerFile: 5,
  },

  // UI 配置
  UI: {
    defaultTheme: 'light' as const,
    enableDevTools: import.meta.env.DEV,
    sidebarDefaultWidth: 320,
  },
} as const;

export type VaultConfig = typeof VAULT_CONFIG;

// Vault 配置接口
export interface VaultConfigInterface {
  /** 基础URL配置 */
  baseUrl: string;

  /** Vaults 根目录 */
  vaultsRoot: string;

  /** 默认主页文件 */
  indexFile: string;

  /** 需要过滤的文件夹列表（不显示在文件树中，也不参与搜索） */
  excludedFolders: string[];

  /** 需要过滤的文件扩展名 */
  excludedExtensions: string[];

  /** 搜索配置 */
  search: {
    /** 搜索防抖延迟（毫秒） */
    debounceMs: number;
    /** 最大搜索结果数 */
    maxResults: number;
    /** 每个文件最大显示匹配数 */
    maxMatchesPerFile: number;
  };
}

/**
 * 获取当前配置
 */
export const getVaultConfig = (): VaultConfigInterface => {
  return {
    baseUrl: VAULT_CONFIG.VAULT_PATH,
    vaultsRoot: VAULT_CONFIG.VAULTS_ROOT,
    indexFile: VAULT_CONFIG.indexFile,
    excludedFolders: [...VAULT_CONFIG.excludedFolders],
    excludedExtensions: [...VAULT_CONFIG.excludedExtensions],
    search: VAULT_CONFIG.search,
  };
};

/**
 * 检查文件夹是否应该被过滤
 */
export const isFolderExcluded = (folderName: string): boolean => {
  return (VAULT_CONFIG.excludedFolders as readonly string[]).includes(folderName);
};

/**
 * 检查文件是否应该被过滤
 */
export const isFileExcluded = (fileName: string): boolean => {
  return VAULT_CONFIG.excludedExtensions.some((ext) => fileName.endsWith(ext));
};

/**
 * 检查路径是否在被排除的文件夹中
 */
export const isPathInExcludedFolder = (filePath: string): boolean => {
  return VAULT_CONFIG.excludedFolders.some(
    (excludedFolder) =>
      filePath.includes(`/${excludedFolder}/`) || filePath.startsWith(`${excludedFolder}/`)
  );
};

/**
 * 路径辅助函数 (从 env.ts 迁移)
 */
export function getVaultFilePath(relativePath: string): string {
  const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return `${VAULT_PATH}/${cleanPath}`;
}

/**
 * 主要文件访问函数 (对外暴露)
 */
export function getMetadataUrl(): string {
  return `${METADATA_PLUGINS_PATH}/metadata.json`;
}

export function getTagsUrl(): string {
  return `${METADATA_PLUGINS_PATH}/tags.json`;
}

/**
 * 多 vault 支持，之后应该是直接读出来的，不是 hardcode，可以配置 excludeVault
 * 当前可用：Demo, Publish
 */
export const AVAILABLE_VAULTS = ['Demo', 'Publish'] as const;
export type VaultId = (typeof AVAILABLE_VAULTS)[number];

/**
 * Vault 配置接口 - 统一的 vault 操作接口
 */
export interface VaultPaths {
  readonly id: string;
  readonly path: string;
  getFilePath(relativePath: string): string;
  getMetadataUrl(): string;
  getTagsUrl(): string;
}

/**
 * 创建 Vault 配置实例
 */
export function createVaultConfig(vaultId: string): VaultPaths {
  const vaultPath = `${VAULTS_ROOT}/${vaultId}`;
  const pluginsPath = `${vaultPath}/.obsidian/plugins/metadata-extractor`;

  return {
    id: vaultId,
    path: vaultPath,
    getFilePath: (relativePath: string) => {
      const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
      return `${vaultPath}/${cleanPath}`;
    },
    getMetadataUrl: () => `${pluginsPath}/metadata.json`,
    getTagsUrl: () => `${pluginsPath}/tags.json`,
  };
}

/**
 * 当前默认 vault 配置 (向后兼容)
 */
export const vaultConfig = createVaultConfig(VAULT_SUBDIR);

/**
 * 多 vault 管理器接口
 */
export interface MultiVaultManager {
  currentVault: VaultId;
  availableVaults: readonly VaultId[];
  getCurrentConfig(): VaultPaths;
  getConfig(vaultId: VaultId): VaultPaths;
  switchVault(vaultId: VaultId): void;
}

/**
 * 便捷函数：获取指定 vault 的配置 (兼容旧 API)
 */
export const getVaultPaths = createVaultConfig;
