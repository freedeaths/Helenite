import type { FileMetadata } from './IFileTreeAPI';

/**
 * 文件操作 API 接口
 * 负责处理单个文件的读取、解析等操作
 */
export interface IFileAPI {
  /**
   * 获取文件内容
   * @param path 文件路径
   * @returns Promise<string> 文件内容（Markdown 格式）
   */
  getFileContent(path: string): Promise<string>;
  
  /**
   * 获取文件元数据
   * @param path 文件路径
   * @returns Promise<FileMetadata> 文件元数据
   */
  getFileMetadata(path: string): Promise<FileMetadata>;
  
  /**
   * 获取附件文件的 URL
   * @param path 附件路径
   * @returns string 可访问的 URL
   */
  getAttachmentUrl(path: string): string;
  
  /**
   * 获取图片文件的 URL
   * @param path 图片路径
   * @returns string 可访问的图片 URL
   */
  getImageUrl(path: string): string;
  
  /**
   * 从 Markdown 内容中提取目录结构
   * @param content Markdown 内容
   * @returns Promise<TOCItem[]> 目录项数组
   */
  extractTOC(content: string): Promise<TOCItem[]>;
  
  /**
   * 从 Markdown 内容中提取链接
   * @param content Markdown 内容
   * @returns Promise<LinkData[]> 链接数组
   */
  extractLinks(content: string): Promise<LinkData[]>;
  
  /**
   * 从 Markdown 内容中提取标签
   * @param content Markdown 内容
   * @returns Promise<string[]> 标签数组
   */
  extractTags(content: string): Promise<string[]>;
  
  /**
   * 检查文件是否存在
   * @param path 文件路径
   * @returns Promise<boolean> 文件是否存在
   */
  exists(path: string): Promise<boolean>;
}

export interface TOCItem {
  id: string;
  title: string;
  level: number; // 1-6 对应 H1-H6
  children?: TOCItem[];
}

// 重新导出链接数据类型，保持一致性
export interface LinkData {
  link: string;
  relativePath: string;
}