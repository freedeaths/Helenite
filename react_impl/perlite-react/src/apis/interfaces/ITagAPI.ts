/**
 * 标签 API 接口定义
 * 基于 PHP 版本的标签处理逻辑 (helper.php:505-529)
 */

/**
 * 标签数据
 */
export interface TagData {
  /** 标签名（包含 # 前缀） */
  name: string;
  /** 使用该标签的文件数量 */
  count: number;
  /** 使用该标签的文件路径数组 */
  files: string[];
}

/**
 * 标签 API 接口
 * 负责从 metadata.json 提取和管理标签数据
 */
export interface ITagAPI {
  /**
   * 获取所有标签
   * 从 metadata.json 的 tags 字段提取所有标签
   * @returns 标签数据数组
   */
  getAllTags(): Promise<TagData[]>;
  
  /**
   * 获取文件的所有标签
   * @param filePath 文件路径
   * @returns 标签数组（包含 # 前缀）
   */
  getFileTags(filePath: string): Promise<string[]>;
  
  /**
   * 根据标签获取文件列表
   * @param tag 标签名（可以包含或不包含 # 前缀）
   * @returns 包含该标签的文件路径数组
   */
  getFilesByTag(tag: string): Promise<string[]>;
}