/**
 * Vault 配置文件
 * 控制文件树显示、搜索范围等行为
 * 统一管理所有路径和环境配置
 */

// 环境变量和路径配置
// 现已支持多 vault 结构：/vaults/Demo, /vaults/Publish 等
export const VAULTS_ROOT = import.meta.env.VITE_VAULTS_ROOT || '/vaults';
export const VAULT_SUBDIR = import.meta.env.VITE_VAULT_SUBDIR || 'Demo';
export const VAULT_PATH = `${VAULTS_ROOT}/${VAULT_SUBDIR}`;

// 内部使用的 Obsidian 插件路径
const METADATA_PLUGINS_PATH = `${VAULT_PATH}/.obsidian/plugins/metadata-extractor`;

export interface VaultConfig {
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
 * 默认配置
 * 复刻 PHP 版本的过滤逻辑，参考 helper.php isValidFolder() 函数
 */
export const defaultVaultConfig: VaultConfig = {
  baseUrl: VAULT_PATH,
  vaultsRoot: VAULTS_ROOT,

  // 默认主页文件
  indexFile: 'Welcome.md',

  // 默认过滤的文件夹
  excludedFolders: [
    'Attachments',     // 附件文件夹（用户请求）
    '.obsidian',       // Obsidian 配置文件夹
    '.git',           // Git 仓库文件夹
    '.vscode',        // VSCode 配置文件夹
    'node_modules'    // Node.js 依赖
  ],

  // 默认过滤的文件扩展名
  excludedExtensions: [
    '.DS_Store',      // macOS 系统文件
    '.gitignore',     // Git 忽略文件
    'desktop.ini',    // Windows 桌面配置
    'Thumbs.db'       // Windows 缩略图文件
  ],

  // 搜索配置
  search: {
    debounceMs: 300,
    maxResults: 100,
    maxMatchesPerFile: 5
  }
};

/**
 * 获取当前配置
 * 后续可以从环境变量、本地存储等地方加载用户自定义配置
 */
export const getVaultConfig = (): VaultConfig => {
  // TODO: 支持从环境变量或本地存储加载用户配置
  // const userConfig = localStorage.getItem('vaultConfig');
  // if (userConfig) {
  //   return { ...defaultVaultConfig, ...JSON.parse(userConfig) };
  // }

  return defaultVaultConfig;
};

/**
 * 检查文件夹是否应该被过滤
 */
export const isFolderExcluded = (folderName: string, config: VaultConfig = getVaultConfig()): boolean => {
  return config.excludedFolders.includes(folderName);
};

/**
 * 检查文件是否应该被过滤
 */
export const isFileExcluded = (fileName: string, config: VaultConfig = getVaultConfig()): boolean => {
  return config.excludedExtensions.some(ext => fileName.endsWith(ext));
};

/**
 * 检查路径是否在被排除的文件夹中
 */
export const isPathInExcludedFolder = (filePath: string, config: VaultConfig = getVaultConfig()): boolean => {
  return config.excludedFolders.some(excludedFolder =>
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
export type VaultId = typeof AVAILABLE_VAULTS[number];

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