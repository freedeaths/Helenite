/**
 * FileTreeService 接口定义
 *
 * 基于 MetadataService 构建文件树结构，提供文件树相关的操作
 */

// ===============================
// 文件树数据结构
// ===============================

/**
 * 文件树节点
 */
export interface FileTreeNode {
  /** 节点名称（对于文件，已移除.md扩展名） */
  name: string;
  /** 节点路径 */
  path: string;
  /** 节点类型 */
  type: 'file' | 'folder';
  /** 子节点（仅文件夹有） */
  children?: FileTreeNode[];
  /** 文件元数据（仅文件有） */
  metadata?: FileNodeMetadata;
}

/**
 * 文件节点元数据（简化版，专注于文件树显示需要的信息）
 */
export interface FileNodeMetadata {
  /** 文件名（不含扩展名） */
  fileName: string;
  /** 相对路径 */
  relativePath: string;
  /** 标签列表 */
  tags?: string[];
  /** 别名列表 */
  aliases?: string[];
  /** 标题数量 */
  headingCount?: number;
  /** 链接数量 */
  linkCount?: number;
  /** 入链数量 */
  backlinkCount?: number;
}

/**
 * 文件夹统计信息
 */
export interface FolderStats {
  /** 总文件数 */
  totalFiles: number;
  /** 总文件夹数 */
  totalFolders: number;
  /** 最后修改时间 */
  lastModified?: string;
}

/**
 * 文件树构建选项
 */
export interface FileTreeOptions {
  /** 是否包含空文件夹 */
  includeEmptyFolders?: boolean;
  /** 是否应用文件夹过滤规则 */
  applyFolderFilters?: boolean;
  /** 自定义排序函数 */
  customSort?: (a: FileTreeNode, b: FileTreeNode) => number;
}

// ===============================
// FileTreeService 接口
// ===============================

/**
 * 文件树服务接口
 */
export interface IFileTreeService {
  // ===============================
  // 核心文件树操作
  // ===============================

  /**
   * 获取完整的文件树结构
   */
  getFileTree(options?: FileTreeOptions): Promise<FileTreeNode[]>;

  /**
   * 获取指定路径的子节点
   */
  getChildren(path: string): Promise<FileTreeNode[]>;

  /**
   * 查找指定路径的节点
   */
  findNode(path: string): Promise<FileTreeNode | null>;

  /**
   * 检查路径是否存在
   */
  pathExists(path: string): Promise<boolean>;

  // ===============================
  // 文件夹操作
  // ===============================

  /**
   * 获取文件夹统计信息
   */
  getFolderStats(path?: string): Promise<FolderStats>;

  /**
   * 获取所有文件夹路径
   */
  getAllFolders(): Promise<string[]>;

  /**
   * 获取根级文件夹
   */
  getRootFolders(): Promise<FileTreeNode[]>;

  // ===============================
  // 文件操作
  // ===============================

  /**
   * 获取所有文件路径
   */
  getAllFiles(): Promise<string[]>;

  /**
   * 按文件夹分组获取文件
   */
  getFilesByFolder(folderPath?: string): Promise<FileTreeNode[]>;

  /**
   * 搜索文件名（支持模糊匹配）
   */
  searchFiles(query: string): Promise<FileTreeNode[]>;

  // ===============================
  // 实用方法
  // ===============================

  /**
   * 标准化路径
   */
  normalizePath(path: string): string;

  /**
   * 获取父路径
   */
  getParentPath(path: string): string | null;

  /**
   * 获取文件/文件夹名
   */
  getNodeName(path: string): string;

  /**
   * 检查是否为文件路径（以.md结尾）
   */
  isFilePath(path: string): boolean;

  // ===============================
  // 缓存管理
  // ===============================

  /**
   * 刷新文件树缓存
   */
  refreshCache(): Promise<void>;

  /**
   * 获取缓存统计
   */
  getCacheStats(): Promise<Record<string, unknown>>;

  // ===============================
  // Vault 管理
  // ===============================

  /**
   * 切换到不同的 vault
   */
  switchVault(vaultId: string): void;

  /**
   * 获取当前 vault 信息
   */
  getCurrentVault(): { id: string; path: string };
}