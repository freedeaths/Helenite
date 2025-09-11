/**
 * 搜索 API 接口定义
 * 复刻 PHP 版本的搜索功能 (helper.php:284-359)
 */

export interface SearchMatch {
  /** 匹配的行内容 */
  content: string;
  /** 高亮后的内容（包含 HTML 标记） */
  highlighted: string;
  /** 行号（可选） */
  lineNumber?: number;
}

export interface SearchResult {
  /** 文件路径 */
  filePath: string;
  /** 文件名（不含扩展名） */
  fileName: string;
  /** 匹配项列表 */
  matches: SearchMatch[];
  /** 匹配总数 */
  matchCount: number;
}

export interface ISearchAPI {
  /**
   * 全文搜索
   * 复刻 PHP search() 函数功能
   * @param query 搜索关键词
   * @returns 搜索结果列表
   */
  searchContent(query: string): Promise<SearchResult[]>;

  /**
   * 标签搜索
   * 处理以 # 开头的搜索词，复刻 PHP 中的标签搜索逻辑
   * @param tag 标签名（可以包含或不包含 # 前缀）
   * @returns 包含该标签的文件列表
   */
  searchByTag(tag: string): Promise<SearchResult[]>;

  /**
   * 统一搜索入口
   * 根据搜索词是否以 # 开头自动选择搜索方式
   * 复刻 PHP doSearch() 函数功能
   * @param query 搜索关键词或标签
   * @returns 搜索结果列表
   */
  search(query: string): Promise<SearchResult[]>;
}