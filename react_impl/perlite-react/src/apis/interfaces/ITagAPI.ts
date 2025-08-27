import type { SearchResult } from './ISearchAPI';
import type { FileTree } from './IFileTreeAPI';

/**
 * 标签数据
 */
export interface TagData {
  name: string;
  count: number; // 使用该标签的文件数量
  files: string[]; // 使用该标签的文件路径数组
  color?: string; // 标签颜色（如果有）
}

/**
 * 标签 API 接口
 * 负责处理标签相关的操作
 */
export interface ITagAPI {
  /**
   * 获取所有标签
   * @returns Promise<TagData[]> 标签数据数组
   */
  getAllTags(): Promise<TagData[]>;
  
  /**
   * 根据标签搜索文件
   * @param tag 标签名
   * @returns Promise<SearchResult[]> 包含该标签的文件
   */
  searchByTag(tag: string): Promise<SearchResult[]>;
  
  /**
   * 获取包含指定标签的文件树
   * @param tag 标签名
   * @returns Promise<FileTree[]> 文件树结构
   */
  getTaggedFiles(tag: string): Promise<FileTree[]>;
  
  /**
   * 获取文件的所有标签
   * @param filePath 文件路径
   * @returns Promise<string[]> 标签数组
   */
  getFileTags(filePath: string): Promise<string[]>;
  
  /**
   * 获取标签统计信息
   * @returns Promise<TagStats> 标签统计
   */
  getTagStats(): Promise<TagStats>;
  
  /**
   * 搜索标签（支持模糊匹配）
   * @param query 标签搜索关键词
   * @returns Promise<TagData[]> 匹配的标签
   */
  searchTags(query: string): Promise<TagData[]>;
}

export interface TagStats {
  totalTags: number;
  totalTaggedFiles: number;
  averageTagsPerFile: number;
  mostUsedTags: TagData[]; // 前N个最常用的标签
  orphanedTags: string[]; // 没有关联文件的标签
}