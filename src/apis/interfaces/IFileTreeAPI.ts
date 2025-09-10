export interface FileTree {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTree[];
  metadata?: FileMetadata;
}

export interface FileMetadata {
  fileName: string;
  relativePath: string;
  title?: string;
  tags?: string[];
  aliases?: string[];
  frontmatter?: Record<string, any>;
  headings?: HeadingData[];
  links?: LinkData[];
  backlinks?: LinkData[];
}

export interface HeadingData {
  heading: string;
  level: number;
}

export interface LinkData {
  link: string;
  relativePath?: string;  // 可选，某些链接可能没有路径信息
  displayText?: string;   // 可选，链接的显示文本
}

/**
 * 文件树 API 接口
 * 负责处理文件系统结构相关的操作
 */
export interface IFileTreeAPI {
  /**
   * 获取完整的文件树结构
   * @returns Promise<FileTree[]> 根级文件和文件夹数组
   */
  getFileTree(): Promise<FileTree[]>;
  
  /**
   * 选择文件（触发文件选中事件）
   * @param path 文件路径
   */
  selectFile(path: string): Promise<void>;
  
  /**
   * 展开文件夹（如果需要懒加载）
   * @param path 文件夹路径
   * @returns Promise<FileTree[]> 文件夹下的子项
   */
  expandFolder(path: string): Promise<FileTree[]>;
  
  /**
   * 获取文件夹统计信息
   * @param path 文件夹路径（可选，默认为根目录）
   * @returns Promise<FolderStats> 统计信息
   */
  getFolderStats(path?: string): Promise<FolderStats>;
}

export interface FolderStats {
  totalFiles: number;
  totalFolders: number;
  totalSize?: number; // bytes
  lastModified?: string;
}