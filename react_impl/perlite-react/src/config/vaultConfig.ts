/**
 * Vault 配置文件
 * 控制文件树显示、搜索范围等行为
 */

export interface VaultConfig {
  /** 基础URL配置 */
  baseUrl: string;
  
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
  baseUrl: '/vault/Publish',
  
  // 默认主页文件
  indexFile: 'Welcome.md',
  
  // 默认过滤的文件夹
  excludedFolders: [
    'Attachments',     // 附件文件夹（用户请求）
    '.obsidian',       // Obsidian 配置文件夹
    '.git',           // Git 仓库文件夹
    '.vscode',        // VSCode 配置文件夹
    'node_modules',   // Node.js 依赖
    '.DS_Store',      // macOS 系统文件
    'Thumbs.db'       // Windows 缩略图文件
  ],
  
  // 默认过滤的文件扩展名
  excludedExtensions: [
    '.DS_Store',
    '.gitignore',
    'desktop.ini'
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